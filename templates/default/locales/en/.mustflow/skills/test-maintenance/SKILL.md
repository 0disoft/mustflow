---
mustflow_doc: skill.test-maintenance
locale: en
canonical: true
revision: 1
name: test-maintenance
description: Use when adding, updating, removing, or auditing tests after behavior, bug, API, snapshot, or compatibility changes.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
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
- Snapshot output changed.

## Do Not Use When

- The task only changes prose or comments.
- The repository has no configured test intent and the user asked not to add tests.

## Required Inputs

- User request
- Current behavior contract
- Changed or removed code path
- Existing test style
- `.mustflow/config/commands.toml`
- `.mustflow/config/mustflow.toml` `[testing]`

## Procedure

1. Identify the behavior that should exist now.
2. Search existing tests before adding new ones.
3. Classify affected tests:
   - `active`: still validates current behavior
   - `update_needed`: behavior changed
   - `obsolete_candidate`: likely validates removed or irrelevant behavior
   - `legacy_contract`: old behavior is intentionally preserved
   - `flaky_or_environmental`: failure may depend on environment
4. Add, update, remove, or report tests according to the classification.
5. Do not reintroduce removed behavior only because old tests expect it.
6. Treat snapshot updates as manual unless `snapshot_update` is explicitly approved and configured.
7. Keep tests deterministic and close to the behavior contract.

## Verification

Use configured finite command intents when available:

- `test`
- `test_related`
- `test_audit`
- `snapshot_update` only with explicit approval
- `lint`
- `build`

Do not infer missing test commands.

## Failure Handling

- If tests fail, inspect the first relevant failure.
- Do not delete or weaken tests only to make validation pass.
- If a stale test candidate is uncertain, report it instead of deleting it.
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
