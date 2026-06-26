import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
	type ScriptCheckFinding,
	type ScriptCheckFindingSeverity,
	type ScriptCheckStatus,
} from './script-check-result.js';
import { DEFAULT_IGNORED_DIRECTORIES, isIgnoredDirectoryPath } from './ignored-directories.js';
import { ensureInside, ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './safe-filesystem.js';

export const RELATED_FILES_PACK_ID = 'repo';
export const RELATED_FILES_SCRIPT_ID = 'related-files';
export const RELATED_FILES_SCRIPT_REF = `${RELATED_FILES_PACK_ID}/${RELATED_FILES_SCRIPT_ID}`;

export type RelatedFileLanguage =
	| 'typescript'
	| 'tsx'
	| 'javascript'
	| 'jsx'
	| 'javascript-module'
	| 'javascript-commonjs'
	| 'json'
	| 'other';

export type RelatedFileTargetKind = 'file' | 'directory' | 'missing' | 'other' | 'unknown';

export type RelatedFileRelationship =
	| 'import'
	| 'importer'
	| 'sibling_test'
	| 'sibling_docs'
	| 'sibling_style'
	| 'sibling_type'
	| 'config_parent'
	| 'package_boundary';

export type RelatedFilesFindingCode =
	| 'related_files_path_outside_root'
	| 'related_files_unreadable_path'
	| 'related_files_max_files_exceeded'
	| 'related_files_max_candidates_exceeded';

export interface RelatedFilesPolicy {
	readonly max_file_bytes: number;
	readonly max_files: number;
	readonly max_candidates: number;
	readonly extensions: readonly string[];
	readonly ignored_directories: readonly string[];
}

export interface RelatedFilesTarget {
	readonly input: string;
	readonly path: string;
	readonly exists: boolean | null;
	readonly kind: RelatedFileTargetKind;
	readonly language: RelatedFileLanguage;
}

export interface RelatedFileCandidate {
	readonly path: string;
	readonly relationship: RelatedFileRelationship;
	readonly confidence: number;
	readonly reason: string;
	readonly source_path: string;
	readonly target_path: string;
	readonly line: number | null;
}

export interface RelatedFilesFinding extends ScriptCheckFinding {
	readonly code: RelatedFilesFindingCode;
	readonly path: string;
}

export interface RelatedFilesReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof RELATED_FILES_PACK_ID;
	readonly script_id: typeof RELATED_FILES_SCRIPT_ID;
	readonly script_ref: typeof RELATED_FILES_SCRIPT_REF;
	readonly action: 'map';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: RelatedFilesPolicy;
	readonly input_hash: string;
	readonly targets: readonly RelatedFilesTarget[];
	readonly candidates: readonly RelatedFileCandidate[];
	readonly truncated: boolean;
	readonly findings: readonly RelatedFilesFinding[];
	readonly issues: readonly string[];
}

export interface InspectRelatedFilesOptions {
	readonly paths: readonly string[];
	readonly maxFileBytes?: number;
	readonly maxFiles?: number;
	readonly maxCandidates?: number;
}

interface SourceFileCandidate {
	readonly absolutePath: string;
	readonly relativePath: string;
	readonly language: RelatedFileLanguage;
}

interface ImportReference {
	readonly specifier: string;
	readonly line: number;
	readonly resolvedPath: string | null;
}

interface ImportSpecifierMatch {
	readonly specifier: string;
	readonly index: number;
}

interface TargetExistence {
	readonly exists: boolean;
	readonly kind: RelatedFileTargetKind;
}

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const DEFAULT_MAX_FILES = 1000;
const DEFAULT_MAX_CANDIDATES = 200;
const MAX_ISSUES = 50;
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const;
const RESOLVE_EXTENSIONS = [...SOURCE_EXTENSIONS, '.json'] as const;
const RELATED_EXTENSIONS = [...RESOLVE_EXTENSIONS, '.d.ts', '.md', '.mdx', '.css', '.scss', '.sass', '.less'] as const;
const IGNORED_DIRECTORIES = DEFAULT_IGNORED_DIRECTORIES;
const CONFIG_FILE_PATTERNS = [
	/^package\.json$/u,
	/^tsconfig(?:\.[^.]+)?\.json$/u,
	/^eslint\.config\.(?:js|mjs|cjs|ts)$/u,
	/^\.eslintrc(?:\.(?:js|cjs|json|yaml|yml))?$/u,
	/^vite\.config\.(?:js|mjs|cjs|ts|mts|cts)$/u,
	/^vitest\.config\.(?:js|mjs|cjs|ts|mts|cts)$/u,
	/^tailwind\.config\.(?:js|mjs|cjs|ts|mts|cts)$/u,
] as const;
const ERROR_RELATED_FILES_CODES = new Set<RelatedFilesFindingCode>([
	'related_files_path_outside_root',
	'related_files_unreadable_path',
]);

function toPosixPath(value: string): string {
	return value.replace(/\\/gu, '/');
}

function normalizeRelativePath(value: string): string {
	return toPosixPath(value).replace(/^\.\/+/u, '') || '.';
}

function sha256Tagged(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function languageForPath(filePath: string): RelatedFileLanguage {
	switch (path.extname(filePath).toLowerCase()) {
		case '.ts':
		case '.mts':
		case '.cts':
			return filePath.endsWith('.d.ts') ? 'other' : 'typescript';
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
		case '.json':
			return 'json';
		default:
			return 'other';
	}
}

function isSourceLanguage(language: RelatedFileLanguage): boolean {
	return language !== 'json' && language !== 'other';
}

function isIgnoredDirectory(relativePath: string): boolean {
	return isIgnoredDirectoryPath(normalizeRelativePath(relativePath), IGNORED_DIRECTORIES);
}

function makeFinding(
	code: RelatedFilesFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
): RelatedFilesFinding {
	return { code, severity, path: pathValue, message };
}

function pushIssue(issues: string[], issue: string): void {
	if (issues.length < MAX_ISSUES) {
		issues.push(issue);
	}
}

function normalizeTargetPath(projectRoot: string, targetPath: string): { readonly absolutePath: string; readonly relativePath: string } {
	const absolutePath = path.resolve(process.cwd(), targetPath);
	ensureInside(projectRoot, absolutePath);
	return {
		absolutePath,
		relativePath: normalizeRelativePath(path.relative(projectRoot, absolutePath)),
	};
}

function targetKind(absolutePath: string): { readonly exists: boolean; readonly kind: RelatedFileTargetKind } {
	if (!existsSync(absolutePath)) {
		return { exists: false, kind: 'missing' };
	}

	const stats = lstatSync(absolutePath);
	if (stats.isFile()) {
		return { exists: true, kind: 'file' };
	}
	if (stats.isDirectory()) {
		return { exists: true, kind: 'directory' };
	}
	return { exists: true, kind: 'other' };
}

function collectFilesFromDirectory(
	projectRoot: string,
	absoluteDirectory: string,
	candidates: SourceFileCandidate[],
	findings: RelatedFilesFinding[],
	issues: string[],
	policy: RelatedFilesPolicy,
	extensions: readonly string[],
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
		pushIssue(issues, `${relativeDirectory}: ${message}`);
		findings.push(makeFinding('related_files_unreadable_path', 'high', relativeDirectory, message));
		return;
	}

	for (const entry of entries) {
		if (candidates.length >= policy.max_files) {
			const message = `Related-files scan matched more than ${policy.max_files} files; remaining files were skipped.`;
			pushIssue(issues, `${relativeDirectory}: ${message}`);
			if (!findings.some((finding) => finding.code === 'related_files_max_files_exceeded')) {
				findings.push(makeFinding('related_files_max_files_exceeded', 'medium', relativeDirectory, message));
			}
			return;
		}

		const absoluteEntry = path.join(absoluteDirectory, entry.name);
		const relativeEntry = normalizeRelativePath(path.relative(projectRoot, absoluteEntry));

		if (entry.isDirectory()) {
			collectFilesFromDirectory(projectRoot, absoluteEntry, candidates, findings, issues, policy, extensions);
			continue;
		}

		if (!entry.isFile() || !extensions.includes(path.extname(entry.name).toLowerCase())) {
			continue;
		}

		candidates.push({ absolutePath: absoluteEntry, relativePath: relativeEntry, language: languageForPath(absoluteEntry) });
	}
}

function collectCandidateFiles(
	projectRoot: string,
	findings: RelatedFilesFinding[],
	issues: string[],
	policy: RelatedFilesPolicy,
	extensions: readonly string[],
): readonly SourceFileCandidate[] {
	const candidates: SourceFileCandidate[] = [];
	collectFilesFromDirectory(projectRoot, projectRoot, candidates, findings, issues, policy, extensions);
	return candidates.slice(0, policy.max_files);
}

function lineNumberAtIndex(text: string, index: number): number {
	let line = 1;
	let offset = 0;
	while (offset < index) {
		if (text.charCodeAt(offset) === 10) {
			line += 1;
		}
		offset += 1;
	}
	return line;
}

function extractImportSpecifiers(text: string): readonly ImportSpecifierMatch[] {
	const results: ImportSpecifierMatch[] = [];
	const patterns = [
		/\b(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"](?<specifier>[^'"]+)['"]/gu,
		/\bimport\s*\(\s*['"](?<specifier>[^'"]+)['"]\s*\)/gu,
		/\brequire\s*\(\s*['"](?<specifier>[^'"]+)['"]\s*\)/gu,
	] as const;

	for (const pattern of patterns) {
		for (const match of text.matchAll(pattern)) {
			const specifier = match.groups?.specifier;
			if (specifier) {
				results.push({ specifier, index: match.index ?? 0 });
			}
		}
	}

	return results.sort((left, right) => left.index - right.index || left.specifier.localeCompare(right.specifier));
}

function isRelativeSpecifier(specifier: string): boolean {
	return specifier.startsWith('./') || specifier.startsWith('../');
}

function fileExists(absolutePath: string): boolean {
	try {
		return lstatSync(absolutePath).isFile();
	} catch {
		return false;
	}
}

function resolveRelativeImport(projectRoot: string, sourceAbsolutePath: string, specifier: string): string | null {
	if (!isRelativeSpecifier(specifier)) {
		return null;
	}

	const base = path.resolve(path.dirname(sourceAbsolutePath), specifier);
	const candidates = [
		base,
		...RESOLVE_EXTENSIONS.map((extension) => `${base}${extension}`),
		...RESOLVE_EXTENSIONS.map((extension) => path.join(base, `index${extension}`)),
	];

	for (const candidate of candidates) {
		try {
			ensureInside(projectRoot, candidate);
			if (fileExists(candidate)) {
				return normalizeRelativePath(path.relative(projectRoot, candidate));
			}
		} catch {
			return null;
		}
	}

	return null;
}

function readImportsForFile(
	projectRoot: string,
	candidate: SourceFileCandidate,
	policy: RelatedFilesPolicy,
	issues: string[],
): readonly ImportReference[] {
	if (!isSourceLanguage(candidate.language)) {
		return [];
	}

	let buffer: Buffer;
	try {
		buffer = readFileInsideWithoutSymlinks(projectRoot, candidate.absolutePath, { maxBytes: policy.max_file_bytes });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushIssue(issues, `${candidate.relativePath}: ${message}`);
		return [];
	}

	const text = buffer.toString('utf8');
	return extractImportSpecifiers(text).map((entry) => ({
		specifier: entry.specifier,
		line: lineNumberAtIndex(text, entry.index),
		resolvedPath: resolveRelativeImport(projectRoot, candidate.absolutePath, entry.specifier),
	}));
}

function candidateKey(candidate: RelatedFileCandidate): string {
	return [
		candidate.relationship,
		candidate.path,
		candidate.source_path,
		candidate.target_path,
		candidate.line ?? '',
	].join('\0');
}

function addCandidate(
	candidates: Map<string, RelatedFileCandidate>,
	next: RelatedFileCandidate,
	policy: RelatedFilesPolicy,
	findings: RelatedFilesFinding[],
	issues: string[],
): void {
	if (next.path === next.target_path && next.relationship !== 'config_parent' && next.relationship !== 'package_boundary') {
		return;
	}

	if (candidates.has(candidateKey(next))) {
		return;
	}

	if (candidates.size >= policy.max_candidates) {
		if (!findings.some((finding) => finding.code === 'related_files_max_candidates_exceeded')) {
			const message = `Related-files map found more than ${policy.max_candidates} candidates; remaining candidates were skipped.`;
			pushIssue(issues, message);
			findings.push(makeFinding('related_files_max_candidates_exceeded', 'medium', next.target_path, message));
		}
		return;
	}

	candidates.set(candidateKey(next), next);
}

function isTestSibling(candidate: string, targetStem: string): boolean {
	const stem = path.basename(candidate).replace(/\.(?:d\.)?(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/u, '');
	return stem === `${targetStem}.test` || stem === `${targetStem}.spec`;
}

function isDocsSibling(candidate: string, targetStem: string): boolean {
	const stem = path.basename(candidate).replace(/\.(?:md|mdx)$/u, '');
	return stem === targetStem;
}

function isStyleSibling(candidate: string, targetStem: string): boolean {
	const stem = path.basename(candidate).replace(/\.(?:module\.)?(?:css|scss|sass|less)$/u, '');
	return stem === targetStem;
}

function isTypeSibling(candidate: string, targetStem: string): boolean {
	const basename = path.basename(candidate);
	return basename === `${targetStem}.d.ts` || basename === `${targetStem}.types.ts`;
}

function relationshipForSibling(candidatePath: string, targetStem: string): RelatedFileRelationship | null {
	if (isTestSibling(candidatePath, targetStem)) {
		return 'sibling_test';
	}
	if (isDocsSibling(candidatePath, targetStem)) {
		return 'sibling_docs';
	}
	if (isStyleSibling(candidatePath, targetStem)) {
		return 'sibling_style';
	}
	if (isTypeSibling(candidatePath, targetStem)) {
		return 'sibling_type';
	}
	return null;
}

function siblingConfidence(relationship: RelatedFileRelationship): number {
	switch (relationship) {
		case 'sibling_test':
			return 0.78;
		case 'sibling_type':
			return 0.72;
		case 'sibling_docs':
		case 'sibling_style':
			return 0.62;
		default:
			return 0.5;
	}
}

function addSiblingCandidates(
	target: RelatedFilesTarget,
	allFiles: readonly SourceFileCandidate[],
	candidates: Map<string, RelatedFileCandidate>,
	policy: RelatedFilesPolicy,
	findings: RelatedFilesFinding[],
	issues: string[],
): void {
	if (target.kind !== 'file') {
		return;
	}

	const targetStem = path.basename(target.path).replace(/\.(?:d\.)?(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|json)$/u, '');
	for (const file of allFiles) {
		if (file.relativePath === target.path) {
			continue;
		}

		const relationship = relationshipForSibling(file.relativePath, targetStem);
		if (!relationship) {
			continue;
		}

		addCandidate(
			candidates,
			{
				path: file.relativePath,
				relationship,
				confidence: siblingConfidence(relationship),
				reason: `${file.relativePath} shares basename ${targetStem} with ${target.path}.`,
				source_path: target.path,
				target_path: target.path,
				line: null,
			},
			policy,
			findings,
			issues,
		);
	}
}

function isConfigFileName(name: string): boolean {
	return CONFIG_FILE_PATTERNS.some((pattern) => pattern.test(name));
}

function addConfigParentCandidates(
	projectRoot: string,
	target: RelatedFilesTarget,
	candidates: Map<string, RelatedFileCandidate>,
	policy: RelatedFilesPolicy,
	findings: RelatedFilesFinding[],
	issues: string[],
): void {
	const startRelativeDirectory = target.kind === 'directory' ? target.path : normalizeRelativePath(path.dirname(target.path));
	const startAbsoluteDirectory = path.join(projectRoot, ...startRelativeDirectory.split('/').filter((segment) => segment !== '.'));
	let current = path.resolve(startAbsoluteDirectory);

	while (current.startsWith(projectRoot)) {
		let entries;
		try {
			entries = readdirSync(current, { withFileTypes: true });
		} catch {
			break;
		}

		for (const entry of entries) {
			if (!entry.isFile() || !isConfigFileName(entry.name)) {
				continue;
			}

			const configPath = normalizeRelativePath(path.relative(projectRoot, path.join(current, entry.name)));
			const relationship: RelatedFileRelationship = entry.name === 'package.json' ? 'package_boundary' : 'config_parent';
			addCandidate(
				candidates,
				{
					path: configPath,
					relationship,
					confidence: relationship === 'package_boundary' ? 0.72 : 0.58,
					reason: `${configPath} is a parent configuration file for ${target.path}.`,
					source_path: target.path,
					target_path: target.path,
					line: null,
				},
				policy,
				findings,
				issues,
			);
		}

		const parent = path.dirname(current);
		if (parent === current || path.relative(projectRoot, parent).startsWith('..')) {
			break;
		}
		current = parent;
	}
}

function createInputHash(
	policy: RelatedFilesPolicy,
	targets: readonly RelatedFilesTarget[],
	candidates: readonly RelatedFileCandidate[],
	findings: readonly RelatedFilesFinding[],
	issues: readonly string[],
): string {
	return sha256Tagged(
		JSON.stringify({
			policy,
			targets,
			candidates,
			findings: findings.map((finding) => ({ code: finding.code, path: finding.path })),
			issues,
		}),
	);
}

function relatedFilesStatus(findings: readonly RelatedFilesFinding[]): ScriptCheckStatus {
	if (findings.some((finding) => ERROR_RELATED_FILES_CODES.has(finding.code))) {
		return 'error';
	}
	return findings.length > 0 ? 'failed' : 'passed';
}

export function inspectRelatedFiles(projectRoot: string, options: InspectRelatedFilesOptions): RelatedFilesReport {
	const root = path.resolve(projectRoot);
	const policy: RelatedFilesPolicy = {
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		max_files: options.maxFiles ?? DEFAULT_MAX_FILES,
		max_candidates: options.maxCandidates ?? DEFAULT_MAX_CANDIDATES,
		extensions: [...RELATED_EXTENSIONS],
		ignored_directories: [...IGNORED_DIRECTORIES],
	};
	const targets: RelatedFilesTarget[] = [];
	const findings: RelatedFilesFinding[] = [];
	const issues: string[] = [];

	for (const targetPath of options.paths) {
		let absolutePath: string;
		let relativePath: string;
		try {
			const normalized = normalizeTargetPath(root, targetPath);
			absolutePath = normalized.absolutePath;
			relativePath = normalized.relativePath;
			ensureInsideWithoutSymlinks(root, absolutePath, { allowMissingLeaf: true });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushIssue(issues, message);
			targets.push({ input: targetPath, path: targetPath, exists: null, kind: 'unknown', language: 'other' });
			findings.push(makeFinding('related_files_path_outside_root', 'high', targetPath, message));
			continue;
		}

		let existence: TargetExistence;
		try {
			existence = targetKind(absolutePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushIssue(issues, `${relativePath}: ${message}`);
			targets.push({ input: targetPath, path: relativePath, exists: null, kind: 'unknown', language: 'other' });
			findings.push(makeFinding('related_files_unreadable_path', 'high', relativePath, message));
			continue;
		}

		targets.push({
			input: targetPath,
			path: relativePath,
			exists: existence.exists,
			kind: existence.kind,
			language: languageForPath(absolutePath),
		});
	}

	const sourceFiles = collectCandidateFiles(root, findings, issues, policy, SOURCE_EXTENSIONS);
	const relatedFiles = collectCandidateFiles(root, findings, issues, policy, RELATED_EXTENSIONS);
	const importMap = new Map<string, readonly ImportReference[]>();
	const candidateMap = new Map<string, RelatedFileCandidate>();

	for (const file of sourceFiles) {
		importMap.set(file.relativePath, readImportsForFile(root, file, policy, issues));
	}

	for (const target of targets) {
		if (target.kind !== 'file') {
			addConfigParentCandidates(root, target, candidateMap, policy, findings, issues);
			continue;
		}

		for (const reference of importMap.get(target.path) ?? []) {
			if (reference.resolvedPath === null) {
				continue;
			}

			addCandidate(
				candidateMap,
				{
					path: reference.resolvedPath,
					relationship: 'import',
					confidence: 0.94,
					reason: `${target.path} imports ${reference.specifier}.`,
					source_path: target.path,
					target_path: target.path,
					line: reference.line,
				},
				policy,
				findings,
				issues,
			);
		}

		for (const [sourcePath, references] of importMap.entries()) {
			for (const reference of references) {
				if (reference.resolvedPath !== target.path || sourcePath === target.path) {
					continue;
				}

				addCandidate(
					candidateMap,
					{
						path: sourcePath,
						relationship: 'importer',
						confidence: 0.9,
						reason: `${sourcePath} imports ${target.path}.`,
						source_path: sourcePath,
						target_path: target.path,
						line: reference.line,
					},
					policy,
					findings,
					issues,
				);
			}
		}

		addSiblingCandidates(target, relatedFiles, candidateMap, policy, findings, issues);
		addConfigParentCandidates(root, target, candidateMap, policy, findings, issues);
	}

	const candidates = [...candidateMap.values()].sort(
		(left, right) =>
			right.confidence - left.confidence ||
			left.target_path.localeCompare(right.target_path) ||
			left.relationship.localeCompare(right.relationship) ||
			left.path.localeCompare(right.path) ||
			(left.line ?? 0) - (right.line ?? 0),
	);
	const status = relatedFilesStatus(findings);

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: RELATED_FILES_PACK_ID,
		script_id: RELATED_FILES_SCRIPT_ID,
		script_ref: RELATED_FILES_SCRIPT_REF,
		action: 'map',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createInputHash(policy, targets, candidates, findings, issues),
		targets,
		candidates,
		truncated: findings.some((finding) =>
			['related_files_max_files_exceeded', 'related_files_max_candidates_exceeded'].includes(finding.code),
		),
		findings,
		issues,
	};
}
