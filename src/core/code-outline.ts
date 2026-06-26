import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
	type ScriptCheckArtifact,
	type ScriptCheckFinding,
	type ScriptCheckFindingSeverity,
	type ScriptCheckStatus,
} from './script-check-result.js';
import { DEFAULT_IGNORED_DIRECTORIES, isIgnoredDirectoryPath } from './ignored-directories.js';
import { ensureInside, ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './safe-filesystem.js';
import {
	listSourceAnchorFiles,
	parseSourceAnchorsInContent,
	sourceAnchorTextContainsSecretLike,
	splitSourceAnchorList,
} from './source-anchors.js';

export const CODE_PACK_ID = 'code';
export const CODE_OUTLINE_SCRIPT_ID = 'outline';
export const CODE_OUTLINE_SCRIPT_REF = `${CODE_PACK_ID}/${CODE_OUTLINE_SCRIPT_ID}`;
export const CODE_SYMBOL_READ_SCRIPT_ID = 'symbol-read';
export const CODE_SYMBOL_READ_SCRIPT_REF = `${CODE_PACK_ID}/${CODE_SYMBOL_READ_SCRIPT_ID}`;

export type CodeOutlineLanguage =
	| 'typescript'
	| 'tsx'
	| 'javascript'
	| 'jsx'
	| 'javascript-module'
	| 'javascript-commonjs'
	| 'astro'
	| 'svelte'
	| 'go'
	| 'rust'
	| 'python';

export type CodeSymbolKind = 'function' | 'class' | 'interface' | 'type' | 'enum' | 'variable';
export type CodeReturnBehavior = 'value' | 'void' | 'implicit_undefined' | 'mixed' | 'throws_only' | 'unknown';

export type CodeOutlineFindingCode =
	| 'code_outline_path_outside_root'
	| 'code_outline_unreadable_path'
	| 'code_outline_unsupported_file'
	| 'code_outline_file_too_large'
	| 'code_outline_max_files_exceeded';

export type CodeSymbolReadFindingCode =
	| 'code_symbol_read_path_outside_root'
	| 'code_symbol_read_unreadable_path'
	| 'code_symbol_read_invalid_range'
	| 'code_symbol_read_no_symbol_at_line'
	| 'code_symbol_read_anchor_not_found'
	| 'code_symbol_read_anchor_ambiguous'
	| 'code_symbol_read_anchor_without_symbol'
	| 'code_symbol_read_snippet_too_large';

export interface CodeOutlinePolicy {
	readonly max_file_bytes: number;
	readonly max_files: number;
	readonly extensions: readonly string[];
	readonly ignored_directories: readonly string[];
}

export interface CodeOutlineFile extends ScriptCheckArtifact {
	readonly kind: 'source_file';
	readonly language: CodeOutlineLanguage;
	readonly sha256: string;
	readonly size_bytes: number;
	readonly line_count: number;
	readonly symbol_count: number;
}

export interface CodeOutlineSymbol {
	readonly id: string;
	readonly path: string;
	readonly language: CodeOutlineLanguage;
	readonly kind: CodeSymbolKind;
	readonly name: string;
	readonly start_line: number;
	readonly end_line: number;
	readonly signature: string;
	readonly exported: boolean;
	readonly async: boolean;
	readonly return_type: string | null;
	readonly return_behavior: CodeReturnBehavior;
	readonly return_count: number;
	readonly return_lines: readonly number[];
	readonly return_preview: string | null;
	readonly parent: string | null;
	readonly content_sha256: string;
}

export interface CodeOutlineAnchor {
	readonly id: string;
	readonly path: string;
	readonly line_start: number;
	readonly line_end: number;
	readonly purpose: string | null;
	readonly search: readonly string[];
	readonly invariant: string | null;
	readonly risk: readonly string[];
	readonly navigation_only: true;
	readonly can_instruct_agent: false;
	readonly target_symbol_id: string | null;
	readonly target_kind: CodeSymbolKind | null;
	readonly target_name: string | null;
	readonly target_start_line: number | null;
}

export interface CodeOutlineFinding extends ScriptCheckFinding {
	readonly code: CodeOutlineFindingCode;
	readonly path: string;
}

export interface CodeOutlineReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof CODE_PACK_ID;
	readonly script_id: typeof CODE_OUTLINE_SCRIPT_ID;
	readonly script_ref: typeof CODE_OUTLINE_SCRIPT_REF;
	readonly action: 'scan';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: CodeOutlinePolicy;
	readonly input_hash: string;
	readonly files: readonly CodeOutlineFile[];
	readonly anchors: readonly CodeOutlineAnchor[];
	readonly symbols: readonly CodeOutlineSymbol[];
	readonly findings: readonly CodeOutlineFinding[];
	readonly issues: readonly string[];
}

export interface CodeSymbolReadPolicy {
	readonly anchor_id: string | null;
	readonly start_line: number | null;
	readonly end_line: number | null;
	readonly context_lines: number;
	readonly max_file_bytes: number;
	readonly max_snippet_lines: number;
}

export interface CodeSymbolReadTarget {
	readonly path: string;
	readonly language: CodeOutlineLanguage;
	readonly sha256: string;
	readonly size_bytes: number;
	readonly line_count: number;
	readonly requested_anchor_id: string | null;
	readonly requested_start_line: number | null;
	readonly requested_end_line: number | null;
	readonly resolved_start_line: number | null;
	readonly resolved_end_line: number | null;
	readonly context_start_line: number | null;
	readonly context_end_line: number | null;
	readonly anchor: CodeOutlineAnchor | null;
	readonly symbol: CodeOutlineSymbol | null;
}

export interface CodeSymbolReadSnippet {
	readonly path: string;
	readonly start_line: number;
	readonly end_line: number;
	readonly text: string;
}

export interface CodeSymbolReadFinding extends ScriptCheckFinding {
	readonly code: CodeSymbolReadFindingCode;
	readonly path: string;
	readonly start_line: number | null;
	readonly end_line: number | null;
}

export interface CodeSymbolReadReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof CODE_PACK_ID;
	readonly script_id: typeof CODE_SYMBOL_READ_SCRIPT_ID;
	readonly script_ref: typeof CODE_SYMBOL_READ_SCRIPT_REF;
	readonly action: 'read';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: CodeSymbolReadPolicy;
	readonly input_hash: string;
	readonly target: CodeSymbolReadTarget | null;
	readonly snippet: CodeSymbolReadSnippet | null;
	readonly findings: readonly CodeSymbolReadFinding[];
	readonly issues: readonly string[];
}

export interface InspectCodeOutlineOptions {
	readonly paths: readonly string[];
	readonly maxFileBytes?: number;
	readonly maxFiles?: number;
}

export interface ReadCodeSymbolOptions {
	readonly path?: string | null;
	readonly anchorId?: string | null;
	readonly startLine?: number | null;
	readonly endLine?: number | null;
	readonly contextLines?: number;
	readonly maxFileBytes?: number;
	readonly maxSnippetLines?: number;
}

interface SourceFileCandidate {
	readonly absolutePath: string;
	readonly relativePath: string;
	readonly language: CodeOutlineLanguage;
}

interface DeclarationMatch {
	readonly kind: CodeSymbolKind;
	readonly name: string;
	readonly exported: boolean;
	readonly async: boolean;
	readonly returnType: string | null;
}

interface CodeOutlineLanguageAdapter {
	readonly id: string;
	readonly extensions: readonly string[];
	languageForPath(filePath: string): CodeOutlineLanguage | null;
	extractSymbols(
		relativePath: string,
		language: CodeOutlineLanguage,
		contentSha256: string,
		text: string,
	): readonly CodeOutlineSymbol[];
}

const DEFAULT_MAX_FILE_BYTES = 1024 * 1024;
const DEFAULT_MAX_FILES = 200;
const DEFAULT_CONTEXT_LINES = 0;
const DEFAULT_MAX_SNIPPET_LINES = 250;
const RETURN_PREVIEW_MAX_CHARS = 120;
const TYPESCRIPT_JAVASCRIPT_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const;
const ASTRO_EXTENSIONS = ['.astro'] as const;
const SVELTE_EXTENSIONS = ['.svelte'] as const;
const GO_EXTENSIONS = ['.go'] as const;
const RUST_EXTENSIONS = ['.rs'] as const;
const PYTHON_EXTENSIONS = ['.py'] as const;
const IGNORED_DIRECTORIES = DEFAULT_IGNORED_DIRECTORIES;
const ERROR_OUTLINE_CODES = new Set<CodeOutlineFindingCode>([
	'code_outline_path_outside_root',
	'code_outline_unreadable_path',
	'code_outline_file_too_large',
	'code_outline_max_files_exceeded',
]);
const ERROR_SYMBOL_READ_CODES = new Set<CodeSymbolReadFindingCode>([
	'code_symbol_read_path_outside_root',
	'code_symbol_read_unreadable_path',
	'code_symbol_read_invalid_range',
	'code_symbol_read_no_symbol_at_line',
	'code_symbol_read_anchor_not_found',
	'code_symbol_read_anchor_ambiguous',
	'code_symbol_read_anchor_without_symbol',
	'code_symbol_read_snippet_too_large',
]);

function toPosixPath(value: string): string {
	return value.replace(/\\/gu, '/');
}

function normalizeRelativePath(value: string): string {
	return toPosixPath(value).replace(/^\.\/+/u, '') || '.';
}

function sha256Tagged(buffer: Buffer | string): string {
	return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function typescriptJavascriptLanguageForPath(filePath: string): CodeOutlineLanguage | null {
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

function astroLanguageForPath(filePath: string): CodeOutlineLanguage | null {
	return path.extname(filePath).toLowerCase() === '.astro' ? 'astro' : null;
}

function svelteLanguageForPath(filePath: string): CodeOutlineLanguage | null {
	return path.extname(filePath).toLowerCase() === '.svelte' ? 'svelte' : null;
}

function goLanguageForPath(filePath: string): CodeOutlineLanguage | null {
	return path.extname(filePath).toLowerCase() === '.go' ? 'go' : null;
}

function rustLanguageForPath(filePath: string): CodeOutlineLanguage | null {
	return path.extname(filePath).toLowerCase() === '.rs' ? 'rust' : null;
}

function pythonLanguageForPath(filePath: string): CodeOutlineLanguage | null {
	return path.extname(filePath).toLowerCase() === '.py' ? 'python' : null;
}

function languageAdapterForPath(filePath: string): CodeOutlineLanguageAdapter | null {
	return CODE_OUTLINE_LANGUAGE_ADAPTERS.find((adapter) => adapter.languageForPath(filePath) !== null) ?? null;
}

export function languageForPath(filePath: string): CodeOutlineLanguage | null {
	return languageAdapterForPath(filePath)?.languageForPath(filePath) ?? null;
}

function isIgnoredDirectory(relativePath: string): boolean {
	return isIgnoredDirectoryPath(normalizeRelativePath(relativePath), IGNORED_DIRECTORIES);
}

function makeOutlineFinding(
	code: CodeOutlineFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
): CodeOutlineFinding {
	return { code, severity, path: pathValue, message };
}

function makeSymbolReadFinding(
	code: CodeSymbolReadFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	startLine: number | null,
	endLine: number | null,
	message: string,
): CodeSymbolReadFinding {
	return { code, severity, path: pathValue, start_line: startLine, end_line: endLine, message };
}

function addMaxFilesFinding(
	findings: CodeOutlineFinding[],
	issues: string[],
	policy: CodeOutlinePolicy,
	pathValue: string,
): void {
	if (findings.some((finding) => finding.code === 'code_outline_max_files_exceeded')) {
		return;
	}

	const message = `Code outline matched more than ${policy.max_files} files; remaining files were skipped.`;
	issues.push(`${pathValue}: ${message}`);
	findings.push(makeOutlineFinding('code_outline_max_files_exceeded', 'high', pathValue, message));
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
	findings: CodeOutlineFinding[],
	issues: string[],
	policy: CodeOutlinePolicy,
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
		findings.push(makeOutlineFinding('code_outline_unreadable_path', 'high', relativeDirectory, message));
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
	options: InspectCodeOutlineOptions,
	policy: CodeOutlinePolicy,
	findings: CodeOutlineFinding[],
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
			findings.push(makeOutlineFinding('code_outline_path_outside_root', 'high', targetPath, message));
			continue;
		}

		let stats;
		try {
			stats = lstatSync(absolutePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(`${relativePath}: ${message}`);
			findings.push(makeOutlineFinding('code_outline_unreadable_path', 'high', relativePath, message));
			continue;
		}

		if (stats.isDirectory()) {
			collectCandidatesFromDirectory(projectRoot, absolutePath, candidates, findings, issues, policy);
			continue;
		}

		if (!stats.isFile()) {
			findings.push(makeOutlineFinding('code_outline_unsupported_file', 'low', relativePath, `${relativePath} is not a regular source file.`));
			continue;
		}

		const language = languageForPath(absolutePath);
		if (!language) {
			findings.push(makeOutlineFinding('code_outline_unsupported_file', 'low', relativePath, `${relativePath} is not a supported code file.`));
			continue;
		}

		candidates.push({ absolutePath, relativePath, language });
	}

	if (candidates.length > policy.max_files) {
		const overflow = candidates.length - policy.max_files;
		findings.push(
			makeOutlineFinding(
				'code_outline_max_files_exceeded',
				'high',
				'.',
				`Code outline matched ${candidates.length} files; max_files is ${policy.max_files}. ${overflow} files were skipped.`,
			),
		);
	}

	return candidates.slice(0, policy.max_files);
}

function stripLineForBraceScan(line: string): string {
	return line
		.replace(/\/\/.*$/u, '')
		.replace(/"(?:\\.|[^"\\])*"/gu, '""')
		.replace(/'(?:\\.|[^'\\])*'/gu, "''")
		.replace(/`(?:\\.|[^`\\])*`/gu, '``');
}

function braceDelta(line: string): number {
	const stripped = stripLineForBraceScan(line);
	let delta = 0;
	for (const character of stripped) {
		if (character === '{') {
			delta += 1;
		} else if (character === '}') {
			delta -= 1;
		}
	}
	return delta;
}

function declarationFromLine(line: string): DeclarationMatch | null {
	const trimmed = line.trim();
	const functionMatch =
		/^(?<exported>export\s+(?:default\s+)?)?(?<async>async\s+)?function\s+(?<name>[$A-Z_a-z][$\w]*)\s*\(/u.exec(
			trimmed,
		);
	if (functionMatch?.groups) {
		return {
			kind: 'function',
			name: functionMatch.groups.name ?? '<anonymous>',
			exported: Boolean(functionMatch.groups.exported),
			async: Boolean(functionMatch.groups.async),
			returnType: null,
		};
	}

	const shapeMatch = /^(?<exported>export\s+)?(?<kind>class|interface|type|enum)\s+(?<name>[$A-Z_a-z][$\w]*)/u.exec(trimmed);
	if (shapeMatch?.groups) {
		return {
			kind: shapeMatch.groups.kind as CodeSymbolKind,
			name: shapeMatch.groups.name ?? '<anonymous>',
			exported: Boolean(shapeMatch.groups.exported),
			async: false,
			returnType: null,
		};
	}

	const variableMatch = /^(?<exported>export\s+)?(?:const|let|var)\s+(?<name>[$A-Z_a-z][$\w]*)\s*[:=]/u.exec(trimmed);
	if (variableMatch?.groups && (Boolean(variableMatch.groups.exported) || /=>|function\s*\(/u.test(trimmed))) {
		return {
			kind: /=>|function\s*\(/u.test(trimmed) ? 'function' : 'variable',
			name: variableMatch.groups.name ?? '<anonymous>',
			exported: Boolean(variableMatch.groups.exported),
			async: /async\s*(?:\(|[A-Z_a-z_$])/u.test(trimmed),
			returnType: null,
		};
	}

	return null;
}

function findDeclarationEndLine(lines: readonly string[], startIndex: number): number {
	let balance = 0;
	let sawBrace = false;

	for (let index = startIndex; index < lines.length; index += 1) {
		const line = lines[index] ?? '';
		const delta = braceDelta(line);
		if (line.includes('{')) {
			sawBrace = true;
		}
		balance += delta;

		if (sawBrace && balance <= 0) {
			return index + 1;
		}

		if (!sawBrace && /;\s*$/u.test(line.trim())) {
			return index + 1;
		}
	}

	return lines.length;
}

function buildSignature(lines: readonly string[], startLine: number, endLine: number): string {
	const startIndex = startLine - 1;
	const endIndex = Math.min(endLine, startLine + 4);
	const parts: string[] = [];

	for (let index = startIndex; index < endIndex; index += 1) {
		const trimmed = (lines[index] ?? '').trim();
		if (trimmed.length > 0) {
			parts.push(trimmed);
		}
		if (/[{;]\s*$/u.test(trimmed) || /=>/u.test(trimmed) || /^(?:async\s+)?(?:def|class)\b.*:\s*$/u.test(trimmed)) {
			break;
		}
	}

	const signature = parts.join(' ').replace(/\s+/gu, ' ');
	return signature.length > 240 ? `${signature.slice(0, 237)}...` : signature;
}

function normalizeReturnType(value: string): string {
	return value.replace(/\s+/gu, ' ').replace(/[;{]\s*$/u, '').trim();
}

function extractExplicitReturnType(signature: string, match: DeclarationMatch): string | null {
	if (match.kind !== 'function') {
		return null;
	}
	if (match.returnType !== null) {
		return match.returnType;
	}

	const functionReturnMatch =
		/\bfunction(?:\s+[$A-Z_a-z][$\w]*)?\s*\([^)]*\)\s*:\s*(?<returnType>[^={;]+?)(?=\s*(?:\{|$))/u.exec(
			signature,
		);
	if (functionReturnMatch?.groups?.returnType) {
		return normalizeReturnType(functionReturnMatch.groups.returnType);
	}

	const arrowReturnMatch = /\)\s*:\s*(?<returnType>[^=]+?)\s*=>/u.exec(signature);
	if (arrowReturnMatch?.groups?.returnType) {
		return normalizeReturnType(arrowReturnMatch.groups.returnType);
	}

	const arrowTypeAnnotationMatch = /:\s*(?:async\s*)?\([^)]*\)\s*=>\s*(?<returnType>[^=;]+?)\s*=/u.exec(signature);
	if (arrowTypeAnnotationMatch?.groups?.returnType) {
		return normalizeReturnType(arrowTypeAnnotationMatch.groups.returnType);
	}

	return null;
}

function truncateReturnPreview(value: string): string {
	const preview = value.replace(/\s+/gu, ' ').trim();
	return preview.length > RETURN_PREVIEW_MAX_CHARS
		? `${preview.slice(0, RETURN_PREVIEW_MAX_CHARS - 3)}...`
		: preview;
}

function extractArrowExpressionReturnPreview(signature: string): string | null {
	const arrowIndex = signature.lastIndexOf('=>');
	if (arrowIndex < 0) {
		return null;
	}

	const expression = signature.slice(arrowIndex + 2).trim().replace(/;\s*$/u, '');
	if (expression.length === 0 || expression.startsWith('{')) {
		return null;
	}

	return truncateReturnPreview(expression);
}

function isIdentifierCharacter(value: string | undefined): boolean {
	return typeof value === 'string' && /[$\w]/u.test(value);
}

function findReturnKeywordIndex(line: string, lineCommentStart: '//' | '#'): number {
	let quote: '"' | "'" | '`' | null = null;
	let escaped = false;

	for (let index = 0; index < line.length; index += 1) {
		const character = line[index];
		const nextCharacter = line[index + 1];

		if (quote !== null) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (character === '\\') {
				escaped = true;
				continue;
			}
			if (character === quote) {
				quote = null;
			}
			continue;
		}

		if (
			(lineCommentStart === '//' && character === '/' && nextCharacter === '/') ||
			(lineCommentStart === '#' && character === '#')
		) {
			return -1;
		}
		if (character === '"' || character === "'" || character === '`') {
			quote = character;
			continue;
		}
		if (
			line.startsWith('return', index) &&
			!isIdentifierCharacter(line[index - 1]) &&
			!isIdentifierCharacter(line[index + 'return'.length])
		) {
			return index;
		}
	}

	return -1;
}

function extractReturnExpressionPreview(line: string, lineCommentStart: '//' | '#'): string | null {
	const returnIndex = findReturnKeywordIndex(line, lineCommentStart);
	if (returnIndex < 0) {
		return null;
	}

	const rawExpression = line.slice(returnIndex + 'return'.length);
	const commentIndex = rawExpression.indexOf(lineCommentStart);
	const expression = (commentIndex >= 0 ? rawExpression.slice(0, commentIndex) : rawExpression)
		.trim()
		.replace(/;\s*$/u, '')
		.trim();
	return expression.length === 0 ? null : truncateReturnPreview(expression);
}

function hasReturnStatement(line: string, lineCommentStart: '//' | '#'): boolean {
	return findReturnKeywordIndex(line, lineCommentStart) >= 0;
}

function simpleBodyThrowsOnly(lines: readonly string[], startLine: number, endLine: number, returnType: string | null): boolean {
	let sawThrow = false;
	let sawOtherExecutableLine = false;

	for (let index = startLine; index < endLine - 1; index += 1) {
		const bodyLine = stripLineForBraceScan(lines[index] ?? '')
			.replace(/[{};]/gu, '')
			.trim();
		if (bodyLine.length === 0) {
			continue;
		}
		if (/^throw\b/u.test(bodyLine)) {
			sawThrow = true;
			continue;
		}
		sawOtherExecutableLine = true;
	}

	return sawThrow && (!sawOtherExecutableLine || returnType === 'never');
}

function stripLineComment(line: string, lineCommentStart: '//' | '#'): string {
	const commentIndex = line.indexOf(lineCommentStart);
	return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
}

function extractTailExpressionReturnPreview(lines: readonly string[], startLine: number, endLine: number): string | null {
	let index = endLine - 2;
	while (index >= startLine) {
		const trimmed = stripLineComment(lines[index] ?? '', '//').trim();
		if (trimmed.length === 0 || trimmed === '{' || trimmed === '}') {
			index -= 1;
			continue;
		}
		if (trimmed.endsWith(';') || /^(?:let|return|if|for|while|loop|match)\b/u.test(trimmed)) {
			return null;
		}
		return truncateReturnPreview(trimmed.replace(/,\s*$/u, ''));
	}

	return null;
}

function extractReturnMetadata(
	lines: readonly string[],
	startLine: number,
	endLine: number,
	signature: string,
	match: DeclarationMatch,
	lineCommentStart: '//' | '#' = '//',
	tailExpressionReturn = false,
): Pick<CodeOutlineSymbol, 'return_type' | 'return_behavior' | 'return_count' | 'return_lines' | 'return_preview'> {
	const returnType = extractExplicitReturnType(signature, match);
	if (match.kind !== 'function') {
		return {
			return_type: null,
			return_behavior: 'unknown',
			return_count: 0,
			return_lines: [],
			return_preview: null,
		};
	}

	const returnLines: number[] = [];
	const valueReturnPreviews: string[] = [];
	let voidReturnCount = 0;

	for (let index = startLine - 1; index < endLine; index += 1) {
		const line = lines[index] ?? '';
		if (!hasReturnStatement(line, lineCommentStart)) {
			continue;
		}

		returnLines.push(index + 1);
		const preview = extractReturnExpressionPreview(line, lineCommentStart);
		if (preview === null) {
			voidReturnCount += 1;
		} else {
			valueReturnPreviews.push(preview);
		}
	}

	const arrowExpressionPreview = returnLines.length === 0 ? extractArrowExpressionReturnPreview(signature) : null;
	const tailExpressionPreview =
		tailExpressionReturn && returnLines.length === 0 && returnType !== null ? extractTailExpressionReturnPreview(lines, startLine, endLine) : null;
	let returnBehavior: CodeReturnBehavior;

	if (valueReturnPreviews.length > 0 && voidReturnCount > 0) {
		returnBehavior = 'mixed';
	} else if (valueReturnPreviews.length > 0 || arrowExpressionPreview !== null || tailExpressionPreview !== null) {
		returnBehavior = 'value';
	} else if (voidReturnCount > 0) {
		returnBehavior = 'void';
	} else if (simpleBodyThrowsOnly(lines, startLine, endLine, returnType)) {
		returnBehavior = 'throws_only';
	} else {
		returnBehavior = 'implicit_undefined';
	}

	return {
		return_type: returnType,
		return_behavior: returnBehavior,
		return_count: returnLines.length,
		return_lines: returnLines,
		return_preview: valueReturnPreviews[0] ?? arrowExpressionPreview ?? tailExpressionPreview,
	};
}

function startsWithUppercase(value: string): boolean {
	const [first] = value;
	return typeof first === 'string' && first.toLocaleUpperCase() === first && first.toLocaleLowerCase() !== first;
}

function goDeclarationFromLine(line: string): DeclarationMatch | null {
	const trimmed = line.trim();
	const functionMatch =
		/^func\s+(?:\([^)]*\)\s*)?(?<name>[A-Z_a-z]\w*)\s*\([^)]*\)\s*(?<returnType>[^{]+?)?\s*(?:\{|$)/u.exec(trimmed);
	if (functionMatch?.groups) {
		const returnType = functionMatch.groups.returnType?.trim() ?? '';
		return {
			kind: 'function',
			name: functionMatch.groups.name ?? '<anonymous>',
			exported: startsWithUppercase(functionMatch.groups.name ?? ''),
			async: false,
			returnType: returnType.length > 0 ? normalizeReturnType(returnType) : null,
		};
	}

	const typeMatch = /^type\s+(?<name>[A-Z_a-z]\w*)\s+(?<shape>struct|interface)?\b/u.exec(trimmed);
	if (typeMatch?.groups) {
		return {
			kind: typeMatch.groups.shape === 'interface' ? 'interface' : 'type',
			name: typeMatch.groups.name ?? '<anonymous>',
			exported: startsWithUppercase(typeMatch.groups.name ?? ''),
			async: false,
			returnType: null,
		};
	}

	return null;
}

function rustDeclarationFromLine(line: string): DeclarationMatch | null {
	const trimmed = line.trim();
	const visibility = String.raw`(?:pub(?:\([^)]*\))?\s+)?`;
	const functionPattern = [
		String.raw`^${visibility}`,
		String.raw`(?:(?:async|const|unsafe)\s+)*`,
		String.raw`(?:extern\s+"[^"]+"\s+)?`,
		String.raw`fn\s+(?<name>[A-Z_a-z]\w*)\s*[^{;]*?`,
		String.raw`(?:->\s*(?<returnType>[^{]+?))?\s*(?:where\b|\{|$)`,
	].join('');
	const functionMatch = new RegExp(functionPattern, 'u').exec(trimmed);
	if (functionMatch?.groups) {
		const returnType = functionMatch.groups.returnType?.replace(/\bwhere\b.*$/u, '').trim() ?? '';
		return {
			kind: 'function',
			name: functionMatch.groups.name ?? '<anonymous>',
			exported: /^pub\b/u.test(trimmed),
			async: /\basync\s+fn\b/u.test(trimmed) || /\basync\s+(?:const\s+|unsafe\s+)*fn\b/u.test(trimmed),
			returnType: returnType.length > 0 ? normalizeReturnType(returnType) : null,
		};
	}

	const shapeMatch = new RegExp(
		String.raw`^${visibility}(?<shape>struct|trait|type|enum)\s+(?<name>[A-Z_a-z]\w*)\b`,
		'u',
	).exec(trimmed);
	if (shapeMatch?.groups) {
		const shape = shapeMatch.groups.shape;
		return {
			kind: shape === 'trait' ? 'interface' : shape === 'enum' ? 'enum' : 'type',
			name: shapeMatch.groups.name ?? '<anonymous>',
			exported: /^pub\b/u.test(trimmed),
			async: false,
			returnType: null,
		};
	}

	return null;
}

function pythonDeclarationFromLine(line: string): DeclarationMatch | null {
	const trimmed = line.trim();
	const functionMatch = /^(?<async>async\s+)?def\s+(?<name>[A-Z_a-z]\w*)\s*\([^)]*\)\s*(?:->\s*(?<returnType>[^:]+))?:/u.exec(
		trimmed,
	);
	if (functionMatch?.groups) {
		const returnType = functionMatch.groups.returnType?.trim() ?? '';
		return {
			kind: 'function',
			name: functionMatch.groups.name ?? '<anonymous>',
			exported: !functionMatch.groups.name?.startsWith('_'),
			async: Boolean(functionMatch.groups.async),
			returnType: returnType.length > 0 ? normalizeReturnType(returnType) : null,
		};
	}

	const classMatch = /^class\s+(?<name>[A-Z_a-z]\w*)\b/u.exec(trimmed);
	if (classMatch?.groups) {
		return {
			kind: 'class',
			name: classMatch.groups.name ?? '<anonymous>',
			exported: !classMatch.groups.name?.startsWith('_'),
			async: false,
			returnType: null,
		};
	}

	return null;
}

function leadingWhitespaceWidth(line: string): number {
	let width = 0;
	for (const character of line) {
		if (character === ' ') {
			width += 1;
		} else if (character === '\t') {
			width += 4;
		} else {
			break;
		}
	}
	return width;
}

function findPythonDeclarationEndLine(lines: readonly string[], startIndex: number): number {
	const startIndent = leadingWhitespaceWidth(lines[startIndex] ?? '');

	let index = startIndex + 1;
	while (index < lines.length) {
		const line = lines[index] ?? '';
		const trimmed = line.trim();
		if (trimmed.length === 0 || trimmed.startsWith('#')) {
			index += 1;
			continue;
		}
		if (leadingWhitespaceWidth(line) <= startIndent) {
			return index;
		}
		index += 1;
	}

	return lines.length;
}

function extractSymbolsFromDeclarations(
	relativePath: string,
	language: CodeOutlineLanguage,
	contentSha256: string,
	text: string,
	declarationForLine: (line: string) => DeclarationMatch | null,
	endLineForMatch: (lines: readonly string[], startIndex: number) => number,
	lineCommentStart: '//' | '#',
	tailExpressionReturn = false,
): readonly CodeOutlineSymbol[] {
	const lines = text.split(/\r\n|\r|\n/u);
	const symbols: CodeOutlineSymbol[] = [];

	for (const [index, line] of lines.entries()) {
		const match = declarationForLine(line);
		if (!match) {
			continue;
		}

		const startLine = index + 1;
		const endLine = endLineForMatch(lines, index);
		const signature = buildSignature(lines, startLine, endLine);
		const returnMetadata = extractReturnMetadata(lines, startLine, endLine, signature, match, lineCommentStart, tailExpressionReturn);
		symbols.push({
			id: `${relativePath}:${startLine}:${match.kind}:${match.name}`,
			path: relativePath,
			language,
			kind: match.kind,
			name: match.name,
			start_line: startLine,
			end_line: endLine,
			signature,
			exported: match.exported,
			async: match.async,
			...returnMetadata,
			parent: null,
			content_sha256: contentSha256,
		});
	}

	return symbols;
}

function extractTypescriptJavascriptSymbols(
	relativePath: string,
	language: CodeOutlineLanguage,
	contentSha256: string,
	text: string,
): readonly CodeOutlineSymbol[] {
	return extractSymbolsFromDeclarations(
		relativePath,
		language,
		contentSha256,
		text,
		declarationFromLine,
		findDeclarationEndLine,
		'//',
	);
}

function maskAstroFrontmatter(text: string): string {
	const lines = text.split(/\r\n|\r|\n/u);
	if ((lines[0] ?? '').trim() !== '---') {
		return lines.map(() => '').join('\n');
	}

	const masked = lines.map(() => '');
	let index = 1;
	while (index < lines.length) {
		const line = lines[index] ?? '';
		if (line.trim() === '---') {
			return masked.join('\n');
		}
		masked[index] = line;
		index += 1;
	}

	return lines.map(() => '').join('\n');
}

function maskSvelteScriptBlocks(text: string): string {
	const lines = text.split(/\r\n|\r|\n/u);
	const masked = lines.map(() => '');
	let insideScript = false;

	for (const [index, line] of lines.entries()) {
		let remaining = line;

		if (!insideScript) {
			const openMatch = /<script\b[^>]*>/iu.exec(remaining);
			if (!openMatch || openMatch.index === undefined) {
				continue;
			}

			remaining = remaining.slice(openMatch.index + openMatch[0].length);
			insideScript = true;
		}

		const closeIndex = remaining.search(/<\/script\s*>/iu);
		if (closeIndex >= 0) {
			masked[index] = remaining.slice(0, closeIndex);
			insideScript = false;
			continue;
		}

		masked[index] = remaining;
	}

	return masked.join('\n');
}

function extractAstroSymbols(
	relativePath: string,
	language: CodeOutlineLanguage,
	contentSha256: string,
	text: string,
): readonly CodeOutlineSymbol[] {
	return extractTypescriptJavascriptSymbols(relativePath, language, contentSha256, maskAstroFrontmatter(text));
}

function extractSvelteSymbols(
	relativePath: string,
	language: CodeOutlineLanguage,
	contentSha256: string,
	text: string,
): readonly CodeOutlineSymbol[] {
	return extractTypescriptJavascriptSymbols(relativePath, language, contentSha256, maskSvelteScriptBlocks(text));
}

function extractGoSymbols(
	relativePath: string,
	language: CodeOutlineLanguage,
	contentSha256: string,
	text: string,
): readonly CodeOutlineSymbol[] {
	return extractSymbolsFromDeclarations(relativePath, language, contentSha256, text, goDeclarationFromLine, findDeclarationEndLine, '//');
}

function extractRustSymbols(
	relativePath: string,
	language: CodeOutlineLanguage,
	contentSha256: string,
	text: string,
): readonly CodeOutlineSymbol[] {
	return extractSymbolsFromDeclarations(relativePath, language, contentSha256, text, rustDeclarationFromLine, findDeclarationEndLine, '//', true);
}

function extractPythonSymbols(
	relativePath: string,
	language: CodeOutlineLanguage,
	contentSha256: string,
	text: string,
): readonly CodeOutlineSymbol[] {
	return extractSymbolsFromDeclarations(
		relativePath,
		language,
		contentSha256,
		text,
		pythonDeclarationFromLine,
		findPythonDeclarationEndLine,
		'#',
	);
}

const TYPESCRIPT_JAVASCRIPT_LANGUAGE_ADAPTER: CodeOutlineLanguageAdapter = {
	id: 'typescript-javascript',
	extensions: TYPESCRIPT_JAVASCRIPT_EXTENSIONS,
	languageForPath: typescriptJavascriptLanguageForPath,
	extractSymbols: extractTypescriptJavascriptSymbols,
};

const ASTRO_LANGUAGE_ADAPTER: CodeOutlineLanguageAdapter = {
	id: 'astro',
	extensions: ASTRO_EXTENSIONS,
	languageForPath: astroLanguageForPath,
	extractSymbols: extractAstroSymbols,
};

const SVELTE_LANGUAGE_ADAPTER: CodeOutlineLanguageAdapter = {
	id: 'svelte',
	extensions: SVELTE_EXTENSIONS,
	languageForPath: svelteLanguageForPath,
	extractSymbols: extractSvelteSymbols,
};

const GO_LANGUAGE_ADAPTER: CodeOutlineLanguageAdapter = {
	id: 'go',
	extensions: GO_EXTENSIONS,
	languageForPath: goLanguageForPath,
	extractSymbols: extractGoSymbols,
};

const RUST_LANGUAGE_ADAPTER: CodeOutlineLanguageAdapter = {
	id: 'rust',
	extensions: RUST_EXTENSIONS,
	languageForPath: rustLanguageForPath,
	extractSymbols: extractRustSymbols,
};

const PYTHON_LANGUAGE_ADAPTER: CodeOutlineLanguageAdapter = {
	id: 'python',
	extensions: PYTHON_EXTENSIONS,
	languageForPath: pythonLanguageForPath,
	extractSymbols: extractPythonSymbols,
};

const CODE_OUTLINE_LANGUAGE_ADAPTERS: readonly CodeOutlineLanguageAdapter[] = [
	TYPESCRIPT_JAVASCRIPT_LANGUAGE_ADAPTER,
	ASTRO_LANGUAGE_ADAPTER,
	SVELTE_LANGUAGE_ADAPTER,
	GO_LANGUAGE_ADAPTER,
	RUST_LANGUAGE_ADAPTER,
	PYTHON_LANGUAGE_ADAPTER,
];

const CODE_FILE_EXTENSIONS = CODE_OUTLINE_LANGUAGE_ADAPTERS.flatMap((adapter) => adapter.extensions);

export function extractSymbols(
	relativePath: string,
	language: CodeOutlineLanguage,
	contentSha256: string,
	text: string,
): readonly CodeOutlineSymbol[] {
	const adapter = CODE_OUTLINE_LANGUAGE_ADAPTERS.find((candidate) => candidate.languageForPath(relativePath) === language);
	return adapter?.extractSymbols(relativePath, language, contentSha256, text) ?? [];
}

function sourceAnchorEndLine(lineStart: number, rawText: string): number {
	return lineStart + rawText.split(/\r\n|\r|\n/u).length - 1;
}

function canBridgeAnchorToSymbol(lines: readonly string[], anchorEndLine: number, symbolStartLine: number): boolean {
	if (symbolStartLine <= anchorEndLine) {
		return false;
	}

	for (let lineNumber = anchorEndLine + 1; lineNumber < symbolStartLine; lineNumber += 1) {
		const trimmed = (lines[lineNumber - 1] ?? '').trim();
		if (
			trimmed.length === 0 ||
			trimmed.startsWith('//') ||
			trimmed.startsWith('#') ||
			trimmed.startsWith('*') ||
			trimmed.startsWith('@')
		) {
			continue;
		}
		return false;
	}

	return true;
}

function findAnchorTargetSymbol(
	relativePath: string,
	lines: readonly string[],
	anchorEndLine: number,
	symbols: readonly CodeOutlineSymbol[],
): CodeOutlineSymbol | null {
	const followingSymbols = symbols
		.filter((symbol) => symbol.path === relativePath && symbol.start_line > anchorEndLine)
		.sort((left, right) => left.start_line - right.start_line);
	const target = followingSymbols[0] ?? null;

	if (!target || !canBridgeAnchorToSymbol(lines, anchorEndLine, target.start_line)) {
		return null;
	}

	return target;
}

function extractAnchors(relativePath: string, lines: readonly string[], text: string, symbols: readonly CodeOutlineSymbol[]): readonly CodeOutlineAnchor[] {
	const anchors: CodeOutlineAnchor[] = [];

	for (const anchor of parseSourceAnchorsInContent(relativePath, text)) {
		if (!anchor.idValid || sourceAnchorTextContainsSecretLike(anchor.rawText)) {
			continue;
		}

		const lineEnd = sourceAnchorEndLine(anchor.lineStart, anchor.rawText);
		const target = findAnchorTargetSymbol(relativePath, lines, lineEnd, symbols);
		anchors.push({
			id: anchor.rawId,
			path: relativePath,
			line_start: anchor.lineStart,
			line_end: lineEnd,
			purpose: anchor.fields.get('purpose') ?? null,
			search: splitSourceAnchorList(anchor.fields.get('search')),
			invariant: anchor.fields.get('invariant') ?? null,
			risk: splitSourceAnchorList(anchor.fields.get('risk')),
			navigation_only: true,
			can_instruct_agent: false,
			target_symbol_id: target?.id ?? null,
			target_kind: target?.kind ?? null,
			target_name: target?.name ?? null,
			target_start_line: target?.start_line ?? null,
		});
	}

	return anchors;
}

function createOutlineInputHash(
	policy: CodeOutlinePolicy,
	files: readonly CodeOutlineFile[],
	anchors: readonly CodeOutlineAnchor[],
	findings: readonly CodeOutlineFinding[],
): string {
	const inputState = {
		policy,
		files: files.map((file) => ({
			path: file.path,
			sha256: file.sha256,
			size_bytes: file.size_bytes,
			symbol_count: file.symbol_count,
		})),
		anchors: anchors.map((anchor) => ({
			id: anchor.id,
			path: anchor.path,
			line_start: anchor.line_start,
			line_end: anchor.line_end,
			target_symbol_id: anchor.target_symbol_id,
		})),
		input_errors: findings
			.filter((finding) => ERROR_OUTLINE_CODES.has(finding.code))
			.map((finding) => ({ code: finding.code, path: finding.path })),
	};
	return sha256Tagged(JSON.stringify(inputState));
}

function outlineStatus(findings: readonly CodeOutlineFinding[]): ScriptCheckStatus {
	return findings.some((finding) => ERROR_OUTLINE_CODES.has(finding.code))
		? 'error'
		: findings.length > 0
			? 'failed'
			: 'passed';
}

export function inspectCodeOutline(projectRoot: string, options: InspectCodeOutlineOptions): CodeOutlineReport {
	const root = path.resolve(projectRoot);
	const policy: CodeOutlinePolicy = {
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		max_files: options.maxFiles ?? DEFAULT_MAX_FILES,
		extensions: [...CODE_FILE_EXTENSIONS],
		ignored_directories: [...IGNORED_DIRECTORIES],
	};
	const files: CodeOutlineFile[] = [];
	const anchors: CodeOutlineAnchor[] = [];
	const symbols: CodeOutlineSymbol[] = [];
	const findings: CodeOutlineFinding[] = [];
	const issues: string[] = [];
	const candidates = collectSourceCandidates(root, options, policy, findings, issues);

	for (const candidate of candidates) {
		let buffer: Buffer;
		try {
			buffer = readFileInsideWithoutSymlinks(root, candidate.absolutePath, { maxBytes: policy.max_file_bytes });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const code = message.includes('exceeds maximum size')
				? 'code_outline_file_too_large'
				: 'code_outline_unreadable_path';
			issues.push(`${candidate.relativePath}: ${message}`);
			findings.push(makeOutlineFinding(code, 'high', candidate.relativePath, message));
			continue;
		}

		const contentSha256 = sha256Tagged(buffer);
		const text = buffer.toString('utf8');
		const lines = text.split(/\r\n|\r|\n/u);
		const fileSymbols = extractSymbols(candidate.relativePath, candidate.language, contentSha256, text);
		const fileAnchors = extractAnchors(candidate.relativePath, lines, text, fileSymbols);
		symbols.push(...fileSymbols);
		anchors.push(...fileAnchors);
		files.push({
			kind: 'source_file',
			path: candidate.relativePath,
			language: candidate.language,
			sha256: contentSha256,
			size_bytes: buffer.byteLength,
			line_count: lines.length,
			symbol_count: fileSymbols.length,
		});
	}

	const status = outlineStatus(findings);
	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: CODE_PACK_ID,
		script_id: CODE_OUTLINE_SCRIPT_ID,
		script_ref: CODE_OUTLINE_SCRIPT_REF,
		action: 'scan',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createOutlineInputHash(policy, files, anchors, findings),
		files,
		anchors: anchors.sort((left, right) => left.path.localeCompare(right.path) || left.line_start - right.line_start),
		symbols: symbols.sort((left, right) => left.path.localeCompare(right.path) || left.start_line - right.start_line),
		findings,
		issues,
	};
}

function createEmptySymbolReadReport(
	root: string,
	policy: CodeSymbolReadPolicy,
	findings: readonly CodeSymbolReadFinding[],
	issues: readonly string[],
): CodeSymbolReadReport {
	const status = findings.some((finding) => ERROR_SYMBOL_READ_CODES.has(finding.code)) ? 'error' : 'passed';
	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: CODE_PACK_ID,
		script_id: CODE_SYMBOL_READ_SCRIPT_ID,
		script_ref: CODE_SYMBOL_READ_SCRIPT_REF,
		action: 'read',
		status,
		ok: false,
		mustflow_root: root,
		policy,
		input_hash: sha256Tagged(JSON.stringify({ policy, findings, issues })),
		target: null,
		snippet: null,
		findings,
		issues,
	};
}

function createSymbolReadInputHash(
	policy: CodeSymbolReadPolicy,
	target: CodeSymbolReadTarget | null,
	findings: readonly CodeSymbolReadFinding[],
): string {
	const inputState = {
		policy,
		target:
			target === null
				? null
				: {
						path: target.path,
						sha256: target.sha256,
						requested_anchor_id: target.requested_anchor_id,
						requested_start_line: target.requested_start_line,
						requested_end_line: target.requested_end_line,
						context_start_line: target.context_start_line,
						context_end_line: target.context_end_line,
						anchor_id: target.anchor?.id ?? null,
					},
		input_errors: findings
			.filter((finding) => ERROR_SYMBOL_READ_CODES.has(finding.code))
			.map((finding) => ({
				code: finding.code,
				path: finding.path,
				start_line: finding.start_line,
				end_line: finding.end_line,
			})),
	};
	return sha256Tagged(JSON.stringify(inputState));
}

interface AnchorReadCandidate {
	readonly relativePath: string;
	readonly anchor: CodeOutlineAnchor;
}

function collectAnchorReadCandidates(root: string, anchorId: string, maxFileBytes: number): readonly AnchorReadCandidate[] {
	const candidates: AnchorReadCandidate[] = [];

	for (const relativePath of listSourceAnchorFiles(root, { allowedExtensions: CODE_FILE_EXTENSIONS, maxFileBytes })) {
		const absolutePath = path.join(root, ...relativePath.split('/'));
		const language = languageForPath(absolutePath);
		if (!language || !existsSync(absolutePath)) {
			continue;
		}

		let buffer: Buffer;
		try {
			buffer = readFileInsideWithoutSymlinks(root, absolutePath, { maxBytes: maxFileBytes });
		} catch {
			continue;
		}

		const contentSha256 = sha256Tagged(buffer);
		const text = buffer.toString('utf8');
		const lines = text.split(/\r\n|\r|\n/u);
		const symbols = extractSymbols(relativePath, language, contentSha256, text);
		const anchors = extractAnchors(relativePath, lines, text, symbols);
		for (const anchor of anchors) {
			if (anchor.id === anchorId) {
				candidates.push({ relativePath, anchor });
			}
		}
	}

	return candidates.sort((left, right) => left.relativePath.localeCompare(right.relativePath) || left.anchor.line_start - right.anchor.line_start);
}

function createSymbolReadReportFromFile(
	root: string,
	policy: CodeSymbolReadPolicy,
	relativePath: string,
	language: CodeOutlineLanguage,
	buffer: Buffer,
	findings: CodeSymbolReadFinding[],
	issues: string[],
	anchor: CodeOutlineAnchor | null,
): CodeSymbolReadReport {
	const contentSha256 = sha256Tagged(buffer);
	const text = buffer.toString('utf8');
	const lines = text.split(/\r\n|\r|\n/u);
	if ((policy.start_line !== null && policy.start_line > lines.length) || (policy.end_line !== null && policy.end_line > lines.length)) {
		const requestedRange =
			policy.start_line === null
				? `anchor ${policy.anchor_id ?? '<unknown>'}`
				: `${policy.start_line}${policy.end_line === null ? '' : `-${policy.end_line}`}`;
		const message = `Line range ${requestedRange} is outside ${relativePath}, which has ${lines.length} lines.`;
		issues.push(message);
		findings.push(
			makeSymbolReadFinding(
				'code_symbol_read_invalid_range',
				'high',
				relativePath,
				policy.start_line,
				policy.end_line,
				message,
			),
		);
		return createEmptySymbolReadReport(root, policy, findings, issues);
	}

	const symbols = extractSymbols(relativePath, language, contentSha256, text);
	const requestedStartLine = policy.start_line;
	const matchedSymbol = anchor
		? (symbols.find((symbol) => symbol.id === anchor.target_symbol_id) ?? null)
		: policy.end_line === null && requestedStartLine !== null
			? (symbols.find((symbol) => symbol.start_line === requestedStartLine) ??
				symbols.find((symbol) => symbol.start_line <= requestedStartLine && symbol.end_line >= requestedStartLine) ??
				null)
			: null;
	const resolvedStartLine = matchedSymbol?.start_line ?? requestedStartLine;
	const resolvedEndLine = matchedSymbol?.end_line ?? policy.end_line;

	if (resolvedEndLine === null) {
		const message = anchor
			? `Source anchor ${anchor.id} in ${relativePath}:${anchor.line_start} does not target a readable outline symbol.`
			: `No outline symbol starts at or contains line ${policy.start_line} in ${relativePath}. Pass --end-line to read an explicit range.`;
		issues.push(message);
		findings.push(
			makeSymbolReadFinding(
				anchor ? 'code_symbol_read_anchor_without_symbol' : 'code_symbol_read_no_symbol_at_line',
				'high',
				relativePath,
				policy.start_line ?? anchor?.line_start ?? null,
				null,
				message,
			),
		);
	}

	const contextStartLine =
		resolvedEndLine === null || resolvedStartLine === null ? null : Math.max(1, resolvedStartLine - policy.context_lines);
	const contextEndLine =
		resolvedEndLine === null ? null : Math.min(lines.length, resolvedEndLine + policy.context_lines);
	const target: CodeSymbolReadTarget = {
		path: relativePath,
		language,
		sha256: contentSha256,
		size_bytes: buffer.byteLength,
		line_count: lines.length,
		requested_anchor_id: policy.anchor_id,
		requested_start_line: policy.start_line,
		requested_end_line: policy.end_line,
		resolved_start_line: resolvedEndLine === null ? null : resolvedStartLine,
		resolved_end_line: resolvedEndLine,
		context_start_line: contextStartLine,
		context_end_line: contextEndLine,
		anchor,
		symbol: matchedSymbol,
	};

	let snippet: CodeSymbolReadSnippet | null = null;
	if (contextStartLine !== null && contextEndLine !== null) {
		const snippetLineCount = contextEndLine - contextStartLine + 1;
		if (snippetLineCount > policy.max_snippet_lines) {
			const message = `Snippet has ${snippetLineCount} lines; max_snippet_lines is ${policy.max_snippet_lines}.`;
			issues.push(message);
			findings.push(
				makeSymbolReadFinding(
					'code_symbol_read_snippet_too_large',
					'high',
					relativePath,
					contextStartLine,
					contextEndLine,
					message,
				),
			);
		} else {
			snippet = {
				path: relativePath,
				start_line: contextStartLine,
				end_line: contextEndLine,
				text: lines.slice(contextStartLine - 1, contextEndLine).join('\n'),
			};
		}
	}

	const status: ScriptCheckStatus = findings.some((finding) => ERROR_SYMBOL_READ_CODES.has(finding.code))
		? 'error'
		: 'passed';
	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: CODE_PACK_ID,
		script_id: CODE_SYMBOL_READ_SCRIPT_ID,
		script_ref: CODE_SYMBOL_READ_SCRIPT_REF,
		action: 'read',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createSymbolReadInputHash(policy, target, findings),
		target,
		snippet,
		findings,
		issues,
	};
}

export function readCodeSymbol(projectRoot: string, options: ReadCodeSymbolOptions): CodeSymbolReadReport {
	const root = path.resolve(projectRoot);
	const policy: CodeSymbolReadPolicy = {
		anchor_id: options.anchorId ?? null,
		start_line: options.startLine ?? null,
		end_line: options.endLine ?? null,
		context_lines: options.contextLines ?? DEFAULT_CONTEXT_LINES,
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		max_snippet_lines: options.maxSnippetLines ?? DEFAULT_MAX_SNIPPET_LINES,
	};
	const findings: CodeSymbolReadFinding[] = [];
	const issues: string[] = [];

	if (
		policy.context_lines < 0 ||
		(policy.start_line !== null && policy.start_line < 1) ||
		(policy.end_line !== null && (policy.start_line === null || policy.end_line < policy.start_line))
	) {
		findings.push(
			makeSymbolReadFinding(
				'code_symbol_read_invalid_range',
				'high',
				options.path ?? '.',
				policy.start_line,
				policy.end_line,
				'Line range must use 1-based positive lines, and end_line must be greater than or equal to start_line.',
			),
		);
		return createEmptySymbolReadReport(root, policy, findings, issues);
	}

	if (policy.anchor_id !== null) {
		const anchorCandidates = collectAnchorReadCandidates(root, policy.anchor_id, policy.max_file_bytes);
		if (anchorCandidates.length === 0) {
			const message = `No source anchor found with id ${policy.anchor_id}.`;
			issues.push(message);
			findings.push(makeSymbolReadFinding('code_symbol_read_anchor_not_found', 'high', '.', null, null, message));
			return createEmptySymbolReadReport(root, policy, findings, issues);
		}

		if (anchorCandidates.length > 1) {
			const locations = anchorCandidates.map((candidate) => `${candidate.relativePath}:${candidate.anchor.line_start}`).join(', ');
			const message = `Source anchor id ${policy.anchor_id} is ambiguous: ${locations}.`;
			issues.push(message);
			findings.push(makeSymbolReadFinding('code_symbol_read_anchor_ambiguous', 'high', '.', null, null, message));
			return createEmptySymbolReadReport(root, policy, findings, issues);
		}

		const candidate = anchorCandidates[0];
		const anchor = candidate?.anchor ?? null;
		const relativePath = candidate?.relativePath ?? '.';
		const absolutePath = path.join(root, ...relativePath.split('/'));
		const language = languageForPath(absolutePath);
		if (!anchor || !language || !existsSync(absolutePath)) {
			const message = `${relativePath} is not a supported existing code file.`;
			issues.push(message);
			findings.push(makeSymbolReadFinding('code_symbol_read_unreadable_path', 'high', relativePath, null, null, message));
			return createEmptySymbolReadReport(root, policy, findings, issues);
		}

		let buffer: Buffer;
		try {
			buffer = readFileInsideWithoutSymlinks(root, absolutePath, { maxBytes: policy.max_file_bytes });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(`${relativePath}: ${message}`);
			findings.push(makeSymbolReadFinding('code_symbol_read_unreadable_path', 'high', relativePath, null, null, message));
			return createEmptySymbolReadReport(root, policy, findings, issues);
		}

		const anchorPolicy: CodeSymbolReadPolicy = {
			...policy,
			start_line: null,
			end_line: null,
		};
		return createSymbolReadReportFromFile(root, anchorPolicy, relativePath, language, buffer, findings, issues, anchor);
	}

	if (!options.path || policy.start_line === null) {
		findings.push(
			makeSymbolReadFinding(
				'code_symbol_read_invalid_range',
				'high',
				options.path ?? '.',
				policy.start_line,
				policy.end_line,
				'Path and --start-line are required unless --anchor is provided.',
			),
		);
		return createEmptySymbolReadReport(root, policy, findings, issues);
	}

	let absolutePath: string;
	let relativePath: string;
	try {
		const normalized = normalizeTargetPath(root, options.path);
		absolutePath = normalized.absolutePath;
		relativePath = normalized.relativePath;
		ensureInsideWithoutSymlinks(root, absolutePath);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(message);
		findings.push(
			makeSymbolReadFinding('code_symbol_read_path_outside_root', 'high', options.path, policy.start_line, policy.end_line, message),
		);
		return createEmptySymbolReadReport(root, policy, findings, issues);
	}

	const language = languageForPath(absolutePath);
	if (!language || !existsSync(absolutePath)) {
		const message = `${relativePath} is not a supported existing code file.`;
		issues.push(message);
		findings.push(
			makeSymbolReadFinding('code_symbol_read_unreadable_path', 'high', relativePath, policy.start_line, policy.end_line, message),
		);
		return createEmptySymbolReadReport(root, policy, findings, issues);
	}

	let buffer: Buffer;
	try {
		buffer = readFileInsideWithoutSymlinks(root, absolutePath, { maxBytes: policy.max_file_bytes });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`${relativePath}: ${message}`);
		findings.push(
			makeSymbolReadFinding('code_symbol_read_unreadable_path', 'high', relativePath, policy.start_line, policy.end_line, message),
		);
		return createEmptySymbolReadReport(root, policy, findings, issues);
	}

	return createSymbolReadReportFromFile(root, policy, relativePath, language, buffer, findings, issues, null);
}
