---
title: manifest.lock.toml Structure Decision
description: Why mustflow does not split manifest.lock.toml hash fields yet.
---

mustflow currently maintains a single `content_hash` field in `manifest.lock.toml`.

This value is not the current hash of the live file. It is the file content hash recorded during
the last install or update. The name is simple, but it serves as the installation baseline.

## Decision

Do not split the lock file into `installed_hash`, `template_hash`, and `current_hash` at this time.

Instead, apply these rules:

- `content_hash`: The installation baseline stored in the lock file.
- Current file hash: Computed from the file system at runtime.
- Bundled template hash: Computed from the template inside the installed package at runtime.

## Rationale

The lock file should record only a reproducible installation state.

`current_hash` changes whenever the user edits a file. Storing it in the lock file would require
rewriting the lock after ordinary edits, which would undermine the purpose of the baseline.

`template_hash` can be computed from the currently installed mustflow package. When the package
changes, the bundled template hash changes too. Keeping an outdated template hash in the lock file
could create conflicting sources of truth.

## Update Comparison

`mf update --dry-run` relies on these comparisons:

```text
current file hash == lock content_hash
current file hash == bundled template hash
```

- If the first comparison is false, the file has local changes.
- If the first comparison is true and the second is false, the file is a template update candidate.
- If both are true, no update is needed.

## Future Expansion

The schema version will be raised and fields added later if mustflow needs:

- Comparison across multiple template sources.
- Offline verification of per-template source hashes.
- Reproducible update planning without the mustflow package installed.
- Signed templates or supply-chain verification.

Until then, a single `content_hash` as the installation baseline is simpler and more robust.
