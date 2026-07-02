---
mustflow_doc: skill.deployment-rollout-safety-review
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: deployment-rollout-safety-review
description: Apply this skill when CI/CD pipeline gates, required checks, preview deploys, migration checks, server, backend, worker, scheduler, queue consumer, cron, container, VM, serverless, IaC, config, secret handling, feature-flag, cache, canary, rollback, release envelope, image digest, deployment history, traffic rollback, health check, readiness/liveness/startup probe, graceful shutdown, artifact promotion, release observability, or post-deploy smoke behavior is created, changed, reviewed, or reported and the risk is whether a deployment can be rolled out, stopped, observed, or rolled back safely.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.deployment-rollout-safety-review
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

# Deployment Rollout Safety Review

<!-- mustflow-section: purpose -->
## Purpose

Review a server deployment as a runtime state transition, not as "the build passed" or
"CI is green".

Deployment failures usually come from changed ordering, config, data, cache, queues, rollback shape,
permissions, secrets, infrastructure policy, human approvals, and observability. Rollback is not
just restarting an older container. It is the older release surviving today's data, config, cache,
queue messages, external side effects, secret versions, and traffic state. This skill makes the
agent prove that a wrong deploy has small blast radius, is detected quickly, can be stopped quickly,
and can be rolled back or safely rolled forward without inventing a recovery plan during the
incident.

<!-- mustflow-section: use-when -->
## Use When

- A change touches server deployment, backend runtime behavior, workers, schedulers, cron, queue
  consumers, containers, VMs, serverless functions, Kubernetes manifests, process managers,
  CI/CD workflows, preview environments, deployment pipelines, release gates, canaries, release
  envelopes, or rollback procedures.
- A change touches DB migration order, config or env vars, feature flags, cache keys, queue or topic
  message formats, external API dependencies, storage paths, startup probes, readiness probes,
  liveness probes, graceful shutdown, worker drain, deployment locks, secret scope, IaC policy, or
  post-deploy smoke checks.
- A review needs to decide whether code, config, database, cache, queue, and scheduler changes can
  coexist across old and new versions while traffic is still moving.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily package publication, changelog, version metadata, or remote distribution
  channel behavior; use `release-publish-change` first.
- The task is primarily database migration design, schema compatibility, or data backfill behavior;
  use `database-migration-change` first, then use this skill for the deploy sequence around it.
- The task is primarily queue correctness or retry semantics inside worker code; use
  `queue-processing-integrity-review` or `retry-policy-integrity-review` first, then use this skill
  for deploy-time drain and compatibility.
- The task is only incident diagnosis after the deploy has already failed; use
  `incident-triage-review` first and return here only when changing the rollout guardrail.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Deployment resource ledger: every affected API route, web process, worker, scheduler, cron,
  queue consumer, queue or topic, DB table or column, cache key, object-store path, external API,
  environment variable, secret, permission, and feature flag.
- Artifact identity: commit SHA, image tag or digest, config version, migration version, and feature
  flag state that operators will see in logs and dashboards.
- Release envelope: `release_id`, image digest, chart or manifest revision, values or config hash,
  ConfigMap or Secret version, DB migration range, feature flag snapshot, traffic weight, deployer,
  and deployment time when those concepts exist in the target platform.
- Deployment model: environment order, artifact promotion path, rolling/blue-green/canary strategy,
  traffic rollback path, old-version retention, deployment history retention, deployment
  concurrency, and deployment lock owner.
- Pipeline gate model: required status checks, branch protection or merge gate, reviewer or
  CODEOWNER gate, fast-fail ordering, clean CI environment, test data setup, flaky-test quarantine
  owner, artifact retention, and security scan coverage.
- Preview model: preview URL, isolated namespace or schema, ephemeral database or seeded data,
  teardown policy, cost guardrail, deployment protection, and proof that production secrets and
  production PII are not exposed.
- Migration check model: dry-run or shadow database evidence, destructive-change detection,
  lock or table-rewrite risk, online DDL assumptions, backfill separation, N-1 app compatibility,
  and rollback or roll-forward boundary.
- Secret and approval model: environment-scoped secrets, production approval gate, OIDC or
  short-lived credential path, log masking, rotation or revocation path, external secret store or
  encryption-at-rest boundary, and least-privilege deploy job permissions.
- Compatibility model: old code with old data, old code with new data, new code with old data, new
  code with new data, N-1 message compatibility, cache key version, and rollback survivability.
- Runtime control model: startup/liveness/readiness probes, graceful shutdown behavior, load
  balancer connection draining, worker drain, cron duplicate guard, kill switch, safe flag defaults,
  automatic stop conditions, synthetic transactions, and post-deploy observation window.
- Infrastructure and observability model: rendered manifests or plan output, policy checks, image
  digest pinning, resource requests and limits, probe presence, privileged or hostPath use,
  plaintext-secret checks, release-labeled logs, metrics, traces, alerts, and dashboard slices.

<!-- mustflow-section: preconditions -->
## Preconditions

- The deployment or rollout surface is in scope for the current task, or the remaining deployment
  risk is explicitly being reviewed.
- The affected runtime resources can be identified from code, config, docs, manifests, tests, or the
  user's report. If they cannot, report the missing resource ledger as a finding.
- The repository command contract has been checked; live deployment, production shell, migration,
  cloud, and cluster commands remain out of scope unless a configured intent permits them.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or update deploy runbooks, release checklists, pipeline metadata, smoke tests, probe tests,
  config validation, feature-flag defaults, rollback notes, canary gates, and deployment safety
  tests when they match the repository style.
- Add or update preview-deploy guardrails, migration preflight notes, manifest or IaC validation
  fixtures, secret-scope checks, required-check documentation, and release evidence templates when
  they are already within the task scope.
- Add local code guards for startup config validation, readiness separation, shutdown handling,
  worker drain, cache-key versioning, and deployment attribution when the task scope includes the
  affected runtime code.
- Do not run raw live deployment, production shell, migration, cluster, or cloud commands unless a
  configured mustflow command intent explicitly permits them.
- Do not start long-running servers, watchers, dashboards, or background deployment helpers.

<!-- mustflow-section: procedure -->
## Procedure

1. Build the deployment resource ledger.
   List the actual runtime resources touched by the change. Include reads and writes separately:
   API endpoints, workers, DB columns, cache keys, storage prefixes, queue messages, cron jobs,
   external APIs, permissions, config, and feature flags. If the ledger is unknown, report that the
   deployment blast radius is unknown instead of guessing.

2. Check the merge and CI gate before the deploy gate.
   Required status checks, protected branches, review or CODEOWNER gates, and stale-review handling
   should stop unreviewed or partially verified production changes. Order checks so cheap failures
   happen before slow checks: format, lint, typecheck, unit tests, build, security scans,
   integration or contract tests, then focused end-to-end smoke. Require a clean reproducible CI
   environment, explicit test database setup, seeded data, dependency and container scan coverage,
   IaC or configuration scans when those files changed, secret scanning, and a named owner or SLA for
   flaky-test quarantine. A flaky test silently bypassed by the merge gate is a deployment-safety
   risk, not a testing nuisance.

3. Build the release envelope.
   Rollback needs more than an image tag. Bind image digest, chart or manifest revision, values
   file hash, ConfigMap name or version, Secret version, migration range, feature flag snapshot,
   ingress or router weight, deployer, and deployment time under one `release_id` when the platform
   exposes those facts. If only a mutable tag such as `latest` identifies production, report that
   rollback identity is not reproducible.

4. Make preview deployment a rehearsal, not just a link.
   Preview deploys should use an isolated namespace, schema, or ephemeral database with explicit
   seed data and teardown. Do not allow production secrets, production OAuth callbacks, production
   webhooks, or production PII in preview. Name deployment protection, access control, teardown
   failure alerts, and cost cleanup. Run or identify the preview checks that matter for the changed
   flow: smoke, selected E2E, API compatibility, accessibility, visual regression, and thin DAST or
   security probes where the repository owns them.

5. Separate artifact promotion from environment rebuilds.
   Verify whether staging and production receive the same artifact identity. Prefer promoting one
   built immutable artifact over rebuilding per environment. If per-environment rebuild is
   unavoidable, name the drift risk and require commit SHA, dependency lock, build run, SBOM or
   package inventory when available, image digest, and build input evidence. Treat image tags as
   human labels and image digests as the rollback proof.

6. Preserve rollback history and warm capacity.
   For platform-managed rollbacks, check whether old revisions, ReplicaSets, Helm release history,
   blue/green environments, or rollout controller history are retained long enough to be useful.
   Do not treat a rollback path as safe if the old version is immediately scaled to zero, cold, or
   deleted. Prefer traffic rollback to an already-warm old version before rebuilding or pulling a
   replacement during an incident.

7. Split deploy order from migration order.
   For DB changes, check expand/migrate/read-write/switch/contract sequencing. New code must tolerate
   old data, old code must tolerate expanded schema or new data, and contraction must wait until old
   code is impossible. Check migration lock timeout, batch size, retryability, partial progress
   markers, rollback preview evidence, point-in-time recovery practice, database config backup, and
   rollback limits. Require dry-run or shadow database evidence when the repository has a migration
   surface. Treat destructive rollback SQL as a data-loss risk, not a recovery guarantee.

8. Treat config and IaC changes as code changes.
   Diff config and environment variables. Require startup validation for missing, misspelled, empty,
   malformed, or incompatible values. A service should fail fast before accepting traffic when a
   required setting is unsafe. Prefer versioned or immutable config names over in-place config
   mutation, and name whether env-var, mounted-file, or subpath-style config updates require pod or
   process restart. For infrastructure files, review rendered manifests or plans rather than only
   source snippets. Check resource requests and limits, probes, privileged mode, hostPath mounts,
   plaintext secrets, IAM or service account scope, image digest pinning, and policy validation
   coverage.

9. Keep secrets out of the wrong stage.
   Test, preview, staging, and production jobs should use environment-scoped secrets with the
   smallest permission set that can complete that job. Prefer OIDC or short-lived credentials over
   long-lived cloud keys in CI. Production secrets should require the production environment gate,
   and preview jobs should not be able to read them. Check secret masking, rotation or revocation
   notes, external secret store or encryption-at-rest boundary, and whether platform-native secrets
   also need RBAC, namespace, and audit controls.

10. Separate startup, liveness, and readiness.
   Startup should protect slow boots, liveness should detect stuck processes, and readiness should
   gate whether the instance can serve real dependencies. Do not count "process is running" as
   deployment readiness. Keep liveness conservative enough that overload or long GC pauses do not
   turn a recoverable incident into a restart loop.

11. Check graceful shutdown before rolling traffic.
   Verify SIGTERM or platform shutdown handling for in-flight requests, DB transactions, uploads,
   payment or webhook callbacks, and streaming responses. The app shutdown timeout must be shorter
   than load balancer connection draining.

12. Drain workers deliberately.
   Queue workers need a stop-accepting-new-work phase, a current-work completion or checkpoint phase,
   and an idempotent retry path for interrupted work. Ack, delete, offset commit, and visibility
   timeout behavior must match the shutdown path. Rollback should name consumer pause, in-flight
   work completion, idempotency-key checks, and dead-letter or quarantine inspection for worker and
   scheduler surfaces.

13. Prove message compatibility.
   Producers and consumers are rarely deployed at the exact same instant. Message format changes need
   N-1 message compatibility, tolerant readers, versioned fields, defaults for missing data, and a
   plan for queued old messages. Unknown event types should not crash old consumers; require
   quarantine, dead-letter, or ignore policy that preserves investigation evidence.

14. Design external side effects as compensation.
    Emails, payment authorizations, third-party webhooks, provider state, and object-storage writes
    do not disappear when code rolls back. Require outbox, idempotency key, state machine,
    reconciliation, or compensation notes for side effects that cannot be undone by reverting code.

15. Keep API compatibility wider than the deploy window.
    Server versions and clients do not change at the same instant. Check N-1 and N+1 compatibility
    for request fields, response fields, enum values, error codes, API versions, and mobile or SDK
    clients. Removing fields, narrowing enums, or adding required inputs can make rollback fail even
    when the old container starts.

16. Add a kill switch, not just a flag.
   Feature flags that only select a new path are not enough. Require a fast disable path, a safe
   default when flag lookup fails, an owner who can flip it during the observation window, rollout
   percentages or cohorts, and an expiry or removal plan so release flags do not become permanent
   hidden branches.

17. Run production preflight before touching traffic.
    Preflight should name the active incident status, deployment window, error budget or SLO burn,
    DB replication lag, queue depth, cache health, dependency health, cloud quota, feature flag
    defaults, rollback target digest, migration compatibility, alert mute state, and on-call owner.
    If the system is already degraded, default to blocking or narrowing the deploy rather than adding
    another variable to an incident.

18. Define the canary cohort.
    Percent-only canaries can hide the exact risky traffic. Name which users, tenants, regions,
    routes, worker partitions, queues, payment methods, or dependency paths receive the new version.
    Prefer a cohort that exercises the changed behavior without making the blast radius vague.

19. Measure canaries by version and by user harm.
    A small canary can disappear in global averages. Require metrics split by service version,
    release id, route, cohort, or worker partition where safe. Prefer user-impact signals such as
    5xx, p95 or p99 latency, login failure, payment failure, order failure, queue backlog, or retry
    explosion over CPU-only rollback triggers.

20. Make automatic stop conditions numeric.
    Before rollout, define stop or rollback thresholds for error rate, p95 or p99 latency, login or
    payment failure, queue backlog, retry rate, dependency timeout, and saturation. "Watch it" is not
    a stop condition.

21. Verify read and write paths separately.
    A read-only health check can pass while writes are broken. Add or identify smoke checks and
    synthetic transactions that cover the changed read path, changed write path, and visible business
    result without corrupting production data.

22. Preserve release attribution in logs and telemetry.
    Deployment logs and runtime logs should expose commit SHA, image tag or digest, config version,
    chart or manifest revision, config version, migration version, feature flag state, deployment
    environment, deployment id, service version, and instance. Log format changes must not silently
    break alerts, dashboards, or search queries.

23. Version cache keys and narrow invalidation.
    Cache changes need cache key versioning or compatibility. Avoid blanket flushes unless the cold
    DB load has been budgeted. Prefer narrow, gradual invalidation with fallback behavior named.
    Old code must not deserialize new cache payloads without a compatibility plan.

24. Guard scheduler duplication.
    Cron and scheduled jobs can overlap during rolling deploys. Check singleton locks, leader
    election, idempotency keys, deployment locks, and duplicate execution behavior for old and new
    versions.

25. Treat CRDs and operators as schema rollouts.
    Custom resources, operators, storage versions, conversion strategies, and controller downgrade
    behavior can block rollback even when application pods are healthy. When those surfaces change,
    require stored-object migration, old-client compatibility, and operator downgrade notes.

26. Use deployment locks per service and environment.
    Two deploys, migrations, or production commands against the same service/environment need an
    explicit conflict rule. Name the lock scope and the operator-visible owner.

27. Make production commands boring.
    Any production command touched by the change should have dry-run output, bounded target scope,
    explicit confirmation or ticket reference, and refusal behavior for ambiguous environment,
    tenant, region, or time range.

28. Reserve post-deploy observation time.
    Deployment is not done when traffic flips. Require a post-deploy observation window with owners
    available, synthetic transaction results, dashboards, logs, queue backlog, dependency health, and
    stop-condition status checked.

<!-- mustflow-section: postconditions -->
## Postconditions

- Deployment resources, rollout order, stop conditions, rollback limits, and manual deployment
  boundaries are explicit.
- Any missing resource ledger, missing configured verification, or production-only check is reported
  instead of treated as complete.
- Template, route, i18n, package, docs, and tests remain synchronized when this skill is edited or
  installed.

## Review Checklist

- Deployment resource ledger is complete enough to name the blast radius.
- Merge and CI gates include required checks, branch protection or equivalent merge policy,
  fast-fail ordering, clean test data, flaky-test ownership, and security scan coverage.
- Release envelope binds image digest, config, Secret, migration, flag, traffic, deployer, and time
  under a stable release identity where those platform concepts exist.
- Preview deploys are isolated, seeded, protected, cleaned up, and kept away from production secrets
  and production PII.
- Same artifact is promoted across environments or rebuild drift is explicitly controlled.
- Rollback history is retained, the old version can stay warm when needed, and traffic rollback is
  separated from rebuilding or repulling code.
- DB migration, migration dry-run or shadow evidence, code deploy, data backfill, cache, queue, and
  rollback order are separated.
- Required config is validated at startup, deployment config diff is inspectable, and rendered
  manifests or IaC plans are policy-checked for resources, probes, privileges, secrets, and digest
  pinning.
- Secrets are environment-scoped, production-gated, least-privilege, short-lived where possible,
  masked in logs, and rotatable.
- Startup, liveness, and readiness probes answer different questions.
- Graceful shutdown, load balancer connection draining, worker drain, and interrupted work retry are
  compatible.
- Queue messages, API payloads, and cache keys survive old/new producer, consumer, server, and
  client overlap.
- External side effects have idempotency, reconciliation, or compensation instead of rollback
  overclaim.
- Feature flag lookup failure chooses the safe default and a kill switch can stop the change.
- Production preflight checks active incidents, error budget, queue depth, DB lag, dependency
  health, quota, rollback target, feature defaults, alert mute state, and owner availability.
- Canary cohort, version-split telemetry, and automatic stop condition are concrete, numeric, and
  tied to the changed flow.
- Read smoke, write smoke, synthetic transaction, deployment logs, and post-deploy metrics are
  defined before rollout.
- Rollback notes say what code rollback cannot undo, especially migrations, cache, messages,
  external side effects, and user-visible data.

<!-- mustflow-section: verification -->
## Verification

Prefer the narrowest configured mustflow command intent that covers the changed surface:

- `mf run test_related` for local tests around config validation, probes, shutdown, queue drain,
  cache key behavior, migration compatibility, or smoke-check code.
- `mf run build` or `mf run lint` when deployment metadata, generated code, or compile-time config
  surfaces changed.
- `mf run docs_validate_fast` when runbooks, skills, or deployment docs changed.
- `mf run test_release` when package/template/release surfaces changed.
- `mf run mustflow_check` before finishing broad mustflow-owned changes.

Do not replace missing deploy safety proof with an unrelated full test suite. Report the missing
configured intent or manual production verification boundary.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If strict mustflow validation says the skill is not listed, update both the prose trigger and the
  route table row in `.mustflow/skills/INDEX.md`, then sync the template copy.
- If validation says required section ids are missing, add the standard mustflow-section markers and
  headings before changing command contracts or tests.
- If a deployment-safety check cannot be executed locally, record the manual boundary and the
  production evidence that must be collected during the observation window.
- If rollback is unsafe because DB, cache, queue, external side effects, or user-visible data moved
  forward, report roll-forward or mitigation work instead of claiming code rollback is sufficient.

<!-- mustflow-section: output-format -->
## Output Format

When reporting a review or change, include:

- Skills used.
- Deployment resources touched.
- Rollout and rollback risks found or guarded.
- CI, preview, artifact promotion, config, secret, migration, IaC, cache, queue, probe, shutdown,
  canary, rollback, and observation decisions.
- Verification commands run and their result.
- Remaining manual deployment checks, especially production-only smoke, canary, and observation
  steps that cannot be executed locally.
