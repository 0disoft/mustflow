---
mustflow_doc: skill.vertical-slice-tdd
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: vertical-slice-tdd
description: Apply this skill when the user explicitly requests TDD, test-first work, red-green-refactor, or one behavior slice at a time.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.vertical-slice-tdd
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - test_audit
    - test
    - lint
    - build
    - mustflow_check
---

# Vertical Slice TDD

<!-- mustflow-section: purpose -->
## Purpose

Support explicit test-driven development without making test-first work mandatory for every mustflow task.

This skill keeps TDD work in one vertical behavior slice at a time: choose the next test by risk and evidence value, prove one observable contract, attack the test for false-green weakness, implement only enough behavior to pass, and only then refactor inside the covered slice.

<!-- mustflow-section: use-when -->
## Use When

- The user asks for TDD, test-first, red-green-refactor, RED/GREEN, or one behavior slice at a time.
- A feature is naturally delivered as a sequence of small observable behavior contracts.
- The task needs repeated RED/GREEN evidence across multiple behavior slices.
- A larger change is risky enough that the user or repository context asks for incremental test-first checkpoints.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The user asks for a quick patch and does not request TDD or incremental slices.
- The task only designs or reviews test quality without a test-first implementation loop; use `test-design-guard`.
- Existing tests are only being updated, removed, audited, or classified as stale; use `test-maintenance`.
- A bug fix starts before a deterministic reproduction exists; use `repro-first-debug`.
- The change is documentation-only, configuration-only, or analysis-only with no behavior implementation.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User request or issue evidence that makes TDD or slice-by-slice work appropriate.
- The observable behavior contract for the first slice.
- A short test list or risk list, ordered by which test would expose the most important uncertainty next.
- Existing tests, fixtures, and helpers near that behavior.
- The expected RED category and baseline status before implementation.
- Relevant command-intent contract entries for the narrowest verification path.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- TDD is explicitly requested or clearly accepted by the user for this task.
- Existing coverage has been searched before adding a new test.
- `test-design-guard` is used for RED validity, test shape selection, assertion quality, and speculative edge-case filtering when a test is added or changed.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or adjust one focused test, fixture, or helper for the current slice.
- Change implementation code only enough to satisfy the current behavior contract.
- Refactor code only inside the behavior already protected by the current slice.
- Update directly synchronized docs only when they clarify the behavior contract being tested.
- Do not weaken assertions, update snapshots, skip tests, broaden command permission, or add unrelated cleanup to make the slice pass.

<!-- mustflow-section: procedure -->
## Procedure

1. Select the next evidence-bearing slice.
   - Name the user-visible or public behavior.
   - Define the smallest input, action, and observable output that prove the slice.
   - Prefer the test that would reveal the riskiest unknown, boundary, integration contract, or regression path, not merely the easiest happy path.
   - Treat Red-Green-Refactor as the inner loop, not the whole method. Do not start adding tests before choosing why this test is the next useful evidence.
   - Keep cross-cutting infrastructure, broad refactors, and speculative future cases outside the slice.
2. Find existing coverage.
   - Prefer extending a nearby existing test when it already owns the behavior surface.
   - Avoid creating a new file when a focused case in an existing file is clearer.
   - If no suitable test surface exists, document why the new test belongs where it is added.
3. Add or adjust one focused test case.
   - Use `test-design-guard` to select the test shape and assertion.
   - Assert observable behavior such as a return value, exit code, output, file effect, state transition, schema result, or error shape.
   - Keep mocks supportive rather than the only behavior evidence, unless the interaction itself is the public contract.
4. Attack the test before trusting it.
   - Ask what bug could still pass this test. Strengthen the assertion when the answer is concrete and in scope.
   - Prefer property, contract, approval, integration, or mutation-style evidence only when `test-design-guard` shows that shape fits the contract and stays bounded.
   - For legacy code, use characterization or approval-style evidence to freeze current behavior before refactoring when the intended behavior is not yet trusted.
   - For API or service boundaries, prefer consumer, schema, or contract evidence over mocks of the provider's imagined behavior.
   - If implementation was AI-assisted, check that generated code did not outrun the selected test by adding untested branches, features, or public behavior.
5. Classify the RED result before implementation.
   - `behavior_red` is the only valid behavior RED.
   - `api_scaffold_red` may be reported only for an explicitly new public API scaffold and must not be counted as behavior coverage.
   - `invalid_red` includes setup failures, wrong imports, missing unrelated symbols, runner failures, fixture failures, syntax or type errors, bad mocks, missing awaits, environment failures, and unrelated baseline failures.
   - If RED is invalid, fix the test setup or report the invalid evidence before changing implementation behavior.
6. Implement the smallest behavior change.
   - Change only the code needed for the current observable contract.
   - Preserve existing public behavior outside the slice.
   - Avoid introducing abstractions unless they directly reduce complexity in the current slice.
   - Do not accept a broad AI-generated implementation just because the narrow test turned green; trim or defer unproven behavior.
7. Verify GREEN with the narrowest configured command intent.
   - Start with the intent that covers the changed test and implementation surface.
   - Escalate only when the slice crosses public surfaces, package or template contracts, or the related selector cannot cover the changed files.
   - Keep command evidence separate from RED evidence and implementation notes.
8. Refactor only after GREEN.
   - Limit refactoring to code covered by the slice.
   - Re-run the same configured verification intent after behavior-preserving cleanup when the refactor is non-trivial.
9. Decide whether to continue.
   - Repeat only when the next slice is clearly in scope.
   - Reorder the remaining test list when new evidence changes the highest-risk unknown.
   - Stop and report deferred slices when the remaining work is broader than the user request or needs a new decision.

<!-- mustflow-section: postconditions -->
## Postconditions

- Each completed slice has a named behavior contract, RED category, implementation summary, and GREEN verification evidence.
- Each completed slice records why that test was chosen next and how false-green risk was checked.
- Invalid RED and scaffold-only RED are not reported as behavior coverage.
- Deferred slices, rejected speculative cases, skipped checks, and remaining risks are explicit.
- No command execution claim relies on anything outside the configured command intents.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `test_related`
- `test_audit`
- `test`
- `lint`
- `build`
- `mustflow_check`

Prefer the narrowest configured intent that proves the current slice. Escalate only when the changed surface or verification objective requires it.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If RED is invalid, correct the setup or report why implementation should not proceed from that evidence.
- If GREEN fails outside the current slice, separate baseline failure from slice failure before changing more code.
- If the implementation requires a broad refactor before the first slice can pass, stop and reassess the slice boundary.
- If the user asks to continue beyond the planned slices, restate the next behavior contract before adding another test.
- If verification fails after refactoring, use `failure-triage` before making additional behavior changes.

<!-- mustflow-section: output-format -->
## Output Format

- TDD trigger and slice scope
- Next-test selection rationale
- Existing coverage reused
- Slices completed
- Slices deferred
- Cases rejected as duplicate or speculative
- False-green checks and test-strength limits
- RED Evidence:
  - category: `behavior_red`, `api_scaffold_red`, `invalid_red`, or `not_applicable`
  - command intent
  - failing test
  - failing line or assertion
  - expected
  - actual
  - why this proves the intended contract
  - baseline status
  - invalid or setup failures separated
- GREEN verification:
  - command intents run
  - passing tests or checks
  - skipped checks and reasons
- Refactors performed after GREEN
- Remaining TDD or regression risk
