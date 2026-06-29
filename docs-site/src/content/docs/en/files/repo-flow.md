---
title: REPO_FLOW.md
description: A generated design-flow map for the current mustflow root.
---

`REPO_FLOW.md` is a generated file that explains how work moves through a mustflow root.

It is not a binding policy document. Command authority remains in `.mustflow/config/commands.toml`, repository instructions remain in `AGENTS.md`, and source behavior remains in current code, tests, and docs.

## Relationship to REPO_MAP.md

- `REPO_MAP.md`: points to important files and anchors.
- `REPO_FLOW.md`: explains the work and design flow between those files.

Use both when a repository is large enough that file locations alone do not explain the safe path through the change.

## Document Structure

- **Generated Metadata**: identifies the generated document and stores a source fingerprint.
- **How To Use**: explains the authority boundary and relationship to current files.
- **One-Screen Mental Model**: summarizes the task-to-evidence loop.
- **Agent Work Flow**: shows the expected read, skill, edit, and verify sequence.
- **Command Execution Flow**: shows how command intents gate verification and generation.
- **Generated and Receipt Flow**: shows generated files and run receipts as evidence surfaces.
- **Public Contract Surfaces**: lists code, i18n, docs, validation, and package surfaces that often drift together.
- **Where To Edit First**: gives starting points for common change types.

## Generation Policy

Generate the file with:

```sh
npx mf flow --write
```

Check whether the file is current with:

```sh
npx mf flow --check
```

`mf check --strict` also validates generated frontmatter, source fingerprint freshness, and volatile metadata constraints when `REPO_FLOW.md` exists.

Do not hand-edit `REPO_FLOW.md`. Regenerate it when workflow files, command contracts, or public CLI surfaces change.
