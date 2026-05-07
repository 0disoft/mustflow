---
mustflow_doc: skill.code-review
locale: en
canonical: true
revision: 2
name: code-review
description: Use when reviewing code changes, scope, risks, or missing verification.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - test
    - test_related
    - test_audit
    - lint
---

# Code Review

## Purpose

Check whether a change matches the request and whether behavior risks or missing verification remain.

## Use When

- Code changes, diffs, pull requests, or regression risks need review.
- The main work is judging risk rather than implementing new behavior.

## Do Not Use When

- The task is only wording, translation, or formatting.
- There are no changed files or diffs to review.

## Required Inputs

- Changed files or diff
- User's review criteria
- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/commands.toml`

## Procedure

1. Inspect the changed file list.
2. Check for unrelated edits.
3. Check behavior, configuration, command, and documentation impact.
4. Review test relevance:
   - missing tests for new behavior
   - obsolete tests for removed behavior
   - duplicate tests that do not cover new risk
   - weakened assertions
   - snapshot updates without rationale
   - tests that force reintroduction of removed behavior
5. Confirm whether relevant command intents exist.
6. Record findings by severity.

## Verification

Follow `.mustflow/docs/agent-workflow.md#command-execution-policy`.

Related command intents:

- `test`
- `test_related`
- `test_audit`
- `lint`

Do not invent raw shell commands in the skill document.

## Failure Handling

- If a command intent is missing, manual only, disabled, or unknown, report that instead of guessing.
- Report skipped verification and remaining risk.
- Stop and report if secret or destructive-command risk appears.

## Output Format

- Summary
- Findings by severity
- Files reviewed
- Command intents run
- Command intents skipped with reasons
- Test relevance notes
- Remaining risk
