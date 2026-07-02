---
title: Contract Specifications
description: Versioned root documents that define mustflow's testable workflow rules.
---

mustflow keeps its versioned contract specifications in the repository under
[`docs/spec/`](https://github.com/0disoft/mustflow/tree/main/docs/spec).

These documents define the rules that future commands and schemas should share.
They are concise reference documents, not tutorials.

## JSON Schemas

Published JSON Schemas live in
[`schemas/`](https://github.com/0disoft/mustflow/tree/main/schemas) and are
included in the npm package. The shipped schema surface is tracked in
`src/core/public-json-contracts.ts`; release tests compare that manifest with
the schema directory, this documentation surface, package contents, and
installed-package JSON command output.

- `doctor-report.schema.json`: `mf doctor --json`
- `context-report.schema.json`: `mf context --json`
- `run-receipt.schema.json`: `mf run <intent> --json` and `.mustflow/state/runs/latest.json`
- `commands.schema.json`: parsed `.mustflow/config/commands.toml`
- `contract-lint-report.schema.json`: `mf contract-lint --json`
- `onboard-commands-report.schema.json`: `mf onboard commands --json`
- `next-report.schema.json`: `mf next --json`, including optional script-pack helper suggestions
- `verification-plan.schema.json`: `mf api verification-plan --changed --json`, including optional
  read-only script-pack helper suggestions
- `evidence-report.schema.json`: `mf evidence --changed --json`
- `api-serve-response.schema.json`: each newline-delimited response from `mf api serve --stdio`
- `workspace-status.schema.json`: `mf workspace status --json` and `mf workspace scan --json`
- `workspace-command-catalog.schema.json`: `mf workspace command-catalog --json`
- `workspace-verification-plan.schema.json`: `mf workspace verify --changed --plan-only --json`
- `classify-report.schema.json`: `mf classify <path...> --json`
- `impact-report.schema.json`: `mf impact <path...> --json`
- `line-endings-report.schema.json`: `mf line-endings check --json`
- `quality-gaming-report.schema.json`: `mf quality check --json`
- `module-boundary-report.schema.json`: `mf script-pack run code/module-boundary check <path...> --json`
- `skill-route-report.schema.json`: `mf skill route --json`, including optional read-only
  script-pack helper suggestions
- `handoff-validation-report.schema.json`: `mf handoff validate <path> --json`
- `version-sources-report.schema.json`: `mf version-sources --json`
- `docs-review-list.schema.json`: `mf docs review list --json`
- `explain-report.schema.json`: `mf explain <topic> --json`
- `verify-report.schema.json`: `mf verify --reason <event> --json`
- `change-verification-report.schema.json`: `mf verify --reason <event> --plan-only --json`

`commands.schema.json` accepts validation-only typed input metadata under an intent's `inputs`
table. These declarations are for future parameterized execution design and do not make an intent
runnable. A configured intent that declares inputs is rejected until typed execution, dry-run,
receipt, and redaction behavior are implemented together.

`commands.schema.json` also accepts `preconditions` planning metadata. Preconditions can report
missing paths or stale artifacts in dry-run, verification-plan, and explanation output, but
`satisfy_intent` is never executed implicitly as a dependency.

## Current Specifications

- `instruction-authority-v1.md`: effective rule resolution across user instructions, host policy, repository files, command contracts, and generated state.
- `command-contract-v1.md`: when a command intent is runnable through `mf run`.
- `verification-receipt-v1.md`: the latest run receipt written by `mf run`.
- `state-retention-v1.md`: generated state, cache, receipt, and raw-output boundaries.

## Relationship to Installed Files

The specifications describe the behavior of installed files such as `AGENTS.md`,
`.mustflow/docs/agent-workflow.md`, `.mustflow/config/mustflow.toml`, and
`.mustflow/config/commands.toml`.

If a specification and current behavior disagree, treat that as a bug to fix in
the implementation or documentation. Do not use a specification to override
current user instructions, host safety gates, or the nearest installed mustflow
root.
