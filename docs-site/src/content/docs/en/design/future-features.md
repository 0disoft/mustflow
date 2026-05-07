---
title: Future Features
description: Proposed mustflow features that are not implemented yet.
---

This page does not describe current behavior. It tracks proposed features that are still under consideration.

Until implemented, these features are not part of the default template, command contract, or validation rules.

## Proposed Features

| Item | Status | Current Decision |
| --- | --- | --- |
| `mf dashboard` | Under consideration | Command name reserved; implementation pending. |
| Community skill repository | Under consideration | Installation and update rules for external skills are not yet defined. |
| Skill pack installation | Under consideration | Pending stabilization of the boundary between default and optional skills. |
| `.mustflow/work-items/` | Under consideration | Excluded from the default template; remains optional. |
| `mf orient` | Under consideration | Currently covered by `mf context`, `mf map`, and `mf help`. |
| `mf refresh` | Under consideration | Currently handled by `mf update` and `mf check --strict` for instruction freshness. |
| Tool-specific adapters | Under consideration | Avoid making tool product names required default filenames or mandatory rules. |

## Promotion Criteria

A feature becomes public behavior only when it meets all of these conditions:

- Does not unnecessarily expand the default document flow created by `mf init`.
- Provides a clear command contract that agents can execute predictably.
- Makes incorrect usage detectable via `mf check --strict` or another validator.
- Remains human-readable and easy to edit manually.
