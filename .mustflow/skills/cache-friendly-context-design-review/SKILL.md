---
mustflow_doc: skill.cache-friendly-context-design-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: cache-friendly-context-design-review
description: Apply this skill when repository documents, AGENTS.md files, README, design documents, code comments, SSOT catalogs, document indexes, summaries, context manifests, runtime state files, context-pack generators, or agent exploration paths are created, changed, reviewed, or reported and the risk is LLM prompt-cache invalidation, repeated input-token spend, or agents re-reading the whole repository on every task instead of loading a stable prefix plus a small dynamic tail.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.cache-friendly-context-design-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Cache-Friendly Context Design Review

<!-- mustflow-section: purpose -->
## Purpose

Review repository documents, comments, and agent exploration paths as a stable prompt prefix with a
small dynamic tail, not as a knowledge base that agents re-read in full on every task.

The review question is not "is this documented?" It is "when an agent starts a task, does it load
the same stable prefix bytes as every other task of the same family, then append only the changed
files, diagnostics, and user request, so repeated input is cached and tokens are not spent re-reading
the whole repository?"

<!-- mustflow-section: use-when -->
## Use When

- Code, docs, or agent configuration creates, changes, reviews, or reports root or directory
  `AGENTS.md` files, `README.md`, design documents, architecture documents, ADRs, decision logs,
  SSOT catalogs, document indexes, cards, summaries, context manifests, runtime state files,
  context-pack generators, code comments, or agent exploration paths.
- A change affects how an agent discovers the repository, which files it reads first, how stable
  versus volatile context is ordered, or how often cached prompt prefixes are invalidated.
- A review needs proof that repository structure does not force agents to re-read the whole codebase
  or invalidate prompt-cache prefixes on every task.
- A report claims the repository is agent-friendly, cache-friendly, or cheap for LLM agents to work
  with.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only the LLM request payload, prompt assembly, provider cache keys, or token budgets
  without a repository-structure boundary; use `llm-token-cost-control-review`.
- The task is persistent agent memory, memory lifecycle, supersession, or deletion governance; use
  `agent-memory-context-governance-review`.
- The task is only writing human-readable docs or release notes; use `readme-authoring`,
  `release-notes-authoring`, or `reader-centered-technical-content`.
- The task is only search index or retrieval quality for a product feature; use
  `search-index-integrity-review` or `vector-search-integrity-review`.
- The task is only general code comment quality for human readers without a token-cost or agent
  re-read boundary; use `code-review`.
- The task is only agent runtime execution control or tool-call gates; use
  `agent-execution-control-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Document ledger: root and nested `AGENTS.md`, `README.md`, architecture docs, design docs, ADRs,
  contracts, runbooks, current-state files, and which documents agents load per work family.
- Change-frequency ledger: which content changes rarely (months), per release, or per request, and
  where each piece currently lives.
- Context-loading ledger: the fixed order in which tools, policies, root rules, nested rules,
  contracts, current state, diffs, and user tasks are assembled, and who owns the order.
- Serialization ledger: line endings, encoding, Unicode normalization, key sorting, path sorting,
  and generated-content rules for every document and catalog.
- SSOT and index ledger: structured fact catalogs, document indexes, cards, summaries, their
  owners, source references, and hash-based freshness.
- Volatile-state ledger: branch, diff, test results, dates, request ids, runtime values, and where
  they are stored and appended.
- Agent exploration ledger: repository map generation, symbol-level read tools, context manifests,
  and how agents expand from diff to impact scope.
- Existing docs, tests, generated maps, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing document, change-frequency, loading-order,
  serialization, SSOT, volatile-state, or exploration evidence can be reported without guessing.
- Agents are treated as repeated readers of a byte-exact prefix, not as humans skimming a book.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten stable-prefix document structure, change-frequency separation, deterministic
  serialization, SSOT and index files, volatile-state isolation, context manifests, context-pack
  generators, symbol-level exploration tools, and cache-friendly code comments, plus directly
  synchronized documentation or templates owned by the selected boundary.
- Update docs, AGENTS.md files, README, catalogs, indexes, generators, and tests that describe the
  same context contract.
- Do not add raw prompt-cache keys, provider-specific cache configuration, or new command authority
  under this skill.
- Do not remove human-readable documentation or degrade reader experience while chasing token
  savings; separate stable facts from volatile state instead.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify every piece of context by change half-life into three tiers.
   - Foundation: product purpose, security principles, architecture boundaries, coding rules that
     last months. Release-tier: dependency versions, API lists, database schema, deployment
     topology. Request-tier: branch, diff, test results, task state, user input. Keep the tiers
     from mixing inside one document.
2. Separate tiers physically, not just by heading.
   - Split by storage location such as `docs/foundation`, `docs/release`, and `.agent/runtime`.
     A file that mixes stable facts with one volatile line forces rewriting the whole block when
     that line changes.
3. Write stable documents with rules and lookup locations, not current values.
   - Prefer "the source of truth for the Node version is `.tool-versions`, and CI and local follow
     it" over "Node.js 24.3.1". Let generated files such as `versions.current.json` or
     `deployment.current.json` own actual versions, ports, regions, and model ids.
4. Run decision records as append-only with a separate current-state file.
   - Do not edit an ADR after writing; a new ADR supersedes it. Keep the list of currently valid
     decisions in `decisions.current.json` and place immutable history early, active state late.
5. Combine a baseline snapshot with deltas instead of re-summarizing the codebase every task.
   - Create a stable codebase summary only at release or major architecture changes. For individual
     tasks, append changed files since the commit, the Git diff, and fresh diagnostics after the
     snapshot. Re-summarizing every file per request is expensive and breaks the cache.
6. Remove runtime information from the default input and fetch it only when needed.
   - Open issues, current CI status, recent logs, full dependency lists, Git state, and environment
     variable names do not belong in every request. Classify the task first, then retrieve only what
     is needed into the dynamic tail.
7. Apply per-tier cache lifetime and method.
   - Foundation content belongs in long-lived or explicit cache targets; release-tier content is
     reused only while the same work family is active; request-tier content is not cached or cached
     very briefly. Placing rarely reused volatile content in a long-lived cache adds fixed cost.
8. Make the root `AGENTS.md` an immutable contract and bootloader, not an encyclopedia.
   - Keep product purpose, unbreakable security boundaries, core principles, completion criteria,
     and the locations of canonical documents. Never put in-progress work, recent changes, file
     counts, dependency versions, branch names, or temporary workarounds. The root file is the
     front of nearly every coding task, so even a small edit causes the widest cache loss.
9. Keep nested `AGENTS.md` files as deltas, not copies of root rules.
   - `services/auth/AGENTS.md` holds only the auth service's data boundaries and validation
     commands. Agents read from the root to the target directory in order, so the root prefix is
     reused across all work and only the nested prefix varies by area.
10. Do not use `README.md` as a live status board.
    - Keep product description, shortest run path, main entrypoints, and canonical doc links.
      Move CI badges, current version tables, recent benchmarks, roadmap progress, file counts, and
      recent deploy dates to `STATUS.md` or a generated page.
11. Split design documents by purpose.
    - `ARCHITECTURE.md` owns system boundaries and invariants; `docs/contracts` owns API and data
      contracts; `docs/adr` owns immutable decisions; `docs/runbooks` owns operations; `docs/current`
      owns deployment state. Do not update principles and current implementation in one file.
12. Fix document titles and section order.
    - Use a template such as purpose, scope, invariants, interfaces, prohibitions, verification,
      references, and do not auto-sort. Add new content at the end of its section instead of
      reordering existing front matter. Prefix caching reads rendered order, not meaning.
13. Send volatile metadata and examples to the back or separate files.
    - Do not put `updated_at`, generator versions, commit SHAs, current owners, or progress state
      in front matter at the top of the document. Keep them in a sidecar JSON or at the end. Put
      frequently edited examples, output samples, and benchmark tables in a back appendix.
14. Declare the context-loading contract in `AGENTS.md`.
    - Force the order: tool definitions, system policy, root `AGENTS.md`, nearest nested
      `AGENTS.md`, relevant contract documents, current state, changes and diagnostics, user task.
      When duplication is found, follow references instead of re-inserting the front document. This
      loading order is the public API of prompt caching.
15. Serialize every generated document deterministically.
    - Use UTF-8 and LF, one Unicode normalization form, stable sorting of JSON keys and file paths,
      and fixed trailing-newline and whitespace handling. A generator that produces a diff with no
      content change breaks both cache and reproducibility.
16. Freeze tool schemas and structured-output schemas per release.
    - Tool descriptions, parameter order, and JSON Schema key order are prefix-critical. Keep the
      shared tool registry at a fixed order and version and express per-request limits as a separate
      allowlist instead of rewriting the tool array.
17. Split documents by the questions agents ask, not by table of contents.
    - One file per practical question such as `session-revocation.md`, `refresh-token-rotation.md`,
      and `password-reset-threats.md` instead of one giant `authentication.md`. Never split into
      `part-1.md`, `part-2.md`.
18. Read through index, cards, and source in three stages.
    - An `INDEX` entry is 20 to 50 tokens with id, one-line description, and read conditions. A card
      is 150 to 400 tokens with key contract, dependencies, failure conditions, and source paths.
      The detailed source is 800 to 3000+ tokens and is read only for implementation or
      verification. Most agents stop at the index or card.
19. Merge and split by co-read frequency, not by length.
    - Two documents always read in the same task belong together; sections used by different work
      families belong apart. Collect co-selection data from agent logs instead of designing a
      book-like table of contents.
20. Treat filenames and document ids as permanent identifiers.
    - Never use `new-auth-design-final-v3.md`. Use a stable id such as `auth.session.revocation`
      and a semantic path such as `docs/auth/session-revocation.md`. Do not prefix filenames with
      `01`, `02` for ordering; the index owns order.
21. Do not copy common explanations into every file.
    - Common facts live in one SSOT; individual documents reference an SSOT id such as
      `auth.session` or `security.trust-boundary.api`. The context builder inserts shared
      definitions once at the front when the task needs them.
22. Keep frequently changing summaries out of the front of long source documents.
    - A summary refreshed at the top of a long document pushes the stable source out of prefix
      match. Keep the permanent purpose, scope, and contract at the top; move current state and
      progress to a card or separate summary file.
23. Separate current documents from historical material in default search scope.
    - Deprecated designs, old migration plans, meeting notes, and generated logs must not be
      searched with current documents. Keep canonical docs in the default index and archived
      material behind a separate archive index. Record `read_when`, `skip_when`, `depends_on`, and
      `stop_after` on index entries so a simple question does not pull in the whole architecture.
24. Prefer structured facts over narrative Markdown for machine-readable truth.
    - Service names, ownership, API contracts, datastores, privacy boundaries, and dependencies
      belong in a TOML catalog or JSONL index, not hidden in prose. Treat Markdown as a
      human-readable view generated from the SSOT. One fact has one owner and one source.
25. Make `INDEX.jsonl` the agent search routing table.
    - Each record carries `id`, `path`, `kind`, `scope`, `keywords`, `read_when`, `depends_on`,
      `token_estimate`, and `source_hash` so agents can filter line by line without parsing the
      whole file. Generate the human `INDEX.md` from the same data.
26. Build hierarchical summaries from repository to subsystem to component.
    - The top summary states purpose, key boundaries, and next navigation paths; subsystem summaries
      state APIs, data ownership, dependencies, and failure modes; component cards point to
      implementation and source locations. Summaries are not SSOT: every claim links to an SSOT id
      or source path.
27. Isolate current work state in a volatile file.
    - `context/CURRENT.json` holds branch, changed files, failed checks, in-progress work, open
      decisions, and recent tool results. Regenerate it per session and always append it after the
      stable context so discarding it after the task does not damage repository knowledge.
28. Build a context-pack generator as a first-class repository tool.
    - Give the agent a `context-pack` command that takes the task and Git diff and selects the
      needed docs via the index and `depends_on`, includes only relevant SSOT records and symbols,
      sorts by stability, and tags blocks with ids and hashes. The final prompt contains the task's
      contracts, related summaries, target code, direct dependencies, and current diff — not the
      whole repository. Removing tokens that do not need to be read saves more than cache tuning.
29. Judge summary freshness by source hash, not by date.
    - `updated_at` being recent does not make a summary correct. Record the referenced source hash
      on every card and summary; mark the summary stale when the hash changes so agents read the
      source instead of trusting it, and rebuild only summaries linked to changed sources. Track
      total input, uncached input, cache-read, selected-document, and stale-summary metrics.
30. Write code comments for repeated LLM reads.
    - Delete comments that only translate the code; keep design reasons, invariants, external
      constraints, dangerous exceptions, and deliberate non-goals. Start comments with a small
      vocabulary such as `WHY`, `INVARIANT`, `SECURITY`, `COMPAT`, `PERF`, and `DO_NOT` so agents
      can `rg` for them. Compress long rationale to one invariant line plus a stable decision id
      such as `INVARIANT TENANT_02` with `RATIONALE ADR_014`. Never put dates, versions, counts,
      or transient facts in comments; move exception lists to data-driven tests and keep one to
      three sentences per comment.
31. Generate a repository map from the build graph, not by hand.
    - Provide `repo-map.json` from AST, `tsconfig` references, `go list`, Cargo metadata, or schema
      and migration parsing, with entrypoints, exports, imports, tests, configs, and risk tags per
      module, so agents look up modules and symbols instead of reading the tree.
32. Cache file summaries by Git blob hash, not by path.
    - Key summaries by summarizer version, Git blob SHA, symbol name, and summary format version so
      identical content on any branch reuses the summary and only changed blobs and affected symbols
      invalidate. Agents read cached symbol summaries first and expand to source only when
      implementation detail matters.
33. Compile the user request into a context manifest before exploring.
    - Turn the request into `task`, `domains`, `symbols`, `requiredEvidence`, and `excluded`
      boundaries first, and widen the scope only with a reason when new dependencies appear. This
      prevents unconditional whole-repository exploration.
34. Start from the diff and expand one hop at a time.
    - First context is `git status`, current diff, and changed symbols; then add direct callers,
      related tests, configs, and serialization schemas via the reverse-dependency graph, expanding
      only when evidence demands it. Full scans are waste unless re-reviewing a security boundary or
      redesigning architecture.
35. Give long-term facts a source and invalidation condition.
    - Store facts as records with `source`, `sourceBlob`, and `invalidatedBy` so a memory whose
      blob hash is unchanged is not re-verified, and only changed-hash memories are revalidated.
      The invalidation rule matters more than the fact text.
36. Make read tools return symbol-level results, not whole files.
    - Default search output to path, symbol name, line range, content hash, relevance, selected
      reason, and about 20 lines of context. Allow full-file reads only on explicit expansion, and
      exclude `vendor`, `dist`, generated code, lockfiles, and snapshots by default. Record
      duplicate-input tokens, same-file re-reads, used-read ratio, and source-expansion ratio.

<!-- mustflow-section: postconditions -->
## Postconditions

- Stable, release-tier, and request-tier content are physically separated and loaded in a fixed,
  documented order with a stable byte-exact prefix.
- Root and nested `AGENTS.md`, README, design docs, SSOT catalogs, indexes, cards, summaries,
  volatile-state files, and context manifests have explicit owners and freshness rules.
- Documents, catalogs, and generators serialize deterministically so identical input produces
  identical bytes.
- Agents explore through generated maps, symbol-level reads, context manifests, and diff-first
  expansion instead of whole-repository re-reads.
- Code comments are searchable, token-bounded, and free of volatile facts.
- Cache-friendly-context claims are backed by configured tests, manifest evidence, or labeled as
  manual-only or missing.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured tests that prove deterministic serialization, stable prefix
ordering, volatile-state isolation, SSOT and index freshness by hash, context-pack selection, and
symbol-level read behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If document, change-frequency, loading-order, serialization, SSOT, or volatile-state evidence is
  missing, report the gap instead of claiming the repository is cache-friendly.
- If a generator produces a diff without content changes or a document mixes tiers, fix or report
  the reproducibility and prefix-stability defect before other work.
- If moving content to a generated file would degrade human readers, keep the reader-facing copy
  and separate the machine-owned fact instead of deleting the document.
- If the task is primarily the LLM request payload or provider cache keys, route to
  `llm-token-cost-control-review` before editing that scope.
- If a real secret appears in generated maps, manifests, comments, or reports, stop repeating it
  and use `secret-exposure-response`.

<!-- mustflow-section: output-format -->
## Output Format

- Cache-friendly context design reviewed
- Change-tier separation and physical layout findings
- AGENTS.md, README, design doc, and loading-contract findings
- Deterministic serialization and schema-freeze findings
- SSOT, index, card, summary, and volatile-state findings
- Context-pack, repository-map, symbol-level read, and diff-first exploration findings
- Code comment token and searchability findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining cache-friendly-context risk
