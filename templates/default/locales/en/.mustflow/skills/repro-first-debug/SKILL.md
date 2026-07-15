---
mustflow_doc: skill.repro-first-debug
locale: en
canonical: true
revision: 6
lifecycle: mustflow-owned
authority: procedure
name: repro-first-debug
description: Apply this skill when fixing, investigating, or instrumenting a reported bug, confusing failure, flaky symptom, production-only defect, unreproducible incident, or legacy-code failure before the failure has a clear reproduction.
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
- A failure is visible, intermittent, production-only, data-dependent, or reported from another environment, but the smallest reproduction path is not yet clear.
- A fix could otherwise be based on speculation, stale assumptions, or a broad unrelated test run.
- A safe temporary patch is needed to stop harm, but the change must also capture evidence for the next occurrence instead of only hiding the symptom.

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
- Available diagnostic evidence such as trace id, span id, request id, job id, attempt, feature flag, deployment version, log query, normal-versus-failing trace comparison, profiler window, breakpoint or watchpoint condition, and safe DB/cache/external dependency facts.
- Runtime state snapshot evidence when available: cache keys, DB row state, queue state, locks, in-flight work, timezone, environment/config values, server instance, feature flags, app version, browser/app version, region, release, and concurrent request count.
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
5. If the cause is not obvious, list three to five plausible hypotheses using distinct categories where possible:
   - recent code or contract change;
   - environment, platform, tool version, or missing dependency;
   - timing, ordering, concurrency, cache, or cleanup;
   - specific input, fixture, locale, path, or data shape;
   - external source, generated output, or stale build artifact.
   For each hypothesis, write the observation that would confirm or reject it before changing production code.
6. Reject symptom-cover patches before editing.
   - A null check, timeout increase, expected-value tweak, broad retry, catch-and-ignore, or local-line-only patch is not acceptable until the broken invariant and first divergence are named.
   - Before applying a patch, state which invariant failed, where the invariant first became false, and what no-patch observation proves that claim.
   - List counterexamples that could still fail after the obvious patch, especially concurrency, cache, time zone, retry/idempotency, schema/wire compatibility, security, and performance cases.
7. Build a diagnostic evidence packet when logs, traces, profiling, or breakpoints are involved.
   - Prefer normal-versus-failing trace comparison before reading only the final error log.
   - Tie evidence together with stable identifiers such as trace id, span id, request id, tenant id, job id, attempt, feature flag, and deployment version.
   - If timing or ordering may matter, prefer profiler, trace duration, lock wait, allocation, queue age, or dependency latency evidence before stopping the process with a broad breakpoint.
   - Use conditional instrumentation or breakpoints scoped to the failing id when configured or manually approved; do not leave those probes in committed code.
8. If the symptom appears flaky, separate the reproducible behavior from the unstable trigger. Do not treat one passing broad rerun as proof that the issue is fixed.
9. For unreproducible failures, switch from "make it fail locally" to "make the next failure leave evidence."
   - Capture a state snapshot, not just the input payload: relevant memory/cache state, DB rows, locks, queue messages, time zone, deployment version, feature flags, environment/config values, server instance, dependency versions, and concurrency shape when safe and available.
   - Prefer pre-failure ring buffers, bounded internal event trails, impossible-state assertions, invariant checks, DB constraints, background auditors, or sanity checkers that fire where the bad state is first created.
   - Temporary mitigation should also add forensic evidence such as caller, retry header, idempotency key, first and second handling time, state before and after, or safe resource identifiers.
10. Narrow production-only and legacy symptoms by evidence elimination.
   - Split last-known-good and first-failed windows across code, config, data, migration, infra, dependency, external-provider, and traffic-pattern changes.
   - Split mixed symptoms by error code, user cohort, browser, app version, region, server instance, time window, release, feature flag, and data shape before assuming one root cause.
   - Search stable constants, error strings, DB column names, event names, queue topics, config keys, and external endpoint fragments before trusting function names.
   - Start from exits and writers: DB writes, serialized responses, emitted events, emails, balance changes, files, queues, cron jobs, admin tools, and external side effects. Treat DB triggers, queues, cron, imports, and admin panels as code.
   - Use blame, linked commits, PRs, and same-commit file changes for historical context, not for assigning fault.
11. Stress hidden conditions deliberately when the repository has a configured or approved way to do so.
   - Suspect time, randomness, and concurrency first for "sometimes" failures.
   - Prefer fixed seeds, fake clocks, forced interleavings, latency injection, duplicate or reordered messages, worker kills, cache clears, slight time shifts, and concurrent requests over waiting for chance.
   - Minimize production data into a safe fixture by removing unrelated rows or events until the trigger disappears, then restore the last removed condition.
12. Inspect the source that controls the reproduced behavior and gather the smallest observation needed to choose between hypotheses.
13. If temporary instrumentation is needed, give every probe a unique marker, keep it local to the suspect boundary, and remove it before final verification unless the user explicitly wants durable diagnostics.
14. Apply the smallest fix that addresses the reproduced or instrumented cause. Keep behavior-preserving cleanup, characterization tests, bug fixes, and long-term refactors separate when the codebase is legacy or high-risk.
15. Re-run the original reproduction path after the fix. If that path is unavailable or too broad, run the closest configured intent and report the limitation.
16. For unreproducible fixes, define the "fixed" metric before claiming success: failure rate, invariant violation count, duplicate handling count, retry exhaustion count, DLQ growth, timeout rate, latency tail, or another symptom-specific measure.
17. Add or keep a regression guard only when it is tied to the reproduced symptom, the instrumented invariant, or a directly observed boundary condition.
18. Before calling the symptom a bug or regression, pass the evidence packet to
    `bug-claim-evidence-gate`. Keep trigger, allowed and actual results, applicable obligation,
    reachability, target responsibility, counterevidence, and open gaps explicit. A reproduction
    proves observed behavior, not by itself the authority of the expected result or the named cause.
19. Report the symptom, reproduction, hypotheses considered, observations, adjudication, evidence
    packet, fix, original reproduction rerun, checks, and remaining risk.

<!-- mustflow-section: postconditions -->
## Postconditions

- The final report distinguishes reproduced evidence from assumptions.
- Any added test or reproduction note is tied to the reported failure, not to general coverage growth.
- Cause hypotheses are confirmed, rejected, or left explicitly unresolved instead of being implied by a passing broad check.
- Symptom-cover patches are rejected unless they repair the named invariant and survive relevant counterexamples.
- Trace, log, profiler, breakpoint, DB, cache, and dependency evidence is correlated by stable identifiers when that evidence exists.
- Unreproducible defects are handled with next-failure evidence capture, state snapshots, bounded event trails, impossible-state monitors, and pre-declared fix metrics rather than a speculative local patch.
- Legacy-code investigations start from symptom exits, writers, stable strings, data flow, history, and code-outside-code surfaces before broad call-graph reading or cleanup.
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
- Diagnostic evidence packet and counterexamples considered
- State snapshot, next-failure capture, last-good or first-failed window, symptom split, and legacy narrowing evidence where relevant
- Probable cause, confidence, and evidence
- Fix applied
- Original reproduction rerun result
- Command intents run
- Skipped checks and reasons
- Remaining risk
