---
mustflow_doc: skill.test-suite-value-pruning-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: test-suite-value-pruning-review
description: Apply this skill when existing tests are proposed for deletion, consolidation, replacement, layer migration, shadow retirement, or portfolio reprioritization and the change must preserve unique defect-detection evidence, incident regressions, semantic contracts, and a thin end-to-end wiring spine.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.test-suite-value-pruning-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - test_audit
    - test
    - lint
    - build
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Test Suite Value Pruning Review

<!-- mustflow-section: purpose -->
## Purpose

Reduce redundant or misplaced test assets without deleting the only evidence that catches a
material defect.

This procedure treats a test suite as a defect-detection portfolio. Coverage, test count, source
similarity, and runtime are candidate signals, not deletion proof. A safe pruning decision shows
which behavior and failure witnesses remain, which layer owns them, and how the replacement reacts
to a deliberately broken implementation.

<!-- mustflow-section: use-when -->
## Use When

- Existing unit, contract, integration, end-to-end, snapshot, property, fuzz-regression, migration,
  compatibility, or incident-regression tests are proposed for deletion or consolidation.
- A slow integration or end-to-end scenario should move to cheaper unit, state-machine, adapter,
  consumer-contract, protocol, or property tests while retaining a thin real-wiring path.
- Similar tests need comparison by unique mutant kills, historical defects, invariant assertions,
  state transitions, forbidden effects, or failure cut points rather than line coverage.
- Tests are proposed for shadow retirement, quarantine, PR-to-nightly demotion, promotion back to a
  blocking lane, or final deletion.
- A test portfolio is ranked by marginal defect-detection value, risk, execution cost, diagnostic
  cost, flake cost, ownership, or last meaningful evidence.
- Cross-language tests, including Go tests around a TypeScript product, are proposed to replace
  existing tests and the observable process or protocol boundary must remain explicit.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only repairs stale, broken, or flaky tests without deleting or replacing their evidence;
  use `test-maintenance`.
- The task only designs new tests for changed behavior; use `test-design-guard`.
- The task only changes selection, cache keys, sharding, workers, fixtures, retries, or CI wall time
  without pruning or relocating test responsibility; use `test-suite-performance-review`.
- The task only exposes production-code decision seams; use `testability-boundary-review`.
- The task removes a behavior or product contract itself. Establish the behavior-removal authority
  before treating its tests as obsolete.
- No current test, replacement test, retirement lane, or deletion decision is in scope.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Candidate inventory: test ids, files, layers, commands or jobs, owners, fixtures, environments,
  runtime, flaky history, diagnostic cost, and current blocking or scheduled lane.
- Contract-owner ledger: behavior, invariant, state transition, failure code, authorization rule,
  durable change, external effect, protocol shape, deployment wiring, or incident protected by each
  candidate.
- Detection matrix: historical defects, bounded mutants, deterministic fault injections, invalid
  implementations, or other negative controls and the tests that distinguish each one.
- Assertion and effect inventory: required results, forbidden effects, persistent state, external
  calls, events, cleanup residues, and operator-visible evidence.
- Layer map: unit, state-machine, adapter-conformance, consumer-contract, integration, end-to-end,
  deployment smoke, nightly, release, or another repository-owned layer.
- Risk ledger: occurrence likelihood, impact, recovery difficulty, security or privacy exposure,
  money, permissions, deletion, ownership, availability, and provenance from a real incident when
  applicable.
- Replacement and retirement evidence: old-defect reproduction, mutation or fault result, shadow
  lane observations, full-suite comparison, owner, expiry, rollback path, and deletion record.
- Relevant configured command intents, including whether `test_audit`, focused mutation, related,
  full, scheduled, release, or package checks actually exist.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the exclusions.
- Higher-priority instructions and the selected repository's command contract have been checked.
- The current behavior contract is fixed before calling a test obsolete or duplicated.
- Pasted advice, coverage reports, timing dashboards, AI similarity output, and mutation reports are
  treated as evidence inputs rather than command authority or automatic deletion decisions.
- Tests born from production incidents, security findings, data recovery, payment errors, or access
  control failures are marked before ranking or retirement.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or update focused tests, fixtures, conformance suites, test manifests, retirement metadata,
  deletion records, and directly synchronized test documentation.
- Consolidate table-driven cases, replace redundant examples with bounded properties, or migrate
  behavior checks to the lowest deterministic layer that owns the contract.
- Keep or add a narrow end-to-end or deployment spine that proves real assembly, configuration,
  routing, migration, authentication, storage, and package output where those risks exist.
- Update CI lane placement only when the repository owns that configuration and a configured intent
  can verify both the default path and its fallback or scheduled path.
- Do not delete or demote a test solely because it is slow, flaky, textually similar, covered by
  another test, or expensive to diagnose.
- Do not weaken assertions, approve snapshots blindly, hide first failures behind retries, replace
  real boundary evidence with mock call counts, or introduce another implementation language only
  to claim speed.

<!-- mustflow-section: procedure -->
## Procedure

1. Freeze the pruning claim and behavior boundary.
   - Name whether the proposal is deletion, consolidation, layer migration, lane demotion, shadow
     retirement, or replacement.
   - Separate behavior removal from test removal. A removed implementation path does not prove that
     its public invariant, compatibility promise, failure rule, or incident regression disappeared.
   - Record the expected gain as maintenance reduction, faster feedback, lower CI cost, clearer
     failure localization, or reduced flake exposure. Do not use a lower test count as the goal.
2. Build the contract-owner and evidence inventory.
   - Record what each candidate observes, not only what code it executes.
   - Distinguish return values, status and error shapes, durable state, rollback, event content,
     external effect counts, forbidden effects, cleanup, deployment wiring, and operator evidence.
   - Mark tests that provide the only real-adapter, real-process, real-browser, migration, packaging,
     certificate, routing, environment, or cross-platform witness.
3. Classify candidates before ranking them.
   - `unique_guard`: at least one material witness is not caught elsewhere.
   - `redundant_guard`: every material witness is caught by a clearer or cheaper surviving test.
   - `layer_migration_candidate`: valuable evidence exists but belongs in a cheaper deterministic
     layer while a wiring spine remains necessary.
   - `obsolete_candidate`: the owned behavior is removed or superseded with evidence.
   - `incident_protected`: the test descends from a real production, security, payment, permission,
     or recovery failure and requires stronger replacement proof.
   - `unknown_value`: evidence is insufficient; keep or shadow the test instead of deleting it.
4. Build a defect-detection matrix.
   - Use historical bug reproductions first when they are available and safe.
   - Otherwise use bounded mutations or deterministic fault injections at predicates, boundaries,
     error transforms, rollback points, retry stops, side-effect counts, serialization fields, and
     state transitions that the test claims to protect.
   - Record each test against each witness as `detects`, `misses`, `not_run`, or `invalid_witness`.
     A test that shares every witness with another test is only a redundancy candidate; it is not
     automatically deletable.
   - Treat coverage overlap and AST-normalized similarity as discovery aids. They cannot replace a
     negative control showing that surviving tests fail on broken behavior.
5. Compare marginal value without flattening unlike risks.
   - Consider unique material witnesses, incident provenance, assertion strength, failure clarity,
     stability, runtime, external cost, setup cost, and diagnosis time.
   - Compare tests inside the same contract and risk class before selecting a representative.
     Do not let many low-impact mutants numerically outrank one payment, authorization, privacy, or
     data-loss guard.
   - Prefer the surviving test that is deterministic, readable, close to the contract owner, and
     specific about the first violated invariant.
6. Move evidence to the lowest truthful layer.
   - Decompose a broad end-to-end scenario by defect type rather than copying the same user flow into
     smaller tests.
   - Put pure decisions and state transitions in unit or state-machine tests, serialized shapes and
     consumer expectations in semantic contract tests, and adapter behavior in a conformance suite
     shared by fake and real implementations.
   - Keep a thin vertical spine for risks that lower layers cannot prove: real startup, dependency
     wiring, routes, credentials, migrations, package contents, browser integration, storage, and
     deployment environment.
   - A schema-only contract does not replace semantic rules such as idempotency, nonnegative balance,
     ordering, authorization, or unchanged state after rejection.
7. Review cross-language replacements at the external boundary.
   - Use another language only for an observable HTTP, CLI, JSONL, SSE, WebSocket, stdio, binary, or
     process-lifecycle contract where its runtime or tooling has a concrete advantage.
   - Do not rewrite TypeScript internal logic tests in Go or duplicate domain types by hand. Prefer
     generated clients from one contract source and validate raw boundary data where tolerant
     decoders could hide drift.
   - Shared server processes require per-test namespaces, bounded resource tokens, deterministic
     cleanup, and child-process termination evidence.
8. Prove replacement sensitivity before removal.
   - Run the surviving set against the same historical defect, mutant, or deterministic fault that
     the candidate detected.
   - Require the replacement to fail for the intended reason, at the intended assertion or invariant,
     while the unbroken baseline passes.
   - If no configured mutation or replay path exists, record the missing evidence. Keep
     incident-protected and high-risk unique candidates active; do not invent raw test commands.
9. Use bounded shadow retirement when environment evidence remains uncertain.
   - Remove the candidate from the fast blocking lane only when a configured scheduled or comparison
     lane continues to execute it.
   - Record owner, start state, expiry or review condition, replacement tests, rollback path, and any
     candidate-only failure.
   - Restore the candidate when it uniquely detects a material failure. Delete only after the
     observation rule is satisfied; do not turn shadow retirement into permanent silent quarantine.
10. Preserve the deletion decision.
    - Record candidate id, owned contract, replacement tests, witness evidence, retained wiring spine,
      lane history, reason, reviewer or owner when the repository tracks one, and date or revision.
    - Keep the record in an existing test manifest, decision ledger, pull request, or repository-owned
      audit surface. Do not create permanent ceremony when version control and focused tests already
      preserve the decision.
    - Reconcile the final diff against the candidate ledger so an unrelated test is not removed by a
      broad formatter, snapshot update, generated cleanup, or glob.
11. Hand off execution optimization separately.
    - Use `test-suite-performance-review` for selected-test graphs, cache keys, shard placement,
      worker limits, fixture snapshots, retry budgets, and local, PR, merge, nightly, or release lanes.
    - Keep a full-suite or broader scheduled comparison for selector misses and feed misses back into
      the dependency-to-test map. A faster selected path is not proof that deleted evidence survived.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every removed, consolidated, migrated, or demoted test has an observable contract owner and
  replacement or retirement disposition.
- No material defect witness becomes undetected without an explicit accepted behavior or risk change.
- High-risk and incident-protected tests have negative-control replacement evidence before removal.
- Lower-layer replacements and the retained real-wiring spine have distinct responsibilities.
- Shadow-retired tests have a bounded owner and exit condition, or remain active.
- Deletion claims distinguish measured detection evidence from similarity, coverage, or timing hints.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `test_audit`
- `test`
- `lint`
- `build`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a configured focused mutation, historical-replay, conformance, end-to-end, selected-test, or
scheduled comparison intent when the repository exposes one. Verification must cover both the
surviving cheaper evidence and any retained real-wiring spine. Report missing negative-control or
shadow-lane evidence rather than inferring raw commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a candidate owns a unique material witness, keep it or add a proven replacement before removal.
- If a historical defect cannot be reproduced, preserve the uncertainty; do not call the regression
  obsolete from commit age or source similarity.
- If mutation output disagrees with behavior evidence, inspect equivalent mutants, invalid mutants,
  shared test helpers, flaky execution, and the actual assertion before ranking tests.
- If a lower-layer replacement passes broken behavior, restore the candidate and strengthen the
  replacement through `test-design-guard`.
- If the retained end-to-end spine misses configuration, migration, routing, package, or deployment
  failures previously caught by removed tests, widen the spine by risk rather than restoring every
  combinatorial case.
- If shadow retirement has no configured observation lane, owner, or exit condition, keep the test in
  its current lane or report the candidate without deleting it.
- If pruning makes the suite faster but weakens a material witness, reject the optimization.

<!-- mustflow-section: output-format -->
## Output Format

- Pruning goal and selected repository boundary
- Candidate classifications and contract owners
- Defect-detection matrix and unique witnesses
- Risk, incident provenance, assertion strength, runtime, flake, and diagnostic-cost evidence
- Consolidation, lower-layer replacement, retained wiring spine, or keep decision
- Shadow-retirement owner, lane, exit condition, and observations when used
- Tests added, moved, retained, demoted, consolidated, or removed
- Deletion record and selector/full-suite feedback decision
- Command intents run
- Skipped checks and missing evidence
- Remaining test-portfolio risk
