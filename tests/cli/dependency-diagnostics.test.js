import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { DependencyFailure, formatDependencyFailure } from '../../dist/core/dependency-diagnostics.js';
import { searchLocalIndex } from '../../dist/cli/lib/local-index.js';
import { loadSqlJs } from '../../dist/cli/lib/local-index/sql.js';
import { createTempProject, projectRoot, removeTempProject } from './helpers/cli-harness.js';
import { assertMatchesSchema } from '../helpers/json-schema.js';

test('safe diagnostics preserve original causes without exposing their messages', () => {
	const original = new Error('secret database contents', { cause: Object.assign(new Error('token=secret'), { code: 'EACCES' }) });
	const failure = new DependencyFailure('Local index', 'database_read', original);
	assert.equal(failure.cause, original);
	assert.match(formatDependencyFailure(failure), /Error -> EACCES/u);
	assert.doesNotMatch(formatDependencyFailure(failure), /secret|token=/u);
});

test('corrupt index falls back explicitly for workflow and all scopes but fails source-only searches', async () => {
	const root = createTempProject();
	try {
		mkdirSync(path.join(root, '.mustflow/cache'), { recursive: true });
		writeFileSync(path.join(root, '.mustflow/cache/mustflow.sqlite'), 'corrupt database');
		writeFileSync(path.join(root, 'AGENTS.md'), '# Needle\nFind needle here.\n');
		for (const scope of ['workflow', 'all']) {
			let original;
			const report = await searchLocalIndex(root, 'needle', { scope, onError: (error) => { original = error; } });
			assert.ok(report.results.length > 0);
			assert.ok(['database_open', 'query'].includes(report.degraded.failure_stage));
			assert.equal(original.diagnosticId, report.degraded.diagnostic_id);
			assert.ok(original.cause instanceof Error);
			assert.deepEqual(report.degraded.unavailable_scopes, scope === 'all' ? ['source'] : []);
			assertMatchesSchema(path.join(projectRoot, 'schemas'), 'search-report.schema.json', report);
		}
		await assert.rejects(searchLocalIndex(root, 'needle', { scope: 'source' }),
			(error) => error instanceof DependencyFailure && ['database_open', 'query'].includes(error.stage) && error.cause instanceof Error);
	} finally {
		removeTempProject(root);
	}
});

test('missing source index is reported as unavailable rather than zero matches', async () => {
	const root = createTempProject();
	try {
		await assert.rejects(searchLocalIndex(root, 'needle', { scope: 'source' }),
			(error) => error.stage === 'database_read' && error.cause.code === 'ENOENT');
	} finally {
		removeTempProject(root);
	}
});

test('cancelled SQL/search callers preserve cancellation instead of reporting a degraded result', async () => {
	const controller = new AbortController();
	const reason = new Error('request gone');
	controller.abort(reason);
	const cancelled = (error) => error.code === 'EINTERRUPTED' && error.cause === reason;
	await assert.rejects(loadSqlJs({ signal: controller.signal }), cancelled);
	await assert.rejects(searchLocalIndex('.', 'needle', { signal: controller.signal }), cancelled);
	assert.equal(typeof (await loadSqlJs()).Database, 'function');
});

test('stdio report failures keep stdout generic and send safe diagnostics to stderr', () => {
	const script = `
import { runApiServe } from './dist/cli/commands/api/serve.js';
const original = Object.assign(new Error('secret database password'), { code: 'EACCES' });
const reporter = { stdout: (text) => process.stdout.write(text + '\\n'), stderr: (text) => process.stderr.write(text + '\\n') };
await runApiServe(['--stdio'], reporter, 'en', {
	getHelp: () => '', createReport: () => { throw original; },
	onError: (error) => { if (error.cause !== original) throw new Error('lost cause'); }
});
`;
	const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
		cwd: projectRoot, input: JSON.stringify({ id: 'probe', action: 'health' }) + '\n',
		encoding: 'utf8', timeout: 5000, windowsHide: true,
	});
	assert.equal(result.status, 0, result.stderr);
	const response = JSON.parse(result.stdout);
	assert.equal(response.error.code, 'report_unavailable');
	assert.match(result.stderr, /API report unavailable.*diagnostic.*EACCES/u);
	assert.doesNotMatch(result.stdout + result.stderr, /secret|password/u);
});
