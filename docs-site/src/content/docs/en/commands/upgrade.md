---
title: mf upgrade
description: Checks the package version and safely updates installed mustflow workflow files.
---

`mf upgrade` is the one-command path after refreshing the mustflow package.

It checks whether the current CLI package is up to date on npm. If the package is current, it runs the same safe project-file update policy as `mf update --apply`.

It does not install npm, pnpm, or Bun packages. Package manager updates stay outside mustflow so repositories are not modified by package installation side effects.

## Typical Flow

```sh
bun update -g mustflow
mf upgrade
```

For npm or pnpm users, update the package with the package manager first, then run `mf upgrade` inside each mustflow project.

## Safety Rules

`mf upgrade` writes project files only when the bundled update plan has no blockers:

- `Blocked local changes` must be `0`.
- `Manual review` must be `0`.
- Only `update` and `create` items from the template manifest can be written.
- Existing files are backed up under `.mustflow/backups/<timestamp>/` before replacement.

If a newer mustflow package exists on npm, `mf upgrade` stops before touching project files and prints the package update command. Run the package update first, then run `mf upgrade` again.

## Dry Run

```sh
mf upgrade --dry-run
```

`--dry-run` checks package status and prints the project update plan without writing files.

Use `mf update --dry-run --diff` when you need a bounded diff preview before applying.

## Exit Codes

- `0`: The package was current and the project update check completed.
- `1`: A package update is required, a project update blocker was found, or the input was invalid.
