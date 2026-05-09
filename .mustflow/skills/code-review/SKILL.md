---
mustflow_doc: skill.code-review
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: code-review
description: Apply this skill when reviewing code changes, scope, risks, or verification gaps.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.code-review
  command_intents:
    - test
    - test_related
    - test_audit
    - lint
---

# Code Review

<!-- mustflow-section: purpose -->
## Purpose

Verify that a change aligns with the request and ensure that no behavioral risks or verification gaps persist.

<!-- mustflow-section: use-when -->
## Use When

- Code changes, diffs, pull requests, or potential regression risks require review.
- The primary objective is risk assessment rather than implementing new behavior.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task involves only wording, translation, or formatting changes.
- No changed files or diffs are available for review.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Modified files or diffs
- User-specified review criteria
- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/commands.toml`

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep edits within the scope described by this skill, the user request, and the matching route in `.mustflow/skills/INDEX.md`.
- Do not broaden command permission, invent project facts, or change unrelated workflow files.

<!-- mustflow-section: procedure -->
## Procedure

1. Review the list of modified files.
2. Identify any unrelated or extraneous edits.
3. Assess the impact on behavior, configuration, commands, and documentation.
4. Review test relevance:
   - missing tests for new functionality
   - obsolete tests for removed functionality
   - redundant tests that fail to address new risks
   - weakened or insufficient assertions
   - snapshot updates lacking a clear rationale
   - tests that inadvertently reintroduce removed behavior
5. Verify the existence of relevant command intents.
6. Document findings categorized by severity.

<!-- mustflow-section: postconditions -->
## Postconditions

- The expected output can be produced with clear evidence, executed command intents, skipped checks, and remaining risks.
- Any missing command intent, unknown input, or authority conflict is reported instead of hidden.

<!-- mustflow-section: verification -->
## Verification

Follow `.mustflow/docs/agent-workflow.md#command-execution-policy`.

Related command intents:

- `test`
- `test_related`
- `test_audit`
- `lint`

Avoid introducing raw shell commands; reference the command intent names defined in `.mustflow/config/commands.toml`.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a command intent is missing, restricted to manual execution, disabled, or unknown, report the status rather than guessing.
- Document any skipped verifications and the associated remaining risks.
- Immediately halt and report if sensitive data or destructive command risks are identified.

<!-- mustflow-section: output-format -->
## Output Format

- Summary
- Findings categorized by severity
- List of reviewed files
- Command intents executed
- Skipped command intents and justifications
- Notes on test relevance
- Identified remaining risks
