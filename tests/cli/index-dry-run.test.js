import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';

test('prints a dry-run local index plan without writing sqlite', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['index', '--dry-run', '--json']);
		const output = JSON.parse(result.stdout);
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '20');
		assert.equal(output.command, 'index');
		assert.equal(output.ok, true);
		assert.equal(output.content_mode, 'metadata_and_snippets');
		assert.equal(output.store_full_content, false);
		assert.equal(output.max_snippet_bytes_per_document, 2048);
		assert.deepEqual(output.excluded_raw_data_kinds, [
			'full_source_text',
			'raw_diffs',
			'raw_terminal_logs',
			'full_transcripts',
			'hidden_reasoning',
			'environment_values',
			'secrets',
			'personal_data',
			'long_term_memory_summaries',
		]);
		assert.ok(['fts5', 'table_scan'].includes(output.search_backend));
		assert.equal(typeof output.search_fts5_available, 'boolean');
		assert.equal(output.dry_run, true);
		assert.equal(output.wrote_files, false);
		assert.equal(output.index_mode, 'full');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, null);
		assert.ok(output.indexed_file_count >= output.document_count);
		assert.equal(path.resolve(output.database_path), indexPath);
		assert.ok(output.document_count >= 7);
		assert.ok(output.skill_count >= 4);
		assert.ok(output.skill_route_count >= 4);
		assert.ok(output.command_intent_count >= 8);
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
		assert.equal(output.source_index_enabled, false);
		assert.equal(output.source_anchor_count, 0);
		assert.equal(output.source_anchor_risk_signal_count, 0);
		assert.ok(output.indexed_paths.includes('.mustflow/context/INDEX.md'));
		assert.ok(output.indexed_paths.includes('.mustflow/context/PROJECT.md'));
		assert.equal(existsSync(indexPath), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects unsupported index options with usage help', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const unknownOption = runCli(projectPath, ['index', '--bad']);
		const booleanValue = runCli(projectPath, ['index', '--json=true']);

		assert.equal(unknownOption.status, 1);
		assert.match(unknownOption.stderr, /Unknown option: --bad/u);
		assert.match(unknownOption.stderr, /Usage: mf index \[options\]/u);
		assert.equal(booleanValue.status, 1);
		assert.match(booleanValue.stderr, /Unknown option: --json=true/u);
		assert.match(booleanValue.stderr, /Usage: mf index \[options\]/u);
	} finally {
		removeTempProject(projectPath);
	}
});
