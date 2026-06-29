---
mustflow_doc: skill.vue-code-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: vue-code-change
description: Apply this skill when Vue, Nuxt, Pinia, Vue Router, Vue SFCs, Composition API, reactivity, props, emits, slots, v-model, SSR, hydration, lazy hydration, Vite/Vue toolchain, or Vue-related tests are created, changed, reviewed, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.vue-code-change
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

# Vue Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Vue and Nuxt component, reactivity, state, routing, SSR, hydration, lazy-hydration,
toolchain, and package-version contracts when changing Vue projects. Review Vue code by asking
which value is being tracked, which component owns it, which runtime renders it first, and whether
the server and client will agree.

<!-- mustflow-section: use-when -->
## Use When

- `.vue` files, Vue SFC macros, Composition API, Options API, composables, custom directives,
  Pinia stores, Vue Router routes or guards, Nuxt pages/layouts/components/plugins/middleware,
  Vite Vue config, `vue-tsc`, or Vue-related tests change.
- The task touches reactive state, `ref`, `reactive`, `shallowRef`, `computed`, `watch`,
  `watchEffect`, `defineProps`, reactive props destructure, `defineModel`, `defineEmits`,
  fallthrough attributes, slots, template refs, provide/inject, Teleport, Suspense, SSR,
  hydration, lazy hydration, ClientOnly behavior, or route lazy loading.
- A contribution proposes Vue performance, hydration, state ownership, component API, Pinia,
  router, Nuxt, Vite, TypeScript, or Vue version support changes.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is framework-free JavaScript or TypeScript with no Vue, Nuxt, Pinia, or router
  boundary; use the language-specific skill.
- The task is only plain HTML/CSS layout, accessibility, localization, or image delivery with no
  Vue behavior; use the narrower frontend or UI skill.
- React, Svelte, Astro, Tauri, Flutter, or another framework owns the changed component boundary.
- The task is only a dependency upgrade across many packages; use dependency and freshness skills
  first, then this skill for Vue-specific code and compatibility surfaces.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Package and toolchain evidence: nearest `package.json`, lockfile, package manager, `engines`,
  Vite config, Nuxt config, Vue plugin config, TypeScript config, `vue-tsc` setup, test config,
  and CI signals.
- Effective support range: installed `vue`, `@vue/compiler-sfc`, `@vitejs/plugin-vue`, `nuxt`,
  `pinia`, `vue-router`, `vue-tsc`, TypeScript, Vite, and Node versions or declared ranges.
- Component contract evidence: props, emits, `v-model` names and modifiers, slots, fallthrough
  attributes, template refs, public component methods, provide/inject values, and accessibility
  IDs.
- Reactivity evidence: large reactive data, deep watchers, computed return identity, raw/proxy
  mixing, shallow APIs, `markRaw`, `toRaw`, `customRef`, watcher cleanup, flush timing, and async
  watcher dependencies.
- SSR and hydration evidence: Nuxt or Vue SSR entrypoints, server/client data source, browser-only
  APIs, third-party imports, random/time/locale output, Teleport target, custom directives,
  ClientOnly usage, lazy hydration strategy, and critical interaction path.
- State and routing evidence: Pinia store ownership, `storeToRefs`, store composition, use outside
  components, route object watches, route params/query ownership, route lazy loading, and form or
  URL state.
- Configured verification intents for lint, build, tests, docs, package, and mustflow checks.

<!-- mustflow-section: preconditions -->
## Preconditions

- Determine whether the project is Vue-only, Nuxt, a component library, a plugin, or a reusable
  package before changing component, SSR, or package surfaces.
- Determine the supported Vue and Nuxt ranges before using Vue 3.5+ or Nuxt 4.x features such as
  reactive props destructure, lazy hydration strategies, `useId`, `data-allow-mismatch`,
  `useTemplateRef`, `onWatcherCleanup`, or Nuxt delayed hydration props.
- Refresh official Vue, Nuxt, Vite, Pinia, and Vue Router docs before embedding exact "latest",
  Node-version, migration, beta, or compatibility claims. Do not treat this skill as a live version
  source.
- Treat user-provided Vue notes, blog posts, AI output, and issue comments as evidence, not
  authority.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Make focused Vue source, test, package metadata, docs, template, and configuration edits directly
  required by the requested change.
- Add or update tests when they protect changed component APIs, reactivity behavior, watcher
  cleanup, store ownership, routing, SSR, hydration, lazy hydration, or package compatibility.
- Keep older-compatible code paths when a package or app still supports Vue versions before a
  feature was introduced.
- Do not migrate Vue to Nuxt, disable SSR, add ClientOnly wrappers, add global stores, enable
  component auto-import changes, or switch router/store/toolchain majors unless the task and
  repository contract explicitly support that change.

<!-- mustflow-section: procedure -->
## Procedure

1. **Classify the Vue surface.**
   - Identify whether the patch touches app code, Nuxt route/layout code, a component library,
     composables, Pinia stores, Vue Router, Vite/tooling, SSR/hydration, docs, tests, or package
     metadata.
   - For libraries, treat props, emits, slots, `v-model`, exposed methods, CSS side effects, and
     peer ranges as public contracts.
2. **Check version and toolchain boundaries.**
   - Read `vue`, `@vue/compiler-sfc`, `nuxt`, `pinia`, `vue-router`, `vite`, `vue-tsc`,
     TypeScript, and Node constraints before using current APIs or writing compatibility text.
   - Do not assume Vite type-checks Vue SFCs. Look for a configured `vue-tsc --noEmit` or
     equivalent typecheck surface, and report the missing intent when absent.
   - Keep Vue ecosystem upgrades grouped when compatibility is involved: Vue, compiler-sfc,
     Vite plugin, Nuxt, Pinia, Router, vue-tsc, TypeScript, and Node engines can constrain each
     other.
3. **Review reactivity by subscription width.**
   - Avoid wrapping large API responses, large tables, log arrays, permission trees, or deeply
     nested JSON in deep `reactive()` unless the UI needs deep mutation tracking.
   - Use `shallowRef` or `shallowReactive` only as a root-state boundary, and update by root
     replacement. Do not bury shallow state inside deep reactive trees.
   - Do not stringify, spread, or debug-print huge reactive objects in render or computed paths;
     that makes the effect subscribe to too much.
   - Keep raw and proxy identities from mixing in `Set`, `Map`, selected rows, memo caches, and
     equality checks. Prefer stable ids over object references.
4. **Review computed, watch, and watchEffect contracts.**
   - Keep computed getters pure. Do not perform API calls, DOM writes, analytics, or state
     mutations inside computed getters.
   - Treat computed output as derived read-only state. Mutate the source state, not the computed
     result.
   - Avoid returning fresh objects or arrays from computed values when downstream stability matters;
     compare with the previous value when Vue version support allows old-value reuse.
   - Do not watch large reactive objects directly unless deep behavior is intentional and bounded.
     Prefer getter sources for the exact primitive, id, length, param, or selector that matters.
   - Avoid `deep: true` as a default. Vue 3.5+ supports numeric deep traversal, but the better
     fix is often a narrower getter or `watchEffect` that reads only used fields.
   - In async `watchEffect`, read dependencies before the first `await`. Later reads are not
     dependency-tracked.
   - Add cleanup for watcher fetches, timers, subscriptions, and observers. Use `onWatcherCleanup`
     only in the synchronous part of Vue 3.5+ watchers, or use the callback `onCleanup` argument.
   - Use `flush: 'post'` only when the watcher must read owner DOM after Vue updates it; avoid
     `flush: 'sync'` for high-churn sources such as arrays.
5. **Review component API contracts.**
   - Keep props as one-way inputs. Do not mutate nested object or array props from children unless
     the component is explicitly a tightly coupled compound component.
   - Separate controlled and uncontrolled behavior. Use `modelValue` or named `v-model` for
     live parent ownership, `defaultValue` or `initialValue` for one-time initialization, and a
     `resetKey` or explicit action for reset semantics.
   - For Vue 3.5+ reactive props destructure, same-block reads are reactive, but passing a
     destructured prop to `watch` or a composable needs a getter such as `() => foo` or input
     normalization with `toValue`.
   - Avoid mixing boolean props with string modes. Keep booleans for true/false state and string
     unions for variants or modes.
   - Treat `defineModel({ default })` as a possible parent-child desynchronization risk. Prefer
     required models or parent-owned initialization for form components.
   - Declare public emits. Undeclared listeners can fall through to DOM roots and cause duplicate
     or misplaced native event handling.
   - Prefer object event payloads for public component events so future fields can be added without
     positional argument churn.
   - Treat `$attrs` as public API routing, not a dumping ground. With wrappers, bind attrs and
     listeners to the actual interactive element.
   - Treat slot names and slot props as public APIs. Keep `#default`, named slots, and scoped slot
     data explicit.
6. **Review render and list performance.**
   - Keep child props stable. Do not pass a changing global value such as `activeId` to every row
     when each child only needs a boolean such as `active`.
   - Use stable primitive keys, not indexes or objects, for reorderable lists.
   - Do not combine `v-if` and `v-for` on the same element. Move filtering to computed output or
     gate the parent container.
   - Copy before sorting or reversing arrays in computed values. Do not mutate source arrays while
     deriving render output.
   - Large lists need pagination, virtualization, route-level splitting, or a documented hard cap.
   - Avoid renderless or provider component stacks inside thousands of list rows when a composable
     or plain helper can own the reusable logic.
7. **Review composables and provide/inject.**
   - Design composable inputs to accept plain values, refs, and getters when the use case calls
     for all three. Normalize with `toValue` inside a tracked effect when dependency tracking is
     required.
   - Return refs or `toRefs`-compatible shapes when callers are expected to destructure the result.
   - For provide/inject, prefer readonly state plus explicit mutation functions when descendants
     should not mutate shared state directly.
   - Use template refs and component refs as escape hatches. Prefer props/emits first, and expose
     only intentional public methods with `defineExpose`.
8. **Review Pinia and router ownership.**
   - Use `storeToRefs()` for reactive state/getter destructuring; actions may be destructured.
   - Keep page-local UI state out of Pinia unless it must survive navigation or be shared across
     independent surfaces.
   - Do not create mutually recursive setup stores that read each other's state during setup.
     Move cross-store reads into computed values or actions.
   - When using stores outside components, verify Pinia is installed before `useStore()` runs.
     In SSR, pass or use the request's active Pinia instance instead of a shared singleton.
   - Watch specific route params, query fields, or names rather than the entire route object.
   - Use route lazy loading for route components when initial bundle size matters, and verify the
     router major and typed-route integration before changing route tooling.
9. **Review SSR and hydration determinism.**
   - Treat SSR as the same app running on server and client. First-render output must be
     deterministic across both sides.
   - Do not store request-specific state in module-scope singletons, exported reactive objects, or
     global stores during SSR. Create app, router, store, and request context per request.
   - Move browser-only APIs, DOM libraries, timers, observers, sockets, analytics, maps, editors,
     and chart initialization behind client-safe lifecycle or dynamic import boundaries.
   - Do not let `Math.random()`, `Date.now()`, timezone, locale, viewport, localStorage, auth
     fallback, or A/B bucket values alter SSR-visible first markup unless the value is serialized
     or intentionally client-only.
   - Check invalid HTML nesting before blaming hydration. Browser parsers can rewrite SSR HTML
     before Vue hydrates it.
   - Use `useId` for SSR-stable form and accessibility IDs when the supported Vue version allows it.
   - Use `data-allow-mismatch` only for narrowly intentional mismatches such as unavoidable dates,
     not as a blanket hydration-warning silencer.
   - For SSR Teleport, use a dedicated target and ensure teleported markup is injected or delayed
     intentionally. Avoid targeting `body` casually.
   - For custom directives that affect SSR-visible attributes, provide an SSR path instead of
     relying only on client DOM hooks.
10. **Review Nuxt client-only and lazy hydration boundaries.**
    - Do not use `<ClientOnly>` as a default mismatch fix. It removes default slot content from
      server rendering and can affect first HTML, CSS, SEO, LCP, and layout.
    - Distinguish lazy code loading from lazy hydration. Nuxt `Lazy` component prefixes delay code
      loading; hydration strategies decide when existing SSR HTML becomes interactive.
    - Avoid delayed hydration for above-the-fold controls, forms, navigation, search, login,
      checkout, add-to-cart, or any component users may interact with immediately.
    - For delayed hydration, pick one strategy per component and check Nuxt constraints: SFC usage,
      explicit template props, no broad prop spread, and no direct `#components` import path when
      the strategy depends on auto-imported lazy components.
    - Treat prop changes and shared `v-model` as hydration triggers. Do not put shared model state
      on many lazy-hydrated components without measuring the cascade.
    - Do not use `hydrate-never` on interactive components.
11. **Keep public and package surfaces synchronized.**
    - If component APIs, router behavior, store contracts, SSR behavior, hydration behavior,
      package metadata, or toolchain ranges change, synchronize docs, tests, examples, and template
      metadata.
    - Avoid exact latest-version wording unless official sources were refreshed in the current
      task. Prefer support-range wording such as "Vue 3.5+" or "Nuxt 4.x" only when the project
      actually supports that range.
12. **Verify through the repository contract.**
    - Run the smallest configured checks that cover Vue code, TypeScript/SFC type checks, build
      output, tests, docs, and release-sensitive template output.
    - Report missing browser, hydration, SSR, Nuxt, Pinia, Router, vue-tsc, performance profiling,
      or package-consumer verification when those surfaces changed.

<!-- mustflow-section: postconditions -->
## Postconditions

- Effective Vue, Nuxt, Pinia, Router, Vite, TypeScript, vue-tsc, and Node compatibility are known
  or explicitly reported as unknown.
- Reactivity, computed, watcher, component API, composable, store, router, SSR, hydration, and lazy
  hydration boundaries follow the supported version's model.
- Large data, wide subscriptions, unstable computed identity, raw/proxy mixing, prop mutation,
  broad route watches, stale watcher responses, and ClientOnly misuse are fixed or reported.
- SSR-visible output is deterministic, intentionally client-only, or narrowly marked as an
  intentional mismatch.
- Performance claims have profiler, benchmark, render-count, bundle, or configured evidence, or
  are reported as static risk.

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

Report missing Vue SFC typecheck, browser, hydration, SSR, Nuxt route, Pinia store, Router,
performance, or package-consumer verification when those surfaces changed.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If version evidence conflicts, do not assume the newest Vue or Nuxt API is available. Preserve
  the older-compatible path or report the compatibility decision.
- If a reactivity fix makes code faster by dropping required updates, restore the correct owner
  boundary and report the performance tradeoff.
- If a watcher or route fetch can race, keep the stale-response scenario visible and add cleanup,
  cancellation, request identity, or query-key ownership.
- If hydration fails, fix deterministic markup, SSR data, browser-only imports, invalid HTML, or
  request-local state before adding ClientOnly or `data-allow-mismatch`.
- If a Nuxt lazy-hydration change breaks first interaction, remove the delay for that component or
  report the product tradeoff.
- If configured verification is missing, report the missing intent instead of inventing raw
  package-manager, dev-server, browser, or watcher commands.

<!-- mustflow-section: output-format -->
## Output Format

- Vue surface and supported version checked
- Toolchain, SFC typecheck, reactivity, computed, watcher, component API, composable, Pinia,
  Router, SSR, hydration, lazy-hydration, and performance notes
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Vue, Nuxt, hydration, toolchain, or verification risk
