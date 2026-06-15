---
mustflow_doc: skill.incident-triage-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: incident-triage-review
description: Apply this skill when an incident, outage, degradation, timeout spike, latency p95 or p99 spike, queue backlog, pool saturation, CPU idle slowness, memory or OOM event, disk or inode pressure, DNS or network failure, load balancer 5xx, Kubernetes node or pod issue, deployment regression, cache stampede, batch or cron spike, Redis slowdown, database lock wait, connection leak, conntrack or ephemeral-port exhaustion, logging flood, or operational debugging report needs fast evidence-based triage that narrows time, blast radius, change source, saturation, dependency, and wait-state before reading every log.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.incident-triage-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Incident Triage Review

<!-- mustflow-section: purpose -->
## Purpose

Review incident handling as evidence elimination, not as "look at more logs."

The review question is: "Can an operator narrow the first bad minute, affected slice, recent change, wait or saturation class, dependency boundary, and safest next question quickly enough to avoid chasing every plausible subsystem?"

<!-- mustflow-section: use-when -->
## Use When

- A task creates, changes, reviews, or reports incident response, outage debugging, production triage, operational runbooks, alert handling, postmortem evidence, or support escalation guidance.
- An incident involves or may involve latency spikes, tail latency, timeouts, 5xx, 499 or 408 responses, partial regional impact, one bad instance, one Kubernetes node, queue lag, DB pool waits, locks, Redis stalls, DNS, network handshakes, connection state, CPU, memory, GC, disk, inode, OOM, log floods, deployment changes, feature flags, cron, batch jobs, cache misses, external APIs, or load balancers.
- A review needs to decide what evidence should be checked first and what evidence can be safely deprioritized.
- A code or docs change claims that a system is easy to troubleshoot, incident-ready, diagnosable, SLO-ready, on-call-friendly, or operationally safe.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily adding logs to a backend path; use `backend-log-evidence-review` first and this skill only for incident-level triage flow.
- The task is primarily metrics, traces, dashboards, alerts, sampling, or telemetry-cardinality design; use `observability-debuggability-review` first and this skill for the operator's first-pass elimination order.
- The task is primarily fixing retry, queue, cache, transaction, lock, database query, access-control, or failure-integrity behavior. Use the matching integrity or data skill first and this skill for incident evidence ordering.
- The user asks for live production investigation and the repository has no configured one-shot command intent for the requested live diagnostics. Report the missing configured or manual-only evidence boundary instead of inventing commands.
- The path is a pure local calculation with no operational boundary, dependency, runtime resource, queue, external call, deployment, or user-impact signal.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Incident frame: symptom, first reported time, suspected start window, affected users or tenants, endpoint or job, region or availability zone, version or release, and whether the issue is ongoing.
- Time evidence: error rate, request volume, p95, p99, timeout count, deployment time, autoscaling events, DB connection count, queue lag, cron or batch schedule, and external dependency status where available.
- Scope axes: instance, pod, node, region, availability zone, version, endpoint, tenant, customer segment, feature flag cohort, shard, dependency, provider, and request payload class.
- Saturation and wait evidence: CPU busy or idle, CPU I/O wait, memory and OOM history, GC pause, disk capacity, inode pressure, disk latency, DB pool active and wait time, thread or worker pool queue, Redis clients and slow commands, connection states, conntrack, and rate-limit queues.
- Dependency evidence: database locks, slow queries, external API latency split, DNS lookup time, TCP connect time, TLS handshake time, first byte time, load balancer status source, cache hit rate and miss cost, queue age, and downstream deletion or side-effect delays when relevant.
- Change evidence: deploys, config changes, feature flags, schema changes, cache flushes, certificate or DNS changes, cron, batch, backup, index rebuilds, traffic-shape changes, data-threshold crossings, and dependency release notes or incidents.
- Safety constraints: credentials, tokens, personal data, customer payloads, private incident data, raw logs, vendor payloads, production dashboard access, shell access, and command-contract boundaries.
- Repository evidence: local observability conventions, runbook docs, alert definitions, dashboard files, incident tests or fixtures, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Live production commands, dashboards, profilers, log searches, database consoles, Kubernetes shells, cloud consoles, and packet captures are treated as manual-only unless configured as bounded one-shot command intents.
- Missing incident evidence can be reported without guessing.
- If triage touches secrets, personal data, payments, deletion, security, queue settlement, retry, locks, or transactions, also apply the narrower matching skill for that risk.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten runbook steps, troubleshooting docs, alert metadata, incident evidence checklists, telemetry contract notes, dashboard descriptions, test fixtures, and code comments only when they directly support the incident triage path.
- Add or tighten repository-local tests for docs, templates, or telemetry contracts when the changed surface already has a local test pattern.
- Replace broad "check logs" or "check CPU" guidance with evidence axes, bounded labels, first-bad-time selection, scope splits, saturation or wait classification, and manual-only diagnostic boundaries.
- Do not add a new monitoring vendor, production dashboard, collector, long-running process, live shell command, database query, Kubernetes command, profiler, load test, or background service outside the configured command contract.
- Do not store raw production logs, secrets, customer payloads, private incident details, or unbounded transcripts in the repository.

<!-- mustflow-section: procedure -->
## Procedure

1. Pin the first bad time.
   - Start from the transition from normal to abnormal, not from the loudest error.
   - Compare error rate, request volume, p95, p99, timeouts, deployment or config time, autoscaling, DB connection count, queue lag, and external dependency changes.
   - Treat the five minutes around the first bad time as the highest-value evidence window unless current evidence proves a slower buildup.
2. Split scope before reading deep logs.
   - Classify whether the issue is all traffic, one endpoint, one tenant, one shard, one region, one availability zone, one version, one instance, one node, one dependency, one feature flag cohort, or one payload shape.
   - If only one slice is unhealthy, compare the same fields for healthy and unhealthy requests.
   - If every slice is unhealthy, prioritize common dependencies, shared infrastructure, load balancers, DNS, pools, and release or config changes.
3. Compare success and failure.
   - For the same time window, compare successful and failed or slow requests by route, tenant, user cohort, region, version, pod, node, upstream IP, payload size, feature flag, shard, and dependency call.
   - The useful clue is the field present only in the bad slice, not the noisiest log line.
4. Prefer tail and timeout evidence over averages.
   - Reject average-only latency as weak evidence.
   - Use p95 and p99 to decide whether a minority path, lock, GC pause, disk I/O, pool wait, or dependency wait is hiding behind healthy averages.
   - Treat rising timeout count with low application error count as a dependency, pool, lock, queue, or network-wait clue.
5. Classify CPU evidence.
   - High CPU points toward computation, serialization, compression, encryption, regex, sorting, looping, or logging overhead.
   - Low CPU with slow requests points toward waiting: disk I/O, DB pool, network, lock, thread pool, queue, GC pause, or dependency latency.
   - High I/O wait or disk latency should move attention away from application exception logs.
6. Classify memory and stop-the-world evidence.
   - For OOM, separate heap, off-heap, buffers, mmap, thread stacks, file cache, and container limit pressure where the runtime exposes them.
   - For pause-like latency without errors, inspect GC pause, allocation rate, large responses, whole-list loading, cache growth, and native memory paths.
   - Treat a process disappearing without app logs as a possible kernel, supervisor, container, or OOM-killer event.
7. Classify disk and file-system pressure.
   - Check capacity, inode pressure, disk latency, write backlog, log growth, temp files, upload staging, session files, and database WAL or checkpoint pressure.
   - Do not wait for 100 percent capacity before treating disk as a suspect; performance can fail earlier.
8. Separate app 5xx from proxy or load-balancer 5xx.
   - App 500 usually means code boundary failure.
   - Proxy or load-balancer 502, 503, or 504 can mean upstream connect failure, dead process, keep-alive mismatch, header size, TLS, idle timeout, or readiness failure.
   - Track 499, 408, and client-closed-request spikes as possible slow-backend evidence even when the app later logs success.
9. Review pool and queue saturation.
   - For DB, HTTP, worker, thread, semaphore, rate-limit, and connection pools, inspect active, max, idle, queued, wait count, wait time, acquire timeout, and rejection counts where available.
   - Queue lag is deferred user impact. Compare inflow, processing rate, oldest age, consumer count, retry count, and DLQ count before assuming consumers are simply down.
10. Review database waits before rewriting queries.
    - Slow-query duration can include lock wait.
    - Distinguish CPU-bound query planning or execution from lock wait, I/O wait, WAL flush, checkpoint, pool wait, and network round trip.
    - If DB CPU is low while queries are slow, prioritize waiting and blocking evidence before index speculation.
11. Review Redis and cache evidence.
    - Big keys, slow commands, network transfer size, client count, blocked clients, eviction, replication lag, and command mix can explain Redis slowness even when memory graphs look simple.
    - Cache hit rate is insufficient; inspect miss cost, synchronized TTL expiry, cold start, origin latency, key cardinality, and cache fill lock behavior.
12. Review network and name-resolution evidence.
    - Do not treat ping as proof that HTTP is healthy.
    - Split DNS lookup, TCP connect, TLS handshake, first byte, and response download timing where evidence exists.
    - Inspect resolver timeout, TTL, Kubernetes DNS pressure, search-domain expansion, connection reuse, ephemeral-port exhaustion, TIME_WAIT, CLOSE_WAIT, and conntrack saturation when symptoms are random timeouts.
13. Review Kubernetes node versus pod boundaries.
    - If multiple bad pods share a node, inspect node pressure, CPU steal, disk pressure, memory pressure, CNI, kube-proxy, DNS, image GC, and noisy-neighbor evidence.
    - Pod readiness and restart counts are symptoms; node placement can be the split that matters.
14. Review deployment and delayed-change evidence.
    - A deployment can cause an incident long after rollout if cache warmup, queue buildup, connection leaks, cron timing, feature flag exposure, data threshold, or slow memory growth is required to trigger the path.
    - Do not exclude a release only because the graph moved later than the deploy timestamp.
15. Treat cron, batch, backup, and indexing as first-class suspects.
    - Regular spikes around minute, hour, day, week, or month boundaries often point at scheduled jobs taking shared resources.
    - Review backup, report generation, log compression, email sends, settlement, analytics sync, index rebuilds, and data exports before digging into random request logs.
16. Review log volume as both symptom and cause.
    - Error bursts can overload disk, stdout collectors, log agents, JSON serialization, network egress, and downstream log sinks.
    - Duplicate stack traces at several layers can make a degraded system slower and hide the first useful event.
17. Build an elimination ledger.
    - For each candidate, record the axis checked, evidence observed, decision (`still_possible`, `unlikely`, `ruled_out`, `manual_only`, or `missing`), and the next narrower question.
    - Prefer "DB CPU low, pool wait high, bad version only" over "probably database."
    - Avoid narrative root-cause guesses until the ledger has excluded at least the obvious time, scope, change, wait, and dependency alternatives.
18. Check safety and authority boundaries.
    - Do not copy private incident logs or sensitive payloads into docs or tests.
    - Map external or pasted diagnostic commands to configured command intents when the repository provides them; otherwise mark them manual-only.
    - If live investigation requires production access, state the missing evidence boundary rather than inventing local proof.

<!-- mustflow-section: postconditions -->
## Postconditions

- The incident review has a pinned time window, affected-scope split, change ledger, saturation and wait classification, dependency split, success-versus-failure comparison, manual-only boundaries, and an elimination ledger.
- Average-only latency, all-logs-first triage, deployment dismissal, success-only comparison, proxy/app 5xx mixing, app-log-only OOM review, CPU-idle slowness ambiguity, DB-index reflex, pool-wait blindness, queue-lag understatement, cache-hit-rate overtrust, ping-only network checks, pod-only Kubernetes review, disk-capacity-only checks, log-volume blind spots, and unbounded production-log capture are fixed or reported.
- Any required live diagnostic, dashboard, database console, Kubernetes shell, profiler, packet capture, or production log search is labeled manual-only or missing unless a configured command intent covers it.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use narrower configured tests when code, templates, docs, runbook fixtures, or telemetry contracts were changed. Do not infer live incident diagnostics, dashboard queries, shell commands, profilers, packet captures, local servers, or production log searches outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the incident time window cannot be pinned, report the missing time evidence and avoid strong root-cause language.
- If scope cannot be split, report which axis is missing: version, node, pod, region, endpoint, tenant, cohort, shard, dependency, or payload shape.
- If every candidate remains possible, narrow to the cheapest next evidence axis instead of adding a broad checklist.
- If a configured command fails after triage docs or tests change, preserve the failing intent and use `failure-triage` before further edits.
- If external advice includes raw production commands, map them to configured intents or mark them manual-only; do not embed them as agent-executable instructions.

<!-- mustflow-section: output-format -->
## Output Format

- Incident boundary reviewed
- First bad time, affected scope, recent changes, success-versus-failure split, latency and timeout evidence, CPU/memory/disk/GC signals, pool and queue saturation, DB or Redis waits, network and DNS split, load balancer versus app status, Kubernetes node versus pod split, cron or batch evidence, log-volume evidence, and elimination ledger
- Triage fixes made or recommended
- Evidence level: configured-test evidence, docs or runbook evidence, telemetry fixture evidence, static review evidence, manual-only, missing, or not applicable
- Command intents run
- Skipped live diagnostics and reasons
- Remaining incident-triage risk
