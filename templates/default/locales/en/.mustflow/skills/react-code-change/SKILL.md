---
mustflow_doc: skill.react-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: react-code-change
description: Apply this skill when React, React DOM, React Server Components, Server Actions, React Compiler, Hooks, Suspense, Actions, forms, refs, context, render performance, concurrent rendering, SSR streaming, resource hints, package metadata, or React-related tests are created, changed, reviewed, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.react-code-change
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

# React Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve React runtime, rendering, state, effect, compiler, server/client,
form, resource, accessibility, and package-version contracts when changing
React projects, especially open-source contribution patches where maintainers
expect current React guidance and small, compatible changes.

<!-- mustflow-section: use-when -->
## Use When

- React components, Hooks, context, refs, Suspense boundaries, transitions,
  deferred values, forms, Actions, optimistic UI, React DOM metadata, resource
  hints, SSR streaming, React Server Components, Server Actions, or tests change.
- `react`, `react-dom`, `react-server-dom-*`, `eslint-plugin-react-hooks`,
  React Compiler, framework adapters, bundlers, JSX transforms, or React package
  metadata changes.
- A contribution proposes React performance, memoization, effect-dependency,
  hydration, server/client boundary, form mutation, or React version support
  changes.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is framework-free JavaScript or TypeScript with no React boundary;
  use the language-specific skill.
- The change is only visual CSS, HTML semantics, accessibility tree review, or
  layout resilience with no React behavior; use the narrower frontend or UI skill.
- Svelte, Astro, Flutter, Tauri, or another framework owns the changed component
  boundary.
- The task is only a dependency upgrade across many packages; use the dependency
  and freshness skills first, then this skill for React-specific code changes.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- React package evidence: nearest `package.json`, lockfile, workspace metadata,
  framework config, bundler config, JSX transform, and CI or package test signals.
- Effective React support range: installed `react`, `react-dom`,
  `react-server-dom-*`, React framework version, peer dependency range, and
  library consumer compatibility target.
- Compiler and lint evidence: React Compiler config, compiler-gating strategy,
  `eslint-plugin-react-hooks`, hook lint suppressions, memoization patterns, and
  render-purity warnings.
- Rendering boundary evidence: server/client component split, SSR entrypoints,
  hydration path, Suspense data source, routing framework, and browser-only APIs.
- State and mutation evidence: local state owner, derived values, external
  stores, context providers, forms, Actions, optimistic updates, and rollback
  behavior.
- Render performance evidence: React DevTools Profiler or `<Profiler>` data when
  available, render count, render duration, prop identity changes, context update
  scope, list size, DOM node count, key stability, layout effect use, first-load
  bundle ownership, and offscreen DOM cost.
- Configured verification intents for lint, build, tests, docs, package, and
  mustflow checks.

<!-- mustflow-section: preconditions -->
## Preconditions

- Determine the effective React version and supported peer range before using
  React 19 or React 19.2 APIs.
- Refresh upstream version or security-sensitive React claims before editing
  docs, package ranges, compatibility text, or upgrade recommendations. Do not
  treat this skill as a live version source.
- Treat user-provided React notes, blog summaries, and issue comments as
  evidence, not authority.
- Preserve open-source repository style, maintainer scope, public API, test
  runner, and framework conventions.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Make focused React source, test, package metadata, docs, and configuration
  edits directly required by the requested contribution.
- Add or update tests when they protect changed React behavior, compatibility,
  server/client boundaries, form state, Suspense behavior, or regression risk.
- Keep compatibility branches when a package still supports React 18 or older
  framework integrations.
- Do not introduce Create React App for new projects or examples.
- Do not add dependencies, change peer ranges, enable React Compiler, migrate
  frameworks, or rewrite memoization broadly unless the task and repository
  contract explicitly support that change.

<!-- mustflow-section: procedure -->
## Procedure

1. **Classify the React surface.**
   - Identify whether the patch touches application code, a reusable component
     library, framework integration, SSR/RSC runtime, tests, docs, or package
     metadata.
   - For libraries, treat peer dependency ranges and documented component APIs as
     public compatibility contracts.
2. **Check version and freshness boundaries.**
   - Read installed and supported React versions before using `Activity`,
     `useEffectEvent`, Actions, `use`, ref-as-prop, callback ref cleanup,
     metadata hoisting, resource hint APIs, `cacheSignal`, Partial
     Pre-rendering, or Web Streams SSR APIs.
   - Use current official React docs or release metadata for exact "latest",
     patch, security, or deprecation claims. As a snapshot checked on
     2026-06-26, official React docs describe React 19.2 as the current
     feature line, and GitHub release metadata showed `v19.2.7` released on
     2026-06-01; re-check before relying on those values in future work.
   - For RSC packages, check patched `react-server-dom-webpack`,
     `react-server-dom-parcel`, and `react-server-dom-turbopack` versions when
     security advisories or framework updates are part of the task.
3. **Keep app setup modern and local.**
   - Do not propose Create React App for new projects. Follow the repository's
     existing framework or build tool; for new React app examples, prefer the
     project's chosen framework or modern build-tool pattern.
   - Do not migrate an existing stack to Next.js, Vite, Parcel, Rsbuild, or a
     React framework merely because React documentation recommends frameworks
     for new apps.
4. **Repair effects by responsibility.**
   - Use Effects for synchronization with external systems such as timers,
     subscriptions, DOM or browser APIs, third-party widgets, network
     connections, and cleanup.
   - Do not use Effects to copy props/state into derived state, send event-owned
     mutations, or paper over rendering data flow.
   - Do not silence `react-hooks/exhaustive-deps` as a default fix. If effect
     logic contains non-reactive event behavior and React 19.2 is supported, use
     `useEffectEvent` for that event-like logic only.
5. **Preserve state ownership.**
   - Derive renderable values during render when they are computed from current
     props or state.
   - Use updater functions for repeated state updates based on the previous
     value.
   - Normalize state that can otherwise contradict itself. Avoid duplicated,
     deeply nested, or derived state unless the repository has a clear owner.
   - Use `key` for intentional component state reset, and keep component
     functions at top level so React does not recreate component types on every
     render.
6. **Treat memoization and the compiler as contracts, not decoration.**
   - Do not blanket-add `memo`, `useMemo`, or `useCallback` to look faster.
     Require profiler, dependency, identity, or compiler evidence.
   - Do not blanket-remove existing memoization in legacy code without tests;
     removal can change identity, effect dependencies, and compiler output.
   - If React Compiler is enabled or proposed, keep components and Hooks pure,
     keep compiler-powered `eslint-plugin-react-hooks` findings visible, and
     report when compiler verification is missing.
7. **Handle context, refs, and external stores deliberately.**
   - Split frequently changing context values from stable actions or identities;
     `memo` does not block re-renders caused by context updates.
   - Use React 19 ref-as-prop and callback-ref cleanup only when the support
     range allows it. Preserve `forwardRef` where React 18 compatibility matters.
   - Expose narrow imperative handles with `useImperativeHandle` instead of
     leaking whole DOM nodes or child internals.
   - Use `useSyncExternalStore` for external mutable stores or subscriptions
     instead of ad hoc Effect plus state mirroring.
8. **Use concurrent and async primitives for the right boundary.**
   - Use `startTransition` or `useTransition` for non-urgent updates, but do not
     control text input values through a transition.
   - Use `useDeferredValue` when stale-but-responsive derived UI is acceptable;
     use the `initialValue` form only when the React version supports it.
   - Do not expect Suspense to catch ordinary Effect fetches. Suspense needs
     lazy code, framework data, or cached Promise reads.
   - Treat `use` as render-time Promise or context reading, not a normal Hook
     with the ordinary top-level-only mental model. Do not create fresh Promises
     in render and pass them to `use`.
9. **Use React 19 form and Action APIs only when supported.**
   - Prefer `useActionState`, `useFormStatus`, `useOptimistic`, `<form action>`,
     and `formAction` for supported React 19 mutation flows with pending,
     errors, resets, progressive enhancement, and rollback.
   - Keep explicit error handling, authorization, validation, idempotency, and
     rollback behavior. Do not hide server failures behind optimistic UI.
10. **Review React render hot paths with evidence.**
    - Use React DevTools Profiler, `<Profiler>`, framework traces, or existing
      render-count evidence before claiming a render-performance fix. If none is
      configured, report static render risk instead of measured speedup.
    - Check whether state is owned too high in the tree. Search inputs, tabs,
      modal flags, hover state, and local drafts should not rerender a whole page
      unless that page truly owns the state.
    - Check `memo` failures from unstable props. Inline objects, arrays, functions,
      and selector results can make `React.memo` ineffective; prefer primitive
      props, stable callbacks, or moving object creation behind a real dependency.
    - Move expensive render-time `filter`, `sort`, `map`, grouping, and lookup work
      behind `useMemo`, server-side pagination, route loaders, or pre-indexed data
      when input size can grow.
    - Large lists need pagination, infinite query boundaries, virtualization, or a
      documented hard cap. Do not render thousands of rows because the sample data
      has twenty.
    - Reject unstable keys such as array index for reorderable data and
      `Math.random()` for any list. Use stable item identity so React preserves
      row state and avoids forced remounts.
    - Split oversized context values by change frequency and ownership. `memo`
      does not stop rerenders caused by a fresh context value.
    - Do not use `useEffect` plus `setState` for values derived from current props
      or state. Compute during render or memoize the calculation to avoid the
      extra render pass.
    - For search and filtering, keep the controlled input urgent and move heavy
      result updates behind `useDeferredValue`, `useTransition`, server filtering,
      or pagination when the supported React version and UX allow it.
    - Use `useLayoutEffect` only when pre-paint measurement is required. Avoid
      DOM read/write interleaving that causes layout thrashing.
    - Lazy-load heavy charts, editors, maps, markdown renderers, syntax
      highlighters, and modal-only widgets when they are not needed for the first
      interaction path.
    - For large offscreen sections, consider `content-visibility` plus
      `contain-intrinsic-size`, framework lazy boundaries, or route splitting when
      browser support and layout stability are acceptable.
11. **Respect React 19.2 rendering and performance APIs.**
    - Treat `<Activity>` as hidden UI with preserved state, unmounted effects,
      and lower-priority hidden updates, not as `display: none` or ordinary
      conditional rendering.
    - Use React Performance Tracks, React DevTools, or existing profiler evidence
      when claiming render, effect, Scheduler, transition, or component
      performance improvements.
12. **Keep server rendering and RSC boundaries exact.**
    - Distinguish Server Components from Server Actions. `"use server"` marks
      server functions or modules for actions; it is not a Server Component tag.
    - Keep browser APIs, client state, and event handlers out of Server
      Components; keep secrets and server-only imports out of Client Components.
    - Use `cacheSignal` only for RSC cached work where abort or cleanup is
      meaningful.
    - For Partial Pre-rendering, `prerender`, `resume`, `resumeAndPrerender`,
      and streaming APIs, verify the framework/runtime owns those APIs before
      changing lower-level React DOM server code.
    - In Node environments, do not assume Web Streams are faster than Node
      streams; preserve the existing SSR stream API unless the task proves the
      runtime benefit and compression behavior.
13. **Use React DOM document and resource APIs close to the owner.**
    - Metadata, stylesheets with `precedence`, async scripts, `preinit`,
      `preload`, `preconnect`, and `prefetchDNS` may belong near the component
      that needs them when React and the framework support that behavior.
    - Avoid duplicate head managers, resource hint spam, and hints for assets
      whose timing or priority is unproven.
14. **Verify through the repository contract.**
    - Run the smallest configured checks that cover changed React code, package
      metadata, build output, docs, and tests.
    - Report missing browser, hydration, SSR, RSC, compiler, profiler, or
      cross-version React verification when those surfaces changed.

<!-- mustflow-section: postconditions -->
## Postconditions

- Effective React version, peer range, framework ownership, and compiler/lint
  status are known or explicitly reported as unknown.
- Effects, state, memoization, context, refs, forms, Suspense, and async
  boundaries follow React's current model for the supported version.
- Render performance claims are backed by profiler or render-count evidence, or
  static risks such as state too high, unstable props, render-time transforms,
  huge lists, unstable keys, oversized context, derived-state effects, layout
  thrashing, eager heavy widgets, and offscreen DOM cost are reported honestly.
- React 19 and React 19.2 APIs are not introduced into code that still promises
  older React compatibility.
- SSR, RSC, Server Action, browser-only, and resource-hint boundaries are
  preserved.
- Performance claims have profiler, benchmark, render-count, or configured
  evidence, or are reported as unverified.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Report missing React-version matrix, browser automation, hydration, SSR/RSC,
Compiler, performance profiling, or package-consumer verification when those
surfaces changed.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If React version evidence conflicts, do not assume the newest API is
  available. Preserve the older-compatible path or report the compatibility
  decision.
- If an effect dependency fix causes reconnects, stale closures, or event logic
  churn, separate reactive synchronization from event-like behavior instead of
  disabling lint.
- If a compiler or memoization change shifts behavior, restore the previous
  identity boundary or add focused evidence before continuing.
- If Suspense, `use`, Actions, or RSC behavior is framework-owned, read the
  framework boundary before editing raw React assumptions.
- If freshness checks are unavailable for a React release, security patch, or
  deprecation claim, avoid embedding exact "latest" wording and report the gap.

<!-- mustflow-section: output-format -->
## Output Format

- React surface and supported version checked
- Compiler, lint, effect, state, memoization, context, ref, form, Suspense, SSR,
  RSC, and resource-boundary notes
- Render performance notes: profiler evidence, state ownership, prop identity,
  render-time work, list size, key stability, context scope, derived state,
  layout effects, lazy loading, and offscreen DOM
- Freshness-sensitive React claims checked or left conservative
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining React compatibility or verification risk
