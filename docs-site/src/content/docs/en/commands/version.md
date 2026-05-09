---
title: mf version
description: Prints the installed mustflow package version and optionally checks npm.
---

`mf version` prints the installed mustflow CLI package version.

The command is quiet by default so scripts can read the version without triggering network access.

## Check npm

```sh
npx mf version --check
```

`--check` contacts the npm registry, compares the installed version with the latest published version, and prints an update command when a newer version is available.

It does not install packages or modify files.

Example output:

```text
mustflow 1.10.0
latest 1.11.0 available

Update command:
npm install -g mustflow@latest
```

## Help and Exit Codes

```sh
npx mf version --help
```

- Exit code `0`: Version information was printed.
- Exit code `1`: The command received an unknown option or could not check npm.
