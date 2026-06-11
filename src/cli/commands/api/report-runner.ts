import type { ApiReportAction } from './actions.js';
import { printUsageError } from '../../lib/cli-output.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../../lib/option-parser.js';
import { t, type CliLang } from '../../lib/i18n.js';
import type { Reporter } from '../../lib/reporter.js';

const API_JSON_ONLY_OPTIONS: readonly CliOptionSpec[] = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--help', kind: 'boolean', aliases: ['-h'] },
];
const API_CHANGED_JSON_OPTIONS: readonly CliOptionSpec[] = [
	{ name: '--changed', kind: 'boolean' },
	{ name: '--json', kind: 'boolean' },
	{ name: '--help', kind: 'boolean', aliases: ['-h'] },
];

export interface ApiReportRunnerRuntime {
	readonly getHelp: (lang: CliLang) => string;
	readonly writeReport: (action: ApiReportAction, reporter: Reporter) => void;
}

function validateJsonOnlyAction(
	action: string,
	args: readonly string[],
	reporter: Reporter,
	lang: CliLang,
	runtime: ApiReportRunnerRuntime,
): boolean {
	const parsed = parseCliOptions(args, API_JSON_ONLY_OPTIONS);

	if (hasParsedCliOption(parsed, '--help')) {
		reporter.stdout(runtime.getHelp(lang));
		return false;
	}

	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf api --help', runtime.getHelp(lang), lang);
		return false;
	}

	if (!hasParsedCliOption(parsed, '--json')) {
		printUsageError(reporter, t(lang, 'api.error.actionRequiresJson', { action }), 'mf api --help', runtime.getHelp(lang), lang);
		return false;
	}

	return true;
}

function validateChangedJsonAction(
	action: string,
	args: readonly string[],
	reporter: Reporter,
	lang: CliLang,
	runtime: ApiReportRunnerRuntime,
): boolean {
	const parsed = parseCliOptions(args, API_CHANGED_JSON_OPTIONS);

	if (hasParsedCliOption(parsed, '--help')) {
		reporter.stdout(runtime.getHelp(lang));
		return false;
	}

	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf api --help', runtime.getHelp(lang), lang);
		return false;
	}

	if (!hasParsedCliOption(parsed, '--json')) {
		printUsageError(reporter, t(lang, 'api.error.actionRequiresJson', { action }), 'mf api --help', runtime.getHelp(lang), lang);
		return false;
	}

	if (!hasParsedCliOption(parsed, '--changed')) {
		printUsageError(reporter, t(lang, 'api.error.actionRequiresChanged', { action }), 'mf api --help', runtime.getHelp(lang), lang);
		return false;
	}

	return true;
}

export function runJsonOnlyApiReport(
	action: ApiReportAction,
	args: readonly string[],
	reporter: Reporter,
	lang: CliLang,
	runtime: ApiReportRunnerRuntime,
): number {
	if (!validateJsonOnlyAction(action, args, reporter, lang, runtime)) {
		return hasCliOptionToken(args, '--help', ['-h']) ? 0 : 1;
	}

	runtime.writeReport(action, reporter);
	return 0;
}

export function runChangedApiReport(
	action: ApiReportAction,
	args: readonly string[],
	reporter: Reporter,
	lang: CliLang,
	runtime: ApiReportRunnerRuntime,
): number {
	if (!validateChangedJsonAction(action, args, reporter, lang, runtime)) {
		return hasCliOptionToken(args, '--help', ['-h']) ? 0 : 1;
	}

	runtime.writeReport(action, reporter);
	return 0;
}
