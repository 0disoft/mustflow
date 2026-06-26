import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
	LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS,
	assertLocalIndexStorageBoundary,
	cloneGraphIndexedProject,
	cloneInvalidSourceAnchorProject,
	cloneSourceAnchorIndexedProject,
	cloneSourceIndexConfigProject,
	cloneWorkflowIndexedProject,
	createLocalIndexDirect,
	createMinimalWorkflowProject,
	getCachedIndexedProjectFixture,
	importDistModule,
	loadSqlJsCached,
	prepareGraphIndexedProject,
	prepareInvalidSourceAnchorProject,
	prepareSourceAnchorProject,
	prepareSourceAnchorStatusProject,
	prepareSourceIndexConfigProject,
	queryRows,
	readLatestLocalVerificationReadModelQueriesDirect,
	removeTempProject,
	sourceAnchorStatusChangedSource,
} from './index-support.js';

test('reuses loaded sql.js runtime within the current process', async () => {
	const { loadSqlJs } = await importDistModule('cli/lib/local-index/sql.js');
	const [firstRuntime, secondRuntime] = await Promise.all([loadSqlJs(), loadSqlJs()]);
	const thirdRuntime = await loadSqlJs();

	assert.equal(firstRuntime, secondRuntime);
	assert.equal(secondRuntime, thirdRuntime);
});

test('writes a sqlite local index for mustflow documents and command intents', async () => {
	const projectPath = cloneGraphIndexedProject();
	const fixture = getCachedIndexedProjectFixture({
		variant: 'workflow-graph-marker',
		prepare: prepareGraphIndexedProject,
		prepareKey: 'graph-marker-v1',
	});

	try {
		const marker = 'TAIL_MARKER_SHOULD_NOT_BE_STORED_IN_FULL';
		const output = fixture.indexOutput;
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const header = readFileSync(indexPath).subarray(0, 16).toString('utf8');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const metadata = Object.fromEntries(queryRows(database, 'SELECT key, value FROM metadata').map((row) => [row.key, row.value]));
		const tableNames = queryRows(database, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").map((row) => row.name);
		const viewNames = queryRows(database, "SELECT name FROM sqlite_master WHERE type = 'view' ORDER BY name").map((row) => row.name);
		const documentColumns = queryRows(database, 'PRAGMA table_info(documents)').map((row) => row.name);
		const indexedFileColumns = queryRows(database, 'PRAGMA table_info(indexed_files)').map((row) => row.name);
		const [agentsIndexedFile] = queryRows(database, 'SELECT * FROM indexed_files WHERE path = "AGENTS.md"');
		const [projectContext] = queryRows(
			database,
			'SELECT content_snippet FROM documents WHERE path = ".mustflow/context/PROJECT.md"',
		);
		const [commandTerm] = queryRows(
			database,
			'SELECT term FROM document_terms WHERE document_path = ".mustflow/config/commands.toml" AND term = "mustflow_check"',
		);
		const commandNgrams = queryRows(
			database,
			'SELECT gram FROM search_ngrams WHERE target_kind = "command_intent" AND target_key = "mustflow_check" ORDER BY gram',
		).map((row) => row.gram);

		assert.equal(output.schema_version, '20');
		assert.equal(output.ok, true);
		assert.equal(output.content_mode, 'metadata_and_snippets');
		assert.equal(output.store_full_content, false);
		assert.equal(output.max_snippet_bytes_per_document, 2048);
		assert.deepEqual(output.excluded_raw_data_kinds, LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS);
		assert.ok(['fts5', 'table_scan'].includes(output.search_backend));
		assert.equal(typeof output.search_fts5_available, 'boolean');
		assert.equal(output.dry_run, false);
		assert.equal(output.wrote_files, true);
		assert.equal(output.index_mode, 'full');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, null);
		assert.ok(output.indexed_file_count >= output.document_count);
		assert.equal(output.source_index_enabled, false);
		assert.equal(output.source_anchor_count, 0);
		assert.ok(output.skill_route_count >= 4);
		assert.ok(output.command_effect_count >= 1);
		assert.equal(output.verification_evidence_summary_count, 0);
		assert.equal(output.verification_plan_count, 0);
		assert.equal(output.acceptance_criteria_count, 0);
		assert.equal(output.criterion_coverage_count, 0);
		assert.equal(output.verification_receipt_summary_count, 0);
		assert.equal(output.command_receipt_summary_count, 0);
		assert.equal(output.verification_coverage_state_count, 0);
		assert.equal(output.verification_risk_signal_count, 0);
		assert.equal(output.validation_ratchet_signal_count, 0);
		assert.equal(output.completion_verdict_summary_count, 0);
		assert.equal(output.repro_route_count, 0);
		assert.equal(output.repro_observation_count, 0);
		assert.equal(output.failure_fingerprint_count, 0);
		assert.equal(output.source_anchor_risk_signal_count, 0);
		assert.equal(header, 'SQLite format 3\0');
		assertLocalIndexStorageBoundary(database, tableNames, viewNames);
		assert.equal(metadata.schema_version, '20');
		assert.equal(metadata.content_mode, 'metadata_and_snippets');
		assert.equal(metadata.store_full_content, 'false');
		assert.equal(metadata.max_snippet_bytes_per_document, '2048');
		assert.equal(metadata.search_ngram_max_grams_per_target, '512');
		assert.equal(metadata.search_ngram_max_token_chars, '64');
		assert.equal(metadata.source_index_max_file_bytes, '262144');
		assert.equal(metadata.excluded_raw_data_kinds, LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS.join(','));
		assert.equal(metadata.search_backend, output.search_backend);
		assert.equal(metadata.search_fts5_available, String(output.search_fts5_available));
		assert.equal(metadata.parser_version, '1');
		assert.match(metadata.source_scope_hash, /^sha256:/);
		assert.equal(metadata.source_index_enabled, 'false');
		assert.equal(metadata.index_mode, 'full');
		for (const tableName of [
			'acceptance_criteria',
			'command_effects',
			'command_intents',
			'command_receipt_summaries',
			'completion_verdict_summaries',
			'criterion_coverage',
			'document_terms',
			'documents',
			'failure_fingerprints',
			'indexed_files',
			'metadata',
			'path_surface_reasons',
			'path_surfaces',
			'search_ngrams',
			'sections',
			'skill_routes',
			'skills',
			'source_anchor_fingerprints',
			'source_anchor_risk_signals',
			'source_anchor_status',
			'source_anchors',
			'repro_observations',
			'repro_routes',
			'verification_coverage_states',
			'verification_evidence_summaries',
			'verification_failure_fingerprints',
			'verification_plans',
			'verification_receipt_summaries',
			'verification_risk_signals',
			'validation_ratchet_signals',
		]) {
			assert.ok(tableNames.includes(tableName), `${tableName} should exist`);
		}
		if (output.search_backend === 'fts5') {
			for (const tableName of [
				'search_documents_fts',
				'search_skills_fts',
				'search_skill_routes_fts',
				'search_command_intents_fts',
				'search_source_anchors_fts',
			]) {
				assert.ok(tableNames.includes(tableName), `${tableName} should exist`);
			}
		}
		for (const viewName of ['command_lock_conflicts', 'command_write_locks']) {
			assert.ok(viewNames.includes(viewName), `${viewName} should exist`);
		}
		assert.ok(documentColumns.includes('content_snippet'));
		assert.equal(documentColumns.includes('content'), false);
		assert.deepEqual(indexedFileColumns, [
			'path',
			'source_scope',
			'size_bytes',
			'mtime_ms',
			'content_hash',
			'indexed_at',
			'index_mode',
			'parser_version',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(source_anchors)').map((row) => row.name), [
			'id',
			'path',
			'line_start',
			'purpose',
			'search_terms',
			'invariant',
			'risk',
			'navigation_only',
			'can_instruct_agent',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(source_anchor_fingerprints)').map((row) => row.name), [
			'anchor_id',
			'path',
			'line_start',
			'anchor_metadata_hash',
			'anchor_text_hash',
			'context_hash',
			'search_terms_hash',
			'invariant_hash',
			'risk_hash',
			'symbol_kind',
			'symbol_name',
			'symbol_exported',
			'signature_hash',
			'body_hash',
			'symbol_start_line',
			'symbol_end_line',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(source_anchor_status)').map((row) => row.name), [
			'anchor_id',
			'status',
			'confidence',
			'identity_signal',
			'location_signal',
			'symbol_signal',
			'body_signal',
			'metadata_signal',
			'semantic_signal',
			'risk_signal',
			'navigation_only',
			'can_instruct_agent',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(command_effects)').map((row) => row.name), [
			'intent',
			'source',
			'access',
			'mode',
			'path',
			'lock',
			'concurrency',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(search_ngrams)').map((row) => row.name), [
			'target_kind',
			'target_key',
			'gram',
			'source',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(command_write_locks)').map((row) => row.name), [
			'intent',
			'lock',
			'paths',
			'modes',
			'sources',
			'concurrencies',
			'effect_count',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(command_lock_conflicts)').map((row) => row.name), [
			'left_intent',
			'right_intent',
			'lock',
			'left_paths',
			'right_paths',
			'left_modes',
			'right_modes',
			'left_concurrencies',
			'right_concurrencies',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(path_surfaces)').map((row) => row.name), [
			'rule_id',
			'pattern_kind',
			'pattern',
			'pattern_flags',
			'surface_kind',
			'category',
			'is_public_surface',
			'update_policy',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(path_surface_reasons)').map((row) => row.name), [
			'rule_id',
			'reason_kind',
			'reason',
			'ordinal',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(skill_routes)').map((row) => row.name), [
			'skill_name',
			'skill_path',
			'trigger',
			'required_input',
			'edit_scope',
			'risk',
			'verification_intents',
			'expected_output',
		]);
		assert.ok(
			queryRows(database, 'SELECT * FROM skill_routes WHERE skill_name = "code-review"').some(
				(row) =>
					String(row.trigger).includes('Code changes need review') &&
					String(row.verification_intents).includes('test_related') &&
					row.skill_path === '.mustflow/skills/code-review/SKILL.md',
			),
		);
		assert.ok(
			queryRows(database, 'SELECT * FROM command_effects WHERE intent = "repo_map"').some(
				(row) =>
					row.source === 'writes' &&
					row.access === 'write' &&
					row.mode === 'write' &&
					row.path === 'REPO_MAP.md' &&
					row.lock === 'path:REPO_MAP.md' &&
					row.concurrency === 'exclusive',
			),
		);
		assert.deepEqual(queryRows(database, 'SELECT * FROM command_write_locks WHERE intent = "repo_map"'), [
			{
				intent: 'repo_map',
				lock: 'path:REPO_MAP.md',
				paths: 'REPO_MAP.md',
				modes: 'write',
				sources: 'writes',
				concurrencies: 'exclusive',
				effect_count: 1,
			},
		]);
		assert.ok(
			queryRows(database, 'SELECT * FROM command_lock_conflicts WHERE lock = "graph_artifact"').some(
				(row) =>
					row.left_intent === 'graph_writer_a' &&
					row.right_intent === 'graph_writer_b' &&
					row.left_paths === 'graph-output/**' &&
					row.right_paths === 'graph-output/**' &&
					row.left_modes === 'delete_recreate' &&
					row.right_modes === 'delete_recreate',
			),
		);
		assert.deepEqual(queryRows(database, 'SELECT * FROM path_surfaces WHERE rule_id = "readme_page"'), [
			{
				rule_id: 'readme_page',
				pattern_kind: 'regexp',
				pattern: '^README\\.md$',
				pattern_flags: 'u',
				surface_kind: 'readme_page',
				category: 'documentation',
				is_public_surface: 1,
				update_policy: 'update',
			},
		]);
		assert.deepEqual(
			queryRows(
				database,
				'SELECT reason FROM path_surface_reasons WHERE rule_id = "readme_page" AND reason_kind = "validation_reason" ORDER BY ordinal',
			).map((row) => row.reason),
			['docs_change', 'copy_change'],
		);
		assert.ok(
			queryRows(
				database,
				'SELECT reason FROM path_surface_reasons WHERE rule_id = "workflow_root" AND reason_kind = "affected_contract"',
			).some((row) => row.reason === 'command contract'),
		);
		assert.deepEqual(queryRows(database, 'SELECT id FROM source_anchors'), []);
		assert.equal(commandTerm.term, 'mustflow_check');
		assert.ok(commandNgrams.includes('mus'));
		assert.ok(commandNgrams.includes('che'));
		assert.equal(agentsIndexedFile.source_scope, 'workflow');
		assert.equal(typeof agentsIndexedFile.size_bytes, 'number');
		assert.equal(typeof agentsIndexedFile.mtime_ms, 'number');
		assert.match(agentsIndexedFile.content_hash, /^sha256:/);
		assert.match(agentsIndexedFile.indexed_at, /^\d{4}-\d{2}-\d{2}T/u);
		assert.equal(agentsIndexedFile.index_mode, 'full');
		assert.equal(agentsIndexedFile.parser_version, '1');
		assert.ok(projectContext.content_snippet.length <= 2048);
		assert.equal(projectContext.content_snippet.includes(marker), false);
		assert.ok(output.indexed_paths.includes('AGENTS.md'));
		assert.ok(output.indexed_paths.includes('.mustflow/context/INDEX.md'));
		assert.ok(output.indexed_paths.includes('.mustflow/context/PROJECT.md'));
		assert.ok(output.indexed_paths.includes('.mustflow/config/commands.toml'));
		assert.ok(output.indexed_paths.includes('.mustflow/skills/code-review/SKILL.md'));
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('reuses a fresh sqlite local index in incremental mode', async () => {
	const projectPath = cloneWorkflowIndexedProject();

	try {
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const firstBytes = readFileSync(indexPath).toString('base64');
		const secondOutput = await createLocalIndexDirect(projectPath, { incremental: true });
		const secondBytes = readFileSync(indexPath).toString('base64');

		assert.equal(secondOutput.index_mode, 'incremental');
		assert.equal(secondOutput.reused_existing, true);
		assert.equal(secondOutput.rebuild_reason, null);
		assert.equal(secondOutput.wrote_files, false);
		assert.equal(secondBytes, firstBytes);
	} finally {
		removeTempProject(projectPath);
	}
});

test('incremental preflight tolerates sub-millisecond indexed mtime drift', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-mtime-drift-');

	try {
		await createLocalIndexDirect(projectPath);
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));

		try {
			database.run('UPDATE indexed_files SET mtime_ms = mtime_ms + 0.5 WHERE path = ?', ['AGENTS.md']);
			writeFileSync(indexPath, database.export());
		} finally {
			database.close();
		}

		const firstBytes = readFileSync(indexPath).toString('base64');
		const secondOutput = await createLocalIndexDirect(projectPath, { incremental: true });
		const secondBytes = readFileSync(indexPath).toString('base64');

		assert.equal(secondOutput.index_mode, 'incremental');
		assert.equal(secondOutput.reused_existing, true);
		assert.equal(secondOutput.rebuild_reason, null);
		assert.equal(secondOutput.wrote_files, false);
		assert.equal(secondBytes, firstBytes);
	} finally {
		removeTempProject(projectPath);
	}
});

test('bounds search n-grams for unusually long tokens', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-ngram-limits-');
	const alphabet = 'abcdefghijklmnopqrstuvwxy0123456789';
	const prefixToken = `${'a'.repeat(64)}zzzzzzzzzzzzzzzz`;
	const longTokens = [
		prefixToken,
		...Array.from({ length: 12 }, (_, tokenIndex) =>
			Array.from({ length: 120 }, (_, charIndex) => alphabet[(tokenIndex * 11 + charIndex * 7) % alphabet.length]).join(''),
		),
	];

	try {
		writeFileSync(path.join(projectPath, 'AGENTS.md'), `# AGENTS.md\n\n${longTokens.join(' ')}\n`);

		const output = await createLocalIndexDirect(projectPath);
		assert.equal(output.ok, true);

		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [ngramCount] = queryRows(
			database,
			'SELECT COUNT(*) AS count FROM search_ngrams WHERE target_kind = "document" AND target_key = "AGENTS.md"',
		);
		const [lateGram] = queryRows(
			database,
			'SELECT gram FROM search_ngrams WHERE target_kind = "document" AND target_key = "AGENTS.md" AND gram = ?',
			['zz'],
		);
		const metadata = Object.fromEntries(queryRows(database, 'SELECT key, value FROM metadata').map((row) => [row.key, row.value]));

		assert.ok(ngramCount.count <= 512);
		assert.equal(metadata.search_ngram_max_grams_per_target, '512');
		assert.equal(metadata.search_ngram_max_token_chars, '64');
		assert.equal(lateGram, undefined);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('incremental mode rebuilds when indexed workflow files change', async () => {
	const projectPath = createMinimalWorkflowProject();

	try {
		await createLocalIndexDirect(projectPath);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'context', 'INDEX.md'),
			'# Context Index\n\nChanged incremental marker.\n',
		);
		writeFileSync(path.join(projectPath, '.mustflow', 'context', 'EXTRA.md'), '# Extra Context\n\nNew context file.\n');
		rmSync(path.join(projectPath, '.mustflow', 'context', 'PROJECT.md'), { force: true });

		const output = await createLocalIndexDirect(projectPath, { incremental: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [contextIndex] = queryRows(
			database,
			'SELECT content_snippet FROM documents WHERE path = ".mustflow/context/INDEX.md"',
		);
		const [extraContext] = queryRows(database, 'SELECT path FROM documents WHERE path = ".mustflow/context/EXTRA.md"');
		const [deletedProjectContext] = queryRows(
			database,
			'SELECT path FROM documents WHERE path = ".mustflow/context/PROJECT.md"',
		);
		const [extraIndexedFile] = queryRows(
			database,
			'SELECT source_scope, index_mode, parser_version FROM indexed_files WHERE path = ".mustflow/context/EXTRA.md"',
		);
		const [deletedIndexedFile] = queryRows(
			database,
			'SELECT path FROM indexed_files WHERE path = ".mustflow/context/PROJECT.md"',
		);

		assert.equal(output.index_mode, 'incremental');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, 'file_fingerprint_mismatch');
		assert.equal(output.wrote_files, true);
		assert.match(contextIndex.content_snippet, /Changed incremental marker/u);
		assert.equal(extraContext.path, '.mustflow/context/EXTRA.md');
		assert.equal(deletedProjectContext, undefined);
		assert.deepEqual(extraIndexedFile, {
			source_scope: 'workflow',
			index_mode: 'incremental',
			parser_version: '1',
		});
		assert.equal(deletedIndexedFile, undefined);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('incremental mode rebuilds when an indexed file changes without size or mtime drift', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-same-fingerprint-');

	try {
		await createLocalIndexDirect(projectPath);
		const contextIndexPath = path.join(projectPath, '.mustflow', 'context', 'INDEX.md');
		const originalStats = statSync(contextIndexPath);
		const replacement = '# Context Index\n\nChanged marker with matching byte count.\n';
		const original = readFileSync(contextIndexPath, 'utf8');
		const paddedReplacement =
			replacement.length <= original.length ? replacement.padEnd(original.length, ' ') : replacement.slice(0, original.length);

		writeFileSync(contextIndexPath, paddedReplacement);
		utimesSync(contextIndexPath, originalStats.atime, originalStats.mtime);

		const output = await createLocalIndexDirect(projectPath, { incremental: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [contextIndex] = queryRows(
			database,
			'SELECT content_snippet FROM documents WHERE path = ".mustflow/context/INDEX.md"',
		);

		assert.equal(output.index_mode, 'incremental');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, 'file_fingerprint_mismatch');
		assert.equal(output.wrote_files, true);
		assert.match(contextIndex.content_snippet, /Changed marker/u);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});
