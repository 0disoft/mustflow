# mustflow JSON Schemas

This directory contains the versioned JSON Schema contracts for machine-readable
mustflow files and command output.

Current schemas:

- `doctor-report.schema.json`: `mf doctor --json`
- `context-report.schema.json`: `mf context --json`
- `run-receipt.schema.json`: `mf run <intent> --json` and `.mustflow/state/runs/latest.json`
- `commands.schema.json`: parsed `.mustflow/config/commands.toml`
- `contract-lint-report.schema.json`: `mf contract-lint --json`
- `classify-report.schema.json`: `mf classify --changed --json` and
  `mf classify <path...> --json`
- `impact-report.schema.json`: `mf impact --changed --json` and
  `mf impact <path...> --json`
- `line-endings-report.schema.json`: `mf line-endings check --json` and
  `mf line-endings normalize --json`
- `version-sources-report.schema.json`: `mf version-sources --json`
- `docs-review-list.schema.json`: `mf docs review list --json`
- `explain-report.schema.json`: `mf explain authority --json`, `mf explain command --json`,
  `mf explain retention --json`, `mf explain skills --json`, and `mf explain surface --json`
- `verify-report.schema.json`: `mf verify --reason <event> --json`
- `change-verification-report.schema.json`: `mf verify --reason <event> --plan-only --json`
  and `mf verify --from-plan <path> --plan-only --json`

These schemas describe stable automation-facing fields. Human-readable command
output is intentionally not covered.

The shipped schema surface is tracked in `src/core/public-json-contracts.ts`.
Release tests compare that manifest with this README, `schemas/*.schema.json`,
`npm pack --dry-run --json`, and installed-package JSON command output.
