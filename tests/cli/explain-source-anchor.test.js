import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';

test('explains source anchors as navigation-only code coordinates', () => {
	const projectPath = createTempProject('mustflow-explain-anchor-');

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'auth.ts'),
			`/**
 * mf:anchor auth.session.resolve
 * purpose: Map verified server session claims to app user context.
 * search: login, session refresh, role mapping, authorization
 * invariant: Do not trust client-provided role values.
 * risk: authz, pii
 */
export function resolveSessionUser() {
	return null;
}
`,
		);

		const result = runCli(projectPath, ['explain', 'anchor', 'auth.session.resolve', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'anchor');
		assert.equal(report.decision.kind, 'found');
		assert.equal(report.decision.inputAnchor, 'auth.session.resolve');
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.equal(report.decision.anchor.id, 'auth.session.resolve');
		assert.equal(report.decision.anchor.path, 'src/auth.ts');
		assert.equal(report.decision.anchor.navigationOnly, true);
		assert.equal(report.decision.anchor.canInstructAgent, false);
		assert.deepEqual(report.decision.anchor.search, ['login', 'session refresh', 'role mapping', 'authorization']);
		assert.deepEqual(report.decision.anchor.risk, ['authz', 'pii']);
		assert.match(report.decision.effectiveAction, /trust the current code/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports missing source anchors without inventing authority', () => {
	const projectPath = createTempProject('mustflow-explain-anchor-');

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'anchor', 'missing.anchor', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'anchor');
		assert.equal(report.decision.kind, 'missing');
		assert.equal(report.decision.inputAnchor, 'missing.anchor');
		assert.equal(report.decision.anchor, null);
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.match(report.decision.reason, /optional/);
	} finally {
		removeTempProject(projectPath);
	}
});
