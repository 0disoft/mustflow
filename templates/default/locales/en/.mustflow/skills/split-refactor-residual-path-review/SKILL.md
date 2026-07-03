---
mustflow_doc: skill.split-refactor-residual-path-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: split-refactor-residual-path-review
description: Apply this skill when a refactor splits files, extracts handlers, moves event ownership, relocates state mutations, or claims a responsibility moved, and the review must prove old execution paths, listeners, effects, dispatches, imports, feature-flag fallbacks, tests, and lifecycle cleanup no longer keep the previous behavior alive.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.split-refactor-residual-path-review
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

# Split Refactor Residual Path Review

<!-- mustflow-section: purpose -->
## Purpose

Review file-splitting and responsibility-moving refactors by proving the old path lost authority.

The main question is not "was a nicer new module added?" It is "can the old file, handler, listener, effect, dispatch, mutation, route, middleware, consumer, or fallback still process the same event or state change?"

<!-- mustflow-section: use-when -->
## Use When

- A PR or local diff splits a file, extracts a component, handler, reducer, service, route, listener, worker, middleware, controller, or event processor.
- A responsibility is claimed to move from one owner to another, especially event receive, event interpretation, state mutation, side effect, API request, cache update, analytics emission, or cleanup ownership.
- A previous bug may reappear because old conditions, callbacks, effects, subscriptions, imports, feature flags, fallbacks, or tests still exercise the old path.
- Review needs to distinguish a true move from code duplication, partial extraction, or a new module that is not connected to the real entrypoint.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a broad behavior-preserving refactor with no file split, handler relocation, state mutation relocation, or old-path risk; use `behavior-preserving-refactor`.
- The main concern is general module ownership, import direction, DTO leakage, or policy owner placement; use `module-boundary-review`.
- The task only asks for changed-file risk classification and verification selection; use `diff-risk-review`.
- The change is a pure rename or formatting-only move with no runtime entrypoint, listener, state, side effect, feature flag, or test routing impact.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Refactor claim: what responsibility moved, from where, to where, and what behavior should remain unchanged.
- Current diff shape: added files, deleted lines, moved code, old files that remain, imports changed, and tests changed.
- Residual keyword ledger: old bug keywords, event names, action types, handler names, API calls, state field names, feature flag names, selector names, cache keys, analytics names, route names, job names, and middleware names.
- Entry and ownership ledger: event receiver, interpreter, state mutator, side-effect owner, external request owner, cleanup owner, and public entrypoints before and after the split.
- Lifecycle ledger: mount, unmount, remount, route change, modal close, tab switch, reconnect, retry, worker restart, consumer rebalance, or job replay behavior when relevant.
- Test ledger: existing regression tests, new module unit tests, real-entrypoint integration tests, duplicate-execution tests, cleanup tests, ordering tests, and static boundary rules.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Existing local patterns for file moves, handler ownership, event routing, state mutations, lifecycle cleanup, feature flags, and tests have been searched before recommending a new pattern.
- If the residual path affects payments, auth, notifications, persistence, cache truth, concurrency, or UI resurrection, also apply the narrower matching skill for that boundary.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Remove old handlers, conditions, effects, subscriptions, dispatches, emits, mutations, imports, fallback branches, direct API calls, cache updates, analytics calls, or cleanup logic that still own the moved responsibility.
- Convert the old owner into a pure adapter, delegator, or view when the new owner should interpret and mutate state.
- Add or tighten boundary guards such as import restrictions, module boundary rules, lint rules, dependency rules, or package exports that prevent the old owner from importing moved event types or handlers.
- Add focused tests for real entrypoint routing, old-path non-execution, single execution, lifecycle cleanup, ordering, feature-flag fallbacks, and regression scenarios tied to the moved responsibility.
- Do not keep duplicate old and new paths "for safety" unless the product contract explicitly requires parallel behavior and the diff names the compatibility sunset.

<!-- mustflow-section: procedure -->
## Procedure

1. Start with the diff shape.
   - Compare added files with deleted old responsibility.
   - Treat a refactor that mostly adds new code while barely deleting old conditions, effects, handlers, cleanup, or side effects as suspected duplication.
   - Separate mechanical moves from semantic changes before judging correctness.
2. Name the moved responsibility.
   - State exactly what moved: receive event, interpret event, update state, perform external request, emit analytics, update cache, route command, validate input, cleanup listener, or publish event.
   - If the responsibility cannot be named, use `behavior-preserving-refactor` or `module-boundary-review` before editing.
3. Search residual paths.
   - Search old bug keywords, event names, action types, handler names, API calls, state fields, feature flags, selectors, cache keys, analytics names, route names, job names, middleware names, and callback names.
   - Inspect neighborhoods around `onClick`, `onChange`, `addEventListener`, `subscribe`, `dispatch`, `emit`, `useEffect`, `watch`, `listener`, `handler`, `middleware`, `controller`, `route`, `consumer`, `job`, and `callback`.
   - Treat old imports of moved event types, handlers, mutation helpers, or state fields as evidence that the move may be incomplete.
4. Check single ownership of the event path.
   - The old location may pass data through or render output, but it should not still decide what the event means.
   - Event receiving, event interpretation, state mutation, and external side effects should not be split halfway between old and new owners unless a named compatibility adapter explains why.
   - If both old and new owners listen to the same event, identify whether one is dead, delegated, compatibility-only, or a duplicate-execution bug.
5. Trace state mutation authority.
   - Follow reducers, store mutations, local setters, optimistic updates, query-cache writes, form sync, repository writes, job state, and side-effect acknowledgements.
   - Reject designs where the new owner changes state and the old owner later recomputes, overwrites, or replays the old value.
6. Check feature flags and fallback paths.
   - Review flag on, flag off, legacy mode, mobile, SSR, permission-denied, empty data, error retry, offline, reconnect, old route, and tenant or partner branches.
   - All supported branches should route the responsibility to the same owner, or the diff should explicitly classify the divergence.
7. Check dependency direction.
   - A new event owner should not import old UI internals, container-only constants, private helpers, or test-only wiring from the old location.
   - Move stable contracts to a shared domain, type, adapter, or public module surface only when that reduces ownership ambiguity.
8. Review tests for real routing, not only new module correctness.
   - A unit test that calls the new module directly is not enough when the real user or system event may still enter the old path.
   - Prefer tests where the real click, route, message, API request, worker event, queue message, or dispatch enters the app and reaches the new owner.
   - Keep or add the old bug reproduction as a regression guard when the refactor is meant to prevent recurrence.
9. Add duplicate-execution tests when side effects matter.
   - Assert one click, request, dispatch, event, analytics call, notification, charge, save, cache update, or job replay is handled once.
   - Check counts, idempotency keys, emitted events, persistence writes, and external calls rather than only final visible state.
10. Add lifecycle and cleanup evidence.
   - Test or inspect mount, unmount, remount, route change, modal close, tab switch, reconnect, consumer restart, and job replay when listeners or subscriptions moved.
   - Ensure the subscription and cleanup moved together; a split subscription and old cleanup is usually unstable.
11. Check ordering.
   - Preserve important sequences such as validate, normalize, update, persist, notify, cleanup, ack, and publish.
   - If swapping two steps would break correctness, encode that sequence in one owner or a test that observes the ordering.
12. Add structural guardrails when the old path is easy to reintroduce.
   - Prefer `no-restricted-imports`, dependency-cruiser, module boundary rules, package exports, or local lint rules over a comment that asks humans to remember.
   - Guard only the moved responsibility; do not create broad architecture rules unrelated to the current refactor.
13. Decide the outcome.
   - If old and new paths both execute, fix the residual path when in scope.
   - If the residual path is intentional compatibility, document the sunset and tests.
   - If evidence is insufficient, report the missing entrypoint, lifecycle, flag, ordering, or static-boundary proof.

<!-- mustflow-section: postconditions -->
## Postconditions

- The old location either no longer owns the moved responsibility, is a pure delegator, or has a documented compatibility role.
- Real entrypoints route through the new owner.
- Duplicate listeners, dispatches, state mutations, external requests, cache writes, analytics calls, and cleanup ownership are removed or reported.
- Feature flags, fallback branches, lifecycle cleanup, ordering, and tests prove the old path cannot silently revive the previous behavior.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured test, lint, build, docs, release, or mustflow intent that covers the moved responsibility, static boundary guard, template surface, or public contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the old responsibility cannot be located, stop and report the missing residual keyword, entrypoint, or ownership evidence.
- If tests only call the new module directly, report the real-entrypoint gap before claiming the refactor prevents regression.
- If removing the old path changes behavior, split the work into a behavior-preserving refactor and a separate behavior change or bug fix.
- If a boundary rule would block valid callers, narrow the rule to the moved responsibility instead of weakening the review.
- If a configured command fails, preserve the failing intent and use `failure-triage` before unrelated edits.

<!-- mustflow-section: output-format -->
## Output Format

- Split refactor surface reviewed
- Moved responsibility and old versus new owner
- Diff-shape evidence: additions, deletions, moved code, old imports, and old conditions
- Residual path search terms and findings
- Event, state mutation, side-effect, feature-flag, lifecycle, cleanup, and ordering evidence
- Tests added, updated, missing, or intentionally deferred
- Static boundary guard added or intentionally avoided
- Fixes made or recommendation
- Command intents run
- Skipped checks and reasons
- Remaining residual-path risk
