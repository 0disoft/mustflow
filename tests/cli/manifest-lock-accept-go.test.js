import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const toolRoot = path.join(projectRoot, 'tools', 'manifest-lock-accept');
const processBufferBytes = 8 * 1024 * 1024;
const goAvailable = hasGo();
const binaryRoot = goAvailable ? tempRoot('mustflow-lock-go-bin-') : undefined;
const binaryPath = binaryRoot
	? path.join(binaryRoot, process.platform === 'win32' ? 'manifest-lock-accept.exe' : 'manifest-lock-accept')
	: undefined;

function run(command, args, options = {}) {
	return spawnSync(command, args, {
		encoding: 'utf8',
		maxBuffer: processBufferBytes,
		windowsHide: true,
		...options,
	});
}

function hasGo() {
	return run('go', ['version']).status === 0;
}

function tempRoot(prefix) {
	return mkdtempSync(path.join(tmpdir(), prefix));
}

function removeTempRoot(root) {
	rmSync(root, { recursive: true, force: true });
}

function sha256Text(content) {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function buildTool(outputPath) {
	const goCache = path.join(path.dirname(outputPath), 'gocache');
	mkdirSync(goCache, { recursive: true });
	const result = run('go', ['build', '-o', outputPath, '.'], {
		cwd: toolRoot,
		env: {
			...process.env,
			GOCACHE: goCache,
		},
	});
	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.equal(existsSync(outputPath), true);
}

before(() => {
	if (!goAvailable) {
		return;
	}
	buildTool(binaryPath);
});

after(() => {
	if (binaryRoot) {
		removeTempRoot(binaryRoot);
	}
});

function writeFixture(root) {
	mkdirSync(path.join(root, '.mustflow', 'config'), { recursive: true });
	mkdirSync(path.join(root, '.mustflow', 'docs'), { recursive: true });
	writeFileSync(path.join(root, 'AGENTS.md'), 'agents v1\n');
	writeFileSync(path.join(root, '.mustflow', 'docs', 'agent-workflow.md'), 'workflow v1\n');
	writeFileSync(
		path.join(root, '.mustflow', 'config', 'manifest.lock.toml'),
		`schema_version = "1"

[template]
id = "default"
version = "2.24.0"
profile = "library"
locale = "en"

[files."AGENTS.md"]
source = "template_locale"
last_action = "created"
content_hash = "sha256:${'0'.repeat(64)}"
`,
	);
}

test('Go manifest lock accept binary refreshes an existing file hash', { skip: !goAvailable }, () => {
	const fixtureRoot = tempRoot('mustflow-lock-go-fixture-');

	try {
		writeFixture(fixtureRoot);

		writeFileSync(path.join(fixtureRoot, 'AGENTS.md'), 'agents v2\n');
		const result = run(binaryPath, ['AGENTS.md'], { cwd: fixtureRoot });

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(JSON.parse(result.stdout), {
			schema_version: '1',
			command: 'accept-manifest-lock-baseline',
			updated: ['AGENTS.md'],
		});

		const lock = readFileSync(path.join(fixtureRoot, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');
		assert.match(lock, /source = "template_locale"/);
		assert.match(lock, /last_action = "customized"/);
		assert.match(lock, new RegExp(`content_hash = "${sha256Text('agents v2\n')}"`));
	} finally {
		removeTempRoot(fixtureRoot);
	}
});

test('Go manifest lock accept binary rejects missing entries unless explicitly allowed', { skip: !goAvailable }, () => {
	const fixtureRoot = tempRoot('mustflow-lock-go-fixture-');

	try {
		writeFixture(fixtureRoot);

		const reject = run(binaryPath, ['.mustflow/docs/agent-workflow.md'], { cwd: fixtureRoot });
		assert.equal(reject.status, 2);
		assert.match(reject.stderr, /manifest lock has no entry/);

		const accept = run(binaryPath, ['--allow-new', '.mustflow/docs/agent-workflow.md'], { cwd: fixtureRoot });
		assert.equal(accept.status, 0, accept.stderr || accept.stdout);
		assert.deepEqual(JSON.parse(accept.stdout).updated, ['.mustflow/docs/agent-workflow.md']);

		const lock = readFileSync(path.join(fixtureRoot, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');
		assert.match(lock, /\[files\."\.mustflow\/docs\/agent-workflow\.md"\]/);
		assert.match(lock, new RegExp(`content_hash = "${sha256Text('workflow v1\n')}"`));
	} finally {
		removeTempRoot(fixtureRoot);
	}
});

test('Go manifest lock accept binary rejects paths outside the root', { skip: !goAvailable }, () => {
	const fixtureRoot = tempRoot('mustflow-lock-go-fixture-');

	try {
		writeFixture(fixtureRoot);

		const result = run(binaryPath, ['../outside.txt'], { cwd: fixtureRoot });
		assert.equal(result.status, 2);
		assert.match(result.stderr, /path escapes root/);
	} finally {
		removeTempRoot(fixtureRoot);
	}
});
