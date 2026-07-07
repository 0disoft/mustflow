---
mustflow_doc: skill.client-bundle-pruning-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: client-bundle-pruning-review
description: Apply this skill when frontend or web client JavaScript/CSS bundles, first-route JS, route chunks, shared vendor chunks, tree shaking, ESM versus CommonJS dependencies, barrel files, package exports, sideEffects metadata, PURE annotations, Next.js use-client boundaries, Server Components, dynamic imports, React lazy, Angular defer, Vue route lazy loading, package import modularization, icon imports, date locales, syntax highlighters, code editors, Node polyfills, browser targets, Babel polyfills, dev-only branches, console stripping, Rollup manualChunks, Vite modulepreload, Tailwind class extraction, or inline asset rules need review for bundle-size, dead-code elimination, dependency-bloat, or initial-JS budget risk.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.client-bundle-pruning-review
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

# Client Bundle Pruning Review

<!-- mustflow-section: purpose -->
## Purpose

Review frontend bundle weight by finding code shapes that keep bundlers from deleting unused client code, not by repeating generic advice about compression, images, or code splitting. Treat compressed transfer size as only one receipt; the browser pays again when JavaScript is decompressed, parsed, compiled, evaluated, and run on the main thread.

The review question is not "is code splitting enabled?" It is "which imports, package entrypoints, module formats, side-effect claims, client boundaries, polyfills, coverage gaps, and chunk rules force unused or late-use code into the first route or shared vendor bundle?"

<!-- mustflow-section: use-when -->
## Use When

- A frontend route, web app, package, design system, component library, framework config, bundler config, or dependency change may alter client JavaScript, CSS, route chunks, shared vendor chunks, or first-route bundle size.
- Code touches imports, package entrypoints, `exports`, `main`, `module`, `browser`, `sideEffects`, barrel files, CJS/ESM package choices, tree shaking, Rollup/Vite/Webpack/esbuild settings, Babel targets, browser targets, polyfills, modulepreload, manual chunks, or asset-inline rules.
- Code touches React, Next.js, Angular, Vue, Svelte, Astro, or similar frontend boundaries that decide whether code ships to the browser, such as `'use client'`, Server Components, dynamic import, `React.lazy`, `next/dynamic`, Angular `@defer`, Vue route lazy loading, or islands.
- Code introduces or reviews icons, date libraries, locale packs, charts, editors, markdown renderers, syntax highlighters, search libraries, PDF viewers, maps, Node polyfills, Tailwind dynamic classes, or large third-party UI libraries.
- A review or final report claims smaller bundles, better tree shaking, smaller initial JS, route-level code splitting, modular imports, removed dead code, or reduced dependency weight.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only first paint, LCP, CLS, TTFB, critical CSS, font loading, media priority, CDN cache, resource hints, route prefetching, or long main-thread work; use `web-render-performance-review` first and this skill only if client bundle pruning is a concrete cause.
- The task is only broad performance budgeting, measurement design, p95/p99 latency, throughput, memory, or backend cost; use `performance-budget-check`.
- The task is only adding, converting, resizing, or replacing raster image files; use `web-asset-optimization`.
- The task is only JavaScript or TypeScript runtime behavior with no client bundle, import graph, module format, dependency, or bundler-output risk; use the matching language skill.
- The needed proof requires an unconfigured bundle analyzer, browser trace, package-manager command, dev server, or build plugin installation. Report the missing measurement or tooling boundary instead of inventing raw commands.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Bundle target ledger: app framework, bundler, build target, first entry route, route chunks, shared vendor chunks, CSS output, asset-inline rules, and known bundle budget or analyzer evidence.
- Entry and import graph ledger: changed imports, barrels, re-exports, subpath imports, dynamic imports, static imports, route imports, client/server boundaries, and dependency paths from the first route.
- Dependency format ledger: packages touched, ESM/CJS shape, tree-shaking support, package `exports`, `mainFields`, `sideEffects`, `moduleSideEffects`, PURE hints, browser entrypoints, and package version evidence when available.
- Framework boundary ledger: Next.js Server/Client Component boundary, `next/dynamic`, `optimizePackageImports`, React `lazy`, Angular `@defer`, Vue route lazy loading, Svelte/Astro island or hydration boundary, and whether code is required for first interaction.
- Heavy-feature ledger: icons, UI component libraries, date locales, syntax highlighters, markdown, editors, charts, maps, PDF viewers, search/fuzzy libraries, Node polyfills, dev-only tools, logs, and CSS utility extraction.
- Polyfill and target ledger: browser support target, Babel or TypeScript output target, `core-js` usage, Node polyfills, `process` or `Buffer` shims, Vite modulepreload polyfill, and esbuild/Webpack/Rollup define or drop settings.
- Measurement ledger: initial JavaScript transfer, decompressed size, parse, compile, evaluate, bootup or long-task time, route-specific Chrome Coverage or equivalent unused-code evidence, Resource Timing for preload or prefetch changes, manifest or chunk hash stability, and whether the evidence is flow-specific or a single refresh snapshot.
- Existing tests, build output, bundle budgets, analyzer screenshots or reports, package metadata checks, and configured command-intent evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available from current files, diffs, docs, configured outputs, or user-provided evidence, or missing inputs can be reported without guessing.
- If package metadata, library exports, module formats, or public import paths change, also use `typescript-code-change`, `javascript-code-change`, `api-contract-change`, or `dependency-reality-check` as applicable.
- If a current external vendor behavior claim is needed, verify with source-fresh evidence or report the claim as snapshot-only.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Narrow imports, replace CJS-heavy package paths with ESM or subpath imports, remove or avoid barrels on hot paths, add package subpath exports, adjust safe `sideEffects` metadata, add PURE annotations around pure wrapper calls, move client boundaries inward, add dynamic imports or framework deferral for heavy optional features, narrow icon/date/highlighter/editor imports, block unnecessary Node polyfills, modernize browser targets, replace broad polyfill imports, fold dev-only branches, tune chunk rules, bound route prefetch or modulepreload behavior, fix Tailwind extraction shapes, adjust asset-inline thresholds, and add focused tests or docs tied to the bundle contract.
- Add bundle budget assertions or package metadata checks only when the repository already has a pattern or configured command intent.
- Keep bundle pruning local to the affected route, package entry, dependency, or bundler rule. Do not migrate frameworks, replace bundlers, add analyzer plugins, add package dependencies, or introduce broad design-system export rewrites without explicit scope and verification support.
- Do not remove needed side effects, CSS, polyfills, runtime registration, accessibility behavior, localization data, error logging, or public import compatibility merely to make a bundle smaller.

<!-- mustflow-section: procedure -->
## Procedure

1. Review first-route JavaScript separately from total build output. Name the route or entry users actually load first, then separate initial JS, route JS, shared vendor JS, CSS, and lazy chunks when evidence exists.
2. Budget execution, not only gzip. Prefer initial JavaScript parse, compile, evaluate, bootup, and long-task budgets over compressed KB-only claims. Treat gzip or brotli size as transfer evidence, not proof that the main thread got faster.
3. Compare analyzer receipts with coverage evidence. Bundle analyzers show what entered the build; route-specific Coverage or equivalent evidence shows what was unused in the flow. Check first entry, logged-in state, key route, checkout or save path, and heavy feature entry separately when those flows matter.
4. Prefer a failing bundle budget over human memory. If the repository has a budget pattern, enforce initial route JS, shared vendor growth, evaluate time, or long-task growth with configured tests or release checks. If no configured budget exists, report the gap instead of inventing analyzer commands.
5. Suspect non-ESM packages first. Tree shaking depends on static imports and exports; CommonJS `require`, mixed module packages, dynamic require patterns, or ambiguous package entrypoints often keep unused code alive.
6. Replace broad utility imports. Avoid `import _ from 'lodash'`, broad date imports, or whole-library namespace imports on client paths when ESM or function-level imports preserve behavior.
7. Audit barrel files on hot client paths. `export *` design-system or icon barrels can force bundlers to inspect or include too much. Prefer direct subpath imports when the package owns that contract.
8. Split internal package exports by feature. Provide stable subpath exports such as component, icon, or helper entrypoints when `@scope/ui` as a single entry drags unrelated modules into client bundles.
9. Set `sideEffects` metadata carefully. Use `false` only when modules are truly side-effect-free, and preserve CSS imports, polyfills, global registrations, telemetry setup, and plugin initialization through an allowlist.
10. Treat Rollup or Vite `moduleSideEffects: false` as dangerous by default. Use a function or allowlist when CSS, polyfills, custom elements, plugin registration, or global patches exist.
11. Add PURE annotations only for pure wrapper calls. React `memo`, `forwardRef`, higher-order component factories, icon factories, and generated component wrappers may need `/* @__PURE__ */`, but never mark a call pure unless its arguments and call have no required side effects.
12. Move client boundaries inward. In Next.js style apps, avoid putting `'use client'` on pages, layouts, or broad shells when only a small search box, menu, chart, or control needs browser state.
13. Use Server Components or server-only code as a deletion boundary. Keep markdown parsing, CMS transforms, price formatting, permission checks, data shaping, and server-safe library use out of Client Components when interactivity does not require them.
14. Keep dynamic imports statically analyzable and outside the initial static graph. `next/dynamic` and similar APIs need explicit import strings at module top level when preloading or chunk naming depends on static analysis; `import()` does not help when the same module is statically imported by the first route, shell, barrel, or shared vendor path.
15. Declare `React.lazy` and similar lazy components outside render functions. Recreating lazy definitions during render can reset state and blur split boundaries.
16. Split by "the user can wait here," not by arbitrary component size. Route transitions, modal first open, editor mode, chart tab, map reveal, admin panel entry, or preview mode are stronger boundaries than small components that are needed together.
17. Lazy-load optional heavy widgets. Modals, charts, editors, maps, search, PDF viewers, markdown preview, syntax highlighting, and admin-only panels should not enter initial JS unless they are visible and necessary at first load.
18. Move external library imports to the event or visibility point when safe. Search libraries can load on focus or input, charts on tab open, maps on section reveal, markdown preview on preview mode, and editors on edit intent.
19. Use Angular `@defer`, Vue route lazy loading, Svelte/Astro islands, or framework-native deferral when that framework is present. Confirm the dependencies are not also imported eagerly outside the deferred boundary.
20. Use import modularization options cautiously. Next.js `optimizePackageImports` or equivalent compiler transforms can help large export surfaces, but verify the actual output and do not treat an experimental option as proof.
21. Audit icon imports. Prefer per-icon imports, stable subpath imports, or build-time SVG sprites over package roots or barrels that can pull an icon catalog into client JS.
22. Audit date locales. Import only needed locales, prefer platform `Intl` when it is enough, and keep server-format-able date work off the client path.
23. Split syntax highlighters, markdown processors, and code editors by language, mode, or worker boundary. Do not ship every grammar, theme, plugin, or editor worker for one small code block.
24. Avoid accidental Node polyfills in browser bundles. Do not fix `crypto`, `stream`, `buffer`, `process`, or `path` resolution errors by adding browser shims unless the browser feature truly needs them; prefer false fallbacks or server-only boundaries when possible.
25. Modernize browser targets only with product support evidence. Too-low Babel or TypeScript targets can inject helper and polyfill overhead; too-high targets can break real users.
26. Replace broad Babel polyfill imports. Avoid whole `core-js/stable` or blanket polyfill entrypoints when target-aware `preset-env` or explicit feature polyfills can cover the supported browsers.
27. Ensure dev-only branches fold at build time. `process.env.NODE_ENV`, `__DEV__`, `import.meta.env.DEV`, feature labels, and debug helpers must become constants for dead-code elimination to remove dev tooling.
28. Remove console calls safely. Do not blindly drop all console calls when arguments may have side effects. Prefer logging wrappers or pure-log configuration that preserves required argument behavior.
29. Avoid one giant vendor chunk. Manual chunk rules that put all `node_modules` in one vendor bundle can pull charts, editors, maps, and admin-only code into the first route and can change side-effect timing.
30. Check Vite and Rollup version semantics before copying old chunk advice. Confirm whether the project uses current `build.rollupOptions`, newer Rolldown aliases, `cssCodeSplit`, framework wrappers, and modulepreload behavior before changing chunk rules.
31. Check Vite modulepreload, preload, and prefetch behavior with timing evidence. Disable the modulepreload polyfill only when supported browser targets make that safe; avoid preloading or prefetching lazy route or widget chunks that are not needed soon, and use Resource Timing or configured evidence when priority changes are claimed.
32. Keep Tailwind and utility extraction finite. Avoid dynamic class string construction that production extraction cannot see, and avoid broad safelists that inflate CSS. Prefer complete static class strings or constrained maps.
33. Check inline asset thresholds. Large SVGs, fonts, or images inlined into JavaScript increase parse and transfer cost, couple cache lifetimes, and can force re-downloads when an app chunk changes; use separate resources unless the asset is small and truly critical.
34. Check long-term chunk cache stability. One source edit should not churn every chunk hash unless the graph contract requires it. Inspect manifest use, stable vendor or route chunks, and rarely-used heavy chunks when deployment cache behavior is part of the claim.
35. Label evidence honestly. If no configured bundle analyzer, coverage report, Resource Timing, budget, build output, or package-size proof exists, report the result as static import-graph risk or missing measurement, not a measured bundle reduction.

<!-- mustflow-section: postconditions -->
## Postconditions

- First-route JS, route chunks, shared vendor chunks, package entrypoints, imports, barrels, side effects, client/server boundaries, dynamic imports, heavy optional features, polyfills, targets, chunk rules, CSS extraction, and inline assets are explicit where relevant.
- CJS-heavy imports, broad package roots, hot-path barrels, missing subpath exports, unsafe side-effect metadata, missing PURE hints, broad client boundaries, eager heavy widgets, event-time libraries, icon catalogs, date locale packs, highlighter/editor language packs, Node polyfills, old browser targets, broad polyfills, un-folded dev code, unsafe console drops, giant vendor chunks, modulepreload spam, dynamic Tailwind classes, broad safelists, and large inline assets are fixed or reported.
- Bundle-size, unused-code, initial-JS, evaluate-time, long-task, preload, prefetch, and cache-stability claims are backed by current configured evidence or labeled as static import-graph risk, manual-only measurement, or missing evidence.
- Public import compatibility, CSS, polyfills, localization, accessibility, logging semantics, and framework behavior remain intact or are reported as tradeoffs.

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

Use the narrowest configured test, build, docs, release, or mustflow intent that covers the changed import graph, package metadata, route boundary, or bundler behavior. Use bundle analyzers, browser traces, dev servers, package-manager commands, or plugin installation only when they are configured one-shot intents or explicitly approved by the user.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If bundle evidence is missing, avoid adding speculative chunk rules or package rewrites; report the missing budget or analyzer evidence.
- If a configured test or build fails, preserve the failing intent and output tail, then fix only the import, package, bundler, or framework boundary exercised by the failure.
- If pruning would break public import paths, CSS side effects, polyfills, localization, or runtime registrations, keep behavior intact and report the tradeoff or migration path.
- If a fix requires package replacement, dependency installation, framework upgrade, bundler migration, or unconfigured analyzer tooling, stop and report the missing product or command-contract decision.
- If verification fails after a bundle-pruning change, use `failure-triage` before broadening the fix.

<!-- mustflow-section: output-format -->
## Output Format

- Client bundle surface reviewed
- First-route JS, route chunk, and shared vendor evidence
- Import graph, package entry, side-effect, client boundary, coverage, lazy-loading, polyfill, target, chunk, CSS extraction, preload or prefetch, inline asset, and cache-stability ledgers
- Findings or fixes
- Evidence level: measured, configured-test evidence, static import-graph risk, manual-only, missing, or not applicable
- Command intents run
- Skipped bundle measurements and reasons
- Remaining client-bundle pruning risk
