import { createHash } from 'node:crypto';
import { lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';
import { ensureInside, ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './safe-filesystem.js';

export const CODE_ROUTE_OUTLINE_SCRIPT_ID = 'route-outline';
export const CODE_ROUTE_OUTLINE_SCRIPT_REF = `code/${CODE_ROUTE_OUTLINE_SCRIPT_ID}`;

export type RouteOutlineLanguage =
	| 'typescript'
	| 'tsx'
	| 'javascript'
	| 'jsx'
	| 'javascript-module'
	| 'javascript-commonjs';
export type RouteOutlineFramework = 'hono' | 'elysia' | 'unknown';
export type RouteOutlineMethod =
	| 'get'
	| 'post'
	| 'put'
	| 'patch'
	| 'delete'
	| 'options'
	| 'all'
	| 'use'
	| 'route';
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
	| 'onError';

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
const ROUTE_OUTLINE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const;
const ROUTE_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'all', 'use', 'route'] as const;
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
const IGNORED_DIRECTORIES = [
	'.git',
	'.mustflow/cache',
	'.mustflow/state',
	'node_modules',
	'dist',
	'build',
	'coverage',
	'.next',
	'.turbo',
] as const;
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
		default:
			return null;
	}
}

function isIgnoredDirectory(relativePath: string): boolean {
	const normalized = normalizeRelativePath(relativePath);
	return IGNORED_DIRECTORIES.some((directory) => normalized === directory || normalized.startsWith(`${directory}/`));
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
		if (/^(?:\.|const\b|let\b|var\b|export\b|return\b)|new\s+Elysia\b|new\s+Hono\b/u.test(trimmed)) {
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

function extractRoutePath(statement: string, method: RouteOutlineMethod): string | null {
	const match = new RegExp(`\\.\\s*${method}\\s*\\(\\s*(?<quote>['"\`])(?<path>(?:\\\\.|(?!\\k<quote>)[^\\\\])*)\\k<quote>`, 'u').exec(statement);
	if (!match?.groups?.path) {
		return null;
	}
	const routePath = match.groups.path.replace(/\\(['"`\\/])/gu, '$1');
	return routePath.includes('${') ? null : routePath;
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

	for (const [index, line] of lines.entries()) {
		const method = lineContainsRouteMethod(line);
		if (!method) {
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
