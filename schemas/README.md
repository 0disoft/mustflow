# mustflow JSON Schemas

This directory contains versioned JSON Schema contracts for machine-readable  
mustflow files and command output.

Current schemas:

- `doctor-report.schema.json`: output of `mf doctor --json`
- `adapter-compatibility-report.schema.json`: output of `mf adapters status --json`
- `context-report.schema.json`: output of `mf context --json`
- `run-receipt.schema.json`: output of `mf run <intent> --json` and `.mustflow/state/runs/latest.json`,
  including bounded declared-write drift metadata, a safe latest-run performance summary, and optional
  structured phase timings and selection summaries
- `commands.schema.json`: parsed `.mustflow/config/commands.toml`
- `contract-lint-report.schema.json`: output of `mf contract-lint --json`
- `dashboard-export.schema.json`: bounded static export written by `mf dashboard --export-json <path>`,
  including output policy, redaction and truncation metadata, and the dashboard harness report
- `classify-report.schema.json`: output of `mf classify --changed --json` and  
  `mf classify <path...> --json`
- `impact-report.schema.json`: output of `mf impact --changed --json` and  
  `mf impact <path...> --json`
- `line-endings-report.schema.json`: output of `mf line-endings check --json` and  
  `mf line-endings normalize --json`
- `handoff-validation-report.schema.json`: output of  
  `mf handoff validate <path> --json`
- `version-sources-report.schema.json`: output of `mf version-sources --json`
- `docs-review-list.schema.json`: output of `mf docs review list --json`
- `explain-report.schema.json`: output of `mf explain authority --json`, `mf explain command --json`,  
  `mf explain verify --reason <event> --json`, `mf explain retention --json`, `mf explain skills --json`,
  and `mf explain surface --json`. Verify explanations include the shared `decisionGraph` evidence model.
- `verify-report.schema.json`: output of `mf verify --reason <event> --json`
- `change-verification-report.schema.json`: output of `mf verify --reason <event> --plan-only --json` and  
  `mf verify --from-plan <classify-report.json> --plan-only --json`, including the `decision_graph` that links
  changed surfaces, classification reasons, command candidates, eligibility, selected or not-selected state,
  effects, and gaps.
  Local-index command-effect graphs are explanation-only and cannot grant command authority.

These schemas define stable, automation-facing fields. Human-readable command  
output is intentionally excluded.

The published schema surface is tracked in `src/core/public-json-contracts.ts`.  
Release tests verify consistency between this manifest, `schemas/*.schema.json`,  
`npm pack --dry-run --json`, and the installed package’s JSON command output.
