---
title: mf index
description: Builds the local SQLite index for mustflow documents.
---

`mf index` builds a regenerable SQLite index from the mustflow document flow in the current root.

The source of truth remains the files on disk. The index is a cache that helps `mf search` and future map or dashboard features read mustflow documents quickly.

## Indexed Inputs

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- Command intents from `.mustflow/config/commands.toml`

The command does not index arbitrary project source files. It is scoped to mustflow workflow files.

## Output File

```text
.mustflow/cache/mustflow.sqlite
```

This file is generated. It may be deleted and rebuilt.
The index stores content hashes for indexed files so `mf search` can detect stale cache data.

## Dry Run

```sh
npx mf index --dry-run --json
```

Dry run calculates the index targets and prints counts without writing the SQLite file.

## JSON Fields

```sh
npx mf index --json
```

Machine-readable output uses these fields:

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
- `indexed_paths` (`string[]`): Paths included in the document index.

## Exit Codes

- `0`: Index targets were calculated and optionally written.
- `1`: The command received an unknown option or indexing failed.
