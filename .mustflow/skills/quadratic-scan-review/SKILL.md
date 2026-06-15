---
mustflow_doc: skill.quadratic-scan-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: quadratic-scan-review
description: Apply this skill when code is created, changed, reviewed, or reported and the specific risk is hidden O(N^2) or pairwise work caused by repeated scans, membership checks, code joins, resolver fan-out, render-time lookup, repeated sorting, copying, string building, or helper functions that rescan growing collections.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.quadratic-scan-review
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

# Quadratic Scan Review

<!-- mustflow-section: purpose -->
## Purpose

Find hidden O(N^2) work by tracing when one growing collection repeatedly scans, searches, sorts, copies, serializes, or fetches against another growing collection.

The review question is not "is there a loop inside a loop?" That catches only the obvious case. The stronger question is "does this path look at the same growing data from the beginning again for each item?"

<!-- mustflow-section: use-when -->
## Use When

- Code is created, changed, reviewed, or reported and the risk is repeated `map`, `filter`, `find`, `some`, `includes`, `indexOf`, membership checks, list joins, group building, tree building, graph traversal, duplicate removal, overlap checks, sorting, cloning, string building, JSON comparison, ORM lazy loading, GraphQL resolver loading, or render-time lookup.
- A list, table, tree, graph, event log, permission list, tag list, relation list, selected item list, likes/bookmarks/read state, orders, comments, posts, users, rows, files, or queue messages can grow without a small hard cap.
- A helper called inside a loop or render path has a harmless name such as `isValid`, `getStatus`, `hasPermission`, `getCount`, `findOwner`, `renderRow`, or `resolveField` but may scan a full collection internally.
- A review or final report claims that an O(N^2)-looking path is fine because the current fixture is small, the code is functional, the list is sorted, the helper is simple, or the data is "only a few items."

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is broader performance triage across I/O, locks, queues, retries, payloads, clients, caches, and observability; use `hot-path-performance-review`.
- The task is a measured performance budget, benchmark, profiling, latency, throughput, or p95/p99 optimization project; use `performance-budget-check`.
- The task only changes resource cleanup, retained references, or memory lifetime without repeated-scan complexity; use `memory-lifetime-review`.
- The only concern is a fixed-size lookup over a small, documented, hard-capped configuration list where the cap is enforced or clearly external to user data.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Outer work: the loop, mapper, reducer, render, resolver, batch, import, export, queue consumer, tree builder, graph traversal, or helper call site that repeats.
- Inner work: the scan, membership check, lookup, sort, clone, string copy, JSON serialization, DB query, resolver call, or helper body run for each item.
- Data shape: which collections grow, whether they are user-generated or fixed configuration, maximum known size, duplicate behavior, order requirements, and key fields.
- Join or membership key: ID, composite key, normalized key, parent ID, foreign key, timestamp bucket, interval boundary, permission key, tag key, or object identity.
- Current semantic contract: order, duplicates, first or last winner, stable tie-breakers, missing records, authorization filtering, stale data, and partial failure.
- Evidence level: static review, fixture size, configured test, benchmark, profiler, query count, resolver count, render count, or missing measurement.
- Relevant command-intent contract entries for build, tests, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available, or missing inputs can be reported without guessing.
- If the fix changes database query shape, indexes, pagination, or transaction behavior, also use the matching database skill.
- If the pattern appears in UI rendering or derived state, also use the matching UI or framework skill when UI behavior changes.
- If resolver, queue, cache, or backend operational behavior changes, also use `backend-reliability-change`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Replace repeated scans with `Set`, `Map`, lookup tables, grouping maps, parent-to-children maps, composite keys, sorted merge, single-pass aggregation, or database-side joins when semantics match.
- Move repeated lookup preparation out of loops, render functions, resolvers, and per-item helpers into a bounded pre-indexing step.
- Add small tests or fixtures that preserve order, duplicate handling, first or last winner behavior, missing IDs, and composite-key behavior when changing lookup structure.
- Add bounded static-review notes or complexity comments only when the code would otherwise look misleading.
- Do not add caches when an index built from already-loaded data is enough.
- Do not replace arrays with maps or sets when duplicates, order, stable tie-breakers, or small hard-capped lists make the array behavior intentional.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the repeated path and multiply call count by inner scan length. Review the product `outer_count * inner_count`, not the apparent number of loops.
2. Search for the obvious collection-combinator shapes: `map` plus `filter`, `map` plus `find`, `forEach` plus `includes`, `filter` plus `indexOf`, `reduce` plus spread, and chained `filter().map().sort()` inside a repeated path.
3. Search for membership checks over arrays. `includes`, `indexOf`, `contains`, `find`, `some`, and list membership inside a loop usually want `Set.has` or `Map.has` unless the searched list is tiny and hard-capped.
4. Search for code joins by ID. `posts.map(post => users.find(...))`, `users.map(user => orders.filter(...))`, permission lookups, likes, bookmarks, read state, tags, and relation lists usually need a `Map` or grouped `Map` keyed by ID or composite key.
5. Check duplicate removal. `filter((x, i) => arr.indexOf(x) === i)` is O(N^2). Prefer `Set` for scalar values and `Map` keyed by stable identity for objects.
6. Check sorted arrays. Sorting does not make `find` fast. If code repeatedly searches a sorted array, use a prebuilt map, binary search with a proven comparator, or a single sorted merge.
7. Check repeated sorting. Sorting inside a per-item loop is usually worse than scanning once, keeping a top candidate, using a heap, or sorting once before the loop.
8. Check copy-accumulation patterns. `reduce` with `[...acc, item]`, repeated object spread over a growing object, repeated string `+=`, and repeated concatenation can become quadratic copy work. Prefer push, builders, buffers, or one final copy at the boundary.
9. Check JSON and serialization comparisons. Repeated `JSON.stringify` inside search, equality, sort, dedupe, or render logic multiplies object size by item count. Use explicit keys and precomputed normalized keys.
10. Open helper bodies called from loops or render paths. Harmless helper names can hide full-list scans, database calls, resolver calls, serialization, sorting, or permission checks.
11. Check ORM and lazy relations. A single visible loop can become one query per entity. Replace per-entity relation access with eager loading, joins, `WHERE id IN (...)`, batch loading, or DataLoader-style batching.
12. Check GraphQL and nested resolvers. Parent-list resolvers plus per-field DB or API calls create hidden pairwise fan-out. Batch by parent IDs and preserve field-level authorization semantics.
13. Check render-time lookup. `rows.map(row => columns.find(...))`, `items.map(item => selectedIds.includes(item.id))`, derived data recomputed on every render, and per-row helper scans should move to memoized sets or maps when inputs are large or stable.
14. Check all-data-in-app joins. Fetching `allUsers`, `allOrders`, or `allLogs` and joining in application arrays is often a database join without an index. Push join, filter, sort, and pagination to the data store when the data store owns the index and semantics allow it.
15. Check tree and graph construction. `nodes.map(node => nodes.filter(child => child.parentId === node.id))` should usually become `childrenByParentId` plus one assembly pass. `visited.includes(id)` in traversal should be a `Set`.
16. Check event-log and time-window scans. Repeatedly scanning all previous events per event should usually become grouping, sorting once, and one pointer or rolling aggregate per key.
17. Check interval overlap. All-pairs range checks are sometimes necessary, but overlap detection often only needs sorting by start and comparing adjacent or active intervals.
18. Check incremental updates. Adding one item should not recompute a full ranking, group map, unread count, cart total, or dashboard aggregate unless the collection is fixed and tiny.
19. Separate index from cache. A `Map` built from current input is an index. A cache stores results across calls or time. Use an index for repeated lookup over already-owned data before introducing cache invalidation.
20. Require a hard cap for "small list" exceptions. Countries, enum options, or fixed config lists may stay arrays if the cap is real. User data, logs, orders, comments, permissions, tags, events, and uploaded rows need scalable lookup.
21. Preserve behavior while changing shape. Before replacing scans with indexes, state how order, duplicates, first or last match, missing references, authorization filtering, and stable keys are preserved.
22. Add growth evidence when feasible. If configured tests or fixtures can scale input size, prefer a small growth test that compares behavior at larger counts. If benchmarking is not configured, report complexity-only evidence instead of a speedup claim.

<!-- mustflow-section: postconditions -->
## Postconditions

- Each suspected O(N^2) path has an outer count, inner count, and data-growth classification.
- Repeated membership checks, code joins, duplicate removal, tree building, resolver fan-out, render-time lookup, helper-hidden scans, repeated sort, copy accumulation, and JSON comparison are fixed or reported.
- Array-to-set or array-to-map changes preserve order, duplicates, missing records, first or last winner, authorization, and stable key behavior.
- Small-list exceptions have an explicit hard cap or are reported as residual risk.
- Performance claims are backed by configured evidence or labeled as static complexity risk.

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

Use the narrowest configured test, build, docs, release, or mustflow intent that covers the changed data shape. Do not infer raw benchmark, profiler, database, browser, load-test, or package-manager commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured test or build fails, preserve the failing intent and output tail, then fix the behavior contract that changed with the lookup structure.
- If duplicate or order semantics are unknown, do not replace a scan with a map or set until the missing semantic decision is reported.
- If an all-pairs comparison is actually required by the domain, report why the O(N^2) shape is intentional and whether input size is bounded.
- If measurement requires unconfigured benchmark, profiler, production trace, database, browser, or load-test access, report it as manual evidence instead of running raw commands.

<!-- mustflow-section: output-format -->
## Output Format

- Repeated path reviewed
- Outer count, inner count, and data-growth classification
- Hidden scan patterns found or ruled out
- Membership, join, dedupe, helper, ORM, resolver, render, tree, graph, event, interval, sort, copy, string, and JSON checks where relevant
- Index, grouping, sorted merge, database join, or intentional all-pairs decision
- Semantics preserved: order, duplicates, first or last winner, missing IDs, authorization, and stable keys
- Evidence level: configured test, static complexity risk, manual-only, missing, or not applicable
- Command intents run
- Skipped measurements and reasons
- Remaining quadratic-scan risk
