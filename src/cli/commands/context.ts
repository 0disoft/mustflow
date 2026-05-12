import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { getAgentContext, getPromptCacheProfileContext, type PromptCacheProfile } from '../lib/agent-context.js';
import { t, type CliLang } from '../lib/i18n.js';
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
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf context --json', 'mf context --json --cache-profile stable'],
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

const CACHE_PROFILES = new Set<PromptCacheProfile>(['stable', 'task', 'volatile', 'all']);

function parseCacheProfile(args: string[]): { readonly profile: PromptCacheProfile | null; readonly error: string | null } {
	const index = args.indexOf('--cache-profile');

	if (index === -1) {
		return { profile: null, error: null };
	}

	const value = args[index + 1];

	if (!value || value.startsWith('-')) {
		return { profile: null, error: 'missing' };
	}

	if (!CACHE_PROFILES.has(value as PromptCacheProfile)) {
		return { profile: null, error: value };
	}

	return { profile: value as PromptCacheProfile, error: null };
}

export async function runContext(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getContextHelp(lang));
		return 0;
	}

	const supported = new Set(['--json', '--cache-profile']);
	const cacheProfile = parseCacheProfile(args);
	const unsupported = args.filter((arg, index) => {
		if (arg === '--cache-profile') {
			return false;
		}

		if (index > 0 && args[index - 1] === '--cache-profile') {
			return false;
		}

		return !supported.has(arg);
	});

	if (unsupported.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported[0] }), 'mf context --help', getContextHelp(lang), lang);
		return 1;
	}

	if (cacheProfile.error === 'missing') {
		printUsageError(reporter, t(lang, 'cli.error.missingValue', { option: '--cache-profile' }), 'mf context --help', getContextHelp(lang), lang);
		return 1;
	}

	if (cacheProfile.error) {
		printUsageError(reporter, t(lang, 'cli.error.unexpectedValue', { option: '--cache-profile' }), 'mf context --help', getContextHelp(lang), lang);
		return 1;
	}

	if (cacheProfile.profile && !args.includes('--json')) {
		printUsageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: '--cache-profile' }), 'mf context --help', getContextHelp(lang), lang);
		return 1;
	}

	const mustflowRoot = resolveMustflowRoot();

	if (args.includes('--json')) {
		if (cacheProfile.profile) {
			reporter.stdout(JSON.stringify(await getPromptCacheProfileContext(mustflowRoot, cacheProfile.profile), null, 2));
			return 0;
		}

		const context = getAgentContext(mustflowRoot);
		reporter.stdout(JSON.stringify(context, null, 2));
		return 0;
	}

	const context = getAgentContext(mustflowRoot);
	reporter.stdout(t(lang, 'context.title'));
	reporter.stdout(`${t(lang, 'label.installed')}: ${context.installed ? 'yes' : 'no'}`);
	reporter.stdout(`${t(lang, 'label.mustflowRoot')}: ${context.mustflow_root}`);
	reporter.stdout(`${t(lang, 'label.commandContract')}: ${context.command_contract.exists ? 'present' : 'missing'}`);
	reporter.stdout(`${t(lang, 'label.runnableIntents')}: ${context.command_contract.runnable_intents.length}`);
	reporter.stdout(`${t(lang, 'label.latestRun')}: ${context.latest_run.exists ? 'present' : 'missing'}`);

	return 0;
}
