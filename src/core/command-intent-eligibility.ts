import { isRecord, readString, type TomlTable } from './config-loading.js';
import {
	commandIntentHasBlockedShellBackgroundPattern,
	commandIntentHasCommandSource,
	commandIntentNameIsSafe,
} from './command-contract-rules.js';

export type CommandIntentEligibilityCode =
	| 'ok'
	| 'intent_not_table'
	| 'status_not_configured'
	| 'lifecycle_not_oneshot'
	| 'run_policy_not_agent_allowed'
	| 'stdin_not_closed'
	| 'missing_timeout'
	| 'missing_command_source'
	| 'unsafe_intent_name'
	| 'blocked_shell_background_pattern';

export type CommandIntentEligibilityResult =
	| {
			readonly ok: true;
			readonly code: 'ok';
			readonly detail: null;
	  }
	| {
			readonly ok: false;
			readonly code: Exclude<CommandIntentEligibilityCode, 'ok'>;
			readonly detail: string | null;
	  };

export function evaluateCommandIntentEligibility(
	intentName: string,
	rawIntent: unknown,
): CommandIntentEligibilityResult {
	if (!commandIntentNameIsSafe(intentName)) {
		return {
			ok: false,
			code: 'unsafe_intent_name',
			detail: 'Intent name can contain only ASCII letters, numbers, underscores, and hyphens.',
		};
	}

	if (!isRecord(rawIntent)) {
		return {
			ok: false,
			code: 'intent_not_table',
			detail: 'Intent is not a TOML table.',
		};
	}

	const status = readString(rawIntent, 'status') ?? 'unknown';
	if (status !== 'configured') {
		const reason = readString(rawIntent, 'reason');
		return {
			ok: false,
			code: 'status_not_configured',
			detail: reason ?? `Intent status is ${status}.`,
		};
	}

	const lifecycle = readString(rawIntent, 'lifecycle');
	if (lifecycle !== 'oneshot') {
		return {
			ok: false,
			code: 'lifecycle_not_oneshot',
			detail: `Intent lifecycle is ${lifecycle ?? 'unknown'}.`,
		};
	}

	const runPolicy = readString(rawIntent, 'run_policy');
	if (runPolicy !== 'agent_allowed') {
		return {
			ok: false,
			code: 'run_policy_not_agent_allowed',
			detail: `Intent run_policy is ${runPolicy ?? 'unknown'}.`,
		};
	}

	if (rawIntent.stdin !== 'closed') {
		return {
			ok: false,
			code: 'stdin_not_closed',
			detail: 'Intent stdin is not closed.',
		};
	}

	if (!Number.isInteger(rawIntent.timeout_seconds) || Number(rawIntent.timeout_seconds) <= 0) {
		return {
			ok: false,
			code: 'missing_timeout',
			detail: 'Intent timeout_seconds is missing or invalid.',
		};
	}

	if (!commandIntentHasCommandSource(rawIntent)) {
		return {
			ok: false,
			code: 'missing_command_source',
			detail: 'Intent does not define argv or shell cmd.',
		};
	}

	if (commandIntentHasBlockedShellBackgroundPattern(rawIntent)) {
		return {
			ok: false,
			code: 'blocked_shell_background_pattern',
			detail: 'Shell command contains a blocked long-running or background pattern.',
		};
	}

	return {
		ok: true,
		code: 'ok',
		detail: null,
	};
}
