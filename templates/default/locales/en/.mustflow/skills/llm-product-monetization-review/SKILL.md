---
mustflow_doc: skill.llm-product-monetization-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: llm-product-monetization-review
description: Apply this skill when an LLM product changes token-based versus task- or outcome-based pricing, bounded document/image/analysis units, standard versus precision service tiers, free versus paid queue priority, first-value queue exemptions, automatic credit restoration or retry rights for failed work, user-facing model disclosure or model pinning, cheap-default and premium-model packaging, internal model escalation, managed provider cost, BYOK or customer-supplied API keys, platform fees, included credits, margin, conversion, or retained contribution and must keep user-visible value understandable while internal provider cost, capacity, failure, transparency, and credential risk remain controlled.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.llm-product-monetization-review
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

# LLM Product Monetization Review

<!-- mustflow-section: purpose -->
## Purpose

Sell an understandable unit of user value while metering tokens, tools, models, retries, storage,
capacity, and provider cost internally. Package quality, queue priority, failure recovery, model
transparency, and credential funding without manufacturing delay, charging for unusable work,
exposing unstable vendor implementation as the product contract, surprising users after automatic
escalation, or turning BYOK into insecure onboarding friction and a margin escape hatch.

<!-- mustflow-section: use-when -->
## Use When

- A consumer, SMB, developer, or enterprise LLM product chooses token, character, page, document,
  image, minute, run, analysis, report, accepted result, credit, seat, or hybrid billing units.
- A task unit changes its page, byte, duration, source, OCR, search, tool, output, retry, quality,
  latency, concurrency, or variable-cost boundary.
- A product offers standard, fast, precise, premium, verified, or named-model tiers, or automatically
  escalates from a cheaper model to a stronger model.
- Free and paid users receive different queue priority, concurrency, start-time objectives, capacity
  shares, first-value treatment, background completion, or paid fast-lane promises.
- Provider errors, timeouts, empty or malformed output, quality-gate failures, subjective
  dissatisfaction, automatic retries, credit restoration, bound retry rights, or abuse controls
  change.
- A product chooses outcome-mode labels, provider or model-family disclosure, exact model and
  version receipts, fallback disclosure, model pinning, or internal provider replacement policy.
- A product chooses managed provider credentials, BYOK, customer cloud accounts, a platform fee,
  included usage, prepaid credits, or enterprise provider routing.
- Conversion, cost per accepted result, gross margin, failed-work charging, heavy-tail cost, retained
  use, or provider migration economics are created, changed, reviewed, or reported.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is prompt payload, token counting, caching, RAG packing, retry replay, output budget,
  or internal cost telemetry; use `llm-token-cost-control-review`.
- The main risk is whether a router, cascade, escalation, fallback, or context handoff preserves
  accepted outcomes; use `llm-model-routing-integrity-review`.
- The task only changes a model picker, progress, result, citation, or error interface without price
  or credential economics; use `llm-service-ux-review`.
- The task only changes scheduler fairness, queue durability, starvation, admission control, or
  latency instrumentation without a free-versus-paid product policy; use
  `queue-processing-integrity-review` and `llm-response-latency-review`.
- The task only changes generic plan price, annual billing, trial, regional pricing, or non-LLM usage
  pricing; use `pricing-model-integrity-review`.
- The main risk is credit reserve, balance, capture, release, reversal, expiry, or spend order; use
  `credit-monetization-integrity-review` and `credit-ledger-integrity-review`.
- The main risk is secret storage, tenant isolation, key brokerage, credential access, exfiltration,
  provider terms, residency, or incident response. Use the security, privacy, secret, and provider
  owners; this skill supplies the product and economics contract.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Audience ledger: consumer, prosumer, developer, SMB, enterprise, procurement, technical ability,
  expected cadence, willingness evidence, failure cost, and budget predictability.
- Task-unit ledger: user job, accepted result, input and output bounds, pages, bytes, duration, media,
  OCR, search, tools, sources, iterations, revisions, latency, concurrency, price, credits, and overage.
- Internal-cost ledger: provider, model, input, cached, output, and reasoning tokens; tool calls;
  images, audio, video, storage, search, OCR, egress, retry, verification, moderation, support,
  payment, fraud, refund, and failed-work cost.
- Quality-tier ledger: public tier, accepted-outcome contract, latency, evidence, verification,
  included operations, route version, automatic escalation, fallback, user-selected upgrade, and
  price authorization.
- Credential ledger: managed or customer-funded account, provider, key owner, scope, storage,
  encryption, access, rotation, deletion, logging, quota, residency, audit, failure, and support.
- Economics ledger: eligible-user conversion, useful completion, paid use, cumulative revenue,
  provider cost, tail cost, contribution, refund, chargeback, support, abuse, churn, and retention.
- Experiment ledger: pre-price assignment, package parity, audience and task strata, exposure,
  horizon, provider and model versions, guardrails, and promotion rule.
- Queue-service ledger: first owned value, free and paid eligibility, real capacity state, weight or
  reservation policy, concurrency, aging, starvation bound, enqueue and start time, estimated range,
  background delivery, abandonment, cancellation, capacity cost, and service objective.
- Failure-recovery ledger: attempt and quote identity, failure classifier, provider and product
  evidence, deterministic quality gate, retry lineage, reservation, capture, release, reversal,
  restored asset, bound retry right, expiry, abuse evidence, appeal, and support state.
- Transparency ledger: public mode, accepted-outcome contract, provider, model family and version,
  route and fallback version, execution receipt, customer pin, reproducibility need, procurement or
  jurisdiction requirement, AI-origin marking, change notice, and retention policy.

<!-- mustflow-section: preconditions -->
## Preconditions

- Separate the customer-visible billing unit, internal resource meter, service-quality tier, and
  credential-funding model. One does not prove the others.
- Define an accepted user result and failure policy before pricing a task or capturing credit.
- Define first owned value before imposing a materially slower free queue, and classify objective
  system failure separately from subjective dissatisfaction before granting a reusable asset.
- Assign experiments before price, model tier, or BYOK setup becomes visible and keep abandoners in
  the intent-to-treat denominator.
- Refresh current provider models, prices, meters, tool charges, tokenizers, key rules, retention,
  regional availability, and platform terms before embedding exact claims.
- Treat copied page limits, credit ratios, percentiles, margin targets, model names, price multiples,
  and another product's BYOK policy as hypotheses, not defaults.
- This skill does not authorize live price, provider, credential, credit, routing, experiment,
  payment, or production changes.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine task units, scope limits, quotes, quality tiers, model-independent service contracts,
  real-capacity queue classes, first-value exemptions, failure classifiers, automatic restoration,
  bound retry rights, execution receipts, model disclosure and pinning, BYOK and managed-cost policy,
  platform fees, contribution metrics, experiment events, fixtures, tests, docs, route metadata, and
  synchronized templates.
- Add explicit handoffs to token-cost, model-routing, credit-ledger, payment, security, privacy,
  provider, accounting, tax, or legal owners.
- Remove unbounded per-document pricing, post-hoc token bills, surprise escalation charges,
  client-side key storage, hidden provider cost, fake unlimited use, or free BYOK that receives the
  full product platform without covering its cost.
- Do not change the promised price after internal retry or escalation unless the user explicitly
  authorized a separately defined higher service tier before execution.

<!-- mustflow-section: procedure -->
## Procedure

1. Split seven decisions: external billing unit, internal resource meter, public service tier,
   managed versus customer-funded credentials, queue priority, failure recovery, and model
   transparency. Do not present one bundle as the only possible design.
2. Classify the buyer. End-user products need predictable job and result language; developer APIs can
   expose resource meters where technical buyers control payload and value that transparency;
   enterprise products may need both task budgets and provider-account control.
3. Prefer a user-recognizable unit when the product owns an end-to-end job. Name the accepted result
   and scope rather than selling an ambiguous document, image, analysis, or agent run with no bounds.
4. Bound every task unit. Define input pages or bytes, media duration and resolution, OCR, search,
   tools, sources, revisions, output length, latency, concurrency, timeout, and overflow behavior.
   Split materially different jobs instead of hiding extreme cost in one average.
5. Quote before execution. Show task tier, fixed or bounded credit spend, included work, maximum
   scope, and failure treatment. Route reservation, useful-result capture, release, and reversal
   through the credit skills.
6. Treat paid priority as a capacity contract, not synthetic friction. When capacity is available,
   start eligible free and paid work promptly; never add sleep solely to manufacture an upgrade.
7. Protect first owned value. Let a new eligible user receive enough successful representative work
   to judge the product before a materially slower free lane where cost, safety, and abuse permit.
   Derive the allowance from result variance and marginal cost rather than copying a universal count.
8. Design queue priority from observed load and abandonment. Define work class, weight or reserved
   capacity, concurrency, aging, cancellation, starvation bound, and overload behavior. Preserve a
   bounded free path rather than strict paid-first starvation.
9. Show honest wait state. Measure enqueue-to-start separately from generation time, show a range or
   queue state backed by current evidence, preserve work after the user leaves where appropriate, and
   notify or place completed work in an owned result surface. Do not show fake exact countdowns.
10. Derive queue objectives from task duration, user attention, first-value state, capacity cost,
    abandonment curves, and paid value. Treat copied seconds, minutes, weights, or capacity shares as
    experiment candidates, not service laws.
11. Meter the complete internal cost. Include tokens, cache behavior, reasoning, tools, media,
   retrieval, storage, retries, verification, moderation, support, payment, abuse, and refunds. A
   token-only ledger can understate the cost of the task the customer bought.
12. Price tail risk deliberately. Use the observed cost distribution and a declared service objective
   rather than average cost alone; a percentile such as p95 can be a candidate, not a universal law.
   Add scope splits, overage, or a higher tier when bounded honest pricing cannot cover the tail.
13. Derive the floor from retained contribution, not a copied markup. Include full variable cost,
   refunds, support, acquisition, provider volatility, and useful-result probability. Validate that
   the customer values the bounded result above that floor.
14. Classify failures before settlement. Treat provider errors, timeouts, empty output, corrupt media,
    truncated required output, deterministic schema failure, duplicate execution, and declared
    quality-gate failure as objective candidates when current evidence can reproduce the rule.
15. For objective operator-owned failure, retry only when the same logical attempt can do so safely;
    otherwise release or reverse the authorized charge automatically and idempotently. Do not make
    users file a claim for a failure the system already proved.
16. Keep subjective dissatisfaction separate. A same-lineage, nontransferable retry right can be a
    candidate when intent fit is uncertain, but do not convert every dislike into general-purpose
    credit. Bound reuse, model escalation, expiry, review, and appeal from observed abuse and cost.
17. Evaluate restoration by incremental variable cost and retained contribution, not credit face
    value alone. Include extra execution, support avoided, repurchase, refunds, disputes, abuse, and
    user trust; never use a universal refund or complaint quota as the product contract.
18. Route reserve, capture, release, reversal, retry identity, and reconciliation through the credit
    skills. A browser timeout or client cancellation alone does not prove provider failure or permit
    duplicate restoration.
19. Keep public tiers model-independent by default. Describe speed, result quality, verification,
   source coverage, revision policy, and latency. Do not promise a vendor model name unless that
   identity is itself a required and maintainable contract.
20. Make the standard tier good enough to represent the product. A deliberately poor cheap result is
    an activation failure, not an upgrade funnel. Escalate internally when needed to meet the promised
    standard accepted outcome.
21. Do not surprise-charge automatic escalation. Router, verifier, retry, and stronger-model cost
    used to satisfy the selected tier belongs to the operator. Charge more only for a user-selected,
    prepriced tier with materially different scope or outcome.
22. Route quality through `llm-model-routing-integrity-review`. Compare total cost per accepted
    outcome, false accepts, retries, repairs, context handoff, OOD fallback, and fixed evaluation
    cost; cheap per-call price alone is not product margin.
23. Separate AI transparency from vendor merchandising. Tell users they are using AI and expose
    material limitations, provenance, or generated-content marking required by the product and
    current authority; that does not require turning an unstable model brand into the plan name.
24. Keep an auditable execution receipt. Record provider, model family and version, route, fallback,
    tools, and execution time internally, and expose the subset needed for user verification,
    procurement, reproducibility, support, or jurisdiction rules without leaking secrets.
25. Offer exact model pinning only when identity or reproducibility is a paid or regulated contract.
    A pinned execution must not silently substitute another model; fail, ask, or use an explicitly
    accepted fallback. Outcome-mode routes may change providers only while preserving their accepted
    result and disclosure contract.
26. Refresh transparency and marking duties by product role, geography, content type, publication
    path, and date. Do not infer that a visible watermark alone satisfies machine-readable marking,
    disclosure, accessibility, provenance, or legal obligations.
27. Use an expensive-only baseline when the declared failure cost, safety floor, or narrow task value
    justifies it. Do not generalize a high-stakes exception to ordinary extraction, transformation,
    drafting, or classification.
28. Compare managed and BYOK from the full activation path. Include external account creation,
    billing setup, key creation, trust, storage, quota, provider support, first-value delay, conversion,
    cost control, and retained platform revenue.
29. Keep managed credentials as a strong candidate when immediate end-user activation and integrated
    usage revenue matter. Bound abuse with task limits, concurrency, budgets, idempotency, cost alerts,
    and explicit included usage rather than a secretly throttled unlimited promise.
30. Offer BYOK where technical or enterprise buyers need provider ownership, negotiated pricing,
    region, model, quota, or procurement control. Charge a platform fee for workflow, storage,
    collaboration, retrieval, audit, support, and automation value that remains operator-owned.
31. Treat customer keys as secrets, never ordinary preferences. Require server-side or approved
    secure handling, least privilege, encryption, access audit, redaction, rotation, deletion,
    tenant isolation, and bounded provider errors; route the implementation to security owners.
32. Prevent credential-mode arbitrage and lock-in. Define which features, support, quotas, providers,
    credits, and usage records differ between managed and BYOK modes, and let qualified customers
    migrate without losing owned product data.
33. Preserve external price meaning across provider and model changes. Version the task, quality,
    cost, route, and credential contracts so internal optimization can improve margin without
    silently reducing the result the user purchased.
34. Evaluate from eligible assignment over meaningful repeat-use and billing horizons. Track first
    value, queue wait and abandonment, useful completion, conversion, task mix, tail cost, gross
    margin, contribution, provider failures, automatic reversals, retry-right use, abuse, support,
    BYOK setup loss, churn, and retained use.
35. Promote only a reversible policy that improves eligible-user contribution while preserving
    understandable scope, nonmanufactured queueing, useful-result charging, fair failure recovery,
    acceptable quality, credential security, current transparency duties, provider compliance, and
    explicit latency, model-routing, credit, and security handoffs.

<!-- mustflow-section: postconditions -->
## Postconditions

- External task or resource units and internal provider-cost meters are separate and reconstructable.
- Each task unit has an accepted result, scope, quote, overflow, failure, and tail-cost policy.
- Standard and premium tiers describe product outcomes rather than relying on unstable model names.
- Automatic retry or model escalation cannot create an unapproved price increase.
- Free and paid queue classes consume real capacity, preserve first value and a bounded free path,
  expose honest wait state, and do not manufacture delay.
- Objective operator-owned failure can release or reverse charges idempotently, while subjective
  dissatisfaction uses a separately bounded recovery asset when offered.
- AI-origin, outcome mode, execution receipt, exact model pinning, fallback, and provider replacement
  have explicit transparency and reproducibility boundaries.
- Managed and BYOK modes have explicit activation, credential, quota, platform-fee, support, revenue,
  migration, and security boundaries.
- Headline economics use eligible users and total cost per accepted result over retained use.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer live provider, model, key, billing, credit, analytics, experiment, deployment, or
production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If task scope or accepted result is undefined, do not publish a fixed task price.
- If complete internal cost is unavailable, label margin as unverified and add bounded limits before
  expanding managed usage.
- If a cheaper route lacks accepted-outcome evidence, keep the capable baseline and route the gap to
  the model-routing skill.
- If a paid queue converts only by intentionally slowing idle free capacity, reject it as synthetic
  friction. If the free lane can starve, add bounded capacity or aging before promotion.
- If failure cannot be classified or the attempt cannot be reconciled, keep the reservation pending
  under a bounded recovery policy; do not both retry and restore reusable value blindly.
- If current product-role, content, or jurisdiction transparency duties are unresolved, preserve an
  auditable execution receipt and route the launch decision to qualified authority.
- If customer keys cannot be isolated, redacted, rotated, and deleted securely, do not offer hosted
  BYOK; preserve managed mode or require an approved enterprise integration boundary.
- If a pricing arm wins conversion but loses accepted results, retained contribution, support, or
  security guardrails, reject or narrow it.

<!-- mustflow-section: output-format -->
## Output Format

- Audience, accepted result, task unit, limits, quote, overflow, and settlement policy
- Internal token, tool, media, retry, verification, support, and tail-cost ledger
- Standard and premium outcome contracts, automatic route, escalation, and price authorization
- Queue eligibility, first-value treatment, capacity, fairness, wait evidence, abandonment, and paid
  priority decision
- Objective failure, subjective dissatisfaction, retry lineage, restoration asset, abuse, appeal,
  reserve, capture, release, and reversal decision
- AI-origin disclosure, execution receipt, model family and version, pinning, fallback, provider
  replacement, reproducibility, and authority decision
- Managed and BYOK activation, credential, quota, platform-fee, migration, and security decision
- Eligible conversion, accepted results, margin, contribution, retention, and provider evidence
- Files changed
- Command intents run and skipped checks
- Remaining LLM product monetization risk
