import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { toPosixPath } from '../filesystem.js';
import {
	collectSourceAnchorIndexRecords,
	hasHighRiskSourceAnchorRiskTags,
	type SourceAnchorIndexRecord,
	type SourceAnchorSnapshot,
	type SourceAnchorStatus,
	type SourceAnchorSymbol,
} from '../../../core/source-anchor-status.js';
import { writeFileInsideWithoutSymlinks } from '../../../core/safe-filesystem.js';
import {
	LOCAL_INDEX_CONTENT_MODE,
	LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS,
	LOCAL_INDEX_PARSER_VERSION,
	LOCAL_INDEX_SCHEMA_VERSION,
	LOCAL_INDEX_STORE_FULL_CONTENT,
	MAX_SNIPPET_BYTES_PER_DOCUMENT,
} from './constants.js';
import { collectCommandIntents } from './command-effect-index.js';
import { getLocalIndexDatabasePath } from './database-path.js';
import {
	detectLocalSearchCapabilities,
	hasTable,
	queryRows,
	readCount,
	readMetadataValue,
	readStoredIndexedPaths,
	readStoredSearchCapabilities,
	searchCapabilities,
	splitIndexedList,
	toNullableNumber,
	toSearchString,
	type LocalSearchCapabilities,
} from './database-read.js';
import { getStalePaths, readStoredSchemaVersion } from './freshness.js';
import { createSourceAnchorRiskSignals, populateDatabase } from './populate.js';
import { createSchema } from './schema.js';
import { loadSqlJs, type SqlJsDatabase, type SqlJsStatic } from './sql.js';
import {
	collectFastPreflightIndexedFileMetadataRecords,
	collectIndexedFileRecords,
	collectSourceAnchorCandidatePaths,
	getSourceScopeHash,
	hashIndexedFileMetadataRecords,
	normalizeIndexedFileSourceScope,
	readIndexedFileRecord,
	readLocalIndexSourceConfig,
	type IndexedFileMetadataRecord,
} from './source-index.js';
import { createVerificationEvidenceIndex } from './verification-evidence.js';
import type {
	IndexedFileRecord,
	LocalIndexOptions,
	LocalIndexPromptContext,
	LocalIndexPromptContextStatus,
	LocalIndexResult,
	LocalNonPassingVerificationReceipt,
	LocalRepeatedFailureFingerprint,
	LocalSevereVerificationRisk,
	LocalSourceAnchorVerdictRisk,
	LocalUncoveredCriterion,
	LocalValidationWeakeningSignal,
	LocalVerificationReadModelQueries,
	LocalVerificationReadModelStatus,
} from './types.js';
import {
	collectDocuments,
	collectSkillRoutes,
	collectSkills,
} from './workflow-documents.js';
export type {
	LocalCommandEffectGraph,
	LocalCommandEffectGraphStatus,
	LocalCommandLockConflict,
	LocalCommandWriteLock,
	LocalIndexOptions,
	LocalIndexPromptContext,
	LocalIndexPromptContextStatus,
	LocalIndexResult,
	LocalNonPassingVerificationReceipt,
	LocalPathSurfaceReadModel,
	LocalPathSurfaceReadModelStatus,
	LocalPathSurfaceRuleMatch,
	LocalRepeatedFailureFingerprint,
	LocalSearchItem,
	LocalSearchOptions,
	LocalSearchResult,
	LocalSearchScope,
	LocalSevereVerificationRisk,
	LocalSourceAnchorVerdictRisk,
	LocalUncoveredCriterion,
	LocalValidationWeakeningSignal,
	LocalVerificationReadModelQueries,
	LocalVerificationReadModelStatus,
	SearchBackendKind,
} from './types.js';
export { readLocalCommandEffectGraph, readLocalCommandEffectGraphs } from './effect-graph-read-model.js';
export { getLocalIndexDatabasePath } from './database-path.js';
export { readLocalPathSurface, readLocalPathSurfaces } from './path-surface-read-model.js';
export { searchLocalIndex } from './search-read-model.js';

async function readPreviousSourceAnchorSnapshots(databasePath: string): Promise<SourceAnchorSnapshot[]> {
	if (!existsSync(databasePath)) {
		return [];
	}

	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));

	try {
		const rows = queryRows(
			database,
			`
SELECT
  source_anchors.id,
  source_anchors.path,
  source_anchors.line_start,
  source_anchors.purpose,
  source_anchors.search_terms,
  source_anchors.invariant,
  source_anchors.risk,
  source_anchor_fingerprints.anchor_metadata_hash,
  source_anchor_fingerprints.anchor_text_hash,
  source_anchor_fingerprints.context_hash,
  source_anchor_fingerprints.search_terms_hash,
  source_anchor_fingerprints.invariant_hash,
  source_anchor_fingerprints.risk_hash,
  source_anchor_fingerprints.symbol_kind,
  source_anchor_fingerprints.symbol_name,
  source_anchor_fingerprints.symbol_exported,
  source_anchor_fingerprints.signature_hash,
  source_anchor_fingerprints.body_hash,
  source_anchor_fingerprints.symbol_start_line,
  source_anchor_fingerprints.symbol_end_line
FROM source_anchors
JOIN source_anchor_fingerprints ON source_anchor_fingerprints.anchor_id = source_anchors.id
`,
		);

		return rows.map((row) => {
			const symbol: SourceAnchorSymbol = {
				kind: toSearchString(row.symbol_kind) as SourceAnchorSymbol['kind'],
				name: toSearchString(row.symbol_name) || null,
				exported: Number(row.symbol_exported) === 1,
				signatureHash: toSearchString(row.signature_hash) || null,
				bodyHash: toSearchString(row.body_hash) || null,
				startLine: toNullableNumber(row.symbol_start_line),
				endLine: toNullableNumber(row.symbol_end_line),
			};

			return {
				id: toSearchString(row.id),
				path: toSearchString(row.path),
				lineStart: Number(row.line_start),
				purpose: toSearchString(row.purpose) || null,
				search: toSearchString(row.search_terms)
					.split(/[,;]/u)
					.map((value) => value.trim())
					.filter((value) => value.length > 0),
				invariant: toSearchString(row.invariant) || null,
				risk: toSearchString(row.risk)
					.split(/[,;]/u)
					.map((value) => value.trim())
					.filter((value) => value.length > 0),
				navigationOnly: true,
				canInstructAgent: false,
				fingerprint: {
					anchorMetadataHash: toSearchString(row.anchor_metadata_hash),
					anchorTextHash: toSearchString(row.anchor_text_hash),
					contextHash: toSearchString(row.context_hash),
					searchTermsHash: toSearchString(row.search_terms_hash) || null,
					invariantHash: toSearchString(row.invariant_hash) || null,
					riskHash: toSearchString(row.risk_hash),
					symbol,
				},
			};
		});
	} catch {
		return [];
	} finally {
		database.close();
	}
}

type IncrementalRebuildReason =
	| 'missing_index'
	| 'schema_version_mismatch'
	| 'parser_version_mismatch'
	| 'source_scope_mismatch'
	| 'indexed_files_missing'
	| 'file_fingerprint_mismatch'
	| 'unreadable_index';

interface IncrementalReuseDecision {
	readonly reusable: boolean;
	readonly rebuildReason: IncrementalRebuildReason | null;
	readonly capabilities: LocalSearchCapabilities | null;
}

interface IncrementalPreflightReuse {
	readonly result: LocalIndexResult | null;
	readonly rebuildReason: IncrementalRebuildReason | null;
}

function createStoredLocalIndexResult(
	projectRoot: string,
	databasePath: string,
	dryRun: boolean,
	indexMode: LocalIndexResult['index_mode'],
	database: SqlJsDatabase,
	capabilities: LocalSearchCapabilities,
): LocalIndexResult {
	return {
		schema_version: LOCAL_INDEX_SCHEMA_VERSION,
		command: 'index',
		ok: true,
		mustflow_root: path.resolve(projectRoot),
		database_path: databasePath,
		dry_run: dryRun,
		wrote_files: false,
		index_mode: indexMode,
		reused_existing: true,
		rebuild_reason: null,
		document_count: readCount(database, 'documents'),
		skill_count: readCount(database, 'skills'),
		skill_route_count: readCount(database, 'skill_routes'),
		command_intent_count: readCount(database, 'command_intents'),
		command_effect_count: readCount(database, 'command_effects'),
		verification_evidence_summary_count: readCount(database, 'verification_evidence_summaries'),
		verification_plan_count: readCount(database, 'verification_plans'),
		acceptance_criteria_count: readCount(database, 'acceptance_criteria'),
		criterion_coverage_count: readCount(database, 'criterion_coverage'),
		verification_receipt_summary_count: readCount(database, 'verification_receipt_summaries'),
		command_receipt_summary_count: readCount(database, 'command_receipt_summaries'),
		verification_coverage_state_count: readCount(database, 'verification_coverage_states'),
		verification_risk_signal_count: readCount(database, 'verification_risk_signals'),
		validation_ratchet_signal_count: readCount(database, 'validation_ratchet_signals'),
		completion_verdict_summary_count: readCount(database, 'completion_verdict_summaries'),
		repro_route_count: readCount(database, 'repro_routes'),
		repro_observation_count: readCount(database, 'repro_observations'),
		failure_fingerprint_count: readCount(database, 'verification_failure_fingerprints'),
		source_index_enabled: readMetadataValue(database, 'source_index_enabled') === 'true',
		source_anchor_count: readCount(database, 'source_anchors'),
		source_anchor_risk_signal_count: readCount(database, 'source_anchor_risk_signals'),
		search_backend: capabilities.backend,
		search_fts5_available: capabilities.fts5Available,
		content_mode: LOCAL_INDEX_CONTENT_MODE,
		store_full_content: LOCAL_INDEX_STORE_FULL_CONTENT,
		max_snippet_bytes_per_document: MAX_SNIPPET_BYTES_PER_DOCUMENT,
		excluded_raw_data_kinds: [...LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS],
		indexed_file_count: readCount(database, 'indexed_files'),
		indexed_paths: readStoredIndexedPaths(database),
	};
}

function indexedFilesMatch(database: SqlJsDatabase, currentFiles: readonly IndexedFileRecord[]): boolean {
	const rows = queryRows(
		database,
		'SELECT path, source_scope, content_hash, parser_version FROM indexed_files ORDER BY path',
	);

	if (rows.length !== currentFiles.length) {
		return false;
	}

	const currentByPath = new Map(currentFiles.map((file) => [file.path, file]));

	for (const row of rows) {
		const storedPath = toSearchString(row.path);
		const current = currentByPath.get(storedPath);

		if (!current) {
			return false;
		}

		if (
			normalizeIndexedFileSourceScope(toSearchString(row.source_scope)) !== current.sourceScope ||
			toSearchString(row.content_hash) !== current.contentHash ||
			toSearchString(row.parser_version) !== LOCAL_INDEX_PARSER_VERSION
		) {
			return false;
		}
	}

	return true;
}

function indexedSourceCandidatesMatch(database: SqlJsDatabase, currentPaths: readonly string[]): boolean {
	if (!hasTable(database, 'indexed_source_candidates')) {
		return false;
	}

	const storedPaths = new Set(
		queryRows(database, 'SELECT path FROM indexed_source_candidates').map((row) => toSearchString(row.path)),
	);
	const currentPathSet = new Set(currentPaths);

	return storedPaths.size === currentPathSet.size && [...storedPaths].every((storedPath) => currentPathSet.has(storedPath));
}

const INDEXED_FILE_MTIME_TOLERANCE_MS = 1;

function indexedFileMtimeMsEqual(storedMtimeMs: number | null, currentMtimeMs: number): boolean {
	return storedMtimeMs !== null && Math.abs(storedMtimeMs - currentMtimeMs) <= INDEXED_FILE_MTIME_TOLERANCE_MS;
}

function indexedFileMetadataMatch(database: SqlJsDatabase, currentFiles: readonly IndexedFileMetadataRecord[]): boolean {
	const rows = queryRows(
		database,
		'SELECT path, source_scope, size_bytes, mtime_ms, parser_version FROM indexed_files ORDER BY path',
	);

	if (rows.length !== currentFiles.length) {
		return false;
	}

	const currentByPath = new Map(currentFiles.map((file) => [file.path, file]));

	for (const row of rows) {
		const storedPath = toSearchString(row.path);
		const current = currentByPath.get(storedPath);

		if (!current) {
			return false;
		}

		if (
			normalizeIndexedFileSourceScope(toSearchString(row.source_scope)) !== current.sourceScope ||
			toNullableNumber(row.size_bytes) !== current.sizeBytes ||
			!indexedFileMtimeMsEqual(toNullableNumber(row.mtime_ms), current.mtimeMs) ||
			toSearchString(row.parser_version) !== LOCAL_INDEX_PARSER_VERSION
		) {
			return false;
		}
	}

	return true;
}

async function readIncrementalPreflightReuse(
	SQL: SqlJsStatic,
	databasePath: string,
	projectRoot: string,
	currentFiles: readonly IndexedFileMetadataRecord[] | null,
	currentSourceCandidatePaths: readonly string[] | null,
	sourceScopeHash: string,
	dryRun: boolean,
	indexMode: LocalIndexResult['index_mode'],
): Promise<IncrementalPreflightReuse> {
	if (!currentFiles || !currentSourceCandidatePaths) {
		return { result: null, rebuildReason: null };
	}

	if (!existsSync(databasePath)) {
		return { result: null, rebuildReason: 'missing_index' };
	}

	let database: SqlJsDatabase | undefined;

	try {
		database = new SQL.Database(readFileSync(databasePath));

		if (readStoredSchemaVersion(database) !== LOCAL_INDEX_SCHEMA_VERSION) {
			return { result: null, rebuildReason: 'schema_version_mismatch' };
		}

		if (readMetadataValue(database, 'parser_version') !== LOCAL_INDEX_PARSER_VERSION) {
			return { result: null, rebuildReason: 'parser_version_mismatch' };
		}

		if (readMetadataValue(database, 'source_scope_hash') !== sourceScopeHash) {
			return { result: null, rebuildReason: 'source_scope_mismatch' };
		}

		if (!hasTable(database, 'indexed_files')) {
			return { result: null, rebuildReason: 'indexed_files_missing' };
		}

		if (!indexedSourceCandidatesMatch(database, currentSourceCandidatePaths)) {
			return { result: null, rebuildReason: 'source_scope_mismatch' };
		}

		if (!indexedFileMetadataMatch(database, currentFiles)) {
			return { result: null, rebuildReason: 'file_fingerprint_mismatch' };
		}

		const hashedCurrentFiles = hashIndexedFileMetadataRecords(projectRoot, currentFiles);

		if (!indexedFilesMatch(database, hashedCurrentFiles)) {
			return { result: null, rebuildReason: 'file_fingerprint_mismatch' };
		}

		const capabilities = readStoredSearchCapabilities(database);

		return {
			result: createStoredLocalIndexResult(projectRoot, databasePath, dryRun, indexMode, database, capabilities),
			rebuildReason: null,
		};
	} catch {
		return { result: null, rebuildReason: 'unreadable_index' };
	} finally {
		database?.close();
	}
}

async function readIncrementalReuseDecision(
	SQL: SqlJsStatic,
	databasePath: string,
	currentFiles: readonly IndexedFileRecord[],
	currentSourceCandidatePaths: readonly string[],
	sourceScopeHash: string,
): Promise<IncrementalReuseDecision> {
	if (!existsSync(databasePath)) {
		return { reusable: false, rebuildReason: 'missing_index', capabilities: null };
	}

	let database: SqlJsDatabase | undefined;

	try {
		database = new SQL.Database(readFileSync(databasePath));

		if (readStoredSchemaVersion(database) !== LOCAL_INDEX_SCHEMA_VERSION) {
			return { reusable: false, rebuildReason: 'schema_version_mismatch', capabilities: null };
		}

		if (readMetadataValue(database, 'parser_version') !== LOCAL_INDEX_PARSER_VERSION) {
			return { reusable: false, rebuildReason: 'parser_version_mismatch', capabilities: null };
		}

		if (readMetadataValue(database, 'source_scope_hash') !== sourceScopeHash) {
			return { reusable: false, rebuildReason: 'source_scope_mismatch', capabilities: null };
		}

		if (!hasTable(database, 'indexed_files')) {
			return { reusable: false, rebuildReason: 'indexed_files_missing', capabilities: null };
		}

		if (!indexedSourceCandidatesMatch(database, currentSourceCandidatePaths)) {
			return { reusable: false, rebuildReason: 'source_scope_mismatch', capabilities: null };
		}

		if (!indexedFilesMatch(database, currentFiles)) {
			return { reusable: false, rebuildReason: 'file_fingerprint_mismatch', capabilities: null };
		}

		return {
			reusable: true,
			rebuildReason: null,
			capabilities: readStoredSearchCapabilities(database),
		};
	} catch {
		return { reusable: false, rebuildReason: 'unreadable_index', capabilities: null };
	} finally {
		database?.close();
	}
}

/**
 * mf:anchor cli.index.create
 * purpose: Build the local SQLite index for workflow documents and optional source anchors.
 * search: mf index, local index, sqlite, source anchors, workflow documents
 * invariant: Source anchors are indexed only when requested by CLI flag or local index configuration.
 * risk: cache, config
 */
export async function createLocalIndex(projectRoot: string, options: LocalIndexOptions = {}): Promise<LocalIndexResult> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);
	const dryRun = options.dryRun === true;
	const incremental = options.incremental === true;
	const indexMode: LocalIndexResult['index_mode'] = incremental ? 'incremental' : 'full';
	const sourceConfig = readLocalIndexSourceConfig(projectRoot);
	const includeSource = options.includeSource === true || sourceConfig.enabledByDefault;
	const sourceScopeHash = getSourceScopeHash(includeSource, sourceConfig);
	let capabilities = searchCapabilities(false);
	let reusedExisting = false;
	let rebuildReason: string | null = null;

	const SQL = await loadSqlJs();
	const capabilityDatabase = new SQL.Database();
	capabilities = detectLocalSearchCapabilities(capabilityDatabase);
	capabilityDatabase.close();

	if (incremental) {
		const preflightFiles = collectFastPreflightIndexedFileMetadataRecords(projectRoot, includeSource, sourceConfig);
		const preflightReuse = await readIncrementalPreflightReuse(
			SQL,
			databasePath,
			projectRoot,
			preflightFiles?.records ?? null,
			preflightFiles?.sourceCandidatePaths ?? null,
			sourceScopeHash,
			dryRun,
			indexMode,
		);

		if (preflightReuse.result) {
			return preflightReuse.result;
		}

		rebuildReason = preflightReuse.rebuildReason;
	}

	const documents = collectDocuments(projectRoot);
	const skills = collectSkills(documents);
	const skillRoutes = collectSkillRoutes(projectRoot);
	const commandIntents = collectCommandIntents(projectRoot);
	const previousSourceAnchors = includeSource
		? await readPreviousSourceAnchorSnapshots(databasePath).catch(() => [])
		: [];
	const sourceAnchorCandidatePaths = includeSource ? collectSourceAnchorCandidatePaths(projectRoot, sourceConfig) : [];
	const sourceAnchors = includeSource
		? collectSourceAnchorIndexRecords(projectRoot, previousSourceAnchors, {
				...sourceConfig,
				excludeGeneratedOrVendor: true,
			})
		: [];
	const verificationEvidence = createVerificationEvidenceIndex(projectRoot);
	const indexedFiles = collectIndexedFileRecords(projectRoot, documents, sourceAnchors, sourceAnchorCandidatePaths);

	if (incremental) {
		const reuseDecision = await readIncrementalReuseDecision(
			SQL,
			databasePath,
			indexedFiles,
			sourceAnchorCandidatePaths,
			sourceScopeHash,
		);
		reusedExisting = reuseDecision.reusable;
		rebuildReason = reuseDecision.reusable ? null : (reuseDecision.rebuildReason ?? rebuildReason);
		capabilities = reuseDecision.capabilities ?? capabilities;
	}

	if (!dryRun && !reusedExisting) {
		const database = new SQL.Database();

		try {
			createSchema(database, capabilities);
			populateDatabase(
				database,
				capabilities,
				documents,
				skills,
				skillRoutes,
				commandIntents,
				sourceAnchors,
				indexedFiles,
				sourceAnchorCandidatePaths,
				verificationEvidence,
				indexMode,
				sourceScopeHash,
				includeSource,
				new Date().toISOString(),
			);
			writeFileInsideWithoutSymlinks(projectRoot, databasePath, database.export());
		} finally {
			database.close();
		}
	}

	return {
		schema_version: LOCAL_INDEX_SCHEMA_VERSION,
		command: 'index',
		ok: true,
		mustflow_root: path.resolve(projectRoot),
		database_path: databasePath,
		dry_run: dryRun,
		wrote_files: !dryRun && !reusedExisting,
		index_mode: indexMode,
		reused_existing: reusedExisting,
		rebuild_reason: rebuildReason,
		document_count: documents.length,
		skill_count: skills.length,
		skill_route_count: skillRoutes.length,
		command_intent_count: commandIntents.length,
		command_effect_count: commandIntents.reduce((count, intent) => count + intent.effects.length, 0),
		verification_evidence_summary_count: verificationEvidence.summaries.length,
		verification_plan_count: verificationEvidence.verificationPlans.length,
		acceptance_criteria_count: verificationEvidence.acceptanceCriteria.length,
		criterion_coverage_count: verificationEvidence.criterionCoverage.length,
		verification_receipt_summary_count: verificationEvidence.receipts.length,
		command_receipt_summary_count: verificationEvidence.commandReceiptSummaries.length,
		verification_coverage_state_count: verificationEvidence.coverageStates.length,
		verification_risk_signal_count: verificationEvidence.riskSignals.length,
		validation_ratchet_signal_count: verificationEvidence.validationRatchetSignals.length,
		completion_verdict_summary_count: verificationEvidence.completionVerdictSummaries.length,
		repro_route_count: verificationEvidence.reproRoutes.length,
		repro_observation_count: verificationEvidence.reproObservations.length,
		failure_fingerprint_count: verificationEvidence.failureFingerprints.length,
		source_index_enabled: includeSource,
		source_anchor_count: sourceAnchors.length,
		source_anchor_risk_signal_count: createSourceAnchorRiskSignals(sourceAnchors).length,
		search_backend: capabilities.backend,
		search_fts5_available: capabilities.fts5Available,
		content_mode: LOCAL_INDEX_CONTENT_MODE,
		store_full_content: LOCAL_INDEX_STORE_FULL_CONTENT,
		max_snippet_bytes_per_document: MAX_SNIPPET_BYTES_PER_DOCUMENT,
		excluded_raw_data_kinds: [...LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS],
		indexed_file_count: indexedFiles.length,
		indexed_paths: indexedFiles.map((file) => file.path),
	};
}

function createLocalIndexPromptContextStatus(
	databasePath: string,
	status: LocalIndexPromptContextStatus,
	stalePaths: readonly string[] = [],
	capabilities: LocalSearchCapabilities | null = null,
): LocalIndexPromptContext {
	return {
		source: 'local_index',
		status,
		databasePath,
		indexFresh: status === 'fresh',
		stalePaths,
		searchBackend: capabilities?.backend ?? null,
		searchFts5Available: capabilities?.fts5Available ?? null,
		refreshHint: status === 'fresh' ? null : 'Run `mf index` to refresh prompt-cache task context local-index metadata.',
	};
}

export async function readLocalIndexPromptContext(projectRoot: string): Promise<LocalIndexPromptContext> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);

	if (!existsSync(databasePath)) {
		return createLocalIndexPromptContextStatus(databasePath, 'missing');
	}

	let database: SqlJsDatabase | undefined;

	try {
		const SQL = await loadSqlJs();
		database = new SQL.Database(readFileSync(databasePath));
		const capabilities = readStoredSearchCapabilities(database);
		const stalePaths = getStalePaths(projectRoot, database, { includeState: false });

		if (stalePaths.length > 0) {
			return createLocalIndexPromptContextStatus(databasePath, 'stale', stalePaths, capabilities);
		}

		return createLocalIndexPromptContextStatus(databasePath, 'fresh', [], capabilities);
	} catch {
		return createLocalIndexPromptContextStatus(databasePath, 'unreadable');
	} finally {
		database?.close();
	}
}

function createVerificationReadModelQueryStatus(
	databasePath: string,
	status: LocalVerificationReadModelStatus,
	planId: string | null,
	stalePaths: readonly string[] = [],
): LocalVerificationReadModelQueries {
	return {
		source: 'local_index',
		authority: 'evidence_only',
		commandAuthority: '.mustflow/config/commands.toml',
		grantsCommandAuthority: false,
		status,
		databasePath,
		indexFresh: status === 'fresh',
		stalePaths,
		planId,
		uncoveredCriteria: [],
		severeRisks: [],
		nonPassingReceipts: [],
		repeatedFailureFingerprints: [],
		validationWeakeningSignals: [],
		refreshHint: status === 'fresh' ? null : 'Run `mf index` to refresh verification read-model evidence.',
	};
}

function readLatestVerificationPlanId(database: SqlJsDatabase): string | null {
	const row = queryRows(
		database,
		`
SELECT plan_id
FROM verification_plans
ORDER BY COALESCE(created_at, '') DESC, source_path DESC, plan_id DESC
LIMIT 1
`,
	)[0];

	return toSearchString(row?.plan_id) || null;
}

function readUncoveredCriteria(database: SqlJsDatabase, planId: string): readonly LocalUncoveredCriterion[] {
	return queryRows(
		database,
		`
SELECT
  acceptance_criteria.criterion_id,
  acceptance_criteria.source,
  acceptance_criteria.reason,
  acceptance_criteria.surface,
  acceptance_criteria.path_hash,
  criterion_coverage.status AS coverage_status,
  criterion_coverage.receipt_count,
  criterion_coverage.gap_count,
  criterion_coverage.risk_count
FROM acceptance_criteria
LEFT JOIN criterion_coverage
  ON criterion_coverage.plan_id = acceptance_criteria.plan_id
 AND criterion_coverage.criterion_id = acceptance_criteria.criterion_id
WHERE acceptance_criteria.plan_id = ?
  AND (criterion_coverage.status IS NULL OR criterion_coverage.status != 'covered')
ORDER BY acceptance_criteria.criterion_id
`,
		[planId],
	).map((row) => ({
		criterionId: toSearchString(row.criterion_id),
		source: toSearchString(row.source),
		reason: toSearchString(row.reason) || null,
		surface: toSearchString(row.surface) || null,
		pathHash: toSearchString(row.path_hash) || null,
		coverageStatus: toSearchString(row.coverage_status) || null,
		receiptCount: toNullableNumber(row.receipt_count) ?? 0,
		gapCount: toNullableNumber(row.gap_count) ?? 0,
		riskCount: toNullableNumber(row.risk_count) ?? 0,
	}));
}

function readSevereVerificationRisks(database: SqlJsDatabase, planId: string): readonly LocalSevereVerificationRisk[] {
	return queryRows(
		database,
		`
SELECT
  verification_risk_signals.source_path,
  verification_risk_signals.ordinal,
  verification_risk_signals.code,
  verification_risk_signals.severity,
  verification_risk_signals.detail_hash
FROM verification_risk_signals
JOIN verification_evidence_summaries
  ON verification_evidence_summaries.source_path = verification_risk_signals.source_path
WHERE verification_evidence_summaries.verification_plan_id = ?
  AND verification_risk_signals.severity IN ('high', 'critical')
ORDER BY verification_risk_signals.source_path, verification_risk_signals.ordinal
`,
		[planId],
	).map((row) => ({
		sourcePath: toSearchString(row.source_path),
		ordinal: toNullableNumber(row.ordinal) ?? 0,
		code: toSearchString(row.code),
		severity: toSearchString(row.severity),
		detailHash: toSearchString(row.detail_hash),
	}));
}

function readNonPassingReceipts(database: SqlJsDatabase, planId: string): readonly LocalNonPassingVerificationReceipt[] {
	return queryRows(
		database,
		`
SELECT
  receipt_hash,
  plan_id,
  intent,
  status,
  command_fingerprint,
  contract_fingerprint,
  current_state_hash,
  write_drift_status
FROM command_receipt_summaries
WHERE plan_id = ?
  AND (
    status != 'passed'
    OR write_drift_status IS NULL
    OR write_drift_status NOT IN ('clean', 'none')
  )
ORDER BY intent, receipt_hash
`,
		[planId],
	).map((row) => ({
		receiptHash: toSearchString(row.receipt_hash),
		planId: toSearchString(row.plan_id),
		intent: toSearchString(row.intent) || null,
		status: toSearchString(row.status),
		commandFingerprint: toSearchString(row.command_fingerprint) || null,
		contractFingerprint: toSearchString(row.contract_fingerprint) || null,
		currentStateHash: toSearchString(row.current_state_hash) || null,
		writeDriftStatus: toSearchString(row.write_drift_status) || null,
	}));
}

function readRepeatedFailureFingerprints(
	database: SqlJsDatabase,
	planId: string,
): readonly LocalRepeatedFailureFingerprint[] {
	return queryRows(
		database,
		`
SELECT
  source_path,
  fingerprint,
  verification_plan_id,
  status,
  failed_intents,
  primary_reason,
  failed_intents_hash,
  risk_codes_hash,
  affected_surfaces_hash,
  seen_count,
  requires_new_evidence
FROM verification_failure_fingerprints
WHERE verification_plan_id = ?
  AND requires_new_evidence = 1
ORDER BY fingerprint
`,
		[planId],
	).map((row) => ({
		sourcePath: toSearchString(row.source_path),
		fingerprint: toSearchString(row.fingerprint),
		verificationPlanId: toSearchString(row.verification_plan_id) || null,
		status: toSearchString(row.status),
		failedIntents: splitIndexedList(row.failed_intents),
		primaryReason: toSearchString(row.primary_reason) || null,
		failedIntentsHash: toSearchString(row.failed_intents_hash) || null,
		riskCodesHash: toSearchString(row.risk_codes_hash) || null,
		affectedSurfacesHash: toSearchString(row.affected_surfaces_hash) || null,
		seenCount: toNullableNumber(row.seen_count) ?? 0,
		requiresNewEvidence: Number(row.requires_new_evidence) === 1,
	}));
}

function readValidationWeakeningSignals(
	database: SqlJsDatabase,
	planId: string,
): readonly LocalValidationWeakeningSignal[] {
	return queryRows(
		database,
		`
SELECT signal_id, plan_id, code, severity, path_hash, before_hash, after_hash
FROM validation_ratchet_signals
WHERE plan_id = ?
ORDER BY severity DESC, code, signal_id
`,
		[planId],
	).map((row) => ({
		signalId: toSearchString(row.signal_id),
		planId: toSearchString(row.plan_id) || null,
		code: toSearchString(row.code),
		severity: toSearchString(row.severity),
		pathHash: toSearchString(row.path_hash),
		beforeHash: toSearchString(row.before_hash) || null,
		afterHash: toSearchString(row.after_hash) || null,
	}));
}

function queryLocalVerificationReadModel(
	databasePath: string,
	database: SqlJsDatabase,
	planId: string | null,
): LocalVerificationReadModelQueries {
	const selectedPlanId = planId ?? readLatestVerificationPlanId(database);
	const base = createVerificationReadModelQueryStatus(databasePath, 'fresh', selectedPlanId);

	if (!selectedPlanId) {
		return base;
	}

	return {
		...base,
		uncoveredCriteria: readUncoveredCriteria(database, selectedPlanId),
		severeRisks: readSevereVerificationRisks(database, selectedPlanId),
		nonPassingReceipts: readNonPassingReceipts(database, selectedPlanId),
		repeatedFailureFingerprints: readRepeatedFailureFingerprints(database, selectedPlanId),
		validationWeakeningSignals: readValidationWeakeningSignals(database, selectedPlanId),
	};
}

export async function readLocalVerificationReadModelQueries(
	projectRoot: string,
	planId: string,
): Promise<LocalVerificationReadModelQueries> {
	return readLocalVerificationReadModelQueriesForPlan(projectRoot, planId);
}

export async function readLocalVerificationReadModelQueriesForPlan(
	projectRoot: string,
	planId: string | null,
): Promise<LocalVerificationReadModelQueries> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);

	if (!existsSync(databasePath)) {
		return createVerificationReadModelQueryStatus(databasePath, 'missing', planId);
	}

	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));

	try {
		const requiredTables = [
			'acceptance_criteria',
			'criterion_coverage',
			'verification_evidence_summaries',
			'verification_plans',
			'verification_risk_signals',
			'command_receipt_summaries',
			'verification_failure_fingerprints',
			'validation_ratchet_signals',
		];

		if (requiredTables.some((tableName) => !hasTable(database, tableName))) {
			return createVerificationReadModelQueryStatus(databasePath, 'unreadable', planId);
		}

		const stalePaths = getStalePaths(projectRoot, database);

		if (stalePaths.length > 0) {
			return createVerificationReadModelQueryStatus(databasePath, 'stale', planId, stalePaths);
		}

		return queryLocalVerificationReadModel(databasePath, database, planId);
	} catch {
		return createVerificationReadModelQueryStatus(databasePath, 'unreadable', planId);
	} finally {
		database.close();
	}
}

export async function readLatestLocalVerificationReadModelQueries(
	projectRoot: string,
): Promise<LocalVerificationReadModelQueries> {
	return readLocalVerificationReadModelQueriesForPlan(projectRoot, null);
}

export async function readLocalSourceAnchorVerdictRisks(
	projectRoot: string,
	relativePaths: readonly string[],
): Promise<readonly LocalSourceAnchorVerdictRisk[]> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);
	const normalizedPaths = new Set(relativePaths.map((relativePath) => toPosixPath(relativePath)).filter(Boolean));

	if (!existsSync(databasePath) || normalizedPaths.size === 0) {
		return [];
	}

	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));

	try {
		const stalePaths = getStalePaths(projectRoot, database);

		if (stalePaths.length > 0 || !hasTable(database, 'source_anchors') || !hasTable(database, 'source_anchor_status')) {
			return [];
		}

		const rows = queryRows(
			database,
			`
SELECT
  source_anchors.id,
  source_anchors.path,
  source_anchors.line_start,
  source_anchors.invariant,
  source_anchors.risk,
  source_anchor_status.status
FROM source_anchors
JOIN source_anchor_status ON source_anchor_status.anchor_id = source_anchors.id
WHERE source_anchor_status.status IN ('changed', 'review', 'stale')
ORDER BY source_anchors.id
`,
		);

		return rows
			.map((row): LocalSourceAnchorVerdictRisk | null => {
				const relativePath = toSearchString(row.path);
				const riskTags = splitIndexedList(row.risk);
				const status = toSearchString(row.status);

				if (
					!normalizedPaths.has(relativePath) ||
					!hasHighRiskSourceAnchorRiskTags(riskTags) ||
					(status !== 'changed' && status !== 'review' && status !== 'stale')
				) {
					return null;
				}

				return {
					source: 'local_index',
					authority: 'evidence_only',
					anchorId: toSearchString(row.id),
					path: relativePath,
					lineStart: Number(row.line_start),
					status,
					riskTags,
					invariant: toSearchString(row.invariant) || null,
				};
			})
			.filter((risk): risk is LocalSourceAnchorVerdictRisk => risk !== null);
	} catch {
		return [];
	} finally {
		database.close();
	}
}

/**
 * mf:anchor cli.index.source-anchor-check-warnings
 * purpose: Surface generated source-anchor registry drift through mf check without making the registry authoritative.
 * search: mf check, source anchor index, stale anchor, generated registry
 * invariant: Local index warnings are review hints only and never grant command or verification authority.
 * risk: cache, config
 */
export async function readLocalSourceAnchorCheckWarnings(projectRoot: string): Promise<string[]> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);

	if (!existsSync(databasePath)) {
		return [];
	}

	let SQL: SqlJsStatic;
	try {
		SQL = await loadSqlJs();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return [`source anchor local index could not be loaded (${message}); refresh with mf index --source`];
	}

	let database: SqlJsDatabase;
	try {
		database = new SQL.Database(readFileSync(databasePath));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return [`source anchor local index could not be read (${message}); refresh with mf index --source`];
	}

	try {
		if (readMetadataValue(database, 'source_index_enabled') !== 'true') {
			return [];
		}

		if (
			!hasTable(database, 'indexed_files') ||
			!hasTable(database, 'indexed_source_candidates') ||
			!hasTable(database, 'source_anchors') ||
			!hasTable(database, 'source_anchor_status')
		) {
			return ['source anchor local index is missing source-anchor tables; refresh with mf index --source'];
		}

		const indexedSourcePaths = new Set(
			queryRows(database, 'SELECT path FROM indexed_source_candidates')
				.map((row) => toSearchString(row.path))
				.filter(Boolean),
		);
		const staleSourcePaths = getStalePaths(projectRoot, database, { includeState: false }).filter((stalePath) =>
			indexedSourcePaths.has(stalePath),
		);

		if (staleSourcePaths.length > 0) {
			return [
				`source anchor local index is stale for source paths: ${staleSourcePaths.join(', ')}; refresh with mf index --source`,
			];
		}

		return queryRows(
			database,
			`
SELECT
  source_anchors.id,
  source_anchors.path,
  source_anchors.line_start,
  source_anchor_status.status
FROM source_anchors
JOIN source_anchor_status ON source_anchor_status.anchor_id = source_anchors.id
WHERE source_anchor_status.status IN ('changed', 'review', 'stale')
ORDER BY source_anchors.id
`,
		).map((row) => {
			const anchorId = toSearchString(row.id);
			const anchorPath = toSearchString(row.path);
			const lineStart = toNullableNumber(row.line_start) ?? 0;
			const status = toSearchString(row.status);

			return `source anchor local index marks anchor "${anchorId}" as ${status} at ${anchorPath}:${lineStart}; review the anchor, then refresh with mf index --source if the current snapshot is accepted`;
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return [`source anchor local index could not be checked (${message}); refresh with mf index --source`];
	} finally {
		database.close();
	}
}
