---
mustflow_doc: skill.repro-first-debug
locale: es
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: repro-first-debug
description: Apply this skill when fixing a reported bug or confusing failure before the failure has a clear reproduction.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.repro-first-debug
  command_intents:
    - test_related
    - test_fast
    - mustflow_check
---

# Repro-First Debug

<!-- mustflow-section: purpose -->
## Purpose

Fix bugs from observed failure evidence instead of guessing at likely causes or adding broad tests before the issue is reproduced.

<!-- mustflow-section: use-when -->
## Use When

- A user reports a bug, broken behavior, confusing runtime result, or failed workflow.
- A failure is visible, but the smallest reproduction path is not yet clear.
- A fix could otherwise be based on speculation, stale assumptions, or a broad unrelated test run.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The failure is already reproduced and the root cause is clear enough for a targeted fix.
- The task is documentation-only and does not involve broken behavior.
- The user explicitly asks not to run or add verification.
- Reproduction would require unsafe production access, secrets, destructive actions, or external systems outside the repository contract.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Reported symptom, expected behavior, and observed behavior.
- Any pasted error text, screenshot detail, failing command intent, route, or UI action.
- Recently changed files or likely affected files.
- Existing tests, command intents, or manual reproduction notes related to the failure.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Start with diagnostic reads, focused reproduction notes, or the smallest relevant test adjustment.
- After the failure is reproduced or isolated, edit only the likely cause and directly related verification surface.
- Do not add broad defensive tests, unrelated refactors, or speculative abstractions just because a bug was reported.

<!-- mustflow-section: procedure -->
## Procedure

1. State the symptom in one sentence and separate expected behavior from observed behavior.
2. Locate the smallest existing command intent, test file, route, UI action, or function boundary that could reproduce the symptom.
3. Prefer existing targeted verification before adding a new test. If no targeted path exists, record the gap and create the smallest reproduction only when it is supported by the symptom.
4. Keep the first reproduction focused on one failing condition. Avoid turning the reproduction into a broad regression suite.
5. Inspect the source that controls the reproduced behavior and form one concrete cause hypothesis.
6. Apply the smallest fix that addresses the reproduced cause.
7. Re-run the reproduction path. If that path is unavailable or too broad, run the closest configured intent and report the limitation.
8. Report whether the original symptom was reproduced, what changed, which checks ran, and what risk remains.

<!-- mustflow-section: postconditions -->
## Postconditions

- The final report distinguishes reproduced evidence from assumptions.
- Any added test or reproduction note is tied to the reported failure, not to general coverage growth.
- Missing command intents, unavailable tools, or unsafe reproduction requirements are reported instead of hidden.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `test_related`
- `test_fast`
- `mustflow_check`

Prefer the original failing intent when it is narrower than the defaults above.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the symptom cannot be reproduced, stop speculative edits and report the closest evidence gathered.
- If verification is too broad or slow for the change, use the narrowest configured intent and name the skipped broader check.
- If output contains secrets or sensitive values, summarize the failure without copying the sensitive text.
- If the root cause points outside the repository or requires operator access, report the environment gate clearly.

<!-- mustflow-section: output-format -->
## Output Format

- Symptom and expected behavior
- Reproduction path or reproduction gap
- Probable cause and evidence
- Fix applied
- Command intents run
- Skipped checks and reasons
- Remaining risk
