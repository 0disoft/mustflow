import { printUsageError, renderHelp } from '../lib/cli-output.js';
import {
	acquireActiveCommandLock,
	GENERATED_SURFACE_READ_EFFECTS,
	reportActiveCommandLockConflict,
} from '../lib/active-command-lock.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { resolveRunCommandContext } from '../lib/run-context.js';
import { checkMustflowProjectReportWithGeneratedState } from '../lib/validation.js';

const CHECK_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--strict', kind: 'boolean' },
	{ name: '--repo', kind: 'string' },
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
				{
					label: '--repo <path>',
					description: t(lang, 'check.help.option.repo'),
				},
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf check', 'mf check --strict', 'mf check --strict --repo projects/example --json'],
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

export async function runCheck(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
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
	const repository = getParsedCliStringOption(options, '--repo');
	let projectRoot: string;
	let scope;
	try {
		if (repository) {
			const context = resolveRunCommandContext({ repository });
			if (!context.workspaceScope || !context.trustPaths) {
				throw new Error('--repo requires a delegated workspace repository mapping');
			}
			projectRoot = context.projectRoot;
			scope = {
				kind: 'workspace_repository' as const,
				repository: context.workspaceScope.repository,
				contract: context.workspaceScope.contract,
				manifestPaths: context.trustPaths,
				commandsToml: {
					defaults: context.contract.defaults,
					intents: context.contract.intents,
					resources: context.contract.resources,
				},
			};
		} else {
			projectRoot = resolveMustflowRoot();
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		printUsageError(reporter, message, 'mf check --help', getCheckHelp(lang), lang);
		return 1;
	}
	const activeLock = acquireActiveCommandLock(projectRoot, 'mf check', GENERATED_SURFACE_READ_EFFECTS);

	if (!activeLock.ok) {
		reportActiveCommandLockConflict(reporter, 'mf check', activeLock.conflicts, 'mf check --help', lang);
		return 1;
	}

	try {
		const report = await checkMustflowProjectReportWithGeneratedState(projectRoot, { strict, scope });
		const issues = report.issues;
		const warnings = report.warnings;
		const ok = issues.length === 0;

		if (hasParsedCliOption(options, '--json')) {
			reporter.stdout(
				JSON.stringify(
					{
						ok,
						strict,
						scope: scope
							? {
								kind: scope.kind,
								repository: scope.repository,
								contract: scope.contract,
							}
							: null,
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
				if (scope) {
					reporter.stdout(t(lang, 'check.result.scopedStrictPassed', { repository: scope.repository }));
					return 0;
				}
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
