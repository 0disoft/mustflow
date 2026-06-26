import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import type { ScriptCheckFinding, ScriptCheckStatus } from './script-check-result.js';

export const REPO_DEPLOY_SURFACE_PACK_ID = 'repo';
export const REPO_DEPLOY_SURFACE_SCRIPT_ID = 'deploy-surface';
export const REPO_DEPLOY_SURFACE_SCRIPT_REF = `${REPO_DEPLOY_SURFACE_PACK_ID}/${REPO_DEPLOY_SURFACE_SCRIPT_ID}`;

export type RepoDeploySurfaceType =
	| 'cloudflare'
	| 'container'
	| 'generic_deploy'
	| 'github_pages'
	| 'github_release'
	| 'netlify'
	| 'npm_publish'
	| 'package_release'
	| 'vercel';

export type RepoDeploySurfaceKind =
	| 'deploy_config'
	| 'github_actions_workflow'
	| 'package_metadata'
	| 'package_script';

export type RepoDeploySurfaceConfidence = 'low' | 'medium' | 'high';

export type RepoDeploySurfaceFindingCode = 'deploy_surface_detected';

export interface RepoDeploySurfaceInput {
	readonly scanned_paths: readonly string[];
	readonly max_file_bytes: number;
}

export interface RepoDeploySurfaceSummary {
	readonly has_deploy_surface: boolean;
	readonly surface_count: number;
	readonly workflow_count: number;
	readonly package_script_count: number;
	readonly config_file_count: number;
	readonly package_metadata_count: number;
	readonly manual_gate_count: number;
	readonly required_verification_count: number;
}

export interface RepoDeploySurfaceEvidence {
	readonly path: string;
	readonly line: number | null;
	readonly match: string;
}

export interface RepoDeploySurface {
	readonly id: string;
	readonly kind: RepoDeploySurfaceKind;
	readonly surface_type: RepoDeploySurfaceType;
	readonly path: string;
	readonly line: number | null;
	readonly trigger: string | null;
	readonly confidence: RepoDeploySurfaceConfidence;
	readonly evidence: RepoDeploySurfaceEvidence;
	readonly required_verification: readonly string[];
	readonly manual_gates: readonly string[];
}

export interface RepoDeploySurfaceFinding extends ScriptCheckFinding {
	readonly code: RepoDeploySurfaceFindingCode;
	readonly path: string;
}

export interface RepoDeploySurfaceReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof REPO_DEPLOY_SURFACE_PACK_ID;
	readonly script_id: typeof REPO_DEPLOY_SURFACE_SCRIPT_ID;
	readonly script_ref: typeof REPO_DEPLOY_SURFACE_SCRIPT_REF;
	readonly action: 'inspect';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly input: RepoDeploySurfaceInput;
	readonly input_hash: string;
	readonly has_deploy_surface: boolean;
	readonly summary: RepoDeploySurfaceSummary;
	readonly surfaces: readonly RepoDeploySurface[];
	readonly required_verification: readonly string[];
	readonly manual_gates: readonly string[];
	readonly findings: readonly RepoDeploySurfaceFinding[];
	readonly issues: readonly string[];
}

interface SurfaceSeed {
	readonly kind: RepoDeploySurfaceKind;
	readonly surfaceType: RepoDeploySurfaceType;
	readonly path: string;
	readonly line: number | null;
	readonly trigger: string | null;
	readonly confidence: RepoDeploySurfaceConfidence;
	readonly match: string;
	readonly requiredVerification: readonly string[];
	readonly manualGates: readonly string[];
}

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const WORKFLOW_DIR = '.github/workflows';
const WORKFLOW_EXTENSIONS = new Set(['.yml', '.yaml']);

const CONFIG_SURFACES: readonly {
	readonly path: string;
	readonly type: RepoDeploySurfaceType;
	readonly match: string;
	readonly requiredVerification: readonly string[];
	readonly manualGates: readonly string[];
}[] = [
	{
		path: 'wrangler.toml',
		type: 'cloudflare',
		match: 'wrangler.toml',
		requiredVerification: ['Cloudflare deploy or preview verification'],
		manualGates: ['Cloudflare account, project, and secret configuration'],
	},
	{
		path: 'wrangler.json',
		type: 'cloudflare',
		match: 'wrangler.json',
		requiredVerification: ['Cloudflare deploy or preview verification'],
		manualGates: ['Cloudflare account, project, and secret configuration'],
	},
	{
		path: 'wrangler.jsonc',
		type: 'cloudflare',
		match: 'wrangler.jsonc',
		requiredVerification: ['Cloudflare deploy or preview verification'],
		manualGates: ['Cloudflare account, project, and secret configuration'],
	},
	{
		path: 'vercel.json',
		type: 'vercel',
		match: 'vercel.json',
		requiredVerification: ['Vercel preview or production deployment verification'],
		manualGates: ['Vercel project and environment configuration'],
	},
	{
		path: 'netlify.toml',
		type: 'netlify',
		match: 'netlify.toml',
		requiredVerification: ['Netlify deploy preview or production deployment verification'],
		manualGates: ['Netlify site and environment configuration'],
	},
	{
		path: 'Dockerfile',
		type: 'container',
		match: 'Dockerfile',
		requiredVerification: ['Container build and image smoke verification'],
		manualGates: ['Container registry credentials and deployment target'],
	},
	{
		path: 'docker-compose.yml',
		type: 'container',
		match: 'docker-compose.yml',
		requiredVerification: ['Compose configuration and container smoke verification'],
		manualGates: ['Runtime host, network, and volume configuration'],
	},
	{
		path: 'docker-compose.yaml',
		type: 'container',
		match: 'docker-compose.yaml',
		requiredVerification: ['Compose configuration and container smoke verification'],
		manualGates: ['Runtime host, network, and volume configuration'],
	},
	{
		path: 'compose.yml',
		type: 'container',
		match: 'compose.yml',
		requiredVerification: ['Compose configuration and container smoke verification'],
		manualGates: ['Runtime host, network, and volume configuration'],
	},
	{
		path: 'compose.yaml',
		type: 'container',
		match: 'compose.yaml',
		requiredVerification: ['Compose configuration and container smoke verification'],
		manualGates: ['Runtime host, network, and volume configuration'],
	},
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
		if (content.charCodeAt(index) === 10) {
			line += 1;
		}
	}
	return line;
}

function firstMatchLine(content: string, pattern: RegExp): { readonly line: number; readonly match: string } | null {
	const match = pattern.exec(content);
	if (!match || match.index < 0) {
		return null;
	}
	return {
		line: lineForOffset(content, match.index),
		match: match[0].trim(),
	};
}

function uniqueStrings(values: Iterable<string>): readonly string[] {
	return [...new Set([...values].filter((value) => value.trim().length > 0))].sort((left, right) =>
		left.localeCompare(right),
	);
}

function safeReadText(root: string, relativePath: string, maxFileBytes: number, issues: string[]): string | null {
	const absolute = path.join(root, ...normalizeRelativePath(relativePath).split('/'));
	try {
		const stats = statSync(absolute);
		if (!stats.isFile()) {
			return null;
		}
		if (stats.size > maxFileBytes) {
			issues.push(`${relativePath} exceeds max_file_bytes (${stats.size} > ${maxFileBytes}).`);
			return null;
		}
		return readFileSync(absolute, 'utf8');
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not read ${relativePath}: ${message}`);
		return null;
	}
}

function listWorkflowFiles(root: string, issues: string[]): readonly string[] {
	const workflowsPath = path.join(root, ...WORKFLOW_DIR.split('/'));
	if (!existsSync(workflowsPath)) {
		return [];
	}

	try {
		return readdirSync(workflowsPath, { withFileTypes: true })
			.filter((entry) => entry.isFile() && WORKFLOW_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
			.map((entry) => `${WORKFLOW_DIR}/${entry.name}`)
			.sort((left, right) => left.localeCompare(right));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not list ${WORKFLOW_DIR}: ${message}`);
		return [];
	}
}

function workflowTrigger(content: string): string | null {
	const tagPush = firstMatchLine(content, /\btags(?:-ignore)?:\s*(?:\[[^\]]+\]|.+)/u);
	if (tagPush) {
		return `tag push (${tagPush.match})`;
	}
	const release = firstMatchLine(content, /^\s*release:\s*$/mu);
	if (release) {
		return 'GitHub release event';
	}
	const workflowDispatch = firstMatchLine(content, /^\s*workflow_dispatch:\s*$/mu);
	if (workflowDispatch) {
		return 'manual workflow_dispatch';
	}
	const push = firstMatchLine(content, /^\s*push:\s*$/mu);
	if (push) {
		return 'push';
	}
	return null;
}

function workflowManualGates(content: string, surfaceType: RepoDeploySurfaceType): readonly string[] {
	const gates: string[] = [];
	if (/^\s*environment:\s*/mu.test(content)) {
		gates.push('GitHub environment protection may gate this workflow.');
	}
	if (/^\s*workflow_dispatch:\s*$/mu.test(content)) {
		gates.push('Manual workflow_dispatch trigger is available.');
	}
	if (surfaceType === 'npm_publish') {
		gates.push('npm trusted publishing, token, or maintainer permission is required.');
	}
	if (surfaceType === 'github_pages') {
		gates.push('GitHub Pages project settings and permissions may gate publication.');
	}
	return uniqueStrings(gates);
}

function verificationForWorkflow(surfaceType: RepoDeploySurfaceType): readonly string[] {
	if (surfaceType === 'npm_publish') {
		return ['release_npm_version_available before tag or publish', 'release_npm_published_verify after publish'];
	}
	if (surfaceType === 'github_pages') {
		return ['docs_validate before deploy', 'published Pages URL smoke check after deploy'];
	}
	if (surfaceType === 'github_release') {
		return ['tag workflow run success', 'GitHub Release asset and metadata verification'];
	}
	if (surfaceType === 'container') {
		return ['container image build', 'registry push and runtime smoke verification'];
	}
	if (surfaceType === 'cloudflare') {
		return ['Cloudflare deploy or preview verification'];
	}
	if (surfaceType === 'vercel') {
		return ['Vercel deploy verification'];
	}
	if (surfaceType === 'netlify') {
		return ['Netlify deploy verification'];
	}
	return ['deployment workflow run success', 'post-deploy smoke verification'];
}

function addWorkflowSurface(
	seeds: SurfaceSeed[],
	content: string,
	relativePath: string,
	surfaceType: RepoDeploySurfaceType,
	pattern: RegExp,
	matchFallback: string,
): void {
	const match = firstMatchLine(content, pattern);
	if (!match) {
		return;
	}
	seeds.push({
		kind: 'github_actions_workflow',
		surfaceType,
		path: relativePath,
		line: match.line,
		trigger: workflowTrigger(content),
		confidence: surfaceType === 'generic_deploy' ? 'medium' : 'high',
		match: match.match || matchFallback,
		requiredVerification: verificationForWorkflow(surfaceType),
		manualGates: workflowManualGates(content, surfaceType),
	});
}

function scanWorkflowFile(root: string, relativePath: string, maxFileBytes: number, seeds: SurfaceSeed[], issues: string[]): void {
	const content = safeReadText(root, relativePath, maxFileBytes, issues);
	if (content === null) {
		return;
	}

	addWorkflowSurface(
		seeds,
		content,
		relativePath,
		'npm_publish',
		/\b(?:npm|bun|pnpm)\s+publish\b|yarn\s+npm\s+publish\b|JS-DevTools\/npm-publish/u,
		'npm publish',
	);
	addWorkflowSurface(
		seeds,
		content,
		relativePath,
		'github_pages',
		/actions\/deploy-pages|pages:\s*write|github-pages|pages\.github\.io/u,
		'GitHub Pages deploy',
	);
	addWorkflowSurface(
		seeds,
		content,
		relativePath,
		'github_release',
		/softprops\/action-gh-release|gh\s+release\b|actions\/create-release|create-release/u,
		'GitHub release',
	);
	addWorkflowSurface(
		seeds,
		content,
		relativePath,
		'container',
		/docker\/build-push-action|\bdocker\s+(?:build|push)\b|ghcr\.io|container_registry/u,
		'container build or push',
	);
	addWorkflowSurface(
		seeds,
		content,
		relativePath,
		'cloudflare',
		/cloudflare\/wrangler-action|\bwrangler\s+deploy\b/u,
		'Cloudflare deploy',
	);
	addWorkflowSurface(seeds, content, relativePath, 'vercel', /\bvercel\s+(?:deploy|--prod)\b/u, 'Vercel deploy');
	addWorkflowSurface(seeds, content, relativePath, 'netlify', /\bnetlify\s+deploy\b|actions-netlify/u, 'Netlify deploy');
	addWorkflowSurface(seeds, content, relativePath, 'generic_deploy', /\bdeploy(?:ment)?\b/u, 'deploy');
}

function scanPackageJson(root: string, maxFileBytes: number, seeds: SurfaceSeed[], issues: string[]): void {
	const relativePath = 'package.json';
	if (!existsSync(path.join(root, relativePath))) {
		return;
	}

	const content = safeReadText(root, relativePath, maxFileBytes, issues);
	if (content === null) {
		return;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not parse ${relativePath}: ${message}`);
		return;
	}

	if (!parsed || typeof parsed !== 'object') {
		issues.push(`${relativePath} must contain a JSON object.`);
		return;
	}

	const record = parsed as Record<string, unknown>;
	const scripts = record.scripts;
	if (scripts && typeof scripts === 'object' && !Array.isArray(scripts)) {
		for (const [scriptName, scriptValue] of Object.entries(scripts as Record<string, unknown>)) {
			if (typeof scriptValue !== 'string') {
				continue;
			}
			const lowerName = scriptName.toLowerCase();
			const lowerValue = scriptValue.toLowerCase();
			const releaseLike = /(?:^|:)(?:deploy|release|publish|prepublishonly|postpublish)$/u.test(lowerName);
			const commandLike = /\b(?:npm|bun|pnpm)\s+publish\b|yarn\s+npm\s+publish\b|\b(?:wrangler|vercel|netlify)\s+deploy\b|\bgh\s+release\b/u.test(
				lowerValue,
			);
			if (!releaseLike && !commandLike) {
				continue;
			}

			const surfaceType: RepoDeploySurfaceType = lowerValue.includes('wrangler')
				? 'cloudflare'
				: lowerValue.includes('vercel')
					? 'vercel'
					: lowerValue.includes('netlify')
						? 'netlify'
						: lowerName.includes('publish') || lowerValue.includes('publish')
							? 'npm_publish'
							: lowerName.includes('release') || lowerValue.includes('gh release')
								? 'package_release'
								: 'generic_deploy';
			const line = firstMatchLine(content, new RegExp(`"${scriptName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}"\\s*:`, 'u'));
			seeds.push({
				kind: 'package_script',
				surfaceType,
				path: relativePath,
				line: line?.line ?? null,
				trigger: `package script: ${scriptName}`,
				confidence: commandLike ? 'high' : 'medium',
				match: `${scriptName}: ${scriptValue}`,
				requiredVerification: verificationForWorkflow(surfaceType),
				manualGates:
					surfaceType === 'npm_publish'
						? ['npm trusted publishing, token, or maintainer permission is required.']
						: [],
			});
		}
	}

	if (
		typeof record.name === 'string' &&
		typeof record.version === 'string' &&
		record.private !== true &&
		(record.publishConfig || record.bin || record.exports)
	) {
		const line = firstMatchLine(content, /"publishConfig"|"bin"|"exports"/u);
		seeds.push({
			kind: 'package_metadata',
			surfaceType: 'npm_publish',
			path: relativePath,
			line: line?.line ?? null,
			trigger: 'package metadata',
			confidence: record.publishConfig ? 'high' : 'medium',
			match: line?.match ?? 'publishable package metadata',
			requiredVerification: ['release_npm_version_available before publish', 'release_npm_published_verify after publish'],
			manualGates: ['npm trusted publishing, token, or maintainer permission is required.'],
		});
	}
}

function scanConfigSurfaces(root: string, seeds: SurfaceSeed[]): void {
	for (const candidate of CONFIG_SURFACES) {
		if (!existsSync(path.join(root, ...candidate.path.split('/')))) {
			continue;
		}
		seeds.push({
			kind: 'deploy_config',
			surfaceType: candidate.type,
			path: candidate.path,
			line: null,
			trigger: null,
			confidence: 'medium',
			match: candidate.match,
			requiredVerification: candidate.requiredVerification,
			manualGates: candidate.manualGates,
		});
	}
}

function seedId(seed: SurfaceSeed, index: number): string {
	return `${seed.kind}:${seed.surfaceType}:${seed.path}:${seed.line ?? 0}:${index}`;
}

function toSurface(seed: SurfaceSeed, index: number): RepoDeploySurface {
	return {
		id: seedId(seed, index),
		kind: seed.kind,
		surface_type: seed.surfaceType,
		path: seed.path,
		line: seed.line,
		trigger: seed.trigger,
		confidence: seed.confidence,
		evidence: {
			path: seed.path,
			line: seed.line,
			match: seed.match,
		},
		required_verification: uniqueStrings(seed.requiredVerification),
		manual_gates: uniqueStrings(seed.manualGates),
	};
}

function createFindings(surfaces: readonly RepoDeploySurface[]): readonly RepoDeploySurfaceFinding[] {
	return surfaces.map((surface) => ({
		code: 'deploy_surface_detected',
		severity: surface.confidence === 'high' ? 'medium' : 'low',
		path: surface.path,
		message: `Detected ${surface.surface_type} deploy surface in ${surface.path}.`,
		json_pointer: null,
		metric: null,
		actual: null,
		expected: null,
	}));
}

function createSummary(surfaces: readonly RepoDeploySurface[]): RepoDeploySurfaceSummary {
	return {
		has_deploy_surface: surfaces.length > 0,
		surface_count: surfaces.length,
		workflow_count: surfaces.filter((surface) => surface.kind === 'github_actions_workflow').length,
		package_script_count: surfaces.filter((surface) => surface.kind === 'package_script').length,
		config_file_count: surfaces.filter((surface) => surface.kind === 'deploy_config').length,
		package_metadata_count: surfaces.filter((surface) => surface.kind === 'package_metadata').length,
		manual_gate_count: uniqueStrings(surfaces.flatMap((surface) => surface.manual_gates)).length,
		required_verification_count: uniqueStrings(surfaces.flatMap((surface) => surface.required_verification)).length,
	};
}

function createInputHash(reportInput: {
	readonly summary: RepoDeploySurfaceSummary;
	readonly surfaces: readonly RepoDeploySurface[];
	readonly requiredVerification: readonly string[];
	readonly manualGates: readonly string[];
	readonly findings: readonly RepoDeploySurfaceFinding[];
	readonly issues: readonly string[];
}): string {
	return sha256(JSON.stringify(reportInput));
}

export function inspectRepoDeploySurface(projectRoot: string): RepoDeploySurfaceReport {
	const root = path.resolve(projectRoot);
	const issues: string[] = [];
	const maxFileBytes = DEFAULT_MAX_FILE_BYTES;
	const scannedPaths = new Set<string>();
	const seeds: SurfaceSeed[] = [];

	for (const workflowPath of listWorkflowFiles(root, issues)) {
		scannedPaths.add(workflowPath);
		scanWorkflowFile(root, workflowPath, maxFileBytes, seeds, issues);
	}

	scannedPaths.add('package.json');
	scanPackageJson(root, maxFileBytes, seeds, issues);

	for (const candidate of CONFIG_SURFACES) {
		scannedPaths.add(candidate.path);
	}
	scanConfigSurfaces(root, seeds);

	const surfaces = seeds.map(toSurface).sort((left, right) => left.path.localeCompare(right.path) || left.id.localeCompare(right.id));
	const summary = createSummary(surfaces);
	const requiredVerification = uniqueStrings(surfaces.flatMap((surface) => surface.required_verification));
	const manualGates = uniqueStrings(surfaces.flatMap((surface) => surface.manual_gates));
	const findings = createFindings(surfaces);
	const status: ScriptCheckStatus = issues.length > 0 ? 'error' : 'passed';

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: REPO_DEPLOY_SURFACE_PACK_ID,
		script_id: REPO_DEPLOY_SURFACE_SCRIPT_ID,
		script_ref: REPO_DEPLOY_SURFACE_SCRIPT_REF,
		action: 'inspect',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		input: {
			scanned_paths: uniqueStrings(scannedPaths),
			max_file_bytes: maxFileBytes,
		},
		input_hash: createInputHash({ summary, surfaces, requiredVerification, manualGates, findings, issues }),
		has_deploy_surface: summary.has_deploy_surface,
		summary,
		surfaces,
		required_verification: requiredVerification,
		manual_gates: manualGates,
		findings,
		issues,
	};
}
