---
mustflow_doc: skill.performance-budget-check
locale: en
canonical: true
revision: 15
lifecycle: mustflow-owned
authority: procedure
name: performance-budget-check
description: Apply this skill when CLI execution duration, build time, bundle size, test execution scheduler bottlenecks, filesystem scanning latency, process spawning overhead, or dependency size budgets are planned, edited, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.performance-budget-check
  command_intents:
    - changes_status
    - changes_diff_summary
    - build
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Performance Budget Check (CLI Core Condensed)

<!-- mustflow-section: purpose -->
## Purpose

Keep CLI performance claims and execution speed tied to reproducible, measured thresholds instead of qualitative statements.

<!-- mustflow-section: use-when -->
## Use When

- The task changes or reports CLI build time, bundle size, test scheduling logic, database cache initialization, or command execution duration.
- A change adds heavy dependencies, recursive file-system scanning, command fan-out, or repeated child process spawning (e.g., test harness overhead).
- A test optimization changes process isolation, in-process CLI execution, shared build outputs, or scheduler grouping.
- A report claims that a CLI path is "faster", "optimized", "efficient", or "lightweight".

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes wording, translations, or docs with no runtime execution impact.
- The numbers represent local mocks or test-only fixtures with no operational baseline meaning.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- **Performance Surface**: Target command path, build step, or test scheduling token model.
- **Measurement Method**: The exact execution tool (e.g., in-process execution vs. process spawning).
- **Baseline**: Current execution duration or bundle size before changes.
- **Measured Result**: Post-change metrics under identical sandbox constraints.
- **Isolation Surface**: Shared state touched by the optimization, such as `process.cwd()`, `process.env`, module cache, build output directories, database files, or child processes.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When criteria and does not match the exclusions.
- Standard test suite intent (`test_related` or `test_fast`) is configured and functional.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Tighten budget limits, add performance test fixtures, optimize scheduling tokens, or use in-process helpers instead of spawning heavy child processes.
- Replace fuzzy adjectives ("fast", "responsive") with exact duration (ms/sec) or file weight (KB/MB).

<!-- mustflow-section: procedure -->
## Procedure

1. Identify if the performance change affects:
   - **Build Time**: bundle duration, generated file size, and rebuild behavior.
   - **Test Scheduling**: scheduler token capacity, wave grouping, in-process execution, and subprocess fan-out.
   - **CLI Boot Time**: Node process startup, module import cost, and command dispatch latency.
2. Run the narrowest matching oneshot intent (e.g., `build` or `test_related`) to establish a deterministic local baseline.
3. Before converting process-spawned tests to in-process execution, inventory global process state:
   - current working directory reads or writes;
   - environment variable mutation;
   - `process.argv`, `process.exitCode`, signal handlers, module cache, timers, and singleton caches;
   - shared filesystem outputs such as `dist/`, local indexes, or temporary database paths.
4. Do not use `process.chdir()` as an in-process test isolation strategy when multiple tests can run in the same Node test runner. Use a context-aware current-directory adapter, serialize the affected tests, or keep those tests in separate processes.
5. Treat build output directories that are deleted and recreated during build as exclusive resources. Lock the build/test runner before rebuilding or reading that output so an overlapping run cannot remove files from a live test process.
6. Before measuring, check for an already-running build, profile, or test process for the same repository. Stop, wait, or report the overlap before recording timings.
7. Eliminate process spawning loops. Where possible, invoke core logic directly in-process instead of using heavy CLI shell executions, but only after the isolation surface is controlled.
8. Measure and document the metrics exactly:
   - Command duration (ms or seconds).
   - Bundle size (KB or MB) if `dist/` is affected.
9. Identify any potential platform-specific latency differences (Windows PowerShell vs. Unix sh).
10. Verify changes using `mustflow_check` and the narrowest test suite intent.

<!-- mustflow-section: postconditions -->
## Postconditions

- All speed or weight claims are backed by measured data or explicitly marked as "unverified local estimate".
- No hidden process-spawning bottlenecks or N+1 file scan loops are introduced.
- In-process performance work documents how global process state and shared build outputs are isolated.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents:
- `build` (to check bundle weight/correctness)
- `test_related` or `test_fast` (to verify execution speed)
- `mustflow_check`

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If local execution hardware makes metrics non-deterministic, state the sandbox CPU/environment variables explicitly.
- If timings are distorted by an orphaned or overlapping process, stop and classify the measurement as invalid before taking a new baseline.
- If correctness conflicts with performance, prioritize correctness, revert the optimization, and report the trade-off.

<!-- mustflow-section: output-format -->
## Output Format

- Performance Surface: [e.g., CLI test-harness in-process runner]
- Measurement Method: [e.g., bun run test:related]
- Baseline Metrics: [e.g., 18.2s execution with process spawning]
- Post-change Metrics: [e.g., 3.8s execution via in-process helper]
- Sync Details: synchronized CLI helpers and test configuration
- Remaining Risks: platform-specific process execution drift under heavy IO
