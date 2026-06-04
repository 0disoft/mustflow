---
mustflow_doc: skill.public-json-contract-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: public-json-contract-change
description: Apply this skill when public machine-readable JSON, JSONL, schema-backed reports, stdout/stderr machine output, exit-code semantics tied to JSON output, compatibility fixtures, or documented automation-facing JSON contracts are created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.public-json-contract-change
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Public JSON Contract Change

<!-- mustflow-section: purpose -->
## Purpose

Protect automation consumers from silent JSON, JSONL, stream, schema, fixture, and exit-code drift.

<!-- mustflow-section: use-when -->
## Use When

- A command, report, exported file, package artifact, template, fixture, or documented example exposes JSON or JSONL to scripts, tests, schemas, dashboards, release checks, or other non-human consumers.
- A change adds, removes, renames, retypes, reclassifies, or documents a JSON field, JSONL packet, status value, schema version, path field, timestamp field, error shape, or compatibility fixture.
- A command's `--json`, `--jsonl`, `--format json`, schema-backed report, stdout/stderr split, or exit-code behavior changes.
- A compatibility claim depends on old fixtures, schema validation, package inclusion, or examples that users may parse.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The JSON is private in-process data with no public CLI, package, schema, fixture, template, documentation, or test contract.
- The task changes only human-readable CLI text, color, help wording, warnings, or deprecations; use `cli-output-contract-review`.
- The JSON is an HTTP, OpenAPI, GraphQL, RPC, or SDK request/response contract; use `api-contract-change`.
- The task is only a broad template or docs alignment check with no JSON contract; use `contract-sync-check` or a narrower template skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Affected command, report, package artifact, fixture, or file path.
- Output modes: human text, JSON, JSONL, stdout, stderr, redirected or piped behavior, and terminal-only formatting.
- Exit-code expectations for success, partial success, validation failure, blocked, skipped, deprecated, and internal-error states.
- Current schema files, schema ids, schema versions, status enums, JSONL packet types, docs examples, package inclusion lists, tests, and old compatibility fixtures.
- Producer code, downstream parser or validator code when present, and known automation consumers.
- Compatibility policy or release expectation, including whether a break requires a version bump, deprecation period, or explicit migration note.
- Relevant command-intent entries for related tests, docs validation, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Existing JSON tests, schemas, docs examples, package fixtures, and compatibility fixtures have been inspected before changing the contract.
- Command execution remains governed by `.mustflow/config/commands.toml`; this skill does not authorize raw commands.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update JSON producer code, schema files, fixtures, package inclusion metadata, docs examples, tests, and templates that describe the same public contract.
- Add optional fields, compatibility aliases, deprecation metadata, or explicit schema-version notes when they preserve consumers.
- Do not silently remove, rename, retype, require, reinterpret, or move public JSON fields.
- Do not mix prose, colors, progress text, or terminal controls into JSON stdout or JSONL streams.
- Do not route machine-readable results, diagnostics, and errors to streams inconsistently with the documented contract.
- Do not treat a snapshot or golden file as sufficient proof for JSON compatibility without field, stream, exit-code, and schema assertions.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify every public machine-readable surface: command output mode, JSON object fields, JSONL packet types, stdout, stderr, exit code, schema file, fixture, package artifact, docs example, template copy, and compatibility fixture.
2. Name the source of truth for the contract. Prefer explicit schemas and producer code for JSON shape, command code for exit status and streams, and package metadata for installed fixture availability.
3. Map each contract surface to its consumer: human reader, script, parser, schema validator, release test, installed template, docs example, dashboard, or downstream repository.
4. Classify the change as internal-only, additive-compatible, corrective-compatible, deprecating, compatibility-sensitive, or breaking.
5. Treat these as compatibility-sensitive by default: required field addition, field removal, field rename, field type change, enum or status meaning change, constraint strengthening, object-to-array or array-to-object change, null versus missing-field change, timestamp format change, path normalization change, schema-version change, JSONL packet-type change, stream-routing change, and exit-code meaning change.
6. Keep machine output pure. JSON stdout must contain parseable JSON only; JSONL must contain one structured JSON object per line; diagnostics, warnings, debug notes, and progress belong on stderr unless the contract says otherwise.
7. Check JSONL finality. Streaming output should expose stable packet kinds and a final packet that carries completion status, timestamp semantics, and any partial, blocked, skipped, deprecated, or unverified state.
8. Preserve exit-code meaning. A zero exit code should mean the command's public contract succeeded, not merely that a sub-step executed. Nonzero category changes are breaking unless the repository declares otherwise.
9. Compare old and new fixtures when compatibility matters. If a `tests/fixtures/schema-backcompat/<version>/public-json-fixtures.json` style fixture exists, keep it parseable and update validation expectations without erasing historical shape.
10. Use snapshot and golden-output files only as review aids. Add or preserve assertions for field presence, primitive types, enum values, null versus missing semantics, stream split, exit code, and schema validation where existing test structure supports it.
11. Synchronize schemas, fixtures, examples, package file lists, docs, templates, and release notes when the contract changes. If a surface is intentionally stale or deferred, record why.
12. Route version impact through the repository versioning policy when the change is breaking, deprecating, package-visible, or template-visible.
13. Verify with the narrowest configured command intents that cover JSON contract, docs, package, and mustflow metadata changes.

<!-- mustflow-section: postconditions -->
## Postconditions

- Public JSON and JSONL contracts, schemas, fixtures, package metadata, docs examples, stream routing, and exit-code meanings agree.
- Compatibility-sensitive changes are explicitly classified.
- Any skipped backcompat, schema, stream, exit-code, package, docs, or template surface is named with risk.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use broader configured tests when the JSON producer is cross-cutting or no narrower related test covers schema, stream, fixture, and exit-code behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If old fixtures fail, treat the failure as contract drift until the fixture is proven obsolete.
- If no schema exists for public JSON, preserve existing tests and report the missing schema rather than inventing an unrequested schema system.
- If only human-output snapshots cover JSON behavior, add focused coverage when the repository test policy supports it or report the missing proof.
- If stdout and stderr are mixed in machine mode, fix stream routing before claiming automation compatibility.
- If compatibility is intentionally broken, report affected consumers and version impact before finalizing.

<!-- mustflow-section: output-format -->
## Output Format

- Public JSON or JSONL contract changed
- Source of truth used
- Compatibility classification
- Fields, packet types, status meanings, streams, and exit codes reviewed
- Schemas, fixtures, docs, tests, packages, and templates synchronized
- Backcompat fixture coverage checked or missing
- Command intents run
- Skipped checks and reasons
- Remaining JSON contract risk
