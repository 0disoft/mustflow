import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { getAgentContext } from '../lib/agent-context.js';
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
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf context --json'],
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

export function runContext(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getContextHelp(lang));
		return 0;
	}

	const supported = new Set(['--json']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported[0] }), 'mf context --help', getContextHelp(lang), lang);
		return 1;
	}

	const context = getAgentContext(resolveMustflowRoot());

	if (args.includes('--json')) {
		reporter.stdout(JSON.stringify(context, null, 2));
		return 0;
	}

	reporter.stdout(t(lang, 'context.title'));
	reporter.stdout(`${t(lang, 'label.installed')}: ${context.installed ? 'yes' : 'no'}`);
	reporter.stdout(`${t(lang, 'label.mustflowRoot')}: ${context.mustflow_root}`);
	reporter.stdout(`${t(lang, 'label.commandContract')}: ${context.command_contract.exists ? 'present' : 'missing'}`);
	reporter.stdout(`${t(lang, 'label.runnableIntents')}: ${context.command_contract.runnable_intents.length}`);
	reporter.stdout(`${t(lang, 'label.latestRun')}: ${context.latest_run.exists ? 'present' : 'missing'}`);

	return 0;
}
