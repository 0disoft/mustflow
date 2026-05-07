---
title: mf update Policy
description: Explains how mf update separates planning from safe application.
---

`mf update` updates the installed mustflow agent document flow against a newer template.

These files contain repository-specific agent rules, so automatic updates must be conservative.
`mf update --dry-run` previews the plan first, and `mf update --apply` writes only when no blocking items are present.

## Baseline

The update baseline is `content_hash` in `.mustflow/config/manifest.lock.toml`.

`content_hash` is the file content hash last recorded by `mf init` or `mf update --apply`. If the current file hash differs from this value, mustflow treats the file as locally edited.

This policy is also included in the `policy` object from `mf update --json`.
The docs, human output, and automation output should not describe different rules.

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

`mf update --dry-run` classifies files into these states:

- `unchanged`: Current file matches both the lock baseline and the bundled template.
- `update`: Current file matches the lock baseline but differs from the bundled template.
- `create`: File exists in the template but is missing from the user repository.
- `blocked-local-change`: Current file differs from the lock baseline.
- `manual-review`: File needs human review instead of automatic update.

## Apply Rules

`mf update --apply` follows these rules:

- Do not modify `blocked-local-change` files automatically.
- Do not modify `manual-review` files automatically.
- `update` files are replaced with template content after backup.
- `create` files are written after creating parent directories.
- If a new template file collides with an existing file that is not in the lock, treat it as a local change and refuse to overwrite it.
- Refresh affected `manifest.lock.toml` entries after a successful update.
- `mf update` writes only mustflow files declared by the template manifest plus the lock file.
- If any write fails, report already written files and backup paths.

## AGENTS.md Handling

`AGENTS.md` is the root entrypoint, so it needs extra care.

When an existing `AGENTS.md` received only a mustflow managed block, the whole file must not be overwritten with the template. That case should stay under `manual-review`, or use dedicated logic that replaces only the managed block safely.

## Backup Location

Before an `update` item changes an existing file, backups are written under:

```text
.mustflow/backups/<timestamp>/
```

Backups are a final protection layer. Their presence does not make it acceptable to overwrite `blocked-local-change` files automatically.

## Exit Codes

- Exit `0` when the plan has no blocking items.
- Exit `1` when `blocked-local-change` or `manual-review` items are present, including during `--apply`.
- Exit `1` when the lock file is missing or invalid.
- Exit `1` when `mf update` is run without choosing `--dry-run` or `--apply`.
