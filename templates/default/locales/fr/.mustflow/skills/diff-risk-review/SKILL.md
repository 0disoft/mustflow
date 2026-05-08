---
mustflow_doc: skill.diff-risk-review
locale: fr
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: diff-risk-review
description: Apply this skill when changed files need risk classification, verification selection, and rollback notes before final reporting.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.diff-risk-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - test
    - test_related
    - test_audit
    - lint
    - build
    - docs_validate
    - mustflow_check
---

# Diff Risk Review

## Purpose

Classify the risk of a completed change, choose the smallest relevant configured verification, and record rollback notes without expanding into a broad code review or speculative refactor.

## Use When

- A change touches more than one public surface, workflow file, command contract, template, generated map, test, or documentation area.
- The user asks for the next roadmap slice, a completed change summary, a pre-commit check, or a risk-aware final report.
- Verification breadth is unclear and the agent must decide between targeted, docs-only, build, strict check, or full test intents.
- A change has potential rollback concerns because it affects installed templates, package metadata, generated files, user-facing docs, command behavior, security-sensitive paths, or data-handling rules.

## Do Not Use When

- The task is only to perform a detailed code review with findings; use `code-review` instead.
- No diff or changed-file list is available.
- The change is a trivial wording edit that is already covered by a more specific documentation or translation procedure.
- The user explicitly asks not to review risk or verification scope.

## Required Inputs

- Current changed-file list or diff summary.
- User task goal and any acceptance criteria.
- `.mustflow/config/commands.toml` command intent statuses.
- `.mustflow/config/preferences.toml` verification-selection settings.
- Relevant skill or context documents for the changed surfaces.

## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

## Allowed Edits

- Keep edits within the scope described by this skill, the user request, and the matching route in `.mustflow/skills/INDEX.md`.
- Do not broaden command permission, invent project facts, change unrelated files, or add new abstractions only because a risk was noticed.

## Procedure

1. Read the changed-file list and diff summary before judging risk.
2. Group changed files by surface:
   - source or runtime behavior
   - tests and fixtures
   - command contract or workflow policy
   - installed template files
   - package, release, or version metadata
   - public documentation
   - generated maps or local state
   - security, privacy, data, migration, or external integration boundaries
3. Assign a risk level:
   - `low`: wording, translation, or isolated documentation with matching docs validation
   - `medium`: templates, tests, package metadata, generated maps, or workflow docs without runtime behavior changes
   - `high`: runtime behavior, command execution, security, privacy, data handling, migrations, release behavior, or multi-surface changes
4. Identify the minimum relevant configured verification intents. Prefer the narrowest configured intents that cover the changed surfaces, but do not hide missing, unknown, manual-only, or skipped intents.
5. Record rollback notes for any changed installed template, command contract, package version, generated file, migration-like change, or public behavior change.
6. Check for scope drift: unrelated files, invented facts, unnecessary abstractions, weakened validation, or unreported generated-file refreshes.
7. Produce a concise risk and verification summary. Use `code-review` only if findings require a full review-style report.

## Postconditions

- The expected output can be produced with clear evidence, executed command intents, skipped checks, and remaining risks.
- Any missing command intent, unknown input, or authority conflict is reported instead of hidden.
- The final report can explain why each verification intent was run or skipped.

## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `mustflow_check`
- `docs_validate`
- `build`
- `test_related`
- `test`
- `test_audit`
- `lint`

Do not infer missing commands. If `test_related`, `test_audit`, or `lint` is unknown or manual-only, report the status and choose the next configured intent that covers the risk.

## Failure Handling

- If the changed-file list is unavailable, run or request a configured status intent before classifying risk.
- If a configured verification fails, switch to `failure-triage` for that failing intent.
- If the risk level is high but the matching verification intent is missing, report the gap instead of downgrading risk.
- If generated files such as `REPO_MAP.md` are stale, refresh them only through their configured intent.

## Output Format

- Changed surfaces
- Risk level and reason
- Minimum relevant verification
- Command intents run
- Skipped command intents and reasons
- Rollback notes
- Scope drift or generated-file notes
- Remaining risk
