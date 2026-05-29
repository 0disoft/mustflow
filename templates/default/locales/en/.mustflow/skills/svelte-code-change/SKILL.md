---
mustflow_doc: skill.svelte-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: svelte-code-change
description: Apply this skill when Svelte or SvelteKit components, routes, load functions, server actions, endpoints, stores, context, runes, SSR boundaries, server-only imports, accessibility warnings, or tests are created or changed.
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

Preserve Svelte component reactivity, SvelteKit SSR/server/client boundaries, data secrecy, load/action/endpoint contracts, request-scoped state ownership, accessibility, and generated route behavior. Choose files by data boundary first, not by filename habit.

<!-- mustflow-section: use-when -->
## Use When

- `.svelte`, `+page`, `+layout`, `+page.server`, `+layout.server`, `+server`, load functions, form actions, endpoints, stores, context, runes, `$app` imports, `$lib/server`, hooks, route params, or Svelte tests change.
- The task touches state management, SSR errors, browser APIs, forms, routing, progressive enhancement, request-local data, server-only imports, private/public environment variables, or Svelte 5 runes.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is plain CSS or HTML with no Svelte or SvelteKit behavior; use the relevant UI foundation skill.
- The service code is framework-free and no Svelte boundary changes.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Package metadata, Svelte config, Vite config, TypeScript config, route segment files, hooks, app types, stores/runes/context, form schema, and tests.
- Svelte version, route data source, secrecy, request scope, mutation type, serialization requirement, SSR/client boundary, browser dependency, and state owner.
- Imports from `$lib/server`, `*.server.*`, `$env/static/private`, `$env/dynamic/private`, DB/filesystem/server SDK modules, cookies, auth headers, and `event.locals`.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- For route work, read the sibling `+layout`, `+page`, `+page.server`, and `+server` files as one boundary.
- Classify every data access by origin, secrecy, request scope, mutation, browser dependency, and serialization before choosing a SvelteKit file.
- Treat all route files as potentially server-executed until proven otherwise.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep secrets, private environment, database clients, and cookie-authenticated data in server-only files.
- Use browser APIs only behind client-safe lifecycle or environment guards.
- Keep state local unless shared ownership is justified.
- Preserve form actions and progressive enhancement instead of replacing all forms with client-only fetch.
- Use context for request-scoped component-tree sharing instead of module singletons.
- Use `$derived` for computed display values and `$effect` only for browser-side effects and cleanup.

<!-- mustflow-section: procedure -->
## Procedure

1. Read route segment files, parent layouts, stores/runes/context, hooks, app types, and tests.
2. Identify Svelte version and whether the code uses runes or legacy reactivity.
3. Before choosing a file, classify every data access with: origin, secrecy, request scope, mutation, browser dependency, and serialization.
4. If data requires DB, filesystem, private env, cookies, auth headers, `event.locals`, server SDKs, or request-local identity, keep it in server-only code: `+page.server`, `+layout.server`, `+server`, `hooks.server`, or `$lib/server`.
5. If data is public and can be safely fetched by the browser without secrets, universal load is allowed.
6. If the operation is a page form mutation, prefer `+page.server` actions over a custom JSON endpoint.
7. If the operation is a public HTTP API, webhook, mobile API, stream, file response, or non-page endpoint, use `+server`.
8. If the value is UI-only state such as modal open, selected tab, draft input, accordion state, hover state, or local editing state, keep it in component `$state` or local context.
9. If a value is computed from reactive inputs, use `$derived`. Do not use `$effect` to copy or synchronize derived state.
10. Use `$effect`, lifecycle hooks, event handlers, actions, or dynamic imports for browser-only APIs and browser-only libraries. Do not touch `window`, `document`, `localStorage`, `matchMedia`, canvas, or browser-only imports in SSR top-level code.
11. Keep request-specific user/session/auth state out of module-level mutable variables, global stores, exported `$state`, and load/action side effects.
12. Do not write to stores from load functions.
13. Keep server load return values intentionally serializable and minimal. Do not pass secrets, raw sessions, tokens, hidden DB fields, or whole service responses to the browser.
14. Prefer `$app/state` over legacy `$app/stores` in SvelteKit projects that use the newer SvelteKit state API.
15. Do not hide SSR errors by disabling SSR unless the user explicitly accepts that product and architecture change.
16. Treat accessibility compiler warnings as real findings unless a local false-positive reason is documented.

<!-- mustflow-section: data-boundary-policy -->
## Data Boundary Policy

- Public route params and public query values may live in universal load until they drive private DB/API access.
- Public external APIs and public CMS data may live in universal load only when the browser may call them directly without secrets.
- DB, filesystem, private env, server SDKs, cookies, auth headers, sessions, and `event.locals` belong in server-only files.
- User-specific data must be read server-side and narrowed before being serialized into `data`.
- Page forms should use form actions by default.
- External clients, webhooks, mobile apps, streaming responses, and custom HTTP responses belong in `+server`.
- Browser-only values belong in component effects, event handlers, dynamic imports, or browser actions.

<!-- mustflow-section: route-boundary-policy -->
## Route Boundary Policy

- `+page.ts` and `+layout.ts` are universal. They may run on the server and in the browser.
- `+page.server.ts` and `+layout.server.ts` are for server-only page data.
- `+page.server.ts` actions are for page-owned form mutations.
- `+server.ts` is for HTTP endpoints, webhooks, non-page APIs, streams, files, and custom responses.
- Do not create a JSON endpoint for a normal page form unless there is a non-page consumer.
- Do not wrap server-only imports in browser guards. Fix the import graph.

<!-- mustflow-section: runes-state-policy -->
## Runes And State Policy

- Use `$state` for local interactive UI state.
- Use `$derived` for calculations from props, route data, page state, or local state.
- Use `$effect` only for browser-side effects, subscriptions, DOM, canvas, analytics, third-party browser libraries, and cleanup.
- Use stores for external streams or manual subscribe/unsubscribe interop, not ordinary component state.
- Use context for parent-owned values shared down the component tree, especially request-scoped layout data.
- Do not reassign reactive context objects after placing them in context; update their properties or pass getter functions when needed.

<!-- mustflow-section: ssr-debug-policy -->
## SSR Debug Policy

When SSR breaks, inspect in this order:

1. Private env imports.
2. `$lib/server`, `*.server.*`, DB, filesystem, admin SDK, or server-only import chains.
3. Request-local state stored in module singletons, stores, or exported `$state`.
4. Browser API access at module top-level or during SSR render.
5. Hydration mismatch from time, randomness, locale, timezone, localStorage, or browser-only initial state.
6. Route-level SSR disabling only after the product accepts an SPA-like shell.

<!-- mustflow-section: hard-bans -->
## Hard Bans

- Do not add route-level SSR disabling to fix `window is not defined`.
- Do not move required first-render page data into lifecycle hooks or `$effect`.
- Do not import `$lib/server`, `*.server.*`, private env modules, DB clients, filesystem, or admin SDKs from universal/client route files or shared client utilities.
- Do not mutate module-scope variables, global stores, or exported `$state` with user/session/request data during SSR, load, or actions.
- Do not use `$effect` to compute derived values.
- Do not put browser-only library imports at top level when the package touches browser globals during import.
- Do not serialize secrets, raw sessions, access tokens, hidden DB fields, or whole service responses through load data.

<!-- mustflow-section: postconditions -->
## Postconditions

- Server/client and SSR boundaries are explicit.
- State owner and derived/effect behavior are clear.
- Forms remain progressive unless intentionally changed.
- Private data stays server-only and serialized data is intentionally minimal.
- Request-scoped sharing uses load data, props, or context instead of module singletons.
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

Report missing Svelte check, SSR render, form action, or browser verification intents when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a browser API breaks SSR, move it to a client-safe boundary instead of disabling SSR by default.
- If data source ownership is unclear, inspect route server files and hooks before editing.
- If accessibility warnings require an ignore, include the specific reason in the code or report.
- If server-only imports leak into universal/client files, move the boundary instead of adding runtime guards.
- If request-local data is stored globally, move it to server load, actions, context, or persistent storage with user scoping.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- SSR/server/client and state notes
- Form/action/accessibility impact
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Svelte risk
