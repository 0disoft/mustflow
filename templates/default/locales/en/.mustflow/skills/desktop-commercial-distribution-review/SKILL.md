---
mustflow_doc: skill.desktop-commercial-distribution-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: desktop-commercial-distribution-review
description: Apply this skill when a commercial desktop app changes direct download versus Microsoft Store or Mac App Store distribution, hybrid store and website availability, store versus external commerce, channel fees and net receipts, installation trust, signing or notarization cost, sandbox and capability fit, discovery, checkout conversion, trials and licenses, purchase restoration, entitlement portability, update-channel ownership, review delay, enterprise or offline distribution, channel-specific support, or retained contribution and must choose distribution without forking the product or relying on stale store policy.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.desktop-commercial-distribution-review
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

# Desktop Commercial Distribution Review

<!-- mustflow-section: purpose -->
## Purpose

Choose direct, store, or hybrid desktop distribution from platform fit, customer trust, commerce,
licensing, update ownership, support cost, and incremental contribution. Keep one product contract
while channel adapters satisfy different packaging and policy boundaries.

<!-- mustflow-section: use-when -->
## Use When

- A Windows or macOS desktop app compares website download, Microsoft Store, Mac App Store, another
  approved storefront, managed enterprise distribution, or a hybrid channel strategy.
- The app compares store commerce with external checkout, subscription, perpetual license, paid
  upgrade, coupon, bundle, team license, or customer account entitlements.
- Store fees, payment processing, tax handling, refunds, chargebacks, discovery, trust, code signing,
  notarization, malware reputation, sandboxing, review delay, updates, analytics, or support change.
- Direct and store builds differ in capabilities, installers, licensing, account login, trial,
  restore, update mechanism, plugins, automation, background services, or enterprise deployment.
- A report claims one channel produces better conversion, lower fees, easier updates, more trust, or
  higher retained contribution.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes updater feeds, signatures, immutable artifacts, staged rollout, old-version
  upgrades, relaunch, or update telemetry; use `desktop-auto-update-safety-review`.
- The task only changes packaging, signing, notarization, release assets, publication, or installed
  smoke tests with a distribution channel already chosen; use the matching release, packaging, and
  platform skills.
- The task only changes checkout, payment webhooks, tax, refund, dispute, or entitlement correctness
  independent of desktop channel choice; use `payment-integrity-review`.
- The task only changes generic subscription, trial, price, regional pricing, or bundle economics;
  use `pricing-model-integrity-review` or `product-portfolio-integrity-review`.
- The task requests current platform-law interpretation or contract advice. Use official current
  platform terms and qualified authority; this skill supplies the comparison packet.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Product ledger: audience, buyer, price and cadence, core job, platform targets, capability and
  privilege needs, plugins or extensions, background services, local files, enterprise needs,
  offline use, support model, and expected update cadence.
- Channel ledger: platform, storefront or website, app type, packaging, sandbox, capability,
  signing, notarization, review, listing, regions, discovery, install trust, trial, commerce,
  entitlement, restore, update, rollback, analytics, ratings, support, and policy version.
- Economics ledger: gross price, store share, payment processing, fixed transaction fee, tax and
  merchant-of-record cost, refund, chargeback, fraud, signing, hosting, bandwidth, review delay,
  update operation, support, acquisition, retained revenue, and contribution.
- Identity and license ledger: product account, store account, transaction identity, receipt,
  license, device or seat, organization, entitlement source, restore, refund, revocation, migration,
  offline lease, and customer support lookup.
- Build ledger: common core, channel adapter, feature flags, packaging, commerce adapter, license
  adapter, update adapter, policy differences, artifact identity, version, tests, and drift owner.
- Experiment ledger: eligible buyer, acquisition source, channel availability, exposure, self-
  selection, price and package parity, platform and region, install, purchase, activation, refund,
  retained use, support, and promotion rule.

<!-- mustflow-section: preconditions -->
## Preconditions

- Separate listing and discovery, binary distribution, checkout, entitlement, update, and support.
  One channel need not own every layer.
- Identify app type and current platform policy before assuming fees, external commerce, sandbox,
  signing, entitlement, or update rules.
- Define one product identity and accepted entitlement before adding channel-specific adapters.
- Treat copied fee percentages, registration costs, conversion lifts, review times, platform defaults,
  and break-even thresholds as dated inputs, not built-in policy.
- This skill does not authorize developer enrollment, contract acceptance, store submission,
  signing-key access, notarization, publication, price changes, live checkout, migration, or release.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine channel policy, capability and sandbox matrix, direct and store packaging boundaries,
  commerce and license adapters, purchase restoration, entitlement portability, update ownership,
  channel economics, experiments, fixtures, tests, docs, route metadata, and synchronized templates.
- Add explicit handoffs to platform, packaging, signing, notarization, updater, payment, tax,
  accounting, licensing, security, privacy, enterprise distribution, or legal owners.
- Replace a forked product, gross-fee comparison, store-discovery assumption, download-as-conversion,
  or channel-specific customer orphaning with shared contracts and full-funnel evidence.
- Do not bypass store rules, weaken signing or sandbox security, hide channel limitations, duplicate
  purchases silently, or promise license portability that current receipts and contracts cannot
  provide.

<!-- mustflow-section: procedure -->
## Procedure

1. Split six decisions: discovery, binary delivery, checkout, entitlement, updates, and support.
   Compare direct, store, and hybrid combinations rather than forcing one channel to own all six.
2. Classify the app before comparing channels. Include consumer versus professional buyer, price,
   subscription or perpetual rights, system access, automation, plugins, background services,
   enterprise deployment, offline use, and support burden.
3. Refresh official platform policy by date, app type, commerce type, region, and program. A current
   non-game exception, external-link entitlement, fee, enrollment rule, or sandbox requirement does
   not automatically apply to games, another region, or a future release.
4. Build a capability matrix. Mark which features work unchanged, need an entitlement or review,
   require a channel adapter, degrade under sandboxing, or make the channel infeasible. Do not ship a
   trusted but materially crippled store build without clear disclosure.
5. Compare installation trust honestly. Include code signing, notarization, reputation warnings,
   malware scanning, hosted delivery, review, publisher identity, account trust, and enterprise
   policy; a store badge and a signed direct binary provide different evidence.
6. Compare discovery as incremental acquisition, not storefront presence. Track listing views,
   qualified installs, first owned value, purchase, retained use, and customers who would have found
   the website anyway.
7. Calculate net channel contribution. Include store share, processor and fixed fees, tax or merchant
   services, refunds, chargebacks, fraud, signing, hosting, bandwidth, review delay, update operation,
   support, acquisition, and variable product cost.
8. Derive the break-even lift for each actual price and package. A low fixed-price app, high-price
   professional app, subscription, and team license can produce different winners; do not embed one
   fee comparison as a platform law.
9. Evaluate Windows store, direct, and hybrid paths under current Microsoft policy and actual app
   type. Store distribution with external commerce can be a candidate where allowed; direct delivery
   may remain necessary for enterprise, offline, portable, privileged, plugin, or unsupported cases.
10. Evaluate Mac App Store, notarized direct, and hybrid paths under current Apple policy and actual
    capability needs. Price store trust against sandbox, commerce, review, licensing, update, and
    feature constraints rather than assuming either platform has one universal answer.
11. Keep one application core. Isolate store APIs, direct checkout, licensing, updater, packaging,
    and policy differences behind narrow channel adapters and shared feature contracts.
12. Prevent capability drift. Version the channel matrix and compare user-visible features,
    accessibility, privacy, data formats, account behavior, performance, and support across builds.
    Differences must be intentional and disclosed.
13. Define one entitlement model with channel provenance. Preserve store receipt, direct transaction,
    refund, revocation, subscription status, device or seat, organization, offline lease, and policy
    version without treating a store login as the product's only customer identity.
14. Make restoration and duplicate ownership explicit. Cover reinstall, new device, account merge,
    direct-to-store and store-to-direct migration, double purchase, family or organization access,
    refund, chargeback, cancellation, and support lookup.
15. Do not promise cross-channel portability automatically. Decide whether rights can be recognized,
    exchanged, discounted, grandfathered, or remain channel-bound according to contracts, fraud risk,
    tax, and platform policy.
16. Assign update ownership per channel. Store updates, direct updater, enterprise deployment, and
    manual offline updates need compatible versioning, migration, rollback-forward, support, and
    release notes; route implementation through `desktop-auto-update-safety-review`.
17. Account for review and release latency. Cover urgent security fixes, phased rollout, rejection,
    metadata changes, rollback, customer communication, and channel version skew.
18. Keep trials and checkout promises channel-aware. State whether trial duration, renewal, refund,
    coupon, perpetual license, paid upgrade, bundle, and team purchase are available and equivalent;
    do not hide a weaker channel after acquisition.
19. Measure self-selection. Direct and store customers can differ in trust, technical ability,
    geography, price sensitivity, enterprise policy, and acquisition source. Use matched cohorts,
    staged availability, channel-specific links, or other causal evidence before attributing all
    outcome differences to the channel.
20. Judge the full funnel: eligible exposure, listing or landing visit, download, successful install,
    first owned value, purchase, refund, retained use, update health, support, and contribution.
    Downloads and gross store revenue are not the headline result.
21. Promote only a reversible channel policy that improves retained contribution while preserving
    necessary capability, accurate store and website claims, signing and update safety, entitlement
    recovery, customer support, and current platform compliance.

<!-- mustflow-section: postconditions -->
## Postconditions

- Discovery, distribution, commerce, entitlement, update, and support ownership are explicit per
  channel.
- Store and direct builds share one product core with bounded, observable channel adapters.
- Platform capability, sandbox, signing, notarization, policy, commerce, and review constraints are
  current or explicitly unverified.
- Purchases can be reconstructed, restored, refunded, revoked, supported, and migrated according to
  a declared channel policy.
- Headline channel performance uses retained contribution rather than nominal fees, downloads,
  listing presence, gross revenue, or update convenience.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and
`mustflow_check`. Do not infer live store, enrollment, signing, notarization, payment, licensing,
submission, publication, analytics, installer, updater, deployment, or production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If current store policy or regional applicability cannot be verified, mark the channel rule
  unverified and do not encode it as product behavior.
- If a store channel removes a core capability, compare a disclosed limited edition or reject the
  channel; do not hide the loss behind install trust.
- If entitlement provenance or restore behavior is missing, do not launch a second paid channel that
  can orphan or double-charge customers.
- If channel economics omit review delay, support, refunds, signing, update, or acquisition, report a
  nominal fee comparison rather than a profitability decision.
- If store and direct builds require diverging product cores, stop and define the missing adapter or
  intentionally separate product contract before expanding both.

<!-- mustflow-section: output-format -->
## Output Format

- Product, buyer, platform, price, capability, privilege, enterprise, offline, and update needs
- Direct, store, and hybrid discovery, delivery, checkout, entitlement, update, and support matrix
- Current policy source and date, sandbox, signing, notarization, review, and channel limitation
- Gross price, fees, tax, refund, fraud, signing, hosting, update, support, acquisition, retained
  contribution, and break-even lift
- Product core, channel adapters, feature parity, receipt, license, restore, portability, migration,
  duplicate purchase, and version-skew policy
- Experiment evidence, files changed, command intents run and skipped checks
- Remaining desktop-commercial-distribution risk

