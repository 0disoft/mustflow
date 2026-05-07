---
title: manifest.lock.toml Structure Decision
description: Why mustflow does not split manifest.lock.toml hash fields yet.
---

mustflow currently keeps a single `content_hash` field in `manifest.lock.toml`.

This value is not the live current hash. It is the file content hash recorded at the last install or update. The name is simple, but its meaning is the install baseline.

## Decision

Do not split the lock file into `installed_hash`, `template_hash`, and `current_hash` yet.

Instead, use these rules:

- `content_hash`: Install baseline stored in the lock file.
- Current file hash: Computed from the file system when a command runs.
- Bundled template hash: Computed from the template inside the installed package when a command runs.

## Rationale

The lock file should record reproducible install state only.

`current_hash` changes whenever the user edits a file. Storing it in the lock file would require rewriting the lock after ordinary edits, which would weaken the baseline.

`template_hash` can be computed from the currently installed mustflow package. When the package changes, the bundled template hash changes too. Keeping an old template hash in the lock file can create competing sources of truth.

## Update Comparison

`mf update --dry-run` only needs these comparisons:

```text
current file hash == lock content_hash
current file hash == bundled template hash
```

- If the first comparison is false, the file has local changes.
- If the first comparison is true and the second is false, the file is a template update candidate.
- If both are true, no update is needed.

## Future Expansion

Raise the schema version and add fields later if mustflow needs:

- comparison across multiple template sources
- offline verification of per-template source hashes
- reproducible update planning without the mustflow package installed
- signed templates or supply-chain verification

Until then, a single `content_hash` as the install baseline is simpler and safer.
