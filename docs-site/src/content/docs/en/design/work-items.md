---
title: Work items
description: Why local work items are not installed by default and how mustflow may support them later.
---

mustflow does not create local issue or proposal folders in the default template.

File-based work items can be useful, but installing them by default would expand mustflow from an agent document flow into a local issue tracker. Currently, `.mustflow/config/mustflow.toml` only declares `work_items = "disabled"` and `handoff.mode = "report_only"`.

## Defaults

```toml
[capabilities]
work_items = "disabled"

[handoff]
enabled = false
mode = "report_only"
```

This means agents should report unfinished work in the final handoff instead of creating new backlog files.

## Why They Are Not Default

- The default purpose of `mf init` is to install LLM-only workflow files.
- Local issue files can become stale and may duplicate existing issue trackers.
- Failure logs, internal paths, customer names, and secret fragments can leak into documents.
- If agents create and close work items freely, the human decision boundary becomes unclear.

## Optional Direction

If this becomes an optional feature later, `.mustflow/work-items/` is clearer than `.mustflow/pr/`. Local files are proposed work and solution notes, not real pull requests.

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

Even when optional work items are enabled, permissions should stay narrow.

- Agents may write issue candidates and proposed changes.
- Agents must not close issues or accept proposals without human approval.
- Agents must not claim that a real pull request exists.
- Agents must not store secrets, customer data, or long failure logs in work items.

## Future Command Candidates

```sh
mf work list
mf work show MF-0001
mf work propose MF-0001
mf work check
```

These commands are outside the current implementation scope. mustflow should stabilize the file-based workflow, command contract, and validation flow before adding this optional surface.
