---
mustflow_doc: skill.failure-triage
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: failure-triage
description: Apply this skill when a configured command intent or verification step fails.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.failure-triage
  command_intents:
    - mustflow_check
---

# Failure Triage

## Purpose

Identify the most probable root cause of a failed command or verification step before modifying files.

## Use When

- A configured command intent returns a non-zero exit code.
- Validation, build, test, or documentation checks fail.
- The root cause of the failure is not yet apparent.

## Do Not Use When

- The failure is fully understood and a targeted fix is available.
- The user has requested only a high-level summary.

## Required Inputs

- Original command intent
- Exit code
- Truncated stdout and stderr output
- Recently modified files
- Relevant command contract entry

## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

## Allowed Edits

- Keep edits within the scope described by this skill, the user request, and the matching route in `.mustflow/skills/INDEX.md`.
- Do not broaden command permission, invent project facts, or change unrelated workflow files.

## Procedure

1. Preserve the original failing intent name.
2. Analyze the first actionable error.
3. Determine if the failure originates from code, tests, configuration, documentation, or the environment.
4. Examine the most relevant files.
5. Develop a single hypothesis and verify it using the most targeted configured intent.

## Postconditions

- The expected output can be produced with clear evidence, executed command intents, skipped checks, and remaining risks.
- Any missing command intent, unknown input, or authority conflict is reported instead of hidden.

## Verification

Re-run the original failing intent when possible. If that is too broad, run the most targeted configured
intent that isolates the same failure area.

## Failure Handling

- Avoid bundling unrelated fixes.
- If the failure is due to missing tools, report the missing tool and the command that revealed the issue.
- If sensitive data appears in the output, cease copying raw output and summarize the information safely.

## Output Format

- Failing intent
- Probable root cause
- Evidence
- Fix applied or recommended
- Verification run
- Remaining risk
