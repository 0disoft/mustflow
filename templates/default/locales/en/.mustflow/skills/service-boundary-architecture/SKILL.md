---
mustflow_doc: skill.service-boundary-architecture
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: service-boundary-architecture
description: Apply this skill when service boundaries, modular-monolith boundaries, data ownership, queue/event boundaries, multi-tenant isolation, failure flow, independent deployment, operational recovery, disaster recovery, service split evidence, team ownership, cost, toil, or large-scale architecture split decisions are designed, reviewed, or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.service-boundary-architecture
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - test
    - lint
    - build
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Service Boundary Architecture

<!-- mustflow-section: purpose -->
## Purpose

Design or review large-system boundaries by starting with ownership, failure, data coupling, and operations. Treat service splits, queues, caches, events, and deployment topology as consequences of the boundary model, not as architecture decorations.

This skill protects against the common failure mode where a system is split by nouns, shares data anyway, retries blindly, emits ambiguous events, lacks tenant isolation, and then discovers during an incident that no team owns the truth.

<!-- mustflow-section: use-when -->
## Use When

- A task designs, reviews, documents, or changes service boundaries, modular-monolith boundaries, bounded contexts, team ownership, API ownership, event ownership, queue ownership, or data ownership.
- A monolith is being prepared for future split, a microservice split is proposed, or a service/module boundary is causing deploy, data, incident, or team coordination pain.
- The task touches cross-service transactions, outbox/inbox patterns, idempotency, retries, timeouts, caches, read models, search models, shared databases, operational tools, manual correction, observability, tenancy, hot keys, or failure recovery.
- A boundary claim needs proof from recent co-change history, independent deployability, dependency direction, database write ownership, synchronous call depth, queue backlog behavior, graceful shutdown, health probe correctness, version compatibility, restore or DR drills, least-privilege access, config blast radius, cost, toil, or team bottlenecks.
- Architecture docs, decision records, onboarding docs, or skills need durable guidance for large-system design and operational readiness.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a small local refactor with no ownership, data, deployment, or operational boundary decision; use `architecture-deepening-review` or `behavior-preserving-refactor`.
- The task only changes a single API shape; use `api-contract-change`.
- The task only changes database schema or persistence safety inside one owner; use `database-change-safety` or `database-migration-change`.
- The task only changes one external provider adapter; use `adapter-boundary`.
- The task only models one lifecycle state machine; use `state-machine-pattern`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Candidate domains, capabilities, teams, modules, services, and the reason each boundary may need to exist.
- Data ownership map: which module or service is the source of truth for each core fact, identifier, status, ledger, permission, tenant record, event, and read projection.
- Current or proposed communication paths: direct calls, APIs, events, queues, shared databases, shared caches, batch jobs, search indexes, analytics stores, files, and admin tools.
- Failure flows: duplicate requests, partial success, timeout, retry, consumer crash, queue backlog, dead-letter handling, external provider uncertainty, reconciliation, and manual correction.
- Boundary proof ledger: last 3 months of PR co-change by repository, service, schema, deployment pipeline, and team; independent deploy test; dependency cycle map; table write ownership; synchronous call count; non-core dependency failure behavior; timeout and retry budget; queue oldest age; saturation curve; noisy-neighbor evidence; graceful shutdown; health probe split; old/new version compatibility; trace continuity; user-facing SLOs; local dev setup cost; ADR rationale; least-privilege access; config blast radius; restore and DR drill; cost per feature or customer; toil and approval bottlenecks.
- Consistency expectations: strong consistency, eventual consistency, tolerated delay, stale reads, cache invalidation, read/write split, search delay, and deletion or retention rules.
- Tenant, authorization, observability, deployment, migration, and operations requirements.
- Configured verification intents and any existing architecture decision records or context files.

<!-- mustflow-section: preconditions -->
## Preconditions

- Do not start by choosing microservices, Kafka, Kubernetes, service mesh, CQRS, or event sourcing. Start by identifying ownership and failure pressure.
- Do not split by nouns alone. Check which rules and data change together, which teams own them, and which failures must be isolated.
- Treat shared databases, shared caches, and table reads across owners as coupling evidence even when code appears separated.
- Treat architecture diagrams as secondary evidence. Decision records, ownership maps, failure behavior, and recovery tools are the durable contract.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Architecture docs, decision records, context files, workflow skills, tests, fixtures, schema notes, operational runbook notes, and directly related source changes.
- Boundary diagrams only when they are backed by ownership, data, failure, and operations text.
- Module, service, API, event, queue, cache, read-model, or operations-tool boundaries when the repository scope and command contract support that edit.
- Do not introduce new infrastructure, service topology, queue systems, brokers, databases, orchestration platforms, or deployment tools unless the user explicitly requests that implementation and the repository already has an approved path.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the business capabilities and the facts each capability owns. For every core fact, identify exactly one source of truth and the owner responsible for correcting it.
2. Split first by reason to change, not by noun. Keep code together when it changes together; split only when ownership, release cadence, scale, compliance, failure isolation, or team autonomy makes the boundary useful.
3. Prove whether the proposed boundary is real.
   - Mine recent PRs or change records when available: count repositories, services, DB schemas, deployment pipelines, and teams touched by one small requirement.
   - Try the independent-deploy thought experiment: if one boundary cannot ship without another service version, shared library, DB migration, frontend deploy, or meeting, it is not independent yet.
   - Draw dependency direction and cycles. Cycles usually mean the responsibility and data boundary is wrong, not merely that imports need cleaning.
   - Count how many synchronous services and stores must succeed for one user action. If the answer is "many, or humans fix the database," the consistency boundary may be split in the wrong place.
4. Prefer a modular monolith with hard internal boundaries when the team is still discovering the domain. Draw future split lines early, but do not pay distributed-system costs before the boundary pressure is real.
5. Reject shared database ownership. If another service or module needs data, choose an API, event, read projection, export, or explicitly owned query surface instead of direct table coupling. Table write ownership should be explicit for every core fact.
6. Design failure flows before the happy path. Cover partial success, duplicated requests, timeout, unknown external outcome, consumer crash, queue backlog, dead-letter handling, replay, reconciliation, and manual recovery.
7. Require idempotency for commands that create, charge, reserve, approve, issue, grant, cancel, refund, redeem, or mutate durable state. Use stable request keys and return the previous result for duplicate keys.
8. Treat queues as storage and backpressure, not magic. Define retry policy, exponential backoff or jitter, max attempts, retention, dead-letter ownership, consumer scaling, ordering expectations, replay safety, loss tolerance, oldest-message age, and catch-up rate.
9. Every network call across the boundary needs a timeout, bounded retry policy, fallback or failure result, duplicate-safety story, observability identifiers, and a request-level budget so retries do not multiply across layers.
10. Treat caches as a consistency tradeoff. Declare which stale values are acceptable, max staleness, invalidation owner, tenant and permission visibility, and whether the cache is allowed to become authority.
11. Model authorization, tenant isolation, audit, and data visibility at the boundary. Tenant ID must travel through APIs, queues, caches, logs, files, reports, and admin tools when the system is multi-tenant. Service accounts should have only the DB, queue, storage, and API permissions the boundary needs.
12. For event-driven boundaries, use past-tense fact events such as `OrderCreated` or `PaymentApproved`. Do not disguise commands as events. Include event ID, version, occurred time, publisher, subject, causation or request ID, correlation or trace ID, and compatible schema evolution rules.
13. Separate transaction data from search, reporting, analytics, and screen-shaped read projections when their consistency, indexing, query, or retention needs diverge.
14. Define tolerated delay with numbers. Replace vague "real-time" claims with accepted latency or freshness windows such as seconds, minutes, or batch cadence.
15. Check hot keys and noisy neighbors. Define per-tenant, per-customer, per-room, per-campaign, or per-product limits, queue separation, worker pool separation, connection caps, and external API call caps when one key can dominate load.
16. Check saturation and graceful degradation. Drive load past normal capacity in a bounded test plan when available, and identify the first bottleneck: worker pool, DB pool, locks, thread pool, queue, disk, external quota, or cache stampede.
17. Keep domain rules in the owning domain layer. Do not scatter refund windows, cancellation rules, entitlement checks, inventory reservations, or admin overrides across controllers, UI, workers, and jobs.
18. Plan migrations with expand, dual-write or compatibility, backfill, read switch, verification, and contract removal. Do not rename or remove shared fields in one deployment step. Old and new versions should tolerate unknown fields, missing fields, old messages, and new schema during rollout.
19. Plan deletion and retention before data is created. Identify legal retention, anonymization, log masking, backup retention, search/read-model cleanup, and audit exceptions.
20. Make observability a product feature. Connect API, queue, worker, external provider, database, and admin operations with trace, request, correlation, causation, job, and tenant identifiers. Prefer p95, p99, error rate, queue age, backlog, dependency failure rate, and business success rate over averages.
21. Make deployment, rollback, shutdown, and health checks boundary decisions. Use feature flags, canaries, partial exposure, compatibility windows, kill switches, readiness/liveness/startup separation, graceful drain, and rollback-forward plans for risky boundary changes.
22. Provide operational tools for reality: reconcile external state, retry or quarantine failed messages, correct user/account/order state, revoke permissions, inspect provider responses, and undo manual changes with audit and approval when required.
23. Prove recovery, cost, and toil. A backup is not a boundary guarantee until it is restored in a clean environment. DR, config rollback, secret or certificate recovery, per-feature cost, repeated manual work, and single-team or single-person approval bottlenecks should be measured or reported.
24. Record the decision: selected boundary, rejected alternatives, reason, assumptions, failure modes, data owner, operational owner, verification, cost, toil, and revisit triggers.

<!-- mustflow-section: review-rejection-criteria -->
## Review Rejection Criteria

Reject or revise the design when:

- A service or module boundary has no named data owner.
- Two owners write the same core fact without a conflict rule.
- A service reads another service's tables or cache as normal behavior.
- A small requirement routinely changes many repositories, services, schemas, pipelines, or teams.
- A service cannot be deployed, rolled back, or tested without synchronized changes in another boundary.
- Dependency graphs contain cycles with no explicit ownership decision.
- The design shows only the happy path.
- Retries lack timeout, backoff, jitter, max attempts, idempotency, or failure ownership.
- A queue has no dead-letter, retention, replay, ordering, or backlog policy.
- Cache behavior does not state acceptable staleness and invalidation ownership.
- Events are imperative commands instead of past-tense facts.
- Event schemas lack version, event ID, occurred time, publisher, and correlation or causation identifiers.
- Tenant, permission, audit, or data-retention boundaries are added after the fact.
- Health checks only prove process liveness, graceful shutdown is untested, or old and new versions cannot run together.
- Backup, restore, DR, least privilege, config rollback, cost, or toil claims have no proof path.
- Architecture choice is justified by tooling fashion instead of ownership, failure, scale, compliance, or team autonomy.
- Manual operations can mutate critical state without audit, approval, and reversal or reconciliation path.

<!-- mustflow-section: postconditions -->
## Postconditions

- Data ownership and source-of-truth boundaries are explicit.
- Boundary split is justified by change reason, ownership, scale, compliance, failure isolation, or team autonomy.
- Failure handling, idempotency, retry, queue, cache, event, and observability contracts are defined or explicitly deferred.
- Tenant, authorization, deletion, retention, migration, deployment, graceful shutdown, health checks, version compatibility, restore, DR, cost, toil, and operational recovery risks are checked or reported.
- Decision records explain why this boundary was chosen, what alternatives were rejected, and when to revisit.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `test`
- `lint`
- `build`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use broader configured checks when the boundary change affects templates, public docs, package behavior, or cross-module contracts. Report missing architecture, integration, load, or operational verification instead of claiming the design is production-ready.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If ownership cannot be assigned, stop at a decision record or open question instead of drawing a false boundary.
- If shared database coupling is unavoidable for now, document it as temporary coupling with the exit path, owner, read/write limits, and revisit trigger.
- If the user asks for a new service but failure, data ownership, or operational tooling is missing, recommend the smallest boundary-preserving modular step first.
- If verification is unavailable, report which boundary risks remain untested: duplicate command, stale read, queue replay, provider timeout, tenant isolation, migration, deletion, or manual recovery.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Data owners and source-of-truth notes
- Failure, idempotency, queue, cache, and event notes
- Co-change, independent deploy, dependency, data ownership, sync-call, saturation, noisy-neighbor, tenant, auth, retention, observability, deployment, health, shutdown, version compatibility, restore, DR, cost, toil, and operations notes
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining service-boundary risk
