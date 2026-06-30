import { printUsageError } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { formatCliOptionParseError } from '../lib/option-parser.js';
import type { Reporter } from '../lib/reporter.js';
import { getRunHelp, getSupportedRunApprovalActions, hasRunHelpOption, parseRunArguments } from './run/args.js';
import { executeRunCommand, type RunCommandOptions } from './run/execution.js';
import { executeRunPreviewCommand, getRunPreviewMode } from './run/preview.js';

export { getRunHelp } from './run/args.js';
export { executeRunCommand } from './run/execution.js';
export type {
	RunCommandExecutionOutputMode,
	RunCommandExecutionRequest,
	RunCommandExecutionResult,
	RunCommandOptions,
} from './run/execution.js';

/**
 * mf:anchor cli.run.intent-contract
 * purpose: Enforce command intent eligibility before executing a configured oneshot command.
 * search: command contract, agent_allowed, oneshot, stdin closed, timeout
 * invariant: Execution requires configured status, oneshot lifecycle, agent_allowed policy, and closed stdin.
 * risk: config, security, state
 */
export async function runRun(
	args: string[],
	reporter: Reporter,
	lang: CliLang = 'en',
	options: RunCommandOptions = {},
): Promise<number> {
	if (hasRunHelpOption(args)) {
		reporter.stdout(getRunHelp(lang));
		return 0;
	}

	const parsedArgs = parseRunArguments(args);

	if (parsedArgs.error === 'invalid_wait_timeout') {
		printUsageError(reporter, t(lang, 'run.error.invalidWaitTimeout'), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	if (parsedArgs.error === 'invalid_approval_action') {
		printUsageError(
			reporter,
			t(lang, 'run.error.invalidApprovalAction', {
				action: parsedArgs.invalidApprovalAction ?? 'unknown',
				allowed: getSupportedRunApprovalActions().join(', '),
			}),
			'mf run --help',
			getRunHelp(lang),
			lang,
		);
		return 1;
	}

	if (parsedArgs.error) {
		if (parsedArgs.error.kind === 'missing_value' && parsedArgs.error.option === '--wait-timeout') {
			printUsageError(reporter, t(lang, 'run.error.invalidWaitTimeout'), 'mf run --help', getRunHelp(lang), lang);
			return 1;
		}

		printUsageError(reporter, formatCliOptionParseError(parsedArgs.error, lang), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	const json = parsedArgs.json;
	const dryRun = parsedArgs.dryRun;
	const planOnly = parsedArgs.planOnly;
	const allowUntrustedRoot = parsedArgs.allowUntrustedRoot;
	const previewMode = getRunPreviewMode({ dryRun, planOnly });

	if (dryRun && planOnly) {
		printUsageError(reporter, t(lang, 'run.error.conflictingPreviewModes'), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	if (parsedArgs.wait && previewMode) {
		printUsageError(reporter, t(lang, 'run.error.waitRequiresExecution'), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	const intentName = parsedArgs.intentName;
	const extra = parsedArgs.extra;

	if (!intentName) {
		printUsageError(reporter, t(lang, 'run.error.missingIntent'), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	if (extra.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: extra[0] }), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	if (!previewMode) {
		const result = await executeRunCommand(
			{
				intentName,
				outputMode: json ? 'json' : 'text',
				allowUntrustedRoot,
				allowApprovals: parsedArgs.allowApprovals,
				wait: parsedArgs.wait,
				waitTimeoutSeconds: parsedArgs.waitTimeoutSeconds,
			},
			reporter,
			lang,
			options,
		);
		return result.exitCode;
	}

	return executeRunPreviewCommand({ intentName, json, previewMode }, reporter, lang, options);
}
