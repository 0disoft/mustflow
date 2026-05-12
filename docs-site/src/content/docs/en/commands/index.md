---
title: mf index
description: Builds the local SQLite index for mustflow documents.
---

`mf index` builds a regenerable SQLite index from the mustflow document flow in the current root.

The source of truth remains the files on disk; the index serves as a cache that enables `mf search` and future map or dashboard features to retrieve mustflow documents efficiently.

Use `--source` to include structured source-code anchors. Source indexing is opt-in unless `.mustflow/config/index.toml` explicitly enables it, and stores anchor metadata only, not full source content.

## Indexed Inputs

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- Skill route metadata from `.mustflow/skills/INDEX.md`
- Command intents and command-effect metadata from `.mustflow/config/commands.toml`
- Derived path-surface rules from the built-in change classification model
- Structured source-code anchors only when `--source` is provided or `.mustflow/config/index.toml` enables them

The default command does not index arbitrary project source files; it is scoped exclusively to mustflow workflow files. With `--source` or an explicit source-index setting, it scans source files for structured `mf:anchor` comments and writes only anchor fields such as id, path, line, purpose, search terms, invariant, and risk.

## Output File

```text
.mustflow/cache/mustflow.sqlite
```

This file is generated and can be deleted and rebuilt at any time.
The index stores content hashes for indexed files, allowing `mf search` to detect stale cache data.
It also records an `indexed_files` table with path, source scope, file size, modified time,
content hash, indexed time, index mode, and parser version so incremental index runs can decide
whether an existing cache is still safe to reuse.

The index is a lookup cache, not a memory store or audit log. It stores metadata,
hashes, short document snippets, command contract summaries, skill route rows,
and source-anchor navigation metadata. It does not store full source files, raw
diffs, raw terminal logs, environment variables, secrets, customer data, chat
history, hidden reasoning, browser tokens, remote document bodies, or long-term
memory summaries.

When the bundled SQLite runtime supports FTS5, `mf index` records derived FTS
tables for faster token matching. When FTS5 is unavailable, the index keeps the
same base tables and `mf search` falls back to bounded table scanning. In both
backends, the index stores short n-gram rows for searchable metadata so
multilingual queries can still match terms when spacing or tokenization differs.

The index also records `path_surfaces` and `path_surface_reasons` rows derived
from the same TypeScript classification rules used by `mf classify`. These rows
are read-only explanation metadata: they can describe why a path triggers a
validation reason, but they cannot make a command runnable or replace current
classification logic.

Command effects are also exposed through read-only graph views. The
`command_write_locks` view groups write effects by intent and lock, and
`command_lock_conflicts` lists intent pairs that share a lock, exclusive effect,
or delete-and-recreate output. These views explain configured command effects;
they do not authorize commands or change run eligibility.

## Dry Run

```sh
npx mf index --dry-run --json
```

A dry run calculates the index targets and prints counts without writing the SQLite file.

## Incremental Mode

```sh
npx mf index --incremental --json
```

By default, `mf index` performs a full rebuild. Incremental mode first checks the existing
`.mustflow/cache/mustflow.sqlite` file. If the schema version, parser version, source-scope
settings, and indexed file fingerprints are still compatible, it reuses the existing SQLite file
without rewriting it. If any indexed workflow file was changed, deleted, or added, or if source
anchor scope changed, mustflow falls back to a full rebuild.

## Source Anchors

```sh
npx mf index --source --json
```

Source anchor indexing is for navigation only. The resulting `source_anchors`, `source_anchor_fingerprints`, and `source_anchor_status` tables cannot define workflow rules, command permission, or verification authority.
Fingerprint and status rows are derived search metadata that help later checks explain whether an anchor still points at the expected code.
When a previous local SQLite index exists, `mf index --source` compares the new anchor fingerprints with the prior snapshot and records status values such as `valid`, `moved`, `changed`, `review`, and `stale`.
High-risk anchors are conservative: body, signature, search, invariant, or metadata changes are marked for review instead of being treated as automatically valid.
Invalid anchors are not written to the source anchor tables. Use `mf check --strict` to report malformed anchors, duplicate IDs, forbidden instructions, secret-like text, generated or vendor paths, and unknown risk tags.
When a nearby function, class, method, or constant can be detected, the fingerprint table stores derived symbol metadata such as the kind, name, signature hash, and body hash.

## Source Scan Configuration

`.mustflow/config/index.toml` can narrow source-anchor scanning without changing workflow policy or command authority.

```toml
[source_index]
enabled_by_default = false
include = ["src/**/*.ts", "packages/*/src/**/*.ts"]
exclude = ["**/*.generated.ts", "**/__fixtures__/**"]
max_file_bytes = 262144
allowed_extensions = [".ts", ".tsx", ".js", ".py", ".rs", ".go"]
```

`enabled_by_default = true` lets `mf index` include source anchors without `--source`. Include and exclude patterns only bound the scan. Generated, dependency, and vendor paths remain excluded from the local source index even when an include pattern matches them.

## JSON Fields

```sh
npx mf index --json
```

The machine-readable output uses the following fields:

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `index`.
- `ok` (`boolean`): Whether indexing succeeded.
- `mustflow_root` (`string`): Current mustflow root.
- `database_path` (`string`): Target SQLite file path.
- `dry_run` (`boolean`): Whether file writing was disabled.
- `wrote_files` (`boolean`): Whether the SQLite file was written.
- `index_mode` (`string`): `full` for the default rebuild path or `incremental` when `--incremental` was requested.
- `reused_existing` (`boolean`): Whether incremental mode reused the existing SQLite file.
- `rebuild_reason` (`string | null`): Why incremental mode rebuilt instead of reusing the existing file.
- `document_count` (`number`): Number of indexed mustflow documents and config files.
- `skill_count` (`number`): Number of indexed skill documents.
- `skill_route_count` (`number`): Number of indexed skill route rows from `.mustflow/skills/INDEX.md`.
- `command_intent_count` (`number`): Number of indexed command intents.
- `command_effect_count` (`number`): Number of indexed command effect rows derived from `effects` or `writes`.
- `source_index_enabled` (`boolean`): Whether source-anchor indexing was enabled by `--source` or local index configuration.
- `source_anchor_count` (`number`): Number of indexed structured source anchors.
- `search_backend` (`string`): Search backend selected for this index. One of `fts5` or `table_scan`.
- `search_fts5_available` (`boolean`): Whether the SQLite runtime reported FTS5 support while building the index.
- `indexed_file_count` (`number`): Number of file fingerprints recorded in `indexed_files`.
- `indexed_paths` (`string[]`): Paths included in the document index.

## Exit Codes

- `0`: Index targets were calculated and optionally written.
- `1`: The command received an unknown option or indexing failed.
