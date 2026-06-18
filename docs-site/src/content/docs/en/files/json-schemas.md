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
- `context-report.schema.json`: `mf context --json`, including prompt-cache profiles and optional cache audit data
- `contract-lint-report.schema.json`: `mf contract-lint --json`
- `onboard-commands-report.schema.json`: `mf onboard commands --json`
- `next-report.schema.json`: `mf next --json`
- `evidence-report.schema.json`: `mf evidence --changed --json`
- `api-serve-response.schema.json`: each newline-delimited response from
  `mf api serve --stdio`
- `workspace-status.schema.json`: `mf workspace status --json`
- `workspace-command-catalog.schema.json`: `mf workspace command-catalog --json`
- `workspace-verification-plan.schema.json`: `mf workspace verify --changed --plan-only --json`
- `classify-report.schema.json`: `mf classify --changed --json` and
  `mf classify <path...> --json`
- `impact-report.schema.json`: `mf impact --changed --json` and
  `mf impact <path...> --json`
- `line-endings-report.schema.json`: `mf line-endings check --json` and
  `mf line-endings normalize --json`
- `quality-gaming-report.schema.json`: `mf quality check --json`
- `skill-route-report.schema.json`: `mf skill route --json`, including compact route candidates,
  selected main and adjunct skills, score breakdowns, and route source shards
- `latest-run-pointer.schema.json`: `.mustflow/state/runs/latest.json` when `mf verify`
  writes a pointer to the latest verify run bundle, including the verify completion verdict, evidence model,
  and coverage matrix
- `handoff-validation-report.schema.json`: `mf handoff validate <path> --json`
- `version-sources-report.schema.json`: `mf version-sources --json`
- `docs-review-list.schema.json`: `mf docs review list --json`
- `explain-report.schema.json`: `mf explain <topic> --json`
- `verify-report.schema.json`: `mf verify --reason <event> --json`, including an evidence-based
  completion verdict, explicit execution aggregate, and evidence model with a conservative coverage
  matrix for selected receipts, skipped checks, and gaps
- `verify-run-manifest.schema.json`: `.mustflow/state/runs/verify-*/manifest.json`, including
  the same execution aggregate, completion verdict, evidence model, and coverage matrix as the verify report
- `change-verification-report.schema.json`: `mf verify --reason <event> --plan-only --json`
  and `mf verify --from-classification <path> --plan-only --json`; command-effect graph fields are
  explanation-only and point back to `.mustflow/config/commands.toml` for runnable authority
- `run-receipt.schema.json`: `mf run <intent> --json` and `.mustflow/state/runs/latest.json`
- `commands.schema.json`: parsed `.mustflow/config/commands.toml`
- `test-selection.schema.json`: parsed optional `.mustflow/config/test-selection.toml`

Human-readable command output is not covered by these schemas.
