---
mustflow_doc: skill.vite-code-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: vite-code-change
description: Apply this skill when Vite config, plugins, Rolldown or Rollup compatibility, dependency optimization, dev server or HMR behavior, SSR, library mode, workers, Environment API usage, package exports, TypeScript transpilation, browser targets, assets, CSS, sourcemaps, package-manager scripts, CI, Docker, preview, or Vite-related tests are created, changed, reviewed, migrated, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.vite-code-change
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

# Vite Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Vite build, dev-server, plugin, SSR, worker, library, dependency optimizer, package
resolution, TypeScript, CSS, asset, cache, sourcemap, preview, CI, Docker, and package-manager
contracts when changing Vite projects.

Vite is a toolchain boundary, not only a fast dev server. Review changes by asking which Vite major
is actually installed, which bundler pipeline is active, which runtime is being built, which package
entry is resolved, and whether dev, build, SSR, worker, preview, and CI will see the same intent.

<!-- mustflow-section: use-when -->
## Use When

- `vite.config.*`, plugin code, framework integration config, package metadata, lockfiles, scripts,
  TypeScript config, CSS preprocessor config, asset imports, worker imports, SSR server entry,
  library build config, preview config, CI, Docker, or Vite tests change.
- The task touches Rolldown or Rollup compatibility, Oxc or esbuild transforms, Lightning CSS,
  dependency pre-bundling, `optimizeDeps`, `resolve`, `server`, `preview`, `worker`, `ssr`,
  `build`, `base`, `publicDir`, `assetsInlineLimit`, `manifest`, `sourcemap`, `modulepreload`,
  HMR, `import.meta.glob`, `new URL(..., import.meta.url)`, package `exports`, ESM/CJS interop,
  or environment-specific plugin behavior.
- A contribution proposes Vite performance, migration, plugin ordering, SSR, library packaging,
  worker, TypeScript, Node, Bun, pnpm, Docker, CI, preview smoke, sourcemap, or asset pipeline
  changes.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is entirely inside React, Vue, Svelte, Astro, or another framework boundary and Vite
  config, package metadata, build output, SSR, workers, plugins, or dependency resolution are not
  affected. Use the framework skill.
- The task is only CSS, HTML, image delivery, accessibility, or localization with no Vite build,
  asset, config, or package behavior. Use the narrower frontend skill.
- The task is a broad dependency upgrade across many packages. Use dependency and version freshness
  skills first, then this skill for Vite-specific compatibility.
- The task only checks whether a package exists. Use dependency reality checks instead.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Package evidence: nearest `package.json`, lockfile, package manager, `engines`, package manager
  field, workspace metadata, framework packages, Vite version range, plugins, test runner, and CI.
- Config evidence: `vite.config.*`, framework config that wraps Vite, TypeScript config, CSS
  preprocessor config, aliases, package `exports`, `main`, `module`, `browser`, and `types`.
- Runtime ledger: app build, SSR build, library build, worker build, test environment, preview
  server, static host, Node server, edge or webworker target, and browser support target.
- Plugin ledger: plugin order, `enforce`, `apply`, hook use, virtual module ids, query handling,
  dev-only server state, output-generation hooks, `transformIndexHtml`, and environment state.
- Dependency optimizer ledger: linked packages, CommonJS dependencies, deep imports, discovery
  gaps, `optimizeDeps.include` and exclude decisions, cache invalidation sources, and monorepo
  package format.
- Asset and output ledger: public files, imported assets, dynamic asset paths, CSS code splitting,
  module preload, manifest use, sourcemap policy, chunk rules, base path, and backend integration.
- Official or repository-local source evidence before preserving exact latest-version, release-date,
  Node-floor, migration, deprecated-option, or compatibility claims.
- Configured verification intents for lint, build, tests, docs, package, preview, and mustflow
  checks.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify the installed Vite major and the intended target major before applying migration rules.
  Do not treat this skill as a live Vite version source.
- Refresh official Vite docs, release notes, migration docs, and plugin docs before writing durable
  "latest", default, deprecated, removed, Node-floor, browser-target, Rolldown, Oxc, Lightning CSS,
  Environment API, or plugin-compatibility claims.
- Determine whether the project is an app, framework wrapper, plugin, library, SSR server, design
  system, monorepo package, or static site before changing build output.
- Treat user-provided notes, blogs, AI output, and migration snippets as evidence, not authority.
- Use configured command intents only. Do not invent package-manager, dev-server, preview-server,
  browser, or profiler commands inside this skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Make focused Vite config, plugin, package metadata, TypeScript, CSS, asset, SSR, worker, library,
  test, CI, Docker, docs, and template edits directly required by the requested change.
- Add or update tests when they protect changed config behavior, plugin behavior, package
  resolution, SSR/worker/library output, asset paths, sourcemap policy, preview behavior, or
  package-manager compatibility.
- Preserve repository-pinned Vite, Node, package-manager, browser-target, and framework-plugin
  ranges unless the task explicitly supports a migration and verification surface.
- Do not migrate frameworks, replace the package manager, enable experimental Vite modes, widen
  `allowedHosts`, publish sourcemaps, disable typechecking, or silence chunk warnings unless the
  repository contract and user request support that tradeoff.

<!-- mustflow-section: procedure -->
## Procedure

1. **Classify the Vite surface.**
   - Identify whether the patch touches config, plugin code, dependency optimization, dev server,
     HMR, SSR, library mode, workers, package resolution, TypeScript, CSS, assets, sourcemaps,
     preview, CI, Docker, tests, docs, or package metadata.
   - For framework projects, decide which part belongs to the framework skill and which part
     belongs to Vite itself.
2. **Check the version and migration boundary.**
   - Read package metadata and lockfile evidence for Vite, framework plugins, test runner,
     TypeScript, Node, package manager, and related adapters.
   - Apply only the official migration deltas crossed by the installed and target Vite major.
   - Keep Vite 7 transition-package guidance, Vite 8 Rolldown defaults, and future Vite tracks
     separate. Do not collapse them into one generic "Rolldown Vite" claim.
3. **Review Rolldown, Rollup, Oxc, and CSS compatibility.**
   - Check whether old `build.rollupOptions`, `worker.rollupOptions`, `build.commonjsOptions`,
     esbuild transform or minify options, and object-form chunk rules are supported, deprecated,
     transformed through compatibility, or ignored for the project version.
   - For Vite 8+ tracks, prefer current Rolldown and Oxc configuration names when official docs and
     project compatibility support them.
   - Treat Oxc and Lightning CSS output differences as behavior risk for minification, syntax
     lowering, property mangling, comments, CSS prefixes, nesting, color functions, and visual QA.
4. **Review TypeScript and runtime checks.**
   - Do not assume Vite type-checks TypeScript. Look for a configured `tsc`, framework checker, or
     equivalent typecheck intent and report the gap when absent.
   - Keep browser app TypeScript settings, Vite config TypeScript, Node scripts, SSR server code,
     and library declarations aligned with their actual runtime resolution mode.
   - Use `isolatedModules`, type-only imports, and syntax choices compatible with the project's
     single-file transformer and support matrix.
5. **Review dependency optimizer and dev-server performance.**
   - Check DevTools cache, extensions, module request count, linked packages, CommonJS
     dependencies, deep imports, discovery gaps, lockfile changes, patches, and Vite cache
     invalidation before blaming Vite itself.
   - Avoid broad barrel imports and extensionless imports on hot dev paths when direct imports and
     explicit extensions are practical.
   - Use dependency optimizer include or exclude settings only after identifying which package is
     source-like, dependency-like, CommonJS, linked, or discovered too late.
   - Use warmup, bundled dev, profile, or plugin diagnostics only through configured project
     intents or approved workflows, and keep any experimental mode scoped and reported.
6. **Review HMR and dev-server boundaries.**
   - Keep HMR accept boundaries statically discoverable. Do not hide `import.meta.hot.accept` behind
     wrappers that Vite cannot analyze.
   - Clean up side effects in HMR dispose handlers and preserve state through `hot.data` without
     replacing the object wholesale.
   - For reverse proxies, containers, tunnels, and remote development, verify WebSocket ownership,
     host allowlist, protocol, and fallback behavior. Do not set `allowedHosts: true` as a shortcut.
7. **Review plugin ordering and hook contracts.**
   - Remember that alias runs before user `enforce: 'pre'`, and user `enforce: 'post'` is not the
     final build output.
   - Keep plugin order separate from hook order, especially `transformIndexHtml` ordering.
   - Do not add plugins from the `config` hook after plugin resolution.
   - Guard dev-server state captured in `configureServer`; production build may not have a server,
     module graph, watcher, or WebSocket.
   - Preserve virtual module conventions: user imports use `virtual:*`, internal resolved ids use
     the null-byte prefix, and query suffixes such as raw, url, worker, and inline remain meaningful.
   - For non-JS files transformed into JavaScript under Rolldown-based tracks, set the module type
     required by the current API instead of relying on extension guesses.
   - Key plugin caches by environment when client, SSR, RSC, worker, or other environments can
     share one plugin instance.
8. **Review package resolution and ESM/CJS interop.**
   - Build a package-entry ledger for client, dev SSR, production SSR, externalized SSR, worker,
     test runner, Node direct execution, and TypeScript declarations.
   - Treat package `exports` as the public door. It can override `main`, block deep imports, and
     choose different files by condition order.
   - Do not assume CJS named imports, `__esModule` default handling, `browser`, `module`, or `main`
     fields behave the same across Vite, Node, SSR, and TypeScript.
   - If `type: "module"` changes, inspect config files, scripts, and test files that still use
     CommonJS globals or extension assumptions.
9. **Review SSR, Environment API, workers, and library mode.**
   - Treat Vite SSR APIs as low-level framework/tooling APIs. For app SSR, identify the framework or
     server contract that owns routing, data loading, streaming, and deployment.
   - Keep dev SSR transforms separate from production client and server builds. The SSR manifest is
     a client-build artifact when preload mapping is required.
   - Distinguish `ssr.resolve.conditions` from external dependency conditions, and keep Node
     runtime conditions aligned when the project uses them.
   - For webworker targets, reject hidden Node built-ins and package entries that only work in Node.
   - Treat library mode as package output, not an app build. Check entry, formats, global name,
     CSS splitting, asset inlining, modulepreload, UMD/IIFE, dynamic imports, and `import.meta.url`.
   - For workers, confirm static worker patterns, query syntax, `worker.plugins`, and separate
     plugin instances where build behavior differs from dev behavior.
10. **Review assets, CSS, sourcemaps, and base paths.**
    - Keep `public/` for files that must be served by stable public names. Import other assets so
      Vite can hash, transform, and track them.
    - Do not assume dynamic `new URL(dynamicPath, import.meta.url)` is transformed. Use explicit
      maps or glob patterns when the asset set must be known at build time.
    - Match `base` to the deployment path or CDN strategy.
    - Do not silence chunk-size warnings by only raising the limit. Inspect initial JS, dynamic
      imports, shared chunks, barrels, and parse or execution cost.
    - Use sourcemaps according to the exposure policy: public, hidden and uploaded, blocked from
      static hosting, or disabled. Do not publish source maps by accident.
    - Keep SCSS or preprocessor `additionalData` to variables, mixins, and tokens. Do not inject
      real CSS rules into every file unless duplication is intentional and measured.
11. **Review package manager, CI, Docker, and preview.**
    - Preserve the repository's package manager and lockfile. Do not introduce `bun.lock`,
      `pnpm-lock.yaml`, `package-lock.json`, or `yarn.lock` drift unless the task is a package
      manager migration.
    - Align Node and package-manager declarations across package metadata, CI, Docker, local runtime
      files, and workspace policy.
    - Split install, typecheck, lint, tests, build, and preview smoke where the repository exposes
      configured intents. Do not hide all failures behind one opaque build script.
    - For preview smoke, require deterministic port, host, and asset path behavior through
      configured intents or report missing coverage.
12. **Verify through the repository contract.**
    - Run the smallest configured checks that cover Vite config, typecheck, build output, tests,
      docs, package metadata, and release-sensitive template output.
    - Report missing dev-server, HMR, browser, SSR preview, worker, library-consumer, bundle
      analyzer, sourcemap-upload, Docker, or CI verification when those surfaces changed.

<!-- mustflow-section: postconditions -->
## Postconditions

- The installed Vite and target Vite tracks are known or explicitly reported as unknown.
- Rolldown/Rollup/Oxc/Lightning CSS compatibility is checked for the changed config and plugins.
- Type checking is separate from Vite transpilation or the missing check is reported.
- Dev-server, HMR, optimizer, package resolution, SSR, worker, library, asset, sourcemap, preview,
  package-manager, CI, and Docker risks are fixed or reported.
- Durable version and default-behavior claims are official-source checked, dated, version-scoped,
  or omitted.

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

Report missing Vite typecheck, browser, HMR, dependency-optimizer, SSR, worker, library-consumer,
bundle-size, sourcemap, preview, Docker, CI, or package-manager verification when those surfaces
changed.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If version evidence conflicts, preserve the repository's pinned Vite and runtime policy unless
  the user explicitly chooses a migration or the current version is outside a required security or
  support range.
- If official docs conflict with old snippets or framework wrapper behavior, follow the current
  project version and official source, then report the wrapper-specific boundary.
- If dev works but build fails, inspect plugin hook phase, Rollup/Rolldown option compatibility,
  SSR/externalization, worker build, library mode, and package exports before adding aliases.
- If build works but runtime fails, inspect CJS default/named imports, conditional exports, asset
  paths, base path, sourcemaps, `import.meta.url`, and environment-specific plugin state.
- If a performance fix changes correctness, restore the package, route, asset, or plugin owner
  boundary and report the performance tradeoff.
- If configured verification is missing, report the missing intent instead of inventing raw
  package-manager, dev-server, preview, browser, profiler, Docker, or CI commands.

<!-- mustflow-section: output-format -->
## Output Format

- Vite surface and version track checked
- Rolldown/Rollup/Oxc/CSS, TypeScript, optimizer, HMR, plugin, package-resolution, SSR, worker,
  library, asset, sourcemap, package-manager, CI, Docker, and preview notes
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Vite, runtime, plugin, package, or verification risk
