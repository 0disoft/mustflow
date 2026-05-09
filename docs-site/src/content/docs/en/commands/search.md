---
title: mf search
description: Searches the local SQLite index for mustflow documents.
---

`mf search` reads the SQLite index created by `mf index`.

It does not create or modify files. If the index is missing, run `mf index` first.
If any indexed mustflow file has changed since indexing, the command stops and asks you to rebuild the
index. This prevents stale search results from misleading an agent.

## Search Scope

The command searches only mustflow workflow data:

- Indexed documents such as `AGENTS.md` and `.mustflow/docs/*.md`
- Skill entries from `.mustflow/skills/*/SKILL.md`
- Command intents from `.mustflow/config/commands.toml`

It does not search arbitrary project source files.

## Usage

```sh
npx mf index
npx mf search mustflow_check
npx mf search "code review" --json
npx mf search test --limit 5
```

## Options

- `--json`: Outputs results in machine-readable JSON format.
- `--limit <number>`: Sets the number of returned results. Default is `10`; maximum is `50`.

## JSON Fields

```sh
npx mf search mustflow_check --json
```

Machine-readable output uses these fields:

- `schema_version` (`number`): Output format version.
- `command` (`string`): Always `search`.
- `ok` (`boolean`): Whether search succeeded.
- `mustflow_root` (`string`): Current mustflow root.
- `database_path` (`string`): SQLite file used for the query.
- `query` (`string`): Normalized search query.
- `limit` (`number`): Result limit.
- `index_fresh` (`boolean`): Whether the index matches current file contents.
- `stale_paths` (`string[]`): Paths changed after indexing. Empty if the index is up to date.
- `result_count` (`number`): Number of returned results.
- `results` (`object[]`): Matching documents, skills, and command intents.

Each result can include these fields:

- `results[].kind` (`string`): Result kind. One of `document`, `skill`, or `command_intent`.
- `results[].path` (`string`): Document or skill file path.
- `results[].name` (`string`): Skill name or command intent name.
- `results[].title` (`string`): Document title.
- `results[].document_type` (`string`): Document category.
- `results[].cache_layer` (`string`): Prompt-cache layer hint. One of `stable`, `task`, or `volatile`.
- `results[].volatile` (`boolean`): Whether the result belongs to volatile state that should stay after stable prompt instructions.
- `results[].match` (`string`): Matching context snippet.
- `results[].score` (`number`): Ranking score used for result order.

## Exit Codes

- `0`: Search completed.
- `1`: Input was invalid, `.mustflow/cache/mustflow.sqlite` was missing, or the index was stale.
