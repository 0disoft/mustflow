import { createClassifyOutput, type ClassifyOutput } from './classify.js';
import {
	createChangeVerificationReport,
	type ChangeVerificationGap,
	type ChangeVerificationReport,
} from '../../core/change-verification.js';
import {
	isRecord,
	readCommandContract,
	type CommandContract,
} from '../../core/config-loading.js';
import { createVerificationPlanId } from '../../core/verification-plan-id.js';
import {
	createScriptPackSuggestionReport,
	type ScriptPackSuggestionReport,
} from '../../core/script-pack-suggestions.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { getAgentContext } from '../lib/agent-context.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { createRunPlan } from '../lib/run-plan.js';
import { listScriptPackScripts } from '../lib/script-pack-registry.js';
import { checkMustflowProjectReport } from '../lib/validation.js';

const NEXT_SCHEMA_VERSION = '1';
const COMMAND_AUTHORITY = '.mustflow/config/commands.toml';
const NEXT_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
] as const;

type NextStatus = 'setup_required' | 'blocked' | 'idle' | 'needs_verification' | 'unavailable';
type NextActionKind = 'setup' | 'repair' | 'inspect' | 'configure_commands' | 'verify' | 'none';

interface NextAction {
	readonly kind: NextActionKind;
	readonly command: string | null;
	readonly title: string;
	readonly detail: string;
}

interface NextStateSummary {
	readonly installed: boolean;
	readonly check_ok: boolean;
	readonly command_contract_ok: boolean;
	readonly git_status: 'available' | 'unavailable';
	readonly changed_file_count: number | null;
	readonly validation_reasons: readonly string[];
	readonly selected_intents: readonly string[];
	readonly gap_count: number;
}

interface NextGap {
	readonly reason: string;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly detail: string;
}

type NextScriptPackSuggestions = Pick<
	ScriptPackSuggestionReport,
	'status' | 'input' | 'analyzed_paths' | 'suggestions' | 'issues'
>;

interface NextOutput {
	readonly schema_version: '1';
	readonly command: 'next';
	readonly mustflow_root: string;
	readonly status: NextStatus;
	readonly policy: {
		readonly command_authority: typeof COMMAND_AUTHORITY;
		readonly direct_commands_allowed: false;
		readonly grants_command_authority: false;
		readonly writes_files: false;
	};
	readonly state: NextStateSummary;
	readonly decision: NextAction;
	readonly recommended_commands: readonly string[];
	readonly blockers: readonly string[];
	readonly warnings: readonly string[];
	readonly gaps: readonly NextGap[];
	readonly script_pack_suggestions: NextScriptPackSuggestions;
	readonly verification_plan_id: string | null;
}

export function getNextHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf next [options]',
			summary: t(lang, 'next.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf next', 'mf next --json'],
			exitCodes: [
				{ label: '0', description: t(lang, 'next.help.exit.ok') },
				{ label: '1', description: t(lang, 'next.help.exit.fail') },
			],
		},
		lang,
	);
}

function createPolicy(): NextOutput['policy'] {
	return {
		command_authority: COMMAND_AUTHORITY,
		direct_commands_allowed: false,
		grants_command_authority: false,
		writes_files: false,
	};
}

function createState(
	input: Partial<NextStateSummary> & Pick<NextStateSummary, 'installed' | 'check_ok' | 'command_contract_ok'>,
): NextStateSummary {
	return {
		installed: input.installed,
		check_ok: input.check_ok,
		command_contract_ok: input.command_contract_ok,
		git_status: input.git_status ?? 'unavailable',
		changed_file_count: input.changed_file_count ?? null,
		validation_reasons: input.validation_reasons ?? [],
		selected_intents: input.selected_intents ?? [],
		gap_count: input.gap_count ?? 0,
	};
}

function action(kind: NextActionKind, command: string | null, title: string, detail: string): NextAction {
	return { kind, command, title, detail };
}

function toOutput(input: {
	readonly mustflowRoot: string;
	readonly status: NextStatus;
	readonly state: NextStateSummary;
	readonly decision: NextAction;
	readonly recommendedCommands: readonly string[];
	readonly blockers?: readonly string[];
	readonly warnings?: readonly string[];
	readonly gaps?: readonly NextGap[];
	readonly scriptPackSuggestions?: NextScriptPackSuggestions;
	readonly verificationPlanId?: string | null;
}): NextOutput {
	return {
		schema_version: NEXT_SCHEMA_VERSION,
		command: 'next',
		mustflow_root: input.mustflowRoot,
		status: input.status,
		policy: createPolicy(),
		state: input.state,
		decision: input.decision,
		recommended_commands: uniqueCommands(input.recommendedCommands),
		blockers: input.blockers ?? [],
		warnings: input.warnings ?? [],
		gaps: input.gaps ?? [],
		script_pack_suggestions: input.scriptPackSuggestions ?? createEmptyScriptPackSuggestions(),
		verification_plan_id: input.verificationPlanId ?? null,
	};
}

function uniqueCommands(commands: readonly string[]): readonly string[] {
	return [...new Set(commands.filter((command) => command.length > 0))];
}

function selectedIntents(report: ChangeVerificationReport): readonly string[] {
	return report.schedule.entries.map((entry) => entry.intent);
}

function toNextGap(gap: ChangeVerificationGap): NextGap {
	return {
		reason: gap.reason,
		files: gap.files,
		surfaces: gap.surfaces,
		detail: gap.detail,
	};
}

function createEmptyScriptPackSuggestions(): NextScriptPackSuggestions {
	return {
		status: 'empty',
		input: {
			phases: [],
			skills: [],
			paths: [],
			changed: false,
		},
		analyzed_paths: [],
		suggestions: [],
		issues: [],
	};
}

function createNextScriptPackSuggestions(
	mustflowRoot: string,
	classification: ClassifyOutput,
): NextScriptPackSuggestions {
	if (classification.files.length === 0) {
		return createEmptyScriptPackSuggestions();
	}

	const report = createScriptPackSuggestionReport(mustflowRoot, {
		changed: false,
		phases: ['after_change', 'review'],
		skills: [],
		paths: classification.files,
		scripts: listScriptPackScripts(),
	});

	return {
		status: report.status,
		input: report.input,
		analyzed_paths: report.analyzed_paths,
		suggestions: report.suggestions,
		issues: report.issues,
	};
}

function runnableIntentCommand(mustflowRoot: string, contract: CommandContract, intentName: string): string | null {
	const rawIntent = contract.intents[intentName];
	if (!isRecord(rawIntent)) {
		return null;
	}

	return createRunPlan(mustflowRoot, contract, intentName).ok ? `mf run ${intentName}` : null;
}

function fallbackCommands(mustflowRoot: string, contract: CommandContract): readonly string[] {
	return [
		'mf api verification-plan --changed --json',
		'mf onboard commands',
		runnableIntentCommand(mustflowRoot, contract, 'mustflow_check') ?? '',
	];
}

function createChangedOutput(
	mustflowRoot: string,
	contract: CommandContract,
	classification: ClassifyOutput,
	report: ChangeVerificationReport,
): NextOutput {
	const intents = selectedIntents(report);
	const gaps = report.gaps.map(toNextGap);
	const verificationPlanId = createVerificationPlanId(report, contract);
	const scriptPackSuggestions = createNextScriptPackSuggestions(mustflowRoot, classification);
	const state = createState({
		installed: true,
		check_ok: true,
		command_contract_ok: true,
		git_status: 'available',
		changed_file_count: classification.summary.fileCount,
		validation_reasons: classification.summary.validationReasons,
		selected_intents: intents,
		gap_count: gaps.length,
	});

	if (gaps.length > 0) {
		const detail = gaps[0]?.detail ?? 'At least one changed-file requirement has no runnable configured command.';
		return toOutput({
			mustflowRoot,
			status: 'blocked',
			state,
			decision: action(
				'configure_commands',
				'mf onboard commands',
				'Review command-contract gaps',
				`${detail} Do not guess package-manager commands directly.`,
			),
			recommendedCommands: [...fallbackCommands(mustflowRoot, contract), ...(intents.length > 0 ? ['mf verify --changed --json'] : [])],
			blockers: gaps.map((gap) => gap.detail),
			gaps,
			scriptPackSuggestions,
			verificationPlanId,
		});
	}

	if (intents.length > 0) {
		return toOutput({
			mustflowRoot,
			status: 'needs_verification',
			state,
			decision: action(
				'verify',
				'mf verify --changed --json',
				'Run configured verification',
				'Changed files have runnable configured verification intents. Use mustflow verification instead of direct commands.',
			),
			recommendedCommands: ['mf api verification-plan --changed --json', 'mf verify --changed --json'],
			scriptPackSuggestions,
			verificationPlanId,
		});
	}

	return toOutput({
		mustflowRoot,
		status: 'idle',
		state,
		decision: action('inspect', 'mf api verification-plan --changed --json', 'Inspect verification plan', 'No runnable verification entries were selected.'),
		recommendedCommands: ['mf api verification-plan --changed --json'],
		scriptPackSuggestions,
		verificationPlanId,
	});
}

function createNextOutput(): NextOutput {
	const mustflowRoot = resolveMustflowRoot();
	const context = getAgentContext(mustflowRoot);
	const check = checkMustflowProjectReport(mustflowRoot, { strict: false });

	if (!context.installed) {
		return toOutput({
			mustflowRoot,
			status: 'setup_required',
			state: createState({ installed: false, check_ok: false, command_contract_ok: false }),
			decision: action('setup', 'mf init --dry-run', 'Install mustflow workflow', 'This root does not have a complete mustflow installation yet.'),
			recommendedCommands: ['mf init --dry-run', 'mf init --yes'],
			blockers: ['mustflow is not installed in this root'],
		});
	}

	if (check.issues.length > 0) {
		return toOutput({
			mustflowRoot,
			status: 'blocked',
			state: createState({
				installed: true,
				check_ok: false,
				command_contract_ok: context.command_contract.exists,
			}),
			decision: action('repair', 'mf check --strict', 'Fix mustflow contract issues', 'The installed workflow has validation issues; inspect those before choosing verification.'),
			recommendedCommands: ['mf check --strict', 'mf status --json', 'mf update --dry-run'],
			blockers: check.issues,
			warnings: check.warnings,
		});
	}

	let contract: CommandContract;
	try {
		contract = readCommandContract(mustflowRoot);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return toOutput({
			mustflowRoot,
			status: 'blocked',
			state: createState({ installed: true, check_ok: true, command_contract_ok: false }),
			decision: action('repair', 'mf check --strict', 'Repair command contract', 'The command contract could not be read.'),
			recommendedCommands: ['mf check --strict', 'mf doctor --json'],
			blockers: [message],
		});
	}

	let classification: ClassifyOutput;
	try {
		classification = createClassifyOutput(mustflowRoot, 'changed', []);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return toOutput({
			mustflowRoot,
			status: 'unavailable',
			state: createState({ installed: true, check_ok: true, command_contract_ok: true }),
			decision: action('inspect', 'mf doctor --json', 'Inspect repository state', 'Changed-file detection is unavailable.'),
			recommendedCommands: ['mf doctor --json', 'mf context --json'],
			warnings: [message],
		});
	}

	if (classification.summary.fileCount === 0) {
		return toOutput({
			mustflowRoot,
			status: 'idle',
			state: createState({
				installed: true,
				check_ok: true,
				command_contract_ok: true,
				git_status: 'available',
				changed_file_count: 0,
			}),
			decision: action('none', null, 'No changed files', 'There is no changed-file verification to select.'),
			recommendedCommands: ['mf doctor --json', 'mf context --json'],
		});
	}

	try {
		const report = createChangeVerificationReport(classification, contract, mustflowRoot);
		return createChangedOutput(mustflowRoot, contract, classification, report);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return toOutput({
			mustflowRoot,
			status: 'unavailable',
			state: createState({
				installed: true,
				check_ok: true,
				command_contract_ok: true,
				git_status: 'available',
				changed_file_count: classification.summary.fileCount,
				validation_reasons: classification.summary.validationReasons,
			}),
			decision: action('inspect', 'mf api verification-plan --changed --json', 'Inspect verification plan', 'Verification planning could not be summarized.'),
			recommendedCommands: ['mf api verification-plan --changed --json', 'mf doctor --json'],
			warnings: [message],
		});
	}
}

function renderList(values: readonly string[], lang: CliLang): string {
	return values.length > 0 ? values.join(', ') : t(lang, 'value.none');
}

function renderNextOutput(output: NextOutput, lang: CliLang): string {
	const lines = [
		t(lang, 'next.title'),
		`${t(lang, 'label.mustflowRoot')}: ${output.mustflow_root}`,
		`${t(lang, 'next.label.status')}: ${output.status}`,
		`${t(lang, 'next.label.nextAction')}: ${output.decision.command ?? t(lang, 'value.none')}`,
		`${t(lang, 'next.label.reason')}: ${output.decision.detail}`,
		`${t(lang, 'label.changedFiles')}: ${output.state.changed_file_count ?? t(lang, 'value.none')}`,
		`${t(lang, 'classify.label.validationReasons')}: ${renderList(output.state.validation_reasons, lang)}`,
		`${t(lang, 'next.label.selectedIntents')}: ${renderList(output.state.selected_intents, lang)}`,
		`${t(lang, 'next.label.gaps')}: ${output.gaps.length}`,
	];

	if (output.gaps.length > 0) {
		lines.push('', t(lang, 'next.section.gaps'));
		for (const gap of output.gaps) {
			lines.push(`- ${gap.reason}: ${gap.detail}`);
		}
	}

	if (output.blockers.length > 0) {
		lines.push('', t(lang, 'next.section.blockers'));
		for (const blocker of output.blockers) {
			lines.push(`- ${blocker}`);
		}
	}

	if (output.warnings.length > 0) {
		lines.push('', t(lang, 'next.section.warnings'));
		for (const warning of output.warnings) {
			lines.push(`- ${warning}`);
		}
	}

	if (output.script_pack_suggestions.suggestions.length > 0 || output.script_pack_suggestions.issues.length > 0) {
		lines.push('', t(lang, 'scriptPack.suggest.label.recommendations'));
		for (const suggestion of output.script_pack_suggestions.suggestions) {
			lines.push(`- ${suggestion.script_ref}: ${suggestion.confidence}, score ${suggestion.score}`);
			lines.push(`  ${t(lang, 'scriptPack.suggest.label.runHint')}: ${suggestion.run_hint}`);
		}

		for (const issue of output.script_pack_suggestions.issues) {
			lines.push(`- ${issue}`);
		}
	}

	lines.push('', t(lang, 'next.section.commands'));
	for (const command of output.recommended_commands) {
		lines.push(`- ${command}`);
	}

	lines.push('', t(lang, 'update.plan.noFilesWritten'));

	return lines.join('\n');
}

export function runNext(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getNextHelp(lang));
		return 0;
	}

	const options = parseCliOptions(args, NEXT_OPTIONS);
	if (options.error) {
		printUsageError(reporter, formatCliOptionParseError(options.error, lang), 'mf next --help', getNextHelp(lang), lang);
		return 1;
	}

	const output = createNextOutput();
	if (hasParsedCliOption(options, '--json')) {
		reporter.stdout(JSON.stringify(output, null, 2));
	} else {
		reporter.stdout(renderNextOutput(output, lang));
	}

	return output.status === 'unavailable' ? 1 : 0;
}
