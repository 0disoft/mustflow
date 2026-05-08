---
title: mf update Policy
description: Explains how mf update separates planning from safe application.
---

`mf update` updates the installed mustflow agent document flow to match a newer template.

Because these files contain repository-specific agent rules, automatic updates must be conservative.
`mf update --dry-run` previews the plan first, and `mf update --apply` writes only when no blocking items are present.

## Baseline

The update baseline is the `content_hash` found in `.mustflow/config/manifest.lock.toml`.

`content_hash` is the file content hash last recorded by `mf init` or `mf update --apply`. If the current file hash differs from this value, mustflow treats the file as locally edited.

If a lock entry has `last_action = "customized"`, mustflow treats that recorded hash as an intentional repository-specific baseline. The file is not replaced with bundled template content while the current hash still matches that customized baseline.

This policy is also included in the `policy` object from `mf update --json`.
Documentation, human-readable output, and automation output must remain consistent.

Current policy values:

```text
baseline: manifest_lock_content_hash
allowed_apply_actions: update, create
blocking_actions: blocked-local-change, manual-review
dry_run_writes_files: false
backup_path_pattern: .mustflow/backups/<timestamp>/
never_overwrite_local_changes: true
writes_only_template_manifest_paths: true
```

## States

`mf update --dry-run` classifies files into the following states:

- `unchanged`: The current file matches both the lock baseline and the bundled template, or it is marked as customized and still matches that customized baseline.
- `update`: The current file matches the lock baseline but differs from the bundled template.
- `create`: The file exists in the template but is missing from the user repository.
- `blocked-local-change`: The current file differs from the lock baseline.
- `manual-review`: The file requires human review instead of an automatic update.

## Apply Rules

`mf update --apply` follows these rules:

- Do not modify `blocked-local-change` files automatically.
- Do not modify `manual-review` files automatically.
- Do not replace customized files with template content while they still match their customized lock baseline.
- `update` files are replaced with template content after a backup is created.
- `create` files are written after creating the necessary parent directories.
- If a new template file conflicts with an existing file not present in the lock, it is treated as a local change and will not be overwritten.
- Refresh affected `manifest.lock.toml` entries after a successful update.
- `mf update` writes only mustflow files declared by the template manifest and the lock file.
- If any write fails, report the files already written and the backup paths.

## AGENTS.md Handling

`AGENTS.md` is the root entry point and requires extra care.

`mf update` does not automatically merge the whole `AGENTS.md` file.

When an existing `AGENTS.md` is tracked as a mustflow-managed block, mustflow does not own the text outside that block. The block can become eligible for automatic update only when the lock file records a block-level baseline and the current block still matches it.

Schema v1 does not store that block-level baseline. In v1, merged `AGENTS.md` files remain under `manual-review` instead of receiving a `managed-block-update`.

## Backup Location

Before an `update` item changes an existing file, backups are written under:

```text
.mustflow/backups/<timestamp>/
```

Backups serve as a final layer of protection. Their presence does not justify automatically overwriting `blocked-local-change` files.

## Exit Codes

- Exit `0`: The plan has no blocking items.
- Exit `1`: `blocked-local-change` or `manual-review` items are present, including during `--apply`.
- Exit `1`: The lock file is missing or invalid.
- Exit `1`: `mf update` is run without choosing `--dry-run` or `--apply`.
