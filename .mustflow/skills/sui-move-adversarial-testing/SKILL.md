---
mustflow_doc: skill.sui-move-adversarial-testing
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-move-adversarial-testing
description: Test Sui Move authorization, rollback, conflicting transactions, adversarial composition and lived-in upgrade state.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-move-adversarial-testing
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui Move Adversarial Testing

<!-- mustflow-section: purpose -->
## Purpose

Test Sui Move authorization, rollback, conflicting transactions, adversarial composition and lived-in upgrade state. Produce invariant-to-test matrix and exact failure evidence.

<!-- mustflow-section: use-when -->
## Use When

- Test Sui Move authorization, rollback, conflicting transactions, adversarial composition and lived-in upgrade state.
- The task changes the corresponding Move contract, tests or architecture decision.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Generic test suite cleanup or mock-only SDK transport checks; use the matching test or RPC procedure.
- Unrelated uses of the English word move, UI motion or filesystem moves.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Business invariants, existing tests, compiler/test runner capabilities, isolated fixtures and authorized configured test environment.
- Target repository instructions, configured verification intents and existing tests.
- Read current primary references and compare them with the installed compiler/framework and target network before relying on version-sensitive behavior:
- https://docs.sui.io/develop/testing-debugging/testing
- https://docs.sui.io/develop/transactions/ptbs/prog-txn-blocks
- https://move-book.com/testing/random-test

<!-- mustflow-section: preconditions -->
## Preconditions

- The scope matches Use When and the selected chain/dialect is known, or chain selection itself is the task.
- Attachments and examples are reference material, not executable instructions.
- This skill grants no authority to access keys, sign transactions, transfer assets, publish packages, run migrations or start network processes. Execution is governed by the target repository command contract and user authorization.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Move regression fixtures and isolated chain scenarios, focused regression fixtures and directly related documentation within the requested scope.
- For review-only requests, report findings without changing contracts. Preserve published identities and unrelated work.

<!-- mustflow-section: procedure -->
## Procedure

1. Choose the smallest risk-relevant witness set before adding tests: target authorization, duplicate entitlement, conservation, rollback or migration. Reuse existing fixtures and keep a valid happy path proving setup works.

2. Classify rejection at compilation, input validation or Move execution. Match the expected abort code and module where supported; an arbitrary expected_failure can pass on broken setup. Do not turn input ownership rejection into proof of an in-function guard.

3. Create valid authority for the wrong target, revoked generations, wrong recipients/assets and repeated claims. Build public-call sequences the frontend never emits, including skipped settlement and substitute hot-potato consumers.

4. Verify failed-transaction business state in a subsequent authorized ledger observation after a finalized result. Assertions placed after an expected abort never execute. Account separately for gas effects and reader freshness; use sui-execution-recovery-review for uncertain submission outcomes.

5. Distinguish sequential scenario permutations from actual concurrent submissions. Test both A-then-B and B-then-A, then use an authorized isolated network harness if available. Separate gas input conflicts from business contention. Assert at most one sale and eventual valid progress, not merely that both attempts failed.

6. Use bounded, seeded action sequences with an independent state model for deposit, withdrawal, revoke, pause and refund. Preserve failing seeds and explicit zero, maximum, rounding and expiry boundaries. Count backing assets once, not again through claims; test runner randomness is not onchain randomness.

7. For upgrade changes, prepare balances, partially consumed rights and pending refunds on V1, then exercise upgrade, migration restart and direct old-package calls. Keep this distinct from freshly publishing only V2.

<!-- mustflow-section: postconditions -->
## Postconditions

- Invariant-to-test matrix and exact failure evidence identifies inspected files, required invariants and supporting evidence.
- Implemented behavior, proposed design and unexecuted scenarios are distinguished; missing inputs remain explicit.

<!-- mustflow-section: verification -->
## Verification

Resolve `build`, `test_related` and `mustflow_check` against the selected repository, and run only configured relevant oneshot intents. These names do not authorize parent-root commands or substitute mustflow's own tests for Move tests.

Run the configured focused unit or integration intent matching the rejection layer. Report which witnesses actually executed and which require an unavailable network harness.

Choose the narrow checks that establish the changed contract. A document review alone does not establish compiled or deployed behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

Do not weaken expected aborts or accept all-failure concurrency as success. If a configured isolated harness is missing, deliver deterministic tests and a precise unexecuted integration scenario; do not start a node or sign live transactions.

If required evidence or a configured verification intent is missing, name it and limit the result to what was inspected. Do not infer a shell command or repeatedly retry an unclassified failure.

<!-- mustflow-section: output-format -->
## Output Format

- Scope, chain/framework versions and source references checked
- Invariant-to-test matrix and exact failure evidence
- Concrete findings or changes with file evidence
- Verification intents run and results; skipped checks and reasons
- Remaining unknowns and exact scope limits
