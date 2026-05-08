---
mustflow_doc: skill.test-maintenance
locale: en
canonical: true
revision: 3
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

## Purpose

Keep tests aligned with the current behavior contract.

## Use When

- Behavior is added, changed, removed, or deprecated.
- A bug fix needs a regression test.
- Existing tests may be stale, duplicated, too broad, or tied to removed implementation details.
- Snapshot output has changed.

## Do Not Use When

- The task only changes prose or comments.
- The repository lacks a configured test intent and the user has requested not to add tests.

## Required Inputs

- User request
- Current behavior contract
- Changed or removed code path
- Existing test style
- `.mustflow/config/commands.toml`
- `.mustflow/config/mustflow.toml` `[testing]`

## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

## Allowed Edits

- Keep edits within the scope described by this skill, the user request, and the matching route in `.mustflow/skills/INDEX.md`.
- Do not broaden command permission, invent project facts, or change unrelated workflow files.

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
5. Do not reintroduce removed behavior solely because old tests expect it.
6. Treat snapshot updates as manual unless `snapshot_update` is explicitly approved and configured.
7. Keep tests deterministic and close to the behavior contract.

## Postconditions

- The expected output can be produced with clear evidence, executed command intents, skipped checks, and remaining risks.
- Any missing command intent, unknown input, or authority conflict is reported instead of hidden.

## Verification

Use configured oneshot command intents when available:

- `test`
- `test_related`
- `test_audit`
- `snapshot_update` only with explicit approval
- `lint`
- `build`

Do not infer missing test commands.

## Failure Handling

- If tests fail, inspect the first relevant failure.
- Do not delete or weaken tests merely to make validation pass.
- If it is uncertain whether a test is stale, report it instead of deleting it.
- If the test command is unavailable, report the missing intent.

## Output Format

- Behavior contract being tested
- Tests added
- Tests updated
- Tests removed, with reason
- Stale test candidates
- Command intents run
- Skipped command intents and reasons
- Remaining test risks
