---
title: .mustflow/config/manifest.lock.toml
description: Generated install-state file written by mf init.
---

`.mustflow/config/manifest.lock.toml` is generated or updated after a successful `mf init`.

It is not copied from the template. It records which files were created, merged, left unchanged, or overwritten in the target repository.

## When It Is Written

- Written after a successful `mf init`.
- Written when `--merge` inserts a managed block into an existing `AGENTS.md`.
- Written when `--force` backs up conflicting files and overwrites them.
- Not written when installation aborts on conflicts.
- Not written when `--dry-run` only prints the install plan.

## Role

- Records the template identifier and version used for installation.
- Records the current content hash of each installed file.
- Records the action taken for each file.
- Gives commands such as `mf check`, `mf status`, and `mf update --dry-run` a stable install-state baseline.

## Shape

```toml
schema_version = "1"
generated_by = "mustflow"

[template]
id = "default"
version = "0.1.0"
profile = "minimal"
locale = "ko"

[files."AGENTS.md"]
source = "template_locale"
last_action = "created"
content_hash = "sha256:..."
```

## Fields

- `schema_version`: Lock-file schema version.
- `generated_by`: Tool that generated the file.
- `template.id`: Template identifier used during installation.
- `template.version`: Template version used during installation.
- `template.profile`: Project profile selected during installation.
- `template.locale`: mustflow document locale selected during installation.
- `template.agent_lang`: Agent report language when selected.
- `product_i18n`: Optional section written when product text locales are selected.
- `files."<path>"`: Per-file install record.
- `source`: Where the file content came from. Uses `template_locale`, `template_common`, or `managed_block`.
- `last_action`: Action applied during the last install. One of `created`, `unchanged`, `merged`, `overwritten`, or `customized`.
- `content_hash`: SHA-256 hash of the current file content.

## Hash Baseline

Currently, `content_hash` is the install-time baseline.

`mf check`, `mf status`, and `mf update --dry-run` compute the current file hash at runtime and compare it with this baseline. Template hashes are also not stored in the lock file; they are computed from the template bundled with the installed mustflow package.

This keeps the lock file as an install baseline rather than a live current-state snapshot.

## Editing Rules

This file is not a hand-authored source document.

Regenerate it with `mf init` or a future dedicated update command when the install state needs to be refreshed. Manual edits can make the recorded hashes disagree with the actual file contents.

`mf update --dry-run` uses `content_hash` as the install-time baseline. If the current file hash differs from that baseline, the file is treated as a local change and automatic update is blocked.

For the rationale, see [manifest.lock.toml Structure Decision](/design/manifest-lock-decision/).
