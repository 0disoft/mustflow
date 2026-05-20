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
	loadSqlJsCached,
	prepareGraphIndexedProject,
	prepareInvalidSourceAnchorProject,
	prepareSourceAnchorProject,
	prepareSourceAnchorStatusProject,
	prepareSourceIndexConfigProject,
	queryRows,
	readLatestLocalVerificationReadModelQueriesDirect,
	removeTempProject,
	runCli,
	sourceAnchorStatusChangedSource,
} from './index-support.js';

test('incremental mode rebuilds when indexed verification evidence changes', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-evidence-incremental-');

	try {
		await createLocalIndexDirect(projectPath);
		mkdirSync(path.join(projectPath, '.mustflow', 'state', 'runs'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'),
			JSON.stringify(
				{
					schema_version: '1',
					command: 'verify',
					status: 'failed',
					verification_plan_id: 'plan-evidence-incremental',
					evidence_model: {
						verification_plan_id: 'plan-evidence-incremental',
						receipts: [],
						requirements: [],
						coverage_matrix: [],
						remaining_risks: [{ code: 'missing_evidence', severity: 'medium', detail: 'bounded detail' }],
					},
				},
				null,
				2,
			),
		);

		const output = await createLocalIndexDirect(projectPath, { incremental: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [stateIndexedFile] = queryRows(
			database,
			'SELECT source_scope, index_mode FROM indexed_files WHERE path = ".mustflow/state/runs/latest.json"',
		);
		const [riskSignal] = queryRows(
			database,
			'SELECT code, severity FROM verification_risk_signals WHERE source_path = ".mustflow/state/runs/latest.json"',
		);

		assert.equal(output.index_mode, 'incremental');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, 'file_fingerprint_mismatch');
		assert.equal(output.wrote_files, true);
		assert.equal(output.verification_risk_signal_count, 1);
		assert.deepEqual(stateIndexedFile, {
			source_scope: 'state',
			index_mode: 'incremental',
		});
		assert.deepEqual(riskSignal, {
			code: 'missing_evidence',
			severity: 'medium',
		});
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('indexes latest verification evidence as bounded read-model summaries', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-verdict-evidence-');

	try {
		mkdirSync(path.join(projectPath, '.mustflow', 'state', 'runs'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'),
			JSON.stringify(
				{
					schema_version: '1',
					command: 'verify',
					kind: 'verify_run_summary',
					reason: 'code_change',
					reasons: ['code_change'],
					plan_source: null,
					verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
					status: 'failed',
					completion_verdict: {
						schema_version: '1',
						status: 'contradicted',
						primary_reason: 'one_or_more_selected_verification_intents_failed',
						evidence: {
							source: 'mf_verify',
							verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
							changed_file_count: 1,
							matched_intents: 1,
							ran_intents: 1,
							passed_intents: 0,
							failed_intents: 1,
							skipped_intents: 0,
							receipt_count: 1,
							gap_count: 0,
							source_anchor_risk_count: 1,
							scope_diff_risk_count: 0,
							repeated_failure_count: 1,
							validation_ratchet_risk_count: 1,
							repro_evidence_risk_count: 0,
							external_evidence_risk_count: 0,
							write_drift_risk_count: 0,
							receipt_binding_risk_count: 0,
							stale_receipt_count: 0,
							plan_mismatch_count: 0,
							risks: {
								source_anchor: 1,
								scope_diff: 0,
								repeated_failure: 1,
								validation_ratchet: 1,
								repro_evidence: 0,
								external_evidence: 0,
								write_drift: 0,
								receipt_binding: 0,
								stale_receipt: 0,
								plan_mismatch: 0,
							},
							receipt_binding: {
								plan_bound_count: 1,
								plan_unbound_count: 0,
								fingerprint_bound_count: 1,
								fingerprint_unbound_count: 0,
								current_state_bound_count: 0,
								current_state_unavailable_count: 1,
								stale_count: 0,
								plan_mismatch_count: 0,
							},
							latest_run_status: 'failed',
						},
						blockers: [],
						contradictions: ['one_or_more_selected_verification_intents_failed'],
						limitations: [],
					},
					failure_fingerprint: {
						schema_version: '1',
						fingerprint: `sha256:${'f'.repeat(64)}`,
						verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
						failed_intents_hash: `sha256:${'c'.repeat(64)}`,
						exit_code_classes_hash: `sha256:${'1'.repeat(64)}`,
						timeout_flags_hash: `sha256:${'2'.repeat(64)}`,
						error_kinds_hash: `sha256:${'3'.repeat(64)}`,
						diagnostic_hash: `sha256:${'4'.repeat(64)}`,
						risk_codes_hash: `sha256:${'d'.repeat(64)}`,
						affected_surfaces_hash: `sha256:${'e'.repeat(64)}`,
						command_fingerprints_hash: `sha256:${'5'.repeat(64)}`,
					},
					repeated_failure_summary: {
						schema_version: '1',
						fingerprint: `sha256:${'f'.repeat(64)}`,
						verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
						status: 'failed',
						failed_intents_hash: `sha256:${'c'.repeat(64)}`,
						risk_codes_hash: `sha256:${'d'.repeat(64)}`,
						affected_surfaces_hash: `sha256:${'e'.repeat(64)}`,
						first_seen_at: '2026-05-17T00:00:00.000Z',
						last_seen_at: '2026-05-17T00:01:00.000Z',
						seen_count: 2,
						requires_new_evidence: true,
					},
					repro_evidence: {
						source: 'repro_first_debug',
						authority: 'claim_evidence',
						reported_symptom: 'RAW_REPRO_SYMPTOM_SHOULD_NOT_BE_STORED',
						expected_behavior: 'RAW_REPRO_EXPECTED_SHOULD_NOT_BE_STORED',
						observed_behavior: 'RAW_REPRO_OBSERVED_SHOULD_NOT_BE_STORED',
						reproduction_route: {
							route_id: 'route:index-repro',
							route_kind: 'cli',
							route_digest: `sha256:${'6'.repeat(64)}`,
							failure_oracle_hash: `sha256:${'7'.repeat(64)}`,
							steps: [
								{
									ordinal: 1,
									action: 'RAW_REPRO_ACTION_SHOULD_NOT_BE_STORED',
									target: 'verify fixture',
									input_digest: `sha256:${'8'.repeat(64)}`,
									observation_digest: `sha256:${'9'.repeat(64)}`,
									summary: 'RAW_REPRO_STEP_SHOULD_NOT_BE_STORED',
								},
							],
						},
						before_fix: {
							status: 'reproduced',
							outcome: 'failed_as_expected',
							receipt_path: '.mustflow/state/runs/verify-latest/test_related.json',
							receipt_sha256: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
							verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
							summary: 'RAW_BEFORE_FIX_SUMMARY_SHOULD_NOT_BE_STORED',
							reason: null,
						},
						after_fix: {
							status: 'passed',
							outcome: 'passed_expected_behavior',
							same_route_as: 'route:index-repro',
							receipt_path: '.mustflow/state/runs/verify-latest/test_related.json',
							receipt_sha256: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
							verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
							summary: 'RAW_AFTER_FIX_SUMMARY_SHOULD_NOT_BE_STORED',
							reason: null,
						},
						regression_guard: {
							status: 'passed',
							intent: 'test_related',
							test_path: null,
							receipt_path: '.mustflow/state/runs/verify-latest/test_related.json',
							receipt_sha256: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
							verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
							summary: 'RAW_GUARD_SUMMARY_SHOULD_NOT_BE_STORED',
							reason: null,
						},
					},
					evidence_model: {
						schema_version: '1',
						source: 'mf_verify',
						verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
						requirements: [],
						coverage_matrix: [
							{
								criterion_id: 'verification_requirement:1:code_change',
								source: 'verification_requirement',
								statement: 'RAW_STATEMENT_MARKER_SHOULD_NOT_BE_STORED',
								status: 'contradicted',
								requirement_reason: 'code_change',
								evidence: {
									intents: ['test_related'],
									receipt_paths: ['.mustflow/state/runs/verify-latest/test_related.json'],
									gap_reasons: ['RAW_GAP_MARKER_SHOULD_NOT_BE_STORED'],
									source_anchor_ids: ['auth.critical'],
								},
							},
						],
						receipts: [
							{
								intent: 'test_related',
								status: 'failed',
								skipped: false,
								verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
								receipt_path: '.mustflow/state/runs/verify-latest/test_related.json',
								receipt_sha256: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
								command_fingerprint: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
								contract_fingerprint: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
								head_tree_hash: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
								write_drift_status: 'clean',
							},
						],
						skipped_checks: [],
						gaps: [],
						remaining_risks: [
							{
								code: 'source_anchor_invariant_review_required',
								severity: 'high',
								detail: 'RAW_RISK_MARKER_SHOULD_NOT_BE_STORED',
							},
							{
								code: 'assertion_count_decreased',
								severity: 'high',
								path: 'tests/auth.test.ts',
								before_hash: `sha256:${'a'.repeat(64)}`,
								after_hash: `sha256:${'b'.repeat(64)}`,
								detail: 'RAW_VALIDATION_RATCHET_DETAIL_SHOULD_NOT_BE_STORED',
							},
						],
						explanation: {
							verified_by: [],
							downgraded_by: [],
							blocked_by: [],
							contradicted_by: ['one_or_more_selected_verification_intents_failed'],
						},
					},
					summary: {
						matched: 1,
						ran: 1,
						passed: 0,
						failed: 1,
						skipped: 0,
					},
					run_dir: '.mustflow/state/runs/verify-latest',
					manifest_path: '.mustflow/state/runs/verify-latest/manifest.json',
					stdout: {
						tail: 'RAW_STDOUT_MARKER_SHOULD_NOT_BE_STORED',
					},
				},
				null,
				2,
			),
		);

		const output = await createLocalIndexDirect(projectPath);
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [summary] = queryRows(database, 'SELECT * FROM verification_evidence_summaries');
		const [receipt] = queryRows(database, 'SELECT * FROM verification_receipt_summaries');
		const [coverage] = queryRows(database, 'SELECT * FROM verification_coverage_states');
		const [risk] = queryRows(database, 'SELECT * FROM verification_risk_signals');
		const [validationRatchetSignal] = queryRows(database, 'SELECT * FROM validation_ratchet_signals');
		const [fingerprint] = queryRows(database, 'SELECT * FROM verification_failure_fingerprints');
		const [plan] = queryRows(database, 'SELECT * FROM verification_plans');
		const [criterion] = queryRows(database, 'SELECT * FROM acceptance_criteria');
		const [criterionReadModelCoverage] = queryRows(database, 'SELECT * FROM criterion_coverage');
		const [commandReceipt] = queryRows(database, 'SELECT * FROM command_receipt_summaries');
		const [verdictSummary] = queryRows(database, 'SELECT * FROM completion_verdict_summaries');
		const [reproRoute] = queryRows(database, 'SELECT * FROM repro_routes');
		const reproObservations = queryRows(database, 'SELECT * FROM repro_observations ORDER BY phase');
		const [failureReadModel] = queryRows(database, 'SELECT * FROM failure_fingerprints');
		const databaseText = Buffer.from(database.export()).toString('utf8');

		assert.equal(output.schema_version, '20');
		assert.equal(output.verification_evidence_summary_count, 1);
		assert.equal(output.verification_plan_count, 1);
		assert.equal(output.acceptance_criteria_count, 1);
		assert.equal(output.criterion_coverage_count, 1);
		assert.equal(output.verification_receipt_summary_count, 1);
		assert.equal(output.command_receipt_summary_count, 1);
		assert.equal(output.verification_coverage_state_count, 1);
		assert.equal(output.verification_risk_signal_count, 2);
		assert.equal(output.validation_ratchet_signal_count, 1);
		assert.equal(output.completion_verdict_summary_count, 1);
		assert.equal(output.repro_route_count, 1);
		assert.equal(output.repro_observation_count, 3);
		assert.equal(output.failure_fingerprint_count, 1);
		assert.equal(summary.source_path, '.mustflow/state/runs/latest.json');
		assert.match(summary.source_hash, /^sha256:/);
		assert.equal(summary.command, 'verify');
		assert.equal(summary.kind, 'verify_run_summary');
		assert.equal(summary.completion_status, 'contradicted');
		assert.equal(summary.primary_reason, 'one_or_more_selected_verification_intents_failed');
		assert.equal(summary.failed_intents, 1);
		assert.match(summary.failure_fingerprint, /^sha256:/);
		assert.equal(receipt.intent, 'test_related');
		assert.equal(receipt.status, 'failed');
		assert.equal(receipt.skipped, 0);
		assert.equal(receipt.receipt_path, '.mustflow/state/runs/verify-latest/test_related.json');
		assert.equal(coverage.status, 'contradicted');
		assert.equal(coverage.intents, 'test_related');
		assert.equal(coverage.receipt_count, 1);
		assert.equal(coverage.gap_count, 1);
		assert.equal(coverage.source_anchor_count, 1);
		assert.equal(risk.code, 'source_anchor_invariant_review_required');
		assert.equal(risk.severity, 'high');
		assert.match(risk.detail_hash, /^sha256:/);
		assert.equal(fingerprint.failed_intents, 'test_related');
		assert.equal(fingerprint.failed_intents_hash, `sha256:${'c'.repeat(64)}`);
		assert.equal(fingerprint.risk_codes_hash, `sha256:${'d'.repeat(64)}`);
		assert.equal(fingerprint.affected_surfaces_hash, `sha256:${'e'.repeat(64)}`);
		assert.equal(fingerprint.first_seen_at, '2026-05-17T00:00:00.000Z');
		assert.equal(fingerprint.last_seen_at, '2026-05-17T00:01:00.000Z');
		assert.equal(fingerprint.seen_count, 2);
		assert.equal(fingerprint.requires_new_evidence, 1);
		assert.equal(plan.plan_id, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.equal(plan.source_path, '.mustflow/state/runs/latest.json');
		assert.match(plan.classification_hash, /^sha256:/);
		assert.match(plan.command_contract_hash, /^sha256:/);
		assert.match(plan.selected_intents_hash, /^sha256:/);
		assert.match(plan.source_hash, /^sha256:/);
		assert.equal(criterion.criterion_id, 'verification_requirement:1:code_change');
		assert.equal(criterion.plan_id, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.equal(criterion.source, 'verification_requirement');
		assert.match(criterion.statement_hash, /^sha256:/);
		assert.notEqual(criterion.statement_hash, 'RAW_STATEMENT_MARKER_SHOULD_NOT_BE_STORED');
		assert.equal(criterion.reason, 'code_change');
		assert.match(criterion.path_hash, /^sha256:/);
		assert.equal(criterionReadModelCoverage.criterion_id, 'verification_requirement:1:code_change');
		assert.equal(criterionReadModelCoverage.status, 'contradicted');
		assert.equal(criterionReadModelCoverage.receipt_count, 1);
		assert.equal(criterionReadModelCoverage.gap_count, 1);
		assert.equal(criterionReadModelCoverage.risk_count, 1);
		assert.equal(commandReceipt.receipt_hash, 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
		assert.equal(commandReceipt.plan_id, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.equal(commandReceipt.intent, 'test_related');
		assert.equal(commandReceipt.status, 'failed');
		assert.equal(commandReceipt.command_fingerprint, 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc');
		assert.equal(commandReceipt.contract_fingerprint, 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd');
		assert.equal(commandReceipt.current_state_hash, 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
		assert.equal(commandReceipt.write_drift_status, 'clean');
		assert.match(verdictSummary.claim_id, /^sha256:/);
		assert.equal(verdictSummary.plan_id, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.equal(verdictSummary.status, 'contradicted');
		assert.equal(verdictSummary.primary_reason, 'one_or_more_selected_verification_intents_failed');
		assert.equal(verdictSummary.risk_count, 2);
		assert.equal(verdictSummary.contradiction_count, 1);
		assert.equal(verdictSummary.blocker_count, 0);
		assert.equal(reproRoute.route_id, 'route:index-repro');
		assert.match(reproRoute.task_hash, /^sha256:/);
		assert.equal(reproRoute.route_digest, `sha256:${'6'.repeat(64)}`);
		assert.equal(reproRoute.route_kind, 'cli');
		assert.equal(reproRoute.failure_oracle_hash, `sha256:${'7'.repeat(64)}`);
		assert.deepEqual(
			reproObservations.map((observation) => ({
				phase: observation.phase,
				outcome: observation.outcome,
				receipt_hash: observation.receipt_hash,
				diagnostic_fingerprint_matches: /^sha256:/u.test(observation.diagnostic_fingerprint),
			})),
			[
				{
					phase: 'after_fix',
					outcome: 'passed_expected_behavior',
					receipt_hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
					diagnostic_fingerprint_matches: true,
				},
				{
					phase: 'before_fix',
					outcome: 'failed_as_expected',
					receipt_hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
					diagnostic_fingerprint_matches: true,
				},
				{
					phase: 'regression_guard',
					outcome: 'passed',
					receipt_hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
					diagnostic_fingerprint_matches: true,
				},
			],
		);
		assert.equal(failureReadModel.fingerprint, `sha256:${'f'.repeat(64)}`);
		assert.equal(failureReadModel.plan_id, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.equal(failureReadModel.failed_intents_hash, `sha256:${'c'.repeat(64)}`);
		assert.equal(failureReadModel.risk_codes_hash, `sha256:${'d'.repeat(64)}`);
		assert.equal(failureReadModel.seen_count, 2);
		assert.equal(failureReadModel.first_seen_at, '2026-05-17T00:00:00.000Z');
		assert.equal(failureReadModel.last_seen_at, '2026-05-17T00:01:00.000Z');
		assert.match(validationRatchetSignal.signal_id, /^sha256:/);
		assert.equal(validationRatchetSignal.plan_id, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.equal(validationRatchetSignal.code, 'assertion_count_decreased');
		assert.equal(validationRatchetSignal.severity, 'high');
		assert.match(validationRatchetSignal.path_hash, /^sha256:/);
		assert.equal(validationRatchetSignal.before_hash, `sha256:${'a'.repeat(64)}`);
		assert.equal(validationRatchetSignal.after_hash, `sha256:${'b'.repeat(64)}`);
		const readModel = await readLatestLocalVerificationReadModelQueriesDirect(projectPath);
		assert.equal(readModel.authority, 'evidence_only');
		assert.equal(readModel.commandAuthority, '.mustflow/config/commands.toml');
		assert.equal(readModel.grantsCommandAuthority, false);
		assert.equal(readModel.status, 'fresh');
		assert.equal(readModel.planId, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.deepEqual(
			readModel.uncoveredCriteria.map((criterion) => ({
				criterionId: criterion.criterionId,
				coverageStatus: criterion.coverageStatus,
				gapCount: criterion.gapCount,
				riskCount: criterion.riskCount,
			})),
			[
				{
					criterionId: 'verification_requirement:1:code_change',
					coverageStatus: 'contradicted',
					gapCount: 1,
					riskCount: 1,
				},
			],
		);
		assert.deepEqual(
			readModel.severeRisks.map((risk) => risk.code).sort(),
			['assertion_count_decreased', 'source_anchor_invariant_review_required'],
		);
		assert.deepEqual(
			readModel.nonPassingReceipts.map((receipt) => ({
				intent: receipt.intent,
				status: receipt.status,
				writeDriftStatus: receipt.writeDriftStatus,
			})),
			[{ intent: 'test_related', status: 'failed', writeDriftStatus: 'clean' }],
		);
		assert.deepEqual(
			readModel.repeatedFailureFingerprints.map((fingerprint) => ({
				failedIntents: fingerprint.failedIntents,
				seenCount: fingerprint.seenCount,
				requiresNewEvidence: fingerprint.requiresNewEvidence,
			})),
			[{ failedIntents: ['test_related'], seenCount: 2, requiresNewEvidence: true }],
		);
		assert.deepEqual(
			readModel.validationWeakeningSignals.map((signal) => ({
				code: signal.code,
				severity: signal.severity,
				beforeHash: signal.beforeHash,
				afterHash: signal.afterHash,
			})),
			[
				{
					code: 'assertion_count_decreased',
					severity: 'high',
					beforeHash: `sha256:${'a'.repeat(64)}`,
					afterHash: `sha256:${'b'.repeat(64)}`,
				},
			],
		);
		const readModelText = JSON.stringify(readModel);
		assert.equal(readModelText.includes('RAW_RISK_MARKER_SHOULD_NOT_BE_STORED'), false);
		assert.equal(readModelText.includes('RAW_VALIDATION_RATCHET_DETAIL_SHOULD_NOT_BE_STORED'), false);
		assert.equal(readModelText.includes('tests/auth.test.ts'), false);
		assert.equal(databaseText.includes('RAW_STDOUT_MARKER_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_GAP_MARKER_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_RISK_MARKER_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_STATEMENT_MARKER_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_REPRO_SYMPTOM_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_REPRO_ACTION_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_BEFORE_FIX_SUMMARY_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_AFTER_FIX_SUMMARY_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_GUARD_SUMMARY_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_VALIDATION_RATCHET_DETAIL_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('tests/auth.test.ts'), false);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});
