---
title: Operating Flow
description: Recommended mf command sequence after installing mustflow.
---

The default mustflow operating flow verifies whether the current root is ready for agents to read
without creating unnecessary files.

## Preview Before Writing

Start by previewing the installation plan.

```sh
npx mf init --dry-run
```

Existing `AGENTS.md` files or `.mustflow/` directories can cause conflicts, so review the planned
writes before applying changes.

## Initialize

If the plan is correct, initialize the workflow.

```sh
npx mf init --yes
```

If `AGENTS.md` already exists and only requires the mustflow-managed block, use `--merge`. Use
`--force` only when existing files should be backed up and overwritten.

## Validate

After initialization, validate the document flow and settings.

```sh
npx mf check
npx mf check --json
```

Use the default human-readable output for manual review. Use JSON output when an agent or automation
needs to determine the next action.

## Inspect Status

Use the status command to check whether installed files have changed since initialization.

```sh
npx mf status
npx mf status --json
```

The command compares current files against the install-time baseline recorded in `manifest.lock.toml`.

## Preview Updates

Preview template updates before writing any changes.

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

Generate a navigation map when agents need a quick overview of the important files in the current
root.

```sh
npx mf map --write
```

Only use nested repository mapping when workspace roots are configured and you need entry points for
those child repositories.

```sh
npx mf map --write --include-nested
```

`REPO_MAP.md` is an anchor-file map for the current mustflow root, not a full file listing.
