---
mustflow_doc: skill.failure-triage
locale: en
canonical: true
revision: 1
name: failure-triage
description: Apply this skill when a configured command intent or verification step fails.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
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

## Procedure

1. Preserve the original failing intent name.
2. Analyze the first actionable error.
3. Determine if the failure originates from code, tests, configuration, documentation, or the environment.
4. Examine the most relevant files.
5. Develop a single hypothesis and verify it using the most targeted configured intent.

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
