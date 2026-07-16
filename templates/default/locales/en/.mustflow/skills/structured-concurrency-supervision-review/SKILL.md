---
mustflow_doc: skill.structured-concurrency-supervision-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: structured-concurrency-supervision-review
description: Apply this skill when one runtime parent starts concurrent child tasks, workers, coroutines, threads, goroutines, or agent-runtime children and correctness depends on bounded fan-out, ownership, deadline and cancellation propagation, joining, sibling failure policy, cleanup, and rejection of late results.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.structured-concurrency-supervision-review
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

# Structured Concurrency Supervision Review

<!-- mustflow-section: purpose -->
## Purpose

Keep concurrent children inside an explicit lifetime tree. Make the parent own admission, inherited
authority, bounded fan-out, failure propagation, cancellation, join, result admission, and cleanup
so terminal parent state cannot leave invisible work mutating the world.

<!-- mustflow-section: use-when -->
## Use When

- One request, run, task, worker invocation, or runtime agent dynamically starts child tasks.
- Code uses task groups, nurseries, supervisors, join sets, futures, goroutines, coroutines, threads,
  abort controllers, cancellation tokens, or parallel sub-operations.
- Parent completion can race with orphaned children, late results, sibling failure, cancellation,
  cleanup, retry, or unbounded fan-out.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Several coding agents coordinate files, worktrees, commands, and merges; use
  `multi-agent-work-coordination`.
- The main problem is a shared variable, lock, CAS, database row, or transaction invariant with no
  parent-child task tree; use `race-condition-review` or `concurrency-invariant-review`.
- The main problem is durable broker redelivery or worker crash recovery; use
  `queue-processing-integrity-review`.
- The flow must survive process loss and resume from persisted steps; use
  `durable-workflow-orchestration`.
- An independent daemon or service has its own declared lifecycle. It is not a structured child just
  because another process started it once.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Task-tree ledger: parent, children, spawn site, join owner, and terminal owner.
- Inherited-boundary ledger: deadline, cancellation, tenant, capability, budget, trace, and source
  version passed to each child.
- Fan-out ledger: admission rule, concurrency limit, pending limit, queueing, and backpressure.
- Completion-policy ledger: fail-fast, collect-all, quorum, partial success, ordering, and error shape.
- Cancellation, cleanup, retry, and non-cancellable finalization ledger.
- Result-admission ledger: generation or run version, stale-result rule, and aggregation owner.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read the nearest instructions, command contract, spawn and join sites, task runtime, resource
  ownership, retry wrappers, cancellation paths, and current concurrency tests.
- Name the live parent whose lifetime bounds the work. If no parent exists, report detached work
  explicitly instead of calling it structured concurrency.
- Treat framework cancellation and task-group semantics as version-sensitive evidence.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten task groups, supervisors, bounded queues, semaphores, cancellation propagation,
  deadline inheritance, join and aggregation logic, stale-result guards, cleanup, focused tests,
  metrics, docs, and directly synchronized templates.
- Move intentionally durable detached work behind a queue or workflow handoff with a named external
  owner.
- Do not hide orphaning with fire-and-forget wrappers, background promises, swallowed join errors,
  unbounded parallel maps, or process-exit cleanup assumptions.

<!-- mustflow-section: procedure -->
## Procedure

1. Place every spawn site in a task tree and name the parent, child purpose, join owner, and terminal
   owner. Classify any detached task as an explicit external handoff or a defect.
2. Propagate the parent deadline and cancellation signal to every child. Clamp child deadlines so a
   child cannot outlive the parent unless ownership is durably transferred.
3. Propagate tenant, capability, budget, trace, and source-version context without widening it. A
   child may receive less authority, never more by accident.
4. Bound active fan-out and queued work separately. Define rejection, backpressure, batching, or
   degradation when either limit is reached.
5. Choose one completion policy: fail-fast, collect-all, quorum, ordered aggregation, or explicit
   partial success. Define which sibling failures cancel other work and which results remain usable.
6. Join or durably hand off every child before the parent reports terminal success, failure, or
   cancellation. A returned promise that only schedules work is not completion evidence.
7. Make cancellation cooperative and cleanup-safe. Bound grace periods and keep non-cancellable
   finalization limited to restoring local invariants or releasing owned resources.
8. Prevent retry multiplication between child code, supervisor restart, parent retry, and outer
   request retry. Give the whole tree one bounded attempt and elapsed-time story.
9. Tag child results with parent run or generation identity. Reject completions from a cancelled,
   superseded, or closed parent before aggregation or side effects.
10. Release permits, buffers, files, connections, locks, temporary state, and child-owned processes
    on success, error, cancellation, and partial spawn failure.
11. Test parent cancellation, child hang, sibling failure, spawn storm, partial spawn, late result,
    cleanup failure, retry amplification, and terminal reporting before all joins complete.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every child has one live parent or a named durable external owner.
- Parent terminal reporting cannot leave an unauthorized child effect running.
- Active work, queued work, retries, cancellation waits, joins, and cleanup are bounded.
- Late or superseded results cannot enter a new parent generation or mutate closed state.

<!-- mustflow-section: verification -->
## Verification

- Use configured `changes_status` and `changes_diff_summary` for scope evidence.
- Use `lint`, `build`, and `test_related` for runtime changes and controlled interleavings; use `test`
  or `test_audit` for shared supervisors or broad test claims.
- Use `docs_validate_fast`, `test_release`, and `mustflow_check` for docs, package, template, or
  Mustflow changes.
- Report unavailable scheduler fuzzing, runtime tracing, load, or live cancellation evidence rather
  than inventing commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If no parent or join owner can be named, stop the structured-concurrency claim and report detached
  lifetime risk.
- If cancellation cannot reach a child, transfer ownership durably or keep the parent non-terminal
  until the child stops; do not pretend cancellation succeeded.
- If cleanup or join can wait forever, add a bounded escalation or report the unresolved resource.
- If verification fails, preserve the task-tree interleaving and use `failure-triage` before changing
  unrelated concurrency code.

<!-- mustflow-section: output-format -->
## Output Format

- Parent-child task tree and ownership decisions
- Deadline, cancellation, capability, budget, trace, and generation inheritance
- Fan-out, completion, join, retry, cleanup, and late-result policies
- Controlled interleaving and failure evidence
- Files changed and compatibility impact
- Command intents run, skipped checks, and remaining supervision risk
