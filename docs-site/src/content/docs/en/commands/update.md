---
title: mf update
description: Previews or safely applies updates for an installed mustflow document flow.
---

`mf update` compares the installed mustflow document flow against the current bundled template.

`mf update --dry-run` reads `manifest.lock.toml`, verifies if the current files still match their installation hashes, and generates an update plan.
`mf update --apply` executes updates and creations only when no local changes are blocked and no items require manual review.
Include the `--json` flag when automation or an agent needs to parse the plan.

Both human-readable and JSON outputs adhere to the same policy. The comparison baseline is the `content_hash` recorded in the lock file; updates and creations are the only actionable states.

## Agent Command Intents

Installed projects can expose update operations through configured `mf run` intents instead of asking agents to run raw `mf update` directly.

- `mustflow_update_dry_run`: runs `mf update --dry-run --json` and writes no files.
- `mustflow_update_apply`: runs `mf update --apply --json`; use it only after the dry-run plan has no blocking or manual-review items and the task calls for applying updates.

## Why Dry-Run Comes First

Mustflow files define agent rules and procedures; therefore, automatically overwriting user-edited files could inadvertently erase repository-specific logic.

The update command distinguishes between the following scenarios:

- **Hash matching**: Whether the current file matches its initial installation hash.
- **Template divergence**: Whether the current file differs from the bundled template.
- **Blocking changes**: Whether local user changes prevent an automatic update.
- **Manual review**: Whether the file requires manual intervention.

## Output Buckets

- `Blocked local changes`: The current file hash differs from the installation hash, preventing an automatic update.
- `Manual review`: The file requires manual inspection rather than an automatic update (e.g., a managed block).
- `Would update`: The file is eligible for an update via `mf update --apply`.
- `Would create`: The file exists in the template but is not yet present in the current root.

Files whose lock entry has `last_action = "customized"` are treated as unchanged while they still match their customized lock baseline, even when the bundled template differs.

## Example

```sh
npx mf update --dry-run
```

When everything is current, output looks like:

```text
mustflow update plan
Policy:
- Baseline: manifest_lock_content_hash
- Apply actions: update, create
- Blocking actions: blocked-local-change, manual-review
- Backup path: .mustflow/backups/<timestamp>/
Blocked local changes: 0
Manual review: 0
Would update: 0
Would create: 0
No template updates needed.
No files were written.
```

If local changes are detected, the command exits with code `1`. You should inspect these changes before attempting any future updates that modify files.

## Applying Updates

```sh
npx mf update --apply
```

`--apply` performs file writes only when the following conditions are met:

- `Blocked local changes` is `0`.
- `Manual review` is `0`.
- The target item is categorized as `Would update` or `Would create`.

Mustflow creates a backup in `.mustflow/backups/<timestamp>/` before modifying any existing files.
Once changes are applied, it updates the corresponding entries in `.mustflow/config/manifest.lock.toml` with new hashes and the `last_action` state.

If a template file being newly introduced already exists in the repository but is not tracked in the lock file, mustflow treats it as a local change and will refuse to overwrite it if the content differs.
If the bundled template manifest lists a target outside `AGENTS.md` and `.mustflow/**`, update planning fails before any write.

## JSON Fields

```sh
npx mf update --dry-run --json
npx mf update --apply --json
```

The machine-readable output includes the following fields:

- `schema_version` (`number`): Output format version.
- `command` (`string`): Always `update`.
- `mode` (`string`): Execution mode (`dry-run`, `apply`, or `unspecified`).
- `policy` (`object`): Update safety policy.
- `ok` (`boolean`): Whether the plan contains no blocking items.
- `wroteFiles` (`boolean`): Whether files were actually written. This is always `false` for `--dry-run`.
- `summary` (`object`): Update plan counts categorized by state.
- `items` (`object[]`): Per-file plan entries.
- `error` (`string`): Failure reason; only present in failed output.

Nested fields use the following structures:

- `policy.baseline` (`string`): The update decision baseline (currently `manifest_lock_content_hash`).
- `policy.allowed_apply_actions` (`string[]`): States that `--apply` is permitted to write.
- `policy.blocking_actions` (`string[]`): States that prevent `--apply` from performing any writes.
- `policy.dry_run_writes_files` (`boolean`): Whether `--dry-run` writes files. Always `false`.
- `policy.backup_path_pattern` (`string`): The path pattern for backups created before replacing files.
- `policy.never_overwrite_local_changes` (`boolean`): Indicates that local changes are never overwritten automatically.
- `policy.writes_only_template_manifest_paths` (`boolean`): Indicates that the update only writes files defined in the template manifest.
- `summary.blockedLocalChanges` (`number`): Number of files blocked by local changes.
- `summary.manualReview` (`number`): Number of files requiring manual review.
- `summary.wouldUpdate` (`number`): Number of files eligible for an update.
- `summary.wouldCreate` (`number`): Number of files eligible for creation.
- `summary.unchanged` (`number`): Number of files already matching the current template.
- `items[].relativePath` (`string`): Target path for the plan entry.
- `items[].sourceKind` (`string`): The origin of the item from the template source.
- `items[].action` (`string`): The planned action state.
- `items[].reason` (`string`): The justification for the planned action.

When the bundled template changed but the user did not edit the installed file, the file appears under `Would update` or `summary.wouldUpdate`.

## Help and Exit Codes

```sh
npx mf update --help
```

Help output is ordered as `Usage`, `Options`, `Examples`, and `Exit codes`.

- Exit code `0`: The `--dry-run` plan has no blocking items, or `--apply` completed successfully.
- Exit code `1`: Local changes, manual-review items, a missing lock file, invalid options, or the absence of an explicit mode prevented success.

Executing `mf update` without arguments will fail without making any changes. It is recommended to review the plan using `mf update --dry-run` before executing `mf update --apply`.
