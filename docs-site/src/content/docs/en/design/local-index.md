---
title: Local index
description: Explains how mustflow uses SQLite as its local index.
---

mustflow uses SQLite as its default local index store.

## Principles

Files are always the source of truth.

- `AGENTS.md`
- `.mustflow/config/*.toml`
- `.mustflow/context/*.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/*/SKILL.md`

SQLite is a supporting index for faster search and analysis. It must be safe to delete and rebuild.

## Expected location

```text
.mustflow/cache/mustflow.sqlite
```

`mf init` does not create this file immediately. The index is created when `mf index` runs.
`mf search` reads this file without modifying source documents. Future `mf map` and `mf dashboard`
features may reuse it.

The default template declares that state as:

```toml
[capabilities]
local_index = "generated_optional"
```

This means the index is optional generated data, not a source document.

## Data the index may store

- Document paths
- Titles and sections
- Frontmatter metadata
- Document revisions
- Command intents
- Skill references

The current `mf index` command indexes mustflow documents, context files, config files, skill documents, and command intents.
`mf search` searches only that indexed mustflow workflow data.
The index also stores content hashes. Before searching, `mf search` compares those hashes with the
current files and fails if the cache is stale.
Last verification results and run analysis are left for later features.

## Write rules

When an LLM or dashboard edits documents, the final write target is still Markdown or TOML.

SQLite is supporting data for faster search, display, and validation.

Raw logs, full terminal output, and full chat transcripts are not source documents for the index
or future knowledge layer. mustflow keeps small run receipts and summary documents in the project
and does not store raw logs by default. This is enforced through the `[retention]` policy in
`.mustflow/config/mustflow.toml` and the storage checks in `mf check --strict`.
