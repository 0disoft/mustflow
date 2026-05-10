import { isRecord, readString, readStringArray, type TomlTable } from './config-loading.js';

export type CommandIntentEligibilityCode =
	| 'ok'
	| 'intent_not_table'
	| 'status_not_configured'
	| 'lifecycle_not_oneshot'
	| 'run_policy_not_agent_allowed'
	| 'stdin_not_closed'
	| 'missing_timeout'
	| 'missing_command_source';

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

function hasCommandSource(intent: TomlTable): boolean {
	const argv = readStringArray(intent, 'argv');
	const shellCommand = intent.mode === 'shell' ? readString(intent, 'cmd') : undefined;

	return Boolean((argv && argv.length > 0) || shellCommand);
}

export function evaluateCommandIntentEligibility(
	_intentName: string,
	rawIntent: unknown,
): CommandIntentEligibilityResult {
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

	if (!hasCommandSource(rawIntent)) {
		return {
			ok: false,
			code: 'missing_command_source',
			detail: 'Intent does not define argv or shell cmd.',
		};
	}

	return {
		ok: true,
		code: 'ok',
		detail: null,
	};
}
