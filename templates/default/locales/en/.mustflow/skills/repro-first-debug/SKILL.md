---
mustflow_doc: skill.repro-first-debug
locale: en
canonical: true
revision: 2
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

Fix bugs through a tight diagnosis feedback loop instead of guessing at likely causes or adding broad tests before the issue is reproduced.

This skill keeps debugging anchored to symptom evidence, deterministic reproduction, explicit hypotheses, observed confirmation or rejection, the smallest fix, and the original reproduction path.

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
- Any known flakiness, environment dependency, timing dependency, or unavailable reproduction requirement.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Start with diagnostic reads, focused reproduction notes, or the smallest relevant test adjustment.
- Add temporary diagnostic instrumentation only when it has a unique marker and can be removed before final verification.
- After the failure is reproduced or isolated, edit only the likely cause and directly related verification surface.
- Do not add broad defensive tests, unrelated refactors, or speculative abstractions just because a bug was reported.
- Do not leave debug output, tracing probes, temporary logs, or diagnostic-only assertions in committed code unless the user explicitly asks for a durable diagnostic surface.

<!-- mustflow-section: procedure -->
## Procedure

1. State the symptom in one sentence and separate expected behavior from observed behavior.
2. Locate the smallest fast, deterministic reproduction path: an existing command intent, test file, route, UI action, fixture, or function boundary.
3. Prefer existing targeted verification before adding a new test. If no targeted path exists, record the gap and create the smallest reproduction only when it is supported by the symptom.
4. Keep the first reproduction focused on one failing condition. Avoid turning the reproduction into a broad regression suite.
5. If the cause is not obvious, list three to five plausible hypotheses. For each hypothesis, write the observation that would confirm or reject it before changing production code.
6. Inspect the source that controls the reproduced behavior and gather the smallest observation needed to choose between hypotheses.
7. If temporary instrumentation is needed, give every probe a unique marker, keep it local to the suspect boundary, and remove it before final verification.
8. Apply the smallest fix that addresses the reproduced cause.
9. Re-run the original reproduction path after the fix. If that path is unavailable or too broad, run the closest configured intent and report the limitation.
10. Add or keep a regression guard only when it is tied to the reproduced symptom or a directly observed boundary condition.
11. Report the symptom, reproduction, hypotheses considered, observations, fix, original reproduction rerun, checks, and remaining risk.

<!-- mustflow-section: postconditions -->
## Postconditions

- The final report distinguishes reproduced evidence from assumptions.
- Any added test or reproduction note is tied to the reported failure, not to general coverage growth.
- Cause hypotheses are confirmed, rejected, or left explicitly unresolved instead of being implied by a passing broad check.
- Temporary instrumentation and debug output are removed before final verification unless intentionally retained.
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
- If every hypothesis remains unconfirmed, stop and report the investigation boundary instead of shipping a speculative fix.
- If temporary instrumentation is still needed to understand the failure, keep it uncommitted or clearly report why it cannot be removed yet.
- If verification is too broad or slow for the change, use the narrowest configured intent and name the skipped broader check.
- If output contains secrets or sensitive values, summarize the failure without copying the sensitive text.
- If the root cause points outside the repository or requires operator access, report the environment gate clearly.

<!-- mustflow-section: output-format -->
## Output Format

- Symptom and expected behavior
- Reproduction path or reproduction gap
- Hypotheses considered and observations
- Probable cause, confidence, and evidence
- Fix applied
- Original reproduction rerun result
- Command intents run
- Skipped checks and reasons
- Remaining risk
