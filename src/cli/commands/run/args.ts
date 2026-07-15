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
import { APPROVAL_ACTION_TYPE_SET, APPROVAL_ACTION_TYPES } from '../../../core/approval-actions.js';

const DEFAULT_ACTIVE_LOCK_WAIT_TIMEOUT_SECONDS = 300;
const RUN_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--dry-run', kind: 'boolean' },
	{ name: '--plan-only', kind: 'boolean' },
	{ name: '--wait', kind: 'boolean' },
	{ name: ALLOW_UNTRUSTED_ROOT_OPTION, kind: 'boolean' },
	{ name: '--wait-timeout', kind: 'string' },
	{ name: '--allow-approval', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

export interface ParsedRunArguments {
	readonly json: boolean;
	readonly dryRun: boolean;
	readonly planOnly: boolean;
	readonly allowUntrustedRoot: boolean;
	readonly allowApprovals: readonly string[];
	readonly wait: boolean;
	readonly waitTimeoutSeconds: number;
	readonly intentName: string | null;
	readonly extra: readonly string[];
	readonly invalidApprovalAction: string | null;
	readonly error: CliOptionParseError | 'invalid_wait_timeout' | 'invalid_approval_action' | null;
}

export function hasRunHelpOption(args: readonly string[]): boolean {
	return hasCliOptionToken(args, '--help', ['-h']);
}

export function getSupportedRunApprovalActions(): readonly string[] {
	return [...APPROVAL_ACTION_TYPES].sort((left, right) => left.localeCompare(right));
}

function getAllowApprovalValues(parsed: ReturnType<typeof parseCliOptions>): readonly string[] {
	const values = parsed.occurrences
		.filter((occurrence) => occurrence.name === '--allow-approval')
		.map((occurrence) => occurrence.value)
		.filter((value): value is string => typeof value === 'string');

	return [...new Set(values)];
}

function findInvalidApprovalAction(values: readonly string[]): string | null {
	return values.find((value) => !APPROVAL_ACTION_TYPE_SET.has(value)) ?? null;
}

export function parseRunArguments(args: readonly string[]): ParsedRunArguments {
	const parsed = parseCliOptions(args, RUN_OPTIONS, { allowPositionals: true });
	let waitTimeoutSeconds = DEFAULT_ACTIVE_LOCK_WAIT_TIMEOUT_SECONDS;
	const allowApprovals = getAllowApprovalValues(parsed);

	if (parsed.error) {
		const [intentName, ...extra] = parsed.positionals;

		return {
			json: hasParsedCliOption(parsed, '--json'),
			dryRun: hasParsedCliOption(parsed, '--dry-run'),
			planOnly: hasParsedCliOption(parsed, '--plan-only'),
			allowUntrustedRoot: hasParsedCliOption(parsed, ALLOW_UNTRUSTED_ROOT_OPTION),
			allowApprovals,
			wait: hasParsedCliOption(parsed, '--wait'),
			waitTimeoutSeconds,
			intentName: intentName ?? null,
			extra,
			invalidApprovalAction: null,
			error: parsed.error,
		};
	}

	const invalidApprovalAction = findInvalidApprovalAction(allowApprovals);
	const waitTimeoutValue = getParsedCliStringOption(parsed, '--wait-timeout');
	let error: ParsedRunArguments['error'] = null;
	if (invalidApprovalAction) {
		error = 'invalid_approval_action';
	} else if (waitTimeoutValue !== null) {
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
		allowApprovals,
		wait: hasParsedCliOption(parsed, '--wait'),
		waitTimeoutSeconds,
		intentName: intentName ?? null,
		extra,
		invalidApprovalAction,
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
				{ label: '--allow-approval <action>', description: t(lang, 'run.help.option.allowApproval') },
				{ label: ALLOW_UNTRUSTED_ROOT_OPTION, description: t(lang, 'run.help.option.allowUntrustedRoot') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf run test',
				'mf run lint --json',
				'mf run release_npm_publish --allow-approval release --allow-approval network_access --json',
			],
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
