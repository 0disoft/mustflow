import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';
import { ensureInside, ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './safe-filesystem.js';

export const REFERENCE_DRIFT_PACK_ID = 'docs';
export const REFERENCE_DRIFT_SCRIPT_ID = 'reference-drift';
export const REFERENCE_DRIFT_SCRIPT_REF = `${REFERENCE_DRIFT_PACK_ID}/${REFERENCE_DRIFT_SCRIPT_ID}`;

export type ReferenceDriftAction = 'check';
export type ReferenceDriftReferenceKind = 'mf_command' | 'script_pack_ref' | 'schema_file' | 'repo_path';
export type ReferenceDriftReferenceStatus = 'ok' | 'missing' | 'unknown' | 'skipped';

export type ReferenceDriftFindingCode =
	| 'reference_drift_path_outside_root'
	| 'reference_drift_unreadable_path'
	| 'reference_drift_file_too_large'
	| 'reference_drift_max_files_exceeded'
	| 'reference_drift_unknown_command'
	| 'reference_drift_unknown_script_pack'
	| 'reference_drift_unknown_schema'
	| 'reference_drift_missing_path';

export interface ReferenceDriftPolicy {
	readonly max_files: number;
	readonly max_file_bytes: number;
	readonly default_paths: readonly string[];
	readonly path_filters: readonly string[];
	readonly checked_reference_kinds: readonly ReferenceDriftReferenceKind[];
}

export interface ReferenceDriftFile {
	readonly kind: 'document';
	readonly path: string;
	readonly sha256: string | null;
	readonly size_bytes: number | null;
	readonly line_count: number | null;
	readonly reference_count: number;
}

export interface ReferenceDriftReference {
	readonly kind: ReferenceDriftReferenceKind;
	readonly path: string;
	readonly line: number;
	readonly value: string;
	readonly target: string;
	readonly status: ReferenceDriftReferenceStatus;
	readonly message: string;
}

export interface ReferenceDriftSummary {
	readonly files_checked: number;
	readonly references_checked: number;
	readonly ok: number;
	readonly missing: number;
	readonly unknown: number;
	readonly skipped: number;
}

export interface ReferenceDriftFinding extends ScriptCheckFinding {
	readonly code: ReferenceDriftFindingCode;
	readonly path: string;
	readonly line?: number;
}

export interface ReferenceDriftReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof REFERENCE_DRIFT_PACK_ID;
	readonly script_id: typeof REFERENCE_DRIFT_SCRIPT_ID;
	readonly script_ref: typeof REFERENCE_DRIFT_SCRIPT_REF;
	readonly action: ReferenceDriftAction;
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: ReferenceDriftPolicy;
	readonly input_hash: string;
	readonly files: readonly ReferenceDriftFile[];
	readonly references: readonly ReferenceDriftReference[];
	readonly summary: ReferenceDriftSummary;
	readonly findings: readonly ReferenceDriftFinding[];
	readonly issues: readonly string[];
}

export interface CheckReferenceDriftOptions {
	readonly paths: readonly string[];
	readonly commandNames: readonly string[];
	readonly scriptRefs: readonly string[];
	readonly schemaFiles: readonly string[];
	readonly maxFiles?: number;
	readonly maxFileBytes?: number;
}

interface DocumentCandidate {
	readonly absolutePath: string;
	readonly relativePath: string;
}

interface RawReference {
	readonly kind: ReferenceDriftReferenceKind;
	readonly path: string;
	readonly line: number;
	readonly value: string;
	readonly target: string;
}

const DEFAULT_MAX_FILES = 200;
const DEFAULT_MAX_FILE_BYTES = 512 * 1024;
const MAX_ISSUES = 50;
const DEFAULT_PATHS = ['README.md', 'schemas/README.md', 'docs-site/src/content/docs'] as const;
const PATH_FILTERS = ['*.md', '*.mdx'] as const;
const CHECKED_REFERENCE_KINDS: readonly ReferenceDriftReferenceKind[] = [
	'mf_command',
	'script_pack_ref',
	'schema_file',
	'repo_path',
];
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.astro']);
const ERROR_CODES = new Set<ReferenceDriftFindingCode>([
	'reference_drift_path_outside_root',
	'reference_drift_unreadable_path',
	'reference_drift_file_too_large',
	'reference_drift_max_files_exceeded',
]);

function normalizeRelativePath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/^\.\/+/u, '') || '.';
}

function sha256Tagged(buffer: Buffer | string): string {
	return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function makeFinding(
	code: ReferenceDriftFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
	line?: number,
): ReferenceDriftFinding {
	return line === undefined ? { code, severity, path: pathValue, message } : { code, severity, path: pathValue, line, message };
}

function pushIssue(issues: string[], issue: string): void {
	if (issues.length < MAX_ISSUES) {
		issues.push(issue);
	}
}

function isDocumentPath(relativePath: string): boolean {
	return /\.(?:md|mdx)$/u.test(relativePath);
}

function normalizeInputPath(projectRoot: string, inputPath: string): { readonly absolutePath: string; readonly relativePath: string } {
	const absolutePath = path.resolve(process.cwd(), inputPath);
	ensureInside(projectRoot, absolutePath);
	return {
		absolutePath,
		relativePath: normalizeRelativePath(path.relative(projectRoot, absolutePath)),
	};
}

function addCandidate(
	candidates: Map<string, DocumentCandidate>,
	findings: ReferenceDriftFinding[],
	issues: string[],
	policy: ReferenceDriftPolicy,
	candidate: DocumentCandidate,
): void {
	if (candidates.has(candidate.relativePath)) {
		return;
	}
	if (candidates.size >= policy.max_files) {
		if (!findings.some((finding) => finding.code === 'reference_drift_max_files_exceeded')) {
			const message = `Reference-drift matched more than ${policy.max_files} document files; remaining files were skipped.`;
			pushIssue(issues, message);
			findings.push(makeFinding('reference_drift_max_files_exceeded', 'medium', candidate.relativePath, message));
		}
		return;
	}
	candidates.set(candidate.relativePath, candidate);
}

function collectDocumentsFromDirectory(
	projectRoot: string,
	absoluteDirectory: string,
	candidates: Map<string, DocumentCandidate>,
	findings: ReferenceDriftFinding[],
	issues: string[],
	policy: ReferenceDriftPolicy,
): void {
	const relativeDirectory = normalizeRelativePath(path.relative(projectRoot, absoluteDirectory));
	if (IGNORED_DIRECTORIES.has(path.basename(relativeDirectory)) || [...IGNORED_DIRECTORIES].some((entry) => relativeDirectory.startsWith(`${entry}/`))) {
		return;
	}

	let entries;
	try {
		ensureInsideWithoutSymlinks(projectRoot, absoluteDirectory);
		entries = readdirSync(absoluteDirectory, { withFileTypes: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushIssue(issues, `${relativeDirectory}: ${message}`);
		findings.push(makeFinding('reference_drift_unreadable_path', 'high', relativeDirectory, message));
		return;
	}

	for (const entry of entries) {
		const absoluteEntry = path.join(absoluteDirectory, entry.name);
		const relativeEntry = normalizeRelativePath(path.relative(projectRoot, absoluteEntry));
		if (entry.isDirectory()) {
			collectDocumentsFromDirectory(projectRoot, absoluteEntry, candidates, findings, issues, policy);
			continue;
		}
		if (entry.isFile() && isDocumentPath(relativeEntry)) {
			addCandidate(candidates, findings, issues, policy, { absolutePath: absoluteEntry, relativePath: relativeEntry });
		}
	}
}

function collectDocumentCandidates(
	projectRoot: string,
	inputPaths: readonly string[],
	policy: ReferenceDriftPolicy,
	findings: ReferenceDriftFinding[],
	issues: string[],
): readonly DocumentCandidate[] {
	const candidates = new Map<string, DocumentCandidate>();
	const pathsToCheck = inputPaths.length > 0 ? inputPaths : policy.default_paths;

	for (const inputPath of pathsToCheck) {
		let absolutePath: string;
		let relativePath: string;
		try {
			const normalized = normalizeInputPath(projectRoot, inputPath);
			absolutePath = normalized.absolutePath;
			relativePath = normalized.relativePath;
			ensureInsideWithoutSymlinks(projectRoot, absolutePath, {
				allowMissingDescendant: true,
				allowMissingLeaf: true,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushIssue(issues, message);
			findings.push(makeFinding('reference_drift_path_outside_root', 'high', inputPath, message));
			continue;
		}

		if (!existsSync(absolutePath)) {
			continue;
		}

		let stats;
		try {
			stats = lstatSync(absolutePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushIssue(issues, `${relativePath}: ${message}`);
			findings.push(makeFinding('reference_drift_unreadable_path', 'high', relativePath, message));
			continue;
		}

		if (stats.isDirectory()) {
			collectDocumentsFromDirectory(projectRoot, absolutePath, candidates, findings, issues, policy);
			continue;
		}
		if (stats.isFile() && isDocumentPath(relativePath)) {
			addCandidate(candidates, findings, issues, policy, { absolutePath, relativePath });
		}
	}

	return [...candidates.values()].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function trimCommandValue(value: string): string {
	return value
		.replace(/[|)>.,;:]+$/u, '')
		.replace(/\s+$/u, '')
		.slice(0, 240);
}

function extractBacktickValues(line: string): readonly string[] {
	return [...line.matchAll(/`([^`]+)`/gu)].map((match) => match[1] ?? '').filter((value) => value.length > 0);
}

function normalizeSchemaTarget(value: string): string {
	return path.basename(value.replace(/[.,;:)]+$/u, ''));
}

function looksLikeRepoPath(value: string): boolean {
	const trimmed = value.trim().replace(/[.,;:)]+$/u, '');
	if (
		trimmed.length === 0 ||
		trimmed.startsWith('mf ') ||
		trimmed.startsWith('http://') ||
		trimmed.startsWith('https://') ||
		trimmed.includes('<') ||
		trimmed.includes('>') ||
		trimmed.includes('*') ||
		trimmed.includes('...') ||
		trimmed.includes(' --') ||
		trimmed.includes('\n')
	) {
		return false;
	}

	return (
		trimmed === 'AGENTS.md' ||
		trimmed === 'README.md' ||
		trimmed === 'CHANGELOG.md' ||
		trimmed === 'REPO_MAP.md' ||
		trimmed === 'LICENSE' ||
		trimmed === 'package.json' ||
		trimmed.startsWith('.mustflow/') ||
		trimmed.startsWith('docs-site/') ||
		trimmed.startsWith('schemas/') ||
		trimmed.startsWith('scripts/') ||
		trimmed.startsWith('src/') ||
		trimmed.startsWith('templates/') ||
		trimmed.startsWith('tests/')
	);
}

function normalizedPathTarget(value: string): string {
	return normalizeRelativePath(value.trim().replace(/[.,;:)]+$/u, ''));
}

function extractRawReferences(relativePath: string, text: string): readonly RawReference[] {
	const references: RawReference[] = [];
	const lines = text.split(/\r?\n/u);

	for (const [index, line] of lines.entries()) {
		const lineNumber = index + 1;

		for (const match of line.matchAll(/\bmf\s+([a-z][a-z0-9-]*)\b[^\n`|)]*/giu)) {
			const command = match[1] ?? '';
			const value = trimCommandValue(match[0] ?? '');
			references.push({
				kind: 'mf_command',
				path: relativePath,
				line: lineNumber,
				value,
				target: command,
			});
		}

		for (const match of line.matchAll(/\bmf\s+script-pack\s+run\s+([a-z0-9-]+\/[a-z0-9-]+)\b/giu)) {
			const target = match[1] ?? '';
			references.push({
				kind: 'script_pack_ref',
				path: relativePath,
				line: lineNumber,
				value: match[0] ?? target,
				target,
			});
		}

		for (const match of line.matchAll(/\b(?:[A-Za-z0-9._/-]+\/)?([A-Za-z0-9-]+\.schema\.json)\b/gu)) {
			const value = match[0] ?? '';
			references.push({
				kind: 'schema_file',
				path: relativePath,
				line: lineNumber,
				value,
				target: normalizeSchemaTarget(value),
			});
		}

		for (const value of extractBacktickValues(line)) {
			if (!looksLikeRepoPath(value)) {
				continue;
			}
			const target = normalizedPathTarget(value);
			references.push({
				kind: 'repo_path',
				path: relativePath,
				line: lineNumber,
				value,
				target,
			});
		}
	}

	return references;
}

function validateReference(
	projectRoot: string,
	commandNames: ReadonlySet<string>,
	scriptRefs: ReadonlySet<string>,
	schemaFiles: ReadonlySet<string>,
	reference: RawReference,
): ReferenceDriftReference {
	switch (reference.kind) {
		case 'mf_command':
			return commandNames.has(reference.target)
				? { ...reference, status: 'ok', message: `mf command exists: ${reference.target}` }
				: { ...reference, status: 'unknown', message: `Unknown mf command: ${reference.target}` };
		case 'script_pack_ref':
			return scriptRefs.has(reference.target)
				? { ...reference, status: 'ok', message: `script-pack ref exists: ${reference.target}` }
				: { ...reference, status: 'unknown', message: `Unknown script-pack ref: ${reference.target}` };
		case 'schema_file': {
			const schemaPath = path.join(projectRoot, 'schemas', reference.target);
			const exists = schemaFiles.has(reference.target) && existsSync(schemaPath);
			return exists
				? { ...reference, status: 'ok', message: `schema file exists: ${reference.target}` }
				: { ...reference, status: 'unknown', message: `Unknown schema file: ${reference.target}` };
		}
		case 'repo_path': {
			const absolutePath = path.join(projectRoot, ...reference.target.split('/'));
			try {
				ensureInside(projectRoot, absolutePath);
			} catch {
				return { ...reference, status: 'missing', message: `Referenced path escapes the mustflow root: ${reference.target}` };
			}
			return existsSync(absolutePath)
				? { ...reference, status: 'ok', message: `repo path exists: ${reference.target}` }
				: { ...reference, status: 'missing', message: `Referenced repo path is missing: ${reference.target}` };
		}
		default:
			return { ...reference, status: 'skipped', message: 'Reference kind is not checked.' };
	}
}

function findingForReference(reference: ReferenceDriftReference): ReferenceDriftFinding | null {
	if (reference.status === 'ok' || reference.status === 'skipped') {
		return null;
	}

	if (reference.kind === 'mf_command') {
		return makeFinding('reference_drift_unknown_command', 'medium', reference.path, reference.message, reference.line);
	}
	if (reference.kind === 'script_pack_ref') {
		return makeFinding('reference_drift_unknown_script_pack', 'medium', reference.path, reference.message, reference.line);
	}
	if (reference.kind === 'schema_file') {
		return makeFinding('reference_drift_unknown_schema', 'medium', reference.path, reference.message, reference.line);
	}
	return makeFinding('reference_drift_missing_path', 'medium', reference.path, reference.message, reference.line);
}

function referenceDriftStatus(findings: readonly ReferenceDriftFinding[]): ScriptCheckStatus {
	if (findings.some((finding) => ERROR_CODES.has(finding.code))) {
		return 'error';
	}
	if (findings.some((finding) => ['medium', 'high', 'critical'].includes(finding.severity))) {
		return 'failed';
	}
	return 'passed';
}

function summarizeReferences(
	files: readonly ReferenceDriftFile[],
	references: readonly ReferenceDriftReference[],
): ReferenceDriftSummary {
	const count = (status: ReferenceDriftReferenceStatus): number =>
		references.filter((reference) => reference.status === status).length;
	return {
		files_checked: files.length,
		references_checked: references.length,
		ok: count('ok'),
		missing: count('missing'),
		unknown: count('unknown'),
		skipped: count('skipped'),
	};
}

function createInputHash(
	policy: ReferenceDriftPolicy,
	files: readonly ReferenceDriftFile[],
	references: readonly ReferenceDriftReference[],
	findings: readonly ReferenceDriftFinding[],
): string {
	return sha256Tagged(
		JSON.stringify({
			policy,
			files: files.map((file) => ({ path: file.path, sha256: file.sha256, reference_count: file.reference_count })),
			references: references.map((reference) => ({
				kind: reference.kind,
				path: reference.path,
				line: reference.line,
				target: reference.target,
				status: reference.status,
			})),
			findings: findings.map((finding) => ({ code: finding.code, path: finding.path, line: finding.line })),
		}),
	);
}

export function checkReferenceDrift(projectRoot: string, options: CheckReferenceDriftOptions): ReferenceDriftReport {
	const root = path.resolve(projectRoot);
	const policy: ReferenceDriftPolicy = {
		max_files: options.maxFiles ?? DEFAULT_MAX_FILES,
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		default_paths: [...DEFAULT_PATHS],
		path_filters: [...PATH_FILTERS],
		checked_reference_kinds: [...CHECKED_REFERENCE_KINDS],
	};
	const commandNames = new Set(options.commandNames);
	const scriptRefs = new Set(options.scriptRefs);
	const schemaFiles = new Set(options.schemaFiles);
	const findings: ReferenceDriftFinding[] = [];
	const issues: string[] = [];
	const fileEntries: ReferenceDriftFile[] = [];
	const references: ReferenceDriftReference[] = [];

	const candidates = collectDocumentCandidates(root, options.paths, policy, findings, issues);

	for (const candidate of candidates) {
		let buffer: Buffer | null = null;
		try {
			buffer = readFileInsideWithoutSymlinks(root, candidate.absolutePath, { maxBytes: policy.max_file_bytes });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const code = message.includes('exceeds maximum size')
				? 'reference_drift_file_too_large'
				: 'reference_drift_unreadable_path';
			pushIssue(issues, `${candidate.relativePath}: ${message}`);
			findings.push(makeFinding(code, 'high', candidate.relativePath, message));
		}

		const text = buffer?.toString('utf8') ?? '';
		const rawReferences = buffer ? extractRawReferences(candidate.relativePath, text) : [];
		const validatedReferences = rawReferences.map((reference) =>
			validateReference(root, commandNames, scriptRefs, schemaFiles, reference),
		);
		references.push(...validatedReferences);
		for (const reference of validatedReferences) {
			const finding = findingForReference(reference);
			if (finding) {
				findings.push(finding);
			}
		}
		fileEntries.push({
			kind: 'document',
			path: candidate.relativePath,
			sha256: buffer ? sha256Tagged(buffer) : null,
			size_bytes: buffer?.byteLength ?? null,
			line_count: buffer ? text.split(/\r?\n/u).length : null,
			reference_count: rawReferences.length,
		});
	}

	const sortedFiles = fileEntries.sort((left, right) => left.path.localeCompare(right.path));
	const sortedReferences = references.sort((left, right) =>
		left.path.localeCompare(right.path) ||
		left.line - right.line ||
		left.kind.localeCompare(right.kind) ||
		left.target.localeCompare(right.target),
	);
	const status = referenceDriftStatus(findings);
	const summary = summarizeReferences(sortedFiles, sortedReferences);

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: REFERENCE_DRIFT_PACK_ID,
		script_id: REFERENCE_DRIFT_SCRIPT_ID,
		script_ref: REFERENCE_DRIFT_SCRIPT_REF,
		action: 'check',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createInputHash(policy, sortedFiles, sortedReferences, findings),
		files: sortedFiles,
		references: sortedReferences,
		summary,
		findings,
		issues,
	};
}
