---
title: mf search
description: Searches the local SQLite index for mustflow documents.
---

`mf search` reads the SQLite index created by `mf index`.

It does not create or modify files. If the index is missing, run `mf index` first.
If any indexed mustflow file has changed since indexing, the command stops and asks you to rebuild the
index. The stale-index error includes the copyable refresh command `mf index` so
agents can report the next safe command without trusting old rows.

Search uses the backend recorded by `mf index`. Fresh indexes use FTS5 when the
bundled SQLite runtime supports it, and otherwise fall back to bounded table
scanning over the same derived metadata. Both backends also use derived n-gram
rows so multilingual queries can match indexed terms even when spaces or SQLite
tokenization do not line up exactly.

## Search Scope

By default, the command searches only mustflow workflow data:

- Indexed documents such as `AGENTS.md` and `.mustflow/docs/*.md`
- Skill entries from `.mustflow/skills/*/SKILL.md`
- Skill routes from `.mustflow/skills/INDEX.md`, including triggers and risks
- Command intents from `.mustflow/config/commands.toml`, including resource locks and effect paths

It does not search arbitrary project source files. If the index was created with `mf index --source`,
you can search structured source anchors with `--scope source`.

Use `--scope all` to include both workflow results and source-anchor hints. In that mode, mustflow keeps
workflow authority and command-contract results above source anchors. Source anchors are navigation
hints only; they cannot override command rules, skills, workflow documents, or `AGENTS.md`.

## Usage

```sh
npx mf index
npx mf index --source
npx mf search mustflow_check
npx mf search "code review" --json
npx mf search "role mapping" --scope source
npx mf search mustflow_check --scope all --json
npx mf search test --limit 5
```

## Options

- `--json`: Outputs results in machine-readable JSON format.
- `--limit <number>`: Sets the number of returned results. Default is `10`; maximum is `50`.
- `--scope <workflow|source|all>`: Selects indexed workflow data, source anchors, or both. Default is `workflow`.

## JSON Fields

```sh
npx mf search mustflow_check --json
```

Machine-readable output uses these fields:

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `search`.
- `ok` (`boolean`): Whether search succeeded.
- `mustflow_root` (`string`): Current mustflow root.
- `database_path` (`string`): SQLite file used for the query.
- `query` (`string`): Normalized search query.
- `limit` (`number`): Result limit.
- `scope` (`string`): Search scope. One of `workflow`, `source`, or `all`.
- `index_fresh` (`boolean`): Whether the index matches current file contents.
- `stale_paths` (`string[]`): Paths changed after indexing. Empty if the index is up to date.
- `search_backend` (`string`): Search backend used for this query. One of `fts5` or `table_scan`.
- `search_fts5_available` (`boolean`): Whether the index was built when SQLite FTS5 support was available.
- `result_count` (`number`): Number of returned results.
- `results` (`object[]`): Matching workflow entries and, when requested, source anchors.

Each result can include these fields:

- `results[].kind` (`string`): Result kind. One of `document`, `skill`, `skill_route`, `command_intent`, or `source_anchor`.
- `results[].path` (`string`): Document or skill file path.
- `results[].name` (`string`): Skill name, command intent name, or source-anchor ID.
- `results[].title` (`string`): Document title.
- `results[].document_type` (`string`): Document category.
- `results[].anchor_id` (`string`): Source-anchor ID.
- `results[].line_start` (`number`): Source line where the anchor starts.
- `results[].risk` (`string`): Comma-separated source-anchor risk tags.
- `results[].cache_layer` (`string`): Prompt-cache layer hint. One of `stable`, `task`, or `volatile`.
- `results[].volatile` (`boolean`): Whether the result belongs to volatile state that should stay after stable prompt instructions.
- `results[].authority_rank` (`number`): Authority order used when workflow and source results are shown together.
- `results[].authority_label` (`string`): Authority category, such as `command_contract` or `source_navigation_hint`.
- `results[].source_scope` (`string`): Whether the result came from workflow data or source-anchor data.
- `results[].navigation_only` (`boolean`): Whether the result is only a code-navigation hint.
- `results[].can_instruct_agent` (`boolean`): Whether the result may carry workflow instructions.
- `results[].effect_locks` (`string[]`): Resource locks for a matching command intent.
- `results[].effect_paths` (`string[]`): Effect paths for a matching command intent.
- `results[].effect_modes` (`string[]`): Effect modes for a matching command intent.
- `results[].route_trigger` (`string`): Trigger text for a matching skill route.
- `results[].route_risk` (`string`): Risk text for a matching skill route.
- `results[].verification_intents` (`string[]`): Verification intents listed by a matching skill route.
- `results[].match` (`string`): Matching context snippet.
- `results[].score` (`number`): Ranking score used for result order.

## Exit Codes

- `0`: Search completed.
- `1`: Input was invalid, `.mustflow/cache/mustflow.sqlite` was missing, or the index was stale.
