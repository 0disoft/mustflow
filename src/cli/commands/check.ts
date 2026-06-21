import { printUsageError, renderHelp } from '../lib/cli-output.js';
import {
	acquireActiveCommandLock,
	GENERATED_SURFACE_READ_EFFECTS,
	reportActiveCommandLockConflict,
} from '../lib/active-command-lock.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { checkMustflowProjectReport } from '../lib/validation.js';

const CHECK_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--strict', kind: 'boolean' },
] as const;

export function getCheckHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf check [options]',
			summary: t(lang, 'check.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{
					label: '--strict',
					description: t(lang, 'check.help.option.strict'),
				},
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf check', 'mf check --strict', 'mf check --strict --json'],
			exitCodes: [
				{
					label: '0',
					description: t(lang, 'check.help.exit.ok'),
				},
				{
					label: '1',
					description: t(lang, 'check.help.exit.fail'),
				},
			],
		},
		lang,
	);
}

export function runCheck(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getCheckHelp(lang));
		return 0;
	}

	const options = parseCliOptions(args, CHECK_OPTIONS);
	if (options.error) {
		printUsageError(reporter, formatCliOptionParseError(options.error, lang), 'mf check --help', getCheckHelp(lang), lang);
		return 1;
	}

	const strict = hasParsedCliOption(options, '--strict');
	const projectRoot = resolveMustflowRoot();
	const activeLock = acquireActiveCommandLock(projectRoot, 'mf check', GENERATED_SURFACE_READ_EFFECTS);

	if (!activeLock.ok) {
		reportActiveCommandLockConflict(reporter, 'mf check', activeLock.conflicts, 'mf check --help', lang);
		return 1;
	}

	try {
		const report = checkMustflowProjectReport(projectRoot, { strict });
		const issues = report.issues;
		const warnings = report.warnings;
		const ok = issues.length === 0;

		if (hasParsedCliOption(options, '--json')) {
			reporter.stdout(
				JSON.stringify(
					{
						ok,
						strict,
						issueCount: issues.length,
						issues,
						warningCount: warnings.length,
						warnings,
						issueDetails: report.issueDetails,
					},
					null,
					2,
				),
			);
			return ok ? 0 : 1;
		}

		if (ok) {
			for (const warning of warnings) {
				reporter.stderr(warning);
			}

			if (strict) {
				reporter.stdout(t(lang, 'check.result.strictPassed'));
				return 0;
			}

			reporter.stdout(t(lang, 'check.result.passed'));
			return 0;
		}

		for (const issue of issues) {
			reporter.stderr(issue);
		}

		reporter.stderr(t(lang, 'check.result.failed', { count: issues.length }));

		return 1;
	} finally {
		activeLock.handle.release();
	}
}
