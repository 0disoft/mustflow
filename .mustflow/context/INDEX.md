---
mustflow_doc: context.index
kind: mustflow-context
locale: en
canonical: true
revision: 1
name: context-index
authority: router
lifecycle: mustflow-owned
stability: medium
review_status: needs_human_review
---

# Context Index

Refer to this file to identify which project context files are relevant to the current task.  
Avoid reading all context files by default to reduce noise.

## Available Context

| Context | Use when | Path |
| --- | --- | --- |
| project | The task may affect project direction, scope, public behavior, non-goals, or repository-wide conventions. | `.mustflow/context/PROJECT.md` |

## Optional External References

| Anchor | Use when | Path |
| --- | --- | --- |
| human overview | A public project overview or installation guide is needed. Consider this general context rather than mandatory policy. | `README.md` |
| roadmap | Project planning, priorities, milestones, or non-goal context is required. Treat this as planning context rather than enforced mustflow policy. | `ROADMAP.md` |
| visual design | The task involves UI changes, visual identity, design tokens, layout, or accessibility. | `DESIGN.md` |

## Reading Rules

- Consult only the context files relevant to the current task.  
- Treat context files as guidance unless explicitly stated to be supported by a more authoritative source.  
- If context conflicts with code, tests, command specifications, or explicit user instructions, report the conflict and defer to the higher-authority source.  
- Do not assume or invent missing project goals, non-goals, design tokens, API contracts, or data rules.  
- Do not duplicate design tokens from `DESIGN.md` into `.mustflow/context/`.