# mustflow JSON Schemas

This directory contains versioned JSON Schema contracts for machine-readable  
mustflow files and command output.

Current schemas:

- `doctor-report.schema.json`: output of `mf doctor --json`
- `adapter-compatibility-report.schema.json`: output of `mf adapters status --json`
- `context-report.schema.json`: output of `mf context --json`, including context trust metadata, prompt-cache profiles, and optional cache audit data
- `workspace-summary.schema.json`: output of `mf api workspace-summary --json`
- `command-catalog.schema.json`: output of `mf api command-catalog --json`
- `verification-plan.schema.json`: output of `mf api verification-plan --changed --json`, including
  risk-priced evidence assessment for the changed surfaces, selected command contract, and optional
  read-only script-pack helper suggestions
- `latest-evidence.schema.json`: output of `mf api latest-evidence --json`
- `diff-risk.schema.json`: output of `mf api diff-risk --changed --json`, including a read-only
  complexity budget for structural additions
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
  changed-file verification gaps, read-only command recommendations, and optional read-only
  script-pack helper suggestions
- `evidence-report.schema.json`: output of `mf evidence --changed --json`, containing verification
  requirements, risk-priced evidence assessment, latest bounded evidence, failure replay capsules,
  conflict ledgers, receipts, remaining risks, and gaps without running commands
- `workspace-status.schema.json`: output of `mf workspace status --json`, containing configured
  workspace roots, discovered nested repositories, and per-root command-contract readiness without
  granting command authority
- `workspace-command-catalog.schema.json`: output of `mf workspace command-catalog --json`,
  containing per-root command intent availability, safe `mf run` entrypoints, and no raw command
  strings
- `workspace-verification-plan.schema.json`: output of
  `mf workspace verify --changed --plan-only --json`, containing per-root changed-file
  verification plans and risk-priced evidence assessment without running commands or granting
  parent-to-child command authority
- `dashboard-export.schema.json`: bounded static export written by `mf dashboard --export-json <path>`,
  including output policy, redaction and truncation metadata, the dashboard harness report, and
  the evidence-based completion verdict, conflict ledger, complexity budget, evidence model, and
  conservative coverage matrix for the exported snapshot
- `classify-report.schema.json`: output of `mf classify --changed --json` and  
  `mf classify <path...> --json`
- `impact-report.schema.json`: output of `mf impact --changed --json` and  
  `mf impact <path...> --json`
- `line-endings-report.schema.json`: output of `mf line-endings check --json` and  
  `mf line-endings normalize --json`
- `quality-gaming-report.schema.json`: output of `mf quality check --json`, containing changed-file
  quality-gaming risks such as line stuffing, validation suppressions, test bypass markers, type
  escapes, generated/vendor logic, empty catch swallowing, and placeholder implementations
- `script-pack-catalog.schema.json`: output of `mf script-pack list --json`, containing bundled
  script-pack ids, script refs, action names, usage strings, workflow phases, read-only and
  side-effect flags, input and output capability labels, related skill names, cost and risk hints,
  and associated report schemas
- `script-pack-suggestion-report.schema.json`: output of `mf script-pack suggest --json`, containing
  path, skill, phase, and changed-file evidence used to recommend optional script-pack helpers
- `code-outline-report.schema.json`: output of
  `mf script-pack run code/outline scan <path...> --json`, containing a bounded source outline with
  file hashes, language metadata, symbol names, declaration kinds, line ranges, signatures, export
  flags, source-anchor navigation metadata, static return metadata, and stable input-limit finding
  codes
- `code-symbol-read-report.schema.json`: output of
  `mf script-pack run code/symbol-read read <path> --start-line <line> --json`, containing a
  focused source snippet selected by source anchor, outline symbol line, or explicit line range with
  file hash, resolved line metadata, optional anchor, symbol and static return metadata, and stable
  range/read finding codes
- `route-outline-report.schema.json`: output of
  `mf script-pack run code/route-outline scan <path...> --json`, containing a bounded Hono,
  Elysia, and Axum route outline with file hashes, framework evidence, route methods, route paths,
  optional handler names, line ranges, lifecycle-chain metadata, and stable input-limit finding codes
- `export-diff-report.schema.json`: output of
  `mf script-pack run code/export-diff compare [path...] --json`, containing a bounded git-based
  comparison of exported TypeScript and JavaScript declarations, signatures, return metadata,
  package surface hints, and unresolved re-export findings
- `reference-drift-report.schema.json`: output of
  `mf script-pack run docs/reference-drift check [path...] --json`, containing checked
  documentation references to `mf` commands, script-pack refs, schema files, repository paths,
  and stable stale-reference finding codes
- `config-chain-report.schema.json`: output of
  `mf script-pack run repo/config-chain inspect <path...> --json`, containing nearby package,
  TypeScript, ESLint, Prettier, Vite, Vitest, Tailwind, Jest, Playwright, and mustflow config files
  with static inheritance, reference, workspace, dynamic-config, path, and content-hash metadata
- `text-budget-report.schema.json`: output of
  `mf script-pack run core/text-budget check <path...> --json`, containing
  exact text-budget metrics, input content hashes, policy metadata, findings, and JSON Pointer field
  checks for bounded user-facing strings and generated text
- `generated-boundary-report.schema.json`: output of
  `mf script-pack run repo/generated-boundary check <path...> --json`, containing candidate path
  classifications for generated, ignored, protected, vendor, and cache boundaries before or after edits
- `related-files-report.schema.json`: output of
  `mf script-pack run repo/related-files map <path...> --json`, containing conservative related-file
  candidates from direct imports, importers, same-basename siblings, parent configuration files, and
  package boundaries for source-oriented repository navigation
- `skill-route-report.schema.json`: output of `mf skill route --json`, containing compact route
  candidates, selected main and adjunct skills, score breakdowns, route read plans, source route
  shards, and optional read-only script-pack helper suggestions without granting command authority
  or replacing selected `SKILL.md` reads
- `route-fixture.schema.json`: parsed `.mustflow/skills/route-fixtures.json`, containing strict
  skill-route golden cases with required and forbidden route expectations
- `latest-run-pointer.schema.json`: `.mustflow/state/runs/latest.json` when `mf verify` writes a
  pointer to the latest verify run bundle, including the verify completion verdict, evidence model,
  complexity budget, failure replay capsule, conflict ledger, and coverage matrix
- `handoff-validation-report.schema.json`: output of  
  `mf handoff validate <path> --json`
- `version-sources-report.schema.json`: output of `mf version-sources --json`
- `docs-review-list.schema.json`: output of `mf docs review list --json`
- `explain-report.schema.json`: output of `mf explain authority --json`, `mf explain command --json`,  
  `mf explain verify --reason <event> --json`, `mf explain retention --json`, `mf explain skills --json`,
  `mf explain surface --json`, and `mf explain why <target> --json`. Verify explanations include the shared
  `decisionGraph` evidence model; latest-failure explanations include bounded latest-run metadata only.
- `verify-report.schema.json`: output of `mf verify --reason <event> --json`, including an
  explicit execution aggregate, risk-priced evidence assessment, evidence-based completion verdict,
  failure replay capsule, conflict ledger, and evidence model with a read-only complexity budget and
  conservative coverage matrix for the selected receipts and skipped checks
- `verify-run-manifest.schema.json`: `.mustflow/state/runs/verify-*/manifest.json`, including
  the same execution aggregate, risk assessment, completion verdict, failure replay capsule,
  conflict ledger, evidence model, complexity budget, and coverage matrix as the verify report
- `change-verification-report.schema.json`: output of `mf verify --reason <event> --plan-only --json` and  
  `mf verify --from-classification <classify-report.json> --plan-only --json`, including the `decision_graph` that links
  changed surfaces, classification reasons, command candidates, eligibility, selected or not-selected state,
  effects, gaps, and risk-priced evidence requirements.
  Local-index command-effect graphs and command preconditions are explanation-only and cannot grant command authority.

These schemas define stable, automation-facing fields. Human-readable command  
output is intentionally excluded.

Current `classify`, `verify`, `run`, dashboard export, and verify state outputs may include
`correlation_id` so local artifacts from one work incident can be connected without storing raw
transcripts, environment values, or hidden reasoning.

The published schema surface is tracked in `src/core/public-json-contracts.ts`.  
Release tests verify consistency between this manifest, `schemas/*.schema.json`,  
`npm pack --dry-run --json`, and the installed package’s JSON command output.
