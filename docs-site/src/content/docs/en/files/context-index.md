---
title: .mustflow/context/INDEX.md
description: Routes agents to task-specific project context files.
---

`.mustflow/context/INDEX.md` tells agents which project context files are relevant to the current task.

## Where It Is Used

- Helps agents avoid reading every context file by default.
- Separates project direction from the short `AGENTS.md` router.
- Points to optional external anchors such as `README.md` and `DESIGN.md` without making them mustflow-owned files.

## Fields

The frontmatter identifies the file as a mustflow context document:

- `kind: mustflow-context`
- `name: context-index`
- `authority: contextual`
- `stability`: how stable the content is expected to be.
- `review_status`: whether a human has reviewed the context.

## Table

The main table maps each context name to a use condition and a path.

The default template lists only `.mustflow/context/PROJECT.md`.
Domain-specific files such as frontend, backend, API, data, security, or operations context are not created by default.

## External Anchors

`README.md` is a human-facing overview. Agents may use it as context, not policy.

`DESIGN.md` is not created by mustflow. If it exists, agents may read it for UI, visual design, layout, design-token, or accessibility work.

