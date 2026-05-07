---
title: mf update
description: Previews or safely applies updates for an installed mustflow document flow.
---

`mf update` compares the installed mustflow document flow with the current bundled template.

`mf update --dry-run` reads `manifest.lock.toml`, checks whether current files still match their install-time hashes, and prints an update plan.
`mf update --apply` applies only `update` and `create` items when there are no blocked local changes or manual-review items.
Use `--json` as well when automation or an agent needs to parse the plan.

The human output and JSON output follow the same policy. The baseline is the lock-file `content_hash`,
and the only applyable states are `update` and `create`.

## Why Dry-Run Comes First

mustflow files contain agent rules and procedures. Automatically overwriting user-edited files could erase repository-specific rules.

The update command therefore needs to separate:

- whether the current file still matches the install-time hash
- whether the current file differs from the bundled template
- whether local user changes block automatic updates
- whether manual review is required

## Output Buckets

- `Blocked local changes`: Current file hash differs from the install-time hash, so automatic update is blocked.
- `Manual review`: File needs review instead of automatic update, such as a managed block.
- `Would update`: File can be updated by `mf update --apply`.
- `Would create`: File exists in the template but is missing from the current root.

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

When local changes are found, the command exits with code `1`. The user should inspect those changes before any future mutating update is attempted.

## Applying Updates

```sh
npx mf update --apply
```

`--apply` writes files only when all of these are true:

- `Blocked local changes` is `0`.
- `Manual review` is `0`.
- The target item is in `Would update` or `Would create`.

Before updating an existing file, mustflow writes a backup under `.mustflow/backups/<timestamp>/`.
After applying changes, it refreshes the affected entries in `.mustflow/config/manifest.lock.toml` with the new hash and `last_action`.

If a newly added template file already exists in the user repository but is not recorded in the lock file and has different content, mustflow treats it as a local change and refuses to overwrite it.

## JSON Fields

```sh
npx mf update --dry-run --json
npx mf update --apply --json
```

Machine-readable output uses these fields:

- `schema_version` (`number`): Output format version.
- `command` (`string`): Always `update`.
- `mode` (`string`): Execution mode. One of `dry-run`, `apply`, or `unspecified`.
- `policy` (`object`): Update safety policy.
- `ok` (`boolean`): Whether the plan has no blocking items.
- `wroteFiles` (`boolean`): Whether files were actually written. It is always `false` for `--dry-run`.
- `summary` (`object`): Update plan counts by state.
- `items` (`object[]`): Per-file plan entries.
- `error` (`string`): Failure reason. It may appear only on failed output.

Nested fields use these shapes:

- `policy.baseline` (`string`): Update decision baseline. Currently `manifest_lock_content_hash`.
- `policy.allowed_apply_actions` (`string[]`): States that `--apply` may write. Currently `update` and `create`.
- `policy.blocking_actions` (`string[]`): States that prevent `--apply` from writing any files.
- `policy.dry_run_writes_files` (`boolean`): Whether `--dry-run` writes files. Always `false`.
- `policy.backup_path_pattern` (`string`): Backup path pattern before replacing existing files.
- `policy.never_overwrite_local_changes` (`boolean`): Declares that local changes are never overwritten automatically.
- `policy.writes_only_template_manifest_paths` (`boolean`): Declares that update writes only mustflow files listed by the template manifest.
- `summary.blockedLocalChanges` (`number`): Number of files blocked by local changes.
- `summary.manualReview` (`number`): Number of files requiring manual review.
- `summary.wouldUpdate` (`number`): Number of files a future mutating update could change.
- `summary.wouldCreate` (`number`): Number of files a future mutating update could create.
- `summary.unchanged` (`number`): Number of files already matching the current template.
- `items[].relativePath` (`string`): Target path for the plan entry.
- `items[].sourceKind` (`string`): How the item came from the template source.
- `items[].action` (`string`): Planned action state.
- `items[].reason` (`string`): Reason the item was placed in that state.

When the bundled template changed but the user did not edit the installed file, the file appears under `Would update` or `summary.wouldUpdate`.

## Help and Exit Codes

```sh
npx mf update --help
```

Help output is ordered as `Usage`, `Options`, `Examples`, and `Exit codes`.

- Exit code `0`: A `--dry-run` plan has no blocking items, or `--apply` completed without blocking items.
- Exit code `1`: Local changes, manual-review items, a missing lock file, invalid options, or a missing explicit mode prevented success.

Running `mf update` by itself fails without changing files. Review with `mf update --dry-run` first, then use `mf update --apply` only when the plan is safe.
