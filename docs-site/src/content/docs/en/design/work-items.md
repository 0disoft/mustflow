---
title: Work Items
description: How optional local work items can extend mustflow while preserving bounded handoff records.
---

Work items are an optional mustflow surface for capturing deferred issues, proposals, and restart points inside the repository.

The default template keeps this surface inactive with `work_items = "disabled"` and `handoff.mode = "report_only"` until a project chooses a bounded lifecycle.

## Defaults

```toml
[capabilities]
work_items = "disabled"

[handoff]
enabled = false
mode = "report_only"
```

With those defaults, agents should report unfinished work in the final handoff instead of creating new backlog files. mustflow includes a read-only validator for optional records:

```sh
npx mf handoff validate .mustflow/work-items/MF-0001.json
```

Validation does not create the file, update lifecycle state, run commands, or make a skipped check count as passed.

## Why The Default Is Inactive

- The default install should stay small until a project opts into a work-item lifecycle.
- Local issue files can become stale and may duplicate existing issue trackers.
- Failure logs, internal paths, customer names, and secret fragments could leak into documents.
- If agents create and close work items freely, the human decision boundary becomes unclear.

## Direction

When writing work items is enabled, `.mustflow/work-items/` is clearer than `.mustflow/pr/`. Local files represent proposed work and solution notes, rather than actual pull requests.

```text
.mustflow/
└─ work-items/
   ├─ README.md
   ├─ issues/
   │  └─ MF-0001.md
   └─ proposals/
      └─ MF-0001-P001.md
```

`issues/` contains deferred bugs, tasks, and feature requests. `proposals/` contains proposed changes for a specific issue. Branches, diffs, reviews, and merges remain the responsibility of Git and collaboration platforms.

## Agent Permissions

Even when optional work items are enabled, permissions should remain narrow.

- Agents are permitted to create issue candidates and propose changes.
- Agents must not close issues or accept proposals without human approval.
- Agents must not claim that an actual pull request exists.
- Agents must not store secrets, customer data, or extensive failure logs in work items.

## Current Validation Shape

Optional records should be JSON restart pointers with this bounded shape:

- `schema_version`
- `kind`
- `task_id`
- `goal`
- `scope`
- `non_goals`
- `acceptance_criteria`
- `source_refs`
- `changed_surfaces`
- `verification_plan`
- `coverage`
- `remaining_risks`
- `next_restart_point`

Forbidden content includes hidden reasoning, raw chat transcripts, full terminal logs, secrets, personal data, broad memory summaries, autonomous worker state, and command-authority fields such as `argv`, `cmd`, `run_policy`, `lifecycle`, `stdin`, `timeout_seconds`, `writes`, `network`, `destructive`, `required_after`, `skip_validation`, or `agent_action`.

`verification_plan` entries use `status: planned`, `run`, or `skipped`. A skipped entry needs `skip_reason`, and only a `run` entry may include `receipt_path`.

## Command Candidates

```sh
mf work list
mf work show MF-0001
mf work propose MF-0001
```

Add writer and lifecycle commands incrementally with bounded schemas, command contracts, redaction, and human approval rules before agents can create or close records automatically.
