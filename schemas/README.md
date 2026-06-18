# mustflow JSON Schemas

This directory contains versioned JSON Schema contracts for machine-readable  
mustflow files and command output.

Current schemas:

- `doctor-report.schema.json`: output of `mf doctor --json`
- `adapter-compatibility-report.schema.json`: output of `mf adapters status --json`
- `context-report.schema.json`: output of `mf context --json`, including prompt-cache profiles and optional cache audit data
- `workspace-summary.schema.json`: output of `mf api workspace-summary --json`
- `command-catalog.schema.json`: output of `mf api command-catalog --json`
- `verification-plan.schema.json`: output of `mf api verification-plan --changed --json`
- `latest-evidence.schema.json`: output of `mf api latest-evidence --json`
- `diff-risk.schema.json`: output of `mf api diff-risk --changed --json`
- `health.schema.json`: output of `mf api health --json`
- `locks.schema.json`: output of `mf api locks --json`
- `api-serve-response.schema.json`: each newline-delimited response from `mf api serve --stdio`
- `run-receipt.schema.json`: output of `mf run <intent> --json` and `.mustflow/state/runs/latest.json`,
  including bounded declared-write drift metadata, a safe latest-run performance summary, and optional
  structured phase timings and selection summaries
- `commands.schema.json`: parsed `.mustflow/config/commands.toml`, including validation-only
  typed intent input metadata and explanatory preconditions that do not authorize parameterized
  command execution or automatic dependency execution
- `test-selection.schema.json`: parsed optional `.mustflow/config/test-selection.toml`
- `contract-lint-report.schema.json`: output of `mf contract-lint --json`
- `onboard-commands-report.schema.json`: output of `mf onboard commands --json`, containing
  review-only command-intent suggestions that do not grant command authority or write files
- `next-report.schema.json`: output of `mf next --json`, containing the next safe action,
  changed-file verification gaps, and read-only command recommendations
- `evidence-report.schema.json`: output of `mf evidence --changed --json`, containing verification
  requirements, latest bounded evidence, receipts, remaining risks, and gaps without running commands
- `workspace-status.schema.json`: output of `mf workspace status --json`, containing configured
  workspace roots, discovered nested repositories, and per-root command-contract readiness without
  granting command authority
- `workspace-command-catalog.schema.json`: output of `mf workspace command-catalog --json`,
  containing per-root command intent availability, safe `mf run` entrypoints, and no raw command
  strings
- `workspace-verification-plan.schema.json`: output of
  `mf workspace verify --changed --plan-only --json`, containing per-root changed-file
  verification plans without running commands or granting parent-to-child command authority
- `dashboard-export.schema.json`: bounded static export written by `mf dashboard --export-json <path>`,
  including output policy, redaction and truncation metadata, the dashboard harness report, and
  the evidence-based completion verdict, evidence model, and conservative coverage matrix for the
  exported snapshot
- `classify-report.schema.json`: output of `mf classify --changed --json` and  
  `mf classify <path...> --json`
- `impact-report.schema.json`: output of `mf impact --changed --json` and  
  `mf impact <path...> --json`
- `line-endings-report.schema.json`: output of `mf line-endings check --json` and  
  `mf line-endings normalize --json`
- `quality-gaming-report.schema.json`: output of `mf quality check --json`, containing changed-file
  quality-gaming risks such as line stuffing, validation suppressions, test bypass markers, type
  escapes, generated/vendor logic, empty catch swallowing, and placeholder implementations
- `skill-route-report.schema.json`: output of `mf skill route --json`, containing compact route
  candidates, selected main and adjunct skills, score breakdowns, and source route shards without
  granting command authority or replacing selected `SKILL.md` reads
- `latest-run-pointer.schema.json`: `.mustflow/state/runs/latest.json` when `mf verify` writes a
  pointer to the latest verify run bundle, including the verify completion verdict, evidence model,
  and coverage matrix
- `handoff-validation-report.schema.json`: output of  
  `mf handoff validate <path> --json`
- `version-sources-report.schema.json`: output of `mf version-sources --json`
- `docs-review-list.schema.json`: output of `mf docs review list --json`
- `explain-report.schema.json`: output of `mf explain authority --json`, `mf explain command --json`,  
  `mf explain verify --reason <event> --json`, `mf explain retention --json`, `mf explain skills --json`,
  `mf explain surface --json`, and `mf explain why <target> --json`. Verify explanations include the shared
  `decisionGraph` evidence model; latest-failure explanations include bounded latest-run metadata only.
- `verify-report.schema.json`: output of `mf verify --reason <event> --json`, including an
  explicit execution aggregate, evidence-based completion verdict, and evidence model with a
  conservative coverage matrix for the selected receipts and skipped checks
- `verify-run-manifest.schema.json`: `.mustflow/state/runs/verify-*/manifest.json`, including
  the same execution aggregate, completion verdict, evidence model, and coverage matrix as the verify report
- `change-verification-report.schema.json`: output of `mf verify --reason <event> --plan-only --json` and  
  `mf verify --from-classification <classify-report.json> --plan-only --json`, including the `decision_graph` that links
  changed surfaces, classification reasons, command candidates, eligibility, selected or not-selected state,
  effects, and gaps.
  Local-index command-effect graphs and command preconditions are explanation-only and cannot grant command authority.

These schemas define stable, automation-facing fields. Human-readable command  
output is intentionally excluded.

Current `classify`, `verify`, `run`, dashboard export, and verify state outputs may include
`correlation_id` so local artifacts from one work incident can be connected without storing raw
transcripts, environment values, or hidden reasoning.

The published schema surface is tracked in `src/core/public-json-contracts.ts`.  
Release tests verify consistency between this manifest, `schemas/*.schema.json`,  
`npm pack --dry-run --json`, and the installed package’s JSON command output.
