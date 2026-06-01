# local-index

This directory contains the local SQLite index implementation behind the stable
`src/cli/lib/local-index.ts` facade.

- `index.ts` keeps the current public functions and orchestration.
- `constants.ts` owns schema, parser, cache, and search tuning constants.
- `types.ts` owns public result shapes and shared internal records.
- `sql.ts` owns `sql.js` loading and the minimal database adapter types.
- `database-path.ts` owns the local SQLite database path calculation.
- `freshness.ts` owns stored schema-version reads, stale-path detection, and local-index
  runtime/staleness error classification.
- `schema.ts` owns local SQLite schema and FTS table creation.
- `database-read.ts` owns SQL row materialization, metadata reads, stored search capability
  detection, and shared read-model conversion helpers.
- `search-text.ts` owns search normalization, n-gram generation, snippets, scoring, and FTS
  query tokenization.
- `search-read-model.ts` owns local-index search queries, direct workflow-file search fallback,
  cache-layer hints, and search authority ranking.
- `populate.ts` owns database population for workflow documents, skills, command intents,
  source anchors, path-surface metadata, search tables, and verification evidence read models.
- `effect-graph-read-model.ts` owns command-effect graph read-model queries for write locks
  and lock conflicts.
- `path-surface-read-model.ts` owns path-surface rule matching read-model queries for
  verification and explanation flows.
- `workflow-documents.ts` owns workflow document, skill, and skill-route collection.
- `command-effect-index.ts` owns command intent and declared effect collection from the
  command contract.
- `source-index.ts` owns source-index configuration, source-anchor candidate paths, indexed
  file records, and incremental fingerprint preflight.
- `verification-evidence.ts` owns latest run receipt parsing and verification evidence read-model
  projection.
- `hashing.ts` owns local-index hash formatting helpers.

Future splits should keep `index.ts` as the stable facade and orchestration layer without changing
the facade import path.
