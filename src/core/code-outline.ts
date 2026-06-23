import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
	type ScriptCheckArtifact,
	type ScriptCheckFinding,
	type ScriptCheckFindingSeverity,
	type ScriptCheckStatus,
} from './script-check-result.js';
import { ensureInside, ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './safe-filesystem.js';

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
	| 'javascript-commonjs';

export type CodeSymbolKind = 'function' | 'class' | 'interface' | 'type' | 'enum' | 'variable';

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
	readonly parent: string | null;
	readonly content_sha256: string;
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
	readonly symbols: readonly CodeOutlineSymbol[];
	readonly findings: readonly CodeOutlineFinding[];
	readonly issues: readonly string[];
}

export interface CodeSymbolReadPolicy {
	readonly start_line: number;
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
	readonly requested_start_line: number;
	readonly requested_end_line: number | null;
	readonly resolved_start_line: number | null;
	readonly resolved_end_line: number | null;
	readonly context_start_line: number | null;
	readonly context_end_line: number | null;
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
	readonly path: string;
	readonly startLine: number;
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
}

const DEFAULT_MAX_FILE_BYTES = 1024 * 1024;
const DEFAULT_MAX_FILES = 200;
const DEFAULT_CONTEXT_LINES = 0;
const DEFAULT_MAX_SNIPPET_LINES = 250;
const CODE_FILE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const;
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

function languageForPath(filePath: string): CodeOutlineLanguage | null {
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
		};
	}

	const shapeMatch = /^(?<exported>export\s+)?(?<kind>class|interface|type|enum)\s+(?<name>[$A-Z_a-z][$\w]*)/u.exec(trimmed);
	if (shapeMatch?.groups) {
		return {
			kind: shapeMatch.groups.kind as CodeSymbolKind,
			name: shapeMatch.groups.name ?? '<anonymous>',
			exported: Boolean(shapeMatch.groups.exported),
			async: false,
		};
	}

	const variableMatch = /^(?<exported>export\s+)?(?:const|let|var)\s+(?<name>[$A-Z_a-z][$\w]*)\s*[:=]/u.exec(trimmed);
	if (variableMatch?.groups && (Boolean(variableMatch.groups.exported) || /=>|function\s*\(/u.test(trimmed))) {
		return {
			kind: /=>|function\s*\(/u.test(trimmed) ? 'function' : 'variable',
			name: variableMatch.groups.name ?? '<anonymous>',
			exported: Boolean(variableMatch.groups.exported),
			async: /async\s*(?:\(|[A-Z_a-z_$])/u.test(trimmed),
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
		if (/[{;]\s*$/u.test(trimmed) || /=>/u.test(trimmed)) {
			break;
		}
	}

	const signature = parts.join(' ').replace(/\s+/gu, ' ');
	return signature.length > 240 ? `${signature.slice(0, 237)}...` : signature;
}

function extractSymbols(relativePath: string, language: CodeOutlineLanguage, contentSha256: string, text: string): readonly CodeOutlineSymbol[] {
	const lines = text.split(/\r\n|\r|\n/u);
	const symbols: CodeOutlineSymbol[] = [];

	for (const [index, line] of lines.entries()) {
		const match = declarationFromLine(line);
		if (!match) {
			continue;
		}

		const startLine = index + 1;
		const endLine = findDeclarationEndLine(lines, index);
		symbols.push({
			id: `${relativePath}:${startLine}:${match.kind}:${match.name}`,
			path: relativePath,
			language,
			kind: match.kind,
			name: match.name,
			start_line: startLine,
			end_line: endLine,
			signature: buildSignature(lines, startLine, endLine),
			exported: match.exported,
			async: match.async,
			parent: null,
			content_sha256: contentSha256,
		});
	}

	return symbols;
}

function createOutlineInputHash(
	policy: CodeOutlinePolicy,
	files: readonly CodeOutlineFile[],
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
		const fileSymbols = extractSymbols(candidate.relativePath, candidate.language, contentSha256, text);
		symbols.push(...fileSymbols);
		files.push({
			kind: 'source_file',
			path: candidate.relativePath,
			language: candidate.language,
			sha256: contentSha256,
			size_bytes: buffer.byteLength,
			line_count: text.split(/\r\n|\r|\n/u).length,
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
		input_hash: createOutlineInputHash(policy, files, findings),
		files,
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
						requested_start_line: target.requested_start_line,
						requested_end_line: target.requested_end_line,
						context_start_line: target.context_start_line,
						context_end_line: target.context_end_line,
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

export function readCodeSymbol(projectRoot: string, options: ReadCodeSymbolOptions): CodeSymbolReadReport {
	const root = path.resolve(projectRoot);
	const policy: CodeSymbolReadPolicy = {
		start_line: options.startLine,
		end_line: options.endLine ?? null,
		context_lines: options.contextLines ?? DEFAULT_CONTEXT_LINES,
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		max_snippet_lines: options.maxSnippetLines ?? DEFAULT_MAX_SNIPPET_LINES,
	};
	const findings: CodeSymbolReadFinding[] = [];
	const issues: string[] = [];

	if (policy.start_line < 1 || (policy.end_line !== null && policy.end_line < policy.start_line) || policy.context_lines < 0) {
		findings.push(
			makeSymbolReadFinding(
				'code_symbol_read_invalid_range',
				'high',
				options.path,
				policy.start_line,
				policy.end_line,
				'Line range must use 1-based positive lines, and end_line must be greater than or equal to start_line.',
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
		findings.push(makeSymbolReadFinding('code_symbol_read_path_outside_root', 'high', options.path, policy.start_line, policy.end_line, message));
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

	const contentSha256 = sha256Tagged(buffer);
	const text = buffer.toString('utf8');
	const lines = text.split(/\r\n|\r|\n/u);
	if (policy.start_line > lines.length || (policy.end_line !== null && policy.end_line > lines.length)) {
		const message = `Line range ${policy.start_line}${policy.end_line === null ? '' : `-${policy.end_line}`} is outside ${relativePath}, which has ${lines.length} lines.`;
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
	const matchedSymbol =
		policy.end_line === null
			? (symbols.find((symbol) => symbol.start_line === policy.start_line) ??
				symbols.find((symbol) => symbol.start_line <= policy.start_line && symbol.end_line >= policy.start_line) ??
				null)
			: null;
	const resolvedStartLine = matchedSymbol?.start_line ?? policy.start_line;
	const resolvedEndLine = matchedSymbol?.end_line ?? policy.end_line;

	if (resolvedEndLine === null) {
		const message = `No outline symbol starts at or contains line ${policy.start_line} in ${relativePath}. Pass --end-line to read an explicit range.`;
		issues.push(message);
		findings.push(
			makeSymbolReadFinding(
				'code_symbol_read_no_symbol_at_line',
				'high',
				relativePath,
				policy.start_line,
				null,
				message,
			),
		);
	}

	const contextStartLine = resolvedEndLine === null ? null : Math.max(1, resolvedStartLine - policy.context_lines);
	const contextEndLine =
		resolvedEndLine === null ? null : Math.min(lines.length, resolvedEndLine + policy.context_lines);
	const target: CodeSymbolReadTarget = {
		path: relativePath,
		language,
		sha256: contentSha256,
		size_bytes: buffer.byteLength,
		line_count: lines.length,
		requested_start_line: policy.start_line,
		requested_end_line: policy.end_line,
		resolved_start_line: resolvedEndLine === null ? null : resolvedStartLine,
		resolved_end_line: resolvedEndLine,
		context_start_line: contextStartLine,
		context_end_line: contextEndLine,
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
