# mustflow JSON Schemas

This directory contains the versioned JSON Schema contracts for machine-readable
mustflow files and command output.

Current schemas:

- `doctor-report.schema.json`: `mf doctor --json`
- `context-report.schema.json`: `mf context --json`
- `run-receipt.schema.json`: `mf run <intent> --json` and `.mustflow/state/runs/latest.json`
- `commands.schema.json`: parsed `.mustflow/config/commands.toml`

These schemas describe stable automation-facing fields. Human-readable command
output is intentionally not covered.
