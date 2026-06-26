---
title: mf api
description: Prints read-only JSON reports and serves them over stdio for agent integrations.
---

`mf api` exposes stable, read-only JSON reports for agent and tool integrations.

It does not run project command intents, modify files, start agents, approve work, or grant command
authority. Command execution still belongs to `.mustflow/config/commands.toml` and `mf run <intent>`.

## Actions

- `workspace-summary`: Read installed workflow state, read order, command surface, Git state, and latest evidence summary.
- `command-catalog`: Read command intent availability and runnable `mf run <intent>` entrypoints.
- `verification-plan`: Build a changed-file verification plan from current Git changes.
- `latest-evidence`: Read bounded metadata from the latest mustflow run or verify receipt.
- `diff-risk`: Summarize changed-file risk, required verification, and remaining gaps.
- `health`: Print a compact health report for workflow, command contract, and latest evidence status.
- `locks`: Inspect active or stale mustflow run locks.
- `serve`: Serve the same reports over newline-delimited stdio requests.

## Examples

```sh
mf api workspace-summary --json
mf api command-catalog --json
mf api verification-plan --changed --json
mf api latest-evidence --json
mf api diff-risk --changed --json
mf api health --json
mf api locks --json
mf api serve --stdio
```

Actions that depend on changed files require `--changed`. JSON-only report actions require `--json`.

## Help and Exit Codes

```sh
mf api --help
```

- Exit code `0`: The report was printed or the stdio session completed.
- Exit code `1`: The command received invalid input or could not create the requested report.
