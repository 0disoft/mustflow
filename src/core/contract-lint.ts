import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
	COMMAND_LIFECYCLES,
	COMMAND_RUN_POLICIES,
	LONG_RUNNING_LIFECYCLES,
	isRecord,
	readPositiveInteger,
	readString,
	readStringArray,
	type CommandContract,
	type TomlTable,
} from './config-loading.js';
import {
	evaluateCommandIntentEligibility,
	type CommandIntentEligibilityCode,
} from './command-intent-eligibility.js';
import {
	commandIntentBlockedCommandPattern,
	commandIntentHasCommandSource,
	commandIntentNameIsSafe,
} from './command-contract-rules.js';
import { MAX_COMMAND_OUTPUT_BYTES } from './command-output-limits.js';
import { commandEffectsConflict, normalizeCommandEffects } from './command-effects.js';
import { listChangeClassificationValidationReasons } from './change-classification.js';
import { readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';
import { parseSkillIndexRoutes } from './skill-route-alignment.js';
import {
	SUCCESS_EXIT_CODES_CONTRACT_DESCRIPTION,
	successExitCodesAreValid as successExitCodeValuesAreValid,
} from './success-exit-codes.js';

export type ContractLintStatus = 'passed' | 'warning' | 'failed';
export type ContractLintSeverity = 'error' | 'warning';

export interface ContractLintIssue {
	readonly severity: ContractLintSeverity;
	readonly code: string;
	readonly intent: string | null;
	readonly message: string;
}

export interface ContractLintCoverageFinding {
	readonly severity: ContractLintSeverity;
	readonly code: string;
	readonly reason: string | null;
	readonly intent: string | null;
	readonly intents: readonly string[];
	readonly message: string;
}

export type ContractLintCoverageReasonSource = 'classification' | 'documented' | 'required_after';

export interface ContractLintCoverageMatrixIntent {
	readonly intent: string;
	readonly status: CommandIntentEligibilityCode;
	readonly runnable: boolean;
	readonly detail: string | null;
}

export interface ContractLintCoverageMatrixEntry {
	readonly reason: string;
	readonly source: ContractLintCoverageReasonSource;
	readonly intents: readonly ContractLintCoverageMatrixIntent[];
	readonly gaps: readonly string[];
	readonly relatedSkills: readonly string[];
	readonly relatedDocs: readonly string[];
}

export interface ContractLintCoverageReport {
	readonly knownClassificationReasons: readonly string[];
	readonly documentedVerificationReasons: readonly string[];
	readonly requiredAfterReasons: readonly string[];
	readonly runnableReasons: readonly string[];
	readonly matrix: readonly ContractLintCoverageMatrixEntry[];
	readonly findings: readonly ContractLintCoverageFinding[];
}

export type ContractLintSuggestionSourceKind = 'package_script' | 'make_target' | 'just_recipe';

export interface ContractLintSuggestion {
	readonly sourceFile: string;
	readonly sourceKind: ContractLintSuggestionSourceKind;
	readonly sourceName: string;
	readonly commandHint: string;
	readonly suggestedIntent: string;
	readonly status: 'unknown';
	readonly reason: string;
	readonly snippet: string;
}

export interface ContractLintSummary {
	readonly totalIntents: number;
	readonly configured: number;
	readonly runnable: number;
	readonly manualOnly: number;
	readonly unknown: number;
	readonly errors: number;
	readonly warnings: number;
}

export interface ContractLintReport {
	readonly status: ContractLintStatus;
	readonly summary: ContractLintSummary;
	readonly issues: readonly ContractLintIssue[];
	readonly sourceFiles: readonly string[];
	readonly coverage?: ContractLintCoverageReport;
	readonly suggestions?: readonly ContractLintSuggestion[];
}

export interface ContractLintOptions {
	readonly coverage?: boolean;
	readonly suggest?: boolean;
	readonly projectRoot?: string;
	readonly releaseVersioningEnabled?: boolean;
}

const CONTRACT_LINT_SOURCE_FILES = [
	'.mustflow/config/commands.toml',
	'.mustflow/docs/agent-workflow.md',
	'AGENTS.md',
	'src/core/change-classification.ts',
	'src/core/change-classification-policy.ts',
];

export const DOCUMENTED_VERIFICATION_REASONS = [
	'before_publish',
	'before_final_report',
	'before_task',
	'behavior_change',
	'behavior_removed',
	'build_config_change',
	'clean_mustflow_update_plan',
	'commit_message_suggestion',
	'coverage_request',
	'cross_cutting_code_change',
	'directory_change',
	'formatting_change',
	'image_asset_change',
	'line_ending_warning',
	'low_risk_code_change',
	'snapshot_change',
	'structure_change',
	'style_change',
	'template_update_apply',
	'template_update_check',
	'test_policy_change',
	'user_approved_snapshot_update',
	'user_requested_line_ending_normalization',
	'web_asset_change',
] as const;

const RELEASE_SENSITIVE_REASONS = new Set([
	'package_metadata_change',
	'packaging_change',
	'release_risk',
	'template_version_change',
]);
const COMMANDS_CONFIG_PATH = '.mustflow/config/commands.toml';
const SKILL_INDEX_PATH = '.mustflow/skills/INDEX.md';
const CHANGE_CLASSIFICATION_SOURCE_PATHS = [
	'src/core/change-classification.ts',
	'src/core/change-classification-policy.ts',
];
const AGENT_WORKFLOW_PATH = '.mustflow/docs/agent-workflow.md';
const PACKAGE_SCRIPT_RUNNERS = new Set(['bun', 'npm', 'pnpm', 'yarn']);
const MAKEFILE_CANDIDATES = ['Makefile', 'makefile'];
const JUSTFILE_CANDIDATES = ['justfile', 'Justfile'];
const ALLOW_LONG_RUNNING_COMMAND_PATTERNS_KEY = 'allow_long_running_command_patterns';

interface CoverageIntent {
	readonly name: string;
	readonly intent: TomlTable;
	readonly runnable: boolean;
}

interface PackageScripts {
	readonly relativePath: string;
	readonly scripts: ReadonlySet<string>;
}

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function intersectSorted(left: readonly string[], right: readonly string[]): string[] {
	const rightSet = new Set(right);
	return uniqueSorted(left.filter((value) => rightSet.has(value)));
}

function readBoolean(intent: TomlTable, key: string): boolean | null {
	const value = intent[key];
	return typeof value === 'boolean' ? value : null;
}

function successExitCodesAreValid(intent: TomlTable): boolean {
	const value = intent.success_exit_codes;
	return value === undefined || successExitCodeValuesAreValid(value);
}

function writesAreValid(intent: TomlTable): boolean {
	const value = intent.writes;
	return value === undefined || (Array.isArray(value) && value.every((entry) => typeof entry === 'string'));
}

function readStringList(value: unknown): string[] | null {
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
		return null;
	}

	return [...value];
}

function normalizeCommandName(value: string): string {
	return path.basename(value).replace(/\.(?:cmd|exe)$/iu, '').toLowerCase();
}

function readPackageScriptReference(intent: TomlTable): string | null {
	const argv = readStringList(intent.argv);
	if (!argv || argv.length < 3) {
		return null;
	}

	const runner = normalizeCommandName(argv[0]);
	if (!PACKAGE_SCRIPT_RUNNERS.has(runner) || argv[1] !== 'run') {
		return null;
	}

	const scriptName = argv[2];
	return scriptName && !scriptName.startsWith('-') ? scriptName : null;
}

function resolveIntentCwd(projectRoot: string, intent: TomlTable): string | null {
	const cwd = readString(intent, 'cwd') ?? '.';
	const root = path.resolve(projectRoot);
	const resolved = path.resolve(root, cwd);

	if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
		return null;
	}

	return resolved;
}

function toProjectRelativePath(projectRoot: string, absolutePath: string): string {
	const relativePath = path.relative(projectRoot, absolutePath) || '.';
	return relativePath.split(path.sep).join('/');
}

function readPackageScripts(projectRoot: string, intent: TomlTable): PackageScripts | null {
	const intentCwd = resolveIntentCwd(projectRoot, intent);
	if (!intentCwd) {
		return null;
	}

	const packagePath = path.join(intentCwd, 'package.json');
	if (!existsSync(packagePath)) {
		return null;
	}

	try {
		const parsed = JSON.parse(readFileSync(packagePath, 'utf8')) as unknown;
		if (!isRecord(parsed) || !isRecord(parsed.scripts)) {
			return {
				relativePath: toProjectRelativePath(projectRoot, packagePath),
				scripts: new Set(),
			};
		}

		return {
			relativePath: toProjectRelativePath(projectRoot, packagePath),
			scripts: new Set(Object.keys(parsed.scripts)),
		};
	} catch {
		return null;
	}
}

function readRootPackageScripts(projectRoot: string): readonly [string, string][] {
	const packagePath = path.join(projectRoot, 'package.json');
	if (!existsSync(packagePath)) {
		return [];
	}

	try {
		const parsed = JSON.parse(readFileSync(packagePath, 'utf8')) as unknown;
		if (!isRecord(parsed) || !isRecord(parsed.scripts)) {
			return [];
		}

		return Object.entries(parsed.scripts)
			.filter((entry): entry is [string, string] => typeof entry[1] === 'string')
			.sort((left, right) => left[0].localeCompare(right[0]));
	} catch {
		return [];
	}
}

function readFirstExistingFile(projectRoot: string, candidates: readonly string[]): string | null {
	for (const candidate of candidates) {
		if (existsSync(path.join(projectRoot, candidate))) {
			return candidate;
		}
	}

	return null;
}

function readMakeTargets(projectRoot: string): readonly string[] {
	const relativePath = readFirstExistingFile(projectRoot, MAKEFILE_CANDIDATES);
	if (!relativePath) {
		return [];
	}

	const content = readFileSync(path.join(projectRoot, relativePath), 'utf8');
	const targets: string[] = [];

	for (const line of content.split(/\r?\n/u)) {
		if (/^\s/u.test(line) || line.startsWith('#') || line.includes(':=')) {
			continue;
		}

		const match = /^([A-Za-z0-9][A-Za-z0-9_-]*)\s*:/u.exec(line);
		if (match) {
			targets.push(match[1]);
		}
	}

	return uniqueSorted(targets);
}

function readJustRecipes(projectRoot: string): readonly string[] {
	const relativePath = readFirstExistingFile(projectRoot, JUSTFILE_CANDIDATES);
	if (!relativePath) {
		return [];
	}

	const content = readFileSync(path.join(projectRoot, relativePath), 'utf8');
	const recipes: string[] = [];

	for (const line of content.split(/\r?\n/u)) {
		if (/^\s/u.test(line) || line.startsWith('#') || line.startsWith('set ') || line.includes(' := ')) {
			continue;
		}

		const match = /^([A-Za-z0-9][A-Za-z0-9_-]*)(?:\s+[^:]*)?:\s*(?:#.*)?$/u.exec(line);
		if (match) {
			recipes.push(match[1]);
		}
	}

	return uniqueSorted(recipes);
}

function toTomlString(value: string): string {
	return JSON.stringify(value);
}

function normalizeIntentSegment(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/gu, '_')
		.replace(/^_+|_+$/gu, '');
}

function uniqueSuggestionIntentName(baseName: string, usedIntentNames: Set<string>): string {
	let candidate = baseName;
	let suffix = 2;

	while (usedIntentNames.has(candidate)) {
		candidate = `${baseName}_${suffix}`;
		suffix += 1;
	}

	usedIntentNames.add(candidate);
	return candidate;
}

function createUnknownIntentSnippet(intentName: string, description: string, reason: string): string {
	return [
		`[intents.${intentName}]`,
		'status = "unknown"',
		`description = ${toTomlString(description)}`,
		`reason = ${toTomlString(reason)}`,
		'agent_action = "review_and_configure_before_run"',
	].join('\n');
}

function createSuggestion(
	usedIntentNames: Set<string>,
	sourceFile: string,
	sourceKind: ContractLintSuggestionSourceKind,
	sourceName: string,
	commandHint: string,
): ContractLintSuggestion {
	const sourcePrefix = sourceKind.replace(/_script$/u, '').replace(/_target$/u, '').replace(/_recipe$/u, '');
	const intentName = uniqueSuggestionIntentName(
		`suggest_${sourcePrefix}_${normalizeIntentSegment(sourceName) || 'command'}`,
		usedIntentNames,
	);
	const reason = `Suggested from ${sourceFile} entry "${sourceName}". Review before adding runnable command fields.`;
	const description = `Review ${commandHint} for a possible command intent.`;

	return {
		sourceFile,
		sourceKind,
		sourceName,
		commandHint,
		suggestedIntent: intentName,
		status: 'unknown',
		reason,
		snippet: createUnknownIntentSnippet(intentName, description, reason),
	};
}

function suggestCommandContracts(projectRoot: string | undefined, existingIntentNames: readonly string[]): readonly ContractLintSuggestion[] {
	if (!projectRoot) {
		return [];
	}

	const usedIntentNames = new Set(existingIntentNames);
	const suggestions: ContractLintSuggestion[] = [];

	for (const [scriptName] of readRootPackageScripts(projectRoot)) {
		suggestions.push(
			createSuggestion(usedIntentNames, 'package.json', 'package_script', scriptName, `npm run ${scriptName}`),
		);
	}

	const makefilePath = readFirstExistingFile(projectRoot, MAKEFILE_CANDIDATES);
	if (makefilePath) {
		for (const target of readMakeTargets(projectRoot)) {
			suggestions.push(createSuggestion(usedIntentNames, makefilePath, 'make_target', target, `make ${target}`));
		}
	}

	const justfilePath = readFirstExistingFile(projectRoot, JUSTFILE_CANDIDATES);
	if (justfilePath) {
		for (const recipe of readJustRecipes(projectRoot)) {
			suggestions.push(createSuggestion(usedIntentNames, justfilePath, 'just_recipe', recipe, `just ${recipe}`));
		}
	}

	return suggestions;
}

function pushIssue(
	issues: ContractLintIssue[],
	severity: ContractLintSeverity,
	code: string,
	intent: string | null,
	message: string,
): void {
	issues.push({ severity, code, intent, message });
}

function pushCoverageFinding(
	issues: ContractLintIssue[],
	findings: ContractLintCoverageFinding[],
	severity: ContractLintSeverity,
	code: string,
	reason: string | null,
	intent: string | null,
	intents: readonly string[],
	message: string,
): void {
	findings.push({
		severity,
		code,
		reason,
		intent,
		intents: [...intents].sort((left, right) => left.localeCompare(right)),
		message,
	});
	pushIssue(issues, severity, code, intent, message);
}

function configuredIntentIsRunnable(intentName: string, intent: TomlTable): boolean {
	return evaluateCommandIntentEligibility(intentName, intent).ok;
}

function lintIntent(name: string, value: unknown, issues: ContractLintIssue[]): TomlTable | null {
	if (!commandIntentNameIsSafe(name)) {
		pushIssue(
			issues,
			'error',
			'unsafe_intent_name',
			name,
			`Intent ${name} name must contain only letters, numbers, underscores, and hyphens.`,
		);
	}

	if (!isRecord(value)) {
		pushIssue(issues, 'error', 'intent_not_table', name, `Intent ${name} must be a TOML table.`);
		return null;
	}

	const status = readString(value, 'status');
	if (!status || !['configured', 'manual_only', 'unknown'].includes(status)) {
		pushIssue(issues, 'error', 'invalid_status', name, `Intent ${name} must set status to configured, manual_only, or unknown.`);
		return value;
	}

	if (status === 'unknown') {
		pushIssue(issues, 'warning', 'intent_unknown', name, `Intent ${name} is declared but has no configured command yet.`);
	}

	if (status === 'manual_only') {
		pushIssue(issues, 'warning', 'intent_manual_only', name, `Intent ${name} requires explicit manual handling.`);
	}

	if (status !== 'configured') {
		return value;
	}

	const lifecycle = readString(value, 'lifecycle');
	const runPolicy = readString(value, 'run_policy');

	if (!lifecycle || !COMMAND_LIFECYCLES.has(lifecycle)) {
		pushIssue(issues, 'error', 'invalid_lifecycle', name, `Configured intent ${name} must define a valid lifecycle.`);
	}

	if (!runPolicy || !COMMAND_RUN_POLICIES.has(runPolicy)) {
		pushIssue(issues, 'error', 'invalid_run_policy', name, `Configured intent ${name} must define a valid run_policy.`);
	}

	if (lifecycle === 'oneshot' && readPositiveInteger(value, 'timeout_seconds') === undefined) {
		pushIssue(issues, 'error', 'oneshot_missing_timeout', name, `Oneshot intent ${name} must define timeout_seconds.`);
	}

	const maxOutputBytes = readPositiveInteger(value, 'max_output_bytes');
	if (maxOutputBytes !== undefined && maxOutputBytes > MAX_COMMAND_OUTPUT_BYTES) {
		pushIssue(
			issues,
			'error',
			'max_output_bytes_exceeds_limit',
			name,
			`Intent ${name} max_output_bytes must be less than or equal to ${MAX_COMMAND_OUTPUT_BYTES}.`,
		);
	}

	if (lifecycle === 'oneshot' && readString(value, 'stdin') !== 'closed') {
		pushIssue(issues, 'error', 'oneshot_stdin_not_closed', name, `Oneshot intent ${name} must set stdin to closed.`);
	}

	if (lifecycle && LONG_RUNNING_LIFECYCLES.has(lifecycle) && runPolicy === 'agent_allowed') {
		pushIssue(issues, 'error', 'long_running_agent_allowed', name, `Long-running intent ${name} must not be agent_allowed.`);
	}

	if (!commandIntentHasCommandSource(value)) {
		pushIssue(issues, 'error', 'executable_source_missing', name, `Configured intent ${name} must define argv or shell cmd.`);
	}

	const blockedCommandPattern = commandIntentBlockedCommandPattern(value);
	if (blockedCommandPattern?.code === 'shell_background_pattern') {
		pushIssue(
			issues,
			'error',
			'shell_background_pattern',
			name,
			`Shell intent ${name} contains a blocked long-running or background pattern.`,
		);
	}

	if (blockedCommandPattern?.code === 'long_running_command_pattern' && value[ALLOW_LONG_RUNNING_COMMAND_PATTERNS_KEY] !== true) {
		pushIssue(
			issues,
			'error',
			'long_running_command_pattern',
			name,
			`Intent ${name} contains a blocked long-running or background command pattern.`,
		);
	}

	if (!successExitCodesAreValid(value)) {
		pushIssue(
			issues,
			'error',
			'invalid_success_exit_codes',
			name,
			`Intent ${name} success_exit_codes must be ${SUCCESS_EXIT_CODES_CONTRACT_DESCRIPTION}.`,
		);
	}

	if (!writesAreValid(value)) {
		pushIssue(issues, 'error', 'invalid_writes', name, `Intent ${name} writes must be a string array.`);
	}

	if (readBoolean(value, 'network') === null && Object.hasOwn(value, 'network')) {
		pushIssue(issues, 'error', 'invalid_network', name, `Intent ${name} network must be a boolean.`);
	}

	if (readBoolean(value, 'destructive') === null && Object.hasOwn(value, 'destructive')) {
		pushIssue(issues, 'error', 'invalid_destructive', name, `Intent ${name} destructive must be a boolean.`);
	}

	return value;
}

function lintReferencedPackageScripts(
	projectRoot: string | undefined,
	intents: readonly (readonly [string, TomlTable])[],
	issues: ContractLintIssue[],
): void {
	if (!projectRoot) {
		return;
	}

	for (const [name, intent] of intents) {
		if (readString(intent, 'status') !== 'configured') {
			continue;
		}

		const scriptName = readPackageScriptReference(intent);
		if (!scriptName) {
			continue;
		}

		const packageScripts = readPackageScripts(projectRoot, intent);
		if (!packageScripts || packageScripts.scripts.has(scriptName)) {
			continue;
		}

		pushIssue(
			issues,
			'warning',
			'referenced_package_script_missing',
			name,
			`Intent ${name} references package script "${scriptName}" in ${packageScripts.relativePath}, but that script is not declared.`,
		);
	}
}

function collectRequiredAfterReasons(contract: CommandContract): Map<string, CoverageIntent[]> {
	const reasonToIntents = new Map<string, CoverageIntent[]>();

	for (const [name, intent] of Object.entries(contract.intents)) {
		if (!isRecord(intent)) {
			continue;
		}

		for (const reason of readStringArray(intent, 'required_after') ?? []) {
			reasonToIntents.set(reason, [
				...(reasonToIntents.get(reason) ?? []),
				{
					name,
					intent,
					runnable: evaluateCommandIntentEligibility(name, intent).ok,
				},
			]);
		}
	}

	return reasonToIntents;
}

function readSkillPathsByIntent(projectRoot: string | undefined): Map<string, string[]> {
	const skillPathsByIntent = new Map<string, string[]>();

	if (!projectRoot) {
		return skillPathsByIntent;
	}

	const skillIndexPath = path.join(projectRoot, ...SKILL_INDEX_PATH.split('/'));
	if (!existsSync(skillIndexPath)) {
		return skillPathsByIntent;
	}

	const routes = parseSkillIndexRoutes(
		readUtf8FileInsideWithoutSymlinks(projectRoot, skillIndexPath, { maxBytes: 1024 * 1024 }),
	);

	for (const route of routes) {
		for (const intent of route.commandIntents) {
			skillPathsByIntent.set(intent, [...(skillPathsByIntent.get(intent) ?? []), route.skillPath]);
		}
	}

	return skillPathsByIntent;
}

function classifyReasonSource(
	reason: string,
	knownClassificationReasons: readonly string[],
	documentedVerificationReasons: readonly string[],
): ContractLintCoverageReasonSource {
	if (knownClassificationReasons.includes(reason)) {
		return 'classification';
	}

	if (documentedVerificationReasons.includes(reason)) {
		return 'documented';
	}

	return 'required_after';
}

function buildRelatedDocs(
	source: ContractLintCoverageReasonSource,
	relatedSkills: readonly string[],
): readonly string[] {
	const docs = [COMMANDS_CONFIG_PATH];

	if (source === 'classification') {
		docs.push(...CHANGE_CLASSIFICATION_SOURCE_PATHS);
	}

	if (source === 'documented') {
		docs.push(AGENT_WORKFLOW_PATH);
	}

	if (relatedSkills.length > 0) {
		docs.push(SKILL_INDEX_PATH);
	}

	return uniqueSorted(docs);
}

function buildCoverageMatrix(
	reasonToIntents: ReadonlyMap<string, readonly CoverageIntent[]>,
	knownClassificationReasons: readonly string[],
	documentedVerificationReasons: readonly string[],
	skillPathsByIntent: ReadonlyMap<string, readonly string[]>,
): readonly ContractLintCoverageMatrixEntry[] {
	const matrixReasons = uniqueSorted([
		...knownClassificationReasons,
		...documentedVerificationReasons,
		...reasonToIntents.keys(),
	]);

	return matrixReasons.map((reason) => {
		const candidates = [...(reasonToIntents.get(reason) ?? [])].sort((left, right) =>
			left.name.localeCompare(right.name),
		);
		const source = classifyReasonSource(reason, knownClassificationReasons, documentedVerificationReasons);
		const intentNames = candidates.map((candidate) => candidate.name);
		const relatedSkills = uniqueSorted(intentNames.flatMap((intent) => skillPathsByIntent.get(intent) ?? []));
		const gaps: string[] = [];

		if (candidates.length === 0) {
			gaps.push('missing_required_after');
		} else if (!candidates.some((candidate) => candidate.runnable)) {
			gaps.push('no_runnable_intent');
		}

		if (source === 'required_after') {
			gaps.push('unknown_reason');
		}

		if (intentNames.length > 0 && intersectSorted(intentNames, [...skillPathsByIntent.keys()]).length === 0) {
			gaps.push('no_related_skill_route');
		}

		return {
			reason,
			source,
			intents: candidates.map((candidate) => {
				const eligibility = evaluateCommandIntentEligibility(candidate.name, candidate.intent);
				return {
					intent: candidate.name,
					status: eligibility.code,
					runnable: eligibility.ok,
					detail: eligibility.detail,
				};
			}),
			gaps: uniqueSorted(gaps),
			relatedSkills,
			relatedDocs: buildRelatedDocs(source, relatedSkills),
		};
	});
}

function hasExplicitEffectMetadata(intent: TomlTable): boolean {
	return Array.isArray(intent.effects) && intent.effects.some((effect) => isRecord(effect));
}

function intentLooksReleaseFocused(name: string, intent: TomlTable): boolean {
	const text = `${name} ${readString(intent, 'description') ?? ''}`.toLowerCase();
	return /(?:^|[_\W])(?:release|package|pack|packaging|publish)(?:$|[_\W])/u.test(text);
}

function addConflictingWriteCoverageWarnings(
	contract: CommandContract,
	projectRoot: string | undefined,
	reason: string,
	candidates: readonly CoverageIntent[],
	issues: ContractLintIssue[],
	findings: ContractLintCoverageFinding[],
): void {
	if (!projectRoot) {
		return;
	}

	const runnableCandidates = candidates.filter((candidate) => candidate.runnable);

	for (let leftIndex = 0; leftIndex < runnableCandidates.length; leftIndex += 1) {
		const left = runnableCandidates[leftIndex];
		const leftHasExplicitEffects = hasExplicitEffectMetadata(left.intent);
		let leftEffects;

		try {
			leftEffects = normalizeCommandEffects(projectRoot, contract, left.name);
		} catch {
			continue;
		}

		for (let rightIndex = leftIndex + 1; rightIndex < runnableCandidates.length; rightIndex += 1) {
			const right = runnableCandidates[rightIndex];
			const rightHasExplicitEffects = hasExplicitEffectMetadata(right.intent);

			if (leftHasExplicitEffects && rightHasExplicitEffects) {
				continue;
			}

			let rightEffects;
			try {
				rightEffects = normalizeCommandEffects(projectRoot, contract, right.name);
			} catch {
				continue;
			}

			const conflicts = leftEffects.some((leftEffect) =>
				rightEffects.some((rightEffect) => commandEffectsConflict(leftEffect, rightEffect)),
			);

			if (!conflicts) {
				continue;
			}

			pushCoverageFinding(
				issues,
				findings,
				'warning',
				'coverage_conflicting_writes_without_effects',
				reason,
				null,
				[left.name, right.name],
				`Reason "${reason}" selects runnable intents ${left.name} and ${right.name} that share write effects without explicit effects or resource locks.`,
			);
		}
	}
}

function lintCoverage(
	contract: CommandContract,
	options: ContractLintOptions,
	issues: ContractLintIssue[],
): ContractLintCoverageReport {
	const findings: ContractLintCoverageFinding[] = [];
	const knownClassificationReasons = listChangeClassificationValidationReasons();
	const documentedVerificationReasons = [...DOCUMENTED_VERIFICATION_REASONS];
	const knownReasons = new Set([...knownClassificationReasons, ...documentedVerificationReasons]);
	const reasonToIntents = collectRequiredAfterReasons(contract);
	const skillPathsByIntent = readSkillPathsByIntent(options.projectRoot);
	const requiredAfterReasons = uniqueSorted(reasonToIntents.keys());
	const runnableReasons = uniqueSorted(
		[...reasonToIntents.entries()]
			.filter(([, candidates]) => candidates.some((candidate) => candidate.runnable))
			.map(([reason]) => reason),
	);

	for (const reason of knownClassificationReasons) {
		const candidates = reasonToIntents.get(reason) ?? [];

		if (candidates.length === 0) {
			pushCoverageFinding(
				issues,
				findings,
				'warning',
				'coverage_uncovered_classification_reason',
				reason,
				null,
				[],
				`Classification reason "${reason}" has no matching required_after entry in commands.toml.`,
			);
			continue;
		}

		if (!candidates.some((candidate) => candidate.runnable)) {
			pushCoverageFinding(
				issues,
				findings,
				'warning',
				'coverage_reason_not_runnable',
				reason,
				null,
				candidates.map((candidate) => candidate.name),
				`Reason "${reason}" is covered only by non-runnable intents: ${candidates
					.map((candidate) => candidate.name)
					.sort((left, right) => left.localeCompare(right))
					.join(', ')}.`,
			);
		}

		addConflictingWriteCoverageWarnings(contract, options.projectRoot, reason, candidates, issues, findings);
	}

	for (const [reason, candidates] of reasonToIntents) {
		if (knownReasons.has(reason)) {
			continue;
		}

		pushCoverageFinding(
			issues,
			findings,
			'warning',
			'coverage_unknown_required_after',
			reason,
			null,
			candidates.map((candidate) => candidate.name),
			`required_after reason "${reason}" is not emitted by change classification or listed as a documented verification reason.`,
		);
	}

	if (options.releaseVersioningEnabled === true) {
		const hasReleaseVerificationPath = [...reasonToIntents.entries()].some(
			([reason, candidates]) =>
				RELEASE_SENSITIVE_REASONS.has(reason) &&
				candidates.some((candidate) => candidate.runnable && intentLooksReleaseFocused(candidate.name, candidate.intent)),
		);

		if (!hasReleaseVerificationPath) {
			pushCoverageFinding(
				issues,
				findings,
				'warning',
				'coverage_release_path_missing',
				null,
				null,
				[],
				'Release versioning is enabled, but release-sensitive reasons have no runnable release or package verification intent.',
			);
		}
	}

	return {
		knownClassificationReasons,
		documentedVerificationReasons,
		requiredAfterReasons,
		runnableReasons,
		matrix: buildCoverageMatrix(reasonToIntents, knownClassificationReasons, documentedVerificationReasons, skillPathsByIntent),
		findings,
	};
}

function getStatus(errors: number, warnings: number): ContractLintStatus {
	if (errors > 0) {
		return 'failed';
	}

	return warnings > 0 ? 'warning' : 'passed';
}

export function lintCommandContract(contract: CommandContract, options: ContractLintOptions = {}): ContractLintReport {
	const issues: ContractLintIssue[] = [];
	const intentEntries = Object.entries(contract.intents);
	const intentTables = intentEntries
		.map(([name, value]) => [name, lintIntent(name, value, issues)] as const)
		.filter((entry): entry is readonly [string, TomlTable] => entry[1] !== null);
	lintReferencedPackageScripts(options.projectRoot, intentTables, issues);
	const validIntents = intentTables.map(([, intent]) => intent);
	const coverage = options.coverage === true ? lintCoverage(contract, options, issues) : undefined;
	const suggestions =
		options.suggest === true ? suggestCommandContracts(options.projectRoot, intentEntries.map(([name]) => name)) : undefined;
	const errors = issues.filter((issue) => issue.severity === 'error').length;
	const warnings = issues.length - errors;

	return {
		status: getStatus(errors, warnings),
		summary: {
			totalIntents: intentEntries.length,
			configured: validIntents.filter((intent) => readString(intent, 'status') === 'configured').length,
			runnable: intentTables.filter(([name, intent]) => configuredIntentIsRunnable(name, intent)).length,
			manualOnly: validIntents.filter((intent) => readString(intent, 'status') === 'manual_only').length,
			unknown: validIntents.filter((intent) => readString(intent, 'status') === 'unknown').length,
			errors,
			warnings,
		},
		issues,
		sourceFiles: CONTRACT_LINT_SOURCE_FILES,
		coverage,
		suggestions,
	};
}
