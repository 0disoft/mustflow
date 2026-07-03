import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { isRecord, readMustflowOwnedTomlFile, type TomlTable } from './config-loading.js';
import type { ScriptCheckFinding, ScriptCheckStatus } from './script-check-result.js';

export const REPO_AUTOMATION_SURFACE_PACK_ID = 'repo';
export const REPO_AUTOMATION_SURFACE_SCRIPT_ID = 'automation-surface';
export const REPO_AUTOMATION_SURFACE_SCRIPT_REF =
	`${REPO_AUTOMATION_SURFACE_PACK_ID}/${REPO_AUTOMATION_SURFACE_SCRIPT_ID}`;

export type RepoAutomationSurfaceKind =
	| 'ci_workflow'
	| 'make_target'
	| 'mise_task'
	| 'mustflow_intent'
	| 'package_script'
	| 'taskfile_task';

export type RepoAutomationCategory =
	| 'bootstrap'
	| 'check'
	| 'clean'
	| 'db'
	| 'deploy'
	| 'deps'
	| 'dev_server'
	| 'doctor'
	| 'fix'
	| 'release'
	| 'smoke'
	| 'test'
	| 'watch'
	| 'workflow'
	| 'unknown';

export type RepoAutomationRisk =
	| 'destructive'
	| 'git_state'
	| 'interactive'
	| 'long_running'
	| 'network'
	| 'release'
	| 'secret'
	| 'writes';

export type RepoAutomationFindingCode =
	| 'dangerous_automation_surface'
	| 'long_running_automation_surface'
	| 'raw_command_without_mustflow_intent'
	| 'mustflow_intent_manual_boundary';

export interface RepoAutomationSurfaceInput {
	readonly scanned_paths: readonly string[];
	readonly max_file_bytes: number;
}

export interface RepoAutomationSurfaceEntry {
	readonly id: string;
	readonly kind: RepoAutomationSurfaceKind;
	readonly path: string;
	readonly line: number | null;
	readonly name: string;
	readonly command_hint: string | null;
	readonly category: RepoAutomationCategory;
	readonly risks: readonly RepoAutomationRisk[];
	readonly mapped_intent: string | null;
	readonly agent_allowed: boolean | null;
}

export interface RepoAutomationSummary {
	readonly surface_count: number;
	readonly mustflow_intent_count: number;
	readonly raw_surface_count: number;
	readonly agent_allowed_intent_count: number;
	readonly manual_only_intent_count: number;
	readonly risky_surface_count: number;
	readonly long_running_surface_count: number;
}

export interface RepoAutomationFinding extends ScriptCheckFinding {
	readonly code: RepoAutomationFindingCode;
	readonly path: string;
}

export interface RepoAutomationSurfaceReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof REPO_AUTOMATION_SURFACE_PACK_ID;
	readonly script_id: typeof REPO_AUTOMATION_SURFACE_SCRIPT_ID;
	readonly script_ref: typeof REPO_AUTOMATION_SURFACE_SCRIPT_REF;
	readonly action: 'inspect';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly input: RepoAutomationSurfaceInput;
	readonly input_hash: string;
	readonly summary: RepoAutomationSummary;
	readonly surfaces: readonly RepoAutomationSurfaceEntry[];
	readonly findings: readonly RepoAutomationFinding[];
	readonly issues: readonly string[];
}

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const COMMANDS_PATH = '.mustflow/config/commands.toml';
const WORKFLOW_DIR = '.github/workflows';

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

function safeReadText(root: string, relativePath: string, scannedPaths: Set<string>, issues: string[]): string | null {
	const normalized = normalizeRelativePath(relativePath);
	scannedPaths.add(normalized);
	const absolute = path.join(root, ...normalized.split('/'));
	try {
		const stats = statSync(absolute);
		if (!stats.isFile()) {
			return null;
		}
		if (stats.size > DEFAULT_MAX_FILE_BYTES) {
			issues.push(`${normalized} exceeds max_file_bytes (${stats.size} > ${DEFAULT_MAX_FILE_BYTES}).`);
			return null;
		}
		return readFileSync(absolute, 'utf8');
	} catch (error) {
		if (!existsSync(absolute)) {
			return null;
		}
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not read ${normalized}: ${message}`);
		return null;
	}
}

function firstLine(content: string, pattern: RegExp): number | null {
	const match = pattern.exec(content);
	return match && match.index >= 0 ? lineForOffset(content, match.index) : null;
}

function uniqueStrings<T extends string>(values: Iterable<T>): readonly T[] {
	return [...new Set([...values].filter((value) => value.trim().length > 0))].sort((left, right) =>
		left.localeCompare(right),
	);
}

function classifyCategory(name: string, command: string | null): RepoAutomationCategory {
	const value = `${name} ${command ?? ''}`.toLowerCase();
	if (/\bdoctor|health|diagnose/u.test(value)) return 'doctor';
	if (/\bbootstrap|setup|install|init\b/u.test(value)) return 'bootstrap';
	if (/\bcheck|verify|lint|typecheck|fmt --check|format-check/u.test(value)) return 'check';
	if (/\btest|vitest|jest|pytest|cargo test|go test/u.test(value)) return 'test';
	if (/\bfix|format|prettier --write|eslint .*--fix|ruff .*--fix/u.test(value)) return 'fix';
	if (/\bclean|rm -rf|rimraf/u.test(value)) return 'clean';
	if (/\bsmoke|healthcheck/u.test(value)) return 'smoke';
	if (/\bdeps?|dependency|renovate|dependabot|update\b/u.test(value)) return 'deps';
	if (/\bdb:|database|migrate|seed|backup|restore|reset-dev/u.test(value)) return 'db';
	if (/\brelease|publish|version|tag\b/u.test(value)) return 'release';
	if (/\bdeploy|wrangler|vercel|netlify|pages\b/u.test(value)) return 'deploy';
	if (/\bdev|serve|start|preview\b/u.test(value)) return 'dev_server';
	if (/\bwatch\b/u.test(value)) return 'watch';
	if (/\bworkflow|mustflow|docs|map|flow/u.test(value)) return 'workflow';
	return 'unknown';
}

function classifyRisks(name: string, command: string | null, category: RepoAutomationCategory): readonly RepoAutomationRisk[] {
	const value = `${name} ${command ?? ''}`.toLowerCase();
	const risks: RepoAutomationRisk[] = [];
	if (category === 'dev_server' || category === 'watch' || /\b(?:serve|preview|--watch|watch)\b/u.test(value)) risks.push('long_running');
	if (category === 'release' || category === 'deploy' || /\bpublish|gh release|git tag|npm version\b/u.test(value)) risks.push('release');
	if (/\b(?:install|update|upgrade|audit|curl|wget|docker pull|git fetch|git push|npm publish|bun publish)\b/u.test(value)) risks.push('network');
	if (/\b(?:rm -rf|rimraf|drop database|migrate reset|docker compose down -v|git reset|git clean)\b/u.test(value)) risks.push('destructive');
	if (/\b(?:git commit|git push|git tag|gh release)\b/u.test(value)) risks.push('git_state');
	if (/\b(?:secret|token|key|login|auth)\b/u.test(value)) risks.push('secret');
	if (/\b(?:--yes|-y|write|build|dist|codegen|generate|migrate|seed|format|fix)\b/u.test(value)) risks.push('writes');
	if (/\b(?:read -p|select |prompt|confirm|pause)\b/u.test(value)) risks.push('interactive');
	return uniqueStrings(risks);
}

function candidateIntentName(name: string, category: RepoAutomationCategory): string | null {
	const normalized = name
		.toLowerCase()
		.replace(/^scripts?:/u, '')
		.replace(/[^a-z0-9]+/gu, '_')
		.replace(/^_+|_+$/gu, '');
	return normalized || (category === 'unknown' ? null : category);
}

function addSurface(
	surfaces: RepoAutomationSurfaceEntry[],
	input: Omit<RepoAutomationSurfaceEntry, 'id' | 'category' | 'risks' | 'mapped_intent' | 'agent_allowed'>,
	intents: Map<string, { readonly status: string | null; readonly runPolicy: string | null }>,
): void {
	const category = classifyCategory(input.name, input.command_hint);
	const risks = classifyRisks(input.name, input.command_hint, category);
	const mappedName = candidateIntentName(input.name, category);
	const intent = mappedName ? intents.get(mappedName) : undefined;
	const agentAllowed = intent ? intent.status === 'configured' && intent.runPolicy === 'agent_allowed' : null;
	surfaces.push({
		id: `${input.kind}:${input.path}:${input.line ?? 0}:${input.name}`,
		...input,
		category,
		risks,
		mapped_intent: intent ? mappedName : null,
		agent_allowed: agentAllowed,
	});
}

function readCommandIntents(root: string, scannedPaths: Set<string>, issues: string[]): Map<string, { readonly status: string | null; readonly runPolicy: string | null }> {
	scannedPaths.add(COMMANDS_PATH);
	const intents = new Map<string, { readonly status: string | null; readonly runPolicy: string | null }>();
	if (!existsSync(path.join(root, ...COMMANDS_PATH.split('/')))) {
		return intents;
	}
	try {
		const parsed = readMustflowOwnedTomlFile(root, COMMANDS_PATH);
		const table = isRecord(parsed) ? parsed : {};
		const intentTable = isRecord(table.intents) ? (table.intents as TomlTable) : {};
		for (const [name, value] of Object.entries(intentTable)) {
			if (!isRecord(value)) {
				continue;
			}
			intents.set(name, {
				status: typeof value.status === 'string' ? value.status : null,
				runPolicy: typeof value.run_policy === 'string' ? value.run_policy : null,
			});
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not read ${COMMANDS_PATH}: ${message}`);
	}
	return intents;
}

function scanPackageJson(root: string, scannedPaths: Set<string>, surfaces: RepoAutomationSurfaceEntry[], intents: Map<string, { readonly status: string | null; readonly runPolicy: string | null }>, issues: string[]): void {
	const content = safeReadText(root, 'package.json', scannedPaths, issues);
	if (content === null) {
		return;
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not parse package.json: ${message}`);
		return;
	}
	const scripts = isRecord(parsed) && isRecord(parsed.scripts) ? parsed.scripts : {};
	for (const [name, value] of Object.entries(scripts)) {
		if (typeof value !== 'string') {
			continue;
		}
		addSurface(
			surfaces,
			{
				kind: 'package_script',
				path: 'package.json',
				line: firstLine(content, new RegExp(`"${name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}"\\s*:`, 'u')),
				name,
				command_hint: value,
			},
			intents,
		);
	}
}

function scanMakefile(root: string, scannedPaths: Set<string>, surfaces: RepoAutomationSurfaceEntry[], intents: Map<string, { readonly status: string | null; readonly runPolicy: string | null }>, issues: string[]): void {
	for (const relativePath of ['Makefile', 'makefile']) {
		const content = safeReadText(root, relativePath, scannedPaths, issues);
		if (content === null) continue;
		for (const [index, line] of content.split(/\r?\n/u).entries()) {
			const match = /^([A-Za-z0-9_.:-]+)\s*:(?:\s|$)/u.exec(line);
			if (!match || match[1].startsWith('.')) continue;
			addSurface(surfaces, { kind: 'make_target', path: relativePath, line: index + 1, name: match[1], command_hint: null }, intents);
		}
	}
}

function scanTaskLikeFile(root: string, scannedPaths: Set<string>, surfaces: RepoAutomationSurfaceEntry[], intents: Map<string, { readonly status: string | null; readonly runPolicy: string | null }>, issues: string[]): void {
	for (const relativePath of ['Taskfile.yml', 'Taskfile.yaml']) {
		const content = safeReadText(root, relativePath, scannedPaths, issues);
		if (content === null) continue;
		for (const [index, line] of content.split(/\r?\n/u).entries()) {
			const match = /^\s{2}([A-Za-z0-9_.:-]+):\s*$/u.exec(line);
			if (!match) continue;
			addSurface(surfaces, { kind: 'taskfile_task', path: relativePath, line: index + 1, name: match[1], command_hint: null }, intents);
		}
	}
}

function scanMiseTasks(root: string, scannedPaths: Set<string>, surfaces: RepoAutomationSurfaceEntry[], intents: Map<string, { readonly status: string | null; readonly runPolicy: string | null }>, issues: string[]): void {
	for (const relativePath of ['mise.toml', '.mise.toml']) {
		const content = safeReadText(root, relativePath, scannedPaths, issues);
		if (content === null) continue;
		for (const [index, line] of content.split(/\r?\n/u).entries()) {
			const match = /^\s*\[tasks\.([^\]]+)\]\s*$/u.exec(line) ?? /^\s*([A-Za-z0-9_.:-]+)\s*=\s*["'][^"']+["']\s*$/u.exec(line);
			if (!match) continue;
			addSurface(surfaces, { kind: 'mise_task', path: relativePath, line: index + 1, name: match[1], command_hint: line.trim() }, intents);
		}
	}
}

function scanWorkflows(root: string, scannedPaths: Set<string>, surfaces: RepoAutomationSurfaceEntry[], intents: Map<string, { readonly status: string | null; readonly runPolicy: string | null }>, issues: string[]): void {
	const workflowRoot = path.join(root, ...WORKFLOW_DIR.split('/'));
	if (!existsSync(workflowRoot)) {
		scannedPaths.add(WORKFLOW_DIR);
		return;
	}
	let entries: readonly string[] = [];
	try {
		entries = readdirSync(workflowRoot)
			.filter((name) => /\.(?:yml|yaml)$/u.test(name))
			.map((name) => `${WORKFLOW_DIR}/${name}`)
			.sort((left, right) => left.localeCompare(right));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not list ${WORKFLOW_DIR}: ${message}`);
		return;
	}
	for (const relativePath of entries) {
		const content = safeReadText(root, relativePath, scannedPaths, issues);
		if (content === null) continue;
		const name = /name:\s*([^\n]+)/u.exec(content)?.[1]?.trim() ?? path.basename(relativePath);
		addSurface(
			surfaces,
			{
				kind: 'ci_workflow',
				path: relativePath,
				line: firstLine(content, /^name:/mu),
				name,
				command_hint: content.includes('workflow_dispatch') ? 'workflow_dispatch' : content.includes('push:') ? 'push' : null,
			},
			intents,
		);
	}
}

function addMustflowIntentSurfaces(surfaces: RepoAutomationSurfaceEntry[], intents: Map<string, { readonly status: string | null; readonly runPolicy: string | null }>): void {
	for (const [name, intent] of intents.entries()) {
		const category = classifyCategory(name, null);
		surfaces.push({
			id: `mustflow_intent:${name}`,
			kind: 'mustflow_intent',
			path: COMMANDS_PATH,
			line: null,
			name,
			command_hint: null,
			category,
			risks: classifyRisks(name, null, category),
			mapped_intent: name,
			agent_allowed: intent.status === 'configured' && intent.runPolicy === 'agent_allowed',
		});
	}
}

function createFindings(surfaces: readonly RepoAutomationSurfaceEntry[]): readonly RepoAutomationFinding[] {
	const findings: RepoAutomationFinding[] = [];
	for (const surface of surfaces) {
		if (surface.kind !== 'mustflow_intent' && surface.mapped_intent === null && surface.category !== 'unknown') {
			findings.push({
				code: 'raw_command_without_mustflow_intent',
				severity: surface.risks.length > 0 ? 'medium' : 'low',
				path: surface.path,
				message: `${surface.name} appears to be a ${surface.category} automation surface without a mapped mustflow intent.`,
				json_pointer: null,
				metric: null,
				actual: null,
				expected: null,
			});
		}
		if (surface.risks.includes('long_running')) {
			findings.push({
				code: 'long_running_automation_surface',
				severity: 'medium',
				path: surface.path,
				message: `${surface.name} looks long-running and should remain manual or explicitly bounded.`,
				json_pointer: null,
				metric: null,
				actual: null,
				expected: null,
			});
		}
		if (surface.risks.some((risk) => ['destructive', 'release', 'secret', 'git_state'].includes(risk))) {
			findings.push({
				code: 'dangerous_automation_surface',
				severity: 'high',
				path: surface.path,
				message: `${surface.name} touches a high-risk automation category: ${surface.risks.join(', ')}.`,
				json_pointer: null,
				metric: null,
				actual: null,
				expected: null,
			});
		}
		if (surface.kind === 'mustflow_intent' && surface.agent_allowed === false) {
			findings.push({
				code: 'mustflow_intent_manual_boundary',
				severity: 'low',
				path: surface.path,
				message: `${surface.name} is present in the command contract but is not agent-allowed.`,
				json_pointer: null,
				metric: null,
				actual: null,
				expected: null,
			});
		}
	}
	return findings;
}

function createSummary(surfaces: readonly RepoAutomationSurfaceEntry[]): RepoAutomationSummary {
	return {
		surface_count: surfaces.length,
		mustflow_intent_count: surfaces.filter((surface) => surface.kind === 'mustflow_intent').length,
		raw_surface_count: surfaces.filter((surface) => surface.kind !== 'mustflow_intent').length,
		agent_allowed_intent_count: surfaces.filter((surface) => surface.kind === 'mustflow_intent' && surface.agent_allowed === true).length,
		manual_only_intent_count: surfaces.filter((surface) => surface.kind === 'mustflow_intent' && surface.agent_allowed === false).length,
		risky_surface_count: surfaces.filter((surface) => surface.risks.length > 0).length,
		long_running_surface_count: surfaces.filter((surface) => surface.risks.includes('long_running')).length,
	};
}

export function inspectRepoAutomationSurface(projectRoot: string): RepoAutomationSurfaceReport {
	const root = path.resolve(projectRoot);
	const issues: string[] = [];
	const scannedPaths = new Set<string>();
	const intents = readCommandIntents(root, scannedPaths, issues);
	const surfaces: RepoAutomationSurfaceEntry[] = [];

	scanPackageJson(root, scannedPaths, surfaces, intents, issues);
	scanMakefile(root, scannedPaths, surfaces, intents, issues);
	scanTaskLikeFile(root, scannedPaths, surfaces, intents, issues);
	scanMiseTasks(root, scannedPaths, surfaces, intents, issues);
	scanWorkflows(root, scannedPaths, surfaces, intents, issues);
	addMustflowIntentSurfaces(surfaces, intents);

	const sortedSurfaces = surfaces.sort((left, right) => left.path.localeCompare(right.path) || left.name.localeCompare(right.name));
	const findings = createFindings(sortedSurfaces);
	const summary = createSummary(sortedSurfaces);
	const status: ScriptCheckStatus = issues.length > 0 ? 'error' : findings.some((finding) => finding.severity === 'high') ? 'failed' : 'passed';

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: REPO_AUTOMATION_SURFACE_PACK_ID,
		script_id: REPO_AUTOMATION_SURFACE_SCRIPT_ID,
		script_ref: REPO_AUTOMATION_SURFACE_SCRIPT_REF,
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
