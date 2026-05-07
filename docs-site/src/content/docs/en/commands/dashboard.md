---
title: mf dashboard
description: Reserved command for the local mustflow dashboard.
---

`mf dashboard` is reserved for a future local dashboard that will enable visual inspection and editing of the mustflow document flow.

The feature is not yet implemented. Executing the command prints a not-implemented message and exits with code `1`.

## Current Behavior

```sh
npx mf dashboard
```

This command does not start a server and does not modify files.

## Structured Output

`mf dashboard` does not currently provide a JSON output format.

Automation and agents should not treat this command as an available workflow command.

## Help and Exit Codes

```sh
npx mf dashboard --help
```

- Exit code `0`: Help was printed.
- Exit code `1`: Dashboard is not implemented yet.
