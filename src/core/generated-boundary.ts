import { createHash } from 'node:crypto';
import { existsSync, lstatSync } from 'node:fs';
import path from 'node:path';

import { isRecord, readMustflowConfigIfExists, readStringArray, type TomlTable } from './config-loading.js';
import {
	type ScriptCheckFinding,
	type ScriptCheckFindingSeverity,
	type ScriptCheckStatus,
} from './script-check-result.js';
import { ensureInside } from './safe-filesystem.js';

export const GENERATED_BOUNDARY_PACK_ID = 'repo';
export const GENERATED_BOUNDARY_SCRIPT_ID = 'generated-boundary';
export const GENERATED_BOUNDARY_SCRIPT_REF = `${GENERATED_BOUNDARY_PACK_ID}/${GENERATED_BOUNDARY_SCRIPT_ID}`;

export type GeneratedBoundaryCategory =
	| 'generated'
	| 'ignored'
	| 'protected'
	| 'vendor'
	| 'cache'
	| 'outside_root';

export type GeneratedBoundaryFindingCode =
	| 'generated_boundary_generated_path'
	| 'generated_boundary_ignored_path'
	| 'generated_boundary_protected_path'
	| 'generated_boundary_vendor_path'
	| 'generated_boundary_cache_path'
	| 'generated_boundary_path_outside_root'
	| 'generated_boundary_unreadable_path';

export type GeneratedBoundaryTargetKind = 'file' | 'directory' | 'missing' | 'other' | 'unknown';
export type GeneratedBoundaryPatternSource = 'mustflow_config' | 'builtin';

export interface GeneratedBoundaryPatternMatch {
	readonly category: GeneratedBoundaryCategory;
	readonly pattern: string;
	readonly source: GeneratedBoundaryPatternSource;
}

export interface GeneratedBoundaryPolicy {
	readonly config_path: '.mustflow/config/mustflow.toml';
	readonly config_loaded: boolean;
	readonly generated_patterns: readonly string[];
	readonly ignored_patterns: readonly string[];
	readonly protected_patterns: readonly string[];
	readonly builtin_generated_patterns: readonly string[];
	readonly builtin_vendor_patterns: readonly string[];
	readonly builtin_cache_patterns: readonly string[];
	readonly builtin_protected_patterns: readonly string[];
}

export interface GeneratedBoundaryTarget {
	readonly input: string;
	readonly path: string;
	readonly exists: boolean | null;
	readonly kind: GeneratedBoundaryTargetKind;
	readonly matched_boundaries: readonly GeneratedBoundaryCategory[];
	readonly matched_patterns: readonly GeneratedBoundaryPatternMatch[];
}

export interface GeneratedBoundaryFinding extends ScriptCheckFinding {
	readonly code: GeneratedBoundaryFindingCode;
	readonly path: string;
	readonly boundary: GeneratedBoundaryCategory;
	readonly pattern: string | null;
	readonly source: GeneratedBoundaryPatternSource | null;
}

export interface GeneratedBoundaryReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof GENERATED_BOUNDARY_PACK_ID;
	readonly script_id: typeof GENERATED_BOUNDARY_SCRIPT_ID;
	readonly script_ref: typeof GENERATED_BOUNDARY_SCRIPT_REF;
	readonly action: 'check';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: GeneratedBoundaryPolicy;
	readonly input_hash: string;
	readonly targets: readonly GeneratedBoundaryTarget[];
	readonly findings: readonly GeneratedBoundaryFinding[];
	readonly issues: readonly string[];
}

export interface InspectGeneratedBoundaryOptions {
	readonly paths: readonly string[];
}

interface BoundaryPattern {
	readonly category: GeneratedBoundaryCategory;
	readonly pattern: string;
	readonly source: GeneratedBoundaryPatternSource;
}

const BUILTIN_GENERATED_PATTERNS = [
	'REPO_MAP.md',
	'.mustflow/config/manifest.lock.toml',
	'.mustflow/state/**',
	'.mustflow/cache/**',
	'dist/**',
	'build/**',
	'coverage/**',
	'.next/**',
	'.turbo/**',
] as const;

const BUILTIN_VENDOR_PATTERNS = ['node_modules/**', 'vendor/**', 'third_party/**'] as const;
const BUILTIN_CACHE_PATTERNS = ['.cache/**', '.parcel-cache/**', '.pytest_cache/**'] as const;
const BUILTIN_PROTECTED_PATTERNS = ['.git/**', '**/*.pem', '**/*.key', '**/.env'] as const;

const CATEGORY_FINDING: Record<
	GeneratedBoundaryCategory,
	{ readonly code: GeneratedBoundaryFindingCode; readonly severity: ScriptCheckFindingSeverity }
> = {
	generated: { code: 'generated_boundary_generated_path', severity: 'medium' },
	ignored: { code: 'generated_boundary_ignored_path', severity: 'medium' },
	protected: { code: 'generated_boundary_protected_path', severity: 'critical' },
	vendor: { code: 'generated_boundary_vendor_path', severity: 'high' },
	cache: { code: 'generated_boundary_cache_path', severity: 'medium' },
	outside_root: { code: 'generated_boundary_path_outside_root', severity: 'high' },
};

function toPosixPath(value: string): string {
	return value.replace(/\\/gu, '/');
}

function normalizeRelativePath(value: string): string {
	return toPosixPath(value).replace(/^\.\/+/u, '').replace(/\/+$/u, '') || '.';
}

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function escapeRegExp(value: string): string {
	return value.replace(/[\\^$+?.()|[\]{}]/gu, '\\$&');
}

function globToRegExp(pattern: string): RegExp {
	const normalized = normalizeRelativePath(pattern).replace(/^\/+/u, '');
	let source = '^';

	for (let index = 0; index < normalized.length; ) {
		if (normalized.startsWith('**', index)) {
			source += '.*';
			index += 2;
			continue;
		}

		const character = normalized[index];
		if (character === '*') {
			source += '[^/]*';
			index += 1;
			continue;
		}

		if (character === '?') {
			source += '[^/]';
			index += 1;
			continue;
		}

		source += escapeRegExp(character ?? '');
		index += 1;
	}

	return new RegExp(`${source}$`, 'u');
}

function patternMatches(pattern: string, relativePath: string): boolean {
	const normalizedPattern = normalizeRelativePath(pattern);
	const normalizedPath = normalizeRelativePath(relativePath);

	if (normalizedPattern.endsWith('/**')) {
		const base = normalizedPattern.slice(0, -3);
		if (normalizedPath === base || normalizedPath.startsWith(`${base}/`)) {
			return true;
		}
	}

	if (globToRegExp(normalizedPattern).test(normalizedPath)) {
		return true;
	}

	return normalizedPattern.startsWith('**/') && globToRegExp(normalizedPattern.slice(3)).test(normalizedPath);
}

function readPatternTable(config: TomlTable | undefined, tableName: string, key: string): readonly string[] {
	const table = config?.[tableName];
	return isRecord(table) ? (readStringArray(table, key) ?? []) : [];
}

function createPolicy(projectRoot: string, issues: string[]): GeneratedBoundaryPolicy {
	let config: TomlTable | undefined;
	try {
		config = readMustflowConfigIfExists(projectRoot);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not read .mustflow/config/mustflow.toml: ${message}`);
	}

	return {
		config_path: '.mustflow/config/mustflow.toml',
		config_loaded: config !== undefined,
		generated_patterns: readPatternTable(config, 'document_roots', 'generated'),
		ignored_patterns: readPatternTable(config, 'document_roots', 'ignored'),
		protected_patterns: readPatternTable(config, 'edit_policy', 'protected'),
		builtin_generated_patterns: [...BUILTIN_GENERATED_PATTERNS],
		builtin_vendor_patterns: [...BUILTIN_VENDOR_PATTERNS],
		builtin_cache_patterns: [...BUILTIN_CACHE_PATTERNS],
		builtin_protected_patterns: [...BUILTIN_PROTECTED_PATTERNS],
	};
}

function createBoundaryPatterns(policy: GeneratedBoundaryPolicy): readonly BoundaryPattern[] {
	return [
		...policy.generated_patterns.map((pattern) => ({ category: 'generated' as const, pattern, source: 'mustflow_config' as const })),
		...policy.ignored_patterns.map((pattern) => ({ category: 'ignored' as const, pattern, source: 'mustflow_config' as const })),
		...policy.protected_patterns.map((pattern) => ({ category: 'protected' as const, pattern, source: 'mustflow_config' as const })),
		...policy.builtin_generated_patterns.map((pattern) => ({ category: 'generated' as const, pattern, source: 'builtin' as const })),
		...policy.builtin_vendor_patterns.map((pattern) => ({ category: 'vendor' as const, pattern, source: 'builtin' as const })),
		...policy.builtin_cache_patterns.map((pattern) => ({ category: 'cache' as const, pattern, source: 'builtin' as const })),
		...policy.builtin_protected_patterns.map((pattern) => ({ category: 'protected' as const, pattern, source: 'builtin' as const })),
	];
}

function targetKind(absolutePath: string): { readonly exists: boolean; readonly kind: GeneratedBoundaryTargetKind } {
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

function makeFinding(
	code: GeneratedBoundaryFindingCode,
	severity: ScriptCheckFindingSeverity,
	targetPath: string,
	boundary: GeneratedBoundaryCategory,
	message: string,
	pattern: string | null,
	source: GeneratedBoundaryPatternSource | null,
): GeneratedBoundaryFinding {
	return { code, severity, message, path: targetPath, boundary, pattern, source };
}

function createInputHash(
	policy: GeneratedBoundaryPolicy,
	targets: readonly GeneratedBoundaryTarget[],
	issues: readonly string[],
): string {
	const inputState = {
		policy,
		targets: targets.map((target) => ({
			input: target.input,
			path: target.path,
			exists: target.exists,
			kind: target.kind,
			matched_patterns: target.matched_patterns,
		})),
		issues,
	};

	return `sha256:${createHash('sha256').update(JSON.stringify(inputState)).digest('hex')}`;
}

export function inspectGeneratedBoundary(
	projectRoot: string,
	options: InspectGeneratedBoundaryOptions,
): GeneratedBoundaryReport {
	const root = path.resolve(projectRoot);
	const issues: string[] = [];
	const policy = createPolicy(root, issues);
	const patterns = createBoundaryPatterns(policy);
	const targets: GeneratedBoundaryTarget[] = [];
	const findings: GeneratedBoundaryFinding[] = [];

	for (const targetPath of options.paths) {
		let relativePath = targetPath;
		let absolutePath: string;

		try {
			absolutePath = path.resolve(process.cwd(), targetPath);
			ensureInside(root, absolutePath);
			relativePath = normalizeRelativePath(path.relative(root, absolutePath));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(message);
			targets.push({
				input: targetPath,
				path: targetPath,
				exists: null,
				kind: 'unknown',
				matched_boundaries: ['outside_root'],
				matched_patterns: [],
			});
			findings.push(
				makeFinding(
					'generated_boundary_path_outside_root',
					'high',
					targetPath,
					'outside_root',
					message,
					null,
					null,
				),
			);
			continue;
		}

		let existence: { readonly exists: boolean; readonly kind: GeneratedBoundaryTargetKind };
		try {
			existence = targetKind(absolutePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(`${relativePath}: ${message}`);
			targets.push({
				input: targetPath,
				path: relativePath,
				exists: null,
				kind: 'unknown',
				matched_boundaries: [],
				matched_patterns: [],
			});
			findings.push(
				makeFinding('generated_boundary_unreadable_path', 'high', relativePath, 'protected', message, null, null),
			);
			continue;
		}

		const matchedPatterns = patterns.filter((candidate) => patternMatches(candidate.pattern, relativePath));
		const matchedBoundaries = uniqueSorted(matchedPatterns.map((candidate) => candidate.category)) as GeneratedBoundaryCategory[];
		targets.push({
			input: targetPath,
			path: relativePath,
			exists: existence.exists,
			kind: existence.kind,
			matched_boundaries: matchedBoundaries,
			matched_patterns: matchedPatterns,
		});

		for (const match of matchedPatterns) {
			const finding = CATEGORY_FINDING[match.category];
			findings.push(
				makeFinding(
					finding.code,
					finding.severity,
					relativePath,
					match.category,
					`${relativePath} matches ${match.category} boundary pattern ${match.pattern}.`,
					match.pattern,
					match.source,
				),
			);
		}
	}

	const status: ScriptCheckStatus = findings.some((finding) =>
		['generated_boundary_path_outside_root', 'generated_boundary_unreadable_path'].includes(finding.code),
	)
		? 'error'
		: findings.length > 0 || issues.length > 0
			? 'failed'
			: 'passed';

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: GENERATED_BOUNDARY_PACK_ID,
		script_id: GENERATED_BOUNDARY_SCRIPT_ID,
		script_ref: GENERATED_BOUNDARY_SCRIPT_REF,
		action: 'check',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createInputHash(policy, targets, issues),
		targets,
		findings,
		issues,
	};
}
