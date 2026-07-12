---
title: mf upgrade
description: Checks the package version and safely updates installed mustflow workflow files.
---

`mf upgrade` is the one-command path after refreshing the mustflow package.

It checks whether the current CLI package is up to date on npm. If the package is current, it runs the same safe project-file update policy as `mf update --apply`.

It does not install packages. Package manager updates stay outside mustflow so repositories are not modified by package installation side effects.

## Typical Flow

```sh
bun add -g mustflow@latest
mf upgrade
```

Use the package manager that installed mustflow. `mf upgrade` prints npm, Bun, pnpm, Yarn, and Deno update commands when the installed package is behind, then stops before touching project files.

Use `mf version --check` when you only want to check npm package freshness and see the package-manager update commands without running the project-file upgrade policy.

Deno `npm:` execution is listed for visibility but remains experimental until separately verified.

## Safety Rules

`mf upgrade` writes project files only when the bundled update plan has no blockers:

- `Blocked local changes` must be `0`.
- `Manual review` must be `0`.
- Only `update` and `create` items from the template manifest can be written.
- Existing files are backed up under `.mustflow/backups/<timestamp>/` before replacement.

If a newer mustflow package exists on npm, `mf upgrade` stops before touching project files and prints package-manager update commands. Run the package update first, then run `mf upgrade` again.

## Customized Workflow Files

The update plan compares managed files with `manifest.lock.toml`. A customized `AGENTS.md`, command
contract, skill index, route table, or other managed file can appear as a blocked local change. That
is a stop state, not a prompt to delete the file or force an overwrite.

Review the current template and local contract, merge only the needed change, then use the
repository's declared manifest-lock workflow to record the reviewed baseline. Run `mf check --strict`
afterward. `mf upgrade` does not merge custom content for you.

## Dry Run

```sh
mf upgrade --dry-run
```

`--dry-run` checks package status and prints the project update plan without writing files.

Use `mf update --dry-run --diff` when you need a bounded diff preview before applying.

## Exit Codes

- `0`: The package was current and the project update check completed.
- `1`: A package update is required, a project update blocker was found, or the input was invalid.
