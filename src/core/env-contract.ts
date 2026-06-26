import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';
import { DEFAULT_IGNORED_DIRECTORIES, isIgnoredDirectoryPath } from './ignored-directories.js';
import { ensureInside, ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './safe-filesystem.js';

export const ENV_CONTRACT_PACK_ID = 'repo';
export const ENV_CONTRACT_SCRIPT_ID = 'env-contract';
export const ENV_CONTRACT_SCRIPT_REF = `${ENV_CONTRACT_PACK_ID}/${ENV_CONTRACT_SCRIPT_ID}`;

export type EnvContractAction = 'scan';
export type EnvContractTargetKind = 'file' | 'directory' | 'missing' | 'other' | 'unknown';
export type EnvContractSurface = 'code' | 'config' | 'ci' | 'docs' | 'example';
export type EnvContractReferenceKind =
	| 'process_env_dot'
	| 'process_env_bracket'
	| 'process_env_destructure'
	| 'bun_env_dot'
	| 'import_meta_env'
	| 'env_example'
	| 'ci_secret'
	| 'ci_var'
	| 'ci_env'
	| 'documented';

export type EnvContractFindingCode =
	| 'env_contract_path_outside_root'
	| 'env_contract_unreadable_path'
	| 'env_contract_secret_file_skipped'
	| 'env_contract_max_files_exceeded'
	| 'env_contract_max_keys_exceeded'
	| 'env_contract_missing_example'
	| 'env_contract_unused_example'
	| 'env_contract_secret_like_public_name';

export interface EnvContractPolicy {
	readonly max_file_bytes: number;
	readonly max_files: number;
	readonly max_keys: number;
	readonly extensions: readonly string[];
	readonly env_example_names: readonly string[];
	readonly skipped_secret_names: readonly string[];
	readonly ignored_directories: readonly string[];
}

export interface EnvContractTarget {
	readonly input: string;
	readonly path: string;
	readonly exists: boolean | null;
	readonly kind: EnvContractTargetKind;
}

export interface EnvContractReference {
	readonly key: string;
	readonly path: string;
	readonly line: number;
	readonly surface: EnvContractSurface;
	readonly kind: EnvContractReferenceKind;
}

export interface EnvContractKey {
	readonly key: string;
	readonly used_in_code: boolean;
	readonly declared_in_example: boolean;
	readonly referenced_in_ci: boolean;
	readonly documented: boolean;
	readonly secret_like: boolean;
	readonly public_like: boolean;
	readonly source_count: number;
	readonly sources: readonly EnvContractReference[];
}

export interface EnvContractSummary {
	readonly target_count: number;
	readonly file_count: number;
	readonly key_count: number;
	readonly code_key_count: number;
	readonly example_key_count: number;
	readonly documented_key_count: number;
	readonly ci_key_count: number;
}

export interface EnvContractFinding extends ScriptCheckFinding {
	readonly code: EnvContractFindingCode;
	readonly path: string;
	readonly key?: string;
}

export interface EnvContractReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof ENV_CONTRACT_PACK_ID;
	readonly script_id: typeof ENV_CONTRACT_SCRIPT_ID;
	readonly script_ref: typeof ENV_CONTRACT_SCRIPT_REF;
	readonly action: EnvContractAction;
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: EnvContractPolicy;
	readonly input_hash: string;
	readonly targets: readonly EnvContractTarget[];
	readonly summary: EnvContractSummary;
	readonly keys: readonly EnvContractKey[];
	readonly truncated: boolean;
	readonly findings: readonly EnvContractFinding[];
	readonly issues: readonly string[];
}

export interface InspectEnvContractOptions {
	readonly paths?: readonly string[];
	readonly maxFileBytes?: number;
	readonly maxFiles?: number;
	readonly maxKeys?: number;
}

interface EnvFileCandidate {
	readonly absolutePath: string;
	readonly relativePath: string;
	readonly surface: EnvContractSurface;
}

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const DEFAULT_MAX_FILES = 1000;
const DEFAULT_MAX_KEYS = 300;
const MAX_ISSUES = 50;
const ENV_KEY_PATTERN = '[A-Za-z_][A-Za-z0-9_]*';
const SCAN_EXTENSIONS = [
	'.ts',
	'.tsx',
	'.mts',
	'.cts',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
	'.json',
	'.toml',
	'.yml',
	'.yaml',
	'.md',
	'.mdx',
] as const;
const ENV_EXAMPLE_NAMES = [
	'.env.example',
	'.env.sample',
	'.env.template',
	'.env.defaults',
	'.env.test.example',
	'.env.local.example',
	'.dev.vars.example',
] as const;
const SECRET_ENV_NAMES = ['.env', '.env.local', '.env.production', '.env.development', '.dev.vars'] as const;
const IGNORED_DIRECTORIES = DEFAULT_IGNORED_DIRECTORIES;
const ERROR_CODES = new Set<EnvContractFindingCode>([
	'env_contract_path_outside_root',
	'env_contract_unreadable_path',
]);

function normalizeRelativePath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/^\.\/+/u, '') || '.';
}

function sha256Tagged(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function makeFinding(
	code: EnvContractFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
	key?: string,
): EnvContractFinding {
	return key ? { code, severity, path: pathValue, message, key } : { code, severity, path: pathValue, message };
}

function pushIssue(issues: string[], issue: string): void {
	if (issues.length < MAX_ISSUES) {
		issues.push(issue);
	}
}

function isIgnoredDirectory(relativePath: string): boolean {
	return isIgnoredDirectoryPath(normalizeRelativePath(relativePath), IGNORED_DIRECTORIES);
}

function isEnvExampleFile(relativePath: string): boolean {
	const name = path.basename(relativePath).toLowerCase();
	return ENV_EXAMPLE_NAMES.includes(name as (typeof ENV_EXAMPLE_NAMES)[number]);
}

function isSecretEnvFile(relativePath: string): boolean {
	const name = path.basename(relativePath).toLowerCase();
	return SECRET_ENV_NAMES.includes(name as (typeof SECRET_ENV_NAMES)[number]);
}

function surfaceForPath(relativePath: string): EnvContractSurface | null {
	if (isEnvExampleFile(relativePath)) {
		return 'example';
	}
	const normalized = normalizeRelativePath(relativePath);
	const extension = path.extname(normalized).toLowerCase();
	if (!SCAN_EXTENSIONS.includes(extension as (typeof SCAN_EXTENSIONS)[number])) {
		return null;
	}
	if (normalized.startsWith('.github/workflows/') || ['.yml', '.yaml'].includes(extension)) {
		return 'ci';
	}
	if (['.md', '.mdx'].includes(extension)) {
		return 'docs';
	}
	if (['.json', '.toml'].includes(extension) || normalized.startsWith('.mustflow/config/')) {
		return 'config';
	}
	return 'code';
}

function normalizeTargetPath(projectRoot: string, targetPath: string): { readonly absolutePath: string; readonly relativePath: string } {
	const absolutePath = path.resolve(process.cwd(), targetPath);
	ensureInside(projectRoot, absolutePath);
	return {
		absolutePath,
		relativePath: normalizeRelativePath(path.relative(projectRoot, absolutePath)),
	};
}

function targetKind(absolutePath: string): { readonly exists: boolean; readonly kind: EnvContractTargetKind } {
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

function addCandidate(
	candidates: Map<string, EnvFileCandidate>,
	findings: EnvContractFinding[],
	issues: string[],
	policy: EnvContractPolicy,
	candidate: EnvFileCandidate,
): void {
	if (candidates.has(candidate.relativePath)) {
		return;
	}
	if (candidates.size >= policy.max_files) {
		if (!findings.some((finding) => finding.code === 'env_contract_max_files_exceeded')) {
			const message = `Env-contract matched more than ${policy.max_files} files; remaining files were skipped.`;
			pushIssue(issues, message);
			findings.push(makeFinding('env_contract_max_files_exceeded', 'medium', candidate.relativePath, message));
		}
		return;
	}
	candidates.set(candidate.relativePath, candidate);
}

function collectFilesFromDirectory(
	projectRoot: string,
	absoluteDirectory: string,
	candidates: Map<string, EnvFileCandidate>,
	findings: EnvContractFinding[],
	issues: string[],
	policy: EnvContractPolicy,
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
		findings.push(makeFinding('env_contract_unreadable_path', 'high', relativeDirectory, message));
		return;
	}

	for (const entry of entries) {
		const absoluteEntry = path.join(absoluteDirectory, entry.name);
		const relativeEntry = normalizeRelativePath(path.relative(projectRoot, absoluteEntry));
		if (entry.isDirectory()) {
			collectFilesFromDirectory(projectRoot, absoluteEntry, candidates, findings, issues, policy);
			continue;
		}
		if (!entry.isFile()) {
			continue;
		}
		const surface = surfaceForPath(relativeEntry);
		if (surface) {
			addCandidate(candidates, findings, issues, policy, { absolutePath: absoluteEntry, relativePath: relativeEntry, surface });
		}
	}
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

function addReference(
	references: EnvContractReference[],
	seen: Set<string>,
	key: string,
	candidate: EnvFileCandidate,
	line: number,
	kind: EnvContractReferenceKind,
): void {
	if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) {
		return;
	}
	const reference: EnvContractReference = { key, path: candidate.relativePath, line, surface: candidate.surface, kind };
	const dedupeKey = `${reference.key}\0${reference.path}\0${reference.line}\0${reference.kind}`;
	if (seen.has(dedupeKey)) {
		return;
	}
	seen.add(dedupeKey);
	references.push(reference);
}

function collectRegexReferences(
	text: string,
	candidate: EnvFileCandidate,
	references: EnvContractReference[],
	seen: Set<string>,
	pattern: RegExp,
	kind: EnvContractReferenceKind,
): void {
	for (const match of text.matchAll(pattern)) {
		const key = match.groups?.key;
		if (key) {
			addReference(references, seen, key, candidate, lineNumberAtIndex(text, match.index ?? 0), kind);
		}
	}
}

function collectDestructuredProcessEnv(text: string, candidate: EnvFileCandidate, references: EnvContractReference[], seen: Set<string>): void {
	const pattern = /\{(?<body>[^}]+)\}\s*=\s*process\.env\b/gu;
	for (const match of text.matchAll(pattern)) {
		const body = match.groups?.body ?? '';
		for (const entry of body.split(',')) {
			const key = new RegExp(`^\\s*(?<key>${ENV_KEY_PATTERN})(?:\\s*:|\\s*$)`, 'u').exec(entry)?.groups?.key;
			if (key) {
				addReference(references, seen, key, candidate, lineNumberAtIndex(text, match.index ?? 0), 'process_env_destructure');
			}
		}
	}
}

function collectEnvExampleReferences(text: string, candidate: EnvFileCandidate, references: EnvContractReference[], seen: Set<string>): void {
	const lines = text.split(/\r?\n/u);
	for (const [index, line] of lines.entries()) {
		const match = new RegExp(`^\\s*(?:export\\s+)?(?<key>${ENV_KEY_PATTERN})\\s*=`, 'u').exec(line);
		if (match?.groups?.key) {
			addReference(references, seen, match.groups.key, candidate, index + 1, 'env_example');
		}
	}
}

function collectCiReferences(text: string, candidate: EnvFileCandidate, references: EnvContractReference[], seen: Set<string>): void {
	collectRegexReferences(text, candidate, references, seen, /\$\{\{\s*secrets\.(?<key>[A-Z][A-Z0-9_]+)\s*\}\}/gu, 'ci_secret');
	collectRegexReferences(text, candidate, references, seen, /\$\{\{\s*vars\.(?<key>[A-Z][A-Z0-9_]+)\s*\}\}/gu, 'ci_var');
	const lines = text.split(/\r?\n/u);
	for (const [index, line] of lines.entries()) {
		const match = /^\s{2,}(?<key>[A-Z][A-Z0-9_]{2,})\s*:/u.exec(line);
		if (match?.groups?.key) {
			addReference(references, seen, match.groups.key, candidate, index + 1, 'ci_env');
		}
	}
}

function collectDocumentedReferences(text: string, candidate: EnvFileCandidate, references: EnvContractReference[], seen: Set<string>): void {
	const pattern = /`(?<key>[A-Z][A-Z0-9_]{2,})`|\b(?<bare>[A-Z][A-Z0-9_]{3,})\b/gu;
	for (const match of text.matchAll(pattern)) {
		const key = match.groups?.key ?? match.groups?.bare;
		if (key && key.includes('_')) {
			addReference(references, seen, key, candidate, lineNumberAtIndex(text, match.index ?? 0), 'documented');
		}
	}
}

function collectCodeReferences(text: string, candidate: EnvFileCandidate, references: EnvContractReference[], seen: Set<string>): void {
	collectRegexReferences(text, candidate, references, seen, /\bprocess\.env\.(?<key>[A-Za-z_][A-Za-z0-9_]*)\b/gu, 'process_env_dot');
	collectRegexReferences(
		text,
		candidate,
		references,
		seen,
		/\bprocess\.env\s*\[\s*['"](?<key>[A-Za-z_][A-Za-z0-9_]*)['"]\s*\]/gu,
		'process_env_bracket',
	);
	collectRegexReferences(text, candidate, references, seen, /\bBun\.env\.(?<key>[A-Za-z_][A-Za-z0-9_]*)\b/gu, 'bun_env_dot');
	collectRegexReferences(text, candidate, references, seen, /\bimport\.meta\.env\.(?<key>[A-Za-z_][A-Za-z0-9_]*)\b/gu, 'import_meta_env');
	collectDestructuredProcessEnv(text, candidate, references, seen);
}

function collectReferencesForFile(text: string, candidate: EnvFileCandidate): readonly EnvContractReference[] {
	const references: EnvContractReference[] = [];
	const seen = new Set<string>();
	if (candidate.surface === 'example') {
		collectEnvExampleReferences(text, candidate, references, seen);
	} else if (candidate.surface === 'ci') {
		collectCiReferences(text, candidate, references, seen);
		collectCodeReferences(text, candidate, references, seen);
	} else if (candidate.surface === 'docs') {
		collectDocumentedReferences(text, candidate, references, seen);
	} else {
		collectCodeReferences(text, candidate, references, seen);
	}
	return references;
}

function isSecretLikeKey(key: string): boolean {
	return /(?:SECRET|TOKEN|PASSWORD|PASS|PRIVATE|CREDENTIAL|API_KEY|ACCESS_KEY|AUTH|SESSION|SIGNING|WEBHOOK)/u.test(key);
}

function isPublicLikeKey(key: string): boolean {
	return /^(?:PUBLIC_|VITE_|NEXT_PUBLIC_|NUXT_PUBLIC_|EXPO_PUBLIC_)/u.test(key);
}

function keyFromReferences(key: string, sources: readonly EnvContractReference[]): EnvContractKey {
	const usedInCode = sources.some((source) =>
		['process_env_dot', 'process_env_bracket', 'process_env_destructure', 'bun_env_dot', 'import_meta_env'].includes(source.kind),
	);
	const declaredInExample = sources.some((source) => source.kind === 'env_example');
	const referencedInCi = sources.some((source) => ['ci_secret', 'ci_var', 'ci_env'].includes(source.kind));
	const documented = sources.some((source) => source.kind === 'documented');
	return {
		key,
		used_in_code: usedInCode,
		declared_in_example: declaredInExample,
		referenced_in_ci: referencedInCi,
		documented,
		secret_like: isSecretLikeKey(key),
		public_like: isPublicLikeKey(key),
		source_count: sources.length,
		sources,
	};
}

function sortReference(left: EnvContractReference, right: EnvContractReference): number {
	return left.path.localeCompare(right.path) || left.line - right.line || left.kind.localeCompare(right.kind);
}

function buildKeys(
	references: readonly EnvContractReference[],
	findings: EnvContractFinding[],
	issues: string[],
	policy: EnvContractPolicy,
): readonly EnvContractKey[] {
	const byKey = new Map<string, EnvContractReference[]>();
	for (const reference of references) {
		const entries = byKey.get(reference.key) ?? [];
		entries.push(reference);
		byKey.set(reference.key, entries);
	}

	const keys: EnvContractKey[] = [];
	for (const [key, sources] of [...byKey.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
		if (keys.length >= policy.max_keys) {
			if (!findings.some((finding) => finding.code === 'env_contract_max_keys_exceeded')) {
				const message = `Env-contract found more than ${policy.max_keys} keys; remaining keys were skipped.`;
				pushIssue(issues, message);
				findings.push(makeFinding('env_contract_max_keys_exceeded', 'medium', '.', message));
			}
			break;
		}
		keys.push(keyFromReferences(key, sources.sort(sortReference)));
	}

	for (const entry of keys) {
		const firstPath = entry.sources[0]?.path ?? '.';
		if (entry.used_in_code && !entry.declared_in_example && !entry.documented) {
			findings.push(
				makeFinding(
					'env_contract_missing_example',
					'medium',
					firstPath,
					`${entry.key} is used in code but is not declared in env examples or docs.`,
					entry.key,
				),
			);
		}
		if (entry.declared_in_example && !entry.used_in_code && !entry.documented && !entry.referenced_in_ci) {
			findings.push(makeFinding('env_contract_unused_example', 'low', firstPath, `${entry.key} is declared only in env examples.`, entry.key));
		}
		if (entry.secret_like && entry.public_like) {
			findings.push(
				makeFinding('env_contract_secret_like_public_name', 'high', firstPath, `${entry.key} looks secret-like but uses a public env prefix.`, entry.key),
			);
		}
	}

	return keys;
}

function envContractStatus(findings: readonly EnvContractFinding[]): ScriptCheckStatus {
	if (findings.some((finding) => ERROR_CODES.has(finding.code))) {
		return 'error';
	}
	if (findings.some((finding) => ['medium', 'high', 'critical'].includes(finding.severity))) {
		return 'failed';
	}
	return 'passed';
}

function createInputHash(
	policy: EnvContractPolicy,
	targets: readonly EnvContractTarget[],
	keys: readonly EnvContractKey[],
	findings: readonly EnvContractFinding[],
	issues: readonly string[],
): string {
	return sha256Tagged(
		JSON.stringify({
			policy,
			targets,
			keys: keys.map((entry) => ({
				key: entry.key,
				source_count: entry.source_count,
				flags: [entry.used_in_code, entry.declared_in_example, entry.referenced_in_ci, entry.documented],
			})),
			findings: findings.map((finding) => ({ code: finding.code, path: finding.path, key: finding.key })),
			issues,
		}),
	);
}

function summarizeEnvContract(targets: readonly EnvContractTarget[], fileCount: number, keys: readonly EnvContractKey[]): EnvContractSummary {
	return {
		target_count: targets.length,
		file_count: fileCount,
		key_count: keys.length,
		code_key_count: keys.filter((entry) => entry.used_in_code).length,
		example_key_count: keys.filter((entry) => entry.declared_in_example).length,
		documented_key_count: keys.filter((entry) => entry.documented).length,
		ci_key_count: keys.filter((entry) => entry.referenced_in_ci).length,
	};
}

function inspectEnvCandidate(
	projectRoot: string,
	candidate: EnvFileCandidate,
	policy: EnvContractPolicy,
	findings: EnvContractFinding[],
	issues: string[],
): readonly EnvContractReference[] {
	if (isSecretEnvFile(candidate.relativePath)) {
		findings.push(
			makeFinding('env_contract_secret_file_skipped', 'low', candidate.relativePath, `${candidate.relativePath} was skipped to avoid reading real env values.`),
		);
		return [];
	}

	try {
		const buffer = readFileInsideWithoutSymlinks(projectRoot, candidate.absolutePath, { maxBytes: policy.max_file_bytes });
		return collectReferencesForFile(buffer.toString('utf8'), candidate);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushIssue(issues, `${candidate.relativePath}: ${message}`);
		findings.push(makeFinding('env_contract_unreadable_path', 'high', candidate.relativePath, message));
		return [];
	}
}

export function inspectEnvContract(projectRoot: string, options: InspectEnvContractOptions = {}): EnvContractReport {
	const root = path.resolve(projectRoot);
	const policy: EnvContractPolicy = {
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		max_files: options.maxFiles ?? DEFAULT_MAX_FILES,
		max_keys: options.maxKeys ?? DEFAULT_MAX_KEYS,
		extensions: [...SCAN_EXTENSIONS],
		env_example_names: [...ENV_EXAMPLE_NAMES],
		skipped_secret_names: [...SECRET_ENV_NAMES],
		ignored_directories: [...IGNORED_DIRECTORIES],
	};
	const targetInputs = options.paths && options.paths.length > 0 ? options.paths : ['.'];
	const targets: EnvContractTarget[] = [];
	const candidates = new Map<string, EnvFileCandidate>();
	const findings: EnvContractFinding[] = [];
	const issues: string[] = [];

	for (const targetPath of targetInputs) {
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
			targets.push({ input: targetPath, path: targetPath, exists: null, kind: 'unknown' });
			findings.push(makeFinding('env_contract_path_outside_root', 'high', targetPath, message));
			continue;
		}

		let existence;
		try {
			existence = targetKind(absolutePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushIssue(issues, `${relativePath}: ${message}`);
			targets.push({ input: targetPath, path: relativePath, exists: null, kind: 'unknown' });
			findings.push(makeFinding('env_contract_unreadable_path', 'high', relativePath, message));
			continue;
		}

		targets.push({ input: targetPath, path: relativePath, exists: existence.exists, kind: existence.kind });
		if (existence.kind === 'file') {
			const surface = surfaceForPath(relativePath);
			if (surface || isSecretEnvFile(relativePath)) {
				addCandidate(candidates, findings, issues, policy, { absolutePath, relativePath, surface: surface ?? 'example' });
			}
		} else if (existence.kind === 'directory') {
			collectFilesFromDirectory(root, absolutePath, candidates, findings, issues, policy);
		}
	}

	const references = [...candidates.values()].flatMap((candidate) => inspectEnvCandidate(root, candidate, policy, findings, issues));
	const keys = buildKeys(references, findings, issues, policy);
	const status = envContractStatus(findings);
	const truncated = findings.some((finding) =>
		['env_contract_max_files_exceeded', 'env_contract_max_keys_exceeded'].includes(finding.code),
	);
	const summary = summarizeEnvContract(targets, candidates.size, keys);

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: ENV_CONTRACT_PACK_ID,
		script_id: ENV_CONTRACT_SCRIPT_ID,
		script_ref: ENV_CONTRACT_SCRIPT_REF,
		action: 'scan',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createInputHash(policy, targets, keys, findings, issues),
		targets,
		summary,
		keys,
		truncated,
		findings,
		issues,
	};
}
