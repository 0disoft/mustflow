---
title: schemas/
description: Published JSON Schema contracts for stable mustflow JSON output.
---

`schemas/` contains the published JSON Schema contracts for machine-readable
mustflow output and parsed configuration shapes.

## Installed by mf init

No. `mf init` does not copy `schemas/` into a user repository.

The default init template is intentionally thin. It installs `AGENTS.md`,
`.mustflow/**`, and the managed mustflow block in `.gitignore`; `REPO_MAP.md`
is generated later with `mf map`.

## Distributed with the npm Package

Yes. `schemas/` is included in the npm package so tools can depend on these
contracts without parsing human-facing text.

Use the schemas from the installed package or from the mustflow repository when
building automation around `--json` output.

## Current Schemas

- `doctor-report.schema.json`: `mf doctor --json`
- `context-report.schema.json`: `mf context --json`
- `run-receipt.schema.json`: `mf run <intent> --json` and `.mustflow/state/runs/latest.json`
- `commands.schema.json`: parsed `.mustflow/config/commands.toml`

Human-readable command output is not covered by these schemas.
