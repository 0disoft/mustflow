---
mustflow_doc: skill.frontend-state-ownership-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: frontend-state-ownership-review
description: Apply this skill when frontend code is created, changed, reviewed, or reported and state ownership, duplicated state, derived state, server-cache copying, URL state, form drafts, optimistic updates, request races, query keys, context rerenders, persisted client state, SSR hydration, or external subscriptions can make the UI show stale, contradictory, or silently overwritten values.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.frontend-state-ownership-review
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

# Frontend State Ownership Review

<!-- mustflow-section: purpose -->
## Purpose

Review frontend state by asking who owns each fact, not which state library is fashionable.

The core question is: "Can the same value live in two places and drift?" If yes, the UI can render a lie. Make one source authoritative, derive the rest, and keep server cache, URL state, local drafts, global app context, and external subscriptions from pretending to be the same thing.

<!-- mustflow-section: use-when -->
## Use When

- Frontend code is created, changed, reviewed, or reported and the risk is stale, duplicated, contradictory, over-lifted, under-lifted, or race-prone state.
- React, Vue, Svelte, Solid, Angular, TanStack Query, Redux, Zustand, Jotai, MobX, Apollo, SWR, router state, form state, local storage, session storage, IndexedDB, context providers, or external stores hold data that could also exist in props, component state, server cache, URL params, or derived selectors.
- Code introduces or changes `useState(props...)`, derived values in state, boolean loading or mode clusters, selected objects, query keys, invalidation rules, optimistic updates, request cancellation, context values, persisted client stores, SSR hydration branches, or `useSyncExternalStore`-style subscriptions.
- A review claims the state is safe because it uses a popular library, is "just UI state", is copied only once, has an effect to keep it synced, or currently has small data.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only models impossible domain states in type shapes; use `type-state-modeling-review` first and this skill only when frontend ownership or synchronization is also at risk.
- The task only reviews cache correctness outside frontend client state; use `cache-integrity-review` first and this skill only for client-side server-cache copies, query keys, stale rendering, or invalidation UI effects.
- The task only reviews render timing, LCP, CLS, INP, hydration flash, or frame jank; use the matching frontend performance or render-stability skill first and this skill only when state ownership causes the symptom.
- The task is a purely visual or copy-only UI change with no state, data, routing, form, cache, or subscription behavior.
- The framework or library owns the state contract and no project code creates, copies, derives, persists, or mutates the value; report that this skill does not apply instead of inventing state risk.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, current diff or target files, framework and state-library signals, and configured command intents.
- State owner ledger: each state value, authoritative owner, copies, readers, mutators, reset path, persistence path, and rollback path.
- State class map: server data, URL-owned state, local UI state, form draft, global app context, derived selector value, persisted client state, and external subscription state.
- Synchronization surfaces: props-to-state initialization, effects that set state, query keys, invalidation, optimistic update, request cancellation, router params, context providers, storage hydration, and external store subscriptions.
- Identity and collection surfaces: selected IDs versus selected objects, list keys, index keys, object replacement rules, normalized entities, selectors, memoized context values, and row or item local state.
- Evidence level: static diff evidence, focused test evidence, browser or component verification, missing route or interaction evidence, and any unverified state combinations.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Existing local patterns for server data, router state, form drafts, selectors, context providers, global stores, optimistic updates, and cancellation have been searched before adding a new state pattern.
- If state crosses API, database, security, payment, cache, concurrency, or public JSON boundaries, also apply the narrower matching skill for that boundary.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Remove duplicated state by deriving values during render, through selectors, or through memoized pure helpers when cost justifies memoization.
- Move state to the nearest owner that matches the user interaction, route, form draft, server cache, or global app context.
- Replace contradictory boolean flags with one status, mode, or discriminated union when the UI can otherwise express impossible combinations.
- Store stable identifiers such as `selectedId` instead of selected objects when the canonical entity lives in server cache, normalized state, or parent data.
- Keep TanStack Query, SWR, Apollo, or router-owned server and URL data in their owners; do not copy them into Redux, Zustand, or component state without a deliberate draft, snapshot, or offline reason.
- Add or refine query keys, invalidation scope, request cancellation, optimistic rollback, reset keys, selectors, context splitting, memoized provider values, persisted-state versioning, hydration guards, and external subscription wrappers.
- Add focused tests for stale request ordering, query-key changes, invalidation scope, optimistic rollback, reset behavior, impossible status combinations, and form draft isolation when existing test patterns support them.
- Do not migrate state libraries, introduce a global store, normalize all entities, or add broad state architecture unless the current ownership problem requires it.

<!-- mustflow-section: procedure -->
## Procedure

1. Build a State owner ledger before changing code.
   - For each important value, name the single owner, every copy, every reader, every mutator, reset rules, persistence rules, rollback rules, and whether the value is original or derived.
   - Classify each value as server data, URL-owned state, local UI state, form draft, global app context, derived selector value, persisted client state, or external subscription state.
2. Hunt props-to-state copies.
   - Treat `useState(props` or equivalent initializers as suspicious unless the value is a deliberate draft, snapshot, uncontrolled initial value, or reset-by-key state.
   - If props should remain live, read props directly or lift the owner; if a draft is intended, name the commit, cancel, and reset behavior.
3. Remove derived values from mutable state.
   - Values such as `fullName`, `totalPrice`, `filteredItems`, `isAllChecked`, counts, sorted lists, permissions, and display labels should usually be derived from source facts.
   - Do not use `useEffect(() => setX(...), [y])` for render-derived state unless the effect synchronizes with an external system.
   - Watch for effect-derived one-render lag, dependency suppression, and duplicate business logic in components.
4. Replace contradictory status and mode state.
   - Flag `isLoading`, `isSuccess`, `isError`, `isSaving`, `isDirty`, `isModalOpen`, `isEdit`, and similar clusters when one lifecycle or mode can express impossible combinations.
   - Prefer one `status`, `mode`, state machine, or discriminated union with fields required only for that state.
   - Update grouped state together through one action when partial updates can tear the invariant.
5. Keep server data in server-data owners.
   - Do not copy TanStack Query, SWR, Apollo, loader data, or RSC data into global stores or component state just to make it convenient.
   - Use selectors, query cache reads, or a deliberate form draft instead of cache-as-Redux duplication.
   - Ensure the query key includes every condition that changes the result, including tenant, user, filters, sort, page, search, locale, feature flags, and auth-dependent scope.
6. Keep URL-owned state in the URL.
   - Filters, tabs, sort, page, search terms, selected route IDs, and shareable view state usually belong in route params or query params.
   - Avoid a second store copy unless the UI has an explicit unsaved draft or debounced input contract.
7. Review form drafts separately from saved entities.
   - A form draft may copy initial data, but it needs explicit reset, dirty, submit, cancel, conflict, and post-save behavior.
   - Do not let live server refetches silently overwrite user edits unless the product contract says so and the UI exposes it.
8. Store identifiers, not stale objects.
   - Prefer `selectedId` plus a lookup into the current collection, cache, or normalized entity map.
   - Recheck index keys when row components have local state; index keys can move state to the wrong item after insert, delete, sort, or filter.
9. Review mutations and optimistic updates.
   - Each optimistic update needs rollback, duplicate-submit behavior, disabled or queued actions, failed retry behavior, and invalidation scope.
   - Mutation invalidation should refresh the smallest true data surface without leaving related lists, detail pages, badges, totals, or permissions stale.
10. Review request races.
    - Search, filter, autocomplete, pagination, tab changes, and route changes need AbortController, request IDs, library cancellation, or query-key ownership so older responses cannot overwrite newer state.
    - Do not accept "last promise wins" unless the library contract proves stale results are ignored.
11. Review actions and setter exposure.
    - Avoid exporting raw setters through context or stores when callers need domain intent such as `selectProject`, `applyFilters`, `resetDraft`, or `markSaved`.
    - Repeated reset calls, scattered business logic, and component-local policy branches should move to an action, selector, or custom hook with one owner.
12. Review Context and subscription precision.
    - Context value identity must be stable when consumers are broad; memoize values or split read and write contexts when needed.
    - Context is not a precise subscription store; high-churn or large stores need selector-based subscriptions or a proper external store.
    - Browser or external subscriptions should use `useSyncExternalStore` or the framework's equivalent so SSR and hydration see a consistent snapshot.
13. Review state height.
    - State too high turns the root into a trash can and rerenders unrelated consumers.
    - State too low forces sibling synchronization, event buses, prop-drilling hacks, or duplicated URL and cache state.
    - Move ownership to the nearest common owner that also owns the user action.
14. Review reset and persistence.
    - Use `key` resets when component identity should reset local state after route, entity, or draft identity changes.
    - Persisted stores need serializable values, schema versioning, migrations, storage availability handling, logout or tenant reset, and cross-tab behavior when relevant.
    - Avoid storing functions, class instances, promises, DOM nodes, dates without encoding policy, or query cache snapshots in persisted client state.
15. Report the evidence level honestly.
    - Distinguish static risk from tested behavior, browser-observed behavior, and unverified state combinations.
    - If a state owner is unknown, report the missing owner instead of papering over it with another copy or effect.

<!-- mustflow-section: postconditions -->
## Postconditions

- Each important frontend value has one named owner, and copies are either removed, derived, or justified as drafts, snapshots, optimistic entries, persisted state, or external subscription snapshots.
- Server data, URL-owned state, local UI state, form drafts, global app context, derived selector values, persisted client state, and external subscriptions do not silently overwrite each other.
- Query keys, invalidation, optimistic rollback, request race handling, context value identity, list keys, reset behavior, and hydration/subscription contracts are checked where relevant.
- Raw setters, repeated reset logic, and duplicated component business logic are removed or reported when they make state ownership unclear.
- Focused tests or verification evidence cover the changed state boundary when configured.

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

Use the narrowest configured frontend, unit, component, integration, docs, release, or mustflow intent that covers the changed state boundary. Do not infer raw package-manager, dev-server, browser, or watcher commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the owner of a state value cannot be named, stop adding synchronization and report the missing ownership decision.
- If a proposed fix requires a library migration, normalize only the current owner boundary first and report the broader migration as separate work.
- If a query-key or invalidation fix exposes backend/API ambiguity, apply the relevant API, cache, database, or security skill before pretending the client can infer correctness.
- If a test failure reveals stale request ordering, optimistic rollback, hydration, or context rerender risk, preserve the failing scenario and fix the ownership or synchronization boundary before broad refactors.
- If configured verification is missing, report the missing intent instead of inventing raw frontend commands.

<!-- mustflow-section: output-format -->
## Output Format

- Frontend state surface reviewed
- State owner ledger and state class map
- Duplicated, derived, contradictory, over-lifted, under-lifted, server-cache, URL, form draft, optimistic, request race, query key, invalidation, Context value, raw setter, index key, reset, persisted state, SSR hydration, and external subscription checks where relevant
- State ownership, derivation, action, selector, query-key, invalidation, cancellation, rollback, context, persistence, reset, or subscription changes made or recommended
- Tests or verification evidence
- Command intents run
- Skipped frontend checks and reasons
- Remaining state-ownership risk
