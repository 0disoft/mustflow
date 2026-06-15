import { listChangeClassificationRuleDescriptors } from '../../../core/change-classification.js';
import type { SourceAnchorIndexRecord, SourceAnchorStatus } from '../../../core/source-anchor-status.js';
import {
	LOCAL_INDEX_CONTENT_MODE,
	LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS,
	LOCAL_INDEX_PARSER_VERSION,
	LOCAL_INDEX_SCHEMA_VERSION,
	LOCAL_INDEX_STORE_FULL_CONTENT,
	MAX_SNIPPET_BYTES_PER_DOCUMENT,
	SEARCH_BACKEND_FTS5,
	SEARCH_NGRAM_MAX_GRAMS_PER_TARGET,
	SEARCH_NGRAM_MAX_TOKEN_CHARS,
	SOURCE_INDEX_MAX_FILE_BYTES,
} from './constants.js';
import { queryRows, toSearchString, type LocalSearchCapabilities } from './database-read.js';
import { sha256Text } from './hashing.js';
import { buildSearchNgrams, normalizeSearchText } from './search-text.js';
import type { SqlJsDatabase } from './sql.js';
import type {
	IndexCommandIntent,
	IndexDocument,
	IndexedFileRecord,
	IndexSkill,
	IndexSkillRoute,
	LocalIndexResult,
	SearchNgramTargetKind,
} from './types.js';
import type { VerificationEvidenceIndex } from './verification-evidence.js';
import { skillRouteKey } from './workflow-documents.js';

interface SourceAnchorRiskSignalReadModel {
	readonly anchorId: string;
	readonly pathHash: string;
	readonly status: SourceAnchorStatus;
	readonly riskSignal: string;
	readonly confidence: number;
	readonly navigationOnly: boolean;
	readonly canInstructAgent: boolean;
}
function joinedList(values: readonly string[]): string {
	return [...values].sort((left, right) => left.localeCompare(right)).join(', ');
}

function insertDocumentTerm(database: SqlJsDatabase, documentPath: string, term: string | null, source: string): void {
	const normalized = normalizeSearchText(term ?? '');

	if (normalized.length === 0) {
		return;
	}

	database.run('INSERT OR IGNORE INTO document_terms (document_path, term, source) VALUES (?, ?, ?)', [
		documentPath,
		normalized,
		source,
	]);
}

function insertSearchNgrams(
	database: SqlJsDatabase,
	targetKind: SearchNgramTargetKind,
	targetKey: string,
	values: readonly string[],
	source: string,
): void {
	for (const gram of buildSearchNgrams(values)) {
		database.run(
			'INSERT OR IGNORE INTO search_ngrams (target_kind, target_key, gram, source) VALUES (?, ?, ?, ?)',
			[targetKind, targetKey, gram, source],
		);
	}
}

function insertPathSurfaceReasons(
	database: SqlJsDatabase,
	ruleId: string,
	reasonKind: string,
	values: readonly string[],
): void {
	values.forEach((value, index) => {
		database.run(
			'INSERT INTO path_surface_reasons (rule_id, reason_kind, reason, ordinal) VALUES (?, ?, ?, ?)',
			[ruleId, reasonKind, value, index + 1],
		);
	});
}

function populatePathSurfaceReadModel(database: SqlJsDatabase): void {
	for (const rule of listChangeClassificationRuleDescriptors()) {
		database.run(
			'INSERT INTO path_surfaces (rule_id, pattern_kind, pattern, pattern_flags, surface_kind, category, is_public_surface, update_policy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				rule.id,
				rule.patternKind,
				rule.pattern,
				rule.patternFlags,
				rule.surface.kind,
				rule.surface.category,
				rule.surface.isPublicSurface ? 1 : 0,
				rule.surface.updatePolicy,
			],
		);

		insertPathSurfaceReasons(database, rule.id, 'change_kind', rule.changeKinds);
		insertPathSurfaceReasons(database, rule.id, 'validation_reason', rule.surface.validationReasons);
		insertPathSurfaceReasons(database, rule.id, 'affected_contract', rule.surface.affectedContracts);
		insertPathSurfaceReasons(database, rule.id, 'drift_check', rule.surface.driftChecks);
	}
}

function readDocumentTermsByPath(database: SqlJsDatabase): Map<string, string[]> {
	const termsByPath = new Map<string, string[]>();

	for (const row of queryRows(database, 'SELECT document_path, term FROM document_terms ORDER BY document_path, term')) {
		const documentPath = toSearchString(row.document_path);
		const term = toSearchString(row.term);
		const terms = termsByPath.get(documentPath);

		if (terms) {
			terms.push(term);
		} else {
			termsByPath.set(documentPath, [term]);
		}
	}

	return termsByPath;
}

function populateSearchTables(
	database: SqlJsDatabase,
	capabilities: LocalSearchCapabilities,
	documents: readonly IndexDocument[],
	skills: readonly IndexSkill[],
	skillRoutes: readonly IndexSkillRoute[],
	commandIntents: readonly IndexCommandIntent[],
	sourceAnchors: readonly SourceAnchorIndexRecord[],
): void {
	const documentTermsByPath = readDocumentTermsByPath(database);

	for (const document of documents) {
		const documentTerms = documentTermsByPath.get(document.path) ?? [];
		insertSearchNgrams(
			database,
			'document',
			document.path,
			[
				document.path,
				document.type,
				document.title,
				document.sections.join(' '),
				documentTerms.join(' '),
				document.contentSnippet,
			],
			'workflow_document',
		);

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run(
				'INSERT INTO search_documents_fts (path, type, title, sections, terms, snippet) VALUES (?, ?, ?, ?, ?, ?)',
				[
					document.path,
					document.type,
					document.title,
					document.sections.join(' '),
					documentTerms.join(' '),
					document.contentSnippet,
				],
			);
		}
	}

	for (const skill of skills) {
		insertSearchNgrams(database, 'skill', skill.name, [skill.name, skill.path, skill.title], 'skill');

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run('INSERT INTO search_skills_fts (name, path, title) VALUES (?, ?, ?)', [
				skill.name,
				skill.path,
				skill.title,
			]);
		}
	}

	for (const route of skillRoutes) {
		const verificationIntents = route.verificationIntents.join(' ');
		insertSearchNgrams(
			database,
			'skill_route',
			skillRouteKey(route),
			[
				skillRouteKey(route),
				route.skillName,
				route.skillPath,
				route.trigger,
				route.requiredInput,
				route.editScope,
				route.risk,
				verificationIntents,
				route.expectedOutput,
			],
			'skill_route',
		);

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run(
				'INSERT INTO search_skill_routes_fts (route_key, skill_name, skill_path, trigger, required_input, edit_scope, risk, verification_intents, expected_output) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
				[
					skillRouteKey(route),
					route.skillName,
					route.skillPath,
					route.trigger,
					route.requiredInput,
					route.editScope,
					route.risk,
					verificationIntents,
					route.expectedOutput,
				],
			);
		}
	}

	for (const intent of commandIntents) {
		const effects = intent.effects
			.flatMap((effect) => [effect.lock, effect.path ?? '', effect.mode, effect.access, effect.concurrency])
			.join(' ');
		insertSearchNgrams(
			database,
			'command_intent',
			intent.name,
			[intent.name, intent.status, intent.lifecycle ?? '', intent.runPolicy ?? '', intent.description ?? '', effects],
			'command_intent',
		);

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run(
				'INSERT INTO search_command_intents_fts (name, status, lifecycle, run_policy, description, effects) VALUES (?, ?, ?, ?, ?, ?)',
				[intent.name, intent.status, intent.lifecycle, intent.runPolicy, intent.description, effects],
			);
		}
	}

	for (const anchor of sourceAnchors) {
		insertSearchNgrams(
			database,
			'source_anchor',
			anchor.id,
			[
				anchor.id,
				anchor.path,
				anchor.purpose ?? '',
				anchor.search.join(' '),
				anchor.invariant ?? '',
				anchor.risk.join(' '),
			],
			'source_anchor',
		);

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run(
				'INSERT INTO search_source_anchors_fts (id, path, purpose, search_terms, invariant, risk) VALUES (?, ?, ?, ?, ?, ?)',
				[
					anchor.id,
					anchor.path,
					anchor.purpose,
					anchor.search.join(' '),
					anchor.invariant,
					anchor.risk.join(' '),
				],
			);
		}
	}
}

export function createSourceAnchorRiskSignals(sourceAnchors: readonly SourceAnchorIndexRecord[]): readonly SourceAnchorRiskSignalReadModel[] {
	return sourceAnchors
		.filter((anchor) => ['changed', 'review', 'stale'].includes(anchor.status))
		.map((anchor): SourceAnchorRiskSignalReadModel => ({
			anchorId: anchor.id,
			pathHash: sha256Text(anchor.path),
			status: anchor.status,
			riskSignal: anchor.signals.risk,
			confidence: anchor.confidence,
			navigationOnly: anchor.navigationOnly,
			canInstructAgent: anchor.canInstructAgent,
		}));
}

function rollbackTransaction(database: SqlJsDatabase): void {
	try {
		database.run('ROLLBACK');
	} catch {
		// Keep the original indexing failure as the actionable error.
	}
}

export function populateDatabase(
	database: SqlJsDatabase,
	capabilities: LocalSearchCapabilities,
	documents: readonly IndexDocument[],
	skills: readonly IndexSkill[],
	skillRoutes: readonly IndexSkillRoute[],
	commandIntents: readonly IndexCommandIntent[],
	sourceAnchors: readonly SourceAnchorIndexRecord[],
	indexedFiles: readonly IndexedFileRecord[],
	verificationEvidence: VerificationEvidenceIndex,
	indexMode: LocalIndexResult['index_mode'],
	sourceScopeHash: string,
	sourceIndexEnabled: boolean,
	indexedAt: string,
): void {
	const sourceAnchorRiskSignals = createSourceAnchorRiskSignals(sourceAnchors);

	database.run('BEGIN TRANSACTION');
	try {
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['schema_version', LOCAL_INDEX_SCHEMA_VERSION]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['parser_version', LOCAL_INDEX_PARSER_VERSION]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['content_mode', LOCAL_INDEX_CONTENT_MODE]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'store_full_content',
		String(LOCAL_INDEX_STORE_FULL_CONTENT),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'max_snippet_bytes_per_document',
		String(MAX_SNIPPET_BYTES_PER_DOCUMENT),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'search_ngram_max_token_chars',
		String(SEARCH_NGRAM_MAX_TOKEN_CHARS),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'search_ngram_max_grams_per_target',
		String(SEARCH_NGRAM_MAX_GRAMS_PER_TARGET),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'source_index_max_file_bytes',
		String(SOURCE_INDEX_MAX_FILE_BYTES),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'excluded_raw_data_kinds',
		LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS.join(','),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['search_backend', capabilities.backend]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'search_fts5_available',
		String(capabilities.fts5Available),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['source_scope_hash', sourceScopeHash]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['source_index_enabled', String(sourceIndexEnabled)]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['index_mode', indexMode]);

	for (const indexedFile of indexedFiles) {
		database.run(
			'INSERT INTO indexed_files (path, source_scope, size_bytes, mtime_ms, content_hash, indexed_at, index_mode, parser_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				indexedFile.path,
				indexedFile.sourceScope,
				indexedFile.sizeBytes,
				indexedFile.mtimeMs,
				indexedFile.contentHash,
				indexedAt,
				indexMode,
				LOCAL_INDEX_PARSER_VERSION,
			],
		);
	}

	for (const document of documents) {
		database.run(
			'INSERT INTO documents (path, type, title, locale, revision, content_hash, content_snippet) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				document.path,
				document.type,
				document.title,
				document.locale,
				document.revision,
				document.contentHash,
				document.contentSnippet,
			],
		);

		document.sections.forEach((heading, index) => {
			database.run('INSERT INTO sections (document_path, ordinal, heading) VALUES (?, ?, ?)', [
				document.path,
				index + 1,
				heading,
			]);
		});
	}

	for (const skill of skills) {
		database.run('INSERT INTO skills (name, path, title) VALUES (?, ?, ?)', [skill.name, skill.path, skill.title]);
	}

	for (const route of skillRoutes) {
		const verificationIntents = route.verificationIntents.join(', ');
		database.run(
			'INSERT INTO skill_routes (skill_name, skill_path, trigger, required_input, edit_scope, risk, verification_intents, expected_output) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				route.skillName,
				route.skillPath,
				route.trigger,
				route.requiredInput,
				route.editScope,
				route.risk,
				verificationIntents,
				route.expectedOutput,
			],
		);
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.skillName, 'skill_route_name');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.trigger, 'skill_route_trigger');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.risk, 'skill_route_risk');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.requiredInput, 'skill_route_required_input');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.editScope, 'skill_route_edit_scope');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', verificationIntents, 'skill_route_verification_intents');
	}

	for (const intent of commandIntents) {
		database.run(
			'INSERT INTO command_intents (name, status, lifecycle, run_policy, description) VALUES (?, ?, ?, ?, ?)',
			[intent.name, intent.status, intent.lifecycle, intent.runPolicy, intent.description],
		);

		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.name, 'command_intent');
		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.status, 'command_status');
		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.lifecycle, 'command_lifecycle');
		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.runPolicy, 'command_run_policy');
		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.description, 'command_description');

		for (const effect of intent.effects) {
			database.run(
				'INSERT INTO command_effects (intent, source, access, mode, path, lock, concurrency) VALUES (?, ?, ?, ?, ?, ?, ?)',
				[effect.intent, effect.source, effect.access, effect.mode, effect.path, effect.lock, effect.concurrency],
			);
			if (effect.path !== null) {
				insertDocumentTerm(database, '.mustflow/config/commands.toml', effect.path, 'command_effect_path');
			}
			insertDocumentTerm(database, '.mustflow/config/commands.toml', effect.lock, 'command_effect_lock');
			insertDocumentTerm(database, '.mustflow/config/commands.toml', effect.mode, 'command_effect_mode');
		}
	}

	for (const anchor of sourceAnchors) {
		database.run(
			'INSERT INTO source_anchors (id, path, line_start, purpose, search_terms, invariant, risk, navigation_only, can_instruct_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				anchor.id,
				anchor.path,
				anchor.lineStart,
				anchor.purpose,
				anchor.search.join(', '),
				anchor.invariant,
				anchor.risk.join(', '),
				anchor.navigationOnly ? 1 : 0,
				anchor.canInstructAgent ? 1 : 0,
			],
		);
		database.run(
			'INSERT INTO source_anchor_fingerprints (anchor_id, path, line_start, anchor_metadata_hash, anchor_text_hash, context_hash, search_terms_hash, invariant_hash, risk_hash, symbol_kind, symbol_name, symbol_exported, signature_hash, body_hash, symbol_start_line, symbol_end_line) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				anchor.id,
				anchor.path,
				anchor.lineStart,
				anchor.fingerprint.anchorMetadataHash,
				anchor.fingerprint.anchorTextHash,
				anchor.fingerprint.contextHash,
				anchor.fingerprint.searchTermsHash,
				anchor.fingerprint.invariantHash,
				anchor.fingerprint.riskHash,
				anchor.fingerprint.symbol.kind,
				anchor.fingerprint.symbol.name,
				anchor.fingerprint.symbol.exported ? 1 : 0,
				anchor.fingerprint.symbol.signatureHash,
				anchor.fingerprint.symbol.bodyHash,
				anchor.fingerprint.symbol.startLine,
				anchor.fingerprint.symbol.endLine,
			],
		);
		database.run(
			'INSERT INTO source_anchor_status (anchor_id, status, confidence, identity_signal, location_signal, symbol_signal, body_signal, metadata_signal, semantic_signal, risk_signal, navigation_only, can_instruct_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				anchor.id,
				anchor.status,
				anchor.confidence,
				anchor.signals.identity,
				anchor.signals.location,
				anchor.signals.symbol,
				anchor.signals.body,
				anchor.signals.metadata,
				anchor.signals.semantic,
				anchor.signals.risk,
				anchor.navigationOnly ? 1 : 0,
				anchor.canInstructAgent ? 1 : 0,
			],
		);
	}

	for (const summary of verificationEvidence.summaries) {
		database.run(
			'INSERT INTO verification_evidence_summaries (source_path, source_hash, command, kind, status, run_dir, manifest_path, verification_plan_id, completion_status, primary_reason, matched_intents, ran_intents, passed_intents, failed_intents, skipped_intents, receipt_count, coverage_count, remaining_risk_count, failure_fingerprint) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				summary.sourcePath,
				summary.sourceHash,
				summary.command,
				summary.kind,
				summary.status,
				summary.runDir,
				summary.manifestPath,
				summary.verificationPlanId,
				summary.completionStatus,
				summary.primaryReason,
				summary.matchedIntents,
				summary.ranIntents,
				summary.passedIntents,
				summary.failedIntents,
				summary.skippedIntents,
				summary.receiptCount,
				summary.coverageCount,
				summary.remainingRiskCount,
				summary.failureFingerprint,
			],
		);
	}

	for (const plan of verificationEvidence.verificationPlans) {
		database.run(
			'INSERT INTO verification_plans (plan_id, source_path, classification_hash, command_contract_hash, selected_intents_hash, created_at, source_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				plan.planId,
				plan.sourcePath,
				plan.classificationHash,
				plan.commandContractHash,
				plan.selectedIntentsHash,
				plan.createdAt,
				plan.sourceHash,
			],
		);
	}

	for (const criterion of verificationEvidence.acceptanceCriteria) {
		database.run(
			'INSERT INTO acceptance_criteria (criterion_id, plan_id, source, statement_hash, reason, surface, path_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				criterion.criterionId,
				criterion.planId,
				criterion.source,
				criterion.statementHash,
				criterion.reason,
				criterion.surface,
				criterion.pathHash,
			],
		);
	}

	for (const coverage of verificationEvidence.criterionCoverage) {
		database.run(
			'INSERT INTO criterion_coverage (criterion_id, plan_id, status, receipt_count, gap_count, risk_count) VALUES (?, ?, ?, ?, ?, ?)',
			[coverage.criterionId, coverage.planId, coverage.status, coverage.receiptCount, coverage.gapCount, coverage.riskCount],
		);
	}

	for (const receipt of verificationEvidence.receipts) {
		database.run(
			'INSERT INTO verification_receipt_summaries (source_path, ordinal, intent, status, skipped, verification_plan_id, receipt_path, receipt_sha256) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				receipt.sourcePath,
				receipt.ordinal,
				receipt.intent,
				receipt.status,
				receipt.skipped ? 1 : 0,
				receipt.verificationPlanId,
				receipt.receiptPath,
				receipt.receiptSha256,
			],
		);
	}

	for (const receipt of verificationEvidence.commandReceiptSummaries) {
		database.run(
			'INSERT INTO command_receipt_summaries (receipt_hash, plan_id, intent, status, command_fingerprint, contract_fingerprint, current_state_hash, write_drift_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				receipt.receiptHash,
				receipt.planId,
				receipt.intent,
				receipt.status,
				receipt.commandFingerprint,
				receipt.contractFingerprint,
				receipt.currentStateHash,
				receipt.writeDriftStatus,
			],
		);
	}

	for (const coverage of verificationEvidence.coverageStates) {
		database.run(
			'INSERT INTO verification_coverage_states (source_path, criterion_id, source, status, requirement_reason, intents, receipt_count, gap_count, source_anchor_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				coverage.sourcePath,
				coverage.criterionId,
				coverage.source,
				coverage.status,
				coverage.requirementReason,
				joinedList(coverage.intents),
				coverage.receiptCount,
				coverage.gapCount,
				coverage.sourceAnchorCount,
			],
		);
	}

	for (const risk of verificationEvidence.riskSignals) {
		database.run(
			'INSERT INTO verification_risk_signals (source_path, ordinal, code, severity, detail_hash) VALUES (?, ?, ?, ?, ?)',
			[risk.sourcePath, risk.ordinal, risk.code, risk.severity, risk.detailHash],
		);
	}

	for (const signal of verificationEvidence.validationRatchetSignals) {
		database.run(
			'INSERT INTO validation_ratchet_signals (signal_id, plan_id, code, severity, path_hash, before_hash, after_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[signal.signalId, signal.planId, signal.code, signal.severity, signal.pathHash, signal.beforeHash, signal.afterHash],
		);
	}

	for (const verdict of verificationEvidence.completionVerdictSummaries) {
		database.run(
			'INSERT INTO completion_verdict_summaries (claim_id, plan_id, status, primary_reason, risk_count, contradiction_count, blocker_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				verdict.claimId,
				verdict.planId,
				verdict.status,
				verdict.primaryReason,
				verdict.riskCount,
				verdict.contradictionCount,
				verdict.blockerCount,
			],
		);
	}

	for (const route of verificationEvidence.reproRoutes) {
		database.run(
			'INSERT INTO repro_routes (route_id, task_hash, route_digest, route_kind, failure_oracle_hash) VALUES (?, ?, ?, ?, ?)',
			[route.routeId, route.taskHash, route.routeDigest, route.routeKind, route.failureOracleHash],
		);
	}

	for (const observation of verificationEvidence.reproObservations) {
		database.run(
			'INSERT INTO repro_observations (route_id, phase, outcome, receipt_hash, diagnostic_fingerprint) VALUES (?, ?, ?, ?, ?)',
			[
				observation.routeId,
				observation.phase,
				observation.outcome,
				observation.receiptHash,
				observation.diagnosticFingerprint,
			],
		);
	}

	for (const fingerprint of verificationEvidence.failureFingerprintReadModels) {
		database.run(
			'INSERT INTO failure_fingerprints (fingerprint, plan_id, failed_intents_hash, risk_codes_hash, seen_count, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				fingerprint.fingerprint,
				fingerprint.planId,
				fingerprint.failedIntentsHash,
				fingerprint.riskCodesHash,
				fingerprint.seenCount,
				fingerprint.firstSeenAt,
				fingerprint.lastSeenAt,
			],
		);
	}

	for (const fingerprint of verificationEvidence.failureFingerprints) {
		database.run(
			'INSERT INTO verification_failure_fingerprints (source_path, fingerprint, verification_plan_id, status, failed_intents, primary_reason, failed_intents_hash, risk_codes_hash, affected_surfaces_hash, first_seen_at, last_seen_at, seen_count, requires_new_evidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				fingerprint.sourcePath,
				fingerprint.fingerprint,
				fingerprint.verificationPlanId,
				fingerprint.status,
				joinedList(fingerprint.failedIntents),
				fingerprint.primaryReason,
				fingerprint.failedIntentsHash,
				fingerprint.riskCodesHash,
				fingerprint.affectedSurfacesHash,
				fingerprint.firstSeenAt,
				fingerprint.lastSeenAt,
				fingerprint.seenCount,
				fingerprint.requiresNewEvidence ? 1 : 0,
			],
		);
	}

	for (const signal of sourceAnchorRiskSignals) {
		database.run(
			'INSERT INTO source_anchor_risk_signals (anchor_id, path_hash, status, risk_signal, confidence, navigation_only, can_instruct_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				signal.anchorId,
				signal.pathHash,
				signal.status,
				signal.riskSignal,
				signal.confidence,
				signal.navigationOnly ? 1 : 0,
				signal.canInstructAgent ? 1 : 0,
			],
		);
	}

	populatePathSurfaceReadModel(database);
	populateSearchTables(database, capabilities, documents, skills, skillRoutes, commandIntents, sourceAnchors);
	database.run('COMMIT');
	} catch (error) {
		rollbackTransaction(database);
		throw error;
	}
}
