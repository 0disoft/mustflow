---
mustflow_doc: skill.cloud-cost-guardrail-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: cloud-cost-guardrail-review
description: Apply this skill when cloud, infrastructure, Kubernetes, serverless, database, storage, logging, telemetry, CDN, NAT, egress, autoscaling, quota, budget, tagging, snapshot, container registry, Marketplace, LLM API, or third-party SaaS usage is created, changed, reviewed, or reported and the risk is whether spend can silently explode without account, project, quota, tag, lifecycle, retention, cap, or automated shutoff guardrails.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.cloud-cost-guardrail-review
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

# Cloud Cost Guardrail Review

<!-- mustflow-section: purpose -->
## Purpose

Review cloud cost risk as a blast-radius and guardrail problem, not as "use a smaller server."

Cloud bills usually explode through side channels: logs, NAT, egress, snapshots, autoscaling,
external IPs, container images, metrics cardinality, database storage growth, object lifecycle,
Marketplace products, LLM APIs, and forgotten temporary resources. This skill makes the agent check
whether a change has budget signals, hard or automated stops where safe, spend attribution, quotas,
lifecycle cleanup, and service-specific caps before the bill becomes the first alarm.

<!-- mustflow-section: use-when -->
## Use When

- A change touches cloud accounts, projects, subscriptions, environments, regions, availability
  zones, VPCs, NAT, load balancers, CDN, object storage, block storage, databases, backups,
  snapshots, logs, metrics, traces, Kubernetes clusters, serverless functions, containers,
  registries, batch jobs, GPU or high-memory compute, AI/LLM providers, Marketplace products, or
  third-party SaaS integrations.
- A review needs to decide whether non-production, experiments, review apps, customer-specific
  environments, or temporary resources can keep spending after the owner forgets them.
- A code, infrastructure, runbook, or docs change claims that a cloud setup is cheap, bounded,
  safe for experiments, cost-aware, FinOps-ready, or protected by budgets, quotas, alerts, or tags.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily request latency or CPU work; use `api-request-performance-review`,
  `hot-path-performance-review`, or `performance-budget-check` first, then use this skill only for
  provider-billed resource growth.
- The main risk is LLM request payload token spend, provider prompt-cache hit rate, chat-history
  bloat, RAG context size, model routing cost, reasoning budget, retry replay, or cost-per-success
  telemetry inside model calls; use `llm-token-cost-control-review`.
- The task is primarily incident debugging; use `incident-triage-review` first and return here only
  when the fix changes cost guardrails.
- The task is primarily security or privacy of cloud resources; use `security-privacy-review` or a
  narrower security skill first, then use this skill for spend blast radius.
- The task only changes local development code with no cloud, provider, telemetry, storage,
  network, external API, or deployable infrastructure surface.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Cost surface ledger: every changed cloud service, account, project, subscription, region, AZ,
  namespace, environment, provider API, external SaaS, billing owner, and cost-bearing data path.
- Budget model: actual and forecast alert thresholds, alert recipients, escalation route, and
  whether an automated non-production action can safely scale down, disable, or delete resources.
- Isolation model: account, project, subscription, tenant, environment, customer, namespace, and
  quota boundaries that limit the blast radius of experiments or bugs.
- Quota and cap model: service quotas, autoscaling maximums, serverless concurrency, Kubernetes
  `ResourceQuota` and `LimitRange`, GPU or high-cost VM limits, database storage growth limits, and
  external API request or token caps.
- Attribution model: required tag or label keys, allowed values, cost allocation activation,
  owner and expiration fields, and behavior for untagged or invalidly tagged resources.
- Network cost model: NAT, private endpoints, VPC endpoints, Private Google Access-style paths,
  internet egress, cross-AZ transfer, cross-region transfer, public IPv4, load balancer, CDN, and
  cache-hit assumptions.
- Telemetry cost model: log ingest, log class or bucket, retention, audit and flow logs, metric
  cardinality, trace sampling, alerting, and telemetry self-monitoring.
- Storage lifecycle model: object lifecycle rules, minimum storage duration, small-object risk,
  block volume type, snapshot retention, archive policy, database storage autoscaling behavior,
  container registry cleanup, and backup ownership.
- Commitment model: Savings Plans, Reserved Instances, committed use discounts, spot or
  preemptible workloads, and which stable baseline spend remains after cleanup and rightsizing.

<!-- mustflow-section: preconditions -->
## Preconditions

- The cost-bearing surface is in scope for the current task, or the user explicitly asked for cost
  guardrail review.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Live cloud consoles, billing APIs, production dashboards, provider CLIs, and destructive
  shutdown or delete actions are treated as manual-only unless a configured command intent permits
  them.
- Missing pricing, quota, tag, or billing evidence can be reported without inventing current
  provider prices.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten cost guardrail docs, infrastructure policy files, review checklists, tag schemas,
  quota notes, budget-action runbooks, cleanup rules, retention defaults, autoscale caps, registry
  lifecycle policies, and focused tests when they match the repository style.
- Add local code guards for provider request caps, token caps, maximum instances, storage TTL,
  retention defaults, safe tag validation, or cost attribution when the task scope includes the
  owning code.
- Replace broad "monitor costs" guidance with explicit cost surfaces, thresholds, owners, actions,
  caps, lifecycle rules, and manual-only boundaries.
- Do not add a new cloud provider, billing integration, production shutdown bot, live provider
  command, background cleanup worker, or destructive policy outside the configured command contract.
- Do not store billing exports, customer identifiers, secrets, provider account ids, raw logs, or
  private usage data in repository docs or tests.

<!-- mustflow-section: procedure -->
## Procedure

1. Build the cost surface ledger.
   List every cost-bearing resource or data path touched by the change. Include compute, GPU,
   serverless, Kubernetes nodes, databases, block storage, object storage, snapshots, container
   registries, NAT, egress, load balancers, public IPs, CDN, logs, metrics, traces, Marketplace,
   AI/LLM APIs, and third-party SaaS calls. Mark unknown surfaces as missing evidence.

2. Separate alerts from stops.
   Budget alerts are signals, not circuit breakers. Check whether actual and forecast thresholds
   exist at multiple levels such as 25, 50, 75, 90, and 100 percent, and whether non-production
   environments have safe automated actions such as scale-to-zero, disable, pause, or owner paging.
   Report when production needs manual approval instead of automatic destruction.

3. Reject imaginary provider spending limits.
   Do not assume a general cloud account stops charging at the budget. Verify whether the platform
   has a real hard spending limit for the exact subscription or account type. If it does not, require
   quotas, caps, alerts, and safe automation instead of treating budgets as a hard stop.

4. Split billing blast radius.
   Keep development, staging, production, experiments, customer-specific environments, and review
   apps in separate accounts, projects, subscriptions, namespaces, or quota domains where possible.
   A cost incident is worse when nobody can attribute or stop the offending slice.

5. Treat quotas as card limits.
   Review service quotas for GPU, high-cost VMs, NAT, public IPs, load balancers, serverless
   concurrency, container nodes, database storage, and expensive managed services. Prefer low
   defaults and explicit increases over wide-open quotas that turn a bug into a bill.

6. Enforce required tags before creation.
   Require a small controlled taxonomy such as `owner`, `env`, `service`, `cost_center`,
   `expires_at`, and `data_class` when those concepts exist locally. Check case sensitivity and
   allowed values. Report if cost allocation tags or labels must be activated before they are useful
   in billing reports.

7. Give temporary resources an expiration.
   Review review apps, test databases, temporary buckets, experimental GPUs, batch clusters, and
   one-off environments for `expires_at`, owner, cleanup scope, and daily cleanup evidence. A manual
   "remember to delete" note is not a guardrail.

8. Shut down the whole non-production stack.
   Night and weekend scheduling should cover databases, NAT, load balancers, search clusters, Redis,
   logging pipelines, dev Kubernetes node groups, disks, and public IPs, not only VMs. Report hidden
   always-on services that keep charging after compute is stopped.

9. Cap autoscaling and concurrency.
   Autoscaling is a spend multiplier. Check maximum instance counts, serverless concurrency,
   queue-worker limits, batch parallelism, retry concurrency, and deployment surge settings. Missing
   maximums are cost-risk findings even when autoscaling is useful.

10. Bound Kubernetes namespaces.
    Require `ResourceQuota` and `LimitRange` or an equivalent policy when Kubernetes workloads can
    create pods, jobs, PVCs, or high resource requests. Review CPU and memory requests because
    inflated requests can trigger autoscaler node growth even when real usage is low.

11. Remove avoidable NAT tolls.
    Check whether private workloads call cloud-native object storage, NoSQL, container registries,
    or provider APIs through NAT when a private endpoint, gateway endpoint, or private API access
    path exists. NAT hourly, processed-byte, and external IP charges should be explicit.

12. Account for data transfer.
    Same-cloud traffic is not automatically free. Review internet egress, CDN origin traffic,
    cross-AZ traffic, cross-region traffic, database-to-app placement, cache placement, and large
    API responses. High-traffic services need deliberate AZ and cache decisions.

13. Audit public IPv4 and idle addresses.
    Treat public IPv4 addresses, Elastic IPs, static external IPs, and load-balancer addresses as
    billable inventory. Require an owner, purpose, and cleanup path for idle or detached addresses.

14. Use CDN and caches as cost controls.
    Review cacheable assets, downloads, public API responses, image transforms, and CDN keys.
    Cache hit rate, origin egress, purge behavior, and personalized-response safety should be known
    before claiming CDN savings.

15. Control log ingest before retention.
    Log volume can charge before storage retention matters. Split hot operational logs from audit or
    forensic logs where the provider supports classes or buckets. Review log level, duplicate stack
    traces, flow logs, NAT logs, load-balancer logs, Kubernetes audit logs, sampling, and retention.

16. Protect metric cardinality.
    Reject unbounded labels such as raw user id, request id, email, raw URL path, tenant id without
    budgeted bounds, SQL text, or arbitrary error messages. Metrics are for grouping; logs are for
    lookup. Track billable metric growth where the telemetry backend exposes it.

17. Lifecycle object storage deliberately.
    Add lifecycle rules for TTL, old versions, multipart uploads, storage class transitions, and
    delete markers. Check minimum storage duration and small-object minimum billable size before
    moving tiny or short-lived objects to colder classes.

18. Review block storage and snapshots.
    Check volume type, provisioned IOPS, provisioned throughput, unattached disks, snapshot
    retention, archive policy, and snapshot reference behavior. Snapshots are backup evidence and a
    cost landfill unless retention and restore ownership are explicit.

19. Treat database storage growth as sticky.
    Database autoscaling, logs, imports, temp tables, indexes, and replicas can grow storage that is
    expensive or impossible to shrink in place. Require growth alarms, import runbooks, cleanup
    paths, and restore or rebuild notes for large storage spikes.

20. Clean container registries.
    CI can push images on every commit. Require lifecycle policies for untagged images, old tags,
    branch preview images, cache layers, SBOMs, and build artifacts. Keep rollback images intentionally
    retained and garbage-collect the rest.

21. Buy commitments last.
    Savings Plans, Reserved Instances, committed use discounts, and long-term reservations should
    follow idle cleanup, scheduling, rightsizing, storage cleanup, NAT reduction, and log reduction.
    Report commitment risk when the workload baseline is not proven stable.

22. Use spot or preemptible only for retryable work.
    Cheap interruptible capacity fits queues, batch, CI, image processing, and analytics that can
    retry safely. Do not treat it as safe for single databases, single Redis instances, singleton
    search nodes, or stateful components without replication and recovery.

23. Monitor Marketplace, LLM, and SaaS costs separately.
    Provider anomaly tools may not cover every third-party charge. AI models, vector search,
    external APIs, observability vendors, security scanners, and Marketplace products need product
    limits, usage attribution, owner alerts, and kill switches when they can spend independently of
    compute.

24. Build a cost stop runbook.
    Name the cheapest safe stop for each environment: scale service to zero, pause workers, disable
    feature flag, lower concurrency, block provider calls, close public ingress, stop batch schedule,
    delete temporary resources, or page an owner. Separate non-production automation from production
    manual approval.

<!-- mustflow-section: postconditions -->
## Postconditions

- The cost-bearing resources, owners, billing boundaries, alert thresholds, automated or manual stop
  paths, quotas, caps, tags, lifecycle rules, retention choices, and manual cloud evidence boundaries
  are explicit.
- Hidden spend channels such as NAT, egress, logs, high-cardinality metrics, public IPs, snapshots,
  DB storage growth, registry images, temporary resources, Marketplace, LLM APIs, and SaaS usage are
  fixed, bounded, or reported.
- Template, route, i18n, package, docs, and tests remain synchronized when this skill is edited or
  installed.

## Review Checklist

- Budget alerts cover actual and forecast spend at multiple thresholds, and non-production has a
  safe action path.
- Account, project, subscription, namespace, environment, customer, and experiment boundaries limit
  blast radius.
- Expensive service quotas, autoscale maxima, serverless concurrency, Kubernetes ResourceQuota, and
  LimitRange controls are present or consciously deferred.
- Required tags or labels are enforced before creation and include owner, environment, service,
  cost center, expiration, and data class where relevant.
- NAT, private endpoint, public IPv4, egress, cross-AZ, cross-region, CDN, and cache cost paths are
  explicit.
- Log ingest, retention, flow or audit logs, metric cardinality, trace sampling, and telemetry
  self-cost signals are controlled.
- Object lifecycle, storage class minimums, block volume type, snapshots, database storage growth,
  and container registry cleanup have owners and retention rules.
- Commitments are based on cleaned-up stable baseline spend, and spot or preemptible usage is
  restricted to retryable workloads.
- Marketplace, LLM, and SaaS spend has attribution, caps, owner alerts, and kill switches.

<!-- mustflow-section: verification -->
## Verification

Prefer the narrowest configured mustflow command intent that covers the changed surface:

- `test_related` for local tests around tag validation, budget policy files, config caps,
  lifecycle defaults, provider usage limits, or cost attribution code.
- `lint` or `build` when infrastructure-as-code, generated policy, or typed config surfaces changed.
- `docs_validate_fast` when runbooks, skills, or cost guardrail docs changed.
- `test_release` when package/template/release surfaces changed.
- `mustflow_check` before finishing broad mustflow-owned changes.

Do not infer live cloud billing checks, provider CLI calls, production shutdowns, dashboard queries,
or destructive cleanup outside the command contract. Report those as manual-only or missing.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the cloud provider, account, project, subscription, or environment boundary is unknown, report
  the missing blast-radius evidence instead of claiming the cost is bounded.
- If pricing or quota facts are time-sensitive and not locally available, avoid exact price claims
  and state which provider billing evidence must be checked manually.
- If a budget alert exists without an action path, classify it as notification-only, not a stop.
- If an automated shutdown would risk production data, payments, customer traffic, or compliance,
  require manual approval and name a safer cap or throttle.
- If a configured command fails after cost docs, tests, or templates change, preserve the failing
  intent and use `failure-triage` before further edits.

<!-- mustflow-section: output-format -->
## Output Format

When reporting a review or change, include:

- Skills used.
- Cost surfaces and billing boundaries reviewed.
- Budget, quota, tag, lifecycle, retention, autoscale, Kubernetes, network, telemetry, storage,
  registry, commitment, spot, Marketplace, LLM, and SaaS guardrails found or added.
- Manual-only provider billing checks or destructive stop actions.
- Verification commands run and their result.
- Remaining cloud-cost guardrail risk.
