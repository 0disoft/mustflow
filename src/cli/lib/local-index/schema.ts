import { SEARCH_BACKEND_FTS5 } from './constants.js';
import type { LocalSearchCapabilities } from './database-read.js';
import type { SqlJsDatabase } from './sql.js';

export function createSchema(database: SqlJsDatabase, capabilities: LocalSearchCapabilities): void {
	database.run('PRAGMA foreign_keys = ON');
	const [foreignKeyResult] = database.exec('PRAGMA foreign_keys');
	if (foreignKeyResult?.values[0]?.[0] !== 1) {
		throw new Error('SQLite foreign-key enforcement is unavailable for the local index.');
	}

	database.run(`
CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE indexed_files (
  path TEXT PRIMARY KEY,
  source_scope TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  mtime_ms INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  indexed_at TEXT NOT NULL,
  index_mode TEXT NOT NULL,
  parser_version TEXT NOT NULL
);

CREATE TABLE indexed_source_candidates (
  path TEXT PRIMARY KEY,
  FOREIGN KEY (path) REFERENCES indexed_files(path) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE documents (
  path TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  locale TEXT,
	revision INTEGER,
  content_hash TEXT NOT NULL,
  content_snippet TEXT NOT NULL
);

CREATE TABLE sections (
  document_path TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  heading TEXT NOT NULL,
  PRIMARY KEY (document_path, ordinal)
);

CREATE TABLE document_terms (
  document_path TEXT NOT NULL,
  term TEXT NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (document_path, term, source)
);

CREATE TABLE search_ngrams (
  target_kind TEXT NOT NULL,
  target_key TEXT NOT NULL,
  gram TEXT NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (target_kind, target_key, gram, source)
);

CREATE INDEX search_ngrams_lookup ON search_ngrams(target_kind, gram, target_key);

CREATE TABLE skills (
  name TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  title TEXT NOT NULL
);

CREATE TABLE skill_routes (
  skill_name TEXT NOT NULL,
  skill_path TEXT NOT NULL,
  trigger TEXT NOT NULL,
  required_input TEXT NOT NULL,
  edit_scope TEXT NOT NULL,
  risk TEXT NOT NULL,
  verification_intents TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  PRIMARY KEY (skill_name, trigger)
);

CREATE TABLE command_intents (
  name TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  lifecycle TEXT,
  run_policy TEXT,
  description TEXT
);

CREATE TABLE command_effects (
  intent TEXT NOT NULL,
  source TEXT NOT NULL,
  access TEXT NOT NULL,
  mode TEXT NOT NULL,
  path TEXT,
  lock TEXT NOT NULL,
  concurrency TEXT NOT NULL
);

CREATE VIEW command_write_locks AS
SELECT
  intent,
  lock,
  group_concat(DISTINCT path) AS paths,
  group_concat(DISTINCT mode) AS modes,
  group_concat(DISTINCT source) AS sources,
  group_concat(DISTINCT concurrency) AS concurrencies,
  count(*) AS effect_count
FROM command_effects
WHERE access = 'write'
GROUP BY intent, lock;

CREATE VIEW command_lock_conflicts AS
SELECT
  a.intent AS left_intent,
  b.intent AS right_intent,
  a.lock AS lock,
  group_concat(DISTINCT a.path) AS left_paths,
  group_concat(DISTINCT b.path) AS right_paths,
  group_concat(DISTINCT a.mode) AS left_modes,
  group_concat(DISTINCT b.mode) AS right_modes,
  group_concat(DISTINCT a.concurrency) AS left_concurrencies,
  group_concat(DISTINCT b.concurrency) AS right_concurrencies
FROM command_effects a
JOIN command_effects b
  ON a.lock = b.lock
 AND a.intent < b.intent
WHERE
  a.access = 'write'
  OR b.access = 'write'
  OR a.concurrency = 'exclusive'
  OR b.concurrency = 'exclusive'
  OR a.mode = 'delete_recreate'
  OR b.mode = 'delete_recreate'
GROUP BY a.intent, b.intent, a.lock;

CREATE TABLE path_surfaces (
  rule_id TEXT PRIMARY KEY,
  pattern_kind TEXT NOT NULL,
  pattern TEXT NOT NULL,
  pattern_flags TEXT NOT NULL,
  surface_kind TEXT NOT NULL,
  category TEXT NOT NULL,
  is_public_surface INTEGER NOT NULL,
  update_policy TEXT NOT NULL
);

CREATE TABLE path_surface_reasons (
  rule_id TEXT NOT NULL,
  reason_kind TEXT NOT NULL,
  reason TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  PRIMARY KEY (rule_id, reason_kind, reason)
);

CREATE TABLE source_anchors (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  line_start INTEGER NOT NULL,
  purpose TEXT,
  search_terms TEXT NOT NULL,
  invariant TEXT,
  risk TEXT NOT NULL,
  navigation_only INTEGER NOT NULL,
  can_instruct_agent INTEGER NOT NULL
);

CREATE TABLE source_anchor_fingerprints (
  anchor_id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  line_start INTEGER NOT NULL,
  anchor_metadata_hash TEXT NOT NULL,
  anchor_text_hash TEXT NOT NULL,
  context_hash TEXT NOT NULL,
  search_terms_hash TEXT,
  invariant_hash TEXT,
  risk_hash TEXT NOT NULL,
  symbol_kind TEXT NOT NULL,
  symbol_name TEXT,
  symbol_exported INTEGER NOT NULL,
  signature_hash TEXT,
  body_hash TEXT,
  symbol_start_line INTEGER,
  symbol_end_line INTEGER
);

CREATE TABLE source_anchor_status (
  anchor_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  confidence REAL NOT NULL,
  identity_signal TEXT NOT NULL,
  location_signal TEXT NOT NULL,
  symbol_signal TEXT NOT NULL,
  body_signal TEXT NOT NULL,
  metadata_signal TEXT NOT NULL,
  semantic_signal TEXT NOT NULL,
  risk_signal TEXT NOT NULL,
  navigation_only INTEGER NOT NULL,
  can_instruct_agent INTEGER NOT NULL
);

CREATE TABLE verification_evidence_summaries (
  source_path TEXT PRIMARY KEY,
  source_hash TEXT NOT NULL,
  command TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  run_dir TEXT,
  manifest_path TEXT,
  verification_plan_id TEXT,
  completion_status TEXT,
  primary_reason TEXT,
  matched_intents INTEGER NOT NULL,
  ran_intents INTEGER NOT NULL,
  passed_intents INTEGER NOT NULL,
  failed_intents INTEGER NOT NULL,
  skipped_intents INTEGER NOT NULL,
  receipt_count INTEGER NOT NULL,
  coverage_count INTEGER NOT NULL,
  remaining_risk_count INTEGER NOT NULL,
  failure_fingerprint TEXT
);

CREATE TABLE verification_plans (
  plan_id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  classification_hash TEXT,
  command_contract_hash TEXT,
  selected_intents_hash TEXT,
  created_at TEXT,
  source_hash TEXT NOT NULL
);

CREATE TABLE acceptance_criteria (
  criterion_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  source TEXT NOT NULL,
  statement_hash TEXT,
  reason TEXT,
  surface TEXT,
  path_hash TEXT,
  PRIMARY KEY (plan_id, criterion_id)
);

CREATE TABLE criterion_coverage (
  criterion_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  receipt_count INTEGER NOT NULL,
  gap_count INTEGER NOT NULL,
  risk_count INTEGER NOT NULL,
  PRIMARY KEY (plan_id, criterion_id)
);

CREATE TABLE verification_receipt_summaries (
  source_path TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  intent TEXT,
  status TEXT NOT NULL,
  skipped INTEGER NOT NULL,
  verification_plan_id TEXT,
  receipt_path TEXT,
  receipt_sha256 TEXT,
  PRIMARY KEY (source_path, ordinal)
);

CREATE TABLE command_receipt_summaries (
  receipt_hash TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  intent TEXT,
  status TEXT NOT NULL,
  command_fingerprint TEXT,
  contract_fingerprint TEXT,
  current_state_hash TEXT,
  write_drift_status TEXT,
  PRIMARY KEY (plan_id, receipt_hash)
);

CREATE TABLE verification_coverage_states (
  source_path TEXT NOT NULL,
  criterion_id TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  requirement_reason TEXT,
  intents TEXT NOT NULL,
  receipt_count INTEGER NOT NULL,
  gap_count INTEGER NOT NULL,
  source_anchor_count INTEGER NOT NULL,
  PRIMARY KEY (source_path, criterion_id)
);

CREATE TABLE verification_risk_signals (
  source_path TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  code TEXT NOT NULL,
  severity TEXT NOT NULL,
  detail_hash TEXT NOT NULL,
  PRIMARY KEY (source_path, ordinal)
);

CREATE TABLE validation_ratchet_signals (
  signal_id TEXT PRIMARY KEY,
  plan_id TEXT,
  code TEXT NOT NULL,
  severity TEXT NOT NULL,
  path_hash TEXT NOT NULL,
  before_hash TEXT,
  after_hash TEXT
);

CREATE TABLE completion_verdict_summaries (
  claim_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  primary_reason TEXT,
  risk_count INTEGER NOT NULL,
  contradiction_count INTEGER NOT NULL,
  blocker_count INTEGER NOT NULL
);

CREATE TABLE repro_routes (
  route_id TEXT PRIMARY KEY,
  task_hash TEXT NOT NULL,
  route_digest TEXT,
  route_kind TEXT,
  failure_oracle_hash TEXT
);

CREATE TABLE repro_observations (
  route_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  outcome TEXT,
  receipt_hash TEXT,
  diagnostic_fingerprint TEXT NOT NULL,
  PRIMARY KEY (route_id, phase)
);

CREATE TABLE failure_fingerprints (
  fingerprint TEXT PRIMARY KEY,
  plan_id TEXT,
  failed_intents_hash TEXT,
  risk_codes_hash TEXT,
  seen_count INTEGER NOT NULL,
  first_seen_at TEXT,
  last_seen_at TEXT
);

CREATE TABLE verification_failure_fingerprints (
  source_path TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  verification_plan_id TEXT,
  status TEXT NOT NULL,
  failed_intents TEXT NOT NULL,
  primary_reason TEXT,
  failed_intents_hash TEXT,
  risk_codes_hash TEXT,
  affected_surfaces_hash TEXT,
  first_seen_at TEXT,
  last_seen_at TEXT,
  seen_count INTEGER NOT NULL,
  requires_new_evidence INTEGER NOT NULL,
  PRIMARY KEY (source_path, fingerprint)
);

CREATE TABLE source_anchor_risk_signals (
  anchor_id TEXT PRIMARY KEY,
  path_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  risk_signal TEXT NOT NULL,
  confidence REAL NOT NULL,
  navigation_only INTEGER NOT NULL,
  can_instruct_agent INTEGER NOT NULL
);
`);

	if (capabilities.backend === SEARCH_BACKEND_FTS5) {
		database.run(`
CREATE VIRTUAL TABLE search_documents_fts USING fts5(
  path UNINDEXED,
  type UNINDEXED,
  title,
  sections,
  terms,
  snippet
);

CREATE VIRTUAL TABLE search_skills_fts USING fts5(
  name UNINDEXED,
  path UNINDEXED,
  title
);

CREATE VIRTUAL TABLE search_skill_routes_fts USING fts5(
  route_key UNINDEXED,
  skill_name UNINDEXED,
  skill_path UNINDEXED,
  trigger,
  required_input,
  edit_scope,
  risk,
  verification_intents,
  expected_output
);

CREATE VIRTUAL TABLE search_command_intents_fts USING fts5(
  name UNINDEXED,
  status UNINDEXED,
  lifecycle UNINDEXED,
  run_policy UNINDEXED,
  description,
  effects
);

CREATE VIRTUAL TABLE search_source_anchors_fts USING fts5(
  id UNINDEXED,
  path UNINDEXED,
  purpose,
  search_terms,
  invariant,
  risk
);
`);
	}
}
