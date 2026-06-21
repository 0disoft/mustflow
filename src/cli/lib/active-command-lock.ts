import {
	ACTIVE_RUN_LOCK_ID_ENV,
	acquireActiveRunLock,
	type ActiveRunLockAcquireResult,
	type ActiveRunLockConflict,
} from '../../core/active-run-locks.js';
import type { CommandEffectAccess, CommandEffectConcurrency, CommandEffectMode } from '../../core/command-effects.js';
import type { CommandContract, TomlTable } from '../../core/config-loading.js';
import { renderCliError } from './cli-output.js';
import { t, type CliLang } from './i18n.js';
import type { Reporter } from './reporter.js';

export interface ActiveCommandLockEffect {
	readonly type: CommandEffectAccess;
	readonly mode?: CommandEffectMode;
	readonly path?: string;
	readonly paths?: readonly string[];
	readonly lock?: string;
	readonly concurrency?: CommandEffectConcurrency;
}

export const REPO_MAP_WRITE_EFFECTS: readonly ActiveCommandLockEffect[] = [
	{ type: 'write', mode: 'replace', path: 'REPO_MAP.md', concurrency: 'exclusive' },
];

export const LOCAL_INDEX_WRITE_EFFECTS: readonly ActiveCommandLockEffect[] = [
	{
		type: 'write',
		mode: 'replace',
		path: '.mustflow/cache/**',
		lock: 'local_index_cache',
		concurrency: 'exclusive',
	},
];

export const MUSTFLOW_UPDATE_APPLY_EFFECTS: readonly ActiveCommandLockEffect[] = [
	{ type: 'write', mode: 'replace', path: 'AGENTS.md', concurrency: 'exclusive' },
	{ type: 'write', mode: 'replace', path: '.mustflow/config/manifest.lock.toml', concurrency: 'exclusive' },
	{ type: 'write', mode: 'replace', path: '.mustflow/config/commands.toml', concurrency: 'exclusive' },
	{ type: 'write', mode: 'replace', path: '.mustflow/config/mustflow.toml', concurrency: 'exclusive' },
	{ type: 'write', mode: 'replace', path: '.mustflow/config/preferences.toml', concurrency: 'exclusive' },
	{ type: 'write', mode: 'replace', path: '.mustflow/context/**', concurrency: 'exclusive' },
	{ type: 'write', mode: 'replace', path: '.mustflow/docs/**', concurrency: 'exclusive' },
	{ type: 'write', mode: 'replace', path: '.mustflow/skills/**', concurrency: 'exclusive' },
	{ type: 'write', mode: 'replace', path: '.mustflow/backups/**', concurrency: 'exclusive' },
];

export const GENERATED_SURFACE_READ_EFFECTS: readonly ActiveCommandLockEffect[] = [
	{ type: 'read', mode: 'read', path: 'REPO_MAP.md', concurrency: 'shared' },
	{ type: 'read', mode: 'read', path: '.mustflow/config/manifest.lock.toml', concurrency: 'shared' },
	{
		type: 'read',
		mode: 'read',
		path: '.mustflow/cache/**',
		lock: 'local_index_cache',
		concurrency: 'shared',
	},
];

function effectToToml(effect: ActiveCommandLockEffect): TomlTable {
	const output: TomlTable = {
		type: effect.type,
	};

	if (effect.mode) {
		output.mode = effect.mode;
	}

	if (effect.path) {
		output.path = effect.path;
	}

	if (effect.paths) {
		output.paths = [...effect.paths];
	}

	if (effect.lock) {
		output.lock = effect.lock;
	}

	if (effect.concurrency) {
		output.concurrency = effect.concurrency;
	}

	return output;
}

function createSyntheticCommandContract(
	intentName: string,
	effects: readonly ActiveCommandLockEffect[],
): CommandContract {
	return {
		defaults: { default_cwd: '.' },
		resources: {},
		intents: {
			[intentName]: {
				cwd: '.',
				writes: [],
				effects: effects.map(effectToToml),
			},
		},
	};
}

function parentRunId(): string | null {
	const value = process.env[ACTIVE_RUN_LOCK_ID_ENV]?.trim();
	return value && value.length > 0 ? value : null;
}

export function acquireActiveCommandLock(
	projectRoot: string,
	displayName: string,
	effects: readonly ActiveCommandLockEffect[],
): ActiveRunLockAcquireResult {
	return acquireActiveRunLock(projectRoot, createSyntheticCommandContract(displayName, effects), displayName, {
		commandHash: null,
		ignoreRunId: parentRunId(),
		ignorePid: process.ppid,
	});
}

export function renderActiveCommandLockConflictMessage(
	displayName: string,
	conflicts: readonly ActiveRunLockConflict[],
	lang: CliLang,
): string {
	const [first] = conflicts;
	const detail = first
		? t(lang, 'run.error.activeLockConflictDetail', {
				lock: first.lock,
				intent: first.conflictsWithIntent,
				pid: first.conflictsWithPid,
			})
		: t(lang, 'run.error.activeLockConflictUnknown');

	return t(lang, 'run.error.activeLockConflict', { intent: displayName, detail });
}

export function reportActiveCommandLockConflict(
	reporter: Reporter,
	displayName: string,
	conflicts: readonly ActiveRunLockConflict[],
	helpCommand: string,
	lang: CliLang,
): void {
	reporter.stderr(renderCliError(renderActiveCommandLockConflictMessage(displayName, conflicts, lang), helpCommand, lang));
}
