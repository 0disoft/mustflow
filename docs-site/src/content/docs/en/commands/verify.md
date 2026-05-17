---
title: mf verify
description: Runs configured verification intents selected by required_after metadata.
---

`mf verify --reason <event>` looks at `.mustflow/config/commands.toml`, finds command intents whose `required_after` list contains the given reason, and runs only the intents that are configured, one-shot, agent-allowed, closed-stdin commands.

`mf verify --from-classification <path>` reads verification reasons from a JSON file inside the mustflow root. The file must be a mustflow classify report with `schema_version: "1"`, `command: "classify"`, the current `mustflow_root`, and `summary.validationReasons`. This keeps hand-written loose JSON from silently selecting runnable verification commands. `--from-plan` remains available as a compatibility alias during the naming transition.

`mf verify --changed` classifies the current Git working tree with the same semantics as `mf classify --changed`, then feeds those validation reasons into the verification selection model. Prefer `mf classify --changed --write <path>` when a tool needs a durable classification report. `--write-plan <path>` remains available as a compatibility option on `mf verify --changed`.

`mf verify --plan-only --json` prints the verification plan without running commands. The output includes a stable `verification_plan_id` plus a `decision_graph` that links changed surfaces, classification reasons, command candidates, eligibility checks, effects, and gaps. When a fresh local index exists, each scheduled entry can include `effectGraph` details from `.mustflow/cache/mustflow.sqlite`, including write locks and lock conflicts. Each `effectGraph` is marked `authority: "explanation_only"` and `grantsCommandAuthority: false`. Requirements can also include `surfaceReadModels` metadata that explains which indexed path-surface rule matched the changed files. Missing or stale indexes show a refresh hint and never change command selection or execution authority.

When `mf verify` actually runs commands, it uses the same schedule model as plan-only output and executes `schedule.entries` serially through `mf run` receipts. The verify output, verify bundle manifest, latest pointer, and per-intent receipts share the same `verification_plan_id`.

Before writing the latest pointer, `mf verify` compares the previous verify summary with the current plan. If the previous summary has the same `verification_plan_id` and both runs are still unresolved (`failed`, `blocked`, or `partial`), the completion verdict records a repeated failure risk instead of letting the new run look like a fresh completion claim.

## Selection Rules

- Matching uses the exact `required_after` reason string.
- Classification files must stay inside the mustflow root, must be JSON, and must use the supported `mf classify` report shape.
- `--changed` uses current Git status paths; it does not make any command runnable.
- Optional `.mustflow/config/test-selection.toml` rules may add project-declared related-test
  candidates for matched changed files, but those rules can only point to command intents already
  declared in `commands.toml`.
- `--write-plan` is available only with `--changed`, and remains a compatibility way to write the same classification report.
- Runnable intents are executed through the same safety path as `mf run <intent>`.
- Unknown, manual-only, long-running, blocked, or incomplete intents are not guessed; they are reported as skipped.
- If no intents match the reason, the result is `blocked`.

## Examples

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
npx mf verify --changed --plan-only --json
npx mf classify --changed --write .mustflow/state/change-classification.json
npx mf verify --from-classification .mustflow/state/change-classification.json --json
npx mf verify --reason bug_fix --repro-evidence repro-evidence.json --json
npx mf verify --reason code_change --external-evidence external-evidence.json --json
```

## JSON Fields

```sh
npx mf verify --reason code_change --json
```

Machine-readable output uses these fields:

- `schema_version` (`string`): Verify report format version.
- `command` (`string`): Always `verify`.
- `mustflow_root` (`string`): Resolved mustflow root.
- `reason` (`string`): Requested `required_after` reason, or a comma-separated summary of plan reasons.
- `reasons` (`string[]`): Verification reasons used to select command intents.
- `plan_source` (`string | null`): JSON classification path when `--from-classification` or `--from-plan` was used, `changed` when `--changed` was used, or `null` for `--reason`.
- `verification_plan_id` (`string`): Stable SHA-256 identifier for the verification plan that selected the run.
- `status` (`string`): `passed`, `partial`, `failed`, or `blocked`.
- `completion_verdict` (`object`): Evidence-based completion verdict. It grades the inspected
  verify evidence as `verified`, `partially_verified`, `unverified`, `blocked`, or `contradicted`;
  it does not prove semantic completion beyond selected receipts, skipped checks, and gaps.
- `evidence_model` (`object`): Machine-readable links among requirements, candidate intents,
  selected run receipts, skipped checks, gaps, remaining risks, and the verdict explanation. Its
  `coverage_matrix` conservatively maps each requirement-like criterion to `covered`,
  `partially_covered`, `uncovered`, `blocked`, or `contradicted` with explicit evidence links.
  If a fresh local index reports a high-risk source anchor on a changed file as `changed`, `review`,
  or `stale`, `completion_verdict` is downgraded from `verified` until the invariant risk is reviewed.
  If the classification report is broader than the conservative scope budget, such as more than
  eight changed files, more than four public surfaces, or more than three change-kind families,
  `completion_verdict` is also downgraded until the broad scope is reviewed.
  If the latest previous verify summary has the same unresolved `verification_plan_id`,
  `completion_verdict.evidence.repeated_failure_count` records that repeated failure and
  `evidence_model.remaining_risks` asks for new evidence or a narrower hypothesis.
  Changed test files that are deleted or contain `.skip` or `.only` markers add
  `validation_ratchet_risk_count` and keep the verdict below `verified` until the weakened
  validation risk is reviewed.
  `--repro-evidence <path>` can attach a repository-local JSON summary with `command:
  "repro-evidence"`. The summary records the reported symptom, expected behavior, observed
  behavior, original reproduction, before-fix evidence, after-fix evidence, and regression guard.
  Evidence items use `status: "present"`, `status: "unavailable"` with a reason, or
  `status: "missing"`. Missing fields keep the completion verdict below `verified` even when the
  selected local command receipts passed.
  `--external-evidence <path>` can attach a repository-local JSON summary with `command:
  "external-evidence"` and a `checks` array. These checks appear as `external_checks` with
  `authority: "supporting_only"`. They can downgrade a verdict when they are failed, cancelled, or
  unknown, but they do not select commands, authorize commands, or replace local run receipts.
- `summary` (`object`): Counts for matched, ran, passed, failed, and skipped intents.
- `run_dir` (`string`): Verify bundle directory containing the manifest and per-intent receipts.
- `manifest_path` (`string`): Verify bundle manifest path.
- `results` (`object[]`): Per-intent run or skip results.
- `results[].verification_plan_id` (`string | null`): The plan identifier for a run result, or `null` for skipped results.
- `results[].receipt_path` (`string | null`): Per-intent receipt path when the result ran and produced a receipt.
- `results[].receipt_sha256` (`string | null`): SHA-256 digest for the written per-intent receipt.

For `--plan-only --json`, the output uses the change verification report schema. Its `verification_plan_id` field is computed from the changed-file classification, selected verification model, related command contract entries, schedule policy, and test-selection report. Its `decision_graph` field is the shared evidence model for changed surfaces, classification reasons, command candidates, eligibility, effects, and gaps. Its `schedule.entries[].effectGraph` field, when present, is read-only local-index metadata for explaining locks and conflicts. The graph includes `commandAuthority: ".mustflow/config/commands.toml"` to make clear that the index describes command effects but cannot make an intent runnable. Its `requirements[].surfaceReadModels` field, when present, is read-only local-index metadata for explaining the path-surface rule behind a verification reason.

## Exit Codes

- `0`: All selected runnable intents passed and no selected intents were skipped.
- `1`: Verification failed, was partial, was blocked, or input was invalid.
