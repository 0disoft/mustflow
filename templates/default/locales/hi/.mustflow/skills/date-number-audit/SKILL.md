---
mustflow_doc: skill.date-number-audit
locale: hi
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: date-number-audit
description: Apply this skill when a task creates, edits, or reports dates, versions, counts, durations, limits, metrics, benchmarks, prices, percentages, or other numeric facts.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.date-number-audit
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Date and Number Audit

<!-- mustflow-section: purpose -->
## Purpose

Prevent code, docs, tests, and final reports from inventing, copying stale, or mis-synchronizing dates and numeric facts.

<!-- mustflow-section: use-when -->
## Use When

- A change adds, edits, removes, or reports a date, deadline, release version, count, duration, timeout, limit, quota, size, percentage, price, benchmark, score, coverage value, or generated-file total.
- Documentation summarizes how many commands, files, pages, templates, locales, tests, checks, or supported items exist.
- A final report or user-facing message depends on a number that may drift after code, template, package, docs, or generated-output changes.
- A failing check suggests a stale revision, mismatched version, wrong count, outdated date, or inconsistent numeric threshold.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The number is a local variable, loop index, enum value, or test fixture with no public or cross-file meaning.
- The task only preserves existing numeric text without relying on it.
- A specialized skill for release versioning, dependency reality, artifact integrity, or source freshness is the narrower match.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The date or numeric fact and every surface that states, derives, or validates it.
- The source of truth for the value, such as package metadata, template metadata, schema, code constant, generated output, test assertion, or current command result.
- The acceptable precision and wording when a value is approximate, sampled, local-only, or time-sensitive.
- Relevant command-intent contract entries for docs, packaging, build, or mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Align dates and numeric facts across source files, generated metadata, tests, documentation, and final reports.
- Replace exact numbers with bounded or source-linked wording when exactness is not stable.
- Do not invent a number to make a document feel complete.
- Do not change behavior thresholds, timeouts, limits, or release versions unless the task and source of truth support the change.

<!-- mustflow-section: procedure -->
## Procedure

1. List the date or numeric facts that the task creates, edits, or reports.
2. Identify the source of truth for each value before changing dependent surfaces.
3. Search related code, templates, docs, schemas, tests, and generated metadata for duplicate statements of the same value.
4. Update dependent surfaces from the source of truth, or mark the value as approximate, local, sampled, or unverified when exact verification is unavailable.
5. Keep version numbers, template revisions, schema revisions, locale source revisions, package assertions, and public examples synchronized.
6. Prefer phrasing such as "about", "currently", "at the time of this check", or "from the latest generated output" only when that uncertainty is true and useful.
7. Run the narrowest configured verification that proves the value and dependent surfaces still agree.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every public or cross-file date and numeric fact has a named source of truth or an explicit uncertainty note.
- Tests and metadata that assert numbers are synchronized with the changed source.
- The final report names any values that were intentionally left approximate or unverified.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a narrower configured test, build, or docs intent when it better proves the changed numeric surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If two sources disagree, do not guess. Identify the higher-authority source or report the conflict.
- If a value depends on time, network state, package registry state, generated output, or external data that was not refreshed, state that boundary.
- If an exact number is unnecessary and expensive to keep current, rewrite the statement to avoid brittle precision.
- If changing a number affects behavior, activate the relevant code, test, release, or dependency skill before continuing.

<!-- mustflow-section: output-format -->
## Output Format

- Dates or numeric facts audited
- Source of truth for each value
- Surfaces synchronized
- Exact values changed or made approximate
- Command intents run
- Skipped checks and reasons
- Remaining date or numeric risk
