---
title: mf status
description: Read-only command to view the local mustflow installation status.
---

`mf status` verifies the installation of the mustflow document flow in the current root and reports any modified or missing files based on the manifest lock.

This command does not modify files. While `mf check` is recommended for automation gates, `mf status` is ideal for obtaining a quick local summary.
Use the `--json` flag when automation or an agent requires structured output.

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

If files have been modified or are missing, their paths are listed below the summary.

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

- Exit code `0`: Status was successfully inspected and printed. Note that modified files do not cause the status check to fail.
- Exit code `1`: The command received an unknown option.

If automation requires modified files to trigger a workflow failure, parse the `mf status --json` output or use `mf check`.
