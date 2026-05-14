---
title: mf handoff
description: Read-only validation for restricted work-item and handoff records.
---

`mf handoff validate <path>` validates a JSON record that lives inside the mustflow root. It does not create work items, write handoff files, start agents, run commands, or treat the record as command authority.

The command exists for optional `.mustflow/work-items/` or handoff files that are kept as restart pointers. A valid record can name the task goal, scope, acceptance criteria, source references, verification plan, coverage status, remaining risks, and next restart point. It must not store hidden reasoning, chat transcripts, raw terminal logs, secrets, personal data, broad memory summaries, autonomous worker state, or command fields that bypass `.mustflow/config/commands.toml`.

## Record Shape

Required fields:

- `schema_version`: Always `1`.
- `kind`: `work_item` or `handoff`.
- `task_id`: Stable task identifier.
- `goal`: Current goal.
- `scope`: Bounded work scope.
- `acceptance_criteria`: Completion checks.
- `source_refs`: Repository files, issue links, or other source references.
- `next_restart_point`: Short instruction for the next session.

Optional fields:

- `non_goals`
- `changed_surfaces`
- `verification_plan`
- `coverage`
- `remaining_risks`

`verification_plan` entries use `status: planned`, `run`, or `skipped`. Skipped entries must include `skip_reason`. Only entries with `status: run` may include `receipt_path`, so skipped or planned verification cannot be reported as already run.

## Example

```sh
npx mf handoff validate .mustflow/work-items/MF-0001.json
npx mf handoff validate .mustflow/work-items/MF-0001.json --json
```

## JSON Fields

Machine-readable output uses these fields:

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `handoff_validate`.
- `ok` (`boolean`): Whether the record has no blocking errors.
- `mustflow_root` (`string`): Resolved mustflow root.
- `path` (`string`): Validated record path.
- `record_kind` (`string | null`): `work_item`, `handoff`, or `null` when invalid.
- `task_id` (`string | null`): Parsed task id when available.
- `summary` (`object`): Counts for scope, acceptance criteria, source refs, verification plan, coverage, and remaining risks.
- `issues` (`object[]`): Validation issues with `severity`, `code`, `path`, and `message`.

## Exit Codes

- `0`: The record is valid.
- `1`: The record is invalid, outside the mustflow root, too large, unreadable, or not valid JSON.
