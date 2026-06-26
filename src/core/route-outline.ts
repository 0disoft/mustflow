import { createHash } from 'node:crypto';
import { lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';
import { DEFAULT_IGNORED_DIRECTORIES, isIgnoredDirectoryPath } from './ignored-directories.js';
import { ensureInside, ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './safe-filesystem.js';

export const CODE_ROUTE_OUTLINE_SCRIPT_ID = 'route-outline';
export const CODE_ROUTE_OUTLINE_SCRIPT_REF = `code/${CODE_ROUTE_OUTLINE_SCRIPT_ID}`;

export type RouteOutlineLanguage =
	| 'typescript'
	| 'tsx'
	| 'javascript'
	| 'jsx'
	| 'javascript-module'
	| 'javascript-commonjs'
	| 'rust';
export type RouteOutlineFramework = 'hono' | 'elysia' | 'axum' | 'nestjs' | 'unknown';
export type RouteOutlineMethod =
	| 'get'
	| 'post'
	| 'put'
	| 'patch'
	| 'delete'
	| 'options'
	| 'head'
	| 'all'
	| 'any'
	| 'use'
	| 'route'
	| 'nest'
	| 'merge'
	| 'fallback';
export type RouteOutlineLifecycle =
	| 'guard'
	| 'resolve'
	| 'derive'
	| 'use'
	| 'decorate'
	| 'onBeforeHandle'
	| 'beforeHandle'
	| 'onRequest'
	| 'onAfterHandle'
	| 'onError'
	| 'useGuards'
	| 'useInterceptors'
	| 'usePipes'
	| 'useFilters';

export type RouteOutlineFindingCode =
	| 'code_route_outline_path_outside_root'
	| 'code_route_outline_unreadable_path'
	| 'code_route_outline_unsupported_file'
	| 'code_route_outline_file_too_large'
	| 'code_route_outline_max_files_exceeded';

export interface RouteOutlinePolicy {
	readonly max_file_bytes: number;
	readonly max_files: number;
	readonly extensions: readonly string[];
	readonly ignored_directories: readonly string[];
}

export interface RouteOutlineFile {
	readonly kind: 'source_file';
	readonly path: string;
	readonly language: RouteOutlineLanguage;
	readonly framework_evidence: readonly RouteOutlineFramework[];
	readonly sha256: string;
	readonly size_bytes: number;
	readonly line_count: number;
	readonly route_count: number;
}

export interface RouteOutlineRoute {
	readonly id: string;
	readonly path: string;
	readonly language: RouteOutlineLanguage;
	readonly framework: RouteOutlineFramework;
	readonly method: RouteOutlineMethod;
	readonly route_path: string | null;
	readonly line: number;
	readonly chain_start_line: number;
	readonly chain_end_line: number;
	readonly handler_line: number;
	readonly handler_name?: string | null;
	readonly lifecycle: readonly RouteOutlineLifecycle[];
	readonly signature: string;
	readonly content_sha256: string;
}

export interface RouteOutlineFinding extends ScriptCheckFinding {
	readonly code: RouteOutlineFindingCode;
	readonly path: string;
}

export interface RouteOutlineReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: 'code';
	readonly script_id: typeof CODE_ROUTE_OUTLINE_SCRIPT_ID;
	readonly script_ref: typeof CODE_ROUTE_OUTLINE_SCRIPT_REF;
	readonly action: 'scan';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: RouteOutlinePolicy;
	readonly input_hash: string;
	readonly files: readonly RouteOutlineFile[];
	readonly routes: readonly RouteOutlineRoute[];
	readonly findings: readonly RouteOutlineFinding[];
	readonly issues: readonly string[];
}

export interface InspectRouteOutlineOptions {
	readonly paths: readonly string[];
	readonly maxFileBytes?: number;
	readonly maxFiles?: number;
}

interface SourceFileCandidate {
	readonly absolutePath: string;
	readonly relativePath: string;
	readonly language: RouteOutlineLanguage;
}

type FrameworkBindings = ReadonlyMap<string, RouteOutlineFramework>;

const DEFAULT_MAX_FILE_BYTES = 1024 * 1024;
const DEFAULT_MAX_FILES = 200;
const ROUTE_OUTLINE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.rs'] as const;
const ROUTE_METHODS = [
	'get',
	'post',
	'put',
	'patch',
	'delete',
	'options',
	'head',
	'all',
	'any',
	'use',
	'route',
	'nest',
	'merge',
	'fallback',
] as const;
const AXUM_ROUTER_METHODS = ['route', 'nest', 'merge', 'fallback'] as const;
const AXUM_HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'any'] as const;
const NESTJS_CONTROLLER_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'all'] as const;
const NESTJS_LIFECYCLE_DECORATORS = ['useGuards', 'useInterceptors', 'usePipes', 'useFilters'] as const;
const LIFECYCLE_METHODS = [
	'guard',
	'resolve',
	'derive',
	'use',
	'decorate',
	'onBeforeHandle',
	'beforeHandle',
	'onRequest',
	'onAfterHandle',
	'onError',
] as const;
const IGNORED_DIRECTORIES = DEFAULT_IGNORED_DIRECTORIES;
const ERROR_CODES = new Set<RouteOutlineFindingCode>([
	'code_route_outline_path_outside_root',
	'code_route_outline_unreadable_path',
	'code_route_outline_file_too_large',
	'code_route_outline_max_files_exceeded',
]);

function normalizeRelativePath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/^\.\/+/u, '') || '.';
}

function sha256Tagged(buffer: Buffer | string): string {
	return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function languageForPath(filePath: string): RouteOutlineLanguage | null {
	switch (path.extname(filePath).toLowerCase()) {
		case '.ts':
		case '.mts':
		case '.cts':
			return 'typescript';
		case '.tsx':
			return 'tsx';
		case '.js':
			return 'javascript';
		case '.jsx':
			return 'jsx';
		case '.mjs':
			return 'javascript-module';
		case '.cjs':
			return 'javascript-commonjs';
		case '.rs':
			return 'rust';
		default:
			return null;
	}
}

function isIgnoredDirectory(relativePath: string): boolean {
	return isIgnoredDirectoryPath(normalizeRelativePath(relativePath), IGNORED_DIRECTORIES);
}

function makeFinding(
	code: RouteOutlineFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
): RouteOutlineFinding {
	return { code, severity, path: pathValue, message };
}

function addMaxFilesFinding(
	findings: RouteOutlineFinding[],
	issues: string[],
	policy: RouteOutlinePolicy,
	pathValue: string,
): void {
	if (findings.some((finding) => finding.code === 'code_route_outline_max_files_exceeded')) {
		return;
	}

	const message = `Route outline matched more than ${policy.max_files} files; remaining files were skipped.`;
	issues.push(`${pathValue}: ${message}`);
	findings.push(makeFinding('code_route_outline_max_files_exceeded', 'high', pathValue, message));
}

function normalizeTargetPath(projectRoot: string, targetPath: string): { readonly absolutePath: string; readonly relativePath: string } {
	const absolutePath = path.resolve(process.cwd(), targetPath);
	ensureInside(projectRoot, absolutePath);
	return {
		absolutePath,
		relativePath: normalizeRelativePath(path.relative(projectRoot, absolutePath)),
	};
}

function collectCandidatesFromDirectory(
	projectRoot: string,
	absoluteDirectory: string,
	candidates: SourceFileCandidate[],
	findings: RouteOutlineFinding[],
	issues: string[],
	policy: RouteOutlinePolicy,
): void {
	const relativeDirectory = normalizeRelativePath(path.relative(projectRoot, absoluteDirectory));
	if (isIgnoredDirectory(relativeDirectory)) {
		return;
	}

	let entries;
	try {
		ensureInsideWithoutSymlinks(projectRoot, absoluteDirectory);
		entries = readdirSync(absoluteDirectory, { withFileTypes: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`${relativeDirectory}: ${message}`);
		findings.push(makeFinding('code_route_outline_unreadable_path', 'high', relativeDirectory, message));
		return;
	}

	for (const entry of entries) {
		if (candidates.length >= policy.max_files) {
			addMaxFilesFinding(findings, issues, policy, relativeDirectory);
			return;
		}

		const absoluteEntry = path.join(absoluteDirectory, entry.name);
		const relativeEntry = normalizeRelativePath(path.relative(projectRoot, absoluteEntry));

		if (entry.isDirectory()) {
			collectCandidatesFromDirectory(projectRoot, absoluteEntry, candidates, findings, issues, policy);
			continue;
		}

		if (!entry.isFile()) {
			continue;
		}

		const language = languageForPath(absoluteEntry);
		if (language) {
			candidates.push({ absolutePath: absoluteEntry, relativePath: relativeEntry, language });
		}
	}
}

function collectSourceCandidates(
	projectRoot: string,
	options: InspectRouteOutlineOptions,
	policy: RouteOutlinePolicy,
	findings: RouteOutlineFinding[],
	issues: string[],
): readonly SourceFileCandidate[] {
	const candidates: SourceFileCandidate[] = [];

	for (const targetPath of options.paths) {
		let absolutePath: string;
		let relativePath: string;
		try {
			const normalized = normalizeTargetPath(projectRoot, targetPath);
			absolutePath = normalized.absolutePath;
			relativePath = normalized.relativePath;
			ensureInsideWithoutSymlinks(projectRoot, absolutePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(message);
			findings.push(makeFinding('code_route_outline_path_outside_root', 'high', targetPath, message));
			continue;
		}

		let stats;
		try {
			stats = lstatSync(absolutePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(`${relativePath}: ${message}`);
			findings.push(makeFinding('code_route_outline_unreadable_path', 'high', relativePath, message));
			continue;
		}

		if (stats.isDirectory()) {
			collectCandidatesFromDirectory(projectRoot, absolutePath, candidates, findings, issues, policy);
			continue;
		}

		if (!stats.isFile()) {
			findings.push(makeFinding('code_route_outline_unsupported_file', 'low', relativePath, `${relativePath} is not a regular source file.`));
			continue;
		}

		const language = languageForPath(absolutePath);
		if (!language) {
			findings.push(makeFinding('code_route_outline_unsupported_file', 'low', relativePath, `${relativePath} is not a supported route source file.`));
			continue;
		}

		candidates.push({ absolutePath, relativePath, language });
	}

	if (candidates.length > policy.max_files) {
		const overflow = candidates.length - policy.max_files;
		findings.push(
			makeFinding(
				'code_route_outline_max_files_exceeded',
				'high',
				'.',
				`Route outline matched ${candidates.length} files; max_files is ${policy.max_files}. ${overflow} files were skipped.`,
			),
		);
	}

	return candidates.slice(0, policy.max_files);
}

function frameworkEvidence(text: string): readonly RouteOutlineFramework[] {
	const evidence = new Set<RouteOutlineFramework>();
	if (/(?:from\s+['"]hono['"]|new\s+Hono\b|createFactory\s*\()/u.test(text)) {
		evidence.add('hono');
	}
	if (/(?:from\s+['"]elysia['"]|new\s+Elysia\b|\bt\.(?:Object|String|Number|Boolean)\s*\()/u.test(text)) {
		evidence.add('elysia');
	}
	if (/(?:use\s+axum::|\baxum::Router\b|\bRouter::new\s*\(|\brouting::\{[^}]*\bget\b)/u.test(text)) {
		evidence.add('axum');
	}
	if (/(?:from\s+['"]@nestjs\/(?:common|core)['"]|@Controller\s*\(|@Get\s*\(|@UseGuards\s*\(|NestFactory\.create\s*\()/u.test(text)) {
		evidence.add('nestjs');
	}
	return [...evidence].sort((left, right) => left.localeCompare(right));
}

function stripStringsAndComments(line: string): string {
	return line
		.replace(/\/\/.*$/u, '')
		.replace(/"(?:\\.|[^"\\])*"/gu, '""')
		.replace(/'(?:\\.|[^'\\])*'/gu, "''")
		.replace(/`(?:\\.|[^`\\])*`/gu, '``');
}

function countCharacterDelta(line: string, open: string, close: string): number {
	let delta = 0;
	for (const character of stripStringsAndComments(line)) {
		if (character === open) {
			delta += 1;
		} else if (character === close) {
			delta -= 1;
		}
	}
	return delta;
}

function findChainStartLine(lines: readonly string[], routeIndex: number): number {
	let start = routeIndex;
	const minIndex = Math.max(0, routeIndex - 24);
	let index = routeIndex - 1;
	while (index >= minIndex) {
		const trimmed = (lines[index] ?? '').trim();
		if (trimmed.length === 0 || trimmed.endsWith(';')) {
			break;
		}
		if (/^(?:\.|const\b|let\b|var\b|export\b|return\b)|new\s+Elysia\b|new\s+Hono\b|Router::new\s*\(/u.test(trimmed)) {
			start = index;
			index -= 1;
			continue;
		}
		break;
	}
	return start + 1;
}

function findChainEndLine(lines: readonly string[], routeIndex: number): number {
	let balance = 0;
	let sawRouteCall = false;
	const maxIndex = Math.min(lines.length, routeIndex + 40);
	let index = routeIndex;
	while (index < maxIndex) {
		const line = lines[index] ?? '';
		if (ROUTE_METHODS.some((method) => new RegExp(`\\.\\s*${method}\\s*\\(`, 'u').test(line))) {
			sawRouteCall = true;
		}
		balance += countCharacterDelta(line, '(', ')');
		if (sawRouteCall && balance <= 0 && /[);]\s*$/u.test(line.trim())) {
			return index + 1;
		}
		index += 1;
	}
	return routeIndex + 1;
}

function lineContainsRouteMethod(line: string): RouteOutlineMethod | null {
	for (const method of ROUTE_METHODS) {
		if (new RegExp(`\\.\\s*${method}\\s*\\(`, 'u').test(line)) {
			return method;
		}
	}
	return null;
}

function lineContainsAxumRouterMethod(line: string): (typeof AXUM_ROUTER_METHODS)[number] | null {
	for (const method of AXUM_ROUTER_METHODS) {
		if (new RegExp(`\\.\\s*${method}\\s*\\(`, 'u').test(line)) {
			return method;
		}
	}
	return null;
}

function extractRoutePath(statement: string, method: RouteOutlineMethod): string | null {
	const match = new RegExp(`\\.\\s*${method}\\s*\\(\\s*(?<quote>['"\`])(?<path>(?:\\\\.|(?!\\k<quote>)[^\\\\])*)\\k<quote>`, 'u').exec(statement);
	if (!match?.groups?.path) {
		return null;
	}
	const routePath = match.groups.path.replace(/\\(['"`\\/])/gu, '$1');
	return routePath.includes('${') ? null : routePath;
}

function extractRustStringRoutePath(statement: string, method: RouteOutlineMethod): string | null {
	const match = new RegExp(`\\.\\s*${method}\\s*\\(\\s*"(?<path>(?:\\\\.|[^"\\\\])*)"`, 'u').exec(statement);
	if (!match?.groups?.path) {
		return null;
	}
	return match.groups.path.replace(/\\"/gu, '"').replace(/\\\\/gu, '\\');
}

function offsetForStatementLine(lines: readonly string[], lineOffset: number): number {
	if (lineOffset <= 0) {
		return 0;
	}
	return lines.slice(0, lineOffset).join('\n').length + 1;
}

function findMatchingParenEnd(value: string, openParenIndex: number): number {
	let depth = 0;
	let quote: '"' | "'" | '`' | null = null;
	let escaped = false;

	let index = openParenIndex;
	while (index < value.length) {
		const character = value[index];

		if (quote) {
			if (escaped) {
				escaped = false;
			} else if (character === '\\') {
				escaped = true;
			} else if (character === quote) {
				quote = null;
			}
			index += 1;
			continue;
		}

		if (character === '"' || character === "'" || character === '`') {
			quote = character;
			index += 1;
			continue;
		}

		if (character === '(') {
			depth += 1;
			index += 1;
			continue;
		}

		if (character === ')') {
			depth -= 1;
			if (depth === 0) {
				return index + 1;
			}
		}

		index += 1;
	}

	return value.length;
}

function extractMethodCallSegment(
	statement: string,
	statementLines: readonly string[],
	method: RouteOutlineMethod,
	routeLineOffset: number,
): { readonly value: string; readonly startOffset: number } {
	const searchStart = offsetForStatementLine(statementLines, routeLineOffset);
	const callMatch = new RegExp(`\\.\\s*${method}\\s*\\(`, 'u').exec(statement.slice(searchStart));
	if (!callMatch) {
		return { value: statement, startOffset: 0 };
	}

	const startOffset = searchStart + callMatch.index;
	const openParenIndex = startOffset + callMatch[0].lastIndexOf('(');
	const endOffset = findMatchingParenEnd(statement, openParenIndex);
	return { value: statement.slice(startOffset, endOffset), startOffset };
}

function extractLifecycle(statementBeforeRoute: string): readonly RouteOutlineLifecycle[] {
	const values: RouteOutlineLifecycle[] = [];
	for (const lifecycle of LIFECYCLE_METHODS) {
		if (new RegExp(`\\.\\s*${lifecycle}\\s*\\(`, 'u').test(statementBeforeRoute)) {
			values.push(lifecycle);
		}
	}
	return values;
}

function lineNumberForOffset(statement: string, startLine: number, offset: number): number {
	return startLine + statement.slice(0, offset).split('\n').length - 1;
}

function extractLeadingRustExpressionName(value: string): string | null {
	const match = /^\s*(?<name>[A-Za-z_]\w*(?:::[A-Za-z_]\w*)*)\b/u.exec(value);
	return match?.groups?.name ?? null;
}

function extractAxumAdapterHandler(statement: string, method: RouteOutlineMethod): string | null {
	const callStart = new RegExp(`\\.\\s*${method}\\s*\\(`, 'u').exec(statement);
	if (!callStart) {
		return null;
	}

	const afterCall = statement.slice(callStart.index + callStart[0].length);
	if (method === 'fallback' || method === 'merge') {
		return extractLeadingRustExpressionName(afterCall);
	}

	const commaIndex = afterCall.indexOf(',');
	if (commaIndex === -1) {
		return null;
	}

	return extractLeadingRustExpressionName(afterCall.slice(commaIndex + 1));
}

function extractAxumRouteEntries(
	relativePath: string,
	language: RouteOutlineLanguage,
	contentSha256: string,
	lines: readonly string[],
	index: number,
	method: (typeof AXUM_ROUTER_METHODS)[number],
): readonly RouteOutlineRoute[] {
	const chainStartLine = findChainStartLine(lines, index);
	const chainEndLine = findChainEndLine(lines, index);
	const statementLines = lines.slice(chainStartLine - 1, chainEndLine);
	const statement = statementLines.join('\n');
	const routeLineOffset = index - (chainStartLine - 1);
	const callSegment = extractMethodCallSegment(statement, statementLines, method, routeLineOffset);
	const routePath = extractRustStringRoutePath(callSegment.value, method);
	const signature = compactSignature(lines, chainStartLine, chainEndLine);

	if (method !== 'route') {
		const handlerName = extractAxumAdapterHandler(callSegment.value, method);
		return [
			{
				id: `${relativePath}:${index + 1}:axum:${method}:${routePath ?? '<dynamic>'}`,
				path: relativePath,
				language,
				framework: 'axum',
				method,
				route_path: routePath,
				line: index + 1,
				chain_start_line: chainStartLine,
				chain_end_line: chainEndLine,
				handler_line: index + 1,
				handler_name: handlerName,
				lifecycle: [],
				signature,
				content_sha256: contentSha256,
			},
		];
	}

	const entries: RouteOutlineRoute[] = [];
	const methodPattern = new RegExp(
		`\\b(?<method>${AXUM_HTTP_METHODS.join('|')})\\s*\\(\\s*(?<handler>[A-Za-z_]\\w*(?:::[A-Za-z_]\\w*)*)`,
		'gu',
	);
	for (const match of callSegment.value.matchAll(methodPattern)) {
		const httpMethod = match.groups?.method as (typeof AXUM_HTTP_METHODS)[number] | undefined;
		const handlerName = match.groups?.handler;
		if (!httpMethod || !handlerName) {
			continue;
		}
		const handlerLine = lineNumberForOffset(statement, chainStartLine, callSegment.startOffset + (match.index ?? 0));
		const routeKey = routePath ?? '<dynamic>';
		entries.push({
			id: `${relativePath}:${handlerLine}:axum:${httpMethod}:${routeKey}:${handlerName}`,
			path: relativePath,
			language,
			framework: 'axum',
			method: httpMethod,
			route_path: routePath,
			line: index + 1,
			chain_start_line: chainStartLine,
			chain_end_line: chainEndLine,
			handler_line: handlerLine,
			handler_name: handlerName,
			lifecycle: [],
			signature,
			content_sha256: contentSha256,
		});
	}

	if (entries.length > 0) {
		return entries;
	}

	const handlerName = extractAxumAdapterHandler(callSegment.value, method);
	return [
		{
			id: `${relativePath}:${index + 1}:axum:${method}:${routePath ?? '<dynamic>'}`,
			path: relativePath,
			language,
			framework: 'axum',
			method,
			route_path: routePath,
			line: index + 1,
			chain_start_line: chainStartLine,
			chain_end_line: chainEndLine,
			handler_line: index + 1,
			handler_name: handlerName,
			lifecycle: [],
			signature,
			content_sha256: contentSha256,
		},
	];
}

function frameworkBindings(lines: readonly string[]): FrameworkBindings {
	const bindings = new Map<string, RouteOutlineFramework>();
	for (const line of lines) {
		const honoMatch = /\b(?:export\s+)?(?:const|let|var)\s+(?<name>[$A-Z_a-z][$\w]*)\s*=\s*new\s+Hono\b/u.exec(line);
		if (honoMatch?.groups?.name) {
			bindings.set(honoMatch.groups.name, 'hono');
		}

		const elysiaMatch = /\b(?:export\s+)?(?:const|let|var)\s+(?<name>[$A-Z_a-z][$\w]*)\s*=\s*new\s+Elysia\b/u.exec(line);
		if (elysiaMatch?.groups?.name) {
			bindings.set(elysiaMatch.groups.name, 'elysia');
		}
	}
	return bindings;
}

function routeReceiver(line: string, method: RouteOutlineMethod): string | null {
	const match = new RegExp(`\\b(?<receiver>[$A-Z_a-z][$\\w]*)\\s*\\.\\s*${method}\\s*\\(`, 'u').exec(line);
	return match?.groups?.receiver ?? null;
}

function inferFramework(
	statement: string,
	fileEvidence: readonly RouteOutlineFramework[],
	bindings: FrameworkBindings,
	receiver: string | null,
): RouteOutlineFramework {
	if (receiver) {
		const boundFramework = bindings.get(receiver);
		if (boundFramework) {
			return boundFramework;
		}
	}
	if (/new\s+Elysia\b|\.(?:guard|resolve|derive|decorate|onBeforeHandle|beforeHandle|onAfterHandle|onError)\s*\(/u.test(statement)) {
		return 'elysia';
	}
	if (/new\s+Hono\b|from\s+['"]hono['"]/u.test(statement)) {
		return 'hono';
	}
	if (/\bRouter::new\s*\(|\brouting::\{|\b(?:get|post|put|patch|delete|options|head|any)\s*\(/u.test(statement)) {
		return 'axum';
	}
	if (/@(?:Controller|Get|Post|Put|Patch|Delete|Options|Head|All)\b/u.test(statement)) {
		return 'nestjs';
	}
	if (fileEvidence.length === 1) {
		return fileEvidence[0] ?? 'unknown';
	}
	return 'unknown';
}

function compactSignature(lines: readonly string[], startLine: number, endLine: number): string {
	const parts: string[] = [];
	const maxIndex = Math.min(endLine, startLine + 5);
	let index = startLine - 1;
	while (index < maxIndex) {
		const trimmed = (lines[index] ?? '').trim();
		if (trimmed.length > 0) {
			parts.push(trimmed);
		}
		index += 1;
	}
	const signature = parts.join(' ').replace(/\s+/gu, ' ');
	return signature.length > 240 ? `${signature.slice(0, 237)}...` : signature;
}

function extractRoutesFromFile(
	relativePath: string,
	language: RouteOutlineLanguage,
	contentSha256: string,
	text: string,
): readonly RouteOutlineRoute[] {
	const evidence = frameworkEvidence(text);
	if (evidence.length === 0) {
		return [];
	}

	const lines = text.split(/\r\n|\r|\n/u);
	const routes: RouteOutlineRoute[] = [];
	const bindings = frameworkBindings(lines);
	const nestjsBlocks = evidence.includes('nestjs') ? findNestjsControllerBlocks(lines) : [];
	for (const block of nestjsBlocks) {
		routes.push(...extractNestjsRouteEntries(relativePath, language, contentSha256, lines, block));
	}

	for (const [index, line] of lines.entries()) {
		if (language === 'rust') {
			const axumMethod = lineContainsAxumRouterMethod(line);
			if (!axumMethod) {
				continue;
			}
			routes.push(
				...extractAxumRouteEntries(relativePath, language, contentSha256, lines, index, axumMethod),
			);
			continue;
		}

		const method = lineContainsRouteMethod(line);
		if (!method) {
			continue;
		}

		if (nestjsBlocks.some((block) => index + 1 >= block.startLine && index + 1 <= block.endLine)) {
			continue;
		}

		const chainStartLine = findChainStartLine(lines, index);
		const chainEndLine = findChainEndLine(lines, index);
		const statementLines = lines.slice(chainStartLine - 1, chainEndLine);
		const statement = statementLines.join('\n');
		const routeLineOffset = index - (chainStartLine - 1);
		const statementBeforeRoute = statementLines.slice(0, routeLineOffset).join('\n');
		const routePath = extractRoutePath(statement, method);
		const framework = inferFramework(statement, evidence, bindings, routeReceiver(line, method));
		const routeKey = routePath ?? '<dynamic>';
		routes.push({
			id: `${relativePath}:${index + 1}:${framework}:${method}:${routeKey}`,
			path: relativePath,
			language,
			framework,
			method,
			route_path: routePath,
			line: index + 1,
			chain_start_line: chainStartLine,
			chain_end_line: chainEndLine,
			handler_line: index + 1,
			handler_name: null,
			lifecycle: extractLifecycle(statementBeforeRoute),
			signature: compactSignature(lines, chainStartLine, chainEndLine),
			content_sha256: contentSha256,
		});
	}

	return routes;
}

function createInputHash(
	policy: RouteOutlinePolicy,
	files: readonly RouteOutlineFile[],
	routes: readonly RouteOutlineRoute[],
	findings: readonly RouteOutlineFinding[],
): string {
	const inputState = {
		policy,
		files: files.map((file) => ({
			path: file.path,
			sha256: file.sha256,
			size_bytes: file.size_bytes,
			route_count: file.route_count,
		})),
		routes: routes.map((route) => ({
			id: route.id,
			path: route.path,
			framework: route.framework,
			method: route.method,
			route_path: route.route_path,
			line: route.line,
		})),
		input_errors: findings
			.filter((finding) => ERROR_CODES.has(finding.code))
			.map((finding) => ({ code: finding.code, path: finding.path })),
	};
	return sha256Tagged(JSON.stringify(inputState));
}

function outlineStatus(findings: readonly RouteOutlineFinding[]): ScriptCheckStatus {
	return findings.some((finding) => ERROR_CODES.has(finding.code))
		? 'error'
		: findings.length > 0
			? 'failed'
			: 'passed';
}

export function inspectRouteOutline(projectRoot: string, options: InspectRouteOutlineOptions): RouteOutlineReport {
	const root = path.resolve(projectRoot);
	const policy: RouteOutlinePolicy = {
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		max_files: options.maxFiles ?? DEFAULT_MAX_FILES,
		extensions: [...ROUTE_OUTLINE_EXTENSIONS],
		ignored_directories: [...IGNORED_DIRECTORIES],
	};
	const files: RouteOutlineFile[] = [];
	const routes: RouteOutlineRoute[] = [];
	const findings: RouteOutlineFinding[] = [];
	const issues: string[] = [];
	const candidates = collectSourceCandidates(root, options, policy, findings, issues);

	for (const candidate of candidates) {
		let buffer: Buffer;
		try {
			buffer = readFileInsideWithoutSymlinks(root, candidate.absolutePath, { maxBytes: policy.max_file_bytes });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const code = message.includes('exceeds maximum size')
				? 'code_route_outline_file_too_large'
				: 'code_route_outline_unreadable_path';
			issues.push(`${candidate.relativePath}: ${message}`);
			findings.push(makeFinding(code, 'high', candidate.relativePath, message));
			continue;
		}

		const contentSha256 = sha256Tagged(buffer);
		const text = buffer.toString('utf8');
		const fileRoutes = extractRoutesFromFile(candidate.relativePath, candidate.language, contentSha256, text);
		routes.push(...fileRoutes);
		files.push({
			kind: 'source_file',
			path: candidate.relativePath,
			language: candidate.language,
			framework_evidence: frameworkEvidence(text),
			sha256: contentSha256,
			size_bytes: buffer.byteLength,
			line_count: text.split(/\r\n|\r|\n/u).length,
			route_count: fileRoutes.length,
		});
	}

	const status = outlineStatus(findings);
	const sortedRoutes = routes.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line);
	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: 'code',
		script_id: CODE_ROUTE_OUTLINE_SCRIPT_ID,
		script_ref: CODE_ROUTE_OUTLINE_SCRIPT_REF,
		action: 'scan',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createInputHash(policy, files, sortedRoutes, findings),
		files,
		routes: sortedRoutes,
		findings,
		issues,
	};
}
interface NestjsControllerBlock {
	readonly startLine: number;
	readonly endLine: number;
	readonly className: string;
	readonly controllerPath: string;
}

function findNestjsControllerBlocks(lines: readonly string[]): readonly NestjsControllerBlock[] {
	const blocks: NestjsControllerBlock[] = [];

	let index = 0;
	while (index < lines.length) {
		const line = lines[index] ?? '';
		if (!/@Controller\s*\(/.test(line)) {
			index += 1;
			continue;
		}

		const controllerPath = extractNestjsControllerPath(line);
		if (controllerPath === null) {
			index += 1;
			continue;
		}

		const classLine = findNextClassDeclaration(lines, index + 1);
		if (classLine === null) {
			index += 1;
			continue;
		}

		const endLine = findClassBodyEnd(lines, classLine);
		if (endLine === null) {
			index += 1;
			continue;
		}

		const className = extractClassName(lines[classLine] ?? '') ?? '<anonymous>';
		blocks.push({
			startLine: index + 1,
			endLine: endLine + 1,
			className,
			controllerPath,
		});
		index = endLine + 1;
	}

	return blocks;
}

function extractNestjsControllerPath(decoratorLine: string): string | null {
	const callStart = /@Controller\s*\(/.exec(decoratorLine);
	if (!callStart) {
		return null;
	}

	const openParenIndex = callStart.index + callStart[0].lastIndexOf('(');
	const endIndex = findMatchingParenEnd(decoratorLine, openParenIndex);
	if (endIndex <= openParenIndex) {
		return null;
	}

	const argument = decoratorLine.slice(openParenIndex + 1, endIndex - 1).trim();
	if (argument.length === 0) {
		return '';
	}

	const quoted = argument.match(/^(['"])((?:\\.|(?!\1)[^\\])*)\1/u);
	if (quoted?.[2] !== undefined) {
		return quoted[2].replace(/\\(['"`\\/])/gu, '$1');
	}

	const optionsMatch = argument.match(/path\s*:\s*(['"])((?:\\.|(?!\2)[^\\])*)\2/u);
	if (optionsMatch?.[2] !== undefined) {
		return optionsMatch[2].replace(/\\(['"`\\/])/gu, '$1');
	}

	return null;
}

function findNextClassDeclaration(lines: readonly string[], fromIndex: number): number | null {
	let index = fromIndex;
	while (index < lines.length) {
		const trimmed = (lines[index] ?? '').trim();
		if (trimmed.length === 0) {
			index += 1;
			continue;
		}
		if (/\b(?:export\s+)?(?:abstract\s+)?class\s+[$A-Z_a-z][$\w]*/u.test(trimmed)) {
			return index;
		}
		if (/@[A-Z]\w*/u.test(trimmed)) {
			index += 1;
			continue;
		}
		return null;
	}
	return null;
}

function findClassBodyEnd(lines: readonly string[], classLine: number): number | null {
	const openBraceIndex = (lines[classLine] ?? '').indexOf('{');
	if (openBraceIndex === -1) {
		return null;
	}

	let depth = 0;
	let index = classLine;
	while (index < lines.length) {
		depth += countCharacterDelta(lines[index] ?? '', '{', '}');
		if (depth <= 0) {
			return index;
		}
		index += 1;
	}
	return null;
}

function extractClassName(classLine: string): string | null {
	const match = /\bclass\s+(?<name>[$A-Z_a-z][$\w]*)/u.exec(classLine);
	return match?.groups?.name ?? null;
}

function extractNestjsMethodPath(decoratorLine: string): string | null {
	const callStart = /(?:^|\s)@(?<method>Get|Post|Put|Patch|Delete|Options|Head|All)\s*\(/.exec(decoratorLine);
	if (!callStart) {
		return null;
	}

	const openParenIndex = callStart.index + callStart[0].lastIndexOf('(');
	const endIndex = findMatchingParenEnd(decoratorLine, openParenIndex);
	if (endIndex <= openParenIndex) {
		return null;
	}

	const argument = decoratorLine.slice(openParenIndex + 1, endIndex - 1).trim();
	if (argument.length === 0) {
		return '';
	}

	const quoted = argument.match(/^(['"])((?:\\.|(?!\1)[^\\])*)\1/u);
	if (quoted?.[2] !== undefined) {
		return quoted[2].replace(/\\(['"`\\/])/gu, '$1');
	}

	const pathMatch = argument.match(/path\s*:\s*(['"])((?:\\.|(?!\2)[^\\])*)\2/u);
	if (pathMatch?.[2] !== undefined) {
		return pathMatch[2].replace(/\\(['"`\\/])/gu, '$1');
	}

	return null;
}

function joinNestjsRoutePath(controllerPath: string, methodPath: string): string {
	const left = controllerPath.replace(/\/+$/u, '');
	const right = methodPath.replace(/^\/+/u, '');
	if (left.length === 0) {
		return right.length === 0 ? '/' : `/${right}`;
	}
	if (right.length === 0) {
		return `/${left}`;
	}
	return `/${left}/${right}`;
}
function mergeNestjsLifecycle(
	left: readonly RouteOutlineLifecycle[],
	right: readonly RouteOutlineLifecycle[],
): readonly RouteOutlineLifecycle[] {
	const values: RouteOutlineLifecycle[] = [];
	const seen = new Set<RouteOutlineLifecycle>();
	for (const value of [...left, ...right]) {
		if (seen.has(value)) {
			continue;
		}
		seen.add(value);
		values.push(value);
	}
	return values;
}

function extractNestjsLifecycleDecorator(line: string): RouteOutlineLifecycle | null {
	const match = /@(?<decorator>UseGuards|UseInterceptors|UsePipes|UseFilters)\b/u.exec(line);
	if (!match?.groups?.decorator) {
		return null;
	}
	const lifecycle = `${match.groups.decorator.charAt(0).toLowerCase()}${match.groups.decorator.slice(1)}`;
	return NESTJS_LIFECYCLE_DECORATORS.includes(lifecycle as (typeof NESTJS_LIFECYCLE_DECORATORS)[number])
		? (lifecycle as RouteOutlineLifecycle)
		: null;
}

function extractNestjsHandlerName(line: string): string | null {
	const signature = line.trimStart();
	if (signature.length === 0) {
		return null;
	}
	let offset = signature.startsWith('*') ? 1 : 0;
	offset = skipAsciiWhitespace(signature, offset);
	while (true) {
		const next = readIdentifier(signature, offset);
		if (next === null || !isNestjsHandlerModifier(next.value)) {
			break;
		}
		offset = skipAsciiWhitespace(signature, next.end);
	}
	if (signature.charAt(offset) === '*') {
		offset = skipAsciiWhitespace(signature, offset + 1);
	}
	const nameToken = readIdentifier(signature, offset);
	if (nameToken === null) {
		return null;
	}
	const callStart = skipAsciiWhitespace(signature, nameToken.end);
	if (signature.charAt(callStart) !== '(') {
		return null;
	}
	const name = nameToken.value;
	if (/\b(?:if|for|while|switch|return|class|interface|function|new|throw|typeof|in|of)\b/u.test(name)) {
		return null;
	}
	return name;
}

function skipAsciiWhitespace(text: string, offset: number): number {
	let index = offset;
	while (index < text.length) {
		const code = text.charCodeAt(index);
		if (code !== 9 && code !== 10 && code !== 11 && code !== 12 && code !== 13 && code !== 32) {
			break;
		}
		index += 1;
	}
	return index;
}

function readIdentifier(text: string, offset: number): { readonly value: string; readonly end: number } | null {
	const first = text.charCodeAt(offset);
	if (!isIdentifierStart(first)) {
		return null;
	}
	let end = offset + 1;
	while (end < text.length && isIdentifierPart(text.charCodeAt(end))) {
		end += 1;
	}
	return { value: text.slice(offset, end), end };
}

function isIdentifierStart(code: number): boolean {
	return code === 36 || code === 95 || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isIdentifierPart(code: number): boolean {
	return isIdentifierStart(code) || (code >= 48 && code <= 57);
}

function isNestjsHandlerModifier(value: string): boolean {
	return (
		value === 'public' ||
		value === 'private' ||
		value === 'protected' ||
		value === 'async' ||
		value === 'static' ||
		value === 'readonly'
	);
}

function extractNestjsRouteEntries(
	relativePath: string,
	language: RouteOutlineLanguage,
	contentSha256: string,
	lines: readonly string[],
	block: NestjsControllerBlock,
): readonly RouteOutlineRoute[] {
	const routes: RouteOutlineRoute[] = [];

	let controllerLifecycle: readonly RouteOutlineLifecycle[] = [];
	let method: (typeof NESTJS_CONTROLLER_METHODS)[number] | null = null;
	let methodPath: string | null = null;
	let methodLifecycle: readonly RouteOutlineLifecycle[] = [];
	let handlerName: string | null = null;
	let decoratorLocalLine = 0;
	let handlerLocalLine = 0;

	const relativeLine = (localLine: number) => block.startLine + localLine;

	const commit = () => {
		if (method === null) {
			return;
		}
		const fullPath = joinNestjsRoutePath(block.controllerPath, methodPath === null ? '' : methodPath);
		const signature = compactSignature(lines, relativeLine(decoratorLocalLine), relativeLine(handlerLocalLine));
		const lifecycle = mergeNestjsLifecycle(controllerLifecycle, methodLifecycle);
		const resolvedHandler = handlerName ?? '<anonymous>';
		routes.push({
			id: `${relativePath}:${relativeLine(decoratorLocalLine)}:nestjs:${method}:${fullPath || '<root>'}`,
			path: relativePath,
			language,
			framework: 'nestjs',
			method,
			route_path: fullPath,
			line: relativeLine(decoratorLocalLine),
			chain_start_line: block.startLine,
			chain_end_line: relativeLine(handlerLocalLine),
			handler_line: relativeLine(handlerLocalLine),
			handler_name: resolvedHandler,
			lifecycle,
			signature,
			content_sha256: contentSha256,
		});
	};

	const beginMethod = (
		nextMethod: (typeof NESTJS_CONTROLLER_METHODS)[number],
		nextMethodPath: string | null,
		localLine: number,
	) => {
		commit();
		method = nextMethod;
		methodPath = nextMethodPath;
		methodLifecycle = [];
		handlerName = null;
		decoratorLocalLine = localLine;
		handlerLocalLine = localLine;
	};

	const blockLines = lines.slice(block.startLine - 1, block.endLine);

	let index = 0;
	while (index < blockLines.length) {
		const line = blockLines[index] ?? '';

		const decoratorMatch = /@(?<method>Get|Post|Put|Patch|Delete|Options|Head|All)\s*\(/.exec(line);
		if (decoratorMatch?.groups?.method) {
			beginMethod(
				(decoratorMatch.groups.method as string).toLowerCase() as (typeof NESTJS_CONTROLLER_METHODS)[number],
				extractNestjsMethodPath(line),
				index,
			);
			index += 1;
			continue;
		}

		const lifecycle = extractNestjsLifecycleDecorator(line);
		if (method === null) {
			if (lifecycle !== null) {
				controllerLifecycle = mergeNestjsLifecycle(controllerLifecycle, [lifecycle]);
			}
			index += 1;
			continue;
		}

		if (lifecycle !== null) {
			methodLifecycle = mergeNestjsLifecycle(methodLifecycle, [lifecycle]);
		}

		const name = extractNestjsHandlerName(line);
		if (name !== null) {
			handlerName = name;
			handlerLocalLine = index;
		}
		index += 1;
	}

	commit();
	return routes;
}
