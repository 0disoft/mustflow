import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { before, test } from 'node:test';
import { createTempProject, initProject, removeTempProject } from './helpers/cli-harness.js';
import { cloneCachedIndexedProjectFixture, getCachedIndexedProjectFixture, indexProject, searchLocalIndexDirect } from './helpers/local-index-fixtures.js';

let indexedProjectMetadata;
let tableScanIndexedProjectMetadata;

before(() => {
	indexedProjectMetadata = getCachedIndexedProjectFixture({ variant: 'workflow' }).indexOutput;
	tableScanIndexedProjectMetadata = getCachedIndexedProjectFixture({
		variant: 'workflow-table-scan',
		indexOptions: { env: { ...process.env, MUSTFLOW_TEST_DISABLE_FTS5: '1' } },
	}).indexOutput;
});

function cloneIndexedProject() {
	return cloneCachedIndexedProjectFixture({ variant: 'workflow' }, 'mustflow-search-backend-indexed-');
}

function cloneTableScanIndexedProject() {
	return cloneCachedIndexedProjectFixture(
		{
			variant: 'workflow-table-scan',
			indexOptions: { env: { ...process.env, MUSTFLOW_TEST_DISABLE_FTS5: '1' } },
		},
		'mustflow-search-backend-table-scan-indexed-',
	);
}

test('uses fts-backed token matching when the sqlite runtime supports it', async () => {
	const projectPath = cloneIndexedProject();

	try {
		const indexOutput = indexedProjectMetadata;

		if (indexOutput.search_backend !== 'fts5') {
			assert.equal(indexOutput.search_backend, 'table_scan');
			return;
		}

		const output = await searchLocalIndexDirect(projectPath, 'mustflow check');
		const mustflowCheck = output.results.find((item) => item.kind === 'command_intent' && item.name === 'mustflow_check');

		assert.equal(output.search_backend, 'fts5');
		assert.equal(output.search_fts5_available, true);
		assert.ok(mustflowCheck);
	} finally {
		removeTempProject(projectPath);
	}
});

test('falls back to table scan search when fts is unavailable', async () => {
	const projectPath = cloneTableScanIndexedProject();

	try {
		const indexOutput = tableScanIndexedProjectMetadata;
		const output = await searchLocalIndexDirect(projectPath, 'mustflow_check');
		const mustflowCheck = output.results.find((item) => item.kind === 'command_intent' && item.name === 'mustflow_check');

		assert.equal(indexOutput.search_backend, 'table_scan');
		assert.equal(indexOutput.search_fts5_available, false);
		assert.equal(output.search_backend, 'table_scan');
		assert.equal(output.search_fts5_available, false);
		assert.ok(mustflowCheck);
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses n-gram fallback for multilingual queries when fts is unavailable', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'context', 'PROJECT.md'),
			[
				'---',
				'mustflow_doc: context.project',
				'kind: mustflow-context',
				'locale: ko',
				'canonical: false',
				'revision: 1',
				'name: project',
				'authority: contextual',
				'lifecycle: user-editable',
				'---',
				'',
				'# Project Context',
				'',
				'검증상태는 로컬 색인 설명과 분리해서 판단한다.',
				'',
			].join('\n'),
		);
		const env = { ...process.env, MUSTFLOW_TEST_DISABLE_FTS5: '1' };
		indexProject(projectPath, [], { env });

		const output = await searchLocalIndexDirect(projectPath, '검증 상태');
		const projectContext = output.results.find(
			(item) => item.kind === 'document' && item.path === '.mustflow/context/PROJECT.md',
		);

		assert.equal(output.search_backend, 'table_scan');
		assert.ok(projectContext);
		assert.match(projectContext.match, /검증상태/);
	} finally {
		removeTempProject(projectPath);
	}
});
