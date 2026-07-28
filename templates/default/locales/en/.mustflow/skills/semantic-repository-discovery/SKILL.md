---
mustflow_doc: skill.semantic-repository-discovery
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: semantic-repository-discovery
description: Apply this skill before creating or duplicating a utility, component, hook, type, schema, service, adapter, route, job, or public symbol when an equivalent or reusable repository asset may exist under different names, paths, layers, exports, registrations, data shapes, failure terms, lifecycle states, side effects, or historical identities; use behavior fingerprints, boundary traces, tests, types, AST shape, references, registries, dependency graphs, and Git archaeology to produce an evidence-backed reuse decision.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.semantic-repository-discovery
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Semantic Repository Discovery

<!-- mustflow-section: purpose -->
## Purpose

Find existing repository behavior even when its name, path, abstraction level, or current package is
unexpected. Make discovery evidence a prerequisite for new reusable code instead of accepting a few
literal searches as proof that no implementation exists.

This skill does not equate semantic similarity with safe reuse. It first generates candidates from
several independent search axes, then compares contracts, invariants, change reasons, dependencies,
side effects, authority, lifecycle, and operational behavior before choosing reuse or separation.

<!-- mustflow-section: use-when -->
## Use When

- A task may add a new utility, component, hook, type, schema, service, adapter, repository, route,
  command, worker, fixture, public export, shared module, or reusable symbol.
- Literal symbol or filename searches found nothing, found ambiguous candidates, or may miss renamed,
  wrapped, generated, private, registered, moved, deleted, or differently layered behavior.
- A review must determine whether new code duplicates an existing role, data shape, call pattern,
  side effect, lifecycle, failure guard, or public asset.
- The user asks for semantic repository search, code archaeology, reuse-candidate evidence, duplicate
  prevention, existing-asset discovery, or justification for a new symbol.
- A discovery workflow, asset catalog, structural duplicate detector, or reuse gate is being designed
  or audited.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The exact local pattern and owning symbol are already known and only nearby convention matching is
  needed; use `pattern-scout`.
- The primary task is to infer every required surface of a non-trivial feature after candidate
  discovery; use `feature-surface-completeness-review`.
- The primary question is whether an already identified abstraction should be introduced, merged,
  split, or deleted; use `abstraction-boundary-review` after discovery evidence is available.
- The change is a tiny mechanical edit that creates no new behavior, reusable symbol, public export,
  shared asset, or architectural precedent.
- The user explicitly authorizes a disposable experiment outside the maintained product surface.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Requested behavior and intended repository or package boundary.
- Behavior fingerprint: trigger, actor, input, state read, state change, output, visible result,
  external effect, failure prevention, cancellation, retry, duplicate, expiry, and cleanup semantics.
- Current dependency direction, workspace/package roles, public export surfaces, and generated-source
  ownership where relevant.
- Available lexical, symbol, reference, AST, type, call-graph, test, registry, history, and runtime
  evidence capabilities. Tool absence must be reported rather than fabricated.
- Current changed-file list and planned new files, exports, or symbols when work has begun.
- Repository command contract for any configured verification or read-only helper.

<!-- mustflow-section: preconditions -->
## Preconditions

- The selected repository boundary and nearest instructions are known.
- Search scope follows dependency direction and ownership rather than treating every directory as
  equally relevant.
- Ignored, generated, vendored, cache, build, secret, and large-output paths are classified before a
  broader search. A default `rg` or `fd` miss is not proof that a user-named path does not exist.
- Search tools are used only when available and authorized. Do not invent AST, index, trace, or Git
  evidence that was not actually obtained.
- Candidate count is not a quota. Search coverage and negative evidence matter more than producing an
  arbitrary number of candidates.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Prefer a read-only discovery phase before implementation edits.
- Maintain a working candidate ledger in the task response or local scratch state. Persist an asset
  report in the repository only when the user requests it or an existing repository convention owns
  that artifact.
- After a decision, reuse, adapt, extract, replace, or create only the smallest behavior and contract
  surface required by the user task.
- Add a machine-readable discovery gate or structural duplicate check only when its activation scope,
  false-positive policy, exception ownership, expiry, and regression fixtures are defined.
- Do not add a shared abstraction merely to improve a reuse metric. Intentional independent code is
  valid when contracts, invariants, release cadence, runtime, security, or ownership differ.
- Do not scan secrets, unrelated ignored trees, dependency caches, build outputs, or the entire
  workspace without a bounded evidence reason.

<!-- mustflow-section: procedure -->
## Procedure

1. Freeze the target behavior before searching.
   - Decompose the request into actor, action, object, input and output shapes, start/intermediate/end
     states, visible result, external effect, failure guard, duplicate behavior, retry, cancellation,
     expiry, cleanup, and authority.
   - Build a vocabulary ledger containing product terms, code terms, synonyms, antonyms, legacy names,
     abbreviations, protocol headers, database fields, event names, error codes, translation keys,
     analytics events, cache keys, provider methods, and failure-state language.
   - Do not search only the user's requirement sentence or guessed function name.
2. Bound the search by dependency and ownership.
   - Identify the current package, its allowed dependencies, common packages it already consumes, and
     downstream consumers that would be affected by a shared change.
   - Search the nearest plausible packages first. Broaden only when local evidence is insufficient or
     the target is a shared/public contract.
   - Preserve generated sources when they are the contract owner; otherwise distinguish source from
     derived outputs.
3. Trace inward from independent boundary fingerprints.
   - From the user-facing side, follow UI text, accessibility labels, translation keys, routes, CLI
     commands, browser events, analytics events, and public responses toward handlers and owners.
   - From the data or effect side, follow tables, columns, schemas, queue topics, provider calls,
     filesystem keys, cache keys, email templates, logs, and events toward callers.
   - Candidate centers are where these paths meet. Do not assume the implementation lives in the
     expected layer or directory.
4. Search tests and examples before trusting definitions.
   - Search test names, failure descriptions, fixtures, mocks, snapshots, stories, examples, and
     end-to-end scenarios using product and failure vocabulary.
   - Follow each relevant test to the real symbol and caller. Tests may reveal private helpers,
     wrappers, compatibility layers, and behavior names missing from production symbols.
   - A test file is evidence of intended or observed behavior, not automatic proof that it runs or
     that the implementation is current.
5. Use a three-stage search funnel.
   - Broad stage: exact terms, synonyms, external traces, failure states, lifecycle states, and likely
     package boundaries with bounded file types and exclusions.
   - Narrow stage: exports, imports, symbol definitions, references, registries, call sites, types,
     schemas, props, and representative tests inside candidate packages.
   - Structural stage: when available, use language-server references or call hierarchy, AST queries,
     type queries, Semgrep, ast-grep, compiler APIs, SCIP, LSIF, or ctags to find shape-equivalent code.
   - `rg` finds text; it does not prove semantic absence. An unavailable structural tool is an evidence
     limitation, not permission to claim it ran.
6. Inspect official exposure and activation separately from existence.
   - Check package exports, barrel files, path aliases, component catalogs, stories, DI containers,
     factories, route and handler registries, schema registries, plugin maps, providers, feature and
     permission catalogs, generated-code inputs, and build inclusion.
   - Record `exists`, `publicly reusable`, `internal only`, `registered`, `unreachable`, `deprecated`,
     or `unknown` separately. A file can exist without being a supported asset.
7. Cluster consumers, not only definitions.
   - Group code that calls the same API, reads the same table or schema, emits the same event, imports
     the same type, applies the same validation chain, or performs the same effect sequence.
   - Use reference count, dependency distance, production-path use, tests, stories, recent callers,
     and stable package ownership to distinguish a live standard from dead or accidental code.
   - Inspect wrappers around the candidate; duplicated behavior often lives in callers rather than
     the named core utility.
8. Use history as a synonym and rejection database.
   - When history is available and relevant, inspect `git log -S`, `git log -G`, rename history,
     blame, removals, reverts, fixes, and migration commits for old names, moved packages, replacement
     reasons, and deliberately deleted implementations.
   - Current absence and intentional removal are different findings. Do not resurrect a removed
     design without addressing the reason it was removed.
9. Build one candidate ledger. For every candidate record:
   - path, symbol, public import or registration path, ownership and layer;
   - matched fingerprint evidence and discovery axis;
   - representative callers, consumers, tests, stories, fixtures, and history;
   - input/output contract, invariants, errors, ordering, authority, transaction, retry, idempotency,
     cancellation, cache, logging, privacy, and other effects;
   - transitive dependencies, runtime and platform constraints, bundle or initialization cost;
   - usage and change evidence, deprecation or replacement state;
   - decision and rejection reason.
   Record searched surfaces that returned no candidate as `searched_no_match`, and distinguish them
   from `not_applicable`, `tool_unavailable`, `access_blocked`, and `not_searched`.
10. Rank candidates by evidence, not name similarity.
    - Prefer allowed dependency distance, public supported exposure, contract and type compatibility,
      production callers, behavior tests, stable ownership, and relevant history.
    - Embeddings may generate candidates, but rerank with exact traces, types, references, import and
      call graphs, usage, tests, recency, and lifecycle state. A vector score alone is not reuse proof.
    - A highly used but rapidly changing or exception-heavy asset may be riskier than a smaller stable
      one. A zero-reference asset may be dead or unfinished.
11. Compare reuse compatibility explicitly.
    - Contract: accepted values, output meaning, errors, ordering, idempotency, cancellation, timeout,
      transaction, and partial-failure semantics.
    - Invariants: money, identity, tenant, permission, state, privacy, retention, and lifecycle rules.
    - Change reason: whether both capabilities will evolve for the same policy and owner.
    - Adapter honesty: whether adaptation only translates names, units, or representation, or instead
      suppresses effects, invents context, changes failures into success, or adds feature-specific
      policy branches.
    - Dependency cost: transitive packages, runtime support, bundle, startup, security, license, and
      release boundary.
    - Operational effects: database, network, filesystem, queue, email, cache, logs, metrics, global
      state, listeners, timers, concurrency, retry, and cleanup.
12. Choose exactly one disposition for each serious candidate:
    - `reuse`: same contract, invariants, change reason, and acceptable dependency/effect boundary;
    - `adapt`: same meaning with a thin representation-only adapter;
    - `extract`: shared pure primitive exists but policy, authority, or lifecycle must remain separate;
    - `replace`: the discovered asset is obsolete and the task safely migrates its consumers;
    - `independent`: deliberate separate implementation because contract, invariant, owner, runtime,
      release cadence, security boundary, or dependency cost differs;
    - `reject`: not a valid candidate, with evidence.
    Do not force reuse merely because code shape or line count is similar.
13. Bind the implementation plan to discovery.
    - Every planned file or symbol must point to an existing candidate disposition or a new-code
      justification.
    - A new exported or shared symbol must explain why extension, adaptation, or extraction is unsafe;
      what meaning and lifecycle make it distinct; and which future change could justify convergence.
    - If implementation reveals an unplanned reusable or public asset, return to discovery before
      adding it. Do not let the report become decorative paperwork.
14. Reconcile the final diff.
    - Find new files, exports, shared symbols, dependencies, wrappers, and structural clones that were
      absent from the candidate ledger.
    - Compare normalized AST/control-flow/type/call shape when a configured and reliable detector is
      available. Treat semantic or clone scores as candidate evidence, not an automatic verdict.
    - For high-risk or broad shared changes, an independent reviewer should search from the diff and
      requirement with different search axes before seeing the implementer's conclusions when the
      workflow supports that separation.
15. Verify compatibility before broad migration.
    - Characterize existing behavior, including odd defaults, errors, focus or lifecycle behavior,
      concurrency, retry, timeout, partial failure, runtime decoding, and hidden effects.
    - Prefer an adapter, versioned contract, bounded flag, shadow comparison, safe replay, or gradual
      caller migration when reuse changes an existing asset's consumers.
    - Define rollback and removal for replacement or consolidation. Do not call a reuse migration safe
      because compilation or one happy-path test passed.
16. Govern automation and exceptions.
    - Trigger heavy discovery gates only for meaningful surfaces such as new shared/public symbols,
      routes, services, schemas, adapters, repositories, components, hooks, or duplicated structures.
    - Machine-readable discovery artifacts must map candidates and decisions to the actual diff.
      Checkbox-only compliance and mandatory arbitrary candidate counts are invalid gates.
    - Intentional duplication exceptions need owner, reason, scope, compensating evidence, removal or
      convergence condition, and expiry or review date when repository policy supports them.

<!-- mustflow-section: postconditions -->
## Postconditions

- The search covered independent lexical, boundary, test, structure/type, exposure, consumer, and
  history axes as available, with limitations stated.
- Candidate existence, supported exposure, runtime reachability, and reuse compatibility are not
  collapsed into one judgment.
- Every serious candidate has contract, invariant, change-reason, dependency, side-effect, usage,
  test, and lifecycle evidence or a visible evidence gap.
- Every new reusable or public symbol has a discovery-linked justification.
- Reuse, adaptation, extraction, replacement, independent implementation, and rejection remain
  separate outcomes.
- Final diff reconciliation catches discovery-plan drift without forcing unsafe abstraction reuse.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured type, dependency, symbol-index, duplicate-analysis, test, build, package,
or runtime compatibility intent that closes the selected disposition. Search, AST, index, history,
trace, shadow, or replay evidence is valid only when the current host and repository actually expose
an authorized capability for it.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If literal search returns no result, expand the behavior fingerprint and search axes before claiming
  absence.
- If ignored or hidden paths may matter, inspect repository exclusions and broaden only the relevant
  bounded scope; never indiscriminately scan caches, dependencies, outputs, or secrets.
- If AST, symbol-index, call-graph, Git, or runtime tracing is unavailable, mark that axis unavailable
  and calibrate the conclusion. Do not replace missing evidence with model memory.
- If candidates have incompatible authority, privacy, money, data, runtime, or lifecycle invariants,
  prefer separation or a smaller pure extraction over a flag-filled shared abstraction.
- If a candidate was intentionally removed, preserve the rejection reason and do not silently revive it.
- If a discovery artifact and final diff disagree, reopen discovery or remove the unexplained code
  before claiming completion.

<!-- mustflow-section: output-format -->
## Output Format

- Target behavior fingerprint and vocabulary ledger
- Search boundary, dependency direction, exclusions, and tools actually available
- Search coverage by lexical, boundary, test, structural/type, exposure, consumer, and history axis
- Candidate ledger with path, symbol, public or registration path, callers, tests, contract, effects,
  dependencies, lifecycle, matched evidence, disposition, and rejection reason
- Chosen `reuse`, `adapt`, `extract`, `replace`, `independent`, or `reject` decision
- New-code or new-export justification where applicable
- Implementation-plan and final-diff reconciliation
- Compatibility, rollout, rollback, removal, and exception notes where applicable
- Command intents run
- Unavailable or skipped evidence and reasons
- Remaining duplicate, unsafe-reuse, or discovery risk
