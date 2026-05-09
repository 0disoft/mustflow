---
mustflow_doc: skill.performance-budget-check
locale: fr
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: performance-budget-check
description: Apply this skill when performance budgets, bundle size, page weight, startup time, command duration, memory use, asset size, throughput, latency, benchmark output, or performance claims are planned, edited, reviewed, or reported.
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

# Performance Budget Check

<!-- mustflow-section: purpose -->
## Purpose

Keep performance claims and budgets tied to declared thresholds, reproducible measurements, and explicit tradeoffs instead of guessing from local impressions.

<!-- mustflow-section: use-when -->
## Use When

- A task changes or reports performance budgets, bundle size, page weight, startup time, command duration, memory use, asset size, throughput, latency, search index size, build time, or benchmark output.
- A change adds heavier dependencies, generated assets, static pages, search indexes, startup work, file scanning, command fan-out, or repeated process spawning.
- A report claims that a path is faster, slower, lightweight, optimized, cached, parallelized, cheap, expensive, within budget, or over budget.
- A failure or slowdown suggests that measurement scope, command selection, concurrency, caching, or generated output size needs review.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes wording and does not make a performance or size claim.
- The number is only a local fixture or example with no budget or public reporting meaning.
- The change is only image asset conversion; use `web-asset-optimization` for that asset pipeline and this skill only for budget reporting.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The performance surface, such as command, page, asset, bundle, startup path, query, build, or generated output.
- The budget source, if one exists: repository config, documented threshold, user-provided limit, benchmark baseline, package metadata, or current command result.
- Measurement method, environment boundary, warm or cold run expectation, and whether the result is deterministic, sampled, local-only, or approximate.
- Relevant command-intent contract entries for status, diff, build, tests, docs, release, or mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten budget checks, measurement notes, thresholds, cache boundaries, dependency tradeoff notes, tests, docs, and reports tied to the changed performance surface.
- Replace vague claims such as "fast" or "lightweight" with measured, bounded, or explicitly unverified wording.
- Prefer existing configured command intents and repository-local measurement paths before adding new tools.
- Do not invent thresholds, benchmark numbers, hardware assumptions, network conditions, or release-blocking budgets without a source of truth.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify the performance surface and whether the task affects runtime, build time, test time, docs generation, asset weight, package size, or user-facing load behavior.
2. Find the budget source before changing thresholds or claims. If no budget exists, report that the work is budget-discovery or measurement-only.
3. Check nearby code, docs, templates, tests, and command metadata for duplicated performance statements or stale thresholds.
4. Classify the measurement as deterministic, sampled, local-only, externally dependent, or unmeasured.
5. If the change adds dependencies, generated output, or repeated work, identify the likely cost path and whether an existing alternative is available.
6. Keep claims conservative: state the command, input scope, and whether caching, warm runs, parallelism, or generated files influenced the result.
7. If a budget is exceeded, report the affected surface, budget source, measured value or unavailable measurement, likely cause, and smallest follow-up.
8. Run the narrowest configured verification that proves the changed performance, package, docs, or mustflow surface.

<!-- mustflow-section: postconditions -->
## Postconditions

- Performance claims have a budget source, measurement method, or explicit unverified status.
- Thresholds and benchmark-facing docs, tests, package metadata, generated output notes, and command contracts are synchronized where they overlap.
- Final reports separate measured evidence from estimates, local observations, and suggested follow-up work.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `build`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a narrower configured benchmark, asset, build, docs, or test intent when it better proves the changed performance surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If no budget source exists, do not invent one. Report the missing source and keep the claim qualitative or measurement-only.
- If a measurement depends on local hardware, cache state, network, registry state, or generated output from a previous run, state that boundary.
- If verification is too slow or no configured command exists, report the missing or skipped intent instead of running an inferred command.
- If a performance fix conflicts with correctness, security, accessibility, or data safety, preserve the stricter correctness boundary and report the tradeoff.

<!-- mustflow-section: output-format -->
## Output Format

- Performance surface reviewed
- Budget source or missing budget
- Measurement method and boundary
- Thresholds, claims, or metadata synchronized
- Command intents run
- Skipped measurements and reasons
- Remaining performance risk
