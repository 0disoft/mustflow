---
mustflow_doc: skill.product-engagement-retention-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: product-engagement-retention-review
description: Apply this skill when a product adds or changes weekly value reports, usage summaries, time-saved claims, artifact recaps, streaks, attendance rewards, grace or recovery mechanics, abandoned-work reminders, completion nudges, notification timing, or engagement experiments and must distinguish durable user value from activity theater, reward farming, natural return, and notification harm.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.product-engagement-retention-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Product Engagement Retention Review

<!-- mustflow-section: purpose -->
## Purpose

Improve durable post-activation value without mistaking message opens, app launches, attendance,
streak preservation, reward claims, or natural return for retention. Keep value reports, streaks,
rewards, and abandoned-work reminders as separate mechanisms with separate eligibility, causal
evidence, quality guardrails, and stop conditions.

<!-- mustflow-section: use-when -->
## Use When

- A product sends a weekly or periodic report of completed work, generated artifacts, usage, saved
  time, progress, outcomes, or value delivered.
- A product introduces attendance, consecutive-use records, streak freezes, grace days, recovery,
  wagers, badges, credits, points, or other rewards for recurring behavior.
- A user abandons a draft, setup, import, generation, analysis, checkout-like product task, or other
  resumable work and the product considers a reminder after a delay.
- Notification timing, send-versus-silence, reminder count, re-entry quality, long-term retained use,
  or unsubscribe and block guardrails are created, changed, reviewed, or reported.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is signup, first-run activation, pre-account experience, samples, or tutorials; use
  `product-onboarding-activation-review`.
- The main risk is cancellation, pause, downgrade, retention offers, dormant-subscriber win-back, or
  contribution profit; use `subscription-retention-profit-review`.
- The task only changes notification consent, endpoint registration, provider delivery, retries,
  deduplication, quiet hours, unsubscribe transport, or delivery receipts; use
  `notification-delivery-integrity-review`.
- The task only changes general gamification visuals without a recurring engagement or retention
  claim; use the matching product or UI skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Eligible-cohort ledger: eligibility moment, assignment unit, randomization, exposure, holdout,
  exclusions, identity joins, locale and time zone, expected product cadence, and denominator.
- Value-report ledger: completed or consumed artifacts, meaningful outcome evidence, report cadence,
  value-estimation method, zero-activity handling, deep-link target, privacy, access control, expiry,
  and suppression rules.
- Streak and reward ledger: qualifying value event, cadence, late-event policy, time-zone boundary,
  grace or recovery, reward type and cost, abuse controls, accessibility, pause or vacation behavior,
  and withdrawal plan.
- Abandoned-work ledger: task identity, saved state, last meaningful progress, completion and natural
  return events, estimated value, expiry, resumability, failure state, sensitivity, and cancellation
  of scheduled reminders.
- Contact ledger: channel, consent, purpose, frequency cap, quiet time, local-time policy,
  unsubscribe or block state, send request, provider acceptance, delivery evidence, and suppression.
- Outcome ledger: task completion, useful artifact consumption, repeated value, retained use, paid
  outcome, refunds or cancellation, shallow activity, re-abandonment, support burden, reward cost,
  unsubscribe, block, uninstall, complaint, and accessibility impact.
- Experiment ledger: control, single-mechanism and combined variants, observation windows, minimum
  detectable effect, repeated-testing policy, interference risk, segment policy, and promotion rule.

<!-- mustflow-section: preconditions -->
## Preconditions

- Define the product-value event and expected natural cadence before creating a report, streak, or
  reminder. Daily use is not the default for products whose value occurs weekly, monthly, or only
  when a real task exists.
- Keep a no-message, no-streak, or no-reward holdout capable of measuring natural return and durable
  behavior. Observational differences between recipients, streak holders, and other users do not
  establish incremental effect.
- Treat external case studies, vendor benchmarks, and another product's timing or effect size as
  hypotheses, not repository defaults or forecasts.
- Verify consent, privacy, delivery, and security boundaries before exposing task names, generated
  content, business metrics, or deep links outside the product.
- Keep command execution under `.mustflow/config/commands.toml`; this skill does not authorize live
  messaging, analytics queries, production flags, rewards, billing changes, or data collection.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine report composition, value-evidence rules, zero-activity suppression, streak
  qualification, grace and recovery, reward eligibility and withdrawal, abandoned-task state,
  reminder scheduling and cancellation, experiment assignment, metrics, guardrails, fixtures,
  tests, docs, route metadata, and synchronized templates.
- Remove raw activity counts, unverifiable time-saved claims, attendance-only streak credit, or
  reminder waves that do not change a meaningful user outcome.
- Add deep links only when authorization is rechecked at open time and expired, deleted, completed,
  or transferred work has a safe fallback.
- Do not fabricate saved-time value, expose sensitive content in notifications, bypass consent or
  quiet-time rules, make a reward necessary to recover already-owned data, or hide opt-out controls.

<!-- mustflow-section: procedure -->
## Procedure

1. Separate the mechanisms before designing a bundle. A value report proves already received value,
   a streak changes future behavior through continuity and loss aversion, a reward changes behavior
   through an external payoff, and an abandoned-work reminder restores a specific interrupted
   intent. Do not use one mechanism's metric as proof for another.
2. Define one meaningful downstream outcome for each mechanism. Prefer completed or consumed useful
   artifacts, resumed-and-finished work, repeated core value, retained use, or contribution. Treat
   report opens, notification clicks, app launches, attendance, streak extension, and reward claims
   as leading events only.
3. Fix assignment and holdout before exposure. Measure outcomes per eligible assigned user or task,
   including non-openers, naturally returning users, failed deliveries, and users who opt out after
   assignment. Keep assignment, send, provider acceptance, delivery, open, resume, and completion
   as distinct events.
4. Build value reports from evidence the user would recognize. Prefer named completed work, results
   consumed or shared, progress toward a declared goal, and one relevant next action.
   Raw session, click, token, character, or generation counts are not value by themselves.
5. Estimate saved time only from a declared comparator and method. State whether the estimate comes
   from user input, a validated task baseline, or a conservative model; preserve uncertainty and
   avoid summing overlapping savings. Omit the claim when the method is not defensible.
6. Handle zero or low activity deliberately. A periodic report that says nothing happened can remind
   a subscriber to cancel or disclose inactivity to the wrong recipient. Segment, reduce cadence,
   change the content to a genuinely useful recovery path, or stay silent; do not pad it with vanity
   numbers.
7. Keep report deep links narrow and current. Link to the named result or next task, reauthorize on
   open, handle deleted or transferred artifacts, and avoid a generic dashboard when a safe direct
   destination exists.
8. Define streak credit from completed value, not presence. Choose a qualifying event whose quality
   cannot be satisfied by opening the app, tapping attendance, generating junk, or repeating a
   trivial action. Preserve domain-specific minimum quality and anti-abuse checks.
9. Align streak cadence with real value. Use daily continuity only for legitimately daily behavior;
   otherwise use scheduled sessions, weekly goals, rolling windows, or milestone progress. Specify
   time zone, travel, late synchronization, offline events, duplicate events, and period closure.
10. Provide humane continuity. Grace, pause, recovery, and outage repair can preserve motivation
    without pretending work occurred. Define limits and auditability, avoid permanent hostage states,
    and distinguish forgiven continuity from completed value in analytics.
11. Separate streak from reward experimentally. Prefer control, streak-only, reward-only, and both
    when sample and cost support a factorial design. Track reward expense, shallow activity, fraud,
    and displaced intrinsic use rather than crediting the combined bundle to streak psychology.
12. Test persistence after reducing or withdrawing the reward. A temporary rise that disappears when
    payment stops is purchased activity, not a durable habit. Preserve a fair disclosed transition
    and do not revoke rewards already earned under the stated contract.
13. Create abandoned-work eligibility from a specific resumable state. Require evidence of intent and
    unfinished value, a safe saved checkpoint, a still-valid owner, and a useful return target. Do
    not infer abandonment from a closed tab alone when completion may occur elsewhere.
14. Measure natural return before choosing timing. A short delay can claim users who would have
    returned unaided; a long delay can miss the task's value window. Model or observe the baseline
    return hazard by task type, user intent, local context, sensitivity, and expiry before selecting
    candidate delays.
15. Compare silence with bounded single-send timing arms first. Test candidate delays such as near
    term, next suitable local context, or later saved-work recovery only when the task remains useful.
    Do not copy a universal ten-minute, twenty-four-hour, or three-day sequence from another product.
16. Cancel scheduled reminders on natural return, completion, deletion, ownership transfer, task
    invalidation, consent withdrawal, channel suppression, or a newer task generation. Make schedule
    creation and cancellation idempotent so retries cannot produce a reminder storm.
17. Add a later reminder only after one-send evidence shows incremental completed value beyond the
    earlier send. Cap frequency across campaigns, avoid stacking report, streak, marketing, and task
    reminders, and preserve channel-specific opt-out and quiet-time behavior.
18. Judge return quality, not just return. Track completion after resume, time to useful result,
    repeated value, re-abandonment, error, support, reward-only behavior, unsubscribe, block, uninstall,
    complaint, and downstream paid or retained outcomes over an appropriate horizon.
19. Predeclare segment and interference policy. Account for power users, low-frequency workflows,
    new versus established users, locale and time zone, shared accounts, team notifications, and
    network effects. Do not discover a winning segment after the fact and ship it as established.
20. Promote the narrowest mechanism that improves meaningful outcome per eligible unit without
    guardrail harm. Keep a kill switch, suppress stale eligibility, and retain the holdout long enough
    to detect novelty, fatigue, reward withdrawal, and notification saturation.

<!-- mustflow-section: postconditions -->
## Postconditions

- Value reports contain defensible completed value, suppress or intentionally handle zero activity,
  and omit unsupported time-saved claims.
- Streak credit follows meaningful product cadence and completed value, while grace, recovery, and
  reward state remain analytically distinct.
- Reward impact is separated from streak impact and checked after reward reduction or withdrawal.
- Abandoned-work reminders target a specific live resumable task, use context-tested timing, and are
  canceled on natural return, completion, invalidation, or consent loss.
- Causal decisions use eligible-unit holdouts and meaningful downstream outcomes rather than opens,
  clicks, attendance, streak counts, or reward claims.
- Promotion evidence includes opt-out, block, uninstall, re-abandonment, quality, cost, and fatigue
  guardrails, or the result remains explicitly preliminary.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer raw analytics, notification-provider, experimentation, browser, deployment, or
production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If completed or consumed value cannot be derived, label the report as an activity summary and do
  not claim that it proves user value or retention.
- If saved-time estimation has no defensible comparator, omit the number instead of inventing one.
- If streak eligibility can be farmed without core value, redesign the qualifying event before
  testing retention.
- If reward removal eliminates the behavior, report purchased activity and its cost rather than a
  durable habit.
- If natural return, task completion, or schedule cancellation cannot be observed reliably, do not
  credit reminder timing causally and reduce message frequency.
- If reminder return rises while completion quality falls or opt-out, block, uninstall, complaint,
  or re-abandonment rises materially, reject or narrow the treatment.
- If consent or authorization is ambiguous, suppress the external message and route transport or
  privacy repair through the matching skill.

<!-- mustflow-section: output-format -->
## Output Format

- Eligible cohort or task, assignment, holdout, exposure, and denominator
- Value report evidence, saved-time method, zero-activity policy, and deep-link boundary
- Streak qualifying event, cadence, grace, recovery, and anti-abuse contract
- Reward isolation, cost, withdrawal, and persistence evidence
- Abandoned-work state, natural-return baseline, timing arms, and cancellation contract
- Meaningful outcome, return quality, fatigue, and contact guardrails
- Files changed
- Command intents run and skipped checks
- Remaining engagement-retention risk
