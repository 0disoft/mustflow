---
title: mf flow
description: Generates REPO_FLOW.md, a design-flow map for the current mustflow root.
---

`mf flow` reads the current mustflow root and generates `REPO_FLOW.md`, a stable Markdown map of how work moves through the repository.

It complements `mf map`. `REPO_MAP.md` answers where important files are. `REPO_FLOW.md` answers how agents should move from task intake to source reading, editing, verification, and reporting.

## Options

- `--stdout`: Print the generated flow map to the terminal.
- `--write`: Write the generated flow map to `REPO_FLOW.md`.
- `--check`: Check whether the existing `REPO_FLOW.md` source fingerprint is current.

When all three options are omitted, the command prints the flow map to the terminal.

## Output

The generated file includes:

- stable generated frontmatter with `source_fingerprint`;
- a one-screen mental model of the mustflow work loop;
- agent work, command execution, generated artifact, and receipt flows;
- public contract surfaces to synchronize when behavior changes;
- a "Where To Edit First" section for common change types.

The generated output intentionally does not include timestamps, branch names, remote URLs, local absolute paths, or recent-change summaries.

## Examples

```sh
npx mf flow --stdout
npx mf flow --write
npx mf flow --check
```

## Help and Exit Codes

```sh
npx mf flow --help
```

- Exit code `0`: The flow map was generated, written, or checked successfully.
- Exit code `1`: The command received an unknown option, incompatible output options, or `REPO_FLOW.md` is missing or stale during `--check`.

`mf flow` does not currently provide JSON output. Treat the generated Markdown as navigation guidance, not command authority.
