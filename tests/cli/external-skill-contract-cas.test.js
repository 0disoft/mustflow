import assert from 'node:assert/strict';
import fs from 'node:fs';
import { once } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { test } from 'node:test';
import { writeTrustedScriptCommandContract } from '../../dist/cli/lib/external-skill-import.js';
import { parseTomlText } from '../../dist/cli/lib/toml.js';
import { createTempProject, projectRoot, removeTempProject } from './helpers/cli-harness.js';

const commandsRelative = '.mustflow/config/commands.toml';
function createFixture() {
	const root = createTempProject('mustflow-skill-contract-cas-');
	fs.mkdirSync(path.join(root, '.mustflow/config'), { recursive: true });
	fs.writeFileSync(path.join(root, commandsRelative), 'schema_version = "1"\n');
	return root;
}

function data(name) {
	const skillDir = `.mustflow/external-skills/${name}`;
	return {
		target: { root: '.mustflow/external-skills', skill_name: name, skill_dir: skillDir, provenance_path: `${skillDir}/mustflow-skill-source.json` },
		source: { source_url: `https://github.com/example/skills/tree/main/${name}` },
		trust: {
			requested: true, status: 'trusted', grants_command_authority: true, command_contract_path: commandsRelative,
			include_entry: `commands/external-skills-${name}.toml`, fragment_path: `.mustflow/config/commands/external-skills-${name}.toml`,
			intents: [{ intent: `external_${name}_run`, script_path: 'scripts/run.js', argv: ['node', `${skillDir}/scripts/run.js`] }],
		},
	};
}

const writerScript = `
const fs = require('node:fs');
const path = require('node:path');
const { syncBuiltinESMExports } = require('node:module');
const { parentPort, workerData: input } = require('node:worker_threads');
const gate = new Int32Array(input.gate);
const commands = path.join(input.root, '.mustflow/config/commands.toml');
const owner = path.join(input.root, '.mustflow/cache/manifest-lock-accept.owner.json');
const commandDescriptors = new Set();
const originalOpen = fs.openSync, originalRead = fs.readSync, originalClose = fs.closeSync;
let paused = false, reportedContention = false;
fs.openSync = function(file, ...args) {
  try {
    const fd = originalOpen.call(this, file, ...args);
    if (file === commands) commandDescriptors.add(fd);
    return fd;
  } catch (error) {
    if (file === owner && error.code === 'EEXIST' && !reportedContention) {
      reportedContention = true;
      parentPort.postMessage('contended');
    }
    throw error;
  }
};
fs.readSync = function(file, ...args) {
  const count = originalRead.call(this, file, ...args);
  if (commandDescriptors.has(file) && count > 0 && !paused) {
    paused = true;
    parentPort.postMessage('snapshot');
    if (Atomics.wait(gate, 0, 0, 5000) === 'timed-out') throw new Error('writer barrier timed out');
  }
  return count;
};
fs.closeSync = function(fd) { commandDescriptors.delete(fd); return originalClose.call(this, fd); };
syncBuiltinESMExports();
(async () => {
  const { writeTrustedScriptCommandContract } = await import(input.moduleUrl);
  writeTrustedScriptCommandContract(input.root, input.data.target, input.data.source, input.data.trust);
  parentPort.close();
})();
`;

test('two independent writers racing a command snapshot preserve both includes', { timeout: 15000 }, async () => {
	const root = createFixture();
	const gate = new Int32Array(new SharedArrayBuffer(4));
	const workers = [];
	function writer(name) {
		const worker = new Worker(writerScript, { eval: true, workerData: {
			root, gate: gate.buffer, data: data(name),
			moduleUrl: pathToFileURL(path.join(projectRoot, 'dist/cli/lib/external-skill-import.js')).href,
		} });
		const exit = once(worker, 'exit');
		void exit.catch(() => {});
		workers.push({ worker, exit });
		return {
			worker,
			phase: Promise.race([
				once(worker, 'message').then(([phase]) => phase),
				exit.then(([code]) => { throw new Error(`writer exited before reaching the barrier: ${code}`); }),
			]),
		};
	}
	try {
		const first = writer('alpha');
		assert.equal(await first.phase, 'snapshot');
		const second = writer('beta');
		const phase = await second.phase;
		assert.ok(['snapshot', 'contended'].includes(phase));
		Atomics.store(gate, 0, 1);
		Atomics.notify(gate, 0);
		for (const { exit } of workers) assert.equal((await exit)[0], 0);
		const commands = parseTomlText(fs.readFileSync(path.join(root, commandsRelative), 'utf8'));
		assert.deepEqual([...commands.include.files].sort(), [data('alpha').trust.include_entry, data('beta').trust.include_entry]);
		for (const name of ['alpha', 'beta']) assert.ok(fs.existsSync(path.join(root, data(name).trust.fragment_path)));
		assert.equal(fs.existsSync(path.join(root, '.mustflow/cache/manifest-lock-accept.owner.json')), false);
	} finally {
		Atomics.store(gate, 0, 1);
		Atomics.notify(gate, 0);
		await Promise.allSettled(workers.map(({ worker }) => worker.terminate()));
		removeTempProject(root);
	}
});

for (const existing of [false, true]) {
	for (const phase of ['fragment', 'commands', 'conflict']) {
		test(`${phase} failure restores ${existing ? 'the previous' : 'an absent'} fragment and releases the CAS owner`, (t) => {
			const root = createFixture();
			const input = data('alpha');
			const commands = path.join(root, commandsRelative);
			const fragment = path.join(root, input.trust.fragment_path);
			const original = fs.readFileSync(commands, 'utf8');
			const foreignContent = `${original}\n# concurrent edit\n`;
			const oldFragment = '# previous trusted contract\n';
			const failure = Object.assign(new Error('publication failed'), { code: 'EIO' });
			fs.mkdirSync(path.dirname(fragment), { recursive: true });
			if (existing) fs.writeFileSync(fragment, oldFragment);
			const rename = fs.renameSync;
			const mocked = t.mock.method(fs, 'renameSync', (source, destination) => {
				if (phase === 'fragment' && destination === fragment) throw failure;
				if (phase === 'commands' && destination === commands) throw failure;
				const result = rename(source, destination);
				if (phase === 'conflict' && destination === fragment) fs.writeFileSync(commands, foreignContent);
				return result;
			});
			syncBuiltinESMExports();
			try {
				assert.throws(() => writeTrustedScriptCommandContract(root, input.target, input.source, input.trust),
					phase === 'conflict' ? /command contract CAS conflict/ : (error) => error === failure);
				assert.equal(fs.readFileSync(commands, 'utf8'), phase === 'conflict' ? foreignContent : original);
				if (existing) assert.equal(fs.readFileSync(fragment, 'utf8'), oldFragment);
				else assert.equal(fs.existsSync(fragment), false);
				assert.equal(fs.existsSync(path.join(root, '.mustflow/cache/manifest-lock-accept.owner.json')), false);
				assert.equal(fs.readdirSync(path.dirname(fragment)).some((name) => name.endsWith('.tmp')), false);
				mocked.mock.restore();
				syncBuiltinESMExports();
				const next = data('beta');
				writeTrustedScriptCommandContract(root, next.target, next.source, next.trust);
				assert.deepEqual(parseTomlText(fs.readFileSync(commands, 'utf8')).include.files, [next.trust.include_entry]);
			} finally {
				mocked.mock.restore();
				syncBuiltinESMExports();
				removeTempProject(root);
			}
		});
	}
}

for (const replaced of [false, true]) {
	test(`partial CAS owner writes clean up their own file and ${replaced ? 'preserve a replacement owner' : 'allow another import'}`, (t) => {
		const root = createFixture();
		const owner = path.join(root, '.mustflow/cache/manifest-lock-accept.owner.json');
		const foreignContent = '{"owner_token":"another owner"}\n';
		const input = data('alpha');
		const open = fs.openSync;
		const write = fs.writeFileSync;
		let ownerDescriptor;
		const opening = t.mock.method(fs, 'openSync', (file, ...args) => {
			const fd = open(file, ...args);
			if (file === owner) ownerDescriptor = fd;
			return fd;
		});
		const failure = Object.assign(new Error('owner write failed'), { code: 'ENOSPC' });
		const writing = t.mock.method(fs, 'writeFileSync', (file, ...args) => {
			if (file === ownerDescriptor) {
				write(file, '{');
				if (replaced) {
					fs.renameSync(owner, `${owner}.previous`);
					write(owner, foreignContent);
				}
				throw failure;
			}
			return write(file, ...args);
		});
		syncBuiltinESMExports();
		try {
			assert.throws(() => writeTrustedScriptCommandContract(root, input.target, input.source, input.trust), (error) => error === failure);
			assert.throws(() => fs.fstatSync(ownerDescriptor), { code: 'EBADF' });
			if (replaced) assert.equal(fs.readFileSync(owner, 'utf8'), foreignContent);
			else assert.equal(fs.existsSync(owner), false);
			opening.mock.restore();
			writing.mock.restore();
			syncBuiltinESMExports();
			if (!replaced) writeTrustedScriptCommandContract(root, input.target, input.source, input.trust);
		} finally {
			opening.mock.restore();
			writing.mock.restore();
			syncBuiltinESMExports();
			removeTempProject(root);
		}
	});
}
