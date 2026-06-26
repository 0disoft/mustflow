---
title: mf adapters
description: Inspects host instruction-file compatibility without writing adapter files.
---

`mf adapters status` inspects host-specific instruction-file compatibility for the current mustflow root.

It is read-only. It reports existing agent instruction files, optional adapter surfaces, compatibility
notes, required changes, and the command-authority boundary. It does not generate adapter files or
change host configuration.

## Example

```sh
mf adapters status
mf adapters status --json
```

## JSON Fields

- `mustflow_root` (`string`): Current mustflow root.
- `agents_file` (`object`): Presence and compatibility state for `AGENTS.md`.
- `summary` (`object`): Counts for host instruction files, adapter surfaces, notes, and required changes.
- `required_changes` (`object[]`): Findings that need action before compatibility is clean.
- `compatibility_notes` (`object[]`): Informational notes about existing host surfaces.
- `boundaries` (`object`): Command-authority and adapter-generation boundaries.

## Help and Exit Codes

```sh
mf adapters --help
```

- Exit code `0`: Adapter compatibility was inspected.
- Exit code `1`: The command received invalid input.
