---
mustflow_doc: skill.service-portfolio-capital-allocation-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: service-portfolio-capital-allocation-review
description: Apply this skill when a solo founder or small product portfolio decides when shared backend or platform investment breaks even, how correlated outages and failure cells change common-versus-independent architecture economics, when a low-usage service should be maintained, rescued, archived, redirected, sold, or shut down, or how to allocate limited time between launching new services and improving conversion, retention, reliability, or contribution in existing services.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.service-portfolio-capital-allocation-review
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

# Service Portfolio Capital Allocation Review

<!-- mustflow-section: purpose -->
## Purpose

Allocate shared-platform investment, service continuation, shutdown, rescue experiments, new launches,
and existing-product improvements by future marginal contribution under correlated failure and founder
time constraints. Prevent project counts, user counts, gross revenue, sunk cost, or fixed percentage
rules from keeping zombie services alive or multiplying operational debt.

<!-- mustflow-section: use-when -->
## Use When

- A portfolio compares shared authentication, billing, data, admin, deployment, or operations with
  independently built services and asks for a break-even project count.
- Shared infrastructure may reduce duplicated work while increasing outage blast radius, recovery
  congestion, security exposure, or portfolio-wide support load.
- A low-usage or low-revenue service needs a maintain, automate, harvest, rescue, archive, redirect,
  sell, or shutdown decision.
- Search traffic, cross-product conversion, brand value, contractual obligations, support time,
  security risk, closure cost, or customer migration changes a service-retirement decision.
- A solo founder or small team allocates time between new launches and conversion, activation,
  retention, reliability, cost, or support improvements in existing products.
- The decision needs marginal contribution, NPV, opportunity cost, effective service count,
  diminishing returns, context-switch cost, or portfolio capacity limits.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only designs or implements a shared Product Registry, auth, billing, credit, entitlement,
  admin, deployment, analytics, or app factory after the investment is approved; use
  `small-service-platform-architecture-review` and narrower technical skills.
- The task only changes common accounts, wallets, bundles, product brands, or cross-product customer
  rights; use `product-portfolio-integrity-review`.
- The task only optimizes one product's onboarding, pricing, subscription retention, engagement, or
  acquisition experiment; use the matching product skill.
- The task only evaluates automation economics; use `automation-investment-case-review`.
- The task requests legal advice about service termination, refunds, notice, records, tax, employee
  action, or insolvency. Use current contracts and qualified authority; this skill supplies the
  economic and operational decision packet.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Portfolio ledger: services, owners, lifecycle stage, customer jobs, complements and substitutes,
  current users, paid customers, contribution margin, growth, retention, support, operations,
  security, incident, and strategic dependencies.
- Shared-platform ledger: up-front build and migration, common operation, per-service integration,
  avoided duplication, vendor and runtime dependencies, change coordination, cells, data stores,
  queues, deploys, backups, restore, and exit or de-sharing cost.
- Failure ledger: independent incident probability and loss, shared incident probability and loss,
  affected services, revenue-at-risk per hour, support and recovery concurrency, secondary failure,
  security blast radius, RTO, RPO, and insurance or reserve assumptions.
- Service economics ledger: direct contribution, search and referral contribution, cross-product
  contribution, cash maintenance, founder hours, replacement cost, best alternative use of time,
  risk reserve, future investment, and closure cost.
- Preservation ledger: customer migration, refunds, data export, read-only period, domain and content
  redirects, search preservation, license or subscription obligations, support tail, archive cost,
  and value retained after closure.
- Growth evidence: normalized cohort horizon, renewal cycle, optimistic and conservative growth,
  seasonality, campaigns, product-market-fit evidence, remaining experiment budget, and confidence.
- Work candidate ledger: expected incremental twelve-month contribution, success probability,
  cash cost, required hours, future maintenance, reusable assets, cross-product effect, time-to-learn,
  diminishing returns, switching cost, and stop condition.
- Current authority ledger for customer notice, refunds, data retention, deletion, export, domains,
  marketplace listings, and platform shutdown obligations.

<!-- mustflow-section: preconditions -->
## Preconditions

- Use contribution after variable cost, refund, support, and direct operating cost rather than gross
  revenue when the goal is portfolio value.
- Convert search, referrals, cross-product use, founder time, incident risk, and preserved closure
  value into one economic unit before combining them. Do not use arbitrary weighted scores.
- Separate reusable standards and adapters from shared runtime, shared database, and shared failure
  domains. Common code does not require common outages.
- Treat copied project counts, service age, user thresholds, growth cutoffs, time splits, discount
  rates, and valuation horizons as examples, not policy defaults.
- This skill does not authorize shutdown, customer notice, refund, data deletion, migration,
  staffing, purchase, production restructuring, release, or deployment.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine portfolio decision records, cost and failure models, service scorecards expressed as
  contribution, preservation and closure plans, rescue experiment gates, capacity allocation,
  events, fixtures, tests, docs, route metadata, and synchronized templates.
- Add explicit handoffs to platform architecture, service boundaries, reliability, auth, payment,
  data, privacy, legal, SEO, migration, support, or product experiment owners.
- Replace raw project count, MAU shutdown thresholds, gross revenue, weighted scorecards, sunk-cost
  arguments, or fixed launch percentages with auditable marginal-value and risk evidence.
- Do not terminate a live service, delete data, redirect domains, cancel contracts, migrate customers,
  or change shared infrastructure without explicit authority and the narrower operational skills.

<!-- mustflow-section: procedure -->
## Procedure

1. Set the decision horizon and unit. Prefer future contribution or another explicit owner-selected
   objective; do not silently optimize gross revenue when margin, risk, or founder capacity matters.
2. Split shared-platform economics into reusable specification, SDK or adapter, control plane,
   runtime, data, deployment, and failure domain. Common contracts can be valuable before one shared
   runtime or database is safe.
3. Model the independent alternative. Include repeated design and build work, per-service auth and
   billing operations, support tooling, migrations, upgrades, security maintenance, and independent
   incident reserves.
4. Model the shared alternative. Include fixed platform and migration investment, per-service
   integration, common operations, coordination, compatibility, platform maintenance, de-sharing,
   and per-service residual work.
5. Price correlated failure separately. Include simultaneous lost contribution, recovery congestion,
   customer communications, support queues, security blast radius, secondary fixes, and time that a
   solo operator cannot perform in parallel.
6. Derive the break-even interval from current inputs. Compare total independent and shared cost for
   each plausible effective service count. A shared platform can have both a lower break-even bound
   and an upper point where correlated failure or coordination makes another topology cheaper.
7. Report denominator failure. If per-service savings are zero or negative, no finite project count
   repays the fixed platform investment under the model. If correlated loss dominates after a point,
   report the bounded winning interval rather than "more services is always better."
8. Use effective service count alongside raw count. Weight services by recurring operations,
   support, decision load, change coupling, revenue-at-risk, and special compliance rather than
   treating an automated hobby service and a high-loss product as equal units.
9. Test cell isolation. Share identity standards, payment adapters, schemas, SDKs, admin patterns,
   deployment tools, and observability where valuable while bounding runtime, queues, ledgers,
   databases, backups, deploys, and recovery by product or risk cell.
10. Choose cell boundaries by failure loss and recovery capacity. A high-revenue, high-risk, or
    regulated service may need isolation regardless of total project count; a small set of similar
    low-loss services may safely share more.
11. Build each service's continue-versus-close cash flow. Include direct contribution, incremental
    search and cross-product value, cash maintenance, founder time at opportunity cost, incident and
    security reserve, future investment, and closure timing.
12. Estimate value preserved after closure. Include migration, redirects, archives, read-only access,
    customer export, retained search, transferred subscriptions, and ongoing obligations. Avoid
    treating every current benefit as fully destroyed or fully preserved.
13. Prevent double counting. A customer acquired through search and then moved to another product
    cannot create full search value and full cross-product value twice. Attribute one incremental
    path or split it explicitly.
14. Price founder time at the greater relevant alternative: replacement cost or the marginal value
    of the best credible growth, reliability, or risk-reduction work displaced. A nominal wage can
    keep support-heavy zombie products alive.
15. Compare continuation NPV with closure now. Include discounting, forecast ranges, closure now and
    later costs, obligations, and the normal product or renewal cycle. Do not decide from one noisy
    month.
16. Derive required growth to cover the remaining burden. Compare the optimistic evidence-supported
    growth bound with the growth needed by a named horizon after preserved search or cross-product
    value. If no direct contribution base exists, do not manufacture a percentage.
17. Require repeated evidence before irreversible closure when the decision is noisy. Use at least
    one representative usage or renewal cycle and define which second observation, notice window,
    export, refund, or contractual gate is required.
18. Gate a final rescue experiment by expected incremental value. Include success probability,
    contribution if successful, cash cost, founder hours, delay to closure, support tail, and a hard
    stop. Do not grant another experiment because of effort already spent.
19. Build the available growth-time budget after unavoidable maintenance, support, incidents,
    administration, and recovery capacity. If the forced operating load consumes the budget, reduce
    or retire obligations before starting another product.
20. Value each launch or improvement candidate on the same horizon. Include probability-adjusted
    contribution, time-to-learn, cash, future maintenance, reusable assets, cross-product effects,
    and the remaining upside after prior optimization.
21. Discount pre-product-market-fit conversion work when retention or repeated value is unproven,
    while allowing retention, core-value, and learning work to address that uncertainty directly.
22. Allocate the next hour to the candidate with the highest current marginal contribution until
    diminishing returns, prerequisites, risk limits, or the time budget changes the order. Do not
    preserve a fixed launch-versus-improvement percentage after the inputs move.
23. Charge context switching and work-in-progress. A mathematical solution that assigns tiny slices
    to many services can lose to a smaller active set once setup, monitoring, interruption, and
    decision costs are included.
24. Keep a bounded active portfolio. Select a primary compounding improvement and at most the number
    of discovery bets the operator can run without hiding support or reliability work; put the rest
    in an explicit queue with expiry and reevaluation evidence.
25. Define promotion, pause, archive, sell, and shutdown states. Preserve customer rights, receipts,
    data, exports, redirects, notices, support, and audit evidence through each transition.
26. Measure realized portfolio contribution, not plan completion. Re-estimate savings, correlated
    incidents, service contribution, founder hours, experiment returns, and context-switch load on a
    fixed cadence, then move capacity only when current evidence changes the marginal order.

<!-- mustflow-section: postconditions -->
## Postconditions

- Shared-platform break-even includes fixed investment, per-service savings, residual work,
  correlated incidents, recovery congestion, effective service count, and isolation topology.
- Service continuation or closure uses future incremental contribution, preserved value, founder
  opportunity cost, risk, growth requirements, obligations, and closure cost rather than users or
  gross revenue alone.
- Rescue experiments have expected-value and stop gates.
- New launches and existing improvements compete on the same marginal contribution horizon with
  maintenance, diminishing returns, and context-switch cost visible.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and
`mustflow_check`. Do not infer live billing, analytics, incident, customer-notice, refund, migration,
domain, data export, deletion, shutdown, deployment, staffing, or production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If shared and independent alternatives omit the same outcome or lifecycle stage, stop the
  break-even claim and normalize the comparator.
- If correlated outage loss or recovery capacity is unknown, report the platform result without a
  failure-adjusted break-even claim.
- If search or cross-product contribution is observational, discount or bound it and state that the
  service-retirement decision remains sensitive to incrementality.
- If customer rights, notice, export, refund, retention, or deletion obligations are unknown, do not
  approve shutdown even when the economic continuation value is negative.
- If one uncertain assumption reverses the time allocation, report its threshold and choose the
  smallest reversible measurement before committing a large block of founder capacity.

<!-- mustflow-section: output-format -->
## Output Format

- Portfolio objective, horizon, services, effective service count, and founder capacity
- Independent and shared fixed, variable, residual, coordination, failure, and de-sharing costs
- Break-even interval, cell topology, revenue-at-risk, recovery capacity, and sensitivity
- Per-service direct, search, cross-product, maintenance, founder-time, risk, preservation, closure,
  NPV, required-growth, and rescue-experiment decision
- Launch and improvement candidates, marginal contribution, diminishing returns, switching cost,
  active set, queue, and reallocation rule
- Current authority, files changed, command intents run and skipped checks
- Remaining service-portfolio capital-allocation risk
