---
title: Local Index
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

SQLite serves as a secondary local index to enable faster search and analysis. It must be safe to
delete and rebuild.

The local SQLite database is a rebuildable cache. It must not be treated as source of truth, memory
storage, an audit log, or transcript storage.

## Expected location

```text
.mustflow/cache/mustflow.sqlite
```

`mf init` does not create this file immediately. The index is created when `mf index` runs.
`mf search` reads this file without modifying source documents. Future `mf map` and `mf dashboard`
features may reuse it.

The default template defines this state as:

```toml
[capabilities]
local_index = "generated_optional"
```

This means the index is optional generated data, not a source document.

## Data the index may store

- Document paths
- Titles and section headings
- Frontmatter metadata
- Document revisions and hashes
- Short content snippets
- Command intent metadata
- Skill references

The current `mf index` command uses `metadata_and_snippets` mode. It stores at most 2048 bytes of
content snippet per document, does not store full document bodies by default, and stores command
intent names and descriptions as derived document terms so `mf search` can still find the relevant
configuration file.

Before searching, `mf search` compares stored content hashes with the current files and returns an
error if the cache is stale. Last verification results and run analysis are reserved for future
features.

## Write rules

When an LLM or dashboard edits documents, the final write target remains Markdown or TOML.

SQLite provides auxiliary data to accelerate search, display, and validation.

Raw logs, full terminal output, full chat transcripts, hidden reasoning, secrets, environment values,
and private repository contents are not source documents for the index or future knowledge layer.
mustflow keeps small run receipts in the project and does not store raw logs by default. This is
enforced through the `[retention]` policy in `.mustflow/config/mustflow.toml` and the storage checks
in `mf check --strict`.
