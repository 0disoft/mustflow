import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import * as leaseModule from '../../dist/cli/lib/local-index/builder-lease.js';
import { createTempProject, removeTempProject } from './helpers/cli-harness.js';

function owner(ownerToken = 'dead-owner') {
	return {
		schema_version: '1', kind: 'local_index_builder_lease', owner_token: ownerToken,
		request_key: 'old', pid: 2_147_483_647, process_start_token: 'dead', started_at: new Date(0).toISOString(),
	};
}

function fixture(record = owner()) {
	const root = createTempProject('mustflow-builder-lease-');
	const lease = path.join(root, '.mustflow', 'cache', 'local-index', 'builder.lease');
	fs.mkdirSync(lease, { recursive: true });
	fs.writeFileSync(path.join(lease, 'owner.json'), JSON.stringify(record));
	return { root, lease, dispose: () => removeTempProject(root) };
}

function deterministicRuntime(overrides = {}) {
	let sequence = 0;
	return {
		now: () => 0,
		randomUUID: () => `00000000-0000-4000-8000-${(++sequence).toString(16).padStart(12, '0')}`,
		isProcessLive: () => false,
		readProcessStartToken: () => 'dead',
		readCurrentProcessStartToken: () => 'self',
		delay: async () => { throw new Error('unexpected real wait'); },
		...overrides,
	};
}

test('recovering a dead builder with a traversal token preserves files outside the project', async () => {
	const fixture = createTempProject('mustflow-lease-traversal-');
	const root = path.join(fixture, 'project');
	const outside = path.join(fixture, 'outside');
	const lease = path.join(root, '.mustflow', 'cache', 'local-index', 'builder.lease');
	const token = '/' + '../'.repeat(5) + 'outside';
	// Bound the old deletion target to this test's explicitly owned fixture before reproducing it.
	assert.equal(path.resolve(`${lease}.stale-${token}`), outside);
	let handle;
	try {
		fs.mkdirSync(lease, { recursive: true });
		fs.mkdirSync(`${lease}.stale-`, { recursive: true });
		fs.mkdirSync(outside);
		fs.writeFileSync(path.join(outside, 'preserve.txt'), 'external data');
		fs.writeFileSync(path.join(lease, 'owner.json'), JSON.stringify(owner(token)));
		handle = await leaseModule.acquireLocalIndexBuildLease(root, 'new');
		assert.equal(fs.existsSync(path.join(outside, 'preserve.txt')), true);
		assert.equal(fs.readFileSync(path.join(outside, 'preserve.txt'), 'utf8'), 'external data');
	} finally {
		handle?.release();
		removeTempProject(fixture);
	}
});

for (const token of ['', '../outside', '..\\outside', '%2e%2e%2foutside', 'C:outside', '\\\\?\\C:\\outside', '\0', '한글', 'x'.repeat(16_000)]) {
	test(`owner metadata is never used as a cleanup filename: ${JSON.stringify(token.slice(0, 32))}`, async () => {
		const f = fixture(owner(token));
		let handle;
		try {
			const staleTargets = [];
			handle = await leaseModule.acquireLocalIndexBuildLease(f.root, 'new', {
				runtime: deterministicRuntime({
					remove(target) {
						if (target.includes('.stale-')) staleTargets.push(target);
						fs.rmSync(target, { recursive: true, force: true });
					},
				}),
			});
			assert.deepEqual(staleTargets, [`${f.lease}.stale-00000000-0000-4000-8000-000000000002`]);
			assert.equal(handle.waitedForEquivalentBuild, false);
		} finally {
			handle?.release();
			f.dispose();
		}
	});
}

for (const wakeAt of [299_999, 300_000, 300_001]) {
	test(`a lease made available after waiting at ${wakeAt}ms respects the 5-minute deadline`, async () => {
		const f = fixture();
		let clock = 0;
		let attempts = 0;
		let handle;
		try {
			const pending = leaseModule.acquireLocalIndexBuildLease(f.root, 'old', {
				runtime: deterministicRuntime({
					now: () => clock,
					isProcessLive: () => true,
					rename(source, target) {
						if (source.includes('.candidate-')) attempts += 1;
						fs.renameSync(source, target);
					},
					async delay(milliseconds) {
						assert.equal(milliseconds, 50);
						clock = wakeAt;
						fs.rmSync(f.lease, { recursive: true });
					},
				}),
			});
			if (wakeAt < 300_000) {
				handle = await pending;
				assert.equal(handle.waitedForEquivalentBuild, true);
				assert.equal(attempts, 2);
			} else {
				await assert.rejects(pending, /local_index_builder_lease_timeout/);
				assert.equal(attempts, 1);
				assert.equal(fs.existsSync(f.lease), false);
			}
		} finally {
			handle?.release();
			f.dispose();
		}
	});
}

test('a final 1ms wait is clamped and unreadable metadata keeps its own timeout error', async () => {
	const f = fixture();
	let clock = 0;
	let waits = 0;
	try {
		await assert.rejects(leaseModule.acquireLocalIndexBuildLease(f.root, 'new', {
			runtime: deterministicRuntime({
				now: () => clock,
				readOwner() { clock = 299_999; return null; },
				async delay(milliseconds) { assert.equal(milliseconds, 1); waits += 1; clock = 300_000; },
			}),
		}), /local_index_builder_lease_unreadable/);
		assert.equal(waits, 1);
		assert.equal(fs.existsSync(f.lease), true);
	} finally {
		f.dispose();
	}
});

for (const age of [29_999, 30_000, 30_001]) {
	test(`a recovery lock aged ${age}ms is removed only at the 30-second threshold`, async () => {
		const f = fixture();
		const recovery = `${f.lease}.recovery`;
		try {
			fs.mkdirSync(recovery);
			fs.utimesSync(recovery, new Date(100_000), new Date(100_000));
			const clock = fs.statSync(recovery).mtimeMs + age;
			await assert.rejects(leaseModule.acquireLocalIndexBuildLease(f.root, 'new', {
				runtime: deterministicRuntime({ now: () => clock }),
			}), /unexpected real wait/);
			assert.equal(fs.existsSync(recovery), age < 30_000);
			assert.equal(fs.existsSync(f.lease), true);
		} finally {
			f.dispose();
		}
	});
}

for (const bytes of [16_384, 16_385]) {
	test(`owner records of ${bytes} bytes respect the 16KiB read limit`, async () => {
		const record = owner('');
		record.owner_token = 'x'.repeat(bytes - Buffer.byteLength(JSON.stringify(record)));
		const f = fixture(record);
		let clock = 0;
		let handle;
		try {
			assert.equal(fs.statSync(path.join(f.lease, 'owner.json')).size, bytes);
			const pending = leaseModule.acquireLocalIndexBuildLease(f.root, 'new', {
				runtime: deterministicRuntime({ now: () => clock, delay: async () => { clock = 300_000; } }),
			});
			if (bytes === 16_384) {
				handle = await pending;
			} else {
				await assert.rejects(pending, /local_index_builder_lease_unreadable/);
				assert.equal(fs.existsSync(f.lease), true);
			}
		} finally {
			handle?.release();
			f.dispose();
		}
	});
}

test('pre-aborted acquisition creates no cache and invokes no runtime dependencies', async () => {
	const root = createTempProject('mustflow-lease-aborted-');
	const controller = new AbortController();
	controller.abort('cancelled');
	let calls = 0;
	try {
		await assert.rejects(leaseModule.acquireLocalIndexBuildLease(root, 'new', {
			signal: controller.signal,
			runtime: { now: () => { calls += 1; return 0; } },
		}), { code: 'EINTERRUPTED', cause: 'cancelled' });
		assert.equal(calls, 0);
		assert.equal(fs.existsSync(path.join(root, '.mustflow')), false);
	} finally {
		removeTempProject(root);
	}
});

test('aborting the default wait preserves the live holder and removes candidate directories', async () => {
	const f = fixture();
	const controller = new AbortController();
	try {
		const pending = leaseModule.acquireLocalIndexBuildLease(f.root, 'new', {
			signal: controller.signal,
			runtime: {
				now: () => 0,
				isProcessLive: () => true,
				readCurrentProcessStartToken: () => 'self',
				readProcessStartToken: () => 'dead',
			},
		});
		controller.abort('during wait');
		await assert.rejects(pending, { code: 'EINTERRUPTED', cause: 'during wait' });
		assert.deepEqual(fs.readdirSync(path.dirname(f.lease)), ['builder.lease']);
	} finally {
		f.dispose();
	}
});

test('cancellation immediately after publishing a lease releases it before rejecting', async () => {
	const root = createTempProject('mustflow-lease-publish-abort-');
	const controller = new AbortController();
	try {
		await assert.rejects(leaseModule.acquireLocalIndexBuildLease(root, 'new', {
			signal: controller.signal,
			runtime: deterministicRuntime({
				rename(source, target) {
					fs.renameSync(source, target);
					if (source.includes('.candidate-')) controller.abort();
				},
			}),
		}), { code: 'EINTERRUPTED' });
		assert.deepEqual(fs.readdirSync(path.join(root, '.mustflow', 'cache', 'local-index')), []);
	} finally {
		removeTempProject(root);
	}
});

test('an owner changed during recovery is preserved instead of being renamed or removed', async () => {
	const previous = owner();
	const replacement = owner('replacement');
	const f = fixture(previous);
	const controller = new AbortController();
	let reads = 0;
	try {
		await assert.rejects(leaseModule.acquireLocalIndexBuildLease(f.root, 'new', {
			signal: controller.signal,
			runtime: deterministicRuntime({
				readOwner() {
					if (++reads === 1) return previous;
					fs.writeFileSync(path.join(f.lease, 'owner.json'), JSON.stringify(replacement));
					return replacement;
				},
				delay: async () => { controller.abort(); },
			}),
		}), { code: 'EINTERRUPTED' });
		assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.lease, 'owner.json'), 'utf8')), replacement);
		assert.deepEqual(fs.readdirSync(path.dirname(f.lease)), ['builder.lease']);
	} finally {
		f.dispose();
	}
});

test('cancellation during the recovery owner recheck prevents the destructive rename', async () => {
	const previous = owner();
	const f = fixture(previous);
	const controller = new AbortController();
	let reads = 0;
	let staleRenames = 0;
	try {
		await assert.rejects(leaseModule.acquireLocalIndexBuildLease(f.root, 'new', {
			signal: controller.signal,
			runtime: deterministicRuntime({
				readOwner() { if (++reads === 2) controller.abort('during recheck'); return previous; },
				rename(source, target) {
					if (target.includes('.stale-')) staleRenames += 1;
					fs.renameSync(source, target);
				},
			}),
		}), { code: 'EINTERRUPTED', cause: 'during recheck' });
		assert.equal(staleRenames, 0);
		assert.deepEqual(fs.readdirSync(path.dirname(f.lease)), ['builder.lease']);
	} finally {
		f.dispose();
	}
});

test('a quarantine filename already occupied by a junction or symlink is rejected', async () => {
	const f = fixture();
	const quarantine = `${f.lease}.stale-00000000-0000-4000-8000-000000000002`;
	const data = path.join(f.root, 'data');
	try {
		fs.mkdirSync(data);
		fs.writeFileSync(path.join(data, 'preserve.txt'), 'user data');
		fs.symlinkSync(data, quarantine, process.platform === 'win32' ? 'junction' : 'dir');
		await assert.rejects(leaseModule.acquireLocalIndexBuildLease(f.root, 'new', {
			runtime: deterministicRuntime(),
		}), /must not contain symlinks/);
		assert.equal(fs.readFileSync(path.join(data, 'preserve.txt'), 'utf8'), 'user data');
		assert.equal(fs.existsSync(f.lease), true);
		assert.equal(fs.existsSync(`${f.lease}.recovery`), false);
	} finally {
		f.dispose();
	}
});

for (const code of ['ENOENT', 'EACCES']) {
	test(`a recovery rename failure (${code}) never deletes its unowned destination`, async () => {
		const f = fixture();
		const failure = Object.assign(new Error('rename failed'), { code });
		let handle;
		const removed = [];
		try {
			const pending = leaseModule.acquireLocalIndexBuildLease(f.root, 'new', {
				runtime: deterministicRuntime({
					rename(source, target) {
						if (source === f.lease && target.includes('.stale-')) {
							if (code === 'ENOENT') fs.rmSync(f.lease, { recursive: true });
							throw failure;
						}
						fs.renameSync(source, target);
					},
					remove(target) { removed.push(target); fs.rmSync(target, { recursive: true, force: true }); },
				}),
			});
			if (code === 'ENOENT') handle = await pending;
			else await assert.rejects(pending, (error) => error === failure);
			assert.equal(removed.some((target) => target.includes('.stale-')), false);
			assert.equal(fs.existsSync(`${f.lease}.recovery`), false);
		} finally {
			handle?.release();
			f.dispose();
		}
	});
}

test('a collision with an existing quarantine preserves its contents', async () => {
	const f = fixture();
	const quarantine = `${f.lease}.stale-00000000-0000-4000-8000-000000000002`;
	try {
		fs.mkdirSync(quarantine);
		fs.writeFileSync(path.join(quarantine, 'preserve.txt'), 'existing data');
		await assert.rejects(leaseModule.acquireLocalIndexBuildLease(f.root, 'new', { runtime: deterministicRuntime() }));
		assert.equal(fs.readFileSync(path.join(quarantine, 'preserve.txt'), 'utf8'), 'existing data');
		assert.equal(fs.existsSync(f.lease), true);
		assert.equal(fs.existsSync(`${f.lease}.recovery`), false);
	} finally {
		f.dispose();
	}
});

test('a quarantine cleanup failure propagates and releases the recovery lock', async () => {
	const f = fixture();
	const failure = Object.assign(new Error('cleanup failed'), { code: 'EPERM' });
	try {
		await assert.rejects(leaseModule.acquireLocalIndexBuildLease(f.root, 'new', {
			runtime: deterministicRuntime({
				remove(target) {
					if (target.includes('.stale-')) throw failure;
					fs.rmSync(target, { recursive: true, force: true });
				},
			}),
		}), (error) => error === failure);
		assert.equal(fs.existsSync(`${f.lease}.recovery`), false);
		assert.equal(fs.existsSync(`${f.lease}.stale-00000000-0000-4000-8000-000000000002`), true);
	} finally {
		f.dispose();
	}
});

for (const token of ['00000000-0000-4000-8000-000000000001'.slice(0, 35), '00000000-0000-4000-8000-000000000001x', '../outside']) {
	test(`an injected invalid UUID cannot become a candidate or cleanup path (${token.length} characters)`, async () => {
		const root = createTempProject('mustflow-lease-invalid-token-');
		try {
			await assert.rejects(leaseModule.acquireLocalIndexBuildLease(root, 'new', {
				runtime: deterministicRuntime({ randomUUID: () => token }),
			}), /local_index_builder_lease_token_invalid/);
			assert.deepEqual(fs.readdirSync(path.join(root, '.mustflow', 'cache', 'local-index')), []);
		} finally {
			removeTempProject(root);
		}
	});
}
