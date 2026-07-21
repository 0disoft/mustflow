---
mustflow_doc: skill.agent-runtime-isolation-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: agent-runtime-isolation-review
description: Apply this skill when a long-running agent system must keep durable workflow state outside short-lived workers, split work across capability-specific queues, run model-directed shell, browser, file, package, or code activity in ephemeral sandboxes, inject narrow temporary credentials, broker production effects, and choose isolation by blast radius and maximum tolerable loss.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.agent-runtime-isolation-review
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

# Agent Runtime Isolation Review

<!-- mustflow-section: purpose -->
## Purpose

Keep state long-lived while keeping execution processes and authority short-lived. Separate the
trusted control plane from model-directed compute so a worker crash, poisoned context, dependency,
shell command, browser page, or credential misuse cannot inherit the lifetime and blast radius of
the whole workflow.

<!-- mustflow-section: use-when -->
## Use When

- An agent runtime executes shell commands, code, package operations, browsers, files, previews,
  data transformations, external tools, or untrusted content.
- A logical task lasts longer than one process, container, sandbox, model context, credential, queue
  lease, or worker allocation.
- The design chooses between a long-lived process and durable workflow plus queued activities,
  shared workers and per-task sandboxes, containers and stronger isolation, or direct production
  credentials and a policy broker.
- Isolation cost, startup cost, state rehydration, task granularity, retry loss, incident frequency,
  blast radius, or maximum tolerable loss affects architecture.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main problem is generic durable workflow state, callbacks, timers, or compensation with no
  model-directed execution plane; use `durable-workflow-orchestration`.
- The main problem is broker acknowledgement, redelivery, ordering, DLQ, or worker loss; use
  `queue-processing-integrity-review`.
- The main problem is child-process timeout, output, argv, environment, or termination inside one
  trusted execution boundary; use `process-execution-safety`.
- The main problem is deciding whether multiple runtime agents outperform one; use
  `agent-runtime-multi-worker-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Control-plane ledger: workflow state, event history, plan, policy, approvals, identities, budgets,
  audit, billing, recovery, artifact registry, and which trusted service owns each item.
- Execution-plane ledger: worker image and identity, sandbox type, lifetime, task input, mounts,
  writable paths, output artifacts, processes, ports, packages, browser, network, and cleanup proof.
- Queue ledger: capability class, admission, concurrency, priority, lease, heartbeat, timeout, retry,
  cancellation, backpressure, worker pool, and production-mutation separation.
- Credential ledger: issuer, subject, tenant, resource, effect, audience, expiry, call and cost limit,
  injection path, revocation, persistence rule, and broker boundary.
- Task-boundary ledger: independently verifiable outcome, serialized state, artifact references,
  rehydration cost, failure and restart rate, idempotency, unknown outcome, compensation, and
  checkpoint or split decision.
- Isolation ledger: public versus private inputs, untrusted code or content, secret access, host and
  network exposure, production authority, candidate isolation levels, direct and operating cost,
  incident likelihood, expected loss, maximum loss, and organizational survival limit.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify the durable source of truth before shortening worker lifetime. Process memory, a browser
  profile, a prompt transcript, or a sandbox filesystem is not durable workflow authority by itself.
- Classify every input, mount, credential, network target, artifact, and external effect before
  selecting an isolation level.
- Refresh provider sandbox, runtime, pricing, persistence, credential, and network behavior before
  embedding exact claims. Do not copy example costs, durations, or checkpoint formulas into policy.
- Keep command execution under `.mustflow/config/commands.toml`; this skill does not authorize live
  workers, sandboxes, packages, browsers, cloud mutations, or production credentials.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine control and execution plane separation, durable state, task queues, worker admission,
  sandbox manifests, mounts, output directories, ephemeral credentials, network policy, artifact
  validation, policy brokers, idempotent commit, cleanup, tests, docs, routes, and templates.
- Replace persistent all-purpose workers with capability-specific pools or per-task sandboxes when
  risk and operating evidence support the split.
- Do not expose host-wide sockets, root authority, user home directories, long-lived cloud keys,
  production database administration, or broad filesystem and network access to model-directed
  compute as a convenience shortcut.
- Do not treat a container boundary alone as authorization, tenant isolation, production approval,
  or protection against every host escape.

<!-- mustflow-section: procedure -->
## Procedure

1. Separate logical lifetime from process lifetime. Keep one durable workflow identity, event or
   state history, approvals, budgets, and effect ledger across processes. Rebuild transient clients,
   prompts, caches, browsers, and sandboxes for each admitted activity.
2. Keep the control plane trusted. Let it own the agent loop, model routing, policy, approvals,
   identity, audit, billing, recovery, and authoritative run state. Put model-directed file, shell,
   package, browser, and preview work in an execution plane with narrower authority.
3. Choose activity boundaries by recoverability, not arbitrary time or one model turn. A good unit
   produces an independently verifiable artifact or state transition, can start from serialized
   state and references, is safe to retry or reconcile, and does not repeat completed external
   effects after failure.
4. Balance unit size from local evidence. Count sandbox startup, serialization, queue, cache warm-up,
   and rehydration cost against expected lost work, timeout, context contamination, and failure
   recovery. Use measured restart and rehydration behavior; do not impose a universal duration.
5. Route activities by capability. Separate read-only browsing, private-data reading, CPU build,
   GPU work, package execution, and production mutation so concurrency, priority, network, image,
   budget, and retry policy can differ. Do not let one general queue imply every capability.
6. Build a minimal sandbox manifest. Mount only required inputs, default them to read-only, provide a
   distinct bounded output area, use an allowlisted environment, declare packages and ports, and
   exclude host caches, homes, sockets, credentials, and unrelated repositories.
7. Keep credentials short-lived and task-scoped. Inject them at runtime from a trusted broker, bind
   tenant, resource, effect, audience, expiry, and budget, prevent persistence in prompts, files,
   snapshots, logs, images, and artifacts, and revoke them when the task ends or policy changes.
8. Deny network by default where practical. Allow only declared package mirrors, data sources, APIs,
   callbacks, or artifact stores. Apply DNS, redirect, private-address, credential-forwarding, and
   egress policy at a trusted boundary rather than asking the model to comply.
9. Validate artifacts before export. Check schema, hashes, provenance, sensitive content, executable
   files, links, permissions, ownership, and expected output path before moving results into trusted
   storage or a later workflow stage.
10. Broker high-impact effects outside the sandbox. Let the worker propose a normalized change; let
    a trusted policy service re-evaluate current identity, target, state, approval, idempotency, and
    capability before executing or handing the action to a human.
11. Make queued execution replay-safe. Persist intent before dispatch, keep effect identity stable,
    use idempotency keys or reconciliation, heartbeat genuinely long work, fence stale workers, and
    preserve UNKNOWN outcomes. Route broker settlement details to
    `queue-processing-integrity-review` and workflow recovery to
    `durable-workflow-orchestration`.
12. Choose isolation from blast radius and maximum loss, not compute price alone. Compare direct and
    fixed isolation cost with expected incident reduction, but exclude any level whose worst
    credible loss exceeds the organization's declared survival limit.
13. Match isolation to workload. Public read-only tasks with no secrets or host value may use a
    lighter boundary; private repositories, untrusted pages, arbitrary packages, shell, browser, or
    customer data need stronger task isolation; production IAM, payments, DNS, and destructive
    infrastructure need a separate account, project, tenant, or brokered control plane as applicable.
14. Verify teardown. Stop process trees, revoke credentials, close ports, expire leases, preserve
    bounded diagnostics, export only admitted artifacts, and record whether filesystem, network,
    mount, snapshot, and secret cleanup was confirmed or remains uncertain.
15. Test containment and recovery. Cover worker crash before and after effects, stale lease,
    duplicate delivery, unknown outcome, poisoned input, forbidden mount, blocked egress, expired
    credential, secret-in-artifact rejection, sandbox escape signal, artifact tampering, cleanup
    failure, and resume in a fresh worker.

<!-- mustflow-section: postconditions -->
## Postconditions

- Durable workflow truth survives worker and sandbox loss without depending on process memory.
- Model-directed compute receives only task-scoped mounts, network, credentials, capabilities, and
  lifetime.
- High-impact external effects are revalidated and committed by a trusted broker with idempotency or
  reconciliation.
- Isolation choice accounts for blast radius and maximum tolerable loss as well as direct cost.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer raw container, VM, queue, browser, cloud, package, network, or production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If durable truth lives only in one process or sandbox, stop claiming resumability.
- If credential, mount, network, or output scope cannot be bounded, keep the task manual or move it
  to a stronger isolated environment.
- If an external effect lacks idempotency or outcome reconciliation, disable automatic replay and
  preserve manual-review state.
- If cleanup cannot be confirmed, quarantine the environment and revoke authority before reuse.

<!-- mustflow-section: output-format -->
## Output Format

- Control and execution plane boundary
- Durable state, activity, queue, worker, and artifact decisions
- Sandbox, mount, network, credential, and cleanup contract
- Policy broker, idempotency, reconciliation, and high-impact effect boundary
- Isolation cost, blast radius, maximum loss, and survival-gate findings
- Command intents run and skipped checks
- Remaining agent-runtime isolation risk
