import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import type { Reporter } from '../lib/reporter.js';

export function getDashboardHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf dashboard [options]',
			summary: t(lang, 'dashboard.help.summary'),
			options: [{ label: '-h, --help', description: t(lang, 'cli.option.help') }],
			examples: ['mf dashboard'],
			exitCodes: [
				{
					label: '0',
					description: t(lang, 'dashboard.help.exit.ok'),
				},
				{
					label: '1',
					description: t(lang, 'dashboard.help.exit.notImplemented'),
				},
			],
		},
		lang,
	);
}

function getNotImplementedMessage(lang: CliLang): string {
	return t(lang, 'dashboard.notImplemented');
}

export function runDashboard(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getDashboardHelp(lang));
		return 0;
	}

	const unsupported = args.find((arg) => arg.startsWith('-'));

	if (unsupported) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported }), 'mf dashboard --help', getDashboardHelp(lang), lang);
		return 1;
	}

	if (args.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: args[0] }), 'mf dashboard --help', getDashboardHelp(lang), lang);
		return 1;
	}

	reporter.stderr(getNotImplementedMessage(lang));
	return 1;
}
