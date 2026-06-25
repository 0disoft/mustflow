---
mustflow_doc: skill.test-suite-performance-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: test-suite-performance-review
description: Apply this skill when test-suite runtime, CI feedback latency, test selection, shard balance, worker scheduling, retry policy, flaky-test handling, fixture setup, database or container test lifecycle, coverage or artifact overhead, test-result caching, test discovery, or test performance claims are planned, edited, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.test-suite-performance-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - build
    - test_related
    - test
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Test Suite Performance Review

<!-- mustflow-section: purpose -->
## Purpose

Make test suites faster without turning the default verification path into wishful thinking.

The review question is not "can the suite run in parallel?" It is "where is the wall-clock time
actually spent, which tests are safe to skip or run later, which workers are waiting, which shared
resources are saturated, and what evidence keeps a faster path trustworthy?"

<!-- mustflow-section: use-when -->
## Use When

- Test or CI runtime, developer-loop feedback time, shard balance, worker count, test discovery,
  coverage collection, trace or artifact generation, retry policy, flaky-test handling, or test
  result caching is created, changed, reviewed, or reported.
- A task changes command contracts, CI workflows, test runner configuration, test grouping, test
  selection, test scheduling, package scripts, fixture setup, database setup, container lifecycle,
  browser test behavior, or coverage and report defaults for performance reasons.
- A report claims tests are faster, optimized, selected, cached, parallelized, sharded, hermetic,
  stable, less flaky, or safer to run on every PR.
- A test suite is slow because of repeated process startup, full-directory discovery, repeated
  migration or seed work, per-test containers, sleeps, external internet calls, huge artifacts,
  tail shards, or over-broad full-suite execution.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only adds or updates behavior tests; use `test-design-guard` or `test-maintenance`.
- The task only reviews whether production code is testable; use `testability-boundary-review`.
- The task is ordinary application hot-path performance with no test runner, fixture, CI, or
  verification-loop behavior; use `performance-budget-check`.
- The user only wants a one-time local command result and no persistent test or CI behavior changes.
- The proposed change weakens verification by deleting tests, skipping failed tests, removing
  assertions, disabling coverage gates, or hiding flaky tests without an evidence-based policy.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Suite surface: local command, CI job, package script, test runner, shard system, coverage job,
  browser test job, database-backed test job, or release gate.
- Timing ledger: discovery, process startup, shared setup, fixture creation, test body, database or
  container setup, cleanup, coverage, report generation, artifact upload, queue wait, shard tail,
  and idle-worker time when available.
- Test timing evidence: p50 and p95 per test or file, longest tests, previous failures, flaky
  history, shard start and finish times, worker utilization, retry count, and timeout outliers.
- Selection ledger: changed files, dependency graph, runtime coverage or touched-file evidence,
  newly added tests, previous failed tests, unsafe-change fallback rules, and scheduled full-suite
  safety net.
- Isolation ledger: time, randomness, UUIDs, locale, timezone, environment variables, home
  directory, filesystem paths, network, database, containers, queues, browser profiles, caches,
  module state, and runner process reuse.
- Resource ledger: CPU, memory, DB connections, browser processes, containers, network, filesystem,
  GPU, SQLite or PostgreSQL locks, port allocation, and any scarce resource that needs a token or
  affinity rule.
- Cache ledger: declared inputs, cache keys, volatile values, hit rate, miss reasons, runner-local
  cache, remote cache, result-cache eligibility, and invalidation behavior.
- Relevant command-intent entries for tests, builds, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required inputs are available, or missing timing, selection, cache, isolation, or resource
  evidence can be reported without guessing.
- If a change touches production behavior or test coverage meaning, use the matching behavior,
  test-design, security, data, or release skill before accepting the performance change.
- If test result caching or selected-test execution is introduced, the full-suite fallback and
  scheduled full-suite safety net are defined first.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine test timing collection, historical duration stores, selected-test manifests,
  dependency-to-test maps, runner scheduling, shard assignment, worker limits, retry classification,
  fixture lifecycle, local stubs, fake timers, cache keys, coverage defaults, and CI report policy.
- Add or adjust tests, fixtures, docs, command contracts, release checks, and template surfaces
  directly tied to the test-suite performance behavior.
- Move expensive setup from per-test to per-worker, per-module, or per-session scope only when
  mutable state still has a cheap isolation layer.
- Do not remove tests, weaken assertions, disable failure artifacts, or mark flaky tests as normal
  success to make a suite look faster.
- Do not add unbounded parallelism, shared database schemas, cross-test mutable fixtures, or result
  caches when hidden inputs are not declared.

<!-- mustflow-section: procedure -->
## Procedure

1. Measure before optimizing.
   - Split elapsed time into discovery, process startup, shared setup, fixture creation, test body,
     database or container setup, cleanup, coverage, report generation, artifact upload, queue wait,
     shard tail, and idle-worker time.
   - Report p50 and p95 per test or file when available. Average-only timing hides the last slow
     shard, and the last slow shard decides CI wall time.
   - When the command contract exposes `test_related_profile`, run it before policy changes that
     depend on local verification timing. Then read the retained evidence with
     `mf script-pack run test/performance-report summarize --json` before changing scheduling,
     caching, timeout, worker, fixture, or selected-test behavior.
2. Classify the bottleneck.
   - Discovery bottleneck: full tree scans, broad classpath scans, fixtures and generated files in
     search paths, or missing precomputed test manifests.
   - Startup bottleneck: one process, JVM, Python, Node, browser, container, or dependency-injection
     graph per test instead of a safe persistent worker.
   - Fixture bottleneck: repeated migrations, seed data, model loads, browser profile setup, or
     container creation.
   - Scheduling bottleneck: file-count sharding, no historical duration data, no work stealing,
     huge test files, or worker count beyond the resource optimum.
   - Artifact bottleneck: coverage, screenshots, videos, traces, full logs, HTML reports, or upload
     work paid on every PR path instead of only failure, retry, nightly, or release paths.
3. Replace blanket full-suite execution with selected execution only when fallback is explicit.
   - Include affected tests from changed files, new tests, and previous failed tests.
   - Fall back to the full suite for changes to lockfiles, compiler or runtime settings, test runner
     configuration, shared fixtures, migrations, database schema, generated contracts, package
     metadata that affects runtime, or any change the selector cannot understand.
   - Keep a scheduled full-suite path for nightly, release, or pre-merge confidence.
4. Do not build impact analysis from imports alone.
   - Combine static dependency evidence with previous runtime evidence such as touched files,
     classes, schemas, config keys, fixtures, resources, and test-to-source mappings.
   - Prefer file or class granularity when method-level tracing costs more than it saves.
   - Treat dynamic imports, reflection, generated code, config-driven branches, and framework magic
     as reasons to widen selection or fall back.
5. Run likely failures early.
   - Order previous failed tests, recently changed tests, tests near the changed code, historically
     flaky tests, and long tests before low-risk tests.
   - Use early-fail jobs for fast developer feedback, but keep a separate full-data job that
     continues collecting remaining failures when the workflow needs all failures.
6. Cache only hermetic test results.
   - A successful test result can be reused only when the test binary, test code, affected product
     code, fixtures, environment, toolchain, locale, timezone, and declared resources match.
   - Do not include volatile values such as commit SHA, build number, wall-clock time, random temp
     roots, or runner-specific paths in cache keys unless they truly affect output.
   - Do include language version, compiler flags, runtime flags, timezone, locale, dependency lock
     content, fixture versions, and DB schema version when they affect behavior.
   - Track cache hit rate and miss reasons after adding a cache; a cache with invisible misses is
     performance theater.
7. Preserve warm local and remote caches.
   - Avoid clearing dependency caches, transformed source caches, test discovery indexes, compiled
     output, and package caches at the start of every CI job.
   - Prefer runner-local SSD caches or content-hash restore over slow network-volume scans.
8. Avoid full discovery on every run.
   - Generate or maintain package-level test manifests when the project can do so safely.
   - Exclude fixtures, snapshots, generated output, archived tests, vendored code, and build output
     from discovery paths.
   - For JVM and similar ecosystems, prefer explicit include patterns over broad classpath scanning
     when the runner supports it.
9. Reuse workers before increasing worker count.
   - Keep interpreters, JIT, dependency injection, ASTs, browser engines, and database clients warm
     across multiple tests when isolation allows it.
   - Reset static state, module caches, timers, environment, and global fixtures between tests.
   - Replace workers only after measured memory leaks, not by default after every test.
10. Size work units for the scheduler.
    - Do not send thousands of tiny remote jobs where queue setup, sandbox setup, input transfer,
      and result collection cost more than the test body.
    - Bundle micro-tests by package, runtime, or fixture affinity while preserving per-test result
      reporting.
11. Shard by historical duration, not file count.
    - Use recent successful durations, trimmed means, or exponential moving averages.
    - Assign longest tests first to the currently lightest shard.
    - Give new tests a directory or type median, and cap timeout outliers so one historic failure
      does not poison future placement.
12. Add work stealing when static shards still leave idle workers.
    - Let early workers take not-yet-started work from overloaded shards.
    - Keep tests that share expensive setup together unless the tail cost is worse than duplicated
      setup.
13. Split huge files below the file level when supported.
    - File-level sharding is fake parallelism when one file contains most of the runtime.
    - Confirm that the runner actually honors case-level sharding; unsupported sharding can cause
      every shard to run the whole suite.
14. Schedule by resource tokens and affinity.
    - Tag tests by CPU, memory, DB connections, browser processes, containers, GPU, filesystem, and
      network pressure.
    - Use resource tokens or locks for scarce shared resources instead of disabling all parallelism.
    - Keep expensive fixture groups together when setup reuse beats perfect load balance.
15. Tune worker count empirically.
    - Compare worker counts such as 1, 2, 4, and 8 on the same commit.
    - Stop increasing workers when wall time stops improving, memory peaks rise sharply, DB waits
      increase, browser tests swap, or flaky rate rises.
16. Make database and container setup worker-scoped.
    - Prefer one DB server or service container per worker, with per-test schemas, databases,
      transactions, savepoints, namespaces, ports, or fixture copies.
    - Do not let all workers share the same mutable schema unless the suite is intentionally
      serialized.
    - Build a migrated and seeded template DB or snapshot once, then clone it per worker when
      migrations or seed data dominate.
17. Reset mutable state cheaply.
    - Prefer transaction rollback or savepoints for tests whose side effects stay inside one DB
      connection.
    - Use DB clone, schema clone, or container snapshot for tests that cross processes, queues,
      external workers, sequence assertions, or asynchronous effects.
    - Use tmpfs only for non-persistent state with explicit size limits.
18. Replace sleeps with readiness and fake time.
    - Treat fixed sleeps as performance bugs.
    - Wait for real readiness: health endpoints, logs, successful queries, event receipt, or port
      plus protocol-level checks.
    - For timers, retries, expiry, and scheduled work, inject clocks or use fake timers instead of
      waiting in real time.
19. Remove external internet from the default CI path.
    - Use local stubs, fixtures, mocks, recorded responses, or contract-specific jobs.
    - Block unrelated images, fonts, analytics, and third-party requests in UI tests unless the test
      is specifically about that delivery behavior.
20. Control hidden inputs.
    - Inject time, random seeds, UUID generation, locale, timezone, environment, and current user.
    - Report seed values on failure so a failed run can be reproduced.
21. Move expensive evidence off the default path.
    - Collect full coverage, videos, traces, screenshots, full logs, and HTML reports only where
      they pay for themselves: failures, first retry, nightly, release, or dedicated coverage jobs.
    - Merge shard reports after tests finish rather than blocking each shard on heavy reporting.
22. Retry narrowly and honestly.
    - Retry only the failed test or case, once, in a fresh worker when possible.
    - Preserve first-failure logs and artifacts.
    - Classify retry success as flaky success, not normal success.
23. Use speculative tail duplication only for hermetic shards.
    - If the last shard exceeds its historical p95 while workers are idle, a scheduler may duplicate
      that shard and accept the first result.
    - Do not duplicate non-hermetic tests, tests with side effects, or tests that consume scarce
      external resources.
24. Garbage-collect the test portfolio.
    - Track duration, unique behavior coverage, defect-finding history, flaky rate, owner, and last
      meaningful update.
    - Move low-value duplicates from PR paths to nightly paths before deleting them.
    - Quarantine flaky tests with owner and expiry; do not let quarantine become permanent silence.
25. Verify the faster path and the fallback path.
    - A selector, cache, shard rule, retry policy, or fixture reuse change is not complete until the
      default fast path and the fallback or full path both have evidence or a reported missing
      command intent.

<!-- mustflow-section: postconditions -->
## Postconditions

- The test-suite bottleneck is classified by timing, selection, scheduling, cache, fixture, DB,
  container, artifact, retry, or resource evidence.
- The optimization goal is explicit: faster first failure, shorter PR wall time, lower CI cost,
  lower flaky rate, smaller artifact overhead, or faster local feedback.
- Selected-test execution has a full-suite fallback for unsafe or unknown changes.
- Caches declare inputs, omit irrelevant volatile values, and report hit rate or miss reasons when
  evidence exists.
- Worker count, resource tokens, shard placement, fixture affinity, and retry behavior preserve
  test isolation and failure evidence.
- Any speed claim is measured, complexity-only, or explicitly unverified.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured test, build, docs, release, or mustflow intent that proves the changed
test-suite behavior. If the repository exposes a profiling or cached-test intent, use it only when
the command contract marks it configured, oneshot, and agent-allowed.

When a profiling intent has run, prefer the read-only `test/performance-report` script-pack as the
first report surface. Its `next_actions` field should guide whether the next safe step is collecting
profile evidence, resolving previous failures, inspecting slow intents or phases, reviewing timeout
pressure, or investigating selected-test fallback behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If timing evidence is missing, add bounded measurement or report the missing evidence before
  changing scheduling, caching, or selection policy.
- If selection cannot understand a change, fall back to the full suite.
- If a cache key is uncertain, prefer a cache miss over a false hit.
- If worker reuse causes order dependence, leaked state, or flaky failures, isolate the leaked
  resource before widening reuse.
- If parallelism makes tests slower, check shared DB, browser, memory, filesystem, and container
  contention before increasing workers again.
- If a retry hides a real failure, preserve first-failure evidence and classify the result as flaky.
- If configured verification is missing, report the missing intent instead of inventing raw runner
  commands.

<!-- mustflow-section: output-format -->
## Output Format

- Suite surface and feedback goal
- Timing breakdown and bottleneck class
- Selection policy and full-suite fallback
- Scheduling, sharding, worker, and resource-token decisions
- Fixture, DB, container, filesystem, time, randomness, network, and isolation notes
- Cache key, hit-rate, and miss-reason notes
- Retry and flaky-test policy
- Coverage, trace, log, screenshot, video, report, and artifact policy
- Speed evidence: measured, complexity-only, or unverified
- Command intents run
- Skipped command intents and reasons
- Remaining test-suite performance risk
