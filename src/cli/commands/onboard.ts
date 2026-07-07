import {
	lintCommandContract,
	type ContractLintReport,
	type ContractLintSuggestion,
} from '../../core/contract-lint.js';
import { readCommandContract } from '../../core/config-loading.js';
import { readEffectivePreferencesToml } from '../../core/preferences.js';
import { releaseVersioningIsEnabled } from '../../core/version-sources.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

const ONBOARD_COMMANDS_SCHEMA_VERSION = '1';
const COMMAND_CONTRACT_PATH = '.mustflow/config/commands.toml';
const ONBOARD_COMMANDS_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
] as const;

interface OnboardCommandsOutput {
	readonly schema_version: '1';
	readonly command: 'onboard commands';
	readonly mustflow_root: string;
	readonly command_contract_path: '.mustflow/config/commands.toml';
	readonly policy: {
		readonly command_authority: '.mustflow/config/commands.toml';
		readonly suggestions_grant_command_authority: false;
		readonly suggestions_are_review_only: true;
		readonly writes_files: false;
	};
	readonly summary: {
		readonly total_intents: number;
		readonly runnable_intents: number;
		readonly manual_only_intents: number;
		readonly unknown_intents: number;
		readonly suggestions: number;
		readonly package_scripts: number;
		readonly make_targets: number;
		readonly just_recipes: number;
		readonly contract_errors: number;
		readonly contract_warnings: number;
	};
	readonly suggestions: readonly ContractLintSuggestion[];
	readonly next_steps: readonly string[];
}

export function getOnboardHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf onboard commands [options]',
			summary: t(lang, 'onboard.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf onboard commands', 'mf onboard commands --json'],
			exitCodes: [
				{ label: '0', description: t(lang, 'onboard.help.exit.ok') },
				{ label: '1', description: t(lang, 'onboard.help.exit.fail') },
			],
		},
		lang,
	);
}

function countSuggestionsByKind(
	suggestions: readonly ContractLintSuggestion[],
	sourceKind: ContractLintSuggestion['sourceKind'],
): number {
	return suggestions.filter((suggestion) => suggestion.sourceKind === sourceKind).length;
}

function createNextSteps(suggestions: readonly ContractLintSuggestion[]): readonly string[] {
	if (suggestions.length === 0) {
		return [
			'No package.json scripts, Makefile targets, or justfile recipes need review-only command-intent suggestions.',
			'Keep command execution authority in .mustflow/config/commands.toml.',
		];
	}

	return [
		'Review each suggested unknown intent before copying it into .mustflow/config/commands.toml.',
		'Do not add argv, lifecycle, run_policy, stdin, timeout_seconds, writes, network, or destructive fields until a maintainer has reviewed the command behavior.',
		'After accepting any snippet, run command-contract validation through the configured mustflow check intent.',
	];
}

function createOnboardCommandsOutput(projectRoot: string): OnboardCommandsOutput {
	const report: ContractLintReport = lintCommandContract(readCommandContract(projectRoot), {
		suggest: true,
		projectRoot,
		releaseVersioningEnabled: releaseVersioningIsEnabled(readEffectivePreferencesToml(projectRoot)),
	});
	const suggestions = report.suggestions ?? [];

	return {
		schema_version: ONBOARD_COMMANDS_SCHEMA_VERSION,
		command: 'onboard commands',
		mustflow_root: projectRoot,
		command_contract_path: COMMAND_CONTRACT_PATH,
		policy: {
			command_authority: COMMAND_CONTRACT_PATH,
			suggestions_grant_command_authority: false,
			suggestions_are_review_only: true,
			writes_files: false,
		},
		summary: {
			total_intents: report.summary.totalIntents,
			runnable_intents: report.summary.runnable,
			manual_only_intents: report.summary.manualOnly,
			unknown_intents: report.summary.unknown,
			suggestions: suggestions.length,
			package_scripts: countSuggestionsByKind(suggestions, 'package_script'),
			make_targets: countSuggestionsByKind(suggestions, 'make_target'),
			just_recipes: countSuggestionsByKind(suggestions, 'just_recipe'),
			contract_errors: report.summary.errors,
			contract_warnings: report.summary.warnings,
		},
		suggestions,
		next_steps: createNextSteps(suggestions),
	};
}

function renderOnboardCommandsOutput(output: OnboardCommandsOutput, lang: CliLang): string {
	const reviewOnlyValue = output.policy.suggestions_are_review_only ? t(lang, 'value.yes') : t(lang, 'value.no');
	const writesFilesValue = output.policy.writes_files ? t(lang, 'value.yes') : t(lang, 'value.no');
	const lines = [
		t(lang, 'onboard.title'),
		`${t(lang, 'label.mustflowRoot')}: ${output.mustflow_root}`,
		`${t(lang, 'label.commandContract')}: ${output.command_contract_path}`,
		`${t(lang, 'onboard.label.suggestions')}: ${output.summary.suggestions}`,
		`${t(lang, 'onboard.label.reviewOnly')}: ${reviewOnlyValue}`,
		`${t(lang, 'onboard.label.writesFiles')}: ${writesFilesValue}`,
	];

	if (output.suggestions.length > 0) {
		lines.push('', t(lang, 'onboard.label.reviewSnippets'));
		for (const suggestion of output.suggestions) {
			lines.push(`- ${suggestion.sourceFile}:${suggestion.sourceName} -> ${suggestion.suggestedIntent}`);
			lines.push(...suggestion.snippet.split('\n').map((line) => `  ${line}`));
		}
	}

	lines.push('', t(lang, 'onboard.label.nextSteps'));
	for (const step of output.next_steps) {
		lines.push(`- ${step}`);
	}

	return lines.join('\n');
}

export function runOnboard(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getOnboardHelp(lang));
		return 0;
	}

	const [action, ...rest] = args;
	if (action !== 'commands') {
		printUsageError(
			reporter,
			t(lang, action ? 'onboard.error.unknownAction' : 'onboard.error.missingAction', { action: action ?? '' }),
			'mf onboard --help',
			getOnboardHelp(lang),
			lang,
		);
		return 1;
	}

	const options = parseCliOptions(rest, ONBOARD_COMMANDS_OPTIONS);
	if (options.error) {
		printUsageError(
			reporter,
			formatCliOptionParseError(options.error, lang),
			'mf onboard --help',
			getOnboardHelp(lang),
			lang,
		);
		return 1;
	}

	const output = createOnboardCommandsOutput(resolveMustflowRoot());
	if (hasParsedCliOption(options, '--json')) {
		reporter.stdout(JSON.stringify(output, null, 2));
	} else {
		reporter.stdout(renderOnboardCommandsOutput(output, lang));
	}

	return 0;
}
