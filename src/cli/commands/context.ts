import { printUsageError, renderHelp } from '../lib/cli-output.js';
import {
	getAgentContext,
	getPromptCacheProfileContext,
	type PromptCacheRouteInput,
	type PromptCacheProfile,
} from '../lib/agent-context.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type ParsedCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

export function getContextHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf context [options]',
			summary: t(lang, 'context.help.summary'),
			options: [
				{
					label: '--json',
					description: t(lang, 'context.help.option.json'),
				},
				{
					label: '--cache-profile <profile>',
					description: t(lang, 'context.help.option.cacheProfile'),
				},
				{
					label: '--cache-audit',
					description: t(lang, 'context.help.option.cacheAudit'),
				},
				{
					label: '--cache-compare <path>',
					description: 'Compare the current prompt bundle with a prior context JSON report inside the mustflow root.',
				},
				{ label: '--task <text>', description: 'Task text used to resolve selected task-layer skill context.' },
				{ label: '--path <path>', description: 'Changed or expected path for task-layer route resolution; may be repeated.' },
				{ label: '--reason <reason>', description: 'Classification or verification reason for route resolution; may be repeated.' },
				{ label: '--max-candidates <count>', description: 'Maximum skill route candidates to consider while resolving task context.' },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf context --json',
				'mf context --json --cache-profile stable',
				'mf context --json --cache-audit',
				'mf context --json --cache-profile all --cache-compare .mustflow/cache/baseline-context.json',
				'mf context --json --cache-audit --task "change TypeScript CLI output" --path src/cli/commands/context.ts --reason code_change',
			],
			exitCodes: [
				{
					label: '0',
					description: t(lang, 'context.help.exit.ok'),
				},
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

const CONTEXT_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--cache-profile', kind: 'string' },
	{ name: '--cache-audit', kind: 'boolean' },
	{ name: '--cache-compare', kind: 'string' },
	{ name: '--task', kind: 'string' },
	{ name: '--path', kind: 'string' },
	{ name: '--reason', kind: 'string' },
	{ name: '--max-candidates', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];
const CACHE_PROFILES = new Set<PromptCacheProfile>(['stable', 'task', 'volatile', 'all']);

function parseCacheProfile(value: string | null): { readonly profile: PromptCacheProfile | null; readonly invalid: boolean } {
	if (value === null) {
		return { profile: null, invalid: false };
	}

	if (!CACHE_PROFILES.has(value as PromptCacheProfile)) {
		return { profile: null, invalid: true };
	}

	return { profile: value as PromptCacheProfile, invalid: false };
}

function parseMaxCandidates(value: string | null): number | undefined {
	if (value === null) {
		return undefined;
	}

	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function getParsedCliStringOptions(parsed: ParsedCliOptions, name: string): string[] {
	return parsed.occurrences
		.filter((occurrence) => occurrence.name === name && typeof occurrence.value === 'string')
		.map((occurrence) => occurrence.value as string);
}

function hasRouteSignalOptions(parsed: ParsedCliOptions): boolean {
	return (
		getParsedCliStringOption(parsed, '--task') !== null ||
		getParsedCliStringOption(parsed, '--max-candidates') !== null ||
		getParsedCliStringOptions(parsed, '--path').length > 0 ||
		getParsedCliStringOptions(parsed, '--reason').length > 0
	);
}

function readPromptCacheRouteInput(parsed: ParsedCliOptions): PromptCacheRouteInput {
	return {
		taskText: getParsedCliStringOption(parsed, '--task'),
		paths: getParsedCliStringOptions(parsed, '--path'),
		reasons: getParsedCliStringOptions(parsed, '--reason'),
		maxCandidates: parseMaxCandidates(getParsedCliStringOption(parsed, '--max-candidates')),
	};
}

export async function runContext(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getContextHelp(lang));
		return 0;
	}

	const parsed = parseCliOptions(args, CONTEXT_OPTIONS);
	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf context --help', getContextHelp(lang), lang);
		return 1;
	}

	const cacheProfile = parseCacheProfile(getParsedCliStringOption(parsed, '--cache-profile'));
	if (cacheProfile.invalid) {
		printUsageError(reporter, t(lang, 'cli.error.unexpectedValue', { option: '--cache-profile' }), 'mf context --help', getContextHelp(lang), lang);
		return 1;
	}

	const jsonRequested = hasParsedCliOption(parsed, '--json');
	const cacheAudit = hasParsedCliOption(parsed, '--cache-audit');
	const cacheComparePath = getParsedCliStringOption(parsed, '--cache-compare');
	const routeSignalOptions = hasRouteSignalOptions(parsed);
	const routeInput = readPromptCacheRouteInput(parsed);

	if (Number.isNaN(routeInput.maxCandidates)) {
		printUsageError(reporter, t(lang, 'cli.error.unexpectedValue', { option: '--max-candidates' }), 'mf context --help', getContextHelp(lang), lang);
		return 1;
	}

	if (cacheProfile.profile && !jsonRequested) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: '--cache-profile' }),
			'mf context --help',
			getContextHelp(lang),
			lang,
		);
		return 1;
	}

	if (cacheAudit && !jsonRequested) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: '--cache-audit' }),
			'mf context --help',
			getContextHelp(lang),
			lang,
		);
		return 1;
	}

	if (cacheComparePath && !jsonRequested) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: '--cache-compare' }),
			'mf context --help',
			getContextHelp(lang),
			lang,
		);
		return 1;
	}

	if (routeSignalOptions && !jsonRequested) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedArgument', { argument: '--task/--path/--reason/--max-candidates' }),
			'mf context --help',
			getContextHelp(lang),
			lang,
		);
		return 1;
	}

	const mustflowRoot = resolveMustflowRoot();

	if (jsonRequested) {
		if (cacheProfile.profile || cacheAudit || cacheComparePath || routeSignalOptions) {
			reporter.stdout(
				JSON.stringify(
					await getPromptCacheProfileContext(mustflowRoot, cacheProfile.profile ?? 'all', {
						includeAudit: cacheAudit,
						comparePath: cacheComparePath,
						routeInput,
					}),
					null,
					2,
				),
			);
			return 0;
		}

		const context = getAgentContext(mustflowRoot);
		reporter.stdout(JSON.stringify(context, null, 2));
		return 0;
	}

	const context = getAgentContext(mustflowRoot);
	reporter.stdout(t(lang, 'context.title'));
	reporter.stdout(`${t(lang, 'label.installed')}: ${context.installed ? t(lang, 'value.yes') : t(lang, 'value.no')}`);
	reporter.stdout(`${t(lang, 'label.mustflowRoot')}: ${context.mustflow_root}`);
	reporter.stdout(`${t(lang, 'label.commandContract')}: ${context.command_contract.exists ? t(lang, 'value.present') : t(lang, 'value.missing')}`);
	reporter.stdout(`${t(lang, 'label.runnableIntents')}: ${context.command_contract.runnable_intents.length}`);
	reporter.stdout(`Technology preferences: ${context.technology_preferences.exists ? t(lang, 'value.present') : t(lang, 'value.missing')} (${context.technology_preferences.count})`);
	reporter.stdout(`${t(lang, 'label.latestRun')}: ${context.latest_run.exists ? t(lang, 'value.present') : t(lang, 'value.missing')}`);

	return 0;
}
