---
mustflow_doc: skill.product-portfolio-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: product-portfolio-integrity-review
description: Apply this skill when a multi-product business changes unified versus separate accounts, shared identity or account portals, common versus service-specific credit wallets, cross-service credit value, individual subscriptions versus pure or mixed bundles, portfolio entitlements, bundle cannibalization, umbrella versus independent or endorsed brands, brand-fit and failure spillover, service-specific suspension or data boundaries, cross-product reuse, or portfolio customer value and must combine customer convenience without collapsing money rights, authorization, product economics, or operational failure domains.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.product-portfolio-integrity-review
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

# Product Portfolio Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review account, wallet, subscription, and brand integration as separate portfolio decisions. Reduce
the cost of trying a second product without letting one product's entitlement, fraud state, variable
cost, outage, data access, or reputation silently control every other product.

<!-- mustflow-section: use-when -->
## Use When

- Several products compare one account with separate accounts, a shared account portal, common login,
  linked identities, shared workspaces, or product-specific membership.
- Products compare one common credit wallet with separate balances, service conversion rates,
  product-specific grants, portfolio credits, or cross-service spend.
- A business compares individual subscriptions, an all-products subscription, pure bundling, mixed
  bundling, optional add-ons, shared allowances, or usage overage.
- Products compare one umbrella brand, endorsed product brands, independent brands, rebranding,
  parent-brand guarantees, or failure and reputation spillover.
- Reuse, cross-product adoption, bundle churn, paid recharge, contribution, cannibalization, support,
  abuse, or portfolio customer value is created, changed, reviewed, or reported.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is implementation of a Product Registry, shared auth, billing, entitlements, credit ledger,
  account portal, admin console, or app factory without a commercial portfolio decision; use
  `small-service-platform-architecture-review` and the narrower technical owner.
- The task only changes atomic credit reservation, lot allocation, refund, expiry, reconciliation, or
  wallet concurrency; use `credit-ledger-integrity-review`.
- The task only changes generic price levels, annual billing, trials, or one product's subscription
  model; use `pricing-model-integrity-review`.
- The task only changes cross-promotion placement, affiliate acquisition, result watermarking, or
  campaign fatigue; use `growth-distribution-integrity-review`.
- The task requests jurisdiction-specific identity, stored-value, accounting, tax, competition,
  trademark, contract, privacy, or consumer-law advice. Use current qualified authority.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Portfolio ledger: products, customer segments, jobs, purchase owners, workflow adjacency,
  substitutes and complements, cost shape, support expectations, trust promise, risk class, and
  current shared or separate surfaces.
- Identity ledger: global user identity, credentials, organizations, workspaces, memberships, roles,
  service access, data ownership, consent, account linking, recovery, deletion, export, suspension,
  fraud state, and support authority.
- Wallet ledger: wallet and lot owner, paid, subscription, promotional, referral, refund, and
  product-specific classes; service exchange rate, variable cost, quote, reservation, capture,
  release, reversal, expiry, cap, recharge, abuse, and reconciliation.
- Package ledger: individual product, bundle, add-on, allowance, overage, price, entitlement, service
  cost, downgrade, upgrade, pause, cancellation, refund, migration, and grandfathering.
- Brand ledger: parent and product name, audience and job fit, quality promise, evidence transfer,
  endorsement strength, visual relationship, contract party, support, status communication,
  incident spillover, privacy or safety risk, and separation claim.
- Economics ledger: eligible conversion, second-product first owned value, paid reuse, recharge,
  individual-to-bundle upgrade, multi-subscription downgrade, incremental revenue, variable cost,
  support, fraud, refund, churn, dormant entitlement, and retained portfolio contribution.
- Experiment ledger: account, wallet, package, and brand version; assignment time and unit; rollout
  order; holdout; migration effects; interference; horizon; guardrails; and promotion rule.

<!-- mustflow-section: preconditions -->
## Preconditions

- Separate account identity, authentication, authorization, wallet rights, package entitlements, and
  brand presentation. Sharing one does not authorize sharing the others.
- Define the second-product owned-value event and portfolio contribution outcome before calling
  login reuse, credit spend, bundle enrollment, or shared branding successful.
- Treat copied wallet ratios, bundle discounts, brand-fit scores, churn lifts, product counts, and
  rollout sequences as hypotheses, not defaults.
- Refresh current identity, stored-value, payment, tax, accounting, privacy, trademark, platform, and
  competition constraints before changing live rights or public brand claims.
- This skill does not authorize account merges, wallet transfers, entitlement migrations, price
  changes, rebranding, experiments, live messages, releases, or production changes.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine portfolio policy, identity and service-membership boundaries, wallet classes and
  exchange policy, individual and bundle packages, entitlement rules, brand architecture, failure
  isolation, experiment events, contribution metrics, fixtures, tests, docs, route metadata, and
  synchronized templates.
- Add explicit handoffs to identity, access, credit, payment, subscription, pricing, accounting,
  privacy, security, platform, trademark, or legal owners.
- Replace global account records, one undifferentiated balance, bundle-only pricing, account-churn
  theater, or logo-only isolation with explicit service rights and evidence.
- Do not merge product data, suspend unrelated products, rewrite purchased rights, silently migrate
  subscriptions, or imply operational separation that current systems and contracts do not provide.

<!-- mustflow-section: procedure -->
## Procedure

1. Split four decisions: account, wallet, subscription package, and brand architecture. Sequence them
   so one treatment does not hide the effect of another.
2. Map product relationship. Classify shared customer, purchase owner, adjacent workflow,
   complementarity, substitution, cost shape, trust promise, and risk. Common ownership alone does
   not prove that integration creates customer value.
3. Use a global identity only to remove repeated identity proof where appropriate. Keep service
   membership, workspace, organization, role, permission, consent, data, session policy, and
   suspension as explicit product-scoped facts.
4. Separate login continuity from authorization. A user recognized by product B has no B entitlement,
   tenant membership, data access, or consent until the corresponding policy grants it.
5. Design account recovery and enforcement by blast radius. Cover compromised identity, disputed
   payment, product abuse, organization removal, support lock, export, deletion, and appeal without
   turning one weak product signal into an unexplained portfolio-wide ban.
6. Measure unified account value from eligible second-product activation and retained paid use.
   Login success, account count, or free cross-use alone does not prove higher customer value.
7. Treat a shared wallet as a transfer mechanism, not demand creation. Preserve paid, subscription,
   promotional, referral, refund, and product-specific lots with their acquisition and policy
   versions.
8. Price cross-service spend explicitly. Define service exchange rates, quotes, caps, variable-cost
   exposure, premium modes, and refund rules. One nominal credit need not buy the same resource or
   outcome in products with different cost and value.
9. Prevent wallet arbitrage and cannibalization. Test whether users replace two profitable purchases
   with one smaller shared balance, route grants into the highest-cost product, or count promotional
   trial spend as paid adoption.
10. Route wallet mutation through append-only ledger, reservation, capture, release, reversal,
    idempotency, lot allocation, and reconciliation owners. This skill decides portfolio rights, not
    atomic balance implementation.
11. Split complements from substitutes before packaging. Complementary products may support a
    workflow bundle; substitutes can concentrate use in the most expensive option and may need a
    shared allowance, metered overage, or separate entitlement.
12. Compare individual-only, pure bundle, and mixed bundle at package and budget parity. Preserve
    individual purchase when one-product demand is material, and treat mixed bundling as a candidate,
    not a universal winner.
13. Price bundle migration, not only acquisition. Include upgrades, existing multi-product customers
    downgrading into a cheaper bundle, additional usage cost, unused entitlements, refunds, support,
    taxes, and later recharge or overage.
14. Keep bundle entitlement and product activation separate. A door opened by the package does not
    create cross-use; product data transfer, a concrete adjacent job, and owned value in the second
    product must still exist.
15. Distinguish bundle-level cancellation from service health. Track product-level active use,
    dormant entitlements, partial value, downgrade, pause, and payment failure so a low bundle churn
    rate does not hide a portfolio of unused products.
16. Choose a brand model from customer fit and failure cost: branded house, endorsed products, or
    independent brands. Do not make every product share one name merely because account and billing
    are shared.
17. Transfer trust only where the parent evidence applies. Compare audience, job, quality promise,
    tone, price, safety, regulation, and expected support; a trusted parent in one category does not
    guarantee competence in an unrelated or higher-risk product.
18. Treat endorsement strength as adjustable. Use parent-first naming for closely fitted core
    products, endorsement for adjacent products, and weaker or separate presentation where
    experimentation or incident cost is materially different.
19. Do not confuse brand separation with failure isolation. Verify product-scoped data access,
    deploy and dependency boundaries, status communication, support, abuse decisions, incident
    response, contracts, and recovery. A new logo cannot contain a shared outage or breach.
20. Explain shared relationships honestly. Billing descriptors, terms, privacy notices, account
    portals, support, and incident notices should not contradict the public brand structure.
21. Roll out in identifiable stages. Account continuity, bounded wallet portability, mixed packages,
    and brand changes should have separate versions, baselines, guardrails, and rollback or migration
    plans whenever feasible.
22. Measure the full portfolio. Use eligible second-product first value, paid repeat use, recharge,
    package mix, service-level activity, total variable cost, support, refunds, fraud, churn,
    incident spillover, and retained portfolio contribution rather than product count or gross bundle
    revenue.
23. Promote only a reversible policy that improves portfolio contribution and customer comprehension
    while preserving product-scoped authorization, money rights, service economics, privacy,
    support, failure containment, and honest brand promises.

<!-- mustflow-section: postconditions -->
## Postconditions

- Account, wallet, package, and brand decisions remain distinct and versioned.
- Unified identity does not imply cross-product authorization, data access, consent, entitlement, or
  global enforcement without an explicit policy.
- Shared credit preserves balance classes, service economics, paid reuse evidence, and technical
  ledger handoffs.
- Individual and bundle packages account for migration, cannibalization, usage cost, dormant value,
  and service-level health.
- Brand architecture reflects product fit and real operational failure boundaries.
- Headline value uses eligible portfolio contribution rather than account reuse, service count,
  free credit spend, gross bundle revenue, or logo reach.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and
`mustflow_check`. Do not infer live identity, wallet, payment, subscription, entitlement, brand,
analytics, experiment, migration, deployment, or production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If service membership or data ownership is implicit, do not approve a unified account migration.
- If wallet classes, service cost, or historical rights cannot be reconstructed, preserve separate
  balances until the credit owners can define safe portability.
- If bundle economics omit existing multi-product downgrades or variable usage cost, report gross
  package demand without claiming incremental profit.
- If brand fit or incident spillover is unknown, use a reversible endorsed relationship rather than
  claiming either full integration or complete isolation.
- If several portfolio axes changed together, report a bundle effect and do not claim which
  mechanism caused reuse, churn, or contribution.

<!-- mustflow-section: output-format -->
## Output Format

- Portfolio products, customers, jobs, complement or substitute relationship, cost, trust, and risk
- Global identity, service membership, authorization, data, consent, recovery, suspension, and appeal
- Wallet classes, service exchange, quote, rights, recharge, arbitrage, cannibalization, and ledger
  handoff
- Individual, bundle, add-on, overage, migration, dormant entitlement, churn, and contribution
- Parent and product brand fit, endorsement, promise, public relationship, incident spillover, and
  operational isolation
- Experiment sequencing, metrics, files changed, command intents run and skipped checks
- Remaining product-portfolio risk

