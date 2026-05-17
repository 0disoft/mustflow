import type { NormalizedCommandEffect } from '../../../core/command-effects.js';
import type { SourceAnchorStatus } from '../../../core/source-anchor-status.js';
import type {
	LocalIndexContentMode,
	LocalIndexExcludedRawDataKind,
	LocalIndexStoreFullContent,
	MaxSnippetBytesPerDocument,
	SearchBackendKind,
} from './constants.js';

export interface LocalIndexOptions {
	readonly dryRun?: boolean;
	readonly includeSource?: boolean;
	readonly incremental?: boolean;
}

export interface IndexDocument {
	readonly path: string;
	readonly type: string;
	readonly title: string;
	readonly locale: string | null;
	readonly revision: number | null;
	readonly contentHash: string;
	readonly contentSnippet: string;
	readonly sections: readonly string[];
}

export interface IndexSkill {
	readonly name: string;
	readonly path: string;
	readonly title: string;
}

export interface IndexSkillRoute {
	readonly skillName: string;
	readonly skillPath: string;
	readonly trigger: string;
	readonly requiredInput: string;
	readonly editScope: string;
	readonly risk: string;
	readonly verificationIntents: readonly string[];
	readonly expectedOutput: string;
}

export interface IndexCommandIntent {
	readonly name: string;
	readonly status: string;
	readonly lifecycle: string | null;
	readonly runPolicy: string | null;
	readonly description: string | null;
	readonly effects: readonly NormalizedCommandEffect[];
}

export interface IndexedFileRecord {
	readonly path: string;
	readonly sourceScope: 'workflow' | 'source_anchor';
	readonly sizeBytes: number;
	readonly mtimeMs: number;
	readonly contentHash: string;
}

export interface LocalIndexSourceConfig {
	readonly enabledByDefault: boolean;
	readonly include: readonly string[];
	readonly exclude: readonly string[];
	readonly maxFileBytes: number | null;
	readonly allowedExtensions: readonly string[];
}

export interface LocalIndexResult {
	readonly schema_version: string;
	readonly command: 'index';
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly database_path: string;
	readonly dry_run: boolean;
	readonly wrote_files: boolean;
	readonly index_mode: 'full' | 'incremental';
	readonly reused_existing: boolean;
	readonly rebuild_reason: string | null;
	readonly document_count: number;
	readonly skill_count: number;
	readonly skill_route_count: number;
	readonly command_intent_count: number;
	readonly command_effect_count: number;
	readonly verification_evidence_summary_count: number;
	readonly verification_plan_count: number;
	readonly acceptance_criteria_count: number;
	readonly criterion_coverage_count: number;
	readonly verification_receipt_summary_count: number;
	readonly command_receipt_summary_count: number;
	readonly verification_coverage_state_count: number;
	readonly verification_risk_signal_count: number;
	readonly validation_ratchet_signal_count: number;
	readonly completion_verdict_summary_count: number;
	readonly repro_route_count: number;
	readonly repro_observation_count: number;
	readonly failure_fingerprint_count: number;
	readonly source_index_enabled: boolean;
	readonly source_anchor_count: number;
	readonly source_anchor_risk_signal_count: number;
	readonly search_backend: SearchBackendKind;
	readonly search_fts5_available: boolean;
	readonly content_mode: LocalIndexContentMode;
	readonly store_full_content: LocalIndexStoreFullContent;
	readonly max_snippet_bytes_per_document: MaxSnippetBytesPerDocument;
	readonly excluded_raw_data_kinds: readonly LocalIndexExcludedRawDataKind[];
	readonly indexed_file_count: number;
	readonly indexed_paths: readonly string[];
}

export interface LocalSearchOptions {
	readonly limit?: number;
	readonly scope?: LocalSearchScope;
}

export type CacheLayer = 'stable' | 'task' | 'volatile';
export type LocalSearchScope = 'workflow' | 'source' | 'all';
export type SearchSourceScope = 'workflow' | 'source';
export type { SearchBackendKind };
export type SearchNgramTargetKind = 'document' | 'skill' | 'skill_route' | 'command_intent' | 'source_anchor';

export interface LocalSearchItem {
	readonly kind: 'document' | 'skill' | 'skill_route' | 'command_intent' | 'source_anchor';
	readonly path?: string;
	readonly name?: string;
	readonly title?: string;
	readonly document_type?: string;
	readonly anchor_id?: string;
	readonly line_start?: number;
	readonly risk?: string;
	readonly cache_layer: CacheLayer;
	readonly volatile: boolean;
	readonly authority_rank: number;
	readonly authority_label: string;
	readonly source_scope: SearchSourceScope;
	readonly navigation_only: boolean;
	readonly can_instruct_agent: boolean;
	readonly stale_status?: SourceAnchorStatus;
	readonly stale_confidence?: number;
	readonly effect_locks?: readonly string[];
	readonly effect_paths?: readonly string[];
	readonly effect_modes?: readonly string[];
	readonly route_trigger?: string;
	readonly route_risk?: string;
	readonly verification_intents?: readonly string[];
	readonly match: string;
	readonly score: number;
}

export interface LocalSearchResult {
	readonly schema_version: string;
	readonly command: 'search';
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly database_path: string;
	readonly query: string;
	readonly limit: number;
	readonly scope: LocalSearchScope;
	readonly index_fresh: boolean;
	readonly stale_paths: readonly string[];
	readonly search_backend: SearchBackendKind;
	readonly search_fts5_available: boolean;
	readonly result_count: number;
	readonly results: readonly LocalSearchItem[];
}

export type LocalCommandEffectGraphStatus = 'fresh' | 'missing' | 'stale' | 'unreadable';
export type LocalPathSurfaceReadModelStatus = 'fresh' | 'missing' | 'stale' | 'unreadable';
export type LocalIndexPromptContextStatus = 'fresh' | 'missing' | 'stale' | 'unreadable';
export type LocalVerificationReadModelStatus = 'fresh' | 'missing' | 'stale' | 'unreadable';

export interface LocalCommandWriteLock {
	readonly lock: string;
	readonly paths: readonly string[];
	readonly modes: readonly string[];
	readonly sources: readonly string[];
	readonly concurrencies: readonly string[];
	readonly effectCount: number;
}

export interface LocalCommandLockConflict {
	readonly intent: string;
	readonly lock: string;
	readonly paths: readonly string[];
	readonly modes: readonly string[];
	readonly concurrencies: readonly string[];
	readonly conflictingPaths: readonly string[];
	readonly conflictingModes: readonly string[];
	readonly conflictingConcurrencies: readonly string[];
}

export interface LocalCommandEffectGraph {
	readonly source: 'local_index';
	readonly authority: 'explanation_only';
	readonly commandAuthority: '.mustflow/config/commands.toml';
	readonly grantsCommandAuthority: false;
	readonly status: LocalCommandEffectGraphStatus;
	readonly databasePath: string;
	readonly indexFresh: boolean;
	readonly stalePaths: readonly string[];
	readonly writeLocks: readonly LocalCommandWriteLock[];
	readonly lockConflicts: readonly LocalCommandLockConflict[];
	readonly refreshHint: string | null;
}

export interface LocalPathSurfaceRuleMatch {
	readonly ruleId: string;
	readonly patternKind: string;
	readonly pattern: string;
	readonly patternFlags: string;
	readonly changeKinds: readonly string[];
	readonly surface: {
		readonly kind: string;
		readonly category: string;
		readonly isPublicSurface: boolean;
		readonly validationReasons: readonly string[];
		readonly affectedContracts: readonly string[];
		readonly updatePolicy: string;
		readonly driftChecks: readonly string[];
	};
}

export interface LocalPathSurfaceReadModel {
	readonly source: 'local_index';
	readonly status: LocalPathSurfaceReadModelStatus;
	readonly databasePath: string;
	readonly indexFresh: boolean;
	readonly stalePaths: readonly string[];
	readonly inputPath: string | null;
	readonly match: LocalPathSurfaceRuleMatch | null;
	readonly refreshHint: string | null;
}

export interface LocalIndexPromptContext {
	readonly source: 'local_index';
	readonly status: LocalIndexPromptContextStatus;
	readonly databasePath: string;
	readonly indexFresh: boolean;
	readonly stalePaths: readonly string[];
	readonly searchBackend: SearchBackendKind | null;
	readonly searchFts5Available: boolean | null;
	readonly refreshHint: string | null;
}

export interface LocalUncoveredCriterion {
	readonly criterionId: string;
	readonly source: string;
	readonly reason: string | null;
	readonly surface: string | null;
	readonly pathHash: string | null;
	readonly coverageStatus: string | null;
	readonly receiptCount: number;
	readonly gapCount: number;
	readonly riskCount: number;
}

export interface LocalSevereVerificationRisk {
	readonly sourcePath: string;
	readonly ordinal: number;
	readonly code: string;
	readonly severity: string;
	readonly detailHash: string;
}

export interface LocalNonPassingVerificationReceipt {
	readonly receiptHash: string;
	readonly planId: string;
	readonly intent: string | null;
	readonly status: string;
	readonly commandFingerprint: string | null;
	readonly contractFingerprint: string | null;
	readonly currentStateHash: string | null;
	readonly writeDriftStatus: string | null;
}

export interface LocalRepeatedFailureFingerprint {
	readonly sourcePath: string;
	readonly fingerprint: string;
	readonly verificationPlanId: string | null;
	readonly status: string;
	readonly failedIntents: readonly string[];
	readonly primaryReason: string | null;
	readonly failedIntentsHash: string | null;
	readonly riskCodesHash: string | null;
	readonly affectedSurfacesHash: string | null;
	readonly seenCount: number;
	readonly requiresNewEvidence: boolean;
}

export interface LocalValidationWeakeningSignal {
	readonly signalId: string;
	readonly planId: string | null;
	readonly code: string;
	readonly severity: string;
	readonly pathHash: string;
	readonly beforeHash: string | null;
	readonly afterHash: string | null;
}

export interface LocalVerificationReadModelQueries {
	readonly source: 'local_index';
	readonly authority: 'evidence_only';
	readonly commandAuthority: '.mustflow/config/commands.toml';
	readonly grantsCommandAuthority: false;
	readonly status: LocalVerificationReadModelStatus;
	readonly databasePath: string;
	readonly indexFresh: boolean;
	readonly stalePaths: readonly string[];
	readonly planId: string | null;
	readonly uncoveredCriteria: readonly LocalUncoveredCriterion[];
	readonly severeRisks: readonly LocalSevereVerificationRisk[];
	readonly nonPassingReceipts: readonly LocalNonPassingVerificationReceipt[];
	readonly repeatedFailureFingerprints: readonly LocalRepeatedFailureFingerprint[];
	readonly validationWeakeningSignals: readonly LocalValidationWeakeningSignal[];
	readonly refreshHint: string | null;
}

export interface LocalSourceAnchorVerdictRisk {
	readonly source: 'local_index';
	readonly authority: 'evidence_only';
	readonly anchorId: string;
	readonly path: string;
	readonly lineStart: number;
	readonly status: 'changed' | 'review' | 'stale';
	readonly riskTags: readonly string[];
	readonly invariant: string | null;
}
