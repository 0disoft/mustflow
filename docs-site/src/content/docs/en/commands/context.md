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

## Prompt Cache Profiles

Use `--cache-profile stable|task|volatile|all` with `--json` when a host needs cache-friendly prompt layers instead of the full context report.

The stable profile reports stable instruction paths, existence flags, content hashes, and a `stable_prefix.cache_key`. It deliberately omits the absolute mustflow root, latest run receipt, timestamps, changed files, command output tails, and the current user task.

The task profile reports task-selective sources such as the context index, full route metadata, repository map, matching skill, and relevant source files. It also reports the local-index status so a host can reuse fresh task metadata or show a targeted `mf index` refresh hint when the index is missing, stale, or unreadable. The volatile profile reports state that must stay after the stable prefix. The `all` profile includes all three layers.

Add `--cache-audit` to include a `cache_audit` block. The audit measures the stable files using
mustflow's deterministic reference bundle format, reports UTF-8 rendered bytes, rough byte-based
token estimates, configured budget status, and largest stable blocks. Task-layer file candidates are
measured as selectable reference-bundle blocks with existence flags, content hashes, and largest
candidate blocks; dynamic task sources and volatile sources remain runtime-only placeholders until a
host supplies the actual selected content. The audit also includes a `summary` object with static
invariant counters such as measured blocks, dynamic sources, unresolved references, and volatile
layers that appear before the stable layer. The token estimate is not provider billing data and does
not prove that OpenAI, Anthropic, Gemini, or another provider reused a cache entry.

Use `--cache-compare <path>` with a prior `mf context --json --cache-profile ...` report inside the
mustflow root to compare prompt-bundle hashes and locate the first changed prompt block without
emitting prompt text.

## Example

```sh
npx mf context --json
npx mf context --json --cache-profile stable
npx mf context --json --cache-audit
npx mf context --json --cache-profile all --cache-compare .mustflow/cache/baseline-context.json
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

When `--cache-profile` is used, output switches to a prompt-cache profile report:

- `cache_profile` (`string`): Selected profile. One of `stable`, `task`, `volatile`, or `all`.
- `prompt_cache` (`object`): Effective prompt-cache settings from `mustflow.toml`.
- `stable_prefix.cache_key` (`string | null`): Hash of the stable document path and content-hash list.
- `stable_prefix.documents[]` (`object[]`): Stable document paths, existence flags, and content hashes.
- `stable_prefix.volatile_excluded` (`string[]`): Volatile sources that must not appear before the stable prefix.
- `task_context.sources` (`string[]`): Task-selective context sources.
- `task_context.local_index` (`object`): Read-only local-index status for task context. `status` is `fresh`, `missing`, `stale`, or `unreadable`; stale or unavailable states include a `refresh_hint` for `mf index`.
- `volatile_suffix.sources` (`string[]`): Volatile sources that belong after the stable prefix.
- `volatile_suffix.include_absolute_root`, `volatile_suffix.include_latest_run` (`false`): Stable-profile safety flags that keep volatile fields out of the stable layer.
- `prompt_bundle` (`object`): Ordered prompt-block manifest for the selected profile. It reports block boundaries, source paths, source placeholders, selection policy, cacheability, reload triggers, byte estimates, and hashes without embedding prompt text.
- `prompt_bundle.request_shape_hash` (`string`): Hash of the layer order and block shape. Use it to spot stable ordering or boundary drift that would change provider cache eligibility.
- `prompt_bundle.bundle_hash` (`string`): Hash of ordered block identities, measured content hashes, rendered digests, and block issues. Use it to compare two bundle manifests without exposing source text.
- `prompt_bundle.layers[].blocks[].content_included` (`false`): The context report never emits the actual prompt block body.
- `prompt_bundle_diff` (`object | undefined`): Present only with `--cache-compare`. It compares the current `prompt_bundle` with a baseline context JSON report and reports `unchanged`, `changed`, `baseline_missing`, `baseline_unreadable`, `baseline_invalid`, or `baseline_without_prompt_bundle`.
- `prompt_bundle_diff.first_difference` (`object | null`): First added, removed, or changed block by layer and order. Changed blocks list changed fields such as `content_hash`, `rendered_digest`, `cacheability`, or `reload_on`.
- `cache_audit.measurement` (`string`): Measurement mode. Currently `reference_bundle`.
- `cache_audit.estimator` (`object`): Rough byte-to-token estimator and caveat.
- `cache_audit.summary` (`object`): Static audit totals and invariants for the rendered reference bundle.
- `cache_audit.summary.dynamic_source_count` (`number`): Runtime-selected or volatile sources that cannot be fully measured before task assembly.
- `cache_audit.summary.unresolved_reference_count` (`number`): File references that could not be measured as concrete reference blocks.
- `cache_audit.summary.volatile_before_stable_count` (`number`): Volatile layers found before the stable layer. This should normally be `0`.
- `cache_audit.summary.serialization_deterministic` (`true`): Indicates that the reference bundle uses deterministic serialization rules.
- `cache_audit.layers[]` (`object[]`): Per-layer rendered bytes, estimated tokens, hard budget settings, target settings, status fields, blocks, largest blocks, and issues.
- `cache_audit.layers[].budget_status` (`string`): One of `within_budget`, `over_budget`, or `unknown`.
- `cache_audit.layers[].target_status` (`string`): One of `within_budget`, `over_budget`, or `unknown`; this reports preferred target fit without making the command fail.
- `cache_audit.layers[].blocks[]` (`object[]`): File or source-placeholder blocks with path or source, content hash, rendered bytes, estimated tokens, budget share, selection metadata, and any issue.
- `cache_audit.layers[].blocks[].source_kind` (`string | undefined`): Placeholder source class, such as `file_reference`, `dynamic_selection`, or `runtime_volatile`.
- `cache_audit.layers[].blocks[].selection_policy` (`string | undefined`): Whether the block is always rendered, selected only for a task, used only as fallback metadata, selected at runtime, or volatile runtime state.
- `cache_audit.layers[].blocks[].measurement_status` (`string | undefined`): `measured`, `hash_only_deferred`, or `dynamic_unmeasured`.
- `cache_audit.layers[].blocks[].candidate_exists`, `candidate_content_hash` (`boolean | null`, `string | null`): File-candidate existence and hash when the task source is a selectable file reference. Measured task candidates still may be omitted from a real task bundle.

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
