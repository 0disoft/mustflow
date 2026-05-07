---
title: .mustflow/context/INDEX.md
description: Directs agents to task-specific project context files.
---

`.mustflow/context/INDEX.md` identifies project context files relevant to the current task.

## Usage

- Minimizes noise by helping agents avoid reading irrelevant context files.
- Decouples project-specific direction from the primary `AGENTS.md` router.
- Provides references to optional external anchors, such as `README.md` and `DESIGN.md`, without requiring them to be managed by mustflow.

## Fields

The frontmatter identifies this as a mustflow context document:

- `kind: mustflow-context`
- `name: context-index`
- `authority: contextual`
- `stability`: The expected stability of the document content.
- `review_status`: Indicates whether the context has been reviewed by a human.

## Context Table

The primary table maps each context identifier to its application scenarios and file path.

The default template includes only `.mustflow/context/PROJECT.md`.
Domain-specific files—such as those for frontend, backend, API, data, security, or operations—are optional and not included in the default template.

## External Anchors

`README.md` provides a high-level project overview. Agents should treat it as general context rather than mandatory policy.

`DESIGN.md` is not part of the default mustflow template. If present, agents consult it for tasks involving UI/UX, visual design, layout, design tokens, or accessibility.

