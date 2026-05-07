---
mustflow_doc: skill.failure-triage
locale: en
canonical: true
revision: 1
name: failure-triage
description: Use when a configured command intent or verification step fails.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - mustflow_check
---

# Failure Triage

## Purpose

Find the smallest likely cause of a failed command or verification step before changing files.

## Use When

- A configured command intent exits non-zero.
- Validation, build, test, or documentation checks fail.
- The failure cause is not yet clear.

## Do Not Use When

- The failure is already fully understood and a focused fix is available.
- The user only asked for a high-level summary.

## Required Inputs

- Original command intent
- Exit code
- Bounded stdout and stderr tail
- Recent changed files
- Relevant command contract entry

## Procedure

1. Preserve the original failing intent name.
2. Read the first actionable error.
3. Identify whether the failure is code, test, configuration, documentation, or environment.
4. Inspect the smallest relevant files.
5. Form one hypothesis and test it with the smallest configured verification.

## Verification

Re-run the original failing intent when possible. If that is too broad, run the smallest configured
intent that proves the same failure area.

## Failure Handling

- Do not stack unrelated fixes.
- If the failure depends on missing tools, report the missing tool and the command that revealed it.
- If secret data appears in output, stop copying output and summarize safely.

## Output Format

- Failing intent
- Likely cause
- Evidence
- Fix applied or recommended
- Verification run
- Remaining risk
