import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';
import { ensureInside, ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './safe-filesystem.js';

export const CONFIG_CHAIN_PACK_ID = 'repo';
export const CONFIG_CHAIN_SCRIPT_ID = 'config-chain';
export const CONFIG_CHAIN_SCRIPT_REF = `${CONFIG_CHAIN_PACK_ID}/${CONFIG_CHAIN_SCRIPT_ID}`;

export type ConfigChainAction = 'inspect';
export type ConfigChainFormat = 'json' | 'jsonc' | 'javascript' | 'typescript' | 'yaml' | 'toml' | 'unknown';
export type ConfigChainKind =
	| 'package_json'
	| 'tsconfig'
	| 'eslint'
	| 'prettier'
	| 'vite'
	| 'vitest'
	| 'tailwind'
	| 'jest'
	| 'playwright'
	| 'mustflow'
	| 'other';
export type ConfigChainEdgeKind = 'parent_config' | 'extends' | 'reference' | 'workspace';
export type ConfigChainTargetKind = 'file' | 'directory' | 'missing' | 'other' | 'unknown';

export type ConfigChainFindingCode =
	| 'config_chain_path_outside_root'
	| 'config_chain_unreadable_path'
	| 'config_chain_parse_error'
	| 'config_chain_dynamic_config'
	| 'config_chain_external_reference'
	| 'config_chain_missing_reference'
	| 'config_chain_max_configs_exceeded';

export interface ConfigChainPolicy {
	readonly max_file_bytes: number;
	readonly max_configs: number;
	readonly config_names: readonly string[];
	readonly ignored_directories: readonly string[];
}

export interface ConfigChainTarget {
	readonly input: string;
	readonly path: string;
	readonly exists: boolean | null;
	readonly kind: ConfigChainTargetKind;
}

export interface ConfigChainEdge {
	readonly from_path: string;
	readonly to_path: string | null;
	readonly kind: ConfigChainEdgeKind;
	readonly specifier: string;
	readonly resolved: boolean;
}

export interface ConfigChainEntry {
	readonly path: string;
	readonly kind: ConfigChainKind;
	readonly format: ConfigChainFormat;
	readonly source: 'target' | 'parent' | 'discovered';
	readonly sha256: string | null;
	readonly size_bytes: number | null;
	readonly parseable: boolean;
	readonly dynamic: boolean;
	readonly package_name: string | null;
	readonly workspaces: readonly string[];
	readonly scripts: readonly string[];
	readonly extends: readonly string[];
	readonly references: readonly string[];
	readonly include: readonly string[];
	readonly exclude: readonly string[];
	readonly compiler_options: readonly string[];
	readonly summary: readonly string[];
}

export interface ConfigChainFinding extends ScriptCheckFinding {
	readonly code: ConfigChainFindingCode;
	readonly path: string;
}

export interface ConfigChainReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof CONFIG_CHAIN_PACK_ID;
	readonly script_id: typeof CONFIG_CHAIN_SCRIPT_ID;
	readonly script_ref: typeof CONFIG_CHAIN_SCRIPT_REF;
	readonly action: ConfigChainAction;
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: ConfigChainPolicy;
	readonly input_hash: string;
	readonly targets: readonly ConfigChainTarget[];
	readonly configs: readonly ConfigChainEntry[];
	readonly edges: readonly ConfigChainEdge[];
	readonly findings: readonly ConfigChainFinding[];
	readonly issues: readonly string[];
}

export interface InspectConfigChainOptions {
	readonly paths: readonly string[];
	readonly maxFileBytes?: number;
	readonly maxConfigs?: number;
}

interface ConfigCandidate {
	readonly absolutePath: string;
	readonly relativePath: string;
	readonly source: 'target' | 'parent' | 'discovered';
}

interface JsonParseResult {
	readonly value: unknown;
	readonly error: string | null;
}

interface ConfigCandidateInspection {
	readonly entry: ConfigChainEntry;
	readonly edges: readonly ConfigChainEdge[];
	readonly extraCandidates: readonly ConfigCandidate[];
}

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const DEFAULT_MAX_CONFIGS = 120;
const MAX_ISSUES = 50;
const CONFIG_FILE_NAMES = [
	'package.json',
	'tsconfig.json',
	'tsconfig.base.json',
	'tsconfig.build.json',
	'eslint.config.js',
	'eslint.config.mjs',
	'eslint.config.cjs',
	'eslint.config.ts',
	'.eslintrc',
	'.eslintrc.json',
	'.prettierrc',
	'.prettierrc.json',
	'prettier.config.js',
	'vite.config.js',
	'vite.config.ts',
	'vitest.config.js',
	'vitest.config.ts',
	'tailwind.config.js',
	'tailwind.config.ts',
	'jest.config.js',
	'jest.config.ts',
	'playwright.config.ts',
	'playwright.config.js',
	'astro.config.mjs',
	'svelte.config.js',
	'.mustflow/config/commands.toml',
	'.mustflow/config/mustflow.toml',
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
const ERROR_CODES = new Set<ConfigChainFindingCode>([
	'config_chain_path_outside_root',
	'config_chain_unreadable_path',
	'config_chain_parse_error',
	'config_chain_max_configs_exceeded',
]);

function normalizeRelativePath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/^\.\/+/u, '') || '.';
}

function sha256Tagged(buffer: Buffer | string): string {
	return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function makeFinding(
	code: ConfigChainFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
): ConfigChainFinding {
	return { code, severity, path: pathValue, message };
}

function pushIssue(issues: string[], issue: string): void {
	if (issues.length < MAX_ISSUES) {
		issues.push(issue);
	}
}

function configKindForPath(relativePath: string): ConfigChainKind {
	const name = path.basename(relativePath).toLowerCase();
	if (name === 'package.json') {
		return 'package_json';
	}
	if (/^tsconfig(?:\..*)?\.json$/u.test(name)) {
		return 'tsconfig';
	}
	if (name.includes('eslint')) {
		return 'eslint';
	}
	if (name.includes('prettier') || name === '.prettierrc') {
		return 'prettier';
	}
	if (name.includes('vitest')) {
		return 'vitest';
	}
	if (name.includes('vite')) {
		return 'vite';
	}
	if (name.includes('tailwind')) {
		return 'tailwind';
	}
	if (name.includes('jest')) {
		return 'jest';
	}
	if (name.includes('playwright')) {
		return 'playwright';
	}
	if (relativePath.startsWith('.mustflow/config/')) {
		return 'mustflow';
	}
	return 'other';
}

function configFormatForPath(relativePath: string): ConfigChainFormat {
	const name = path.basename(relativePath).toLowerCase();
	const extension = path.extname(name);
	if (name === '.eslintrc' || name === '.prettierrc') {
		return 'jsonc';
	}
	if (extension === '.json') {
		return name.startsWith('tsconfig') ? 'jsonc' : 'json';
	}
	if (['.js', '.mjs', '.cjs'].includes(extension)) {
		return 'javascript';
	}
	if (['.ts', '.mts', '.cts'].includes(extension)) {
		return 'typescript';
	}
	if (['.yml', '.yaml'].includes(extension)) {
		return 'yaml';
	}
	if (extension === '.toml') {
		return 'toml';
	}
	return 'unknown';
}

function isConfigFile(relativePath: string): boolean {
	const normalized = normalizeRelativePath(relativePath);
	const name = path.basename(normalized);
	return (
		CONFIG_FILE_NAMES.includes(normalized as (typeof CONFIG_FILE_NAMES)[number]) ||
		CONFIG_FILE_NAMES.includes(name as (typeof CONFIG_FILE_NAMES)[number]) ||
		/^tsconfig(?:\..*)?\.json$/u.test(name)
	);
}

function isIgnoredDirectory(relativePath: string): boolean {
	const normalized = normalizeRelativePath(relativePath);
	return IGNORED_DIRECTORIES.some((directory) => normalized === directory || normalized.startsWith(`${directory}/`));
}

function normalizeTargetPath(projectRoot: string, targetPath: string): { readonly absolutePath: string; readonly relativePath: string } {
	const absolutePath = path.resolve(process.cwd(), targetPath);
	ensureInside(projectRoot, absolutePath);
	return {
		absolutePath,
		relativePath: normalizeRelativePath(path.relative(projectRoot, absolutePath)),
	};
}

function targetKind(absolutePath: string): { readonly exists: boolean; readonly kind: ConfigChainTargetKind } {
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
	candidates: Map<string, ConfigCandidate>,
	findings: ConfigChainFinding[],
	issues: string[],
	policy: ConfigChainPolicy,
	candidate: ConfigCandidate,
): void {
	if (candidates.has(candidate.relativePath)) {
		return;
	}
	if (candidates.size >= policy.max_configs) {
		if (!findings.some((finding) => finding.code === 'config_chain_max_configs_exceeded')) {
			const message = `Config-chain matched more than ${policy.max_configs} config files; remaining files were skipped.`;
			pushIssue(issues, message);
			findings.push(makeFinding('config_chain_max_configs_exceeded', 'medium', candidate.relativePath, message));
		}
		return;
	}
	candidates.set(candidate.relativePath, candidate);
}

function collectConfigFilesFromDirectory(
	projectRoot: string,
	absoluteDirectory: string,
	candidates: Map<string, ConfigCandidate>,
	findings: ConfigChainFinding[],
	issues: string[],
	policy: ConfigChainPolicy,
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
		findings.push(makeFinding('config_chain_unreadable_path', 'high', relativeDirectory, message));
		return;
	}

	for (const entry of entries) {
		const absoluteEntry = path.join(absoluteDirectory, entry.name);
		const relativeEntry = normalizeRelativePath(path.relative(projectRoot, absoluteEntry));
		if (entry.isDirectory()) {
			collectConfigFilesFromDirectory(projectRoot, absoluteEntry, candidates, findings, issues, policy);
			continue;
		}
		if (entry.isFile() && isConfigFile(relativeEntry)) {
			addCandidate(candidates, findings, issues, policy, {
				absolutePath: absoluteEntry,
				relativePath: relativeEntry,
				source: 'discovered',
			});
		}
	}
}

function addParentConfigCandidates(
	projectRoot: string,
	targetPath: string,
	targetKindValue: ConfigChainTargetKind,
	candidates: Map<string, ConfigCandidate>,
	findings: ConfigChainFinding[],
	issues: string[],
	policy: ConfigChainPolicy,
): void {
	const startRelativeDirectory = targetKindValue === 'directory' ? targetPath : normalizeRelativePath(path.dirname(targetPath));
	const startAbsoluteDirectory = path.join(projectRoot, ...startRelativeDirectory.split('/').filter((segment) => segment !== '.'));
	let current = path.resolve(startAbsoluteDirectory);

	while (current.startsWith(projectRoot)) {
		for (const name of CONFIG_FILE_NAMES) {
			if (name.includes('/')) {
				continue;
			}
			const absolutePath = path.join(current, name);
			if (!existsSync(absolutePath)) {
				continue;
			}
			const relativePath = normalizeRelativePath(path.relative(projectRoot, absolutePath));
			addCandidate(candidates, findings, issues, policy, { absolutePath, relativePath, source: 'parent' });
		}

		const parent = path.dirname(current);
		if (parent === current || path.relative(projectRoot, parent).startsWith('..')) {
			break;
		}
		current = parent;
	}
}

function stripJsonComments(text: string): string {
	let result = '';
	let inString = false;
	let quote = '';
	let escaped = false;
	let index = 0;

	while (index < text.length) {
		const current = text[index] ?? '';
		const next = text[index + 1] ?? '';
		if (inString) {
			result += current;
			if (escaped) {
				escaped = false;
			} else if (current === '\\') {
				escaped = true;
			} else if (current === quote) {
				inString = false;
			}
			index += 1;
			continue;
		}

		if (current === '"' || current === "'") {
			inString = true;
			quote = current;
			result += current;
			index += 1;
			continue;
		}
		if (current === '/' && next === '/') {
			while (index < text.length && text[index] !== '\n') {
				index += 1;
			}
			continue;
		}
		if (current === '/' && next === '*') {
			index += 2;
			while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
				index += 1;
			}
			index += 2;
			continue;
		}
		result += current;
		index += 1;
	}

	return result.replace(/,\s*([}\]])/gu, '$1');
}

function parseJsonLike(text: string, format: ConfigChainFormat): JsonParseResult {
	if (format !== 'json' && format !== 'jsonc') {
		return { value: null, error: 'Dynamic or non-JSON config files are not executed by config-chain.' };
	}
	try {
		return { value: JSON.parse(stripJsonComments(text)), error: null };
	} catch (error) {
		return { value: null, error: error instanceof Error ? error.message : String(error) };
	}
}

function stringArray(value: unknown): readonly string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((entry): entry is string => typeof entry === 'string');
}

function objectValue(value: unknown, key: string): unknown {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>)[key] : undefined;
}

function objectKeys(value: unknown): readonly string[] {
	return value && typeof value === 'object' && !Array.isArray(value)
		? Object.keys(value as Record<string, unknown>).sort((left, right) => left.localeCompare(right))
		: [];
}

function packageWorkspaces(value: unknown): readonly string[] {
	const raw = objectValue(value, 'workspaces');
	if (Array.isArray(raw)) {
		return stringArray(raw);
	}
	return stringArray(objectValue(raw, 'packages'));
}

function tsconfigReferences(value: unknown): readonly string[] {
	const references = objectValue(value, 'references');
	if (!Array.isArray(references)) {
		return [];
	}
	return references
		.map((entry) => objectValue(entry, 'path'))
		.filter((entry): entry is string => typeof entry === 'string');
}

function resolveRelativeConfig(projectRoot: string, fromRelativePath: string, specifier: string): string | null {
	if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
		return null;
	}

	const fromDirectory = path.dirname(path.join(projectRoot, ...fromRelativePath.split('/')));
	const base = path.resolve(fromDirectory, specifier);
	const candidates = [base, `${base}.json`, path.join(base, 'tsconfig.json')];

	for (const candidate of candidates) {
		try {
			ensureInside(projectRoot, candidate);
			if (existsSync(candidate) && lstatSync(candidate).isFile()) {
				return normalizeRelativePath(path.relative(projectRoot, candidate));
			}
		} catch {
			return null;
		}
	}
	return null;
}

function summarizeConfig(kind: ConfigChainKind, value: unknown): readonly string[] {
	switch (kind) {
		case 'package_json': {
			const scripts = objectKeys(objectValue(value, 'scripts'));
			const workspaces = packageWorkspaces(value);
			return [
				...scripts.slice(0, 6).map((script) => `script:${script}`),
				...workspaces.slice(0, 6).map((workspace) => `workspace:${workspace}`),
			];
		}
		case 'tsconfig': {
			const compilerOptions = objectKeys(objectValue(value, 'compilerOptions'));
			const include = stringArray(objectValue(value, 'include'));
			const exclude = stringArray(objectValue(value, 'exclude'));
			return [
				...compilerOptions.slice(0, 8).map((option) => `compilerOption:${option}`),
				...include.slice(0, 4).map((entry) => `include:${entry}`),
				...exclude.slice(0, 4).map((entry) => `exclude:${entry}`),
			];
		}
		default:
			return objectKeys(value).slice(0, 8).map((key) => `key:${key}`);
	}
}

function inspectConfigCandidate(
	projectRoot: string,
	candidate: ConfigCandidate,
	policy: ConfigChainPolicy,
	findings: ConfigChainFinding[],
	issues: string[],
): ConfigCandidateInspection {
	const kind = configKindForPath(candidate.relativePath);
	const format = configFormatForPath(candidate.relativePath);
	const dynamic = !['json', 'jsonc'].includes(format);
	const edges: ConfigChainEdge[] = [];
	const extraCandidates: ConfigCandidate[] = [];

	let buffer: Buffer | null = null;
	try {
		buffer = readFileInsideWithoutSymlinks(projectRoot, candidate.absolutePath, { maxBytes: policy.max_file_bytes });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushIssue(issues, `${candidate.relativePath}: ${message}`);
		findings.push(makeFinding('config_chain_unreadable_path', 'high', candidate.relativePath, message));
	}

	const text = buffer?.toString('utf8') ?? '';
	const parsed = buffer ? parseJsonLike(text, format) : { value: null, error: 'File could not be read.' };
	const parseable = parsed.error === null;

	if (dynamic && buffer) {
		findings.push(
			makeFinding(
				'config_chain_dynamic_config',
				'low',
				candidate.relativePath,
				`${candidate.relativePath} is ${format}; config-chain records it without executing code.`,
			),
		);
	} else if (!parseable) {
		findings.push(makeFinding('config_chain_parse_error', 'high', candidate.relativePath, parsed.error ?? 'Parse failed.'));
	}

	const value = parseable ? parsed.value : null;
	const extendsValue = typeof objectValue(value, 'extends') === 'string' ? String(objectValue(value, 'extends')) : null;
	const references = tsconfigReferences(value);

	if (extendsValue) {
		const resolved = resolveRelativeConfig(projectRoot, candidate.relativePath, extendsValue);
		edges.push({
			from_path: candidate.relativePath,
			to_path: resolved,
			kind: 'extends',
			specifier: extendsValue,
			resolved: resolved !== null,
		});
		if (resolved) {
			extraCandidates.push({
				absolutePath: path.join(projectRoot, ...resolved.split('/')),
				relativePath: resolved,
				source: 'discovered',
			});
		} else {
			findings.push(
				makeFinding(
					'config_chain_external_reference',
					'low',
					candidate.relativePath,
					`${candidate.relativePath} extends external config ${extendsValue}.`,
				),
			);
		}
	}

	for (const reference of references) {
		const resolved = resolveRelativeConfig(projectRoot, candidate.relativePath, reference);
		edges.push({
			from_path: candidate.relativePath,
			to_path: resolved,
			kind: 'reference',
			specifier: reference,
			resolved: resolved !== null,
		});
		if (resolved) {
			extraCandidates.push({
				absolutePath: path.join(projectRoot, ...resolved.split('/')),
				relativePath: resolved,
				source: 'discovered',
			});
		} else {
			findings.push(
				makeFinding(
					'config_chain_missing_reference',
					'medium',
					candidate.relativePath,
					`${candidate.relativePath} references ${reference}, but config-chain could not resolve it inside the root.`,
				),
			);
		}
	}

	for (const workspace of packageWorkspaces(value)) {
		edges.push({
			from_path: candidate.relativePath,
			to_path: null,
			kind: 'workspace',
			specifier: workspace,
			resolved: false,
		});
	}

	return {
		entry: {
			path: candidate.relativePath,
			kind,
			format,
			source: candidate.source,
			sha256: buffer ? sha256Tagged(buffer) : null,
			size_bytes: buffer?.byteLength ?? null,
			parseable,
			dynamic,
			package_name: typeof objectValue(value, 'name') === 'string' ? String(objectValue(value, 'name')) : null,
			workspaces: packageWorkspaces(value),
			scripts: objectKeys(objectValue(value, 'scripts')),
			extends: extendsValue ? [extendsValue] : [],
			references,
			include: stringArray(objectValue(value, 'include')),
			exclude: stringArray(objectValue(value, 'exclude')),
			compiler_options: objectKeys(objectValue(value, 'compilerOptions')),
			summary: summarizeConfig(kind, value),
		},
		edges,
		extraCandidates,
	};
}

function configChainStatus(findings: readonly ConfigChainFinding[]): ScriptCheckStatus {
	if (findings.some((finding) => ERROR_CODES.has(finding.code))) {
		return 'error';
	}
	if (findings.some((finding) => ['medium', 'high', 'critical'].includes(finding.severity))) {
		return 'failed';
	}
	return 'passed';
}

function createInputHash(
	policy: ConfigChainPolicy,
	targets: readonly ConfigChainTarget[],
	configs: readonly ConfigChainEntry[],
	edges: readonly ConfigChainEdge[],
	findings: readonly ConfigChainFinding[],
): string {
	return sha256Tagged(
		JSON.stringify({
			policy,
			targets,
			configs: configs.map((config) => ({
				path: config.path,
				sha256: config.sha256,
				kind: config.kind,
				format: config.format,
				parseable: config.parseable,
			})),
			edges,
			findings: findings.map((finding) => ({ code: finding.code, path: finding.path })),
		}),
	);
}

export function inspectConfigChain(projectRoot: string, options: InspectConfigChainOptions): ConfigChainReport {
	const root = path.resolve(projectRoot);
	const policy: ConfigChainPolicy = {
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		max_configs: options.maxConfigs ?? DEFAULT_MAX_CONFIGS,
		config_names: [...CONFIG_FILE_NAMES],
		ignored_directories: [...IGNORED_DIRECTORIES],
	};
	const targets: ConfigChainTarget[] = [];
	const candidates = new Map<string, ConfigCandidate>();
	const configs: ConfigChainEntry[] = [];
	const edges: ConfigChainEdge[] = [];
	const findings: ConfigChainFinding[] = [];
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
			targets.push({ input: targetPath, path: targetPath, exists: null, kind: 'unknown' });
			findings.push(makeFinding('config_chain_path_outside_root', 'high', targetPath, message));
			continue;
		}

		let existence;
		try {
			existence = targetKind(absolutePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushIssue(issues, `${relativePath}: ${message}`);
			targets.push({ input: targetPath, path: relativePath, exists: null, kind: 'unknown' });
			findings.push(makeFinding('config_chain_unreadable_path', 'high', relativePath, message));
			continue;
		}

		targets.push({ input: targetPath, path: relativePath, exists: existence.exists, kind: existence.kind });
		if (existence.kind === 'file' && isConfigFile(relativePath)) {
			addCandidate(candidates, findings, issues, policy, { absolutePath, relativePath, source: 'target' });
		}
		if (existence.kind === 'directory') {
			collectConfigFilesFromDirectory(root, absolutePath, candidates, findings, issues, policy);
		}
		if (existence.kind === 'file' || existence.kind === 'directory') {
			addParentConfigCandidates(root, relativePath, existence.kind, candidates, findings, issues, policy);
		}
	}

	let cursor = 0;
	while (cursor < candidates.size) {
		const candidate = [...candidates.values()][cursor];
		cursor += 1;
		if (!candidate) {
			continue;
		}
		const result = inspectConfigCandidate(root, candidate, policy, findings, issues);
		configs.push(result.entry);
		edges.push(...result.edges);
		for (const extraCandidate of result.extraCandidates) {
			addCandidate(candidates, findings, issues, policy, extraCandidate);
		}
	}

	for (const target of targets) {
		for (const config of configs) {
			if (target.kind !== 'file' && target.kind !== 'directory') {
				continue;
			}
			const targetDirectory = target.kind === 'directory' ? target.path : normalizeRelativePath(path.dirname(target.path));
			const configDirectory = normalizeRelativePath(path.dirname(config.path));
			if (targetDirectory === configDirectory || targetDirectory.startsWith(`${configDirectory}/`) || configDirectory === '.') {
				edges.push({
					from_path: target.path,
					to_path: config.path,
					kind: 'parent_config',
					specifier: config.path,
					resolved: true,
				});
			}
		}
	}

	const sortedConfigs = configs.sort((left, right) => left.path.localeCompare(right.path));
	const sortedEdges = edges.sort((left, right) =>
		left.from_path.localeCompare(right.from_path) ||
		left.kind.localeCompare(right.kind) ||
		(left.to_path ?? '').localeCompare(right.to_path ?? '') ||
		left.specifier.localeCompare(right.specifier),
	);
	const status = configChainStatus(findings);

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: CONFIG_CHAIN_PACK_ID,
		script_id: CONFIG_CHAIN_SCRIPT_ID,
		script_ref: CONFIG_CHAIN_SCRIPT_REF,
		action: 'inspect',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createInputHash(policy, targets, sortedConfigs, sortedEdges, findings),
		targets,
		configs: sortedConfigs,
		edges: sortedEdges,
		findings,
		issues,
	};
}
