---
mustflow_doc: skill.test-maintenance
locale: en
canonical: true
revision: 5
lifecycle: mustflow-owned
authority: procedure
name: test-maintenance
description: Apply this skill when adding, updating, removing, or auditing tests in response to changes to behavior, APIs, snapshots, compatibility, or bug fixes.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.test-maintenance
  command_intents:
    - test
    - test_related
    - test_audit
    - snapshot_update
    - lint
    - build
---

# Test Maintenance

<!-- mustflow-section: purpose -->
## Purpose

Keep tests aligned with the current behavior contract.

<!-- mustflow-section: use-when -->
## Use When

- Behavior is added, changed, removed, or deprecated.
- A bug fix needs a regression test.
- Existing tests may be stale, duplicated, too broad, or tied to removed implementation details.
- Snapshot output has changed.
- Test execution moves between subprocess execution, in-process helpers, grouped runners, or scheduler-managed waves.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes prose or comments.
- The repository lacks a configured test intent and the user has requested not to add tests.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User request
- Current behavior contract
- Changed or removed code path
- Existing test style
- Isolation model for the affected tests, including whether they share a Node process, working directory adapter, environment variables, or build output
- `.mustflow/config/commands.toml`
- `.mustflow/config/mustflow.toml` `[testing]`

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep edits within the scope described by this skill, the user request, and the matching route in `.mustflow/skills/INDEX.md`.
- Do not broaden command permission, invent project facts, or change unrelated workflow files.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the expected current behavior.
2. Search for existing tests before introducing new ones.
3. Classify affected tests:
   - `active`: still validates current behavior
   - `update_needed`: behavior changed
   - `obsolete_candidate`: likely validates removed or irrelevant behavior
   - `legacy_contract`: old behavior is intentionally preserved
   - `flaky_or_environmental`: failure may depend on environment
4. Add, update, remove, or report tests according to the classification.
5. For `flaky_or_environmental` tests, do not delete or weaken assertions immediately. First classify the unstable factor:
   - timing, ordering, or scheduler grouping;
   - filesystem cleanup, lock files, or generated output;
   - shared process state or environment variables;
   - platform-specific path, shell, locale, or line-ending behavior;
   - external tool availability or version drift.
6. For flaky tests, prefer isolation, deterministic fixtures, explicit waiting, runner locks, or narrower concurrency before `skip` markers. Use a skip only when the behavior is intentionally unsupported in that environment and the reason is documented.
7. Do not reintroduce removed behavior solely because old tests expect it.
8. When replacing subprocess tests with in-process helpers, verify that the helper does not mutate global process state that can leak across sibling tests. Pay special attention to `process.cwd()`, `process.env`, `process.argv`, `process.exitCode`, module-level caches, timers, and signal handlers.
9. If several in-process CLI tests can run in the same Node test runner, either provide context-local state for the shared resource, serialize the affected tests, or keep the unsafe tests isolated in separate processes.
10. Treat snapshot updates as manual unless `snapshot_update` is explicitly approved and configured.
11. Keep tests deterministic and close to the behavior contract.

<!-- mustflow-section: postconditions -->
## Postconditions

- The expected output can be produced with clear evidence, executed command intents, skipped checks, and remaining risks.
- Any missing command intent, unknown input, or authority conflict is reported instead of hidden.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `test`
- `test_related`
- `test_audit`
- `snapshot_update` only with explicit approval
- `lint`
- `build`

Do not infer missing test commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If tests fail, inspect the first relevant failure.
- Do not delete or weaken tests merely to make validation pass.
- If it is uncertain whether a test is stale, report it instead of deleting it.
- If a failure appears only under grouped or parallel in-process execution, look for shared process state before changing the behavior assertions.
- If the test command is unavailable, report the missing intent.

<!-- mustflow-section: output-format -->
## Output Format

- Behavior contract being tested
- Tests added
- Tests updated
- Tests removed, with reason
- Stale test candidates
- Flaky or environmental classification and handling
- Command intents run
- Skipped command intents and reasons
- Remaining test risks
