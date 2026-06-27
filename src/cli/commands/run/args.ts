import { renderHelp } from '../../lib/cli-output.js';
import { t, type CliLang } from '../../lib/i18n.js';
import {
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionParseError,
	type CliOptionSpec,
} from '../../lib/option-parser.js';
import { ALLOW_UNTRUSTED_ROOT_OPTION } from '../../lib/run-root-trust.js';

const DEFAULT_ACTIVE_LOCK_WAIT_TIMEOUT_SECONDS = 300;
const RUN_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--dry-run', kind: 'boolean' },
	{ name: '--plan-only', kind: 'boolean' },
	{ name: '--wait', kind: 'boolean' },
	{ name: ALLOW_UNTRUSTED_ROOT_OPTION, kind: 'boolean' },
	{ name: '--wait-timeout', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

export interface ParsedRunArguments {
	readonly json: boolean;
	readonly dryRun: boolean;
	readonly planOnly: boolean;
	readonly allowUntrustedRoot: boolean;
	readonly wait: boolean;
	readonly waitTimeoutSeconds: number;
	readonly intentName: string | null;
	readonly extra: readonly string[];
	readonly error: CliOptionParseError | 'invalid_wait_timeout' | null;
}

export function hasRunHelpOption(args: readonly string[]): boolean {
	return hasCliOptionToken(args, '--help', ['-h']);
}

export function parseRunArguments(args: readonly string[]): ParsedRunArguments {
	const parsed = parseCliOptions(args, RUN_OPTIONS, { allowPositionals: true });
	let waitTimeoutSeconds = DEFAULT_ACTIVE_LOCK_WAIT_TIMEOUT_SECONDS;

	if (parsed.error) {
		const [intentName, ...extra] = parsed.positionals;

		return {
			json: hasParsedCliOption(parsed, '--json'),
			dryRun: hasParsedCliOption(parsed, '--dry-run'),
			planOnly: hasParsedCliOption(parsed, '--plan-only'),
			allowUntrustedRoot: hasParsedCliOption(parsed, ALLOW_UNTRUSTED_ROOT_OPTION),
			wait: hasParsedCliOption(parsed, '--wait'),
			waitTimeoutSeconds,
			intentName: intentName ?? null,
			extra,
			error: parsed.error,
		};
	}

	const waitTimeoutValue = getParsedCliStringOption(parsed, '--wait-timeout');
	let error: ParsedRunArguments['error'] = null;
	if (waitTimeoutValue !== null) {
		const parsedWaitTimeout = Number(waitTimeoutValue);
		if (!Number.isInteger(parsedWaitTimeout) || parsedWaitTimeout <= 0) {
			error = 'invalid_wait_timeout';
		} else {
			waitTimeoutSeconds = parsedWaitTimeout;
		}
	}

	const [intentName, ...extra] = parsed.positionals;
	return {
		json: hasParsedCliOption(parsed, '--json'),
		dryRun: hasParsedCliOption(parsed, '--dry-run'),
		planOnly: hasParsedCliOption(parsed, '--plan-only'),
		allowUntrustedRoot: hasParsedCliOption(parsed, ALLOW_UNTRUSTED_ROOT_OPTION),
		wait: hasParsedCliOption(parsed, '--wait'),
		waitTimeoutSeconds,
		intentName: intentName ?? null,
		extra,
		error,
	};
}

export function getRunHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf run <intent> [options]',
			summary: t(lang, 'run.help.summary'),
			options: [
				{ label: '--dry-run', description: t(lang, 'run.help.option.dryRun') },
				{ label: '--plan-only', description: t(lang, 'run.help.option.planOnly') },
				{ label: '--json', description: t(lang, 'run.help.option.json') },
				{ label: '--wait', description: t(lang, 'run.help.option.wait') },
				{ label: '--wait-timeout <seconds>', description: t(lang, 'run.help.option.waitTimeout') },
				{ label: ALLOW_UNTRUSTED_ROOT_OPTION, description: t(lang, 'run.help.option.allowUntrustedRoot') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf run test', 'mf run lint --json', 'mf run mustflow_check --dry-run --json'],
			exitCodes: [
				{
					label: '0',
					description: t(lang, 'run.help.exit.ok'),
				},
				{
					label: '1',
					description: t(lang, 'run.help.exit.fail'),
				},
			],
		},
		lang,
	);
}
