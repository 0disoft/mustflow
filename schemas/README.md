# mustflow JSON Schemas

This directory contains versioned JSON Schema contracts for machine-readable  
mustflow files and command output.

Current schemas:

- `doctor-report.schema.json`: output of `mf doctor --json`
- `context-report.schema.json`: output of `mf context --json`
- `run-receipt.schema.json`: output of `mf run <intent> --json` and `.mustflow/state/runs/latest.json`
- `commands.schema.json`: parsed `.mustflow/config/commands.toml`
- `contract-lint-report.schema.json`: output of `mf contract-lint --json`
- `classify-report.schema.json`: output of `mf classify --changed --json` and  
  `mf classify <path...> --json`
- `impact-report.schema.json`: output of `mf impact --changed --json` and  
  `mf impact <path...> --json`
- `line-endings-report.schema.json`: output of `mf line-endings check --json` and  
  `mf line-endings normalize --json`
- `version-sources-report.schema.json`: output of `mf version-sources --json`
- `docs-review-list.schema.json`: output of `mf docs review list --json`
- `explain-report.schema.json`: output of `mf explain authority --json`, `mf explain command --json`,  
  `mf explain verify --reason <event> --json`, `mf explain retention --json`, `mf explain skills --json`,
  and `mf explain surface --json`
- `verify-report.schema.json`: output of `mf verify --reason <event> --json`
- `change-verification-report.schema.json`: output of `mf verify --reason <event> --plan-only --json` and  
  `mf verify --from-plan <path> --plan-only --json`

These schemas define stable, automation-facing fields. Human-readable command  
output is intentionally excluded.

The published schema surface is tracked in `src/core/public-json-contracts.ts`.  
Release tests verify consistency between this manifest, `schemas/*.schema.json`,  
`npm pack --dry-run --json`, and the installed package’s JSON command output.
