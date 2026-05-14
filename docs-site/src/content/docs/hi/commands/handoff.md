---
title: mf handoff
description: Restricted work-item और handoff records की read-only validation.
---

`mf handoff validate <path>` mustflow root के अंदर मौजूद JSON record validate करता है। यह work items नहीं बनाता, handoff files नहीं लिखता, agents शुरू नहीं करता, commands नहीं चलाता, और record को command authority नहीं मानता।

यह command optional `.mustflow/work-items/` या handoff files के लिए है जिन्हें restart pointers के रूप में रखा जाता है। Valid record task goal, scope, acceptance criteria, source refs, verification plan, coverage status, remaining risks, और next restart point रख सकता है। इसमें hidden reasoning, chat transcripts, raw terminal logs, secrets, personal data, broad memory summaries, autonomous worker state, या `.mustflow/config/commands.toml` को bypass करने वाले command fields नहीं होने चाहिए।

## Shape

Required fields:

- `schema_version`: Always `1`.
- `kind`: `work_item` or `handoff`.
- `task_id`: Stable task identifier.
- `goal`: Current goal.
- `scope`: Bounded work scope.
- `acceptance_criteria`: Completion checks.
- `source_refs`: Repository files, issue links, or other source references.
- `next_restart_point`: Short instruction for the next session.

Optional fields: `non_goals`, `changed_surfaces`, `verification_plan`, `coverage`, and `remaining_risks`.

`verification_plan` entries use `status: planned`, `run`, or `skipped`. Skipped entries must include `skip_reason`. Only `status: run` entries may include `receipt_path`.

## Example

```sh
npx mf handoff validate .mustflow/work-items/MF-0001.json
npx mf handoff validate .mustflow/work-items/MF-0001.json --json
```

## Exit Codes

- `0`: The record is valid.
- `1`: The record is invalid, outside the mustflow root, too large, unreadable, or not valid JSON.
