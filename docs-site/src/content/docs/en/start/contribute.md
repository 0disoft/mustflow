---
title: Contribute to mustflow
description: Work on the mustflow repository without confusing maintainer commands with installed project files.
---

Use this path when you are changing the mustflow package, documentation site, templates, schemas, tests, or release process.

## Start

- Read `CONTRIBUTING.md`.
- Read this repository's `AGENTS.md` before editing.
- Use configured intents from `.mustflow/config/commands.toml` for verification.

## Common Checks

```sh
mf run docs_validate_fast
mf run mustflow_check
mf run test_related
```

Choose the narrowest configured intent that covers the changed surface. Use broader checks for release-sensitive, cross-cutting, schema, package, or template changes.

## Boundary

This repository's development setup uses Bun, but user projects do not need Bun to run mustflow. Files under `templates/default/` define installed workflow files; files under `docs-site/`, `src/`, `tests/`, and `schemas/` belong to this package repository.
