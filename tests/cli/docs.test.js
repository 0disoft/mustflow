import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { runDocs } from '../../dist/cli/commands/docs.js';
import { cloneProjectFixture, createTempProject, initProject, removeTempProject } from './helpers/cli-harness.js';

let initializedProjectFixture;

before(() => {
	initializedProjectFixture = createTempProject('mustflow-docs-fixture-');
	initProject(initializedProjectFixture);
});

after(() => {
	if (initializedProjectFixture) {
		removeTempProject(initializedProjectFixture);
	}
});

function createDocsProject() {
	return cloneProjectFixture(initializedProjectFixture, 'mustflow-docs-');
}

function runCli(cwd, args) {
	const stdout = [];
	const stderr = [];
	const previousCwd = process.cwd();

	try {
		process.chdir(cwd);
		try {
			const status = runDocs(args.slice(1), {
				stdout(message) {
					stdout.push(`${message}\n`);
				},
				stderr(message) {
					stderr.push(`${message}\n`);
				},
			});

			return { status, stdout: stdout.join(''), stderr: stderr.join('') };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			stderr.push(`Error: ${message}\n`);
			return { status: 1, stdout: stdout.join(''), stderr: stderr.join('') };
		}
	} finally {
		process.chdir(previousCwd);
	}
}

function writeDoc(projectPath, relativePath) {
	const filePath = path.join(projectPath, relativePath);
	mkdirSync(path.dirname(filePath), { recursive: true });
	writeFileSync(filePath, '# Guide\n\nDraft prose.\n');
}

function runGit(projectPath, args) {
	return spawnSync('git', ['-C', projectPath, ...args], {
		cwd: projectPath,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	});
}

function commitGitBaseline(projectPath) {
	let result = runGit(projectPath, ['init']);
	if (result.status !== 0) {
		return false;
	}

	for (const args of [
		['config', 'user.email', 'mustflow-tests@example.invalid'],
		['config', 'user.name', 'mustflow tests'],
		['add', '.'],
		['commit', '-m', 'baseline'],
	]) {
		result = runGit(projectPath, args);
		if (result.status !== 0) {
			return false;
		}
	}

	return true;
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
	const projectPath = createDocsProject();

	try {
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

test('docs review options use shared inline value and boolean option rules', () => {
	const projectPath = createDocsProject();

	try {
		writeDoc(projectPath, 'docs/guide.md');

		const addResult = runCli(projectPath, [
			'docs',
			'review',
			'add',
			'docs/guide.md',
			'--reason=llm_modified',
			'--actor-kind=llm',
			'--actor-id=codex',
		]);
		const listResult = runCli(projectPath, ['docs', 'review', 'list', '--status=pending', '--json']);
		const booleanValue = runCli(projectPath, ['docs', 'review', 'list', '--json=true']);
		const missingValue = runCli(projectPath, ['docs', 'review', 'list', '--status=']);

		assert.equal(addResult.status, 0, addResult.stderr || addResult.stdout);
		assert.equal(listResult.status, 0, listResult.stderr || listResult.stdout);
		assert.equal(JSON.parse(listResult.stdout).count, 1);

		assert.equal(booleanValue.status, 1);
		assert.match(booleanValue.stderr, /Unknown option: --json=true/u);
		assert.match(booleanValue.stderr, /mf docs --help/u);

		assert.equal(missingValue.status, 1);
		assert.match(missingValue.stderr, /Missing value for --status/u);
		assert.match(missingValue.stderr, /mf docs --help/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('adds LLM-modified documentation to the review queue', () => {
	const projectPath = createDocsProject();

	try {
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

test('adds changed documentation review candidates from git status', (t) => {
	const projectPath = createDocsProject();

	try {
		if (!commitGitBaseline(projectPath)) {
			t.skip('git baseline could not be created in this environment');
			return;
		}

		writeDoc(projectPath, 'README.md');
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(path.join(projectPath, 'src', 'index.ts'), 'export const value = 1;\n');

		const result = runCli(projectPath, [
			'docs',
			'review',
			'add',
			'--changed',
			'--actor-kind',
			'llm',
			'--actor-id',
			'codex',
		]);
		const listResult = runCli(projectPath, ['docs', 'review', 'list', '--json']);
		const output = JSON.parse(listResult.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /Added changed documents: 1/u);
		assert.match(result.stdout, /- README\.md/u);
		assert.equal(listResult.status, 0, listResult.stderr || listResult.stdout);
		assert.equal(output.count, 1);
		assert.equal(output.documents[0].path, 'README.md');
		assert.equal(output.documents[0].last_touched_by_kind, 'llm');
		assert.equal(output.documents[0].last_touched_by_id, 'codex');
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not create a review ledger when changed files contain no documentation candidates', (t) => {
	const projectPath = createDocsProject();

	try {
		if (!commitGitBaseline(projectPath)) {
			t.skip('git baseline could not be created in this environment');
			return;
		}

		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(path.join(projectPath, 'src', 'index.ts'), 'export const value = 1;\n');

		const result = runCli(projectPath, ['docs', 'review', 'add', '--changed']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /No changed documents require review\./u);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'review', 'docs.toml')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects --changed when a path or shared comment is supplied', () => {
	const projectPath = createDocsProject();

	try {
		const pathConflict = runCli(projectPath, ['docs', 'review', 'add', 'README.md', '--changed']);
		const commentConflict = runCli(projectPath, ['docs', 'review', 'add', '--changed', '--comment', 'Review this.']);

		assert.equal(pathConflict.status, 1);
		assert.match(pathConflict.stderr, /Use --changed without a document path/u);
		assert.equal(commentConflict.status, 1);
		assert.match(commentConflict.stderr, /Use --changed without --comment or --comment-file/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects a documentation review ledger path that traverses a symlink', (t) => {
	const projectPath = createDocsProject();
	const outsidePath = createTempProject('mustflow-docs-outside-');

	try {
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
	const projectPath = createDocsProject();

	try {
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
	const projectPath = createDocsProject();

	try {
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
	const projectPath = createDocsProject();

	try {
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
	const projectPath = createDocsProject();

	try {
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
	const projectPath = createDocsProject();
	const secretRoot = createTempProject('mustflow-docs-secret-');
	const secretPath = path.join(secretRoot, 'secret.txt');

	try {
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
		removeTempProject(secretRoot);
	}
});

test('adds a document with a review comment imported from a file and removes the source file', () => {
	const projectPath = createDocsProject();

	try {
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
	const projectPath = createDocsProject();

	try {
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
	const projectPath = createDocsProject();

	try {
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
	const projectPath = createDocsProject();

	try {
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
	const projectPath = createDocsProject();

	try {
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
