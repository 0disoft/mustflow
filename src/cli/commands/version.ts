import { printUsageError, renderCliError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { checkNpmLatestVersion, type PackageVersionCheck } from '../lib/npm-version-check.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
} from '../lib/option-parser.js';
import { readPackageMetadata } from '../lib/package-info.js';
import type { Reporter } from '../lib/reporter.js';

const VERSION_OPTIONS = [
	{ name: '--check', kind: 'boolean' },
] as const;

export function getVersionHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf version [options]',
			summary: t(lang, 'version.help.summary'),
			options: [
				{ label: '--check', description: t(lang, 'version.help.option.check') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf version', 'mf version --check'],
			exitCodes: [
				{ label: '0', description: t(lang, 'version.help.exit.ok') },
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

function renderVersionCheck(check: PackageVersionCheck, lang: CliLang): string {
	const lines = [
		`${check.packageName} ${check.currentVersion}`,
		check.updateAvailable
			? t(lang, 'version.check.latestAvailable', { version: check.latestVersion })
			: t(lang, 'version.check.upToDate', { version: check.latestVersion }),
	];

	if (check.updateAvailable) {
		lines.push(
			'',
			t(lang, 'version.check.updateCommand'),
			...check.updateCommands.map((entry) => `${entry.manager}: ${entry.command}`),
		);
	}

	return lines.join('\n');
}

export async function runVersion(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getVersionHelp(lang));
		return 0;
	}

	const options = parseCliOptions(args, VERSION_OPTIONS);
	if (options.error) {
		printUsageError(
			reporter,
			formatCliOptionParseError(options.error, lang),
			'mf version --help',
			getVersionHelp(lang),
			lang,
		);
		return 1;
	}

	const metadata = readPackageMetadata();

	if (!hasParsedCliOption(options, '--check')) {
		reporter.stdout(metadata.version);
		return 0;
	}

	try {
		reporter.stdout(renderVersionCheck(await checkNpmLatestVersion(metadata), lang));
		return 0;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		reporter.stderr(renderCliError(t(lang, 'version.error.checkFailed', { message }), 'mf version --help', lang));
		return 1;
	}
}
