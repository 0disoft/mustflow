# local-index

This directory contains the local SQLite index implementation behind the stable
`src/cli/lib/local-index.ts` facade.

- `index.ts` keeps the current public functions and orchestration.
- `constants.ts` owns schema, parser, cache, and search tuning constants.
- `types.ts` owns public result shapes and shared internal records.
- `sql.ts` owns `sql.js` loading and the minimal database adapter types.

Future splits should move collectors, schema creation, population, freshness,
effect graph, path surface, and search code out of `index.ts` without changing
the facade import path.
