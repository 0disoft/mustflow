import { existsSync } from 'node:fs';
import path from 'node:path';

import { writeUtf8FileInsideWithoutSymlinks } from '../../core/safe-filesystem.js';
import { isRecord } from './command-contract.js';
import {
	getRepoFlowSourceFingerprint,
	renderRepoFlowFrontmatter,
} from './repo-flow-frontmatter.js';
import { readMustflowTomlFile } from './toml.js';

const REPO_FLOW_PATH = 'REPO_FLOW.md';
const FLOW_IDS = [
	'working-agreement',
	'agent-task',
	'command-execution',
	'generated-evidence',
	'contract-surfaces',
	'edit-first',
] as const;
const INPUT_PATHS = [
	'AGENTS.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/config/mustflow.toml',
	'.mustflow/config/commands.toml',
	'.mustflow/config/preferences.toml',
	'.mustflow/skills/router.toml',
	'.mustflow/skills/routes.toml',
	'.mustflow/skills/INDEX.md',
	'README.md',
	'REPO_MAP.md',
] as const;

interface MustflowConfig {
	readonly read_order?: unknown;
	readonly optional_read_order?: unknown;
	readonly document_roots?: unknown;
}

interface CommandsConfig {
	readonly intents?: unknown;
}

interface RepoFlowRenderModel {
	readonly presentInputs: readonly string[];
	readonly configuredCommandIntents: readonly string[];
	readonly configuredReadOrder: readonly string[];
	readonly configuredOptionalReadOrder: readonly string[];
	readonly generatedDocuments: readonly string[];
	readonly flowIds: readonly string[];
	readonly sourceFingerprint: string;
}

function getStringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function readTomlObject(projectRoot: string, relativePath: string): Record<string, unknown> {
	try {
		const parsed = readMustflowTomlFile(projectRoot, relativePath);
		return isRecord(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

function readMustflowConfig(projectRoot: string): MustflowConfig {
	const configPath = path.join(projectRoot, '.mustflow', 'config', 'mustflow.toml');
	return existsSync(configPath) ? (readTomlObject(projectRoot, '.mustflow/config/mustflow.toml') as MustflowConfig) : {};
}

function readCommandsConfig(projectRoot: string): CommandsConfig {
	const configPath = path.join(projectRoot, '.mustflow', 'config', 'commands.toml');
	return existsSync(configPath) ? (readTomlObject(projectRoot, '.mustflow/config/commands.toml') as CommandsConfig) : {};
}

function getPresentInputs(projectRoot: string): string[] {
	return INPUT_PATHS.filter((relativePath) => existsSync(path.join(projectRoot, ...relativePath.split('/'))));
}

function getConfiguredCommandIntents(commandsConfig: CommandsConfig): string[] {
	return isRecord(commandsConfig.intents) ? Object.keys(commandsConfig.intents).sort() : [];
}

function getGeneratedDocuments(mustflowConfig: MustflowConfig): string[] {
	const documentRoots = isRecord(mustflowConfig.document_roots) ? mustflowConfig.document_roots : {};
	return getStringArray(documentRoots.generated);
}

function createRepoFlowRenderModel(projectRoot: string): RepoFlowRenderModel {
	const mustflowConfig = readMustflowConfig(projectRoot);
	const commandsConfig = readCommandsConfig(projectRoot);
	const presentInputs = getPresentInputs(projectRoot);
	const configuredCommandIntents = getConfiguredCommandIntents(commandsConfig);
	const configuredReadOrder = getStringArray(mustflowConfig.read_order);
	const configuredOptionalReadOrder = getStringArray(mustflowConfig.optional_read_order);
	const generatedDocuments = getGeneratedDocuments(mustflowConfig);
	const flowIds = [...FLOW_IDS];
	const sourceFingerprint = getRepoFlowSourceFingerprint({
		presentInputs,
		configuredCommandIntents,
		configuredReadOrder,
		configuredOptionalReadOrder,
		generatedDocuments,
		flowIds,
	});

	return {
		presentInputs,
		configuredCommandIntents,
		configuredReadOrder,
		configuredOptionalReadOrder,
		generatedDocuments,
		flowIds,
		sourceFingerprint,
	};
}

function renderList(values: readonly string[], fallback: string): string[] {
	return values.length > 0 ? values.map((value) => `- \`${value}\``) : [fallback];
}

function renderCommandIntentSummary(intentNames: readonly string[]): string[] {
	const notableIntents = [
		'mustflow_doctor',
		'mustflow_check',
		'lint',
		'build',
		'test_related',
		'docs_validate_fast',
		'test_release',
		'repo_map',
		'repo_flow',
		'changes_status',
		'changes_diff_summary',
	].filter((intentName) => intentNames.includes(intentName));

	return renderList(notableIntents, 'No configured command intents were discovered.');
}

export function getExpectedRepoFlowSourceFingerprint(projectRoot: string): string {
	return createRepoFlowRenderModel(projectRoot).sourceFingerprint;
}

export function generateRepoFlow(projectRoot: string): string {
	const model = createRepoFlowRenderModel(projectRoot);

	return [
		...renderRepoFlowFrontmatter(model.flowIds.length, model.sourceFingerprint),
		'# REPO_FLOW.md',
		'',
		'This file is a generated design-flow map for the current mustflow root. It is not command authority, architecture authority, or a replacement for `AGENTS.md`, `.mustflow/config/commands.toml`, or current source files.',
		'Regenerate it with `mf flow --write` instead of editing it by hand.',
		'',
		'## How To Use',
		'',
		'- Use this file to understand how work moves through the repository before choosing where to read or edit.',
		'- Use `REPO_MAP.md` for file and anchor discovery.',
		'- Use `AGENTS.md` and `.mustflow/config/commands.toml` for binding workflow and command execution rules.',
		'- Use current source, tests, and docs as the source of truth for implementation details.',
		'',
		'## One-Screen Mental Model',
		'',
		'```mermaid',
		'flowchart TD',
		'  UserTask["User task"] --> Rules["AGENTS.md and workflow policy"]',
		'  Rules --> Skills["Skill selection"]',
		'  Skills --> Files["Current source, tests, docs"]',
		'  Files --> Change["Scoped change"]',
		'  Change --> Verify["Configured mf run intents"]',
		'  Verify --> Evidence["Run receipts and final report"]',
		'```',
		'',
		'## Agent Work Flow',
		'',
		'```mermaid',
		'flowchart LR',
		'  A["Read AGENTS.md"] --> B["Read workflow and config"]',
		'  B --> C["Select matching skill"]',
		'  C --> D["Read task source files"]',
		'  D --> E["Edit the narrowest safe scope"]',
		'  E --> F["Verify with configured intents"]',
		'```',
		'',
		'### Read Order Inputs',
		'',
		...renderList(model.configuredReadOrder, 'No read_order entries were found in `.mustflow/config/mustflow.toml`.'),
		'',
		'### Optional Navigation Inputs',
		'',
		...renderList(
			model.configuredOptionalReadOrder,
			'No optional_read_order entries were found in `.mustflow/config/mustflow.toml`.',
		),
		'',
		'## Command Execution Flow',
		'',
		'```mermaid',
		'flowchart TD',
		'  Need["Need verification or generation"] --> Contract[".mustflow/config/commands.toml"]',
		'  Contract --> Eligible["configured + oneshot + agent_allowed"]',
		'  Eligible --> Run["mf run <intent>"]',
		'  Run --> Receipt[".mustflow/state/runs/ receipt"]',
		'```',
		'',
		'### Notable Configured Intents',
		'',
		...renderCommandIntentSummary(model.configuredCommandIntents),
		'',
		'## Generated and Receipt Flow',
		'',
		'```mermaid',
		'flowchart LR',
		'  Source["Current repository inputs"] --> Map["REPO_MAP.md"]',
		'  Source --> Flow["REPO_FLOW.md"]',
		'  Commands["mf run intents"] --> Receipts[".mustflow/state/runs/"]',
		'  Map --> Check["mf check --strict"]',
		'  Flow --> Check',
		'  Receipts --> Evidence["Evidence review"]',
		'```',
		'',
		'### Generated Surfaces',
		'',
		...renderList(model.generatedDocuments, 'No generated document roots were declared.'),
		'',
		'## Public Contract Surfaces',
		'',
		'- CLI commands and options live in `src/cli/commands/` and `src/cli/lib/command-registry.ts`.',
		'- Human-readable CLI strings live in `src/cli/i18n/`.',
		'- Strict workflow validation lives in `src/cli/lib/validation/`.',
		'- User-facing command docs live in `docs-site/src/content/docs/*/commands/`.',
		'- File-role docs live in `docs-site/src/content/docs/*/files/`.',
		'- Release-sensitive package metadata starts at `package.json`.',
		'',
		'## Where To Edit First',
		'',
		'- CLI behavior: start at the matching file under `src/cli/commands/`, then sync registry, i18n, tests, and docs.',
		'- Generated Markdown: start at the generator under `src/cli/lib/`, then sync strict validation and file-role docs.',
		'- Command authority: start at `.mustflow/config/commands.toml`, then sync docs and command-contract tests.',
		'- Workflow or skill behavior: start at `.mustflow/skills/router.toml` or the matching `SKILL.md`, then sync route metadata and validation.',
		'- Release metadata: locate version sources before editing version files.',
		'',
		'## Present Flow Inputs',
		'',
		...renderList(model.presentInputs, 'No flow input files were found.'),
		'',
	].join('\n');
}

export function writeRepoFlow(projectRoot: string, content: string): void {
	writeUtf8FileInsideWithoutSymlinks(projectRoot, path.join(projectRoot, REPO_FLOW_PATH), content);
}
