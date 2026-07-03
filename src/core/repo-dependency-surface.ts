import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { isRecord } from './config-loading.js';
import type { ScriptCheckFinding, ScriptCheckStatus } from './script-check-result.js';

export const REPO_DEPENDENCY_SURFACE_PACK_ID = 'repo';
export const REPO_DEPENDENCY_SURFACE_SCRIPT_ID = 'dependency-surface';
export const REPO_DEPENDENCY_SURFACE_SCRIPT_REF =
	`${REPO_DEPENDENCY_SURFACE_PACK_ID}/${REPO_DEPENDENCY_SURFACE_SCRIPT_ID}`;

export type RepoDependencyEcosystem = 'go' | 'javascript' | 'python' | 'rust';
export type RepoDependencySurfaceKind =
	| 'audit_config'
	| 'dependency_update_config'
	| 'lockfile'
	| 'manifest'
	| 'package_manager_config'
	| 'workspace_config';

export type RepoDependencyFindingCode =
	| 'conflicting_javascript_lockfiles'
	| 'manifest_without_lockfile'
	| 'update_automation_without_policy'
	| 'lockfile_without_manifest'
	| 'dependency_surface_without_update_automation';

export interface RepoDependencySurfaceInput {
	readonly scanned_paths: readonly string[];
	readonly max_file_bytes: number;
}

export interface RepoDependencySurfaceEntry {
	readonly id: string;
	readonly ecosystem: RepoDependencyEcosystem;
	readonly kind: RepoDependencySurfaceKind;
	readonly path: string;
	readonly line: number | null;
	readonly name: string;
	readonly evidence: string;
}

export interface RepoDependencySummary {
	readonly surface_count: number;
	readonly manifest_count: number;
	readonly lockfile_count: number;
	readonly update_config_count: number;
	readonly audit_config_count: number;
	readonly ecosystem_count: number;
	readonly finding_count: number;
}

export interface RepoDependencyFinding extends ScriptCheckFinding {
	readonly code: RepoDependencyFindingCode;
	readonly path: string;
}

export interface RepoDependencySurfaceReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof REPO_DEPENDENCY_SURFACE_PACK_ID;
	readonly script_id: typeof REPO_DEPENDENCY_SURFACE_SCRIPT_ID;
	readonly script_ref: typeof REPO_DEPENDENCY_SURFACE_SCRIPT_REF;
	readonly action: 'inspect';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly input: RepoDependencySurfaceInput;
	readonly input_hash: string;
	readonly summary: RepoDependencySummary;
	readonly surfaces: readonly RepoDependencySurfaceEntry[];
	readonly findings: readonly RepoDependencyFinding[];
	readonly issues: readonly string[];
}

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const JAVASCRIPT_LOCKFILES = ['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb'];
const CANDIDATE_PATHS = [
	'package.json',
	'pnpm-workspace.yaml',
	'.npmrc',
	'pyproject.toml',
	'requirements.txt',
	'uv.lock',
	'poetry.lock',
	'Pipfile.lock',
	'go.mod',
	'go.sum',
	'Cargo.toml',
	'Cargo.lock',
	'deny.toml',
	'renovate.json',
	'.github/dependabot.yml',
	'.github/dependabot.yaml',
	'.github/workflows',
	...JAVASCRIPT_LOCKFILES,
];

function sha256(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function normalizeRelativePath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/^\.\/+/u, '');
}

function lineForOffset(content: string, offset: number): number {
	let line = 1;
	for (let index = 0; index < offset; index += 1) {
		if (content.charCodeAt(index) === 10) line += 1;
	}
	return line;
}

function safeReadText(root: string, relativePath: string, scannedPaths: Set<string>, issues: string[]): string | null {
	const normalized = normalizeRelativePath(relativePath);
	scannedPaths.add(normalized);
	const absolute = path.join(root, ...normalized.split('/'));
	try {
		const stats = statSync(absolute);
		if (!stats.isFile()) return null;
		if (stats.size > DEFAULT_MAX_FILE_BYTES) {
			issues.push(`${normalized} exceeds max_file_bytes (${stats.size} > ${DEFAULT_MAX_FILE_BYTES}).`);
			return null;
		}
		return readFileSync(absolute, 'utf8');
	} catch (error) {
		if (!existsSync(absolute)) return null;
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not read ${normalized}: ${message}`);
		return null;
	}
}

function uniqueStrings<T extends string>(values: Iterable<T>): readonly T[] {
	return [...new Set([...values].filter((value) => value.trim().length > 0))].sort((left, right) =>
		left.localeCompare(right),
	);
}

function addSurface(
	surfaces: RepoDependencySurfaceEntry[],
	ecosystem: RepoDependencyEcosystem,
	kind: RepoDependencySurfaceKind,
	pathValue: string,
	name: string,
	evidence: string,
	line: number | null = null,
): void {
	surfaces.push({
		id: `${ecosystem}:${kind}:${pathValue}:${name}`,
		ecosystem,
		kind,
		path: pathValue,
		line,
		name,
		evidence,
	});
}

function scanStaticFiles(root: string, scannedPaths: Set<string>, surfaces: RepoDependencySurfaceEntry[], issues: string[]): void {
	for (const candidate of CANDIDATE_PATHS) {
		if (candidate === '.github/workflows') {
			continue;
		}
		const absolute = path.join(root, ...candidate.split('/'));
		scannedPaths.add(candidate);
		if (!existsSync(absolute)) {
			continue;
		}
		const ecosystem: RepoDependencyEcosystem | null = candidate.includes('package') || candidate.includes('pnpm') || candidate.includes('yarn') || candidate.includes('bun') || candidate === '.npmrc'
			? 'javascript'
			: candidate.includes('pyproject') || candidate.includes('requirements') || candidate.includes('uv.lock') || candidate.includes('poetry') || candidate.includes('Pipfile')
				? 'python'
				: candidate.startsWith('go.')
					? 'go'
					: candidate.includes('Cargo') || candidate === 'deny.toml'
						? 'rust'
						: null;
		if (ecosystem === null) {
			const updateKind = candidate.includes('dependabot') || candidate.includes('renovate') ? 'dependency_update_config' : 'audit_config';
			addSurface(surfaces, 'javascript', updateKind, candidate, path.basename(candidate), candidate);
			continue;
		}
		const kind: RepoDependencySurfaceKind = JAVASCRIPT_LOCKFILES.includes(candidate) || /(?:\.lock|go\.sum)$/u.test(candidate)
			? 'lockfile'
			: candidate.includes('workspace')
				? 'workspace_config'
				: candidate === '.npmrc'
					? 'package_manager_config'
					: candidate === 'deny.toml'
						? 'audit_config'
						: 'manifest';
		addSurface(surfaces, ecosystem, kind, candidate, path.basename(candidate), candidate);
		if (candidate === 'package.json') {
			const content = safeReadText(root, candidate, scannedPaths, issues);
			if (content === null) continue;
			try {
				const parsed = JSON.parse(content);
				if (isRecord(parsed) && typeof parsed.packageManager === 'string') {
					addSurface(surfaces, 'javascript', 'package_manager_config', candidate, 'packageManager', parsed.packageManager, null);
				}
			} catch {
				issues.push('Could not parse package.json while inspecting dependency surface.');
			}
		}
	}
}

function scanWorkflowDependencyAutomation(root: string, scannedPaths: Set<string>, surfaces: RepoDependencySurfaceEntry[], issues: string[]): void {
	const workflowRoot = path.join(root, '.github', 'workflows');
	scannedPaths.add('.github/workflows');
	if (!existsSync(workflowRoot)) {
		return;
	}
	let names: readonly string[] = [];
	try {
		names = readdirSync(workflowRoot).filter((name) => /\.(?:yml|yaml)$/u.test(name));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not list .github/workflows: ${message}`);
		return;
	}
	for (const name of names) {
		const relativePath = `.github/workflows/${name}`;
		const content = safeReadText(root, relativePath, scannedPaths, issues);
		if (content === null) continue;
		for (const [patternName, pattern] of [
			['npm audit', /\bnpm\s+audit\b/u],
			['pnpm audit', /\bpnpm\s+audit\b/u],
			['bun audit', /\bbun\s+audit\b/u],
			['pip-audit', /\bpip-audit\b/u],
			['govulncheck', /\bgovulncheck\b/u],
			['cargo audit', /\bcargo\s+audit\b/u],
			['osv-scanner', /\bosv-scanner\b/u],
			['trivy', /\btrivy\b/u],
			['syft', /\bsyft\b/u],
		] as const) {
			const match = pattern.exec(content);
			if (!match || match.index < 0) continue;
			const ecosystem: RepoDependencyEcosystem = patternName.includes('cargo') ? 'rust' : patternName.includes('go') ? 'go' : patternName.includes('pip') ? 'python' : 'javascript';
			addSurface(surfaces, ecosystem, 'audit_config', relativePath, patternName, match[0], lineForOffset(content, match.index));
		}
	}
}

function createFindings(surfaces: readonly RepoDependencySurfaceEntry[]): readonly RepoDependencyFinding[] {
	const findings: RepoDependencyFinding[] = [];
	const jsLockfiles = surfaces.filter((surface) => surface.ecosystem === 'javascript' && surface.kind === 'lockfile');
	if (jsLockfiles.length > 1) {
		findings.push({
			code: 'conflicting_javascript_lockfiles',
			severity: 'high',
			path: jsLockfiles[0]?.path ?? 'package.json',
			message: 'Multiple JavaScript lockfiles were detected.',
			json_pointer: null,
			metric: 'javascript_lockfile_count',
			actual: jsLockfiles.length,
			expected: 1,
		});
	}
	for (const ecosystem of uniqueStrings(surfaces.map((surface) => surface.ecosystem))) {
		const manifests = surfaces.filter((surface) => surface.ecosystem === ecosystem && surface.kind === 'manifest');
		const lockfiles = surfaces.filter((surface) => surface.ecosystem === ecosystem && surface.kind === 'lockfile');
		if (manifests.length > 0 && lockfiles.length === 0 && ecosystem !== 'go') {
			findings.push({
				code: 'manifest_without_lockfile',
				severity: 'medium',
				path: manifests[0]?.path ?? '',
				message: `${ecosystem} dependency manifest was detected without a lockfile.`,
				json_pointer: null,
				metric: `${ecosystem}_lockfile_count`,
				actual: 0,
				expected: 1,
			});
		}
		if (lockfiles.length > 0 && manifests.length === 0) {
			findings.push({
				code: 'lockfile_without_manifest',
				severity: 'medium',
				path: lockfiles[0]?.path ?? '',
				message: `${ecosystem} lockfile was detected without a matching manifest.`,
				json_pointer: null,
				metric: `${ecosystem}_manifest_count`,
				actual: 0,
				expected: 1,
			});
		}
	}
	const updateConfigs = surfaces.filter((surface) => surface.kind === 'dependency_update_config');
	const auditConfigs = surfaces.filter((surface) => surface.kind === 'audit_config');
	if (updateConfigs.length > 0 && auditConfigs.length === 0) {
		findings.push({
			code: 'update_automation_without_policy',
			severity: 'medium',
			path: updateConfigs[0]?.path ?? '.github/dependabot.yml',
			message: 'Dependency update automation was detected without an audit, license, SBOM, or policy surface.',
			json_pointer: null,
			metric: 'audit_config_count',
			actual: 0,
			expected: 1,
		});
	}
	if (surfaces.some((surface) => surface.kind === 'manifest' || surface.kind === 'lockfile') && updateConfigs.length === 0) {
		findings.push({
			code: 'dependency_surface_without_update_automation',
			severity: 'low',
			path: surfaces.find((surface) => surface.kind === 'manifest' || surface.kind === 'lockfile')?.path ?? 'package.json',
			message: 'Dependency surfaces were detected without Dependabot or Renovate configuration.',
			json_pointer: null,
			metric: 'dependency_update_config_count',
			actual: 0,
			expected: 1,
		});
	}
	return findings;
}

function createSummary(
	surfaces: readonly RepoDependencySurfaceEntry[],
	findings: readonly RepoDependencyFinding[],
): RepoDependencySummary {
	return {
		surface_count: surfaces.length,
		manifest_count: surfaces.filter((surface) => surface.kind === 'manifest').length,
		lockfile_count: surfaces.filter((surface) => surface.kind === 'lockfile').length,
		update_config_count: surfaces.filter((surface) => surface.kind === 'dependency_update_config').length,
		audit_config_count: surfaces.filter((surface) => surface.kind === 'audit_config').length,
		ecosystem_count: uniqueStrings(surfaces.map((surface) => surface.ecosystem)).length,
		finding_count: findings.length,
	};
}

export function inspectRepoDependencySurface(projectRoot: string): RepoDependencySurfaceReport {
	const root = path.resolve(projectRoot);
	const scannedPaths = new Set<string>(CANDIDATE_PATHS);
	const issues: string[] = [];
	const surfaces: RepoDependencySurfaceEntry[] = [];

	scanStaticFiles(root, scannedPaths, surfaces, issues);
	scanWorkflowDependencyAutomation(root, scannedPaths, surfaces, issues);

	const sortedSurfaces = surfaces.sort((left, right) => left.path.localeCompare(right.path) || left.name.localeCompare(right.name));
	const findings = createFindings(sortedSurfaces);
	const summary = createSummary(sortedSurfaces, findings);
	const status: ScriptCheckStatus = issues.length > 0 ? 'error' : findings.some((finding) => finding.severity === 'high') ? 'failed' : 'passed';

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: REPO_DEPENDENCY_SURFACE_PACK_ID,
		script_id: REPO_DEPENDENCY_SURFACE_SCRIPT_ID,
		script_ref: REPO_DEPENDENCY_SURFACE_SCRIPT_REF,
		action: 'inspect',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		input: {
			scanned_paths: uniqueStrings(scannedPaths),
			max_file_bytes: DEFAULT_MAX_FILE_BYTES,
		},
		input_hash: sha256(JSON.stringify({ summary, surfaces: sortedSurfaces, findings, issues })),
		summary,
		surfaces: sortedSurfaces,
		findings,
		issues,
	};
}
