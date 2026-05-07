---
title: Work Items
description: Why local work items are not installed by default and how mustflow might support them in the future.
---

By default, mustflow does not create local issue or proposal folders.

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

- The primary purpose of `mf init` is to set up LLM-only workflow files.
- Local issue files can become stale and may duplicate existing issue trackers.
- Failure logs, internal paths, customer names, and secret fragments could leak into documents.
- If agents create and close work items freely, the human decision boundary becomes unclear.

## Optional Direction

If this becomes an optional feature in the future, `.mustflow/work-items/` is clearer than `.mustflow/pr/`. Local files represent proposed work and solution notes, rather than actual pull requests.

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

## Future Command Candidates

```sh
mf work list
mf work show MF-0001
mf work propose MF-0001
mf work check
```

These commands are outside the current implementation scope. mustflow should stabilize the file-based workflow, command contract, and validation flow before adding this optional surface.
