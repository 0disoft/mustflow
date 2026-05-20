---
mustflow_doc: skill.cli-output-contract-review
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: cli-output-contract-review
description: Apply this skill when CLI text output, JSON or JSONL output, exit codes, stderr/stdout routing, terminal coloring, progress output, error messages, warnings, deprecation notices, help text, examples, command aliases, schema-backed reports, or automation-facing command behavior are created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.cli-output-contract-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# CLI Output Contract Review

<!-- mustflow-section: purpose -->
## Purpose

Preserve the contract between CLI behavior and its human, JSON, schema, documentation, and automation consumers.

<!-- mustflow-section: use-when -->
## Use When

- A CLI command changes stdout, stderr, JSON fields, JSONL packets, report status, exit code, help text, examples, warning text, error text, color behavior, progress output, or deprecation wording.
- A command adds, removes, renames, aliases, or changes an option, argument, default, validation rule, or output mode.
- A schema-backed report, package test, public docs example, README snippet, or fixture depends on CLI output.
- A change claims that automation can treat a command result as success, failure, partial success, blocked, skipped, deprecated, or unavailable.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task changes only private helper functions and no CLI-visible behavior, docs, schemas, or tests.
- The output is a local debug note that is not part of a public command or installed workflow.
- The task only edits release notes; use `release-notes-authoring` unless command behavior itself changed.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The affected command, command tree, router or help metadata, options, arguments, aliases, output modes, stdout/stderr routing, terminal versus piped behavior, exit-code expectations, and current user-facing examples.
- Existing tests, schemas, fixtures, docs, README snippets, generated examples, and template files that mention the output.
- Whether consumers are humans, scripts, schema validators, dashboards, installed templates, or release automation.
- Whether color, progress indicators, tables, timestamps, numeric fields, JSONL status or debug packets, and nested JSON structures are part of the public contract.
- The repository-declared exit-code map, schema versioning policy, global flag policy, non-interactive behavior, snapshot or golden-output test policy, and compatibility expectations when they exist.
- Relevant command-intent entries for related tests, docs validation, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Existing output tests and schema contracts have been inspected before changing behavior.
- Command authority remains governed by `.mustflow/config/commands.toml`; this skill does not grant runnable intent permission.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update CLI output code, schemas, fixtures, docs, tests, and examples that describe the same behavior.
- Add deprecation notices, compatibility aliases, or stricter errors when they reduce ambiguity without hiding failure.
- Do not silently change JSON field names, JSONL packet types, status meanings, exit code semantics, or documented examples without synchronized tests.
- Do not send machine-readable JSON, parseable report data, or normal command results to the wrong stream.
- Do not include terminal color codes, progress spinners, cursor controls, or decorative symbols in JSON output or pipe-oriented plain text.
- Do not make human-readable wording imply command authority, verification success, or policy bypass.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify every output surface: human text, JSON fields, JSONL packets, stdout, stderr, exit code, help text, examples, aliases, global flags, error text, warning text, schema, docs, README, tests, and downstream dashboard or verification consumers.
2. Classify the change as additive, corrective, deprecating, breaking, internal-only, or documentation-only.
3. Inspect the command tree, router, or help metadata. Leaf commands should have clear syntax, realistic examples, documented output modes, and inherited global controls such as quiet, verbose, color-disable, or version flags when the repository supports them.
4. Check help and examples as contracts. Help text should describe arguments, output formats, exit behavior, and non-interactive use without placeholders or command-authority claims.
5. Separate human and machine consumers. JSON mode should emit parseable data without prose, colors, progress marks, or cursor controls; human mode may use tables or summaries only when they do not hide the same status semantics.
6. For JSONL or streaming machine output, define stable packet shapes such as status, debug, result, and final-summary events. Progress packets must remain structured data, and the final packet must make completion status and timestamp semantics explicit.
7. Check stream routing. Normal machine-readable results should use stdout, diagnostics and errors should use stderr, and mixed streams should be covered by tests or explicitly documented.
8. Preserve machine consumers first. Add fields before renaming or removing fields when compatibility matters, and keep status enums stable unless a versioned breaking change is intentional.
9. Check JSON contract shape. Preserve field names, primitive types, array/object shapes, timestamp format, schema versioning, and null versus missing-field semantics. Numbers should remain numbers unless a documented compatibility reason requires strings.
10. Keep JSON easy to consume. Avoid unnecessary nesting for common automation queries, but do not flatten away domain structure that schemas or existing consumers rely on.
11. Check schema evolution. Optional field additions are usually compatible; required field additions, field removal, field type changes, enum value removal, status meaning changes, and constraint tightening are compatibility-sensitive. Constraint widening is usually safe but still needs schema and fixture review.
12. Preserve exit-code meaning. A successful process exit should mean the command's final contract succeeded, not merely that a sub-step ran. Use the repository-declared exit-code map when one exists, keep exit codes in the 0 to 255 range, and treat nonzero category changes as breaking unless the repository has declared otherwise.
13. Make partial, blocked, skipped, deprecated, and unverified states explicit in human, JSON, and JSONL output.
14. Check terminal awareness. Color, progress bars, spinners, and table styling should be disabled or safely stripped for non-interactive, redirected, or JSON output. Respect repository-supported color-disable conventions when they exist.
15. Check prompts and interactive flows. Prompts must be avoidable, rejected, or replaced by explicit flags in non-interactive and machine-readable modes; a script should not hang waiting for a human response.
16. Keep error messages actionable. Include the failing input, stable error code or category when available, reason, and next safe action when available, but never include secrets, hidden reasoning, or raw environment values.
17. Avoid unexpected usage dumps and duplicate error spam. Framework default help output should not drown the real error unless the repository intentionally documents that behavior.
18. Align help text and examples with command authority. Examples may name command intents, but must not imply agents can bypass the configured contract.
19. Decide compatibility impact. Treat field removal or rename, field type changes, JSONL packet-type changes, status meaning changes, exit-code meaning changes, default output unit changes, and schema-version changes as compatibility-sensitive.
20. Verify output with a stable test environment when possible: capture stdout, stderr, and status separately; normalize known volatile paths, timestamps, colors, terminal width, locale, or time zone only when the test policy permits it.
21. Use snapshot or golden-output tests as review aids, not the only contract proof. Snapshot updates require explicit review, and machine-readable modes still need type, stream, exit-code, and schema assertions.
22. Use semantic schema diff tooling only when the repository already has a configured tool or intent for it. Do not introduce a new CLI test framework, schema-diff dependency, or snapshot update workflow just because a review checklist mentions one.
23. Synchronize schemas, fixtures, package tests, docs, and localized or template examples that depend on the output.
24. Verify with related tests first, then release or docs checks when schemas, package output, docs, or templates changed.

<!-- mustflow-section: postconditions -->
## Postconditions

- Human output, JSON or JSONL output, stdout/stderr routing, exit codes, schemas, docs, tests, and examples describe the same command behavior.
- Deprecations and compatibility aliases are explicit.
- Terminal-only formatting cannot leak into JSON or pipe-oriented output.
- Automation-facing success and failure meanings are verified or reported as unverified.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use broader configured tests when the command is cross-cutting or no narrower related test covers the output.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a schema or fixture fails, treat it as a contract mismatch until proven stale.
- If the command tree cannot be loaded directly, use the router, help tests, docs, and fixtures as the current source of truth and report the missing command-tree inspection surface.
- If a command has no output test, add focused coverage or report the missing coverage before claiming compatibility.
- If a test only snapshots human output, do not treat it as sufficient coverage for JSON, exit-code, stream-routing, or terminal-awareness contracts.
- If semantic schema diff or command-tree validation would require a new dependency or unconfigured command, report the missing validation surface instead of adding it opportunistically.
- If public docs cannot be synchronized in the same change, avoid claiming the output is documented.
- If compatibility is intentionally broken, route the version impact through the repository versioning policy and report the affected consumers.

<!-- mustflow-section: output-format -->
## Output Format

- CLI command and output surfaces reviewed
- Command tree, help text, examples, aliases, global flags, and non-interactive behavior checked
- Output classification: additive, corrective, deprecating, breaking, internal-only, or docs-only
- Human versus machine output split, stdout/stderr routing, terminal formatting, and pipe behavior checked
- JSON or JSONL packet contract, schema, field types, timestamp format, exit-code, and status semantics checked
- Snapshot, golden-output, semantic schema diff, or command-tree validation coverage checked or reported missing
- Schemas, fixtures, docs, tests, and templates synchronized
- Command intents run
- Skipped checks and reasons
- Remaining CLI-output contract risk
