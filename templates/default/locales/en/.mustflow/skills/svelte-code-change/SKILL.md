---
mustflow_doc: skill.svelte-code-change
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: svelte-code-change
description: Apply this skill when Svelte or SvelteKit components, routes, universal or server load functions, form actions, endpoints, hooks, stores, context, runes, props, snippets, bindings, SSR, hydration, streaming, preload, invalidation, server-only imports, env boundaries, adapters, Vite, TypeScript, packaging, accessibility warnings, or tests are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.svelte-code-change
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - mustflow_check
---

# Svelte Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Svelte component reactivity, SvelteKit SSR/server/client execution modes, data secrecy, load/action/endpoint contracts, request-scoped state ownership, hydration, streaming, invalidation, adapter output, accessibility, and generated route behavior. Choose files by data boundary and execution mode first, not by filename habit.

<!-- mustflow-section: use-when -->
## Use When

- `.svelte`, `.svelte.ts`, `.svelte.js`, `+page`, `+layout`, `+page.server`, `+layout.server`, `+server`, load functions, form actions, endpoints, stores, context, snippets, bindings, runes, `$app` imports, `$lib/server`, hooks, route params, route matchers, or Svelte tests change.
- The task touches state management, SSR errors, hydration warnings, browser APIs, forms, routing, progressive enhancement, preload, invalidation, request-local data, server-only imports, private/public environment variables, adapters, Vite, TypeScript, package exports, or Svelte 5 runes.
- The task upgrades, reviews, or writes docs about Svelte, SvelteKit, Vite, `@sveltejs/vite-plugin-svelte`, `svelte-check`, an adapter, `@sveltejs/package`, or generated Svelte library output.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is plain CSS or HTML with no Svelte or SvelteKit behavior; use the relevant UI foundation skill.
- The service code is framework-free and no Svelte boundary changes.
- The task only updates external framework version prose; use `source-freshness-check` unless the Svelte procedure itself changes.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Package metadata, Svelte config, Vite config, TypeScript config, route segment files, hooks, app types, stores/runes/context, form schema, adapter config, package export metadata, and tests.
- Svelte and SvelteKit version tracks, feature stability status, route data source, secrecy, request scope, mutation type, serialization requirement, SSR/client boundary, browser dependency, state owner, and adapter target.
- Imports from `$lib/server`, `*.server.*`, `$env/static/private`, `$env/dynamic/private`, DB/filesystem/server SDK modules, cookies, auth headers, `event.locals`, `$app/state`, `$app/navigation`, `$app/forms`, and browser-only libraries.
- Official or repository-local source evidence before preserving exact latest-version, release-date, Node/Vite requirement, adapter behavior, or compiler behavior claims.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- For route work, read sibling and parent `+layout`, `+layout.server`, `+page`, `+page.server`, `+server`, hooks, app types, and route matcher files as one boundary.
- Classify every data access by origin, secrecy, request scope, mutation, browser dependency, serialization, invalidation dependency, and adapter support before choosing a SvelteKit file.
- Treat universal route files as server-executed and browser-executed until proven otherwise.
- Refresh official package or vendor sources before preserving exact "latest", Node/Vite minimum, adapter, or release-note claims; otherwise keep those facts out of durable skill text or mark them as snapshot-only in the report.
- Classify version-sensitive features as stable, experimental, deprecated, removed, or prerelease before recommending them. Presence in current official docs does not by itself prove stable support.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep secrets, private environment, database clients, server SDKs, cookie-authenticated data, and request identity in server-only files.
- Use browser APIs only behind client-safe lifecycle, dynamic import, event, action, or environment boundaries.
- Keep state local unless shared ownership is justified.
- Preserve form actions and progressive enhancement instead of replacing page forms with client-only fetch.
- Use context for request-scoped component-tree sharing instead of module singletons.
- Use `$derived` for computed display values and `$effect` only for browser-side effects, subscriptions, DOM, timers, observers, third-party browser libraries, and cleanup.
- Keep SvelteKit, Vite, TypeScript, adapter, `svelte-check`, and package export surfaces synchronized when toolchain behavior changes.

<!-- mustflow-section: procedure -->
## Procedure

1. Read route segment files, parent layouts, route matchers, stores/runes/context, hooks, app types, Svelte/Vite/TypeScript config, adapter config, package metadata, and tests.
2. Identify Svelte and SvelteKit version tracks and whether the code uses runes, legacy reactivity, or mixed migration mode.
3. Before choosing a file, classify every data access with: origin, secrecy, request scope, mutation, browser dependency, serialization, dependency tracking, invalidation trigger, and adapter support.
4. Keep DB, filesystem, private env, cookies, auth headers, `event.locals`, server SDKs, and request-local identity in server-only code: `+page.server`, `+layout.server`, `+server`, `hooks.server`, `$lib/server`, or `*.server.*`.
5. Treat `+page.ts` and `+layout.ts` as universal. They may run during SSR and later in the browser; do not import browser-only packages, private env, DB clients, or server modules there.
6. If `+page.server` and universal `+page` or `+layout` coexist, check that server-load data is intentionally passed through the universal `load` return value when the page component needs it.
7. Keep `load` side-effect-free. Do not increment counters, mark reads, mutate stores, write analytics, or change module state from `load`; preload and navigation can run it before the user commits.
8. Avoid `await parent()` waterfalls. Start independent fetches before awaiting parent data, and keep auth checks in `hooks.server` or route-specific server load when child data must not execute first.
9. Use SvelteKit-provided `fetch` inside load when dependency tracking, SSR response inlining, and hydration reuse matter. For custom clients, register `depends(...)` keys and invalidate the exact URL or dependency key.
10. Use page form actions for page-owned mutations. Preserve `fail(...)`, `redirect(303, ...)`, `use:enhance`, `update()`, `applyAction()`, focus reset, and invalidation behavior when enhancing forms.
11. Use `+server` for public HTTP APIs, webhooks, mobile APIs, streams, file responses, and custom response contracts. Do not create a JSON endpoint for a normal page form unless there is a non-page consumer.
12. For streaming load data, finish auth, redirects, and headers before streaming starts. Handle promise rejections, check adapter and proxy buffering, and stream only data whose late failure does not change page policy.
13. Preserve hydration markers and valid HTML structure. Do not use HTML minifiers, CDN rewrites, or edge transforms that remove Svelte hydration comments without verifying hydration.
14. If navigation reuses page or layout components, make route-dependent values `$derived` from `data`, `$app/state`, or URL state; use `{#key ...}` only when a real remount boundary is intended.
15. Put SSR-affecting filters, search, pagination, sorting, and shareable state in URL search params. Keep temporary UI state local or snapshot-like.
16. Use `$state` only for state that should update UI, `$derived`, or `$effect`. Keep large immutable payloads, table rows, CMS payloads, parser outputs, and third-party data as plain values or `$state.raw` with reassignment.
17. Do not destructure `$state` or proxy objects when live reactivity is required. Read fields at the use site or derive a narrow value.
18. Use `SvelteMap`, `SvelteSet`, `SvelteDate`, `SvelteURL`, or reassignment patterns when reactive special objects are required; do not expect ordinary `Map`, `Set`, `Date`, `URL`, or class internals to be deeply tracked.
19. Use `$derived` or `$derived.by` for filtering, sorting, totals, validation results, labels, and view models. Do not use `$effect` to copy or synchronize derived state.
20. Keep `$effect` dependencies narrow and synchronous. Read dependencies before `await`, `setTimeout`, or callbacks; use `untrack` for incidental logging, snapshots, or non-dependency reads.
21. Return cleanup from effects that create subscriptions, intervals, observers, sockets, editors, charts, canvas loops, or external library instances.
22. Treat props as parent-owned. Use callback props for changes and `$bindable` only for narrow form-control-like two-way APIs. Preserve wrapper binding chains or convert them to explicit callbacks.
23. In Svelte 5, treat DOM event handlers as props. When spreading rest props through wrappers, intentionally compose external handlers with internal policy instead of relying on spread order.
24. Treat snippets as typed render callbacks. Require optional snippet guards, pass row or slot-like data as parameters, and avoid hidden parent-state capture in reusable library components.
25. In the official-source snapshot checked on 2026-07-11, SvelteKit remote functions were
    experimental. Refresh the installed track's current official status before every adoption; if
    it remains experimental, do not replace stable `load`, form action, or endpoint contracts
    merely because remote functions appear in the docs. When a project opts in, verify every opt-in
    documented for the installed Svelte and SvelteKit tracks, including any separate compiler
    opt-in required by the syntax actually used, plus `.remote.*` placement, server-only
    execution, generated endpoint behavior, prerender constraints, cache and invalidation
    semantics, and rollback to stable primitives.
26. Check SvelteKit, Vite, TypeScript, adapter, and package output as one toolchain boundary. Do not edit generated `.svelte-kit/tsconfig.json`; fix `svelte.config`, `kit.alias`, package exports, `types`, `svelte` conditions, `files`, and CSS side effects at their source.

<!-- mustflow-section: data-boundary-policy -->
## Data Boundary Policy

- Public route params and public query values may live in universal load until they drive private DB/API access.
- Public external APIs and public CMS data may live in universal load only when the browser may call them directly without secrets.
- DB, filesystem, private env, server SDKs, cookies, auth headers, sessions, and `event.locals` belong in server-only files.
- User-specific data must be read server-side and narrowed before being serialized into `data`.
- Server load return values must be intentionally serializable and minimal.
- Page forms should use form actions by default.
- External clients, webhooks, mobile apps, streaming responses, and custom HTTP responses belong in `+server`.
- Browser-only values belong in component effects, event handlers, dynamic imports, or browser actions.

<!-- mustflow-section: route-boundary-policy -->
## Route Boundary Policy

- `+page.ts` and `+layout.ts` are universal. They may run on the server and in the browser.
- `+page.server.ts` and `+layout.server.ts` are for server-only page data.
- `+page.server.ts` actions are for page-owned form mutations.
- `+server.ts` is for HTTP endpoints, webhooks, non-page APIs, streams, files, and custom responses.
- Route matchers, optional params, rest params, and route groups are public URL and layout/auth behavior, not only folder naming.
- Do not create a JSON endpoint for a normal page form unless there is a non-page consumer.
- Do not wrap server-only imports in browser guards. Fix the import graph.

<!-- mustflow-section: runes-state-policy -->
## Runes And State Policy

- Use `$state` for owned interactive UI state.
- Use `$state.raw` only when reassignment, not internal mutation, is the update model.
- Use `$state.snapshot` before sending proxy state to serializers, workers, chart libraries, equality tools, or external APIs that should see plain data.
- Use `$derived` for calculations from props, route data, page state, URL state, or local state.
- Use `$effect` only for browser-side effects, subscriptions, DOM, canvas, analytics, timers, third-party browser libraries, and cleanup.
- Use stores for external streams or manual subscribe/unsubscribe interop, not ordinary component state.
- Use context for parent-owned values shared down the component tree, especially request-scoped layout data.
- Do not reassign reactive context objects after placing them in context; update their properties or pass getter functions when needed.
- Use stable keys for changing lists. Do not use array indexes as keys when rows can reorder, insert, delete, transition, or own child state.

<!-- mustflow-section: ssr-debug-policy -->
## SSR Debug Policy

When SSR breaks, inspect in this order:

1. Private env imports.
2. `$lib/server`, `*.server.*`, DB, filesystem, admin SDK, or server-only import chains.
3. Request-local state stored in module singletons, stores, or exported `$state`.
4. Browser API access at module top-level or during SSR render.
5. Hydration mismatch from invalid HTML, removed comments, time, randomness, locale, timezone, localStorage, or browser-only initial state.
6. Route-level SSR disabling only after the product accepts an SPA-like shell.

<!-- mustflow-section: hard-bans -->
## Hard Bans

- Do not add route-level SSR disabling to fix `window is not defined`.
- Do not move required first-render page data into lifecycle hooks or `$effect`.
- Do not import `$lib/server`, `*.server.*`, private env modules, DB clients, filesystem, or admin SDKs from universal/client route files or shared client utilities.
- Do not mutate module-scope variables, global stores, or exported `$state` with user/session/request data during SSR, load, or actions.
- Do not use `$effect` to compute derived values or synchronize state mirrors.
- Do not put browser-only library imports at top level when the package touches browser globals during import.
- Do not serialize secrets, raw sessions, access tokens, hidden DB fields, or whole service responses through load data.
- Do not edit generated `.svelte-kit` files as source.

<!-- mustflow-section: postconditions -->
## Postconditions

- Server/client and SSR boundaries are explicit.
- Route, load, action, endpoint, invalidation, and streaming behavior are clear.
- Experimental remote-function usage is explicitly opted in, version-checked, and justified against stable load, action, and endpoint alternatives.
- State owner, derived/effect behavior, props ownership, snippets, and binding behavior are clear.
- Forms remain progressive unless intentionally changed.
- Private data stays server-only and serialized data is intentionally minimal.
- Request-scoped sharing uses load data, props, or context instead of module singletons.
- Adapter, Vite, TypeScript, and package output impacts are reported when touched.
- Accessibility warnings are resolved or justified.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing Svelte check, SSR render, hydration, form action, remote-function, browser, adapter, package, or preview-mode verification intents when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a browser API breaks SSR, move it to a client-safe boundary instead of disabling SSR by default.
- If data source ownership is unclear, inspect route server files and hooks before editing.
- If accessibility warnings require an ignore, include the specific reason in the code or report.
- If server-only imports leak into universal/client files, move the boundary instead of adding runtime guards.
- If request-local data is stored globally, move it to server load, actions, context, or persistent storage with user scoping.
- If exact framework, adapter, Vite, Node, or release claims cannot be refreshed from official sources, omit them from durable skill text and report them as unverified snapshot context.
- If remote functions or another experimental feature are proposed without current official stability evidence and explicit project opt-in, keep the stable load, action, or endpoint path and report the experiment as deferred.
- If streaming, hydration, adapter output, package exports, or preview-mode behavior cannot be verified by configured intents, report the missing runtime smoke coverage.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- SSR/server/client, route, load, action, remote-function, invalidation, and streaming notes
- Runes, state, props, snippet, binding, and accessibility notes
- Adapter, Vite, TypeScript, and package-output notes when touched
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Svelte risk
