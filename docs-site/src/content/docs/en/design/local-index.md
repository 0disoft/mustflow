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
- Indexed file fingerprints
- Short content snippets
- Command intent metadata
- Command-effect graph views
- Skill references
- Path-surface classification metadata

The current `mf index` command uses `metadata_and_snippets` mode. It stores at most 2048 bytes of
content snippet per document, does not store full document bodies by default, and stores command
intent names and descriptions as derived document terms so `mf search` can still find the relevant
configuration file.

Search result `match` previews are also bounded. `mf search` derives them from indexed metadata and
stored snippets, caps each preview at 240 characters, and does not expand a result back into a full
document or source body.

The `indexed_files` table stores derived fingerprints for each indexed workflow file and optional
source-anchor file: path, source scope, size, modified time, content hash, indexed time, index mode,
and parser version. `mf index --incremental` may reuse an existing SQLite file only when the schema,
parser version, source-scope settings, and file fingerprints remain compatible; otherwise it falls
back to a full rebuild.

`path_surfaces` and `path_surface_reasons` are derived from the built-in change classification
rules. They store rule id, pattern shape, pattern flags, surface kind, category, public-surface flag, validation
reasons, affected contracts, update policy, and drift checks. The TypeScript classification rules
remain the canonical command-selection path; SQLite rows are only a rebuildable read model for
`mf explain surface` and `mf verify --plan-only` explanations.

The index records its selected search backend. If the bundled SQLite runtime supports FTS5, `mf index`
writes derived FTS tables for token matching. If FTS5 is unavailable, `mf search` uses the same base
metadata and snippet tables through a bounded table-scan fallback. Both paths keep the authority
boundary unchanged: search ranking cannot turn source anchors or cache rows into workflow or command
authority.

Search metadata is also written to a `search_ngrams` table. These rows are short derived term
fragments used as a multilingual fallback when spacing or SQLite tokenization is weak. They point
back to documents, skills, skill routes, command intents, and source anchors; they do not store full
document or source content and they do not change authority ordering. N-gram generation uses hard
limits: at most the first 64 characters of each token are considered, and each indexed target can
write at most 512 n-gram rows.

Command-effect rows from `.mustflow/config/commands.toml` are exposed through
`command_write_locks` and `command_lock_conflicts` views. These views help
read-only tools explain shared locks, exclusive effects, and recreated output
paths. Every exported command-effect graph is marked `explanation_only`,
`grantsCommandAuthority: false`, and
`commandAuthority: ".mustflow/config/commands.toml"`. They remain derived cache
data; `commands.toml` is still the only source that decides whether an intent is
configured, runnable, or agent-allowed.

When `.mustflow/state/runs/latest.json` contains a verify summary, `mf index` also writes bounded
verdict read-model rows such as `verification_plans`, `acceptance_criteria`, `criterion_coverage`,
`command_receipt_summaries`, `completion_verdict_summaries`, `repro_routes`,
`repro_observations`, `failure_fingerprints`, and `validation_ratchet_signals`. These rows store
hashes, status values, counts, receipt references, and fingerprints only. Validation-ratchet rows
keep the risk code, severity, path hash, and optional before/after digests so dashboard and explain
surfaces can find weakened-validation signals without storing raw diffs. They do not store raw
acceptance statements, raw reproduction steps, raw diffs, raw logs, full receipt output, or terminal
tails.

`mf dashboard` and `mf explain verify` use a bounded verification read-model query over those rows
to list uncovered criteria, severe risks, non-passing receipts, repeated failures requiring new
evidence, and validation-weakening signals for the indexed plan. The query result is evidence only:
it can lower or explain a completion verdict, but it cannot authorize commands or replace
`.mustflow/config/commands.toml`.

When source indexing is enabled, changed, stale, or review-needed anchors are also copied into
`source_anchor_risk_signals`. These rows keep the anchor id, source path hash, current anchor status,
derived risk signal, confidence, and navigation-only authority flags. They are explanation rows only:
they do not grant command permission, instruct agents, or replace the current source file and
`source_anchor_status` read model.

Before searching, `mf search` compares stored content hashes with the current files and returns an
error if the cache is stale.

## Structured source anchors

Source anchors are a small comment budget for code navigation, not a general documentation layer.
Use `mf:anchor` only when finding that exact source boundary helps an agent choose safer context or
understand a contract that is easy to break.

Good anchor locations are:

- exported CLI or core boundaries where inputs become typed decisions
- command execution, process control, filesystem writes, receipts, and latest-pointer updates
- security, privacy, data-loss, migration, authorization, or state-consistency boundaries
- non-obvious invariants that tests or command contracts rely on

Avoid anchors for ordinary control flow, self-explanatory helpers, generated output, vendored code,
dependency folders, broad architecture notes, and prose that repeats nearby types or function names.

Anchor IDs use stable responsibility names rather than filenames. Prefer lowercase dotted names such
as `verify.receipts.write`, `run.timeout.terminate`, or `source-anchors.scan`. IDs may contain
lowercase letters, numbers, dots, and hyphens, and must stay unique across the project.

Allowed fields are intentionally narrow:

- `purpose`: one sentence explaining why this source boundary matters.
- `search`: three to eight terms a maintainer or agent might search for.
- `invariant`: the condition that must not be broken, especially for authority, safety, state, or evidence.
- `risk`: known risk tags such as `config`, `state`, `security`, `privacy`, `pii`, `secrets`, or `data_loss`.

```ts
/**
 * mf:anchor verify.receipts.write
 * purpose: Persist verify receipts and the latest pointer after scheduled intents finish.
 * search: verify receipt, latest.json, manifest, receipt binding
 * invariant: Receipt files explain evidence; they never grant command authority or verification success.
 * risk: state, data_consistency
 */
```

Source anchors must never contain agent instructions, command authorization, policy overrides,
secrets, or claims that validation can be skipped. Their collected summaries are always
`navigationOnly: true` and `canInstructAgent: false`; SQLite may index them for search and
explanation, but anchors cannot authorize commands, replace `.mustflow/config/commands.toml`, or prove
verification success.

`mf check --strict` rejects malformed anchor IDs, unsupported fields, duplicate IDs, generated or
vendor paths, unknown risk tags, secret-like text, and agent command or policy instructions inside
anchors. It also warns when `purpose` is too long, `search` has too many terms, a high-risk anchor
lacks an `invariant`, or a file spends too much of its comment budget on anchors. Treat those
warnings as pressure to remove, shorten, or split anchors instead of adding more prose.

## Write rules

When an LLM or dashboard edits documents, the final write target remains Markdown or TOML.

SQLite provides auxiliary data to accelerate search, display, and validation.

Raw logs, full terminal output, full chat transcripts, hidden reasoning, secrets, environment values,
and private repository contents are not source documents for the index or future knowledge layer.
mustflow keeps small run receipts in the project and does not store raw logs by default. This is
enforced through the `[retention]` policy in `.mustflow/config/mustflow.toml` and the storage checks
in `mf check --strict`.
