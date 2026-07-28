---
mustflow_doc: skill.feature-surface-completeness-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: feature-surface-completeness-review
description: Apply this skill when planning, implementing, reviewing, or reporting a non-trivial feature whose complete repository surface must be inferred from existing sibling features, historical co-changes, control/data/authorization flows, registries, contracts, persistence, failure paths, tests, docs, observability, rollout, rollback, and removal rather than guessed from filenames; also apply when a feature appears to work but may be a partial implementation missing required roles or evidence.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.feature-surface-completeness-review
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

# Feature Surface Completeness Review

<!-- mustflow-section: purpose -->
## Purpose

Infer and verify the complete change surface for a feature from repository evidence, not a generic
folder template. Treat a feature as a state change surrounded by contracts, authority, persistence,
failure, evidence, operations, compatibility, and retirement obligations. Catch implementations
that return a happy-path result while required roles remain absent, disconnected, or unproved.

<!-- mustflow-section: use-when -->
## Use When

- A non-trivial feature, endpoint, command, background job, domain object, state value, field, event,
  integration, UI capability, or scaffold is planned, implemented, or reviewed.
- The agent must identify files or symbols to create, modify, delete, or verify before editing.
- A feature works on the happy path but tests, authorization, registration, read surfaces, migration,
  failure handling, observability, docs, rollout, rollback, or cleanup may be missing.
- A changed type, schema, database field, API contract, enum, event, or generated client may require
  consumers and compatibility surfaces beyond the directly edited node.
- A repository-specific scaffold, feature change manifest, diff-based completeness rule, or
  cross-architecture feature-role model is designed or audited.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is a tiny mechanical edit with an obvious owner and no new behavior, contract, state,
  registry, persistence, authority, or operational surface.
- The task only needs the closest local naming or file-layout precedent; use `pattern-scout`.
- The task primarily needs to discover equivalent or reusable repository assets hidden by different
  names, paths, types, registrations, side effects, or history; use
  `semantic-repository-discovery` before building the complete feature surface.
- The task is only early product or architecture selection with no repository-backed feature plan;
  use `structure-discovery-gate` or `structure-first-engineering`.
- The task is only final completion wording after the feature surface was already established; use
  `completion-evidence-gate`.
- The task is a disposable prototype whose user-approved scope explicitly excludes production
  completeness. Keep the exclusion visible instead of silently applying production requirements.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Executable feature statement: actor, input, preconditions, state read, state change, result,
  duplicate rule, failure rule, follow-up effects, and next observable read.
- Selected repository boundary, nearest instructions, command contract, package or workspace graph,
  and current changed-file evidence.
- Two or more mature sibling features when available, including their control, data, authorization,
  registration, test, documentation, observability, rollout, and removal surfaces.
- Relevant feature-addition commits and later repair commits when history is available and useful;
  use them as evidence, not automatic authority.
- Contract and consumer inventory: static types, runtime schemas, database schema and migrations,
  API or CLI contracts, events, queues, generated code, clients, UI consumers, fixtures, docs, and
  old-data or old-client compatibility.
- Verification inventory: configured test, lint, build, migration, contract, docs, package, release,
  observability, and manual-only checks.
- Existing repository exception or feature-manifest policy, if any.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and the selected repository's command contract have been checked.
- Sibling features are selected by behavioral and lifecycle similarity, not only matching names or
  nearby folders.
- A single sibling is not treated as the architecture specification unless its completeness and
  relevance are independently established.
- Missing repository evidence is recorded as `unclear`, not replaced with a generic framework
  scaffold from model memory.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or revise implementation, registration, contracts, policies, migrations, adapters, consumers,
  tests, docs, observability, rollout, recovery, and cleanup surfaces directly required to close the
  selected feature graph.
- Maintain a working feature ledger or change manifest. Persist it in the repository only when the
  user requests it or an existing repository convention owns that artifact; do not create permanent
  planning files by default.
- Add machine-readable completeness rules only when the repository has stable role detectors,
  bounded exceptions, and tests for both missed defects and false positives.
- Do not require one file per role. One symbol may own several roles and one role may span several
  files if ownership and evidence remain clear.
- Do not expose a partial feature through a public route, command, navigation entry, queue producer,
  or default-enabled flag. A feature flag controls exposure timing; it does not make missing safety,
  tests, or recovery complete.
- Do not manufacture companion-file edits solely to satisfy path-count or changed-directory rules.

<!-- mustflow-section: procedure -->
## Procedure

1. Rewrite the request as an executable feature statement. Name actor, resource, authority,
   validated input, state read, atomic state change, result, duplicate behavior, failure behavior,
   follow-up effects, and where the result becomes observable. If these cannot be stated, route the
   missing decision before guessing files.
2. Classify the feature family: read-only query, local state change, durable write, public contract,
   asynchronous job, external effect, privileged operation, schema evolution, UI-only behavior, or
   a combination. The family controls which roles are required; do not give a read query and a
   payment workflow the same scaffold.
3. Select two or more mature sibling features when possible.
   - Compare their roles and lifecycle, not just filenames.
   - Prefer features that are exercised, documented, operated, and repaired in production-like
     paths over fresh or obviously incomplete examples.
   - Inspect later bug-fix or hardening changes to learn which roles the original implementation
     missed. Do not blindly copy known debt.
4. Build a repository role fingerprint from the siblings and local contracts:
   - ingress and central registration;
   - static type, runtime input validation, public output contract, and mapping;
   - application coordination and domain invariant;
   - authentication, authorization, tenant or resource scope, and revalidation for delayed work;
   - persistence, transaction, constraint, migration, index, cache, and invalidation;
   - external adapters, events, queues, retries, idempotency, dead-letter, and reconciliation;
   - detail, list, search, export, admin, webhook, SDK, UI, backup, and restore consumers;
   - tests, fixtures, docs, logs, traces, metrics, alerts, runbooks, rollout, rollback, cleanup, and
     removal.
   Mark each role `required`, `recommended`, `not_applicable`, or `unclear`, and attach repository
   evidence or an explicit risk reason.
5. Trace three graphs separately.
   - Control flow: entrypoint -> handler -> coordination -> domain -> persistence or provider.
   - Data flow: raw input -> validation -> internal types -> durable representation -> output,
     event, cache, generated client, and consumer.
   - Authorization flow: identity -> policy facts -> resource and tenant scope -> authoritative
     decision -> delayed-work revalidation.
   Use the union of graph nodes and boundary crossings as the candidate change surface.
6. Trace the affected domain value through its lifecycle. Follow create, read, list, search, update,
   cancel, delete, restore, export, audit, cache, event, background processing, cleanup, and removal
   only where the feature semantics make them relevant. New enum or state values require review of
   switches, filters, sorting, aggregation, display, serialization, old consumers, and scheduled
   work.
7. Find activation and registration points. Check route tables, dependency wiring, handler and
   schema registries, feature and permission catalogs, event dispatch, migration indexes, export
   barrels, navigation, localization, generated-code inputs, package manifests, and build inclusion.
   A correct file that no runtime or build can reach is incomplete.
8. Build a pre-edit change ledger. For every `CREATE`, `MODIFY`, `DELETE`, or `VERIFY` path or symbol,
   record role, requirement ID, sibling or graph evidence, upstream caller, downstream dependency,
   contract impact, risk, and verification intent. Mark unsupported guesses `unclear` and investigate
   them before treating the ledger as implementation authority.
9. Check bidirectional traceability.
   - Every requirement maps to at least one implementation or contract surface and one observable
     verification or explicit evidence gap.
   - Every planned edit maps back to a requirement, compatibility need, registration point, or
     verification surface.
   - Every changed public or durable contract identifies current consumers and old-data or
     old-client compatibility.
   Unmapped requirements are omissions; unmapped edits are scope-drift candidates.
10. Lock the feature contract before exposure. Define request and response, actor and resource
    authorization, invariants, state transitions, transaction boundary, duplicate behavior, failure
    states, external effects, cache behavior, observability, rollout, rollback, and removal. Do not
    register the public entrypoint until the required supporting roles are closed or safely dormant.
11. Implement a thin end-to-end behavior slice when code work is requested. Prefer evidence from the
    real ingress through validation, authority, state change, durable result, response, and required
    effect record. Add narrower unit or adapter tests to localize decisions and failures; do not use
    mock-only success as proof that the slice is connected.
12. Audit failure and abuse branches from the feature decision table. Cover invalid input,
    unauthenticated actor, unauthorized actor, cross-tenant resource, absent or deleted resource,
    duplicate and concurrent request, storage conflict, partial failure, timeout or unknown external
    result, retry, cancellation, rollback or compensation, and stale delayed authority as applicable.
13. Audit evidence by behavior, not file presence.
    - A changed test file does not prove the new branch is guarded.
    - A generated schema does not explain authority, side effects, retry, or rollback semantics.
    - A log call does not prove operators can distinguish failure classes or alert on them.
    - A README edit does not prove affected public and operational contracts are documented.
    Use bounded mutation, revert, fault, negative, consumer, or contract evidence when the repository
    exposes a configured intent and the risk justifies it. Do not invent raw mutation commands.
14. Reconcile the actual diff against the pre-edit ledger.
    - Find planned roles not implemented, unplanned public or durable contract changes, changed
      consumers not reviewed, generated or registry drift, and files with no requirement mapping.
    - Re-run graph closure from every changed contract node until all reachable consumers are updated,
      proven unaffected, or explicitly deferred with compatibility evidence.
15. Check rollout and retirement. For schema or contract evolution, include old data, old clients,
    mixed-version deployment, backfill, constraint tightening, rollback after new data, flag defaults,
    disable path, cleanup, and eventual removal. Split work across changes only when each intermediate
    state is operationally closed and does not expose an unsupported contract.
16. Govern exceptions. Use repository policy when it exists. A material exception should name rule
    ID, scope, reason, risk owner, compensating evidence, linked work, and expiry or review condition.
    High-impact authorization, money, privacy, data-loss, or public compatibility obligations must
    not be waived by an unreviewed free-form note.
17. Run the narrowest configured verification that closes each required role, then apply
    `completion-evidence-gate` before claiming the feature complete.

<!-- mustflow-section: postconditions -->
## Postconditions

- The feature is represented as roles and flows rather than a universal file template.
- Required roles come from feature family, sibling evidence, graph boundaries, invariants, and risk;
  optional or unclear roles are not silently promoted to mandatory boilerplate.
- Every requirement, changed contract, planned edit, actual edit, consumer, and verification surface
  is connected or explicitly classified.
- Public exposure, durable mutation, and success claims are not enabled while required authority,
  persistence, failure, evidence, operations, compatibility, or recovery roles remain open.
- Multi-change rollout states remain backward-compatible, dormant, reversible, or explicitly gated.
- Completeness claims distinguish implemented, verified, deferred, unclear, and waived surfaces.

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

Use narrower configured migration, contract, consumer, authorization, observability, mutation,
generated-code, package, or integration intents when they own a required role. Do not infer commands
from package scripts or generic tooling names.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If no mature sibling exists, derive roles from the feature statement, repository boundaries, and
  narrower skills; keep uncertain roles explicit and the first implementation bounded.
- If sibling features disagree, classify common roles separately from feature-family differences and
  known debt. Do not resolve conflict by majority filename count alone.
- If a required role lacks a known owner or configured verification path, stop public exposure and
  report the smallest missing contract or intent rather than adding ceremonial files.
- If the diff contains an unplanned public, schema, migration, permission, data, or operational
  change, reopen the feature ledger before continuing.
- If a companion test or doc changes without proving the affected behavior, keep the role unverified.
- If repository-wide graph or history analysis is unavailable, report the reduced evidence boundary
  and do not claim the inferred scaffold is complete.
- If an exception has no bounded owner, compensation, or review condition, treat the role as open.

<!-- mustflow-section: output-format -->
## Output Format

- Feature statement, family, repository boundary, and sibling evidence
- Role fingerprint with required, recommended, not-applicable, and unclear classifications
- Control, data, authorization, lifecycle, registration, and consumer findings
- Pre-edit change ledger and actual-diff reconciliation
- Requirement-to-code-to-test traceability and unmapped items
- Contract, persistence, failure, observability, docs, rollout, rollback, and removal decisions
- Exceptions, owners, compensation, and review conditions
- Files changed and compatibility impact
- Command intents run and skipped checks
- Completion classification and remaining feature-surface risk
