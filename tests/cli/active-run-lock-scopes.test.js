import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
	acquireActiveRunLock,
	inspectActiveRunLocks,
	listActiveRunLocks,
} from '../../dist/core/active-run-locks.js';
import {
	normalizeCommandEffects,
	validateCommandEffects,
} from '../../dist/core/command-effects.js';
import { assertMatchesSchema } from '../helpers/json-schema.js';
import {
	createTempProject,
	initProject,
	projectRoot,
	removeTempProject,
	runCli,
} from './run-support.js';

function createContract(effects, resources = {}) {
	return {
		defaults: { default_cwd: '.' },
		resources,
		intents: {
		probe: {
			cwd: '.',
			writes: [],
			effects,
		},
		},
	};
}

function createLinkedWorktreePair() {
	const primary = createTempProject();
	const secondary = createTempProject();
	const commonGitDirectory = path.join(primary, '.git');
	const linkedGitDirectory = path.join(commonGitDirectory, 'worktrees', 'secondary');
	mkdirSync(linkedGitDirectory, { recursive: true });
	writeFileSync(path.join(linkedGitDirectory, 'commondir'), '../..\n');
	writeFileSync(path.join(secondary, '.git'), `gitdir: ${linkedGitDirectory}\n`);
	return { primary, secondary };
}

function removePair(pair) {
	removeTempProject(pair.secondary);
	removeTempProject(pair.primary);
}

function uniqueLock(prefix) {
	return `${prefix}_${randomUUID()}`;
}

function withTemporaryHostLockRoot(baseRoot, callback) {
	const hostTemp = path.join(baseRoot, 'host-lock-temp');
	mkdirSync(hostTemp, { recursive: true });
	const previous = {
		TMPDIR: process.env.TMPDIR,
		TMP: process.env.TMP,
		TEMP: process.env.TEMP,
	};
	process.env.TMPDIR = hostTemp;
	process.env.TMP = hostTemp;
	process.env.TEMP = hostTemp;

	try {
		return callback();
	} finally {
		for (const [name, value] of Object.entries(previous)) {
			if (value === undefined) {
				delete process.env[name];
			} else {
				process.env[name] = value;
			}
		}
	}
}

test('worktree scope keeps identical lock names isolated between checkouts', () => {
	const firstRoot = createTempProject();
	const secondRoot = createTempProject();
	const lock = uniqueLock('worktree');
	const contract = createContract([
		{ type: 'write', mode: 'replace', lock, scope: 'worktree', concurrency: 'exclusive' },
	]);

	try {
		const first = acquireActiveRunLock(firstRoot, contract, 'probe');
		assert.equal(first.ok, true);
		const second = acquireActiveRunLock(secondRoot, contract, 'probe');
		assert.equal(second.ok, true);

		if (second.ok) second.handle.release();
		if (first.ok) first.handle.release();
	} finally {
		removeTempProject(secondRoot);
		removeTempProject(firstRoot);
	}
});

test('repository scope coordinates linked worktrees through the Git common directory', () => {
	const pair = createLinkedWorktreePair();
	const lock = uniqueLock('repository');
	const contract = createContract([
		{ type: 'write', mode: 'replace', lock, scope: 'repository', concurrency: 'exclusive' },
	]);

	try {
		const first = acquireActiveRunLock(pair.primary, contract, 'probe');
		assert.equal(first.ok, true);
		if (!first.ok) return;

		const inspection = inspectActiveRunLocks(pair.secondary, contract, 'probe');
		assert.equal(inspection.conflicts.length, 1);
		assert.match(inspection.conflicts[0].detail, /^repository lock /u);

		const second = acquireActiveRunLock(pair.secondary, contract, 'probe');
		assert.equal(second.ok, false);
		if (!second.ok) {
			assert.equal(second.conflicts[0].conflictsWithIntent, 'probe');
		}

		const state = listActiveRunLocks(pair.secondary);
		const active = state.activeRecords.find((record) => record.run_id === first.handle.record.run_id);
		assert.ok(active);
		assert.equal(active.effects[0].scope, 'repository');

		first.handle.release();
		const afterRelease = acquireActiveRunLock(pair.secondary, contract, 'probe');
		assert.equal(afterRelease.ok, true);
		if (afterRelease.ok) afterRelease.handle.release();
	} finally {
		removePair(pair);
	}
});

test('host scope coordinates unrelated repositories for explicit named resources', () => {
	const firstRoot = createTempProject();
	const secondRoot = createTempProject();
	const lock = uniqueLock('host');
	const contract = createContract([
		{ type: 'write', mode: 'replace', lock, scope: 'host', concurrency: 'exclusive' },
	]);

	try {
		withTemporaryHostLockRoot(firstRoot, () => {
			const first = acquireActiveRunLock(firstRoot, contract, 'probe');
			assert.equal(first.ok, true);
			if (!first.ok) return;

			const second = acquireActiveRunLock(secondRoot, contract, 'probe');
			assert.equal(second.ok, false);
			if (!second.ok) {
				assert.equal(second.conflicts[0].lock, `mustflow-scope:host:${lock}`);
			}

			first.handle.release();
			const afterRelease = acquireActiveRunLock(secondRoot, contract, 'probe');
			assert.equal(afterRelease.ok, true);
			if (afterRelease.ok) afterRelease.handle.release();
		});
	} finally {
		removeTempProject(secondRoot);
		removeTempProject(firstRoot);
	}
});

test('mixed-scope acquisition is all-or-nothing when a broad scope conflicts', () => {
	const pair = createLinkedWorktreePair();
	const repositoryLock = uniqueLock('mixed_repository');
	const fullContract = createContract([
		{ type: 'write', mode: 'replace', path: 'dist/**', scope: 'worktree', concurrency: 'exclusive' },
		{ type: 'write', mode: 'replace', lock: repositoryLock, scope: 'repository', concurrency: 'exclusive' },
	]);
	const worktreeOnly = createContract([
		{ type: 'write', mode: 'replace', path: 'dist/**', scope: 'worktree', concurrency: 'exclusive' },
	]);

	try {
		const first = acquireActiveRunLock(pair.primary, fullContract, 'probe');
		assert.equal(first.ok, true);
		if (!first.ok) return;

		const blocked = acquireActiveRunLock(pair.secondary, fullContract, 'probe');
		assert.equal(blocked.ok, false);

		const worktreeProbe = acquireActiveRunLock(pair.secondary, worktreeOnly, 'probe');
		assert.equal(worktreeProbe.ok, true, 'failed mixed acquisition must not leave a worktree lease');
		if (worktreeProbe.ok) worktreeProbe.handle.release();

		first.handle.release();
		const afterRelease = acquireActiveRunLock(pair.secondary, fullContract, 'probe');
		assert.equal(afterRelease.ok, true);
		if (afterRelease.ok) afterRelease.handle.release();
	} finally {
		removePair(pair);
	}
});

test('resource scope is inherited and conflicting declarations fail closed', () => {
	const root = createTempProject();
	const lock = uniqueLock('resource');

	try {
		const inherited = createContract(
			[{ type: 'write', mode: 'replace', lock, concurrency: 'exclusive' }],
			{ [lock]: { scope: 'repository' } },
		);
		const effects = normalizeCommandEffects(root, inherited, 'probe');
		assert.equal(effects[0].scope, 'repository');

		const mismatch = createContract(
			[{ type: 'write', mode: 'replace', lock, scope: 'host', concurrency: 'exclusive' }],
			{ [lock]: { scope: 'repository' } },
		);
		assert.throws(
			() => normalizeCommandEffects(root, mismatch, 'probe'),
			/declares scope host but resource .* declares repository/u,
		);

		const hostWithoutLock = createContract([
			{ type: 'write', mode: 'replace', path: 'tmp/**', scope: 'host', concurrency: 'exclusive' },
		]);
		assert.throws(
			() => normalizeCommandEffects(root, hostWithoutLock, 'probe'),
			/Host-scoped command effect .* must define an explicit named lock/u,
		);

		const invalidResource = {
			defaults: { default_cwd: '.' },
			resources: { invalid: { scope: 'machine' } },
			intents: { probe: { cwd: '.', writes: [] } },
		};
		assert.ok(validateCommandEffects(root, invalidResource).some((issue) => issue.message.includes('must be one of worktree')));
	} finally {
		removeTempProject(root);
	}
});



test('published command schema accepts effect and resource scopes', () => {
	const document = {
		schema_version: '1',
		defaults: {
			missing_behavior: 'do_not_guess',
			allow_inferred_commands: false,
			require_lifecycle: true,
			require_timeout_for_oneshot: true,
			deny_unmanaged_long_running: true,
			default_cwd: '.',
			default_timeout_seconds: 600,
			stdin: 'closed',
			max_output_bytes: 1048576,
			on_timeout: 'terminate_process_tree',
			kill_after_seconds: 5,
		},
		resources: {
			shared_cache: {
				type: 'cache',
				scope: 'repository',
				concurrency: 'exclusive_writer',
				description: 'Shared cache across linked worktrees.',
			},
		},
		intents: {
			probe: {
				status: 'configured',
				lifecycle: 'oneshot',
				run_policy: 'agent_allowed',
				description: 'Validate scoped command effects.',
				argv: ['node', '-e', 'process.exit(0)'],
				cwd: '.',
				timeout_seconds: 10,
				stdin: 'closed',
				success_exit_codes: [0],
				writes: [],
				effects: [
					{ type: 'write', mode: 'replace', lock: 'shared_cache', scope: 'repository', concurrency: 'exclusive' },
					{ type: 'write', mode: 'write', lock: 'preview_port', scope: 'host', concurrency: 'exclusive' },
				],
				network: false,
				destructive: false,
			},
		},
	};

	assertMatchesSchema(path.join(projectRoot, 'schemas'), 'commands.schema.json', document);
});

test('repository scope fails closed outside a Git repository', () => {
	const root = createTempProject();
	const contract = createContract([
		{ type: 'write', mode: 'replace', lock: uniqueLock('non_git'), scope: 'repository', concurrency: 'exclusive' },
	]);

	try {
		assert.throws(
			() => acquireActiveRunLock(root, contract, 'probe'),
			/repository_lock_scope_requires_git_repository/u,
		);
	} finally {
		removeTempProject(root);
	}
});

test('locks api exposes scoped effects and still matches its public schema', () => {
	const root = createTempProject();
	const lock = uniqueLock('api_host');
	const contract = createContract([
		{ type: 'write', mode: 'replace', lock, scope: 'host', concurrency: 'exclusive' },
	]);

	try {
		initProject(root);
		withTemporaryHostLockRoot(root, () => {
			const acquired = acquireActiveRunLock(root, contract, 'probe');
			assert.equal(acquired.ok, true);
			if (!acquired.ok) return;

			try {
				const result = runCli(root, ['api', 'locks', '--json']);
				assert.equal(result.status, 0, result.stderr || result.stdout);
				const output = JSON.parse(result.stdout);
				const active = output.active_locks.find((record) => record.run_id === acquired.handle.record.run_id);
				assert.ok(active);
				assert.equal(active.effects[0].scope, 'host');
				assertMatchesSchema(path.join(projectRoot, 'schemas'), 'locks.schema.json', output);
			} finally {
				acquired.handle.release();
			}
		});
	} finally {
		removeTempProject(root);
	}
});
