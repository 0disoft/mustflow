---
title: mf doctor
description: Read-only diagnostic command for the current mustflow root.
---

`mf doctor` provides a concise health summary for the current mustflow root.
It aggregates the most critical aspects of `mf check` and `mf context`, then suggests the next steps an agent should follow.

This command never writes files. Use it when an agent or human requires an initial orientation before modifying the repository.

## What It Inspects

- Current mustflow root.
- Whether `AGENTS.md` and `.mustflow/` are present.
- Result of `mf check`.
- `manifest.lock.toml` state.
- Template identifier and version from the lock file when present.
- Whether `.mustflow/config/commands.toml` exists and exposes runnable oneshot intents.
- Missing required and optional read-order paths from `mustflow.toml`.
- Whether `REPO_MAP.md` has been generated.
- Whether the local `.mustflow/cache/mustflow.sqlite` index exists.
- Whether the latest `mf run` receipt exists.
- Diagnostic checklist items and suggested next commands.

## Example

```sh
npx mf doctor
```

Example output:

```text
mustflow doctor
mustflow root: /path/to/project
Installed: yes
Strict: no
Check: passed
Issues: 0
Command contract: present
Runnable intents: 3

Health:
- [ok] Install: installed
- [ok] Validation: 0 issues
- [ok] Command contract: present, 3 runnable intents
- [ok] Read order: all required files present
- [info] REPO_MAP.md: not generated (run: mf map --write)
- [info] Local index: not generated (run: mf index)
- [info] Latest run: no run receipt yet (run: mf run <intent>)

Suggested commands:
- mf help workflow
- mf help commands
- mf context --json
- mf check --strict
- mf map --write
- mf index
- mf run <intent>

No files were written.
```

## JSON Fields

```sh
npx mf doctor --json
```

Machine-readable output uses these fields:

- `schema_version` (`number`): Output format version.
- `command` (`string`): Always `doctor`.
- `mustflow_root` (`string`): Current mustflow root.
- `installed` (`boolean`): Whether `AGENTS.md` and `.mustflow/` exist.
- `strict` (`boolean`): Whether `--strict` checks were enabled.
- `ok` (`boolean`): Whether the install exists and validation passed.
- `check` (`object`): Validation result using the `mf check` rules.
- `context` (`object`): Main context state an agent needs before starting.
- `diagnostics` (`object[]`): Per-area diagnostics for install, validation, command contract, read order, repository map, local index, and latest run.
- `next_steps` (`string[]`): Commands an agent can run next without guessing.

Nested fields use these shapes:

- `check.ok` (`boolean`): Whether validation passed.
- `check.issue_count` (`number`): Number of validation issues.
- `check.issues` (`string[]`): Validation issue messages.
- `context.manifest_lock` (`string`): Lock-file state. One of `present`, `missing`, or `invalid`.
- `context.template` (`object | null`): Template identifier and version when known.
- `context.command_contract_exists` (`boolean`): Whether `commands.toml` exists.
- `context.runnable_intents` (`string[]`): Names of configured oneshot intents that agents may run.
- `context.missing_read_order` (`string[]`): Required read-order files that are missing.
- `context.missing_optional_read_order` (`string[]`): Optional read-order files that are missing.
- `context.latest_run_exists` (`boolean`): Whether the latest run receipt exists.
- `diagnostics[].id` (`string`): Diagnostic area name.
- `diagnostics[].status` (`string`): Diagnostic state. One of `ok`, `warn`, `fail`, or `info`.
- `diagnostics[].summary` (`string`): Short human-readable state.
- `diagnostics[].action` (`string | null`): Command to run next.

## Strict Mode

```sh
npx mf doctor --strict --json
```

Strict mode uses the same additional checks as `mf check --strict`.
Use it after changing mustflow documents, skills, command contracts, retention settings, or repository-map behavior.

## Exit Codes

- `0`: The root was inspected and no issues were found.
- `1`: Validation found issues, the install is missing, or the command received an unknown option.

Agents and automation should read `ok`, `check.issues`, `diagnostics`, and `next_steps` from `--json` output instead of parsing the human summary.
