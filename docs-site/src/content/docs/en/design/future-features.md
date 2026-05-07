---
title: Future features
description: mustflow feature candidates that are not implemented yet.
---

This page is not a description of current behavior. It is a scaffold for feature candidates under consideration.

Until a candidate is implemented, it is not part of the default template, command contract, or validation rules.

## Candidates

| Item | Status | Current decision |
| --- | --- | --- |
| `mf dashboard` | Under consideration | The command name is reserved, but the feature is not implemented yet. |
| Community skill repository | Under consideration | Rules for installing or updating external skills are not defined yet. |
| Skill pack installation | Under consideration | This should wait until the boundary between default and optional skills is stable. |
| `.mustflow/work-items/` | Under consideration | It stays out of the default template and remains an optional feature candidate. |
| `mf orient` | Under consideration | For now, use `mf context`, `mf map`, and `mf help` together. |
| `mf refresh` | Under consideration | For now, use `mf update` and `mf check --strict` to inspect instruction freshness. |
| Tool-specific adapters | Under consideration | Tool product names should not become required default file names or mandatory rules. |

## Promotion Criteria

A candidate should become public behavior only when it meets these conditions.

- It does not bloat the default document flow installed by `mf init`.
- It has a command contract that agents can run without guessing.
- Incorrect usage can be checked with `mf check --strict` or another validator.
- It remains natural for humans to read and edit manually.
