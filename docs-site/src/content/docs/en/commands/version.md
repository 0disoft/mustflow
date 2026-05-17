---
title: mf version
description: Prints the installed mustflow package version and optionally checks npm.
---

`mf version` prints the installed mustflow CLI package version.

The command is quiet by default so scripts can read the version without triggering network access.

## Check npm

Use the direct `mf` command when mustflow is installed globally:

```sh
mf version --check
```

From a project-local install, run it through the package manager:

```sh
npx mf version --check
bunx mf version --check
```

`--check` contacts the npm registry, compares the installed version with the latest published version, and prints update commands for npm, Bun, pnpm, Yarn, and Deno when a newer version is available. If the current runtime exposes a package-manager signal, that manager is listed first.

It does not install packages or modify files.

If the shell prints `mf: command not found`, the version command did not run. Install mustflow globally, or add the package manager's global binary directory to `PATH`.

```sh
npm install -g mustflow
bun add -g mustflow@latest
```

With Bun, make sure Bun's global binary directory, commonly `~/.bun/bin`, is on `PATH`.

Example output:

```text
mustflow 1.10.0
latest 1.11.0 available

Update commands:
npm: npm install -g mustflow@latest
bun: bun add -g mustflow@latest
pnpm: pnpm add -g mustflow@latest
yarn: yarn global add mustflow@latest
deno: deno install -g -A -n mf npm:mustflow@latest
```

Bun users can install or refresh the global command with `bun add -g mustflow@latest`.

## Help and Exit Codes

```sh
npx mf version --help
```

- Exit code `0`: Version information was printed.
- Exit code `1`: The command received an unknown option or could not check npm.
