import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ADAPTER_SCHEMA_VERSION = '1';
const MAX_HOST_INSTRUCTION_BYTES = 256 * 1024;
const MAX_CURSOR_RULE_FILES = 100;

type AdapterHost = 'claude_code' | 'gemini_cli' | 'github_copilot' | 'cursor' | 'generic';
type HostInstructionStatus = 'absent' | 'present' | 'unreadable' | 'symlink_not_read' | 'too_large_not_read';
type AdapterSurfaceKind =
	| 'host_instruction_file'
	| 'editor_settings'
	| 'ci_configuration'
	| 'command_adapter'
	| 'package_manager_scripts';
type FindingSeverity = 'info' | 'warning';

export interface AdapterAgentsFile {
	readonly path: string;
	readonly present: boolean;
	readonly authority: 'binding';
	readonly lifecycle: 'user_editable';
	readonly generated_by_mustflow: boolean;
}

export interface AdapterHostFile {
	readonly host: AdapterHost;
	readonly path: string;
	readonly status: HostInstructionStatus;
	readonly instruction_role: 'host_instruction';
	readonly authority: 'host_specific';
	readonly mustflow_authority: 'advisory';
	readonly lifecycle: 'user_editable';
	readonly generated_by_mustflow: false;
	readonly binding_to_host: boolean;
	readonly mustflow_command_authority: false;
}

export interface AdapterSurface {
	readonly host: AdapterHost;
	readonly path: string;
	readonly kind: AdapterSurfaceKind;
	readonly present: boolean;
	readonly generated_by_mustflow: false;
	readonly generation_policy: 'explicit_user_request_only';
	readonly mustflow_command_authority: false;
}

export interface AdapterFinding {
	readonly severity: FindingSeverity;
	readonly code: string;
	readonly path: string | null;
	readonly message: string;
	readonly required_change: boolean;
}

export interface AdapterRuntimePolicy {
	readonly approval_policy: 'not_repo_visible';
	readonly sandbox_policy: 'not_repo_visible';
	readonly stricter_than_mustflow: 'unknown';
	readonly note: string;
}

export interface AdapterCompatibilitySummary {
	readonly host_instruction_files: number;
	readonly adapter_surfaces_present: number;
	readonly compatibility_notes: number;
	readonly conflicts: number;
	readonly required_changes: number;
}

export interface AdapterCompatibilityReport {
	readonly schema_version: string;
	readonly command: 'adapters_status';
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly agents_file: AdapterAgentsFile;
	readonly summary: AdapterCompatibilitySummary;
	readonly host_files: readonly AdapterHostFile[];
	readonly adapter_surfaces: readonly AdapterSurface[];
	readonly findings: readonly AdapterFinding[];
	readonly compatibility_notes: readonly AdapterFinding[];
	readonly required_changes: readonly AdapterFinding[];
	readonly runtime_policy: AdapterRuntimePolicy;
	readonly boundaries: {
		readonly command_authority: string;
		readonly host_files_are_command_authority: false;
		readonly adapter_generation: 'explicit_user_request_only';
		readonly does_not_generate: readonly string[];
	};
}

interface HostInstructionDefinition {
	readonly host: AdapterHost;
	readonly path: string;
}

interface StaticAdapterSurfaceDefinition {
	readonly host: AdapterHost;
	readonly path: string;
	readonly kind: AdapterSurfaceKind;
}

interface HostInstructionRead {
	readonly status: HostInstructionStatus;
	readonly text: string | null;
	readonly finding?: AdapterFinding;
}

const HOST_INSTRUCTION_FILES: readonly HostInstructionDefinition[] = [
	{ host: 'claude_code', path: 'CLAUDE.md' },
	{ host: 'gemini_cli', path: 'GEMINI.md' },
	{ host: 'github_copilot', path: '.github/copilot-instructions.md' },
];

const ADAPTER_SURFACE_DEFINITIONS: readonly StaticAdapterSurfaceDefinition[] = [
	{ host: 'claude_code', path: 'CLAUDE.md', kind: 'host_instruction_file' },
	{ host: 'gemini_cli', path: 'GEMINI.md', kind: 'host_instruction_file' },
	{ host: 'github_copilot', path: '.github/copilot-instructions.md', kind: 'host_instruction_file' },
	{ host: 'cursor', path: '.cursor/rules/', kind: 'host_instruction_file' },
	{ host: 'generic', path: '.vscode/settings.json', kind: 'editor_settings' },
	{ host: 'generic', path: '.github/workflows/', kind: 'ci_configuration' },
	{ host: 'generic', path: 'Makefile', kind: 'command_adapter' },
	{ host: 'generic', path: 'justfile', kind: 'command_adapter' },
	{ host: 'generic', path: 'Justfile', kind: 'command_adapter' },
	{ host: 'generic', path: 'Taskfile.yml', kind: 'command_adapter' },
	{ host: 'generic', path: 'package.json#scripts', kind: 'package_manager_scripts' },
];

const HOST_AGENT_CONFLICT_PATTERNS: readonly RegExp[] = [
	/\bignore\s+AGENTS\.md\b/iu,
	/\bdo\s+not\s+(?:read|follow|use)\s+AGENTS\.md\b/iu,
	/\boverride\s+AGENTS\.md\b/iu,
	/\binstead\s+of\s+AGENTS\.md\b/iu,
	/\bAGENTS\.md\s+(?:does\s+not|doesn't)\s+apply\b/iu,
];

const DIRECT_COMMAND_PATTERNS: readonly RegExp[] = [
	/\b(?:npm|pnpm|bun|yarn)\s+(?:run\s+)?(?:test|build|lint|check)\b/iu,
	/\bdeno\s+task\b/iu,
	/\bcargo\s+(?:test|build|check|clippy)\b/iu,
	/\bgo\s+test\b/iu,
	/\bmake\s+[A-Za-z0-9_-]+\b/iu,
	/\bjust\s+[A-Za-z0-9_-]+\b/iu,
];

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function resolveProjectPath(projectRoot: string, relativePath: string): string {
	return path.join(projectRoot, ...relativePath.split('/'));
}

function fileExists(projectRoot: string, relativePath: string): boolean {
	return existsSync(resolveProjectPath(projectRoot, relativePath));
}

function packageScriptsExist(projectRoot: string): boolean {
	const packageJsonPath = resolveProjectPath(projectRoot, 'package.json');

	if (!existsSync(packageJsonPath)) {
		return false;
	}

	try {
		const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { scripts?: unknown };
		return !!parsed.scripts && typeof parsed.scripts === 'object';
	} catch {
		return false;
	}
}

function surfaceExists(projectRoot: string, surfacePath: string): boolean {
	if (surfacePath === 'package.json#scripts') {
		return packageScriptsExist(projectRoot);
	}

	const relativePath = surfacePath.endsWith('/') ? surfacePath.slice(0, -1) : surfacePath;
	return fileExists(projectRoot, relativePath);
}

function makeHostFile(definition: HostInstructionDefinition, status: HostInstructionStatus): AdapterHostFile {
	return {
		host: definition.host,
		path: definition.path,
		status,
		instruction_role: 'host_instruction',
		authority: 'host_specific',
		mustflow_authority: 'advisory',
		lifecycle: 'user_editable',
		generated_by_mustflow: false,
		binding_to_host: status === 'present',
		mustflow_command_authority: false,
	};
}

function makeFinding(
	severity: FindingSeverity,
	code: string,
	pathValue: string | null,
	message: string,
	requiredChange: boolean,
): AdapterFinding {
	return {
		severity,
		code,
		path: pathValue,
		message,
		required_change: requiredChange,
	};
}

function readHostInstruction(projectRoot: string, relativePath: string): HostInstructionRead {
	const fullPath = resolveProjectPath(projectRoot, relativePath);

	if (!existsSync(fullPath)) {
		return { status: 'absent', text: null };
	}

	try {
		const stat = lstatSync(fullPath);

		if (stat.isSymbolicLink()) {
			return {
				status: 'symlink_not_read',
				text: null,
				finding: makeFinding(
					'warning',
					'host_instruction_symlink_not_read',
					relativePath,
					'Host instruction path is a symbolic link, so mustflow did not read its target.',
					false,
				),
			};
		}

		if (!stat.isFile()) {
			return {
				status: 'unreadable',
				text: null,
				finding: makeFinding(
					'warning',
					'host_instruction_not_regular_file',
					relativePath,
					'Host instruction path exists but is not a regular file.',
					false,
				),
			};
		}

		if (stat.size > MAX_HOST_INSTRUCTION_BYTES) {
			return {
				status: 'too_large_not_read',
				text: null,
				finding: makeFinding(
					'warning',
					'host_instruction_too_large_not_read',
					relativePath,
					'Host instruction file is larger than the read limit, so mustflow reported metadata only.',
					false,
				),
			};
		}

		return { status: 'present', text: readFileSync(fullPath, 'utf8') };
	} catch {
		return {
			status: 'unreadable',
			text: null,
			finding: makeFinding(
				'warning',
				'host_instruction_unreadable',
				relativePath,
				'Host instruction file could not be read.',
				false,
			),
		};
	}
}

function collectCursorRuleDefinitions(projectRoot: string): readonly HostInstructionDefinition[] {
	const cursorRulesPath = resolveProjectPath(projectRoot, '.cursor/rules');

	if (!existsSync(cursorRulesPath)) {
		return [];
	}

	try {
		const stat = lstatSync(cursorRulesPath);

		if (!stat.isDirectory() || stat.isSymbolicLink()) {
			return [{ host: 'cursor', path: '.cursor/rules/' }];
		}

		return readdirSync(cursorRulesPath, { withFileTypes: true })
			.filter((entry) => entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdc')))
			.map((entry) => ({ host: 'cursor' as const, path: `.cursor/rules/${entry.name}` }))
			.sort((left, right) => left.path.localeCompare(right.path))
			.slice(0, MAX_CURSOR_RULE_FILES);
	} catch {
		return [{ host: 'cursor', path: '.cursor/rules/' }];
	}
}

function inspectHostInstruction(definition: HostInstructionDefinition, text: string | null): readonly AdapterFinding[] {
	if (!text) {
		return [];
	}

	const findings: AdapterFinding[] = [
		makeFinding(
			'info',
			'host_instruction_present',
			definition.path,
			'Host-specific instruction file is present. It may guide that host, but it is not mustflow command authority.',
			false,
		),
	];

	if (HOST_AGENT_CONFLICT_PATTERNS.some((pattern) => pattern.test(text))) {
		findings.push(
			makeFinding(
				'warning',
				'host_instruction_conflicts_with_agents',
				definition.path,
				'Host instruction appears to tell agents to ignore or override AGENTS.md. Resolve the instruction conflict before relying on the host adapter.',
				true,
			),
		);
	}

	if (DIRECT_COMMAND_PATTERNS.some((pattern) => pattern.test(text))) {
		findings.push(
			makeFinding(
				'warning',
				'host_instruction_direct_command_hint',
				definition.path,
				'Host instruction mentions direct tool commands. Agents must still use configured mustflow command intents for project verification.',
				false,
			),
		);
	}

	return findings;
}

function buildAdapterSurfaces(projectRoot: string): readonly AdapterSurface[] {
	return ADAPTER_SURFACE_DEFINITIONS.map((definition) => ({
		host: definition.host,
		path: definition.path,
		kind: definition.kind,
		present: surfaceExists(projectRoot, definition.path),
		generated_by_mustflow: false,
		generation_policy: 'explicit_user_request_only',
		mustflow_command_authority: false,
	}));
}

export function inspectAdapterCompatibility(projectRoot: string): AdapterCompatibilityReport {
	const hostDefinitions = [...HOST_INSTRUCTION_FILES, ...collectCursorRuleDefinitions(projectRoot)];
	const hostFiles: AdapterHostFile[] = [];
	const findings: AdapterFinding[] = [
		makeFinding(
			'info',
			'command_authority_boundary',
			'.mustflow/config/commands.toml',
			'Project command authority remains .mustflow/config/commands.toml; host-specific files cannot authorize command execution.',
			false,
		),
		makeFinding(
			'info',
			'adapter_generation_not_default',
			null,
			'mustflow does not generate host adapters, editor settings, CI files, Makefile, justfile, Taskfile.yml, or package-manager scripts by default.',
			false,
		),
		makeFinding(
			'info',
			'runtime_policy_not_repo_visible',
			null,
			'Host approval and sandbox policies are runtime settings, so this report can only inspect repository-visible compatibility hints.',
			false,
		),
	];

	for (const definition of hostDefinitions) {
		const read = readHostInstruction(projectRoot, definition.path);
		hostFiles.push(makeHostFile(definition, read.status));

		if (read.finding) {
			findings.push(read.finding);
		}

		findings.push(...inspectHostInstruction(definition, read.text));
	}

	const adapterSurfaces = buildAdapterSurfaces(projectRoot);
	const compatibilityNotes = findings.filter((finding) => !finding.required_change);
	const requiredChanges = findings.filter((finding) => finding.required_change);
	const doesNotGenerate = ADAPTER_SURFACE_DEFINITIONS.map((definition) => definition.path);

	return {
		schema_version: ADAPTER_SCHEMA_VERSION,
		command: 'adapters_status',
		ok: true,
		mustflow_root: projectRoot,
		agents_file: {
			path: 'AGENTS.md',
			present: fileExists(projectRoot, 'AGENTS.md'),
			authority: 'binding',
			lifecycle: 'user_editable',
			generated_by_mustflow: fileExists(projectRoot, '.mustflow/config/manifest.lock.toml'),
		},
		summary: {
			host_instruction_files: hostFiles.filter((file) => file.status === 'present').length,
			adapter_surfaces_present: adapterSurfaces.filter((surface) => surface.present).length,
			compatibility_notes: compatibilityNotes.length,
			conflicts: requiredChanges.filter((finding) => finding.code === 'host_instruction_conflicts_with_agents').length,
			required_changes: requiredChanges.length,
		},
		host_files: hostFiles,
		adapter_surfaces: adapterSurfaces,
		findings,
		compatibility_notes: compatibilityNotes,
		required_changes: requiredChanges,
		runtime_policy: {
			approval_policy: 'not_repo_visible',
			sandbox_policy: 'not_repo_visible',
			stricter_than_mustflow: 'unknown',
			note: 'Repository files cannot prove host runtime approval or sandbox strictness.',
		},
		boundaries: {
			command_authority: '.mustflow/config/commands.toml',
			host_files_are_command_authority: false,
			adapter_generation: 'explicit_user_request_only',
			does_not_generate: doesNotGenerate,
		},
	};
}

export function formatAdapterPath(relativePath: string): string {
	return toPosixPath(relativePath);
}
