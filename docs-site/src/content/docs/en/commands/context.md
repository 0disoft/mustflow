---
title: mf context
description: Prints the agent work context for the current mustflow root in JSON format.
---

`mf context --json` prints structured context that an agent can inspect before initiating work in the current root.

This command does not modify files. It does not replace the need to read the documents themselves; rather, it serves as a concise index that points to the files and command intents an agent should prioritize.

## Included Data

- Current mustflow root.
- Install state.
- `manifest.lock.toml` state.
- Authoritative document paths from `mustflow.toml`.
- Capability surface from `mustflow.toml`.
- Required reading order and file existence.
- Optional reading order and file existence.
- Context index and project context paths through the authority and optional reading fields.
- Command intent status summary from `commands.toml`.
- Runnable oneshot command intent names.
- Effective policy summary for command execution, Git automation, and state authority.
- Local cache and state policy.
- Actions that are blocked by the default repository contract.
- Summary of the latest `mf run` receipt.
- Issues reported from the manifest lock.

## Run Receipt Summary

`latest_run` exposes only selected metadata from `.mustflow/state/runs/latest.json`.

It does not include standard output or standard error tails. If an agent needs command output, it must explicitly read the receipt file.

## Example

```sh
npx mf context --json
```

## JSON Fields

Machine-readable output uses these fields:

- `schema_version` (`number`): Output format version.
- `command` (`string`): Always `context`.
- `mustflow_root` (`string`): Current root where the command was executed.
- `installed` (`boolean`): Whether `AGENTS.md` and `.mustflow/` exist.
- `manifest_lock` (`string`): Lock-file state. One of `present`, `missing`, or `invalid`.
- `template` (`object | null`): Template identifier and version recorded in the lock file.
- `authority` (`object`): Authoritative document paths.
- `capabilities` (`object`): Agent capability surface for the current root.
- `read_order` (`object[]`): Required reading files and existence flags.
- `optional_read_order` (`object[]`): Optional reading files and existence flags.
- `command_contract` (`object`): Command intent summary and runnable intent names.
- `effective_policy` (`object`): Applied repository policy for command execution, Git automation, and state authority.
- `state_policy` (`object`): Local cache and state storage policy.
- `blocked_actions` (`string[]`): Action classes blocked by the repository contract.
- `latest_run` (`object`): Summary of the latest run receipt.
- `issues` (`string[]`): Issues reported from the manifest lock.

Repeated and nested fields use these shapes:

- `read_order[].path` (`string`): Relative path to read.
- `read_order[].exists` (`boolean`): Whether the file exists in the current root.
- `command_contract.intents[].name` (`string`): Command intent name.
- `command_contract.intents[].status` (`string`): Command intent configuration status.
- `command_contract.intents[].lifecycle` (`string | null`): Whether the command is oneshot or long-running.
- `command_contract.intents[].run_policy` (`string | null`): Agent execution policy.
- `command_contract.runnable_intents` (`string[]`): Intent names an agent may run with `mf run <intent>`.
- `effective_policy.project_commands_require_mf_run` (`boolean`): Whether project verification commands should use `mf run`.
- `effective_policy.allow_inferred_commands` (`boolean`): Whether agents may infer commands outside `commands.toml`.
- `effective_policy.auto_stage`, `effective_policy.auto_commit`, `effective_policy.auto_push` (`boolean`): Git automation preferences.
- `state_policy.cache_path` (`string`): Local cache path.
- `state_policy.state_path` (`string`): Local state path.
- `state_policy.versioned` (`boolean`): Whether mustflow local state should be versioned.
- `state_policy.safe_to_delete` (`boolean`): Whether local cache and state can be rebuilt or regenerated.
- `state_policy.stores_raw_conversation`, `state_policy.stores_full_terminal_output`, `state_policy.stores_hidden_chain_of_thought` (`boolean`): Raw storage boundaries.
- `latest_run.path` (`string`): Latest run receipt path.
- `latest_run.exists` (`boolean`): Whether the latest run receipt exists.
- `latest_run.valid` (`boolean | null`): Whether the receipt parsed as a JSON object.
- `latest_run.status` (`string | null`): Latest run result.
- `latest_run.exit_code` (`number | null`): Process exit code from the latest run.

## Exit Codes

- `0`: Context was inspected and printed.
- `1`: The command received an unknown option.
