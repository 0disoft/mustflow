---
mustflow_doc: skill.hetzner-cloud-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: hetzner-cloud-change
description: Apply this skill when Hetzner Cloud or Dedicated infrastructure, hcloud or API integrations, Terraform provider resources, servers, networks, load balancers, firewalls, IPs, placement groups, volumes, backups, Object Storage, Storage Box, cloud-init, Docker or Coolify hosting, Kubernetes CCM or CSI integration, monitoring, recovery, capacity, cost, or Hetzner-related deployment tests are created, changed, reviewed, debugged, migrated, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.hetzner-cloud-change
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

# Hetzner Cloud Change

<!-- mustflow-section: purpose -->
## Purpose

Change or review Hetzner infrastructure without confusing one resilience mechanism with a complete
availability, backup, recovery, security, performance, or cost design.

Treat Hetzner as a provider with distinct compute, network, storage, control-plane, account, and
location failure domains. Prove the current provider contract from official documentation instead
of carrying old prices, limits, product availability, or console behavior into a durable design.

<!-- mustflow-section: use-when -->
## Use When

- A task changes Hetzner Cloud, Dedicated, Robot, hcloud, API, Terraform, Pulumi, Ansible, cloud-init,
  image, server, server type, architecture, location, network zone, private Network, Load Balancer,
  Firewall, Primary IP, Floating IP, Placement Group, Volume, Backup, Snapshot, Object Storage,
  Storage Box, DNS failover, monitoring, capacity, restore, or disaster-recovery behavior.
- A review claims that a Hetzner design is highly available, private, encrypted, backed up,
  recoverable, scalable, cost-effective, or production-ready.
- A Hetzner incident or performance investigation may lead to infrastructure, application,
  runbook, test, monitoring, or capacity changes.
- Docker, Coolify, Kubernetes, a cloud-controller manager, CSI driver, CNI, ingress, egress gateway,
  container registry, or orchestration platform depends on Hetzner networking, storage, metadata,
  load-balancer, image, architecture, or API behavior.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is provider-neutral cost review only; use `cloud-cost-guardrail-review`.
- The task is provider-neutral rollout, canary, drain, probe, or rollback review only; use
  `deployment-rollout-safety-review`.
- The task only changes Docker build or runtime behavior without a Hetzner boundary; use
  `docker-code-change` or `docker-runtime-triage`.
- The task only diagnoses application code, database queries, Linux performance, or networking
  after evidence has excluded Hetzner resources and provider behavior.
- The user asks for a live production mutation, deletion, failover, restore, rescale, or provider
  purchase that no configured command intent authorizes.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Target repository, environment, Hetzner project or account boundary, infrastructure source of
  truth, state owner, changed files, and configured command intents.
- Resource ledger: Cloud or Dedicated servers, architecture and server types, images, locations,
  network zones, Placement Groups, Networks, routes, Load Balancers, Firewalls, Primary and Floating
  IPs, Volumes, Backups, Snapshots, buckets, Storage Boxes, DNS, certificates, metadata endpoints,
  guest network-config owners, container data paths, orchestration drivers, monitoring, and tokens.
- Failure-domain and recovery model: host, rack or unknown facility boundary, location, network zone,
  provider control plane, DNS, account, credential, operator error, data corruption, and dependency
  failure; required RPO, RTO, restore evidence, and traffic or data failover path.
- Runtime and traffic model: ingress, egress, east-west traffic, health checks, TLS termination,
  connection draining, long-lived connections, retries, idempotency, queue leases, replication,
  storage consistency, and peak connection or throughput demand.
- Capacity and cost model: actual workload measurements, architecture compatibility, quota, current
  SKU and location availability, current provider prices, retention, egress, IP, storage, backup,
  and idle-resource costs.
- Current official Hetzner documentation for every date-sensitive price, limit, availability,
  billing, networking, backup, restore, or product-capability claim used in the decision.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read the actual IaC, config, code, tests, runbooks, state boundaries, and current official Hetzner
  documentation before recommending or changing provider behavior.
- Separate declared configuration, provider-accepted configuration, and observed runtime state.
  One layer does not prove the next.
- Treat attached reports, old docs, console screenshots, blogs, and AI summaries as leads to verify,
  not as current provider authority.
- Keep provider credentials, state files, private addresses, customer data, and recovery secrets out
  of repository output and test fixtures.
- Provider CLI, API, console, apply, import, state mutation, purchase, deletion, failover, and restore
  actions remain manual-only unless a configured oneshot command intent explicitly permits them.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update Hetzner IaC, provider integrations, bootstrap configuration, images, application resilience
  code, health checks, monitoring, tests, fixtures, runbooks, architecture docs, cost guardrails, and
  directly synchronized templates within the user-requested scope.
- Add validation for immutable-image or reproducible bootstrap paths, multi-architecture artifacts,
  resource labels, deletion protection, bounded scaling, restore evidence, and declared-versus-applied
  state when the repository owns those surfaces.
- Do not add live credentials, broad provider command wrappers, autonomous cleanup, production
  failover, unbounded autoscaling, or destructive recovery automation outside the command contract.
- Do not rewrite provider-neutral deployment, cost, database, security, or performance policy inside
  this skill when the matching adjunct skill already owns it.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the provider boundary.
   Record Cloud versus Dedicated, project or account, environment, location, network zone,
   architecture, OS, image, ownership, IaC state, and whether the task changes desired state,
   provider state, guest state, application behavior, or only documentation.

2. Build the resource and credential ledger.
   Map each server, IP, Network, route, Load Balancer, target, Firewall, Placement Group, Volume,
   Backup, Snapshot, bucket, Storage Box, DNS record, certificate, token, monitoring path, and state
   store to its owner, lifecycle, protection, cost, and dependent resources. Use projects and token
   scope as blast-radius boundaries; keep read-only monitoring credentials separate from mutation
   credentials and keep break-glass material outside the affected provider boundary.

3. Model failures by mechanism instead of by product label.
   For host, location, network-zone, provider-control-plane, DNS, account, credential, operator,
   corruption, and dependency failures, record detection, surviving components, fencing, traffic or
   data transition, and recovery evidence. A spread Placement Group reduces same-host concentration;
   it does not prove location isolation. A Load Balancer, replicated Volume, server Backup, Snapshot,
   and off-provider backup each cover different failures.

4. Verify current provider facts.
   Refresh exact prices, quotas, server types, architectures, locations, limits, billing rules,
   supported protocols, IP behavior, MTU, firewall scope, backup contents, restore compatibility,
   Object Lock behavior, metadata endpoints, guest auto-configuration ownership, CCM and CSI
   compatibility, and product availability from official Hetzner sources and maintained provider
   repositories. Record the access date, component version, or digest. Keep time-sensitive values in
   config or evidence, not as timeless prose; never treat a mutable `latest` tag as compatibility proof.

5. Review network and recovery reachability together.
   Map ingress, egress, east-west traffic, DNS, TLS, routes, MTU and overlay overhead, allowlists,
   private-address behavior, Firewall coverage, bastion or console access, package and API egress,
   and rescue or rebuild paths. Private does not prove encrypted or filtered. Before removing a
   public path, prove a tested replacement for administration, egress, recovery, and credential
   rotation under the same failure being handled. Treat Cloud Firewall, host firewall, container
   firewall, service identity, and application authorization as separate layers. Verify these
   provider-Firewall semantics from current docs and applied state:
   - assigned allowlists combine; attaching another Firewall does not override an existing broad allow;
   - no outbound rules means allow-all, while adding outbound rules creates an implicit-deny remainder;
   - rule changes do not terminate connections that were already established;
   - label selection is desired scope, not proof that every intended resource was actually attached;
   - private Network traffic and Load Balancer interfaces require their own controls when provider
     Firewall coverage is absent.
   Model the Network as routed L3, not a VLAN or security zone. Verify source-address and route
   constraints for VPN, NAT, custom-router, alias-IP, and failover designs. Give each private NIC one
   configuration owner: provider image automation or explicit guest config, not competing DHCP
   clients. Validate routes, DNS, MTU, large transfers, and recovery after a cold boot.

6. Review Load Balancer and IP transitions.
   Separate liveness from readiness; keep readiness bounded to dependencies required to accept new
   work. Verify TLS termination, target protocol, Proxy Protocol compatibility, health-check timing,
   connection and bandwidth budget, drain order, long-lived connection recovery, and independent
   DNS entry points when location-level failover is required. Treat Floating IP movement as an
   explicit fenced transition: isolate the old writer before reassignment and prove the guest-side
   address and routing state. Do not call it automatic failover. Inspect actual public IPv4, public
   IPv6, and private interface state rather than inferring exposure from DNS. Keep DDoS filtering,
   WAF behavior, application abuse control, and origin authentication distinct; hiding a DNS record
   does not prove that an old or direct origin address is unreachable.

7. Select compute from workload evidence.
   Compare Cloud and Dedicated ownership burden, shared and dedicated CPU behavior, x86 and Arm
   compatibility, memory duplication, local-disk dependence, replacement speed, and tail latency.
   Correlate application throughput, error rate, queue age, p95 or p99 latency, run queue, CPU PSI,
   steal, `MemAvailable`, swap I/O, memory PSI, storage latency, queue depth, I/O PSI, and fsync
   latency. Do not promote an arbitrary utilization or PSI percentage to a universal threshold.
   Reproduce candidates with identical workload, location, image, and application version when safe.

8. Preserve replacement and scaling options.
   Check architecture and image compatibility, root-disk resize irreversibility, local-state loss,
   SKU and location scarcity, quotas, drain behavior, maximum scale, and fallback types before
   rescale or autoscaling changes. Keep state out of disposable compute where practical. Define
   bounded fallback behavior when a preferred type or location cannot be allocated.

9. Classify storage by durability and access pattern.
   Distinguish replaceable local storage, block Volume state, object storage, backup archives, and
   Storage Box data. Verify current performance and durability claims rather than copying fixed IOPS
   or throughput values. Replication is availability, not history. Test storage with disposable files
   and realistic I/O shapes; never benchmark a production raw block device destructively.
   Trace the actual byte path from application or container to filesystem, mount, block device, or
   object key. A Docker named volume is not a Hetzner Volume. For required block storage, make mount
   identity and readiness a startup precondition, order consumers after the mount, and fail closed on
   a missing or wrong mount so an empty local directory cannot become a second database. Treat Volume
   attachment, location, growth, and filesystem expansion as explicit operations, not automatic HA.
   Treat Object Storage as an object API, not POSIX, shared block storage, or a database filesystem;
   review overwrite, rename, locking, append, small-object, request, connection, bucket, and source-IP
   limits, including NAT aggregation. For Kubernetes, verify the pinned CCM and CSI versions or
   digests, topology, access modes, attachment behavior, immutable provider fields, and current
   snapshot or migration support before accepting a StatefulSet or LoadBalancer design.

10. Build the backup and restore chain.
    Start from application-consistent backup and point-in-time requirements. Record whether root disk,
    attached Volumes, databases, objects, secrets, DNS, certificates, queues, cron, and external state
    are included. Keep an encrypted independently administered copy outside the failure and account
    boundary being protected. Decide Object Lock at bucket creation when required, separate write from
    retention or deletion authority, and test restoration into an isolated target including login,
    reads, writes, workers, schedules, policies, and cutover. Measure achieved data-loss window and
    service restoration time; do not infer RPO or RTO from backup-job success. Design versioning,
    retention lock, lifecycle deletion, encryption, and credential scope as separate controls; prove
    that lifecycle rules cannot delete an application backup chain earlier than the restore contract.

11. Keep monitoring and recovery control independent.
    Use guest, application, database, storage, network, backup-age, and synthetic-user signals in
    addition to provider graphs. Place at least one detection and coordination path outside the
    provider failure domain when that failure is in scope. Preserve timestamps, request or job IDs,
    path evidence, provider inventory drift, access and audit events, and bidirectional network
    evidence before replacement or restart hides the fault. Send security-relevant logs to a sink
    whose ingestion identity cannot rewrite or delete retained evidence.

12. Prepare rebuild-first incident recovery.
    Separate prevention from containment: a provider Firewall change can block new connections while
    old sessions, application tokens, database sessions, and compromised processes remain active.
    Define clean administrator access, account and token containment, exposure removal, session
    termination, evidence preservation, isolated analysis, clean-image rebuild, validated data
    restoration, and rotation of every secret the compromised workload could read. Do not return a
    patched compromised server or attached forensic disk to the production trust boundary.

13. Treat bootstrap as reproducible initialization.
    Keep cloud-init or user data small, versioned, secret-safe, observable, and limited to bootstrap.
    Move substantial configuration into an idempotent, rerunnable, pinned, and testable mechanism.
    Prove failure reporting and rebuild from a clean server; do not rely on a one-shot script whose
    partial completion cannot be distinguished from success. Verify the current metadata API contract,
    deprecated paths, image-specific network auto-configuration owner, and first-boot identity reset.

14. Build a live cost and lifecycle ledger.
    Refresh billing rules and prices, then account for active and powered-off compute, IPs, Load
    Balancers, Volumes, Backups, Snapshots, buckets, retained versions, Storage Boxes, egress, and
    Dedicated commitments. Label owner, environment, purpose, protection, and expiry. Cleanup must
    inventory dependencies and protections first and use a configured intent; never turn a cost
    observation into an automatic delete.

15. Verify the complete change matrix.
    Cover declared config, parser or schema, plan or diff, focused tests, architecture compatibility,
    bootstrap, health checks, failover fencing, restore, monitoring, cost, docs, and rollback or
    replacement. Run only configured intents. Report provider-side checks that remain manual rather
    than claiming production state from local validation.

<!-- mustflow-section: postconditions -->
## Postconditions

- Hetzner resources, owners, failure domains, credentials, network paths, storage classes, recovery
  chain, current provider assumptions, capacity evidence, and cost lifecycle are explicit.
- Availability, replication, backup, restore, and off-provider recovery claims are kept distinct.
- Declared, provider-applied, guest-observed, and externally observed states are not conflated.
- Every changed operational claim has named evidence or is reported as an unverified manual check.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer narrower configured IaC validation, provider-mock, network, architecture, bootstrap, restore,
performance, cost, and runbook checks. Local success does not prove live Hetzner state.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If current official documentation disagrees with an attachment, old runbook, test fixture, or
  remembered provider behavior, use the current contract and report the compatibility impact.
- If provider state cannot be inspected safely, stop at declared-state verification and name the
  missing provider and runtime checks.
- If a change removes public reachability, enlarges a root disk, crosses architecture, moves a
  Floating IP, deletes a resource, changes retention, or alters backup custody without a proven
  recovery path, do not proceed with the mutation.
- If failover lacks fencing, idempotency, bounded retry, quorum, or independent coordination, report
  the split-brain or duplicate-work risk before adding automation.
- If an isolation change relies only on a new Cloud Firewall while old sessions remain active,
  require a separate connection, process, credential, and evidence-containment plan.
- If required state storage is missing, mounted at the wrong path, attached in the wrong location, or
  replaced by an empty local directory, fail startup instead of creating fresh state.
- If an application requires POSIX locks, atomic rename, append, mmap, or low-latency random I/O,
  reject Object Storage as a transparent mounted filesystem.
- If a provider integration relies on a mutable image tag, removed API field, undocumented metadata
  path, or unverified CSI or CCM feature, pin a compatible version or stop with the compatibility gap.
- If a cost optimization removes recovery, observability, capacity, architecture compatibility, or
  failure isolation, reject the optimization or add the missing guardrail first.
- If the needed provider command intent is absent, report it instead of embedding a raw hcloud,
  Terraform, API, SSH, benchmark, delete, rescale, restore, or failover command.

<!-- mustflow-section: output-format -->
## Output Format

- Hetzner boundary and resource ledger
- Current official provider facts refreshed and access date
- Failure-domain, network, credential, storage, backup, restore, and control-plane decisions
- Compute, architecture, performance, capacity, cost, and lifecycle evidence
- Declared, provider, guest, and external state verified
- Files changed
- Command intents run
- Manual or skipped provider checks and reasons
- Remaining Hetzner availability, recovery, security, performance, and cost risk
