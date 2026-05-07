---
title: Operating Flow
description: Recommended mf command sequence after installing mustflow.
---

The default mustflow flow is about checking whether the current root is ready for agents to read, not about creating many files.

## Preview Before Writing

Start by previewing the install plan.

```sh
npx mf init --dry-run
```

Existing `AGENTS.md` or `.mustflow/` files may conflict, so check what would be written before making changes.

## Initialize

If the plan is correct, initialize the workflow.

```sh
npx mf init --yes
```

If `AGENTS.md` already exists and only needs the mustflow managed block, use `--merge`. Use `--force` only when existing files should be backed up and overwritten.

## Validate

After initialization, validate the document flow and settings.

```sh
npx mf check
npx mf check --json
```

Use human output when reading directly. Use JSON output when an agent or automation needs to decide what to do next.

## Inspect Status

Use status to see whether installed files changed after initialization.

```sh
npx mf status
npx mf status --json
```

The command compares current files against the install-time baseline recorded in `manifest.lock.toml`.

## Preview Updates

Template updates should be previewed before any write.

```sh
npx mf update --dry-run
npx mf update --dry-run --json
```

If the plan is safe, apply clean template updates explicitly.

```sh
npx mf update --apply
```

`mf update --apply` writes only files that still match their installed baseline.
Locally edited files and new-file collisions are reported as blocked items.

## Generate Navigation Map

Generate the navigation map when agents need a fast view of the current root's important files.

```sh
npx mf map --write
```

Only use nested repository mapping when workspace roots are configured and you need entrypoints for those child repositories.

```sh
npx mf map --write --include-nested
```

`REPO_MAP.md` is an anchor-file map for the current mustflow root, not a full file listing.
