---
mustflow_doc: skill.client-platform-strategy-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: client-platform-strategy-review
description: Apply this skill when a consumer or prosumer product chooses responsive web versus mobile app first, mobile web versus PWA versus cross-platform or native clients, an app as an acquisition or retention surface, native break-even users, operating-system capability dependence, or local-first versus cloud-first desktop data ownership, offline behavior, synchronization, recovery, privacy, and client-platform investment sequencing.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.client-platform-strategy-review
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

# Client Platform Strategy Review

<!-- mustflow-section: purpose -->
## Purpose

Choose web, PWA, cross-platform, native, local-first, cloud-first, or hybrid client architecture
from the product job, operating-system capabilities, complete funnel economics, data authority, and
failure recovery. Prevent platform prestige, raw install retention, or storage price from replacing
an actual investment and usability decision.

<!-- mustflow-section: use-when -->
## Use When

- A new B2C or prosumer service compares responsive web-first with iOS, Android, or another native
  app-first launch.
- A product compares mobile web, installable PWA, wrapped web, shared cross-platform client, or
  separate native clients.
- A proposal treats an app as acquisition, retention, notification, offline, device-capability, or
  checkout infrastructure and needs a break-even user or retained-contribution model.
- A desktop or mobile product compares local-only, local-first with sync, cloud-first with cache, or
  server-only data ownership.
- Offline work, device files, collaboration, multi-device recovery, conflict resolution, privacy,
  encryption, account rights, or sync engineering changes the client strategy.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The client platform is already chosen and the task only compares website, Microsoft Store, Mac
  App Store, or hybrid desktop sales and distribution; use
  `desktop-commercial-distribution-review`.
- The task only implements one frontend framework, native bridge, service worker, cache, installer,
  updater, mobile permission, or platform API; use the matching implementation and platform skill.
- The task only changes synchronization algorithms, database migrations, encryption, access
  control, backup, or privacy behavior after the authority model is fixed; use the narrower data,
  security, privacy, migration, or architecture skill.
- The task only selects a framework, vendor, database, or runtime; use `technology-stack-selection`.
- The task requests current platform-law, tax, app-store contract, or consumer-rights advice. Use
  current official policy and qualified authority; this skill supplies the decision packet.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Product job ledger: target user, first owned value, repeat cadence, session length, acquisition
  source, sharing, search demand, price, payer, support, accessibility, and expected retention.
- Capability ledger: camera, location, Bluetooth, wearable, background execution, notification,
  widgets, low-latency media, offline duration, filesystem, plugins, secure hardware, and platform
  restrictions.
- Funnel ledger by eligible user: impression, landing or listing visit, install or open, permission,
  signup, first value, purchase, refund, retained use, support, and contribution.
- Client cost ledger: design, implementation, shared and platform-specific code, QA devices,
  accessibility, analytics parity, store review, deep links, notifications, checkout restoration,
  OS updates, support, and decommissioning.
- Data ledger: record and file classes, authoritative owner, size and growth, device count,
  collaboration, offline edits, consistency, deletion, retention, export, backup, restore, audit,
  quota, abuse, and legal authority.
- Sync and recovery ledger: local database, change log, outbox, server replica, versioning, conflict
  policy, stale client, duplicate, clock, tombstone, account merge, key recovery, device loss, and
  disaster recovery.
- Current platform ledger: operating-system and browser versions, install and notification behavior,
  payment policy, fees, permitted commerce, signing, review, capability support, region, program,
  source date, and confidence.
- Experiment ledger: eligible cohort, assignment before channel choice, acquisition source,
  capability need, platform availability, self-selection, promotion, horizon, and guardrails.

<!-- mustflow-section: preconditions -->
## Preconditions

- Separate launch surface, installability, native capability, commerce, retention, and data authority.
  One choice does not prove the others.
- Compare web and app cohorts from the same eligible population or explicitly model self-selection.
- Define a usable retained outcome and contribution before calculating break-even users.
- Treat copied development multipliers, fee percentages, conversion lifts, user thresholds, storage
  prices, and platform features as dated assumptions, not built-in defaults.
- Refresh current platform behavior by OS, browser, region, app type, commerce type, and program
  before changing live product or financial policy.
- This skill does not authorize developer enrollment, app submission, payment changes, production
  experiments, data migration, cryptographic key access, release, or deployment.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine client strategy, capability matrices, funnel and contribution models, platform
  sequencing, data-authority maps, offline and sync contracts, recovery and privacy policies,
  experiments, events, fixtures, tests, docs, route metadata, and synchronized templates.
- Add explicit handoffs to frontend, mobile, desktop, payments, store distribution, accessibility,
  sync, database, security, privacy, backup, or migration owners.
- Replace platform ideology, raw install comparison, gross fee arithmetic, last-write-wins data loss,
  or local-storage marketing with explicit capabilities, economics, authority, and recovery evidence.
- Do not fork the domain model without evidence, hide platform limitations, weaken privacy or
  accessibility, migrate user data silently, or promise offline, sync, recovery, or encryption that
  the current architecture cannot provide.

<!-- mustflow-section: procedure -->
## Procedure

1. Split two primary decisions: client delivery surface and data authority. A web-first launch can
   still use local data, and a native app can still be cloud-authoritative.
2. Classify whether the operating system is part of the product's core value. Mark required camera,
   continuous location, Bluetooth, wearable, background, notification, widget, low-latency media,
   filesystem, secure hardware, or offline capability and test whether the web path actually meets
   the requirement on each target platform.
3. Start from the smallest surface that can deliver representative first value. Responsive web is a
   candidate when link, search, sharing, immediate trial, and one code path dominate; native-first
   is a candidate when a required OS capability or app-native usage loop is the product itself.
4. Treat the web as an acquisition candidate and an installed app as a retention candidate, not as
   universal truths. Measure how each surface changes the complete funnel for the same eligible
   users.
5. Separate PWA layers. Decide responsive fit, manifest and install, notification, service-worker
   caching, offline reads, offline writes, background behavior, and sync independently. Do not build
   a complex offline layer merely to earn a PWA label.
6. Sequence capability investment. A reversible candidate is responsive product value, then install
   and notification for proven repeat users, then bounded offline behavior for observed need, then
   shared or native clients when retained contribution can pay for them.
7. Compare client costs across the full lifecycle. Include duplicated design and implementation,
   platform QA, devices, accessibility, analytics drift, permissions, deep links, authentication,
   payment restoration, store review, OS changes, support, and release coordination.
8. Use D30-or-product-cadence qualified CAC, not click cost versus install cost. Count a user only
   after representative value and the chosen retention horizon; an app install is not an accepted
   product outcome.
9. Calculate net contribution per eligible user. Include payment and store costs, refund, variable
   product cost, acquisition, support, platform operations, and retention value. If native contribution
   per user is not higher after variable costs, more users cannot repay fixed native investment.
10. Derive break-even users from current inputs. Divide incremental fixed and step-fixed native cost
    by incremental retained contribution per comparable active user. Include extra acquisition cost
    and report zero, negative, or unstable denominators instead of manufacturing a threshold.
11. Run sensitivity around the assumptions that can reverse the result: eligible paid conversion,
    repeat use, app retention lift, store fee, price, refund, native QA cost, new-user share, and
    channel-specific CAC. Report a range, not one magic MAU count.
12. Correct self-selection. App users may have higher pre-existing intent. Use staged invitations,
    matched cohorts, randomized prompts, or another defensible design before calling observed app
    retention causal.
13. Map data authority by class. Keep identity, billing, entitlement, organization membership,
    quota, abuse, audit, and legal deletion server-authoritative when central enforcement is required.
    Decide user content authority separately.
14. Choose local-first when immediate response, offline creation, large personal files, user custody,
    or long-lived device ownership materially creates value. Choose cloud-first when collaboration,
    instant cross-device state, central authorization, audit, recovery, or server-side transactions
    dominate. Treat both as candidates, not ideology.
15. Prefer explicit hybrids. A local-first client may use encrypted replication and backup; a
    cloud-first client should still use a durable local cache and outbox where interrupted work must
    survive. Name the authority and failure behavior for every data class.
16. Price local-first engineering honestly. Include local schema migration, corruption handling,
    change logs, retry, deduplication, tombstones, stale clients, conflict UX, compatibility,
    encryption, key recovery, export, and support. Avoid comparing that engineering cost with raw
    object-storage price alone.
17. Define sync semantics before choosing an algorithm. Cover concurrent edits, delete-versus-edit,
    uniqueness, ordering, access revocation while offline, quota crossing, account merge, and old
    client reappearance. Last write wins and CRDTs do not decide product policy automatically.
18. Use the simplest conflict model that meets the product. Document versions, three-way merge, or
    conflict copies can be safer than a general collaborative CRDT when simultaneous editing is not
    a core job.
19. Make privacy claims reconstructable. State what remains only on device, what is replicated,
    whether the service can decrypt it, what telemetry leaves the device, how keys are stored, and
    how loss, export, deletion, remote wipe, and recovery work.
20. Separate confidentiality from recoverability. End-to-end or client-side encryption can reduce
    provider access while making forgotten-key recovery harder; define recovery keys, trusted-device
    transfer, or explicit irrecoverability without misleading promises.
21. Measure full outcomes: eligible acquisition, first value, qualified retained use, purchase,
    refund, support, sync conflict, lost work, recovery success, privacy complaints, platform failure,
    and retained contribution.
22. Promote only a reversible strategy that meets required capabilities, improves retained
    contribution, preserves accessible and honest UX, assigns every data authority, and has a tested
    recovery model before irreversible migration.

<!-- mustflow-section: postconditions -->
## Postconditions

- Launch surface, install, native capability, commerce, retention, and data authority decisions are
  explicit rather than collapsed into web versus app ideology.
- Break-even uses comparable eligible users, full lifecycle costs, incremental retained contribution,
  self-selection controls, and sensitivity ranges.
- Every data class has an authority, offline behavior, conflict rule, privacy statement, backup, and
  recovery owner.
- Local-first and cloud-first claims include sync and failure cost rather than raw latency, storage
  price, or marketing language alone.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and
`mustflow_check`. Do not infer live store, browser, mobile device, payment, notification, signing,
submission, analytics, migration, sync, encryption, backup, recovery, deployment, or production
commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If required capabilities cannot be verified on a target surface, mark that surface unknown or
  infeasible instead of assuming parity.
- If comparable funnel cohorts or incremental per-user contribution are missing, report the native
  break-even as non-decision-ready.
- If the denominator is zero or negative, report that no finite user count repays the modeled native
  investment under those assumptions.
- If data authority, conflict semantics, key recovery, or lost-device recovery is undefined, do not
  approve local-first or cloud-first migration.
- If current store or platform policy cannot be refreshed, keep policy-dependent economics dated and
  unverified rather than encoding them as a default.

<!-- mustflow-section: output-format -->
## Output Format

- Product job, eligible user, first value, repeat cadence, platform, and required capability
- Responsive web, PWA, cross-platform, and native capability and lifecycle-cost matrix
- Comparable funnel, qualified CAC, retained contribution, break-even range, sensitivity, and
  self-selection evidence
- Data classes, authority, local and server state, offline behavior, conflicts, sync, privacy,
  encryption, backup, export, deletion, and recovery
- Current platform source and date, files changed, command intents run and skipped checks
- Remaining client-platform strategy risk
