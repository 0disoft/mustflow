---
mustflow_doc: skill.product-onboarding-activation-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: product-onboarding-activation-review
description: Apply this skill when a product changes pre-account core-value experiences, signup checkpoints, guest-to-account transfer, signup or first-run questions, authentication choices, personalization, samples, empty states, tutorials, contextual help, progressive disclosure, activation definitions, time-to-value, retained use, paid conversion, or onboarding experiments and must balance friction against meaningful user-owned outcomes without survivor-biased metrics.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.product-onboarding-activation-review
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

# Product Onboarding Activation Review

<!-- mustflow-section: purpose -->
## Purpose

Move an eligible visitor or newly assigned user to one meaningful result they own while accounting
for every user lost to account creation, authentication, questions, setup, samples, tutorials, or
choice overload. Prevent signup rate, onboarding completion, tour clicks, sample views, or template
opens from masquerading as activation or paid conversion.

<!-- mustflow-section: use-when -->
## Use When

- A product chooses between account-first and a bounded pre-account or guest core-value experience,
  or moves the account checkpoint to save, export, share, collaboration, payment, or sensitive work.
- Anonymous work, sample state, generated results, drafts, or attribution must transfer into a
  durable account without loss, duplication, or ownership confusion.
- Signup or first-run flow adds, removes, or changes authentication methods, intent, role,
  skill-level, company, use-case, goal, preferred-output, or other personalization questions.
- A product shows sample data, an example result, template, demo workspace, prefilled project,
  generated example, or interactive preview before a user enters their own data.
- The first-use path changes between no onboarding, a short task path, a detailed tutorial,
  contextual help, several feature choices, or one primary action.
- Activation, time-to-value, first feature execution, retained use, paid conversion, or onboarding
  experiment definitions are created, changed, reviewed, or reported.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is authentication assurance, credential storage, session security, account recovery
  security, identity-provider protocol correctness, permission, or authorization; use
  `auth-permission-change` and the matching security skill.
- The main risk is general page friction, accessibility, form usability, navigation, or task
  completion outside the new-user value path; use `website-task-friction-review`.
- The main risk is weekly value reports, streaks, attendance rewards, abandoned-work reminders, or
  post-activation engagement nudges; use `product-engagement-retention-review`.
- The main risk is subscription cancellation, win-back, pause, downgrade, retention offers, or
  post-churn profit; use `subscription-retention-profit-review`.
- The task only changes marketing-page copy or lead capture and does not claim product activation,
  retained use, or paid conversion.
- The task only implements analytics transport, event delivery, consent, or privacy controls without
  changing the activation contract; use the matching analytics, privacy, or data-boundary skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Eligible-cohort ledger: visitor or user eligibility moment, assignment unit, randomization moment,
  exposure rules, exclusions, anonymous and account identity joins, bot or internal traffic policy,
  and denominator.
- Pre-account experience ledger: available core task, input and output sensitivity, compute or abuse
  cost, persistence, export or sharing, irreversible operations, account checkpoint, fallback, and
  cleanup.
- Question ledger: each requested field, input effort, required or optional status, answer source,
  immediate decision it changes, fallback for missing answers, privacy class, and later inference
  alternative.
- Personalization ledger: answer-to-screen, sample, recommendation, template, primary action, and
  default-path mapping; route version; unsupported-answer behavior; and whether copy or actual work
  changes.
- Sample ledger: source, sample label, editability, permissions, cost, transition to user data,
  persistence, cleanup, and whether the user receives a result based on meaningful own input.
- Account and identity ledger: stable internal user identifier, provider and provider-subject
  identity, contact addresses, verified state, link and unlink proof, duplicate-account handling,
  recovery boundary, and anonymous-state transfer transaction.
- Instruction ledger: task complexity, prerequisite knowledge, safety or legal requirement,
  no-onboarding path, short task path, contextual help triggers, detailed tutorial, skip or advanced
  path, and successful task postcondition.
- Activation contract: user-owned result, required input, successful postcondition, allowed sample
  contribution, time window, repeat-value event, paid outcome, and invalid proxy events.
- Funnel ledger: eligible visitor, core-task start, account checkpoint reached, account completed,
  anonymous work claimed, own result produced, repeat value, paid outcome, refund, and retained use.
- Experiment ledger: control and variants, power or minimum detectable effect assumptions, exposure
  integrity, guardrails, observation windows, delayed outcomes, segment policy, and stop decision.

<!-- mustflow-section: preconditions -->
## Preconditions

- Define activation from a product-value postcondition before changing the account gate, onboarding
  UI, authentication choice, tutorial, or metric.
- When comparing account-first with try-before-signup, begin the headline denominator at the same
  eligible visitor boundary, before either variant creates friction.
- Keep every eligible assigned visitor or user in the intent-to-treat denominator, including users
  who abandon account creation, questions, authentication, tutorials, or instrumentation.
- A guest experience must not expose sensitive, regulated, irreversible, high-abuse, or unbounded
  paid work merely to remove signup friction.
- Treat external onboarding, authentication, checkout, demo, and retention benchmarks as priors or
  design leads, not transferable effect sizes or repository defaults.
- Keep command execution under `.mustflow/config/commands.toml`; this skill does not authorize live
  experiments, analytics queries, production flags, identity-provider changes, messaging, billing
  changes, or new data collection.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine account checkpoints, guest sandboxes, anonymous state transfer, onboarding state
  machines, question schemas, authentication choices, personalization mappings, sample workspaces,
  own-data transitions, instruction paths, activation events, experiment assignment, metrics,
  guardrails, fixtures, tests, docs, route metadata, and synchronized templates.
- Remove questions whose answers do not change the user's immediate first-value path.
- Replace passive tours or static galleries with clearly labeled editable samples when the product
  and permission model support a safe transition to a user-owned result.
- Add stable user and identity records, explicit account-link confirmation, and duplicate-account
  recovery only within the existing authentication and security contract.
- Do not collect additional personal or company data merely to improve CRM completeness, identify a
  person by email address alone, auto-link accounts from an email match, or weaken consent, access,
  deletion, credential, recovery, or purpose-limitation rules.

<!-- mustflow-section: procedure -->
## Procedure

1. Define one observable activation outcome. Require at least one meaningful user-owned input and a
   successful result or state change tied to the product's core value. Record signup, sample views,
   tour completion, recommendation clicks, and template opens as funnel events, not activation.
2. Fix the denominator at eligible visitor or assignment before account or onboarding friction.
   Calculate activation, retained use, paid conversion, and contribution per eligible assigned unit,
   not per signup, answerer, onboarding completer, sample viewer, or activated survivor.
3. Decompose the funnel without changing the headline denominator. Use stage conversion to locate
   losses, then return to intent-to-treat outcomes for the decision. Do not optimize signup rate at
   the expense of fewer visitors reaching owned value or paid contribution.
4. Classify the first-value path. Distinguish an instant result with bounded inputs, an editable
   collaboration sample, guest commerce, an expensive generated result, and sensitive or regulated
   work. A pre-account experience is an option, not a universal rule.
5. Place the account checkpoint at the first boundary that genuinely needs durable ownership,
   persistence, cross-device recovery, export, sharing, collaboration, payment, sensitive data,
   abuse control, or an irreversible operation. Do not gate a safe disposable preview merely to
   inflate signups, and do not delay identity past a real security boundary.
6. Bound guest execution. Limit cost, rate, persistence, data scope, permissions, and shareability;
   label disposable state and provide a useful error or fallback.
   Prevent a guest identifier from becoming an authorization credential.
7. Transfer anonymous work atomically from the user's perspective. Preserve the chosen assignment,
   result, draft, and attribution; claim each artifact once; establish ownership and permissions;
   make retries idempotent; and avoid a blank restart after account completion.
8. Price each question against the work it changes. Ask an early question only when its answer
   changes the immediate sample, recommendation, primary action, permissions, or result path enough
   to plausibly offset abandonment. Defer fields inferable from later behavior.
9. Prefer a low-effort intent choice over typed profiling. Add another question only when its answer
   creates a distinct first task or prevents a material wrong path. Do not copy a universal question
   count, field-drop rate, completion threshold, or three-step rule from another product.
10. Make personalization operational. Change the sample, first task, recommendation target, default,
    or workflow step; decorative greetings or reordered cards alone do not establish value. Keep a
    safe skip, unknown, novel-intent, and changed-intent path.
11. Show value before expensive setup when feasible. Keep the sample inside the real product,
    identify it as sample data, make the relevant input or output editable, and preserve the next
    action needed to convert it into the user's own work.
12. Separate authentication UX from authentication assurance. Email and password, emailed link or
    code, social or enterprise federation, passkeys, and platform login differ in completion,
    re-entry, device availability, recovery, privacy, provider dependency, and support burden; none
    is a universal retention winner or an automatic security substitute.
13. Choose authentication options from service and risk context. Account for consumer versus
    enterprise users, platform norms, shared or lost devices, email reliability, provider access,
    privacy relay, regulated assurance, offline or cross-device use, and recovery. Route credential,
    session, phishing-resistance, and authorization decisions through `auth-permission-change`.
14. Keep product identity stable across authentication methods. Use an internal `user_id` and a
    separate identity record keyed by issuer or provider plus immutable provider subject. Treat
    email as a changeable contact attribute; require current-account proof and fresh provider proof
    before linking; preserve explicit duplicate-account and recovery paths.
15. Choose the instruction format from task complexity and consequence. Use no forced onboarding
    when the safe core action is self-evident, a short task path when a few ordered choices unlock
    value, contextual help when explanation is needed at a decision point, and a detailed tutorial
    only when prerequisite knowledge, safety, irreversibility, or legal duty makes it necessary.
16. Teach by completing the real task. Keep skip, back, resume, and advanced paths where safe; store
    progress only when useful; avoid long passive tours before value; and do not count tutorial completion as activation.
17. Choose one primary action per current intent. Secondary navigation, escape, accessibility, and
    safety controls remain available but visually subordinate. Reveal broader features after the
    first owned result or when the user explicitly asks for them.
18. Randomize before the intervention. Compare the current path with bounded variants such as guest
    preview, a different account checkpoint, fewer questions, authentication choice, editable
    sample, contextual help, or a focused primary action. Avoid changing all mechanisms at once
    unless the experiment intentionally evaluates the complete bundle.
19. Calculate friction break-even explicitly. When downstream outcome definitions are equal, a
    conditional outcome lift must at least offset the ratio between control and variant completion.
    Prefer directly observed per-eligible-visitor outcomes over modeled or borrowed rates.
20. Track outcome depth and durability separately: core-task start, account completion, first own
    result, repeated core action, retained use, paid conversion, refund or cancellation, support
    burden, guest compute cost, abuse, duplicate accounts, recovery failure, and identity-link error.
21. Predeclare guardrails and analysis policy. Include latency, accessibility, privacy, error rate,
    support contacts, sample cleanup, low-frequency use cases, segment heterogeneity, and delayed
    outcomes. Correct for repeated peeking and do not promote post-hoc segments as preregistered.
22. Preserve experiment identity across anonymous state, account creation, authentication retries,
    devices, and identity linking. Record assignment and exposure separately so tracking prevention,
    duplicate events, or late loading cannot silently move units between variants.
23. Promote only when the full assigned cohort improves or a declared target segment has a safe,
    stable policy. Keep reversible fallbacks for unsupported intents, identity-provider failure,
    guest-transfer failure, and new-user states.

<!-- mustflow-section: postconditions -->
## Postconditions

- Activation requires a user-owned value result and excludes signup, passive sample, and tutorial
  proxy events.
- Account-first and pre-account variants share an eligible-visitor denominator and a bounded account
  checkpoint appropriate to cost, ownership, sensitivity, and irreversibility.
- Anonymous results transfer once into stable account ownership without resetting the user to blank.
- Authentication options are service- and risk-specific, identity is not keyed by email alone, and
  credential or assurance decisions remain under the authentication security contract.
- Every early question changes a named immediate decision or is deferred.
- Samples are labeled, safely editable, and connected to an own-data result.
- Instruction depth follows task complexity and consequence, and activation is not tutorial
  completion.
- Promotion evidence includes delayed retained use, paid outcomes, and named guardrails, or remains
  explicitly preliminary.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer raw analytics, warehouse, experimentation, identity-provider, browser, deployment, or
production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If no user-owned activation postcondition exists, keep the work as an onboarding hypothesis or
  event-instrumentation change and do not claim activation improvement.
- If the guest boundary cannot contain sensitive data, abuse, cost, ownership, or irreversible
  effects, keep account creation before that operation.
- If anonymous state cannot be claimed atomically and idempotently, preserve a recoverable draft and
  do not advertise seamless transfer.
- If assignment or identity joins are unreliable, stop causal claims and report exposure-analysis
  limits separately from intent-to-treat evidence.
- If a sample cannot transition safely into user ownership, keep it read-only and do not count it as
  activation.
- If authentication completion improves while duplicate accounts, recovery failures, or assurance
  regress, do not call the option a durable winner.
- If personalization benefit appears only after excluding abandoners, reject the survivor-biased
  result.
- If delayed retention, payment, refund, or cancellation outcomes are unavailable, report the result
  as an early funnel signal rather than a durable business win.

<!-- mustflow-section: output-format -->
## Output Format

- Eligible visitor or user cohort, assignment, exposure, and denominator
- User-owned activation and invalid proxy events
- Pre-account experience, account checkpoint, and anonymous-state transfer
- Authentication option, identity, linking, duplicate-account, and recovery boundaries
- Question cost and immediate decision changed
- Personalization, sample, and sample-to-own contract
- No-onboarding, short task, contextual help, or detailed-tutorial decision
- Funnel, break-even, delayed outcome, and guardrail evidence
- Files changed
- Command intents run and skipped checks
- Remaining onboarding-activation risk
