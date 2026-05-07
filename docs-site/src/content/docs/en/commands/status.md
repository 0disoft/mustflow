---
title: mf status
description: Read-only command that shows local mustflow install status.
---

`mf status` checks whether the current root has the mustflow document flow installed and reports changed or missing files using the manifest lock.

It does not modify files. Use `mf check` for automation gates, and use `mf status` when a human wants a quick local summary.
Use `--json` when an automation or agent needs to read the result.

## Output

- `Installed`: Whether `AGENTS.md` and `.mustflow/` are present.
- `Manifest lock`: Lock-file state. One of `present`, `missing`, or `invalid`.
- `Tracked files`: Number of files recorded in the lock file.
- `Changed files`: Number of files whose current content hash differs from the lock.
- `Missing files`: Number of files recorded in the lock but missing from disk.

## Example

```sh
npx mf status
```

Example output:

```text
mustflow status
Installed: yes
Manifest lock: present
Tracked files: 10
Changed files: 0
Missing files: 0
```

When files changed or disappeared, their paths are printed below the summary.

## JSON Fields

```sh
npx mf status --json
```

Machine-readable output uses these fields:

- `installed` (`boolean`): Whether `AGENTS.md` and `.mustflow/` exist.
- `manifestLock` (`string`): Lock-file state.
- `trackedFiles` (`number`): Number of files recorded in the lock file.
- `changedFiles` (`string[]`): Paths whose hashes changed.
- `missingFiles` (`string[]`): Paths that disappeared.
- `issues` (`string[]`): Human-readable issue messages.
- `template` (`object | null`): Template identifier and version recorded in the lock file.

## Help and Exit Codes

```sh
npx mf status --help
```

Help output is ordered as `Usage`, `Options`, `Examples`, and `Exit codes`.

- Exit code `0`: Status was inspected and printed. Changed files do not make status inspection fail.
- Exit code `1`: The command received an unknown option.

If automation needs changed files to fail a workflow, read `mf status --json` and decide from the fields, or use `mf check`.
