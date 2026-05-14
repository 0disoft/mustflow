import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-docs-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
	});
}

function initProject(projectPath) {
	const result = runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

function writeDoc(projectPath, relativePath) {
	const filePath = path.join(projectPath, relativePath);
	mkdirSync(path.dirname(filePath), { recursive: true });
	writeFileSync(filePath, '# Guide\n\nDraft prose.\n');
}

function trySymlink(target, linkPath, type) {
	try {
		symlinkSync(target, linkPath, type);
		return true;
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && ['EPERM', 'ENOTSUP'].includes(error.code)) {
			return false;
		}

		throw error;
	}
}

test('lists an empty documentation review queue without creating a ledger', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['docs', 'review', 'list', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.command, 'docs review list');
		assert.equal(output.count, 0);
		assert.deepEqual(output.documents, []);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'review', 'docs.toml')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('adds LLM-modified documentation to the review queue', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeDoc(projectPath, 'docs/guide.md');

		const result = runCli(projectPath, [
			'docs',
			'review',
			'add',
			'docs/guide.md',
			'--reason',
			'llm_modified',
			'--actor-kind',
			'llm',
			'--actor-id',
			'codex',
		]);
		const listResult = runCli(projectPath, ['docs', 'review', 'list', '--json']);
		const output = JSON.parse(listResult.stdout);
		const ledger = readFileSync(path.join(projectPath, '.mustflow', 'review', 'docs.toml'), 'utf8');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(listResult.status, 0, listResult.stderr || listResult.stdout);
		assert.equal(output.count, 1);
		assert.equal(output.documents[0].path, 'docs/guide.md');
		assert.equal(output.documents[0].status, 'pending');
		assert.equal(output.documents[0].review_priority, 'P1');
		assert.equal(output.documents[0].release_blocking, false);
		assert.equal(output.documents[0].triage_reason, 'user_visible_doc');
		assert.equal(output.documents[0].last_touched_by_kind, 'llm');
		assert.equal(output.documents[0].last_touched_by_id, 'codex');
		assert.match(ledger, /path = "docs\/guide\.md"/);
		assert.match(ledger, /status = "pending"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects a documentation review ledger path that traverses a symlink', (t) => {
	const projectPath = createTempProject();
	const outsidePath = mkdtempSync(path.join(tmpdir(), 'mustflow-docs-outside-'));

	try {
		initProject(projectPath);
		writeDoc(projectPath, 'docs/guide.md');
		if (!trySymlink(outsidePath, path.join(projectPath, '.mustflow', 'review'), 'dir')) {
			t.skip('symlinks are unavailable in this environment');
			return;
		}

		const result = runCli(projectPath, [
			'docs',
			'review',
			'add',
			'docs/guide.md',
			'--reason',
			'llm_modified',
			'--actor-kind',
			'llm',
			'--actor-id',
			'codex',
		]);

		assert.equal(result.status, 1);
		assert.match(`${result.stdout}${result.stderr}`, /symlinks/);
		assert.equal(existsSync(path.join(outsidePath, 'docs.toml')), false);
	} finally {
		removeTempProject(projectPath);
		removeTempProject(outsidePath);
	}
});

test('classifies release-blocking documentation review entries as P0', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeDoc(projectPath, 'README.md');

		const addResult = runCli(projectPath, [
			'docs',
			'review',
			'add',
			'README.md',
			'--reason',
			'llm_modified',
			'--actor-kind',
			'llm',
			'--actor-id',
			'codex',
		]);
		const listResult = runCli(projectPath, ['docs', 'review', 'list', '--json']);
		const output = JSON.parse(listResult.stdout);

		assert.equal(addResult.status, 0, addResult.stderr || addResult.stdout);
		assert.equal(listResult.status, 0, listResult.stderr || listResult.stdout);
		assert.equal(output.documents[0].path, 'README.md');
		assert.equal(output.documents[0].review_priority, 'P0');
		assert.equal(output.documents[0].release_blocking, true);
		assert.equal(output.documents[0].triage_reason, 'release_contract');
	} finally {
		removeTempProject(projectPath);
	}
});

test('classifies external skill intake review entries as release-blocking authority changes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeDoc(projectPath, '.mustflow/skills/external-skill-intake/SKILL.md');

		const addResult = runCli(projectPath, [
			'docs',
			'review',
			'add',
			'.mustflow/skills/external-skill-intake/SKILL.md',
			'--reason',
			'llm_modified',
			'--actor-kind',
			'llm',
			'--actor-id',
			'codex',
		]);
		const listResult = runCli(projectPath, ['docs', 'review', 'list', '--json']);
		const output = JSON.parse(listResult.stdout);

		assert.equal(addResult.status, 0, addResult.stderr || addResult.stdout);
		assert.equal(listResult.status, 0, listResult.stderr || listResult.stdout);
		assert.equal(output.documents[0].path, '.mustflow/skills/external-skill-intake/SKILL.md');
		assert.equal(output.documents[0].review_priority, 'P0');
		assert.equal(output.documents[0].release_blocking, true);
		assert.equal(output.documents[0].triage_reason, 'authority_or_security_skill');
	} finally {
		removeTempProject(projectPath);
	}
});

test('classifies fixture documentation review entries as non-blocking P2', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeDoc(projectPath, 'tests/fixtures/broken-doc.md');

		const addResult = runCli(projectPath, ['docs', 'review', 'add', 'tests/fixtures/broken-doc.md']);
		const listResult = runCli(projectPath, ['docs', 'review', 'list', '--json']);
		const output = JSON.parse(listResult.stdout);

		assert.equal(addResult.status, 0, addResult.stderr || addResult.stdout);
		assert.equal(listResult.status, 0, listResult.stderr || listResult.stdout);
		assert.equal(output.documents[0].path, 'tests/fixtures/broken-doc.md');
		assert.equal(output.documents[0].review_priority, 'P2');
		assert.equal(output.documents[0].release_blocking, false);
		assert.equal(output.documents[0].triage_reason, 'test_fixture');
	} finally {
		removeTempProject(projectPath);
	}
});

test('records multiline review comments from a file', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeDoc(projectPath, 'docs/guide.md');
		writeFileSync(
			path.join(projectPath, 'review-note.md'),
			'First awkward phrase needs a rewrite.\n\nSecond item needs terminology cleanup.\n',
		);
		assert.equal(runCli(projectPath, ['docs', 'review', 'add', 'docs/guide.md']).status, 0);

		const commentResult = runCli(projectPath, [
			'docs',
			'review',
			'comment',
			'docs/guide.md',
			'--comment-file',
			'review-note.md',
			'--actor-kind',
			'human',
			'--actor-id',
			'cherr',
		]);
		const listResult = runCli(projectPath, ['docs', 'review', 'list', '--json']);
		const output = JSON.parse(listResult.stdout);
		const ledger = readFileSync(path.join(projectPath, '.mustflow', 'review', 'docs.toml'), 'utf8');

		assert.equal(commentResult.status, 0, commentResult.stderr || commentResult.stdout);
		assert.equal(listResult.status, 0, listResult.stderr || listResult.stdout);
		assert.equal(output.documents[0].status, 'pending');
		assert.equal(output.documents[0].review_comment, 'First awkward phrase needs a rewrite.\n\nSecond item needs terminology cleanup.');
		assert.equal(output.documents[0].commented_by_kind, 'human');
		assert.equal(output.documents[0].commented_by_id, 'cherr');
		assert.equal(existsSync(path.join(projectPath, 'review-note.md')), false);
		assert.match(ledger, /review_comment = /);
		assert.match(ledger, /Second item needs terminology cleanup/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects comment files that resolve through a symlink', (t) => {
	const projectPath = createTempProject();
	const secretPath = path.join(tmpdir(), `mustflow-docs-secret-${process.pid}-${Date.now()}.txt`);

	try {
		initProject(projectPath);
		writeDoc(projectPath, 'docs/guide.md');
		writeFileSync(secretPath, 'TOP_SECRET_TOKEN=abc123\n');
		if (!trySymlink(secretPath, path.join(projectPath, 'review-note.md'), 'file')) {
			t.skip('symlinks are unavailable in this environment');
			return;
		}

		const result = runCli(projectPath, [
			'docs',
			'review',
			'add',
			'docs/guide.md',
			'--comment-file',
			'review-note.md',
			'--actor-kind',
			'llm',
			'--actor-id',
			'codex',
		]);
		const listResult = runCli(projectPath, ['docs', 'review', 'list', '--json']);

		assert.equal(result.status, 1);
		assert.match(`${result.stdout}${result.stderr}`, /symlinks/);
		assert.doesNotMatch(listResult.stdout, /TOP_SECRET_TOKEN/);
		assert.equal(existsSync(path.join(projectPath, 'review-note.md')), true);
	} finally {
		removeTempProject(projectPath);
		rmSync(secretPath, { force: true });
	}
});

test('adds a document with a review comment imported from a file and removes the source file', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeDoc(projectPath, 'docs/guide.md');
		writeFileSync(path.join(projectPath, 'review-note.md'), 'Rewrite the literal translation in the introduction.\n');

		const result = runCli(projectPath, [
			'docs',
			'review',
			'add',
			'docs/guide.md',
			'--comment-file',
			'review-note.md',
			'--actor-kind',
			'llm',
			'--actor-id',
			'codex',
		]);
		const listResult = runCli(projectPath, ['docs', 'review', 'list', '--json']);
		const output = JSON.parse(listResult.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(listResult.status, 0, listResult.stderr || listResult.stdout);
		assert.equal(output.documents[0].review_comment, 'Rewrite the literal translation in the introduction.');
		assert.equal(existsSync(path.join(projectPath, 'review-note.md')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects using the reviewed document as the comment file', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeDoc(projectPath, 'docs/guide.md');
		assert.equal(runCli(projectPath, ['docs', 'review', 'add', 'docs/guide.md']).status, 0);

		const result = runCli(projectPath, [
			'docs',
			'review',
			'comment',
			'docs/guide.md',
			'--comment-file',
			'docs/guide.md',
		]);

		assert.equal(result.status, 1);
		assert.match(`${result.stdout}${result.stderr}`, /comment-file/);
		assert.equal(existsSync(path.join(projectPath, 'docs', 'guide.md')), true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('adds a document with an inline review comment', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeDoc(projectPath, 'docs/guide.md');

		const result = runCli(projectPath, [
			'docs',
			'review',
			'add',
			'docs/guide.md',
			'--comment',
			'Rewrite the literal translation in the introduction.',
			'--actor-kind',
			'llm',
			'--actor-id',
			'codex',
		]);
		const listResult = runCli(projectPath, ['docs', 'review', 'list', '--json']);
		const output = JSON.parse(listResult.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.documents[0].review_comment, 'Rewrite the literal translation in the introduction.');
		assert.equal(output.documents[0].commented_by_kind, 'llm');
		assert.equal(output.documents[0].commented_by_id, 'codex');
	} finally {
		removeTempProject(projectPath);
	}
});

test('allows any named LLM reviewer to approve and hide a reviewed document', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeDoc(projectPath, 'docs/guide.md');
		assert.equal(runCli(projectPath, ['docs', 'review', 'add', 'docs/guide.md']).status, 0);

		const approveResult = runCli(projectPath, [
			'docs',
			'review',
			'approve',
			'docs/guide.md',
			'--reviewer-kind',
			'llm',
			'--reviewer-id',
			'opencode',
			'--reviewer-provider',
			'deepseek',
			'--reviewer-model',
			'deepseek-reasoner',
			'--summary',
			'Rewrote awkward prose and checked meaning.',
		]);
		const activeResult = runCli(projectPath, ['docs', 'review', 'list', '--json']);
		const allResult = runCli(projectPath, ['docs', 'review', 'list', '--all', '--json']);
		const active = JSON.parse(activeResult.stdout);
		const all = JSON.parse(allResult.stdout);

		assert.equal(approveResult.status, 0, approveResult.stderr || approveResult.stdout);
		assert.equal(active.count, 0);
		assert.equal(all.count, 1);
		assert.equal(all.documents[0].status, 'approved');
		assert.equal(all.documents[0].reviewer_kind, 'llm');
		assert.equal(all.documents[0].reviewer_id, 'opencode');
		assert.equal(all.documents[0].reviewer_provider, 'deepseek');
		assert.equal(all.documents[0].reviewer_model, 'deepseek-reasoner');
		assert.match(all.documents[0].review_summary, /awkward prose/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects concrete reviewer names as reviewer kinds', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeDoc(projectPath, 'docs/guide.md');
		assert.equal(runCli(projectPath, ['docs', 'review', 'add', 'docs/guide.md']).status, 0);

		const result = runCli(projectPath, [
			'docs',
			'review',
			'approve',
			'docs/guide.md',
			'--reviewer-kind',
			'claude-code',
			'--reviewer-id',
			'claude-code',
		]);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Invalid reviewer kind/);
		assert.match(result.stderr, /human, llm, tool, external/);
	} finally {
		removeTempProject(projectPath);
	}
});
