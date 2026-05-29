import { existsSync } from 'node:fs';
import path from 'node:path';

import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { MUSTFLOW_JSON_MAX_BYTES, readMustflowTextFile } from '../lib/mustflow-read.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import {
	explainAssetOptimization,
	explainCommandIntent,
	type CommandDecision,
} from '../../core/command-explanation.js';
import { readCommandContract, readMustflowConfigIfExists } from '../../core/config-loading.js';
import {
	explainManagedMarkdownAuthority,
	type AuthorityDecision,
} from '../../core/authority-resolution.js';
import { explainRetentionPolicy, type RetentionDecision } from '../../core/retention-explanation.js';
import { explainSkillRoute, type SkillRouteDecision } from '../../core/skill-route-explanation.js';
import {
	explainSkillRouteAlignment,
	type SkillRouteAlignmentDecision,
} from '../../core/skill-route-alignment.js';
import { explainPublicSurface, type PublicSurfaceDecision } from '../../core/public-surface-explanation.js';
import { explainSourceAnchor, type SourceAnchorDecision } from '../../core/source-anchor-explanation.js';
import { checkMustflowProject } from '../lib/validation.js';
import {
	readLocalCommandEffectGraph,
	readLocalPathSurface,
	type LocalCommandEffectGraph,
	type LocalPathSurfaceReadModel,
} from '../lib/local-index.js';
import {
	explainVerifyArgErrorMessage,
	explainVerifyPlanErrorMessage,
	getVerifyExplainOutput,
	parseExplainVerifyArgs,
	readExplainVerifyPlanReasons,
	renderVerifyExplainDecision,
	type ExplainVerificationDecision,
} from './explain-verify.js';
import {
	createRunPlan,
	type RunPlanReasonCode,
} from '../lib/run-plan.js';

const EXPLAIN_SCHEMA_VERSION = '1';
const LATEST_RUN_RECEIPT_RELATIVE_PATH = '.mustflow/state/runs/latest.json';

type ExplainTopic =
	| 'anchor'
	| 'asset-optimization'
	| 'authority'
	| 'command'
	| 'retention'
	| 'skill'
	| 'skills'
	| 'surface'
	| 'verify'
	| 'why';
type ExplainCommandDecision = CommandDecision & {
	readonly effectGraph?: LocalCommandEffectGraph;
	readonly blockedRunPlan?: BlockedRunPlanSummary;
};
type ExplainSurfaceDecision = PublicSurfaceDecision & {
	readonly readModel?: LocalPathSurfaceReadModel;
};
interface LatestFailureSummary {
	readonly path: string;
	readonly present: boolean;
	readonly valid: boolean;
	readonly failed: boolean;
	readonly status: string | null;
	readonly intent: string | null;
	readonly exitCode: number | null;
	readonly errorKind: string | null;
	readonly durationMs: number | null;
	readonly summary: string;
}
interface LatestFailureDecision {
	readonly kind: 'latest_failure';
	readonly decision: string;
	readonly reason: string;
	readonly effectiveAction: string;
	readonly countsAsMustflowVerification: false;
	readonly sourceFiles: readonly string[];
	readonly latestFailure: LatestFailureSummary;
}
interface BlockedRunPlanSummary {
	readonly runnable: boolean;
	readonly reasonCode: RunPlanReasonCode | null;
	readonly detail: string | null;
	readonly status: string | null;
	readonly lifecycle: string | null;
	readonly runPolicy: string | null;
	readonly configuredCwd: string | null;
	readonly timeoutSeconds: number | null;
	readonly mode: string | null;
	readonly writes: readonly string[];
	readonly suggestedIntentSnippet: string | null;
}
type ExplainDecision =
	| AuthorityDecision
	| ExplainCommandDecision
	| RetentionDecision
	| SkillRouteDecision
	| SkillRouteAlignmentDecision
	| ExplainSurfaceDecision
	| SourceAnchorDecision
	| ExplainVerificationDecision
	| LatestFailureDecision;

interface ExplainOutput {
	readonly schema_version: string;
	readonly command: 'explain';
	readonly topic: ExplainTopic;
	readonly mustflow_root: string;
	readonly decision: ExplainDecision;
}

export function getExplainHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf explain <topic> [target] [options] | mf explain verify --reason <event> [options] | mf explain why <target> [options] | mf explain --why-blocked <intent> [options]',
			summary: t(lang, 'explain.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf explain authority',
				'mf explain authority AGENTS.md',
				'mf explain anchor auth.session.resolve',
				'mf explain anchor auth.session.resolve --json',
				'mf explain asset-optimization',
				'mf explain asset-optimization --json',
				'mf explain command test',
				'mf explain command lint --json',
				'mf explain --why-blocked deploy',
				'mf explain --why-blocked lint --json',
				'mf explain retention',
				'mf explain retention --json',
				'mf explain verify --reason code_change',
				'mf explain verify --from-plan verify-plan.json --json',
				'mf explain why command test --json',
				'mf explain why verify --reason code_change --json',
				'mf explain why latest-failure --json',
				'mf explain skill code-review',
				'mf explain skill mustflow.core.code-review --json',
				'mf explain skills',
				'mf explain skills --json',
				'mf explain surface README.md',
				'mf explain surface templates/default/manifest.toml --json',
				'mf explain authority .mustflow/skills/INDEX.md --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'explain.help.exit.ok') },
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

function getAuthorityExplainOutput(projectRoot: string, pathArg: string | undefined): ExplainOutput {
	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'authority',
		mustflow_root: projectRoot,
		decision: explainManagedMarkdownAuthority(pathArg),
	};
}

function getAssetOptimizationExplainOutput(projectRoot: string): ExplainOutput {
	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'asset-optimization',
		mustflow_root: projectRoot,
		decision: explainAssetOptimization(readCommandContract(projectRoot)),
	};
}

function getAnchorExplainOutput(projectRoot: string, anchorId: string): ExplainOutput {
	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'anchor',
		mustflow_root: projectRoot,
		decision: explainSourceAnchor(projectRoot, anchorId),
	};
}

async function getCommandExplainOutput(projectRoot: string, commandName: string): Promise<ExplainOutput> {
	const decision = explainCommandIntent(readCommandContract(projectRoot), commandName, { projectRoot });
	const effectGraph = decision.intent ? await readLocalCommandEffectGraph(projectRoot, commandName) : undefined;

	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'command',
		mustflow_root: projectRoot,
		decision: effectGraph ? { ...decision, effectGraph } : decision,
	};
}

function getWhyBlockedExplainOutput(projectRoot: string, commandName: string): ExplainOutput {
	const contract = readCommandContract(projectRoot);
	const plan = createRunPlan(projectRoot, contract, commandName);
	const commandDecision = explainCommandIntent(contract, commandName, { projectRoot });
	const blockedRunPlan: BlockedRunPlanSummary = {
		runnable: plan.ok,
		reasonCode: plan.reasonCode,
		detail: plan.detail,
		status: plan.intentStatus,
		lifecycle: plan.lifecycle,
		runPolicy: plan.runPolicy,
		configuredCwd: plan.configuredCwd,
		timeoutSeconds: plan.timeoutSeconds,
		mode: plan.mode,
		writes: plan.writes ?? [],
		suggestedIntentSnippet: plan.suggestedIntentSnippet,
	};
	const decision: ExplainCommandDecision = {
		...commandDecision,
		decision: plan.ok
			? `command intent "${commandName}" is not blocked for mf run`
			: `command intent "${commandName}" is blocked for mf run`,
		effectiveAction: plan.ok
			? `Run mf run ${commandName} when this intent is required for the changed behavior.`
			: plan.suggestedIntentSnippet
				? 'Review the suggested command contract snippet before enabling agent execution.'
				: commandDecision.effectiveAction,
		blockedRunPlan,
	};

	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'why',
		mustflow_root: projectRoot,
		decision,
	};
}

function getRetentionExplainOutput(projectRoot: string): ExplainOutput {
	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'retention',
		mustflow_root: projectRoot,
		decision: explainRetentionPolicy(readMustflowConfigIfExists(projectRoot)),
	};
}

function getSkillsExplainOutput(projectRoot: string): ExplainOutput {
	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'skills',
		mustflow_root: projectRoot,
		decision: explainSkillRouteAlignment(checkMustflowProject(projectRoot, { strict: true })),
	};
}

function getSkillExplainOutput(projectRoot: string, skillName: string): ExplainOutput {
	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'skill',
		mustflow_root: projectRoot,
		decision: explainSkillRoute(projectRoot, skillName),
	};
}

async function getSurfaceExplainOutput(projectRoot: string, pathArg: string | undefined): Promise<ExplainOutput> {
	const decision = explainPublicSurface(pathArg);
	const readModel = await readLocalPathSurface(projectRoot, pathArg);

	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'surface',
		mustflow_root: projectRoot,
		decision: { ...decision, readModel },
	};
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string): string | null {
	const value = record[key];
	return typeof value === 'string' ? value : null;
}

function integerField(record: Record<string, unknown>, key: string): number | null {
	const value = record[key];
	return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function recordField(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
	const value = record[key];
	return isJsonRecord(value) ? value : null;
}

function latestFailureDecision(latestFailure: LatestFailureSummary, decision: string, reason: string, effectiveAction: string): LatestFailureDecision {
	return {
		kind: 'latest_failure',
		decision,
		reason,
		effectiveAction,
		countsAsMustflowVerification: false,
		sourceFiles: [
			LATEST_RUN_RECEIPT_RELATIVE_PATH,
			'.mustflow/config/mustflow.toml',
			'.mustflow/docs/agent-workflow.md',
		],
		latestFailure,
	};
}

function getLatestFailureExplainOutput(projectRoot: string): ExplainOutput {
	const latestPath = path.join(projectRoot, ...LATEST_RUN_RECEIPT_RELATIVE_PATH.split('/'));
	const sourcePath = LATEST_RUN_RECEIPT_RELATIVE_PATH;

	if (!existsSync(latestPath)) {
		return {
			schema_version: EXPLAIN_SCHEMA_VERSION,
			command: 'explain',
			topic: 'why',
			mustflow_root: projectRoot,
			decision: latestFailureDecision(
				{
					path: sourcePath,
					present: false,
					valid: false,
					failed: false,
					status: null,
					intent: null,
					exitCode: null,
					errorKind: null,
					durationMs: null,
					summary: 'No latest mf run receipt is available.',
				},
				'latest run receipt is missing',
				'mustflow has no bounded latest run metadata to explain.',
				'Run a configured mf run or mf verify command before treating latest-run state as evidence.',
			),
		};
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(
			readMustflowTextFile(projectRoot, LATEST_RUN_RECEIPT_RELATIVE_PATH, { maxBytes: MUSTFLOW_JSON_MAX_BYTES }),
		);
	} catch {
		return {
			schema_version: EXPLAIN_SCHEMA_VERSION,
			command: 'explain',
			topic: 'why',
			mustflow_root: projectRoot,
			decision: latestFailureDecision(
				{
					path: sourcePath,
					present: true,
					valid: false,
					failed: false,
					status: null,
					intent: null,
					exitCode: null,
					errorKind: null,
					durationMs: null,
					summary: 'The latest mf run receipt is not valid JSON.',
				},
				'latest run receipt is invalid',
				'mustflow could not read bounded latest run metadata safely.',
				'Ignore the latest-run state and rerun the intended configured command to create a fresh receipt.',
			),
		};
	}

	if (!isJsonRecord(parsed)) {
		return {
			schema_version: EXPLAIN_SCHEMA_VERSION,
			command: 'explain',
			topic: 'why',
			mustflow_root: projectRoot,
			decision: latestFailureDecision(
				{
					path: sourcePath,
					present: true,
					valid: false,
					failed: false,
					status: null,
					intent: null,
					exitCode: null,
					errorKind: null,
					durationMs: null,
					summary: 'The latest mf run receipt is not a JSON object.',
				},
				'latest run receipt is invalid',
				'mustflow could not read bounded latest run metadata safely.',
				'Ignore the latest-run state and rerun the intended configured command to create a fresh receipt.',
			),
		};
	}

	const status = stringField(parsed, 'status');
	const intent = stringField(parsed, 'intent');
	const exitCode = integerField(parsed, 'exit_code');
	const performance = recordField(parsed, 'performance');
	const resultSummary = performance ? recordField(performance, 'result_summary') : null;
	const errorKind = resultSummary ? stringField(resultSummary, 'error_kind') : null;
	const durationMs = integerField(parsed, 'duration_ms') ?? (performance ? integerField(performance, 'duration_ms') : null);
	if (!status) {
		return {
			schema_version: EXPLAIN_SCHEMA_VERSION,
			command: 'explain',
			topic: 'why',
			mustflow_root: projectRoot,
			decision: latestFailureDecision(
				{
					path: sourcePath,
					present: true,
					valid: false,
					failed: false,
					status: null,
					intent,
					exitCode,
					errorKind,
					durationMs,
					summary: 'The latest mf run receipt does not include a status field.',
				},
				'latest run receipt is invalid',
				'mustflow could not read bounded latest run metadata safely.',
				'Ignore the latest-run state and rerun the intended configured command to create a fresh receipt.',
			),
		};
	}

	const failed = status !== 'passed';

	return {
		schema_version: EXPLAIN_SCHEMA_VERSION,
		command: 'explain',
		topic: 'why',
		mustflow_root: projectRoot,
		decision: latestFailureDecision(
			{
				path: sourcePath,
				present: true,
				valid: true,
				failed,
				status,
				intent,
				exitCode,
				errorKind,
				durationMs,
				summary: `Latest bounded run receipt status is ${status}.`,
			},
			failed ? 'latest run did not pass' : 'latest run is not a failure',
			failed
				? 'the latest bounded run receipt reports a non-passing status without exposing stdout or stderr tails.'
				: 'the latest bounded run receipt does not report a failure status.',
			failed
				? 'Inspect the configured command result and rerun the narrowest relevant intent after fixing the cause.'
				: 'Do not treat this as a failure explanation; choose the next verification from current changes and command contracts.',
		),
	};
}

function withWhyTopic(output: ExplainOutput): ExplainOutput {
	return { ...output, topic: 'why' };
}

async function getWhyExplainOutput(
	projectRoot: string,
	targetArg: string | undefined,
	rest: readonly string[],
	lang: CliLang,
	reporter: Reporter,
): Promise<ExplainOutput | null> {
	switch (targetArg) {
		case 'command':
		case 'intent': {
			const [commandName, ...extra] = rest;

			if (!commandName) {
				printUsageError(reporter, t(lang, 'explain.error.missingCommand'), 'mf explain --help', getExplainHelp(lang), lang);
				return null;
			}

			if (extra.length > 0) {
				printUsageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: extra[0] }), 'mf explain --help', getExplainHelp(lang), lang);
				return null;
			}

			return withWhyTopic(await getCommandExplainOutput(projectRoot, commandName));
		}
		case 'verify': {
			const parsed = parseExplainVerifyArgs([...rest]);

			if (parsed.error) {
				printUsageError(reporter, explainVerifyArgErrorMessage(parsed.error, lang), 'mf explain --help', getExplainHelp(lang), lang);
				return null;
			}

			const selectedInputCount = [parsed.reason, parsed.fromPlan].filter(Boolean).length;

			if (selectedInputCount > 1) {
				printUsageError(reporter, t(lang, 'verify.error.conflictingInputs'), 'mf explain --help', getExplainHelp(lang), lang);
				return null;
			}

			if (selectedInputCount === 0) {
				printUsageError(reporter, t(lang, 'verify.error.missingReason'), 'mf explain --help', getExplainHelp(lang), lang);
				return null;
			}

			try {
				if (parsed.fromPlan) {
					const reasons = readExplainVerifyPlanReasons(projectRoot, parsed.fromPlan);
					return withWhyTopic(await getVerifyExplainOutput(EXPLAIN_SCHEMA_VERSION, projectRoot, reasons, null, parsed.fromPlan));
				}

				return withWhyTopic(
					await getVerifyExplainOutput(
						EXPLAIN_SCHEMA_VERSION,
						projectRoot,
						[parsed.reason as string],
						parsed.reason as string,
						null,
					),
				);
			} catch (error) {
				printUsageError(reporter, explainVerifyPlanErrorMessage(error, lang), 'mf explain --help', getExplainHelp(lang), lang);
				return null;
			}
		}
		case 'skill': {
			const [skillName, ...extra] = rest;

			if (!skillName) {
				printUsageError(reporter, t(lang, 'explain.error.missingSkill'), 'mf explain --help', getExplainHelp(lang), lang);
				return null;
			}

			if (extra.length > 0) {
				printUsageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: extra[0] }), 'mf explain --help', getExplainHelp(lang), lang);
				return null;
			}

			return withWhyTopic(getSkillExplainOutput(projectRoot, skillName));
		}
		case 'skills':
			if (rest.length > 0) {
				printUsageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: rest[0] }), 'mf explain --help', getExplainHelp(lang), lang);
				return null;
			}
			return withWhyTopic(getSkillsExplainOutput(projectRoot));
		case 'surface': {
			const [pathArg, ...extra] = rest;

			if (extra.length > 0) {
				printUsageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: extra[0] }), 'mf explain --help', getExplainHelp(lang), lang);
				return null;
			}

			return withWhyTopic(await getSurfaceExplainOutput(projectRoot, pathArg));
		}
		case 'latest-failure':
		case 'latest-run':
			if (rest.length > 0) {
				printUsageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: rest[0] }), 'mf explain --help', getExplainHelp(lang), lang);
				return null;
			}
			return getLatestFailureExplainOutput(projectRoot);
		default:
			printUsageError(
				reporter,
				t(lang, targetArg ? 'explain.error.unknownTopic' : 'explain.error.missingTopic', { topic: targetArg ?? '' }),
				'mf explain --help',
				getExplainHelp(lang),
				lang,
			);
			return null;
	}
}

function formatNullable(value: string | number | boolean | null, lang: CliLang): string {
	if (value === null) {
		return t(lang, 'value.none');
	}

	if (typeof value === 'boolean') {
		return value ? t(lang, 'value.yes') : t(lang, 'value.no');
	}

	return String(value);
}

function renderExplainDecision(output: ExplainOutput, lang: CliLang): string {
	const lines = [
		t(lang, 'explain.title'),
		`${t(lang, 'label.mustflowRoot')}: ${output.mustflow_root}`,
		`${t(lang, 'explain.label.topic')}: ${output.topic}`,
		`${t(lang, 'explain.label.decision')}: ${output.decision.decision}`,
		`${t(lang, 'explain.label.reason')}: ${output.decision.reason}`,
		`${t(lang, 'explain.label.effectiveAction')}: ${output.decision.effectiveAction}`,
		`${t(lang, 'explain.label.countsAsMustflowVerification')}: ${output.decision.countsAsMustflowVerification ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
		'',
		t(lang, 'explain.label.sourceFiles'),
		...output.decision.sourceFiles.map((sourceFile) => `- ${sourceFile}`),
	];

	if ('expectation' in output.decision && output.decision.expectation) {
		lines.push(
			'',
			t(lang, 'explain.label.expectedFrontmatter'),
			`- mustflow_doc: ${output.decision.expectation.docId}`,
			`- authority: ${output.decision.expectation.authority}`,
			`- lifecycle: ${output.decision.expectation.lifecycle}`,
		);
	}

	if ('verification' in output.decision) {
		lines.push(...renderVerifyExplainDecision(output.decision, lang));
	}

	if ('latestFailure' in output.decision) {
		const latest = output.decision.latestFailure;
		lines.push(
			'',
			'Latest run failure',
			`- path: ${latest.path}`,
			`- present: ${latest.present ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
			`- valid: ${latest.valid ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
			`- failed: ${latest.failed ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
			`- status: ${latest.status ?? t(lang, 'value.none')}`,
			`- intent: ${latest.intent ?? t(lang, 'value.none')}`,
			`- exit_code: ${latest.exitCode ?? t(lang, 'value.none')}`,
			`- error_kind: ${latest.errorKind ?? t(lang, 'value.none')}`,
			`- duration_ms: ${latest.durationMs ?? t(lang, 'value.none')}`,
			`- summary: ${latest.summary}`,
		);
	}

	if ('blockedRunPlan' in output.decision && output.decision.blockedRunPlan) {
		const plan = output.decision.blockedRunPlan;
		lines.push(
			'',
			t(lang, 'explain.label.blockedRunPlan'),
			`- runnable: ${plan.runnable ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
			`- reason_code: ${plan.reasonCode ?? t(lang, 'value.none')}`,
			`- detail: ${plan.detail ?? t(lang, 'value.none')}`,
			`- status: ${plan.status ?? t(lang, 'value.none')}`,
			`- lifecycle: ${plan.lifecycle ?? t(lang, 'value.none')}`,
			`- run_policy: ${plan.runPolicy ?? t(lang, 'value.none')}`,
			`- configured_cwd: ${plan.configuredCwd ?? t(lang, 'value.none')}`,
			`- timeout_seconds: ${plan.timeoutSeconds ?? t(lang, 'value.none')}`,
			`- mode: ${plan.mode ?? t(lang, 'value.none')}`,
			`- writes: ${plan.writes.join(', ') || t(lang, 'value.none')}`,
		);

		if (plan.suggestedIntentSnippet) {
			lines.push('', `${t(lang, 'run.label.suggestedIntentSnippet')}:`, plan.suggestedIntentSnippet);
		}
	}

	if ('boundary' in output.decision) {
		lines.push('', t(lang, 'explain.label.authorityBoundary'), `- role: ${output.decision.boundary.role}`);

		if (output.decision.boundary.canDefine.length > 0) {
			lines.push(`- ${t(lang, 'explain.label.canDefine')}:`);
			for (const item of output.decision.boundary.canDefine) {
				lines.push(`  - ${item}`);
			}
		}

		if (output.decision.boundary.cannotDefine.length > 0) {
			lines.push(`- ${t(lang, 'explain.label.cannotDefine')}:`);
			for (const item of output.decision.boundary.cannotDefine) {
				lines.push(`  - ${item}`);
			}
		}
	}

	if ('intent' in output.decision && output.decision.intent) {
		const intent = output.decision.intent;
		lines.push(
			'',
			t(lang, 'explain.label.commandIntent'),
			`- ${t(lang, 'explain.label.commandName')}: ${intent.name}`,
			`- status: ${intent.status ?? t(lang, 'value.none')}`,
			`- lifecycle: ${intent.lifecycle ?? t(lang, 'value.none')}`,
			`- run_policy: ${intent.runPolicy ?? t(lang, 'value.none')}`,
			`- stdin: ${intent.stdin ?? t(lang, 'value.none')}`,
			`- timeout_seconds: ${intent.timeoutSeconds ?? t(lang, 'value.none')}`,
			`- mode: ${intent.mode}`,
			`- cwd: ${intent.cwd ?? t(lang, 'value.none')}`,
			`- writes: ${intent.writes.join(', ') || t(lang, 'value.none')}`,
			`- network: ${formatNullable(intent.network, lang)}`,
			`- destructive: ${formatNullable(intent.destructive, lang)}`,
			`- success_exit_codes: ${intent.successExitCodes.join(', ') || t(lang, 'value.none')}`,
			`- required_after: ${intent.requiredAfter.join(', ') || t(lang, 'value.none')}`,
		);

		if (intent.preconditions.length > 0) {
			lines.push('- preconditions:');
			for (const precondition of intent.preconditions) {
				const target = precondition.path ?? precondition.artifact ?? precondition.label ?? precondition.kind;
				lines.push(`  - ${precondition.kind} ${target}: ${precondition.status}`);
				lines.push(`    detail: ${precondition.detail}`);
				if (precondition.satisfyIntent) {
					lines.push(
						`    satisfy_intent: ${precondition.satisfyIntent.intent} (${precondition.satisfyIntent.runnable ? 'runnable' : 'not_runnable'})`,
					);
				}
			}
		}
	}

	if ('effectGraph' in output.decision && output.decision.effectGraph) {
		const graph = output.decision.effectGraph;
		lines.push(
			'',
			'Command effect graph',
			`- source: ${graph.source}`,
			`- status: ${graph.status}`,
			`- index_fresh: ${graph.indexFresh ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
		);

		if (graph.refreshHint) {
			lines.push(`- refresh_hint: ${graph.refreshHint}`);
		}

		if (graph.stalePaths.length > 0) {
			lines.push(`- stale_paths: ${graph.stalePaths.join(', ')}`);
		}

		if (graph.writeLocks.length > 0) {
			lines.push('- write_locks:');
			for (const lock of graph.writeLocks) {
				lines.push(
					`  - ${lock.lock}`,
					`    paths: ${lock.paths.join(', ') || t(lang, 'value.none')}`,
					`    modes: ${lock.modes.join(', ') || t(lang, 'value.none')}`,
					`    concurrencies: ${lock.concurrencies.join(', ') || t(lang, 'value.none')}`,
				);
			}
		}

		if (graph.lockConflicts.length > 0) {
			lines.push('- lock_conflicts:');
			for (const conflict of graph.lockConflicts) {
				lines.push(
					`  - ${conflict.intent} (${conflict.lock})`,
					`    paths: ${conflict.paths.join(', ') || t(lang, 'value.none')}`,
					`    conflicting_paths: ${conflict.conflictingPaths.join(', ') || t(lang, 'value.none')}`,
				);
			}
		}
	}

	if ('retention' in output.decision) {
		const retention = output.decision.retention;
		lines.push(
			'',
			t(lang, 'explain.label.retentionPolicy'),
			`- enabled: ${formatNullable(retention.enabled, lang)}`,
			`- raw_events.store: ${formatNullable(retention.rawEvents.store, lang)}`,
			`- raw_events.on_limit: ${formatNullable(retention.rawEvents.onLimit, lang)}`,
			`- run_receipts.store: ${retention.runReceipts.store}`,
			`- run_receipts.max_file_kb: ${retention.runReceipts.maxFileKb}`,
			`- run_receipts.max_items: ${retention.runReceipts.maxItems}`,
			`- run_receipts.keep_stdout_tail_bytes: ${retention.runReceipts.stdoutTailBytes}`,
			`- run_receipts.keep_stderr_tail_bytes: ${retention.runReceipts.stderrTailBytes}`,
			`- knowledge.enabled: ${formatNullable(retention.knowledge.enabled, lang)}`,
			`- context.max_file_kb: ${retention.context.maxFileKb}`,
			`- repo_map.max_file_kb: ${retention.repoMap.maxFileKb}`,
			`- repo_map.fail_if_larger: ${formatNullable(retention.repoMap.failIfLarger, lang)}`,
		);
	}

	if ('alignment' in output.decision) {
		const alignment = output.decision.alignment;
		lines.push(
			'',
			t(lang, 'explain.label.skillRoutes'),
			`- status: ${alignment.status}`,
			`- issue_count: ${alignment.issueCount}`,
			`- summary: ${alignment.summary}`,
			`- action: ${alignment.action ?? t(lang, 'value.none')}`,
		);

		if (alignment.issues.length > 0) {
			lines.push(`- ${t(lang, 'doctor.section.issueList')}`);
			for (const issue of alignment.issues) {
				lines.push(`  - ${issue}`);
			}
		}
	}

	if ('route' in output.decision) {
		const route = output.decision.route;
		lines.push('', t(lang, 'explain.label.skillRoute'));

		if (!route) {
			lines.push(`- ${t(lang, 'value.none')}`);
		} else {
			lines.push(
				`- skill: ${route.skill}`,
				`- path: ${route.skillPath}`,
				`- trigger: ${route.trigger}`,
				`- required_input: ${route.requiredInput}`,
				`- edit_scope: ${route.editScope}`,
				`- risk: ${route.risk}`,
				`- verification_intents: ${route.verificationIntents.join(', ') || t(lang, 'value.none')}`,
				`- declared_command_intents: ${route.declaredCommandIntents.join(', ') || t(lang, 'value.none')}`,
				`- expected_output: ${route.expectedOutput}`,
			);
		}

		const evidence = output.decision.selectionEvidence;
		lines.push(
			'',
			'Skill selection evidence',
			`- matched_by: ${evidence.matchedBy.join(', ') || t(lang, 'value.none')}`,
			`- required_inputs: ${evidence.requiredInputs.join(', ') || t(lang, 'value.none')}`,
			`- missing_inputs: ${evidence.missingInputs.join(', ') || t(lang, 'value.none')}`,
			`- candidate_adjuncts: ${evidence.candidateAdjuncts.join(', ') || t(lang, 'value.none')}`,
			`- unmatched_paths: ${evidence.unmatchedPaths.join(', ') || t(lang, 'value.none')}`,
			`- gap_notes: ${evidence.gapNotes.join(' | ') || t(lang, 'value.none')}`,
		);
	}

	if ('surface' in output.decision) {
		const surface = output.decision.surface;
		lines.push(
			'',
			t(lang, 'explain.label.publicSurface'),
			`- kind: ${surface.kind}`,
			`- category: ${surface.category}`,
			`- is_public_surface: ${surface.isPublicSurface ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
			`- ${t(lang, 'explain.label.validationReasons')}: ${surface.validationReasons.join(', ') || t(lang, 'value.none')}`,
			`- ${t(lang, 'explain.label.affectedContracts')}: ${surface.affectedContracts.join(', ') || t(lang, 'value.none')}`,
			`- ${t(lang, 'classify.label.updatePolicy')}: ${surface.updatePolicy}`,
			`- ${t(lang, 'classify.label.driftChecks')}: ${surface.driftChecks.join(', ') || t(lang, 'value.none')}`,
		);

		const readModel = output.decision.readModel;
		if (readModel) {
			lines.push(
				'',
				'Local index path-surface model',
				`- status: ${readModel.status}`,
				`- index_fresh: ${readModel.indexFresh ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
			);

			if (readModel.refreshHint) {
				lines.push(`- refresh_hint: ${readModel.refreshHint}`);
			}

			if (readModel.stalePaths.length > 0) {
				lines.push(`- stale_paths: ${readModel.stalePaths.join(', ')}`);
			}

			if (readModel.match) {
				lines.push(
					`- rule_id: ${readModel.match.ruleId}`,
					`- pattern: ${readModel.match.pattern}`,
					`- change_kinds: ${readModel.match.changeKinds.join(', ') || t(lang, 'value.none')}`,
				);
			}
		}
	}

	if ('anchor' in output.decision) {
		const anchor = output.decision.anchor;
		lines.push('', 'Source anchor');

		if (!anchor) {
			lines.push(`- ${t(lang, 'value.none')}`);
		} else {
			lines.push(
				`- id: ${anchor.id}`,
				`- path: ${anchor.path}`,
				`- line_start: ${anchor.lineStart}`,
				`- purpose: ${anchor.purpose ?? t(lang, 'value.none')}`,
				`- search: ${anchor.search.join(', ') || t(lang, 'value.none')}`,
				`- invariant: ${anchor.invariant ?? t(lang, 'value.none')}`,
				`- risk: ${anchor.risk.join(', ') || t(lang, 'value.none')}`,
				`- navigation_only: ${anchor.navigationOnly ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
				`- can_instruct_agent: ${anchor.canInstructAgent ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
			);
		}
	}

	return lines.join('\n');
}

export async function runExplain(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getExplainHelp(lang));
		return 0;
	}

	const json = args.includes('--json');
	const positional = args.filter((arg) => arg !== '--json');
	const [topic, targetArg, ...rest] = positional;

	if (topic === '--why-blocked') {
		if (!targetArg) {
			printUsageError(reporter, t(lang, 'explain.error.missingCommand'), 'mf explain --help', getExplainHelp(lang), lang);
			return 1;
		}

		if (rest.length > 0) {
			printUsageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: rest[0] }), 'mf explain --help', getExplainHelp(lang), lang);
			return 1;
		}

		const output = getWhyBlockedExplainOutput(resolveMustflowRoot(), targetArg);
		if (json) {
			reporter.stdout(JSON.stringify(output, null, 2));
			return 0;
		}

		reporter.stdout(renderExplainDecision(output, lang));
		return 0;
	}

	if (topic === 'why') {
		const projectRoot = resolveMustflowRoot();
		const output = await getWhyExplainOutput(projectRoot, targetArg, rest, lang, reporter);

		if (!output) {
			return 1;
		}

		if (json) {
			reporter.stdout(JSON.stringify(output, null, 2));
			return 0;
		}

		reporter.stdout(renderExplainDecision(output, lang));
		return 0;
	}

	if (topic === 'verify') {
		const verifyArgs = targetArg === undefined ? rest : [targetArg, ...rest];
		const parsed = parseExplainVerifyArgs(verifyArgs);

		if (parsed.error) {
			printUsageError(reporter, explainVerifyArgErrorMessage(parsed.error, lang), 'mf explain --help', getExplainHelp(lang), lang);
			return 1;
		}

		const selectedInputCount = [parsed.reason, parsed.fromPlan].filter(Boolean).length;

		if (selectedInputCount > 1) {
			printUsageError(reporter, t(lang, 'verify.error.conflictingInputs'), 'mf explain --help', getExplainHelp(lang), lang);
			return 1;
		}

		if (selectedInputCount === 0) {
			printUsageError(reporter, t(lang, 'verify.error.missingReason'), 'mf explain --help', getExplainHelp(lang), lang);
			return 1;
		}

		const projectRoot = resolveMustflowRoot();
		let output: ExplainOutput;

		try {
			if (parsed.fromPlan) {
				const reasons = readExplainVerifyPlanReasons(projectRoot, parsed.fromPlan);
				output = await getVerifyExplainOutput(EXPLAIN_SCHEMA_VERSION, projectRoot, reasons, null, parsed.fromPlan);
			} else {
				output = await getVerifyExplainOutput(
					EXPLAIN_SCHEMA_VERSION,
					projectRoot,
					[parsed.reason as string],
					parsed.reason as string,
					null,
				);
			}
		} catch (error) {
			printUsageError(reporter, explainVerifyPlanErrorMessage(error, lang), 'mf explain --help', getExplainHelp(lang), lang);
			return 1;
		}

		if (json) {
			reporter.stdout(JSON.stringify(output, null, 2));
			return 0;
		}

		reporter.stdout(renderExplainDecision(output, lang));
		return 0;
	}

	const unsupported = args.filter((arg) => arg.startsWith('-') && arg !== '--json');

	if (unsupported.length > 0) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unknownOption', { option: unsupported[0] }),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (
		topic !== 'asset-optimization' &&
		topic !== 'anchor' &&
		topic !== 'authority' &&
		topic !== 'command' &&
		topic !== 'retention' &&
		topic !== 'skill' &&
		topic !== 'skills' &&
		topic !== 'surface'
	) {
		printUsageError(
			reporter,
			t(lang, topic ? 'explain.error.unknownTopic' : 'explain.error.missingTopic', { topic: topic ?? '' }),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (topic === 'command' && !targetArg) {
		printUsageError(
			reporter,
			t(lang, 'explain.error.missingCommand'),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (topic === 'skill' && !targetArg) {
		printUsageError(
			reporter,
			t(lang, 'explain.error.missingSkill'),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (topic === 'anchor' && !targetArg) {
		printUsageError(
			reporter,
			t(lang, 'explain.error.missingAnchor'),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (topic === 'retention' && targetArg) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: targetArg }),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (topic === 'asset-optimization' && targetArg) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: targetArg }),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (topic === 'anchor' && rest.length > 0) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: rest[0] }),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (topic === 'skills' && targetArg) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: targetArg }),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	if (rest.length > 0) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: rest[0] }),
			'mf explain --help',
			getExplainHelp(lang),
			lang,
		);
		return 1;
	}

	const projectRoot = resolveMustflowRoot();
	let output: ExplainOutput;

	switch (topic) {
		case 'anchor':
			output = getAnchorExplainOutput(projectRoot, targetArg);
			break;
		case 'asset-optimization':
			output = getAssetOptimizationExplainOutput(projectRoot);
			break;
		case 'authority':
			output = getAuthorityExplainOutput(projectRoot, targetArg);
			break;
		case 'command':
			output = await getCommandExplainOutput(projectRoot, targetArg);
			break;
		case 'retention':
			output = getRetentionExplainOutput(projectRoot);
			break;
		case 'skill':
			output = getSkillExplainOutput(projectRoot, targetArg);
			break;
		case 'surface':
			output = await getSurfaceExplainOutput(projectRoot, targetArg);
			break;
		case 'skills':
			output = getSkillsExplainOutput(projectRoot);
			break;
	}

	if (json) {
		reporter.stdout(JSON.stringify(output, null, 2));
		return 0;
	}

	reporter.stdout(renderExplainDecision(output, lang));
	return 0;
}
