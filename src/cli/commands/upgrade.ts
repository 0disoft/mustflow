import { printUsageError, renderCliError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { checkNpmLatestVersion, type PackageVersionCheck } from '../lib/npm-version-check.js';
import { readPackageMetadata } from '../lib/package-info.js';
import type { Reporter } from '../lib/reporter.js';
import { runUpdate } from './update.js';

export function getUpgradeHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf upgrade [options]',
			summary: t(lang, 'upgrade.help.summary'),
			options: [
				{ label: '--dry-run', description: t(lang, 'upgrade.help.option.dryRun') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf upgrade', 'mf upgrade --dry-run'],
			exitCodes: [
				{ label: '0', description: t(lang, 'upgrade.help.exit.ok') },
				{ label: '1', description: t(lang, 'upgrade.help.exit.fail') },
			],
		},
		lang,
	);
}

function printPackageCheck(check: PackageVersionCheck, reporter: Reporter, lang: CliLang): void {
	reporter.stdout(`${check.packageName} ${check.currentVersion}`);
	reporter.stdout(
		check.updateAvailable
			? t(lang, 'version.check.latestAvailable', { version: check.latestVersion })
			: t(lang, 'version.check.upToDate', { version: check.latestVersion }),
	);

	if (check.updateAvailable) {
		reporter.stdout('');
		reporter.stdout(t(lang, 'version.check.updateCommand'));
		reporter.stdout(check.updateCommand);
	}
}

export async function runUpgrade(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getUpgradeHelp(lang));
		return 0;
	}

	const supported = new Set(['--dry-run']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported[0] }), 'mf upgrade --help', getUpgradeHelp(lang), lang);
		return 1;
	}

	const dryRun = args.includes('--dry-run');

	reporter.stdout(t(lang, 'upgrade.title'));
	reporter.stdout('');
	reporter.stdout(t(lang, 'upgrade.packageSection'));

	try {
		const packageCheck = await checkNpmLatestVersion(readPackageMetadata());
		printPackageCheck(packageCheck, reporter, lang);

		if (packageCheck.updateAvailable) {
			reporter.stdout('');
			reporter.stdout(t(lang, 'upgrade.packageUpdateRequired'));
			reporter.stdout(t(lang, 'upgrade.noFilesWritten'));
			return 1;
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		reporter.stderr(renderCliError(t(lang, 'upgrade.warning.versionCheckFailed', { message }), 'mf version --check', lang));
		reporter.stderr(t(lang, 'upgrade.warning.continueWithBundledTemplate'));
	}

	reporter.stdout('');
	reporter.stdout(t(lang, 'upgrade.projectSection'));

	return runUpdate([dryRun ? '--dry-run' : '--apply'], reporter, lang);
}
