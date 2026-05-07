---
mustflow_doc: context.index
kind: mustflow-context
locale: en
canonical: true
revision: 1
name: context-index
authority: contextual
stability: medium
review_status: needs_human_review
---

# Context Index

Use this file to decide which project context files are worth reading for the current task.
Do not read every context file by default.

## Available Context

| Context | Use when | Path |
| --- | --- | --- |
| project | The task may affect project direction, scope, public behavior, non-goals, or repository-wide promises. | `.mustflow/context/PROJECT.md` |

## Optional External Anchors

| Anchor | Use when | Path |
| --- | --- | --- |
| human overview | You need the public project overview or installation story. Use it as context, not policy. | `README.md` |
| visual design | The task changes UI, visual identity, design tokens, layout, or accessibility. | `DESIGN.md` |

## Reading Rules

- Read only the context files that match the task.
- Treat context files as guidance unless a file says it is backed by a more authoritative source.
- If context conflicts with code, tests, command contracts, or explicit user instructions, report the conflict and follow the higher-authority source.
- Do not invent missing project goals, non-goals, design tokens, API promises, or data rules.
- Do not duplicate design tokens from `DESIGN.md` into `.mustflow/context/`.

