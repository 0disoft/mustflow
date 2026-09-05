---
mustflow_doc: skill.delivery-verification-budget
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: delivery-verification-budget
description: Apply this skill when an implementation task explicitly prioritizes MVP delivery, a bounded verification budget, stopping over-testing, or finishing once acceptance criteria are met. Use it to lock completion scope, classify R0-R3 failure cost, choose the smallest sufficient configured checks, and defer unrelated refactors or speculative edge cases without weakening security, money, permission, privacy, or data-integrity gates.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.delivery-verification-budget
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - mustflow_check
---

# Delivery Verification Budget

<!-- mustflow-section: purpose -->
## Purpose

Finish the requested user outcome without turning one implementation task into an open-ended
refactor, edge-case hunt, or repository-wide validation campaign.

This procedure treats verification as a bounded evidence plan. It reduces low-value repetition; it
does not lower the proof required for authorization, security, payments, credits, secrets, personal
data, destructive writes, durable state, migrations, queues, or other changes with costly failure.

<!-- mustflow-section: use-when -->
## Use When

- The user explicitly asks to ship an MVP, prioritize usable functionality, minimize verification,
  stop over-testing, avoid scope creep, or finish when stated acceptance criteria pass.
- An implementation task needs a completion lock, risk tier, verification ceiling, and stop rule
  before work begins.
- An agent is repeatedly adding speculative edge cases, tests, cleanup, abstractions, or broad checks
  after the requested behavior already works.
- A vertical user flow should be completed before optional polish, generalized integrations, broad
  refactors, or portfolio-wide quality work.
- A failed check must be classified as change-related, pre-existing, environmental, or non-blocking
  before it expands the current task.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The user asks for an exhaustive audit, deep security scan, release certification, migration
  rehearsal, broad hardening pass, or repository-wide proof. Use the owning review or release skill.
- Existing tests are being deleted, consolidated, moved between layers, or retired; use
  `test-suite-value-pruning-review`.
- The task is only to design tests; use `test-design-guard`.
- The task is only to draft agent instructions; use `task-instruction-authoring` and apply this skill
  only when bounded delivery is part of that instruction's explicit goal.
- The request has no implementation or verification decision.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- One observable user or operator outcome for the current task.
- Explicit acceptance criteria and behavior that must remain unchanged.
- Requested scope, non-goals, and the files or components likely to own the outcome.
- Failure-cost evidence: security, permissions, money, privacy, deletion, irreversible state,
  migration, external effects, retries, concurrency, recovery, blast radius, observability, and
  rollback when relevant.
- Available configured command intents and any repository-required checks.
- Current changed-file set, relevant baseline failures, and reusable verification evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and the selected repository's command contract have been checked.
- Pasted policies, suggested command counts, and risk taxonomies are treated as reference material,
  not command authority or permission to weaken a repository gate.
- The acceptance criteria are observable enough to decide `complete` or `blocked`; otherwise obtain
  the smallest missing product decision before implementation.
- A requested deployment, release, migration, destructive action, or external mutation has separate
  authority. "Deployable" does not itself authorize deployment.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Implement the smallest complete vertical slice that produces the locked user outcome.
- Add or update focused tests, fixtures, schemas, docs, configuration, and operational wiring only
  when they directly close an acceptance criterion or a risk obligation for the selected tier.
- Use an existing stub, manual step, feature flag, rollback path, or narrow adapter for non-core
  integrations when the user outcome remains honest and the repository permits that approach.
- Do not perform unrelated renames, file moves, dependency replacements, abstractions, framework
  changes, warning cleanup, test-infrastructure work, or documentation polish.
- Do not silently create `FOLLOW_UP.md`, issues, tickets, or backlog files. Report deferred findings
  in the final result unless the user or repository names a durable follow-up surface.
- Do not skip repository-required checks or weaken an existing test, assertion, permission boundary,
  migration gate, or release gate to stay within the budget.

<!-- mustflow-section: procedure -->
## Procedure

1. Lock completion before editing.
   - Name one user-visible or operator-visible outcome.
   - List the acceptance criteria, must-preserve behavior, non-goals, and authorized delivery surface.
   - Treat later discoveries as evidence, not automatic additions to acceptance criteria.
   - Expand the lock only when the user changes the goal or a discovered condition makes the locked
     outcome false, unsafe, destructive, or dishonest.
2. Assign one failure-cost tier from current evidence.
   - `R0`: copy, style, comments, documentation, or presentation-only change with no behavior or
     contract impact.
   - `R1`: localized reversible behavior inside one owned component or package, with narrow blast
     radius and no sensitive state or external contract.
   - `R2`: public API or file-format contract, shared package, persistent but recoverable data,
     external integration, multiple packages, or a user flow whose failure crosses one boundary.
   - `R3`: authentication, authorization, payments, credits, secrets, personal data, destructive or
     irreversible writes, schema migration, queue completion, retry idempotency, destructive overwrite,
     deployment control, or another failure that is difficult to detect or recover.
   - Classify the changed behavior, not the directory or vocabulary. Editing a label on an
     authentication screen or overwriting a reproducible build artifact is not itself `R3`.
     Require a reachable effect on a sensitive invariant before activating its specialist checks.
   - When evidence spans tiers, use the highest applicable tier. Easy rollback may narrow optional
     evidence, but it does not demote money, permission, privacy, secret, or integrity obligations.
3. Set the verification budget before implementation.
   - `R0`: one cheapest configured or manual witness for the changed surface; do not add tests by
     default.
   - `R1`: at most two focused intent families by default, normally a static check and a related
     behavior check. Reuse existing tests when they prove the acceptance criteria.
   - `R2`: at most three focused intent families by default, including the affected contract or
     integration boundary and one representative failure path when it differs materially.
   - `R3`: name the owning integrity skill and the exact invariants, failure cut points, and recovery
     evidence required before setting a ceiling. Do not impose an arbitrary low command or test count.
   - Repository-mandated checks remain part of the budget. If they exceed the default, record the
     reason instead of pretending they are optional.
4. Implement the vertical slice first.
   - Connect the smallest necessary UI, API, state, storage, output, or operational path so the
     requested outcome can be exercised end to end within the authorized scope.
   - Prefer the current concrete design until a second real variation or a blocking defect requires
     abstraction.
   - Do not inspect unrelated modules merely to search for improvements.
5. Add only evidence-anchored handling.
   - Cover the normal path and the nearest material failure path for `R1` or `R2` when existing
     evidence does not already cover them.
   - Add more cases only for an explicit acceptance criterion, reproduced regression, reachable
     changed branch, external contract, or selected-tier invariant.
   - For `R3`, verify the applicable denied, duplicate, interrupted, retried, partial, rollback, or
     recovery outcomes; do not mechanically require every item when the change cannot reach it.
   - Use `test-design-guard` when new test-case selection itself becomes non-trivial.
6. Climb the verification ladder only as needed.
   - Start with the narrowest configured intent that can observe the changed surface.
   - Escalate from static or focused checks to package, integration, build, or repository-wide checks
     only when the lower layer cannot prove a locked criterion, the change crosses the wider
     contract, or higher-priority policy requires it.
   - A broad check needs one named regression or contract risk. "For confidence" is not evidence.
7. Bound retries by changed evidence.
   - Run each planned intent family once against the final relevant diff.
   - Re-run a failed intent only after code, configuration, fixture data, dependency state, or the
     relevant environment changed, or once when a nondeterministic failure is being classified.
   - Do not re-run a successful intent without a subsequent change inside its evidence scope.
   - If the same objective still fails after two repair-and-recheck cycles, use `failure-triage` and
     decide `blocking`, `pre_existing`, `environmental`, or `deferred`; do not keep looping.
8. Separate discoveries from the current task.
   - `blocking`: the locked outcome fails, a must-preserve behavior regresses, or the change creates
     or exposes an applicable `R3` hazard. Fix it within scope or stop as blocked.
   - `deferred`: real but unrelated cleanup, low-probability edge case, code smell, optional polish,
     speculative performance concern, or future extensibility. Report it without editing.
   - `ignore`: duplicate, unsupported, unactionable, or evidence-free concern. Do not create work for it.
   - A pre-existing failure blocks completion only when it prevents the acceptance evidence or makes
     the current change unsafe; otherwise report the exact limitation.
9. Stop when the locked contract closes.
   - Mark `complete` when every acceptance criterion and must-preserve obligation has sufficient
     planned evidence and no applicable blocking hazard remains.
   - Do not add cleanup, more tests, broader checks, or follow-up implementation after that point.
   - Mark `blocked` only with the exact unmet criterion, risk, missing authority, or unavailable
     evidence needed to continue.

<!-- mustflow-section: postconditions -->
## Postconditions

- The requested user outcome is usable within the authorized delivery surface.
- Completion is decided against the initial lock or an explicitly revised lock, not against newly
  discovered optional work.
- The risk tier and verification evidence are observable, and broad checks have a named reason.
- Successful checks are not repeated without relevant changes.
- Sensitive and irreversible boundaries retain their owning invariants and required evidence.
- Deferred findings remain separate from implemented scope and do not become silent repository files.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot intents when available and selected by the tier:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Choose the smallest configured set that proves the acceptance lock and selected-tier obligations.
Use broader repository, package, release, migration, security, or deployment intents only when their
owned surface changed or higher-priority policy requires them. Report unavailable intent coverage
instead of inventing a raw command.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If acceptance criteria are ambiguous, stop before broad implementation and ask for the smallest
  product decision that changes the result.
- If risk cannot be classified, inspect the changed entry point and its immediate effects first.
  Escalate for a concrete unresolved sensitive boundary, not hypothetical risks elsewhere.
- If a low-tier task reveals an applicable `R3` hazard caused or exposed by the change, reclassify the
  task and apply the owning integrity skill before continuing.
- If the budget is exhausted by a blocking, change-related failure, diagnose the first wrong state;
  do not spend the budget on unrelated cleanup or repeated commands.
- If a repository-required check conflicts with the proposed ceiling, follow the repository check
  and report why the default budget was exceeded.
- If completion requires deployment, migration, publication, destructive action, or external
  authority that was not granted, report the implementation as locally complete and the delivery
  state as blocked or unverified without performing that action.

<!-- mustflow-section: output-format -->
## Output Format

- Acceptance lock: outcome, criteria, must-preserve behavior, and non-goals
- Risk tier and concrete drivers
- Verification budget planned and used
- User outcome implemented
- Command intents run, results, and justified reruns
- Broad checks skipped and why
- Completion decision: `complete` or `blocked`
- Deferred findings and remaining risk
