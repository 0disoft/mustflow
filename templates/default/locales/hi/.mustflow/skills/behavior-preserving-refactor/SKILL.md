---
mustflow_doc: skill.behavior-preserving-refactor
locale: hi
canonical: false
revision: 11
lifecycle: mustflow-owned
authority: procedure
name: behavior-preserving-refactor
description: Apply this skill when refactoring should reduce change cost while preserving existing behavior and keeping behavior changes separate.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.behavior-preserving-refactor
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Behavior-Preserving Refactor

<!-- mustflow-section: purpose -->
## Purpose

Guide refactoring that lowers future change cost without silently changing runtime behavior.

Refactoring is not cleanup for aesthetics. It is a controlled way to make code easier to understand, test, and change while keeping bug fixes, feature work, and behavior changes separate.

<!-- mustflow-section: use-when -->
## Use When

- The user asks to refactor, clean up, reorganize, simplify, split, extract, rename, remove duplication, or improve structure.
- A planned change risks mixing renames, moves, extractions, deduplication, bug fixes, and feature behavior in one diff.
- Existing code is hard to change because responsibilities, names, branches, dependencies, or tests are unclear.
- Existing inheritance, base classes, abstract classes, template methods, protected state, or subclass variants make behavior harder to test or change.
- Existing handlers, repositories, adapters, jobs, or services mix business decisions with database access, network calls, logging, current time, generated identifiers, randomness, environment reads, or framework objects.
- Existing controllers, handlers, jobs, or services mix one state-changing intent with authorization, transactions, idempotency, audit logs, outbox events, retries, concurrency checks, and external side effects.
- Existing controllers, handlers, workers, command handlers, or services repeat the same multi-step subsystem sequence and should move behind a stable facade without changing behavior.
- Existing lifecycle state changes are scattered across direct assignments, handlers, repositories, jobs, UI checks, SQL conditions, or provider callbacks.
- Existing code repeats presence checks for optional collaborators such as loggers, analytics clients, caches, optional notifications, or no-op processors.
- The task touches legacy or weakly tested code and needs a safer refactoring order.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The requested task is primarily a bug fix or failure diagnosis; use `repro-first-debug` first.
- The change introduces new folders, modules, routing, data models, or external service boundaries before refactoring scope is clear; use `structure-discovery-gate`.
- The task is only to review an already completed diff; use `diff-risk-review` or `code-review`.
- The target code is about to be deleted, the requirement is still unclear, or the next step requires a product decision rather than a refactor.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The refactoring goal, target files or area, and the concrete pain being reduced.
- Current behavior evidence, such as tests, examples, fixtures, command output, or observed input and output cases.
- Existing local patterns for naming, file boundaries, dependencies, and tests.
- Current changed-file list when the worktree is already dirty.
- Relevant command-intent contract entries for verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The expected behavior to preserve is known, or the unknown behavior has been reported before edits begin.
- If the area is unfamiliar, `codebase-orientation` or `pattern-scout` has been used to avoid inventing a parallel structure.
- If tests are absent or weak, the first safe step is to add characterization coverage, capture input and output cases, or explicitly report the verification gap.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Rename unclear identifiers when the rename improves call-site meaning without changing behavior.
- Extract small functions, policies, or helpers when they have a clear concept, inputs, outputs, and test value.
- Flatten conditional flow when it preserves the same guard conditions and error behavior.
- Separate responsibilities, dependencies, or side effects in the smallest useful step.
- Move domain decisions toward pure functions or narrow policy objects, and keep I/O, clocks, network calls, process spawning, persistence, and logging in the imperative edge.
- Add or update tests that preserve current behavior or make the refactoring safe.
- Do not mix behavior changes, bug fixes, new features, broad formatting churn, or unrelated cleanup into the refactor.

<!-- mustflow-section: procedure -->
## Procedure

Before broad hotspot scans, compress candidates before reading files.

- Exclude generated files, bundled files, lock files, dependency directories, large fixtures, snapshots, build outputs, minified files, and source maps before ranking candidates.
- Use `[refactoring.hotspots]` preferences as scan limits: `large_file_candidate_kb` for the first size signal, `history_days` for recent change and bug-fix history, and the candidate limits for how many files to inspect at each depth.
- Prefer overlapping low-cost signals over a single metric: size, recent change frequency, bug-fix history, import/export count, TODO/FIXME/HACK count, type or lint bypasses, missing nearby tests, and architecture-boundary imports.
- Treat strong combinations as higher priority, such as large files with frequent changes and no tests, small security/payment/permission files with repeated bug fixes, large React client components with many effects, and API/controller files that mix validation, authorization, business logic, database access, and response formatting.
- Do not read every candidate. Keep the first pass to the configured primary limit, narrow to the configured structure-review limit, and read full file contents only for the configured full-file limit.
- When opening a candidate, inspect imports, exports, declarations, TODO or type-bypass neighborhoods, and the largest or most branch-heavy function before reading the full file.

1. Diagnose whether refactoring is needed.
   - Name the real problem: change cost, unclear responsibility, repeated bug risk, test difficulty, dependency coupling, or confusing flow.
   - Do not refactor only because code looks long, old, or stylistically uneven.
2. Identify behavior that must stay fixed.
   - Prefer existing tests or examples.
   - If coverage is missing, record representative input and output cases or add focused characterization tests before structural edits.
   - Treat suspected bugs as separate follow-up fixes unless the user explicitly asks to change behavior.
3. Choose the safest refactoring ladder.
   - Start with names and local clarity.
   - Then extract small concepts with clear inputs and outputs.
   - Then flatten conditions or isolate policies.
   - Then remove duplication only when the duplicated code changes for the same reason.
   - Move files, introduce abstractions, or split modules only after local behavior is easier to see.
4. Check duplication before merging code.
   - Keep duplication when code only looks similar or will change for different reasons.
   - Prefer common code only when it represents the same rule, simplifies call sites, and does not add parameter or branch complexity.
   - Prefer explicit duplication over a misleading abstraction.
5. Check extracted functions and names.
   - Extract only concepts that can be named precisely.
   - Avoid vague names such as `process`, `handle`, `do`, or `helper` unless they match established local style.
   - Boolean functions should read naturally at call sites and reveal the condition being tested.
6. Prefer the low-ceremony structural pattern that matches the pain:
   - Dependency injection when direct construction, global lookup, or hidden imports of tools, clients, clocks, file systems, processes, loggers, configuration, random generators, identifiers, queues, or external SDKs makes behavior hard to test. Use `dependency-injection` before editing that boundary.
   - Adapter or translator boundaries when external formats leak into core logic. Use `adapter-boundary` when provider data, protocols, errors, timeouts, retries, idempotency, security, or observability are part of the boundary.
   - Composition over inheritance when behavior can be assembled from small explicit collaborators. Use `composition-over-inheritance` before editing `extends`, base classes, abstract classes, template methods, protected state, mixins, or subclass combinations.
   - Command pattern when a state-changing user or system intent needs a traceable execution unit with explicit payload, context, authorization, transaction boundary, idempotency, outbox, audit, retry, or concurrency behavior. Use `command-pattern` before editing that execution unit.
   - Pure core with an imperative shell when business decisions, validation, authorization, pricing, eligibility, state transitions, or domain events are mixed with I/O, time, generated identifiers, randomness, environment reads, or framework objects. Use `pure-core-imperative-shell` before editing that split.
   - State machine pattern when status, state, phase, step, or stage controls allowed behavior and transitions are scattered or assigned directly. Use `state-machine-pattern` before editing lifecycle transitions.
   - Strategy pattern when repeated branches choose among interchangeable algorithms, policies, pricing rules, scoring methods, provider choices, or feature variants that share one purpose. Use `strategy-pattern` before editing that strategy family.
   - Result and Option values when expected failures, meaningful absence, null returns, thrown business failures, or ambiguous success flags make behavior hard to follow. Use `result-option` before editing that return-shape contract.
   - Null Object pattern when repeated nullable checks around an optional collaborator can be replaced by a same-interface neutral implementation without hiding required failures. Use `null-object-pattern` before editing that optional dependency boundary.
   - Injected time context when current time affects preserved behavior.
7. Handle conditional complexity by finding the policy.
   - Use early exits for simple guard conditions when they preserve behavior.
   - Separate state, type, permission, and exceptional-rule branches when they are mixed.
   - Avoid replacing clear branches with a strategy object, table, or abstraction before the policy boundary is proven.
8. Keep commits and reports reviewable.
   - Separate renames, moves, extractions, deduplication, tests, and behavior changes when possible.
   - If behavior changes are discovered, stop and report them as a separate fix path.
9. Verify with the narrowest configured command intents that cover the changed code and contract surfaces.

<!-- mustflow-section: postconditions -->
## Postconditions

- Existing behavior is preserved or any behavior change is clearly separated and reported.
- The refactor has a named purpose tied to lower change cost, lower defect risk, or better testability.
- The diff is small enough for a reviewer to distinguish mechanical changes from semantic changes.
- Tests or verification evidence cover the behavior most likely to regress.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Choose the narrowest configured test or build intent that proves the refactored behavior. Use documentation and release checks only when the refactor changes public docs, templates, schemas, package metadata, or release-sensitive surfaces.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If current behavior cannot be observed, stop before broad restructuring and report the missing safety evidence.
- If a refactor uncovers a bug, keep the refactor behavior-preserving and propose the fix as a separate change.
- If deduplication creates more options, branches, or vague names, undo or postpone that abstraction.
- If tests fail after a supposedly behavior-preserving edit, diagnose the behavior difference before continuing.
- If the next useful step is a large module move or public boundary change, use `structure-discovery-gate` and `contract-sync-check` before proceeding.

<!-- mustflow-section: output-format -->
## Output Format

- Refactoring goal
- Behavior preservation evidence
- Structural risk signals found
- Facade extraction used or intentionally avoided
- Refactoring ladder chosen
- Structural pattern used or intentionally avoided
- Changes made or analysis-only recommendation
- Behavior changes intentionally excluded
- Verification intents run
- Skipped checks and reasons
- Remaining risks or follow-up fix path
