# local-index

This directory contains the local SQLite index implementation behind the stable
`src/cli/lib/local-index.ts` facade.

- `index.ts` keeps the current public functions and orchestration.
- `constants.ts` owns schema, parser, cache, and search tuning constants.
- `types.ts` owns public result shapes and shared internal records.
- `sql.ts` owns `sql.js` loading and the minimal database adapter types.
- `workflow-documents.ts` owns workflow document, skill, and skill-route collection.
- `command-effect-index.ts` owns command intent and declared effect collection from the
  command contract.
- `source-index.ts` owns source-index configuration, source-anchor candidate paths, indexed
  file records, and incremental fingerprint preflight.
- `verification-evidence.ts` owns latest run receipt parsing and verification evidence read-model
  projection.
- `hashing.ts` owns local-index hash formatting helpers.

Future splits should move schema creation, population, freshness, effect graph, path surface,
and search code out of `index.ts` without changing the facade import path.
