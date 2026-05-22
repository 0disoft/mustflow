import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { checkMustflowProjectReport } from '../lib/validation.js';

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
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getCheckHelp(lang));
		return 0;
	}

	const supported = new Set(['--json', '--strict']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported[0] }), 'mf check --help', getCheckHelp(lang), lang);
		return 1;
	}

	const strict = args.includes('--strict');
	const report = checkMustflowProjectReport(resolveMustflowRoot(), { strict });
	const issues = report.issues;
	const warnings = report.warnings;
	const ok = issues.length === 0;

	if (args.includes('--json')) {
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

	return 1;
}
