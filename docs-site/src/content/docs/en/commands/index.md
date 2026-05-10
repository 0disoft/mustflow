---
title: mf index
description: Builds the local SQLite index for mustflow documents.
---

`mf index` builds a regenerable SQLite index from the mustflow document flow in the current root.

The source of truth remains the files on disk; the index serves as a cache that enables `mf search` and future map or dashboard features to retrieve mustflow documents efficiently.

Use `--source` to include structured source-code anchors. Source indexing is opt-in and stores anchor metadata only, not full source content.

## Indexed Inputs

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- Command intents from `.mustflow/config/commands.toml`
- Structured source-code anchors only when `--source` is provided

The default command does not index arbitrary project source files; it is scoped exclusively to mustflow workflow files. With `--source`, it scans source files for structured `mf:anchor` comments and writes only anchor fields such as id, path, line, purpose, search terms, invariant, and risk.

## Output File

```text
.mustflow/cache/mustflow.sqlite
```

This file is generated and can be deleted and rebuilt at any time.
The index stores content hashes for indexed files, allowing `mf search` to detect stale cache data.

## Dry Run

```sh
npx mf index --dry-run --json
```

A dry run calculates the index targets and prints counts without writing the SQLite file.

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

## JSON Fields

```sh
npx mf index --json
```

The machine-readable output uses the following fields:

- `schema_version` (`number`): Output format version.
- `command` (`string`): Always `index`.
- `ok` (`boolean`): Whether indexing succeeded.
- `mustflow_root` (`string`): Current mustflow root.
- `database_path` (`string`): Target SQLite file path.
- `dry_run` (`boolean`): Whether file writing was disabled.
- `wrote_files` (`boolean`): Whether the SQLite file was written.
- `document_count` (`number`): Number of indexed mustflow documents and config files.
- `skill_count` (`number`): Number of indexed skill documents.
- `command_intent_count` (`number`): Number of indexed command intents.
- `source_index_enabled` (`boolean`): Whether source-anchor indexing was requested.
- `source_anchor_count` (`number`): Number of indexed structured source anchors.
- `indexed_paths` (`string[]`): Paths included in the document index.

## Exit Codes

- `0`: Index targets were calculated and optionally written.
- `1`: The command received an unknown option or indexing failed.
