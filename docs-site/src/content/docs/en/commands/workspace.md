---
title: mf workspace
description: Read-only inspection for configured workspace roots and nested repository contracts.
---

`mf workspace scan` scans a `projects/` directory for nested repositories without requiring workspace configuration.
`mf workspace status` inspects configured workspace roots and discovered nested repositories.
`mf workspace command-catalog` aggregates each discovered repository's command intent availability.
`mf workspace verify --changed --plan-only` aggregates each discovered repository's changed-file verification plan.

It does not run commands, modify files, expose raw command strings, or let a parent repository grant command authority to a child repository. Each discovered repository keeps its own `.mustflow/config/commands.toml` as the only command-authority source.

## Example

```sh
npx mf workspace status
npx mf workspace scan --json
npx mf workspace status --json
npx mf workspace command-catalog --json
npx mf workspace verify --changed --plan-only --json
```

## JSON Fields

```sh
npx mf workspace status --json
```

- `schema_version` (`string`): Output format version.
- `command` (`string`): `workspace status` for status reports or `workspace scan` for ad hoc scans.
- `workspace` (`object`): Configured workspace scan settings from `.mustflow/config/mustflow.toml`.
- `policy` (`object`): States that the report is read-only and grants no command authority.
- `repositories` (`object[]`): Discovered nested git repositories and their local mustflow contract status.
- `issues` (`string[]`): Read-only discovery or parsing issues.

For `mf workspace command-catalog --json`, `command` is always `workspace command-catalog`, and each repository includes intent availability, `mf run <intent>` entrypoints, and the repository path where that command must be run.

For `mf workspace scan --json`, the report uses the same status schema and adds `projects_dir` plus `next_actions`.

For `mf workspace verify --changed --plan-only --json`, `command` is always `workspace verify`, and each repository includes changed files, selected intents, gaps, and the repository path where selected `mf run <intent>` commands must be run.

## Help and Exit Codes

```sh
npx mf workspace --help
```

- Exit code `0`: Workspace status was inspected.
- Exit code `1`: The command received invalid input.
