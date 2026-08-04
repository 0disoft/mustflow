---
mustflow_doc: skill.vendor-portability-exit-readiness-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: vendor-portability-exit-readiness-review
description: Apply this skill when a cloud, managed service, SaaS, database, cache, queue, identity, payment, email, storage, observability, AI, deployment, or external API dependency must remain replaceable or recoverable through owned identifiers, semantic export, configuration reconstruction, provider adapters, control-plane separation, restore programs, exit drills, survival modes, and measured switching evidence. Do not use it merely to ban provider-specific features or to claim portability from Kubernetes, Terraform, open source, an export button, or an untested backup.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.vendor-portability-exit-readiness-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Vendor Portability and Exit Readiness Review

<!-- mustflow-section: purpose -->
## Purpose

Keep valuable provider-specific capabilities while preventing a vendor from becoming the only owner
of product meaning, identifiers, data, configuration, recovery control, or operating knowledge.

Portability means a tested ability to reconstruct an agreed product capability within its recovery
budget. It does not mean every component runs unchanged on every provider.

<!-- mustflow-section: use-when -->
## Use When

- A cloud, managed database, cache, queue, identity, payment, email, object storage, analytics,
  logging, AI, deployment, marketplace, or SaaS dependency is introduced, reviewed, renewed,
  replaced, or assigned an exit plan.
- Export, import, backup, restore, provider migration, alternate deployment, disaster recovery,
  account suspension, service shutdown, price increase, terms change, or data-egress risk matters.
- Provider SDKs, identifiers, URLs, event envelopes, dashboard configuration, secrets, logs,
  generated artifacts, or operational procedures may have leaked into product contracts.
- A portability, self-hosting, open-source, infrastructure-as-code, multi-cloud, backup, recovery,
  or vendor-neutral claim needs executable evidence.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is choosing among technologies before adoption; use `technology-stack-selection` first
  and this skill only for the exit-evidence slice.
- The task is defining a new repository or feature structure before implementation; use
  `structure-discovery-gate` first.
- The task changes database schema, ownership, transactions, query behavior, or data lifecycle; use
  `database-change-safety` for that boundary.
- The task executes a schema, data, provider, or platform migration; use `migration-safety-check`
  for the migration plan and this skill for portability evidence.
- The task is only retry, timeout, circuit-breaker, webhook, queue, payment, auth, backup, or disaster
  recovery correctness without a vendor-exit requirement; use the narrower reliability skill.
- The task primarily concerns merchant onboarding, payment-product approval, processor rejection,
  reserve, suspension, remediation, appeal, or approved-scope gating rather than provider exit; use
  `payment-provider-underwriting-readiness-review`.
- The goal is to replace useful provider features with the lowest common denominator without an
  evidence-backed exit requirement.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Dependency ledger: provider, product responsibility, critical user capabilities, sync or async
  path, data classes, identifiers, configuration, secrets, events, logs, pricing units, terms,
  outage behavior, owner, and current alternatives.
- Exit objective: trigger, capability scope, recovery tier, acceptable data loss and outage,
  required evidence, target environment, deadline, and authority to activate or migrate.
- Coupling ledger: SDK and type imports, provider fields, query or event semantics, URLs, IAM,
  deployment state, dashboards, automation, observability, support procedures, operator knowledge,
  contracts, egress limits, and deletion obligations.
- State ledger: canonical product state, provider-owned state, derived or rebuildable state,
  snapshots, change streams, files, permissions, relations, versions, tombstones, audit history,
  automation rules, and external identifier mappings.
- Reconstruction ledger: artifacts, environment schema, migrations, config declarations, secret
  reissuance, domains, certificates, images, backups, keys, restore order, smoke checks, rollback,
  and clean-account access.
- Current export, import, restore, reconciliation, alternate-provider, and exit-drill evidence plus
  configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Define the user capability being preserved before selecting a portability mechanism.
- Separate routine component failure, provider-wide outage, account loss, contract change, price
  shock, product shutdown, and deliberate migration; they need different responses.
- Treat provider documentation, sales promises, export buttons, infrastructure code, open-source
  labels, backups, and architecture diagrams as inputs, not proof of successful exit.
- Keep production migration, failover, DNS, secrets, customer communication, deletion, and external
  account actions behind their existing approval and command boundaries.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine dependency and coupling ledgers, product-owned contracts, provider adapters,
  capability declarations, identifier mappings, archive schemas, restore programs, configuration
  declarations, survival modes, drills, fixtures, tests, docs, and synchronized templates.
- Localize provider-specific types and semantics without hiding required capabilities or failure
  differences.
- Add explicit accepted lock-in with owner, benefit, exit trigger, budget, evidence gap, and revisit
  date when replacement is intentionally deferred.
- Do not launch a migration, duplicate production writes, change DNS, rotate secrets, disable a
  provider, create external infrastructure, or claim a recovery objective was met without the
  corresponding authority and evidence.

<!-- mustflow-section: procedure -->
## Procedure

1. Define portability by user capability and exit trigger.
   - Name what users must still be able to do: sign in, read owned data, verify payment state,
     download files, submit durable work, cancel, refund, export, or contact support.
   - Assign a recovery tier from business impact and dependencies. Derive recovery objectives from
     current product evidence instead of copying generic RPO, RTO, traffic, or drill frequencies.
2. Decompose lock-in instead of scoring only runtime choice.
   - Inspect data and metadata, identifiers, API semantics, permissions and identity, event models,
     deployment and IAM, configuration, observability, operational procedures, contracts, egress,
     staff knowledge, and account recovery.
   - Estimate P50 and P90 exit cost across engineering, transfer, conversion, parallel operation,
     downtime, contract penalties, training, support, and verification. Record assumptions and the
     critical path rather than emitting one confidence-free score.
3. Separate product truth from provider execution.
   - Keep stable product-owned IDs and map provider subjects, customer IDs, subscription IDs,
     object IDs, message IDs, and request IDs explicitly. Do not make a provider URL or identifier
     the public identity of owned data.
   - Keep customer, entitlement, permission, purchase, file ownership, delivery, suppression,
     webhook processing, and other essential facts explainable without a provider dashboard.
   - Classify caches, indexes, replicas, provider event streams, and generated views as derived only
     when a tested source and deterministic rebuild path exist.
4. Use domain-shaped ports and honest capability declarations.
   - Expose product actions such as starting checkout, sending a reset, storing an owned asset, or
     claiming a job instead of renamed provider SDK methods or generic CRUD wrappers.
   - Keep provider SDK imports, wire types, errors, URLs, event translation, and configuration in
     owned adapter boundaries. Prevent `metadata` or untyped option bags from smuggling provider
     semantics back into the core.
   - Declare required capabilities and fail explicitly when an implementation lacks them. Do not
     silently emulate transaction, ordering, locking, TTL, streaming, consistency, idempotency, or
     policy behavior with weaker semantics.
5. Preserve provider-specific advantages without making them the only execution path.
   - Keep optimized provider entrypoints and features when they earn their cost, but maintain an
     appropriate standard or alternate entrypoint for the critical capability when the exit tier
     requires it.
   - Build immutable application artifacts in an owned pipeline when reproducible deployment is in
     scope. Record artifact identity and runtime assumptions; infrastructure-as-code reproducing one
     vendor resource does not translate its semantics to another vendor.
6. Build semantic export and consistent snapshot evidence.
   - Define a snapshot cutoff and preserve the change cursor or bounded write-freeze needed to make
     records, files, relations, permissions, versions, tombstones, events, and audit history agree.
   - Convert provider exports into a documented archive with schema version, snapshot identity and
     cutoff, file inventory, record counts, encodings, checksums, predecessor, dependencies, and
     restore order. Keep original provider material only when it is needed for audit or recovery.
   - Measure export creation, rate-limit waiting, transfer, validation, conversion, import, and
     change catch-up at representative scale. An archive that cannot catch up with ongoing writes
     is not an exit path.
7. Reconstruct configuration, secrets, and control assets.
   - Store ordinary settings, roles, policies, webhooks, automations, domains, cron, routes,
     retention, and deployment intent in reviewable declarations when possible.
   - Inventory non-exportable secrets separately and document reissuance, trust rollover, customer
     impact, and revocation order without putting secret values in archives or source control.
   - Keep the minimum escape control set outside the primary failure domain when risk requires it:
     domain registration, DNS authority, code or release artifact mirror, backup copy, decryption
     recovery, emergency credentials, status communication, and the exit runbook.
8. Export operational evidence continuously when history matters.
   - Stream critical audit, billing, permission, file, job, webhook, security, and provider-call
     events into an owned or independently recoverable store with event identity, sequence or
     cursor, occurrence and receipt times, deduplication, gap detection, retention, and integrity.
   - Do not call a periodically downloaded dashboard report a reconstructable event history.
9. Treat uncertain external outcomes explicitly.
   - Persist durable work and provider intent before long or side-effecting calls. Preserve the
     provider request identity, idempotency key, attempt, normalized outcome, raw evidence boundary,
     and reconciliation state.
   - Do not fail over an ambiguous payment, refund, email, storage write, or other side effect to a
     second provider until the first outcome is known or a domain-specific duplicate policy permits
     it. Provider replacement and transient retry are different state transitions.
10. Migrate from one writer with reconciliation.
    - Keep one authoritative writer while outbox, CDC, snapshot plus change replay, or another owned
      feed populates the target. Compare shadow reads and domain invariants before changing read or
      write authority.
    - Require zero unexplained divergence for money, permissions, identity, entitlement, deletion,
      and other critical facts. Do not use application-level dual writes as the portability plan.
11. Make restore and import restartable products.
    - Provide dry run, validation, dependency ordering, checkpoints, bounded retries, rate-limit
      handling, failed-item quarantine, resumability, idempotency, source-to-target identifier maps,
      reconciliation, and a final product smoke contract.
    - Prove permissions, relations, files, checksums, search reconstruction, automations, suppression,
      webhooks, and operator access where they are part of the exit objective; record intentionally
      omitted derived data.
12. Design the smallest useful survival mode.
    - Prefer preserving critical read, ownership, money-status, export, cancellation, support, and
      durable request-acceptance paths over cloning the entire provider stack.
    - Choose cold, warm, or active alternatives from the required recovery objective and conflict
      model. Do not buy synchronous multi-provider complexity for a risk that tested clean rebuild
      and restore can satisfy.
13. Run exit drills against an independent boundary.
    - Restore into a clean account, region, environment, or replacement product appropriate to the
      threat. Exercise artifact deployment, configuration reconstruction, secret reissuance or test
      substitutes, archive import, change catch-up, smoke checks, and rollback.
    - Record elapsed stages, data loss, missing records, checksum and permission differences,
      unresolved external identities, log gaps, manual steps, egress cost, and operator decisions.
      A successful backup job, generated plan, or empty-environment boot is not restore proof.
14. Test every supported adapter against the same semantic failures.
    - Cover unavailable service, timeout with unknown result, rate limit, duplicate and reordered
      events, partial export, corrupt archive, interrupted restore, stale cursor, cache loss, queue
      redelivery, target throttling, unsupported capability, and provider-specific malformed data.
    - Assert equivalent product invariants and explicit differences, not identical wire responses.
15. Label the final evidence honestly.
    - Distinguish documented, implemented, built, exported, imported, restored, reconciled, drilled,
      and production-proven states.
    - Report accepted lock-in and untested escape paths with owners and triggers. Do not infer
      portability from standards, adapters, multiple vendors, or the existence of a runbook.

<!-- mustflow-section: postconditions -->
## Postconditions

- Critical capabilities have an owned source of truth, identifier boundary, export and restore
  shape, reconstruction path, recovery objective, and current evidence level or an explicit gap.
- Provider-specific features remain localized and their required semantics are visible rather than
  flattened into an unsafe lowest-common-denominator abstraction.
- Control assets, settings, secrets, logs, artifacts, and operator knowledge needed for exit do not
  share an unexplained single provider or account failure domain.
- Portability claims name the tested scope, target, data snapshot, elapsed time, divergence, and
  skipped paths.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured adapter, export/import, restore, migration, reconciliation, packaging,
or documentation check that covers the changed boundary. Do not invent cloud accounts, network
probes, production failovers, secret rotations, or destructive drills outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the product capability or source of truth is unknown, stop the portability claim and name the
  missing owner.
- If an export omits relations, permissions, files, versions, tombstones, settings, or provider
  mappings required by the exit objective, classify it as partial rather than filling gaps by guess.
- If target semantics are weaker, reject the adapter, narrow the supported capability, or require an
  explicit product downgrade; do not silently emulate correctness.
- If restore has not run in an independent boundary, report backup or archive evidence only.
- If the outcome of a side effect is unknown, reconcile it before retrying or switching providers.
- If the exit requires production migration, account access, DNS, secrets, customer action, legal
  review, or vendor coordination, stop at that authority boundary with a bounded handoff packet.

<!-- mustflow-section: output-format -->
## Output Format

- Vendor dependency and critical-capability scope
- Exit triggers, recovery tiers, objectives, and evidence level
- Coupling, product-truth, identifier, adapter, and capability findings
- Data archive, configuration, secret, log, artifact, and control-asset findings
- Restore, reconciliation, survival-mode, and drill evidence
- P50 and P90 exit-cost assumptions and accepted lock-in
- Fixes or recommendations
- Command intents run and skipped checks
- Remaining portability, migration, recovery, provider, and authority risk
