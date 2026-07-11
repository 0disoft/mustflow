---
mustflow_doc: skill.performance-measurement-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: performance-measurement-integrity-review
description: Apply this skill when performance counters, timers, histograms, cache ratios, batch or queue throughput, cancellation cost, benchmark results, profiler artifacts, regression gates, or performance logs need review for semantic correctness, concurrency safety, comparable evidence, and sensitive-data containment.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.performance-measurement-integrity-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Performance Measurement Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Make performance evidence mean what its name claims. Separate event semantics, units, clocks,
concurrency guarantees, workload conditions, and privacy boundaries before using a number for an
optimization claim, alert, budget, or release gate.

<!-- mustflow-section: use-when -->
## Use When

- Code adds or changes counters, gauges, timers, histograms, cache statistics, queue or batch
  measurements, cancellation measurements, benchmark result files, performance budgets, profiler
  artifacts, regression comparison, or automated performance gates.
- A review must decide whether multithreaded, asynchronous, retried, deduplicated, hedged, batched,
  queued, cancelled, or partially committed work is counted and timed correctly.
- Performance logs or artifacts can expose paths, repository remotes, URLs, process arguments,
  environment values, source text, heap contents, credentials, personal data, or internal topology.
- A report claims a benchmark or telemetry series proves a regression, improvement, capacity,
  cache efficiency, throughput, latency, or cancellation cost.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only chooses or implements an optimization and the measurement contract is unchanged;
  use `performance-budget-check`.
- The task primarily asks whether operators can narrow an incident from general logs, metrics,
  traces, dashboards, or alerts; use `observability-debuggability-review`.
- The task primarily designs a load generator or test-suite runtime; use the matching load,
  benchmark, or test-performance skill first and this skill only for measurement integrity.
- A number is a local fixture with no performance meaning, comparison, or public contract.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Measurement question and decision: what event, duration, resource, ratio, or regression is being
  measured and what action the result may trigger.
- Event lifecycle: logical command, attempt, accepted, started, completed, committed, acknowledged,
  deduplicated, retried, rejected, dropped, cancelled, rolled back, and terminal boundaries.
- Unit ledger: request, lookup, key, item, batch, chunk, byte, operation, worker-second, CPU-second,
  wall-second, and any weighting or denominator.
- Time model: monotonic versus wall clock, process boundary, scheduled arrival, queue wait, service
  time, commit time, end-to-end time, CPU time, nested work, and unfinished work.
- Concurrency model: update primitive, snapshot guarantee, context propagation, aggregation window,
  reset behavior, sampling, contention, and instrumentation overhead.
- Workload and comparison evidence: baseline, candidate, environment identity, scenario, input size,
  concurrency, cache state, warmup, repetitions, raw samples, and statistical decision rule.
- Hardware-counter evidence when used: CPU model and core type, event definitions, counter grouping,
  multiplexing or running percentage, affinity, NUMA placement, working-set size, and normalization
  by attempted or completed logical operation.
- Cross-layer latency evidence when used: trace identity, phase sequence, clock domain, payload size,
  ingress and handoff boundaries, executor or event-loop queueing, presentation boundary, sampling
  decision, and dropped-event count.
- Artifact and telemetry boundary: schema version, retention, exporter or collector path, redaction,
  artifact formats, access policy, and recursive secret or path scanning.
- Relevant tests, benchmark fixtures, profiler outputs, schemas, budgets, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the exclusions.
- Existing metric, benchmark, profiler, telemetry, redaction, and result-schema conventions have
  been searched before introducing a new shape.
- Missing workload, snapshot, privacy, or comparison evidence can be reported without inventing it.
- Apply `security-privacy-review` when sensitive data or trust-boundary policy changes, and apply
  `performance-budget-check` when the task also changes the optimized implementation or budget.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten event definitions, metric names, units, lifecycle counters, histograms, context
  propagation, snapshot logic, reset handling, benchmark schemas, comparison rules, budgets,
  artifact sanitization, canary scans, and focused tests tied to the measurement contract.
- Replace ambiguous averages or ratios with source counters and mergeable distributions whose
  denominator and weighting are explicit.
- Replace raw paths, remotes, URLs, arguments, environment values, and identifiers with bounded
  logical names, route templates, classifications, or keyed pseudonyms where policy permits.
- Do not add a telemetry vendor, profiler service, load generator, background process, network call,
  or raw command outside the configured command contract.
- Do not weaken correctness, privacy, or reproducibility merely to reduce instrumentation overhead.

<!-- mustflow-section: procedure -->
## Procedure

1. Define each measured event before naming a counter.
   - Separate one logical command from attempts, accepted work, started work, terminal outcomes,
     durable commits, deduplication, retries, hedges, drops, and rollbacks.
   - Place increments at the transition they claim to count. Pool size, queue size, or submit calls
     are not substitutes for started or committed work.
2. Define the unit and denominator.
   - Keep request, lookup, key, item, batch, chunk, byte, and resource-time units separate.
   - For cache evidence, distinguish request, key, and byte hit rates plus lookup outcome, load
     outcome, coalesced wait, refresh, negative or stale hit, and served source where relevant.
   - Aggregate source counts before deriving a ratio; do not average per-worker or per-instance ratios.
3. Review counter concurrency and snapshot semantics.
   - An atomic increment prevents lost updates; it does not make several independently read totals
     one consistent snapshot.
   - If numerator, denominator, count, and duration must describe one observation window, use a
     joint observation, mergeable histogram, epoch handoff, or explicit synchronization whose cost
     and guarantee are documented.
   - Check overflow, process restart, counter reset, scrape gaps, aggregation-window length, and
     sawtooth batch completion before deriving rates.
4. Review timer ownership and clocks.
   - Attach timing state to the operation or trace context, not an assumed worker thread.
   - Use a monotonic clock for elapsed time within one clock domain. Do not subtract monotonic values
     from different processes. Use event timestamps and trace context for distributed timelines and
     state the clock-error boundary.
   - Split wall, CPU, lock wait, I/O wait, queue wait, batch-fill wait, service, commit, ack, and
     end-to-end time when those phases can drive different decisions.
5. Preserve parallel and unfinished work semantics.
   - Distinguish elapsed time from cumulative worker time and exclusive time; parent and child timers
     may intentionally overlap and must not be summed as one elapsed duration.
   - Record terminal outcome and duration for failures, timeouts, and observed cancellations. Track
     in-flight age, oldest queued age, and abandoned age so non-completing work is not deleted from
     latency evidence.
   - For offered-load tests, preserve scheduled arrival or another open-loop reference when a
     closed-loop client would hide coordinated omission.
6. Bound instrumentation distortion.
   - Check shared-counter contention, false sharing, allocation, label cardinality, clock-read cost,
     event volume, profiler overhead, and sampling bias.
   - Per-thread or striped accumulation trades short-window snapshot precision for lower contention;
     document that trade instead of calling both properties exact.
   - Measure disabled, minimally recorded, and fully recorded modes under the same workload when
     instrumentation can change code layout, inlining, vectorization, allocation, lock hold time,
     exporter backpressure, or tail latency. A no-op sink does not remove event construction cost.
   - Apply sampling before expensive field construction where possible. Tail sampling can reduce
     retained or exported data after recording; it does not refund span creation and attribute work.
   - Observe exporter capacity, queue age or utilization, enqueue failure, and dropped signals. A
     pipeline that drops more telemetry during slow periods can make the measured tail look better.
   - Measure the empty timing or recording path to establish resolution and overhead. For work near
     that floor, batch repeated operations and report the resulting precision limit.
7. Model batch, queue, and throughput stages.
   - Record batch, chunk, item, input-byte, and output-byte counts plus batch-size distribution.
   - Separate offered, admitted, started, computed, committed, rejected, expired, dropped, duplicate,
     retried, discarded, and rolled-back work. Report useful throughput and attempted throughput.
   - Split batch-fill wait, admission wait, queue wait, time to first result, processing span, commit,
     acknowledgement, and end-to-end latency. Keep item-weighted and batch-weighted distributions distinct.
   - Condition latency on bounded batch-size or cost classes and inspect stragglers, shard skew,
     head-of-line blocking, busy worker time, CPU time, and active concurrency.
8. Treat cancellation as a lifecycle and a resource ledger.
   - Separate requested, accepted, observed by worker, side effects stopped, and terminal cancelled.
   - Measure reaction time, drain time, work completed before observation, work attempted after
     observation, post-cancel CPU or worker time, cleanup, rollback, orphaned side effects, restart
     rework, and backlog recovery when applicable.
   - A cancellation API returning success does not prove execution or side effects stopped.
9. Make benchmark evidence comparable.
   - Use a versioned result schema containing scenario and environment identity, commit or build
     identity, raw samples, units, warmup, repetitions, input size, concurrency, cache state, and
     measurement-tool version.
   - Compare base and candidate under the same controlled environment, preferably interleaved on
     the same machine. Gate on a predeclared practical effect threshold and uncertainty rule, not
     one noisy average or a favorable rerun.
   - Combine relative and absolute budgets and cover representative size, concurrency, cache, and
     scaling scenarios. Keep bounded retry policy; never rerun until a desired result appears.
   - Use a fast representative pull-request subset and broader scheduled or merge-queue evidence
     when cost requires tiers. Profile or bisect after a regression is confirmed, not as a substitute
     for a reproducible comparator.
10. Validate hardware-counter and cache claims.
    - Disambiguate CPU IPC, meaning retired instructions per CPU cycle, from inter-process
      communication. Spell out the term when both concepts appear in the same scope.
    - Normalize instructions, cycles, misses, and transferred bytes by the same attempted or
      successfully completed logical operation used by the outcome model. Preserve both denominators
      when failures differ between candidates.
    - Treat hit rate as explanatory evidence, not the final optimization result. Review references
      per operation, misses per operation, misses per instruction, cycles per operation, latency,
      throughput, errors, and tail latency together.
    - Confirm each performance-monitoring event's meaning for the actual CPU. Generic cache events,
      speculative accesses, prefetches, and cache levels are not portable semantic contracts.
    - Check whether ratio inputs ran simultaneously. If limited hardware counters were multiplexed,
      preserve running percentages and group dependent events or reject ratios whose overlap is too
      weak for the workload phase length.
    - Keep different hybrid core types separate. Control CPU affinity and memory or NUMA placement
      for the comparison, then repeat under representative scheduler interference.
    - Sweep working sets across relevant cache boundaries and concurrency across one to saturation.
      Compare cold, warmup, steady-state, single-thread, contended, and near-saturation scenarios
      separately. Inspect memory-bound classification, miss latency or source, cache-line ownership,
      and false sharing before attributing an improvement to cache behavior.
    - Do not infer cause from CPU IPC alone. A branch, vectorization, compiler, overlap, or algorithm
      change can alter it; require end-result improvement plus a consistent causal evidence chain.
11. Preserve communication outcome and conservation semantics.
    - Keep a logical operation distinct from transport attempts, child work, retries, hedges, and
      units within a partial result. Report logical success, attempt success, attempt amplification,
      full or partial operation outcome, and unit outcome with explicit denominators.
    - Make terminal outcomes mutually exclusive and finalize one logical operation once. Timeout,
      cancellation, transport failure, application failure, rejection, process loss, partial success,
      and full success must not double-decrement in-flight work or double-record duration.
    - Do not divide starts and finishes from the same wall-time window as if they were one cohort.
      For closed reports, group by start cohort through terminal or deadline. For live views, show
      terminal ratios beside in-flight count, oldest age, and the started-versus-finished gap.
    - Separate client outcome, server execution outcome, and delivery outcome. A caller deadline can
      coexist with a later durable server commit; expose late completion and post-cancel work rather
      than overwriting one fact with another.
    - Record all terminal outcomes in one bounded-label duration family, then view outcome-specific
      distributions. Treat cancelled observations as cancellation timing or censored completion
      evidence, not successful completion latency.
    - Define conservation checks such as admitted equals terminal plus in-flight, and requested units
      equal terminal unit outcomes plus remaining units within the stated snapshot tolerance. Use a
      monotonic terminal transition and idempotent unit identity to detect missing or duplicate events.
12. Decompose cross-process and user-visible latency.
    - Build one trace-scoped phase sequence from actual input occurrence through frontend queueing,
      preparation, encoding, bridge ingress, decode, executor queue, active execution and waits,
      response encoding and handoff, native receipt, event-loop continuation, framework commit, and
      presentation when those boundaries are observable.
    - Mark every timestamp with its clock domain. Do not directly subtract browser, process, or host
      monotonic clocks. Use bounded ping-pong offset and drift estimation or retain per-domain spans
      with an explicit uncertainty interval.
    - Distinguish async object or future creation, spawn, first poll, active poll time, wait time, and
      completion. Do not hold thread-affine span state across suspension points.
    - Use empty or no-op round trips plus payload-size sweeps to separate bridge fixed cost from
      serialization, copying, and queue noise. Do not halve round-trip time and call it one-way delay
      when the two directions are asymmetric.
    - Treat handler entry as post-routing or post-decode unless an earlier ingress boundary is
      actually instrumented. Likewise, a promise continuation is not native receipt and a state
      assignment or animation-frame callback is not proof of pixels presented.
    - Keep an inseparable interval composite instead of inventing internal timestamps. For each trace,
      compare end-to-end latency with the union of non-overlapping critical-path phases and residual;
      frequent negative or large residuals indicate clock, overlap, or missing-boundary errors.
    - Calculate end-to-end percentiles from complete per-trace paths. Never add layer p99 values,
      because each layer's slowest sample can belong to a different operation.
13. Protect performance telemetry and artifacts.
    - Normalize paths before classification and replace them with logical roots; partial substring
      masking is not a path policy. Separate repository identity from remote URL.
    - Parse URLs structurally. Remove user info and fragments, strip or allowlist query values, and
      prefer route templates or endpoint classes over full URLs.
    - Do not dump argument vectors, environments, configs, headers, baggage, or trace state. Emit a
      versioned allowlisted schema and redact at the source plus collector boundary where one exists.
    - Treat raw CPU, heap, allocation, JFR, pprof, trace, benchmark, and compressed artifacts as
      sensitive. Scan final binaries and recursively inspect supported archives and profile formats
      for canary secrets, source paths, remotes, URLs, and credentials before distribution.
    - Use keyed pseudonyms rather than raw hashes for low-entropy sensitive identifiers when stable
      correlation is permitted, and rotate or scope keys according to policy.
14. Connect evidence to the decision.
    - State which source counters and distributions produce every ratio, percentile, budget, or alert.
    - Classify the conclusion as configured-test evidence, controlled benchmark evidence, profiler
      evidence, telemetry evidence, static review, manual-only, missing, or not applicable.
    - Reject a gate or claim when its semantics, comparator, privacy boundary, or reproducibility is
      materially unknown.

<!-- mustflow-section: postconditions -->
## Postconditions

- Measured events, lifecycle stages, units, denominators, clocks, snapshot guarantees, reset behavior,
  workload conditions, comparison rules, and privacy boundaries are explicit or reported missing.
- Retry, dedupe, hedge, batch, queue, cache, cancellation, unfinished-work, and parallel-work semantics
  are not collapsed into misleading totals when they affect the decision.
- Hardware-counter ratios have defined events, compatible clock and scheduling windows, normalized
  operation denominators, and sufficient simultaneous-running evidence, or are rejected.
- Communication outcomes obey a stated terminal and unit conservation model, and cross-process
  latency phases preserve clock-domain uncertainty and critical-path semantics.
- Performance claims and gates are backed by evidence whose scope is no broader than the actual
  scenario, environment, samples, and verification performed.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer focused metric-schema, concurrency, reset, histogram, redaction, artifact-scan, benchmark-parser,
and regression-gate tests. Treat live production telemetry, dedicated benchmark hardware, and external
profilers as manual-only unless a configured intent explicitly owns them.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If event meaning or denominator is ambiguous, preserve the raw source counts and stop the derived
  ratio or gate until the contract is named.
- If a low-contention accumulator cannot provide the required snapshot guarantee, either weaken the
  claim explicitly or choose a bounded synchronization or epoch design and measure its overhead.
- If base and candidate conditions differ materially, report two observations instead of a regression.
- If an artifact cannot be inspected or redacted safely, keep it undistributed and report the missing
  verification rather than claiming it is sanitized.
- If instrumentation changes the hot path materially, reduce or relocate it with a documented loss of
  precision; do not silently keep a distorted benchmark.

<!-- mustflow-section: output-format -->
## Output Format

- Performance measurement boundary reviewed
- Event, lifecycle, unit, denominator, clock, snapshot, reset, and instrumentation-overhead findings
- Batch, queue, cache, cancellation, unfinished-work, and parallel-work findings
- CPU counter, cache hierarchy, PMU scheduling, affinity, NUMA, working-set, and saturation findings
- Communication outcome, cohort, partial-success, finalize-once, conservation, and late-completion findings
- Cross-process clock alignment, phase closure, critical-path, residual, and presentation findings
- Benchmark schema, comparator, scenario, budget, statistical rule, profiling, and bisect findings
- Telemetry and artifact privacy findings
- Fixes made or recommended
- Evidence level and command intents run
- Skipped verification and reasons
- Remaining performance-measurement integrity risk
