---
mustflow_doc: skill.app-startup-performance-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: app-startup-performance-review
description: Apply this skill when Android, iOS, React Native, Flutter, Tauri mobile, desktop app shell, Electron, or other installed app code needs startup performance review from icon tap or process launch to first frame and fully usable state, including cold, warm, or hot start, Android TTID and TTFD, `reportFullyDrawn()`, Android Vitals startup thresholds, Xcode Organizer, Instruments App Launch or Time Profiler, `Application.onCreate()`, `AppDelegate`, ContentProvider auto-init, AndroidX App Startup, DI graph creation, SDK initialization, static initializers, main-thread disk or network work, cache snapshots, launch migrations, first-screen layout, launch assets, custom fonts, R8, Baseline Profile, Startup Profile, Macrobenchmark, Perfetto, Hermes, JavaScript or Dart import graphs, deferred components, shader warmup, on-demand modules, splash holds, auth or config gates, and post-first-frame work queues.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.app-startup-performance-review
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

# App Startup Performance Review

<!-- mustflow-section: purpose -->
## Purpose

Review installed app startup as a launch critical path from icon tap or process start to first frame
and fully usable state, not as a splash-screen masking problem.

The review question is not "does the splash look smooth?" It is "what code, I/O, SDK, dependency
graph, asset, first-screen, auth, or config gate blocks the user before the app can draw and before
the first useful action works?"

<!-- mustflow-section: use-when -->
## Use When

- Android, iOS, React Native, Flutter, Tauri mobile, Electron, desktop app shell, or packaged app
  code is created, changed, reviewed, or reported with startup, launch, splash, first frame, first
  screen, time-to-interactive, time-to-full-display, cold start, warm start, hot start, blank screen,
  slow app open, initial route, auth bootstrap, config bootstrap, SDK initialization, or app shell
  performance risk.
- Code touches `Application.onCreate()`, `AppDelegate`, Android ContentProvider auto-init, AndroidX
  App Startup initializers, dependency injection graph creation, service locators, SDK setup, crash
  reporting, analytics, remote config, feature flags, A/B experiments, ad SDKs, database open,
  migrations, cache cleanup, thumbnail generation, log compression, static initializers, top-level
  imports, global constants, first-screen assets, custom fonts, launch resources, route bootstrap,
  React Native bundles, Flutter first frame, Tauri or Electron preload, or on-demand modules.
- A final report claims startup is faster, startup-safe, splash-safe, fully drawn, release-ready,
  app-store quality, Play quality, low-end-device safe, or measured by Android Vitals, TTID, TTFD,
  `reportFullyDrawn()`, Xcode Organizer, Instruments, Macrobenchmark, Perfetto, or similar evidence.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is purely web page first render, Core Web Vitals, LCP, browser TTFB, route prefetch, or
  web hydration outside an installed app shell; use `web-render-performance-review`.
- The task is per-frame browser jank, INP, scroll, animation, style, layout, paint, compositing, or
  interaction rendering after startup; use `frame-render-performance-review`.
- The task is mobile battery, background wakeups, radio, GPS, sensors, Low Power Mode, Battery
  Saver, or energy diagnostics without launch critical-path impact; use `mobile-energy-efficiency-review`.
- The task is broad runtime performance, backend latency, database throughput, memory, allocation,
  queueing, or generic hot-path work with no app startup boundary; use `performance-budget-check`.
- The operation only changes splash branding, colors, copy, or artwork with no launch timing,
  startup task, first-screen, asset, or fully usable state claim.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Startup scope ledger: platform, app type, target release build, device class, OS version, startup
  type, entry route, first frame definition, fully usable state definition, and whether the path is
  cold start, warm start, hot start, or process resume.
- Measurement ledger: Android Vitals, TTID, TTFD, `reportFullyDrawn()` timing, Macrobenchmark,
  Perfetto, Startup Profile, Baseline Profile, Xcode Organizer, Instruments App Launch, Time
  Profiler, release/profile device evidence, low-end physical device evidence, or an explicit
  static-only boundary.
- Launch critical-path ledger: process entry, app delegate or application class, ContentProvider
  auto-init, AndroidX App Startup initializers, dependency graph creation, SDK initialization,
  static initializers, top-level imports, app shell bootstrap, first route, first view controller or
  activity, and first navigation decision.
- Main-thread blocking ledger: synchronous disk reads, network calls, JSON parsing, database open,
  SQLite access, SharedPreferences, DataStore, UserDefaults, Keychain, secure storage, file scans,
  font loading, image decode, shader work, and strict-mode or profiler evidence.
- First usable state ledger: cached snapshot, local token, local config, remote config gate, feature
  flag gate, server validation, kill switch, offline behavior, first CTA availability, and
  post-first-frame refresh policy.
- First-screen render ledger: shell complexity, list size, nested scroll, custom chart, map, video,
  Lottie, blur, shadow, SVG, oversized launch resources, custom fonts, synchronous layout work,
  cached summary, and placeholder stability.
- Deferred work ledger: analytics, crash SDK, ad SDK, remote config refresh, feature experiments,
  migrations, cache cleanup, thumbnail regeneration, log compression, prefetch, warmup, telemetry,
  and idle or screen-entry queue ownership.
- Platform optimization ledger: Android R8, shrink or optimize settings, keep-rule side effects,
  Baseline Profile, Startup Profile, Macrobenchmark CI, Perfetto traces, AndroidX App Startup,
  on-demand modules, iOS dynamic frameworks, mergeable libraries, Objective-C `+load`, C++ static
  constructors, React Native Hermes, lazy loading, inline require, import graph, Flutter deferred
  components, shader warmup tradeoff, and Tauri or Electron preload cost.
- Existing tests, startup budgets, profiler traces, telemetry, build outputs, package surfaces,
  synchronized docs or templates, and configured command-intent evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required startup evidence is available from current files, diffs, docs, configured outputs, user
  evidence, or can be reported as missing without guessing.
- Review release or profile behavior, not only debug builds, simulators, emulators, hot-reload
  sessions, flagship devices, or local developer machines.
- If code touches auth, permissions, privacy, payments, migrations, storage, push, analytics, or
  third-party SDKs, also use the matching narrower security, data, migration, telemetry, or
  dependency skill when its trigger is present.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Move noncritical SDK initialization, analytics, remote config, feature experiments, ad SDKs,
  cache cleanup, log compression, prefetch, migrations, heavy parsing, and thumbnail work from
  pre-first-frame startup into post-first-frame, idle, background-safe, or screen-entry queues.
- Replace eager dependency graph construction, top-level imports, static initializers, app-wide
  service locator setup, and auto-initialized providers with lazy, scoped, or explicit startup
  owners when the repository evidence supports the change.
- Add or tighten startup budgets, measurement hooks, `reportFullyDrawn()` placement, first usable
  state tests, lazy-init tests, macrobenchmark-style harness integration, profiler notes, and
  synchronized docs or templates when the repository already has a pattern or configured intent.
- Simplify first-screen render work, use cached snapshots, defer server validation, limit remote
  config gates, reduce first-screen asset and font cost, and split on-demand modules when in scope.
- Do not hide slow startup behind a longer splash hold, fake `reportFullyDrawn()` early, remove
  necessary safety gates, skip required migrations unsafely, or trade correctness, auth, privacy,
  data integrity, crash diagnostics, accessibility, or user trust for a faster-looking first paint.
- Do not start raw Android Studio, Xcode, emulator, device, profiler, browser, package-manager,
  benchmark, or dev-server workflows outside the configured command contract.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the startup target before tuning.
   - Name cold start, warm start, hot start, process resume, or first route transition.
   - Name the user-visible first frame and the fully usable state separately.
   - For Android, distinguish TTID from TTFD and require `reportFullyDrawn()` to mark real usable
     completion, not an early metric shortcut.
   - For iOS, distinguish launch display, first screen readiness, and post-launch work visible in
     Xcode Organizer or Instruments.
2. Check measurement quality.
   - Prefer release or profile builds on a low-end physical device for startup claims.
   - Treat debug builds, simulators, emulators, hot reload, warm dev caches, and flagship-only
     evidence as weak or non-representative.
   - Use Android Vitals cold, warm, and hot startup thresholds, Macrobenchmark, Perfetto, Startup
     Profile, Baseline Profile, Xcode Organizer, Instruments App Launch, and Time Profiler only
     when they are configured or provided. Otherwise label the result as static startup risk.
3. Draw the launch critical path.
   - List every owner that runs before the first frame: OS entry, `Application.onCreate()`,
     `AppDelegate`, ContentProvider auto-init, AndroidX App Startup, dependency injection, SDK
     setup, static initializers, top-level imports, first route, first activity or view controller,
     first database open, and first network decision.
   - Mark whether each item is required for first pixels, required for first useful action, or
     deferrable.
4. Empty the application delegate or application class.
   - Do not treat `Application.onCreate()` or `AppDelegate` as a warehouse for analytics, crash SDKs,
     remote config, feature flags, A/B experiments, ad SDKs, database open, dependency graph build,
     cache warmup, and one-time cleanup.
   - Keep only the minimum process safety and routing prerequisites there.
5. Audit auto-init.
   - On Android, search ContentProvider and AndroidX App Startup initialization paths before blaming
     visible application code.
   - Disable or defer third-party auto-init when the SDK supports it and startup does not need it.
   - Keep a single explicit startup owner so SDK order and failure behavior are reviewable.
6. Shrink dependency graph creation.
   - Do not build the whole DI container, service locator, repository graph, database stack, or SDK
     registry before first frame when the first screen needs only a small subset.
   - Prefer lazy providers, route-scoped owners, and first-use construction with clear failure paths.
7. Hunt static initializer cost.
   - Check Kotlin `object` and companion object initialization, Java static blocks, Swift global
     constants, Objective-C `+load`, C++ static constructors, module-level JavaScript or Dart
     code, and Electron or Tauri preload side effects.
   - Move heavy parsing, disk reads, regex compilation, crypto setup, SDK access, and service
     creation out of static startup paths.
8. Remove main-thread disk and network before first frame.
   - Treat SharedPreferences, DataStore, UserDefaults, Keychain, secure storage, SQLite, JSON files,
     file scans, cache index reads, network fetches, DNS, TLS, and remote config calls as startup
     blockers until proven asynchronous and non-blocking.
   - Use platform strict-mode, profiler, or trace evidence when available; otherwise report static
     risk instead of claiming the path is clean.
9. Make first usable state mostly local.
   - Draw the first screen from a small cache snapshot, local token, and last-known safe config when
     product semantics allow it.
   - Defer server validation, full remote config refresh, feature experiment fetches, personalization,
     and secondary data until after first frame or screen entry.
   - Keep only a minimal synchronous kill switch or safety gate when the product truly needs it.
10. Keep migrations and maintenance off launch.
    - Do not run large database migrations, cache cleanup, thumbnail regeneration, log compression,
      full-text index rebuilds, media scans, or telemetry flushes before first frame.
    - Split required compatibility checks from heavy maintenance; schedule heavy work after first
      usable state with cancellation, retry, and failure visibility.
11. Make the first screen cheap.
    - Prefer a lightweight shell, primary CTA, cached summary, stable placeholders, and enough
      content for orientation.
    - Defer nested scroll containers, custom charts, maps, video, Lottie, shadows, blur, SVG-heavy
      illustrations, huge lists, and complex text measurement until after startup unless they are
      the core first task.
12. Keep launch assets and fonts small.
    - Use appropriately sized launch resources, not full-resolution marketing artwork.
    - Limit first-screen custom font families, weights, and icon fonts; use system or fallback fonts
      when the first usable state matters more than brand polish.
    - Avoid startup JSON parsing or asset manifest scans that exist only to select decoration.
13. Apply Android startup tooling deliberately.
    - Check R8 optimize and shrink behavior, keep-rule bloat, class loading, Baseline Profile,
      Startup Profile, Macrobenchmark coverage, Perfetto trace boundaries, and AndroidX App Startup
      ownership.
    - Use on-demand modules for large optional features when the module split is already supported
      or explicitly in scope.
14. Apply iOS startup tooling deliberately.
    - Review third-party framework count, dynamic framework loading, mergeable library options,
      Objective-C `+load`, C++ static constructors, global Swift initialization, and app delegate
      work.
    - Use Xcode Organizer, Instruments App Launch, and Time Profiler evidence when available.
15. Apply hybrid framework startup rules.
    - React Native: check Hermes, startup bundle size, lazy loading, `inline require`, import graph,
      top-level side effects, native module eager init, and whether one heavy import pulls in a
      screen that the first route does not need.
    - Flutter: check release or profile startup on device, deferred components, shader warmup as a
      tradeoff, synchronous plugin setup, isolate startup, and first-frame work.
    - Electron or Tauri: check preload script cost, window creation, sync filesystem access, eager
      native plugin load, and first window route imports.
16. Split work by launch phase.
    - Put only process-critical prerequisites before first frame.
    - Put visible first-screen requirements before fully usable state.
    - Put analytics, remote config refresh, prefetch, optional SDKs, cleanup, and warmup after first
      frame, idle, background-safe scheduling, or screen entry.
    - Give each deferred bucket an owner, cancellation rule, timeout, retry policy, and observability.
17. Verify or label the evidence.
    - Use configured tests, builds, docs checks, release checks, and mustflow checks for repository
      surfaces changed by the review.
    - Use platform traces, Macrobenchmark, Perfetto, Android Vitals, Xcode Organizer, and
      Instruments only when they are configured or supplied.
    - Report missing device, profiler, release-build, low-end-device, production telemetry, or
      benchmark evidence instead of claiming measured startup improvement.

<!-- mustflow-section: postconditions -->
## Postconditions

- Startup type, first frame, fully usable state, measurement quality, release/profile device
  boundary, launch critical path, app delegate or application class work, auto-init, dependency
  graph, static initializers, main-thread I/O, first-screen data source, auth and config gates,
  maintenance work, first-screen render complexity, assets, fonts, platform optimizations, hybrid
  framework import graph, deferred queue ownership, and verification evidence are explicit.
- Splash masking, early `reportFullyDrawn()` metric gaming, debug-only measurement, simulator-only
  claims, flagship-only claims, app delegate warehouses, ContentProvider surprise init, eager DI
  graph construction, SDK auto-init, static initializer cost, main-thread disk or network, network
  first-screen dependency, launch migrations, cache cleanup, heavy first screen, oversized launch
  assets, font bloat, React Native top-level import bloat, Flutter shader surprise, and unowned
  deferred work are fixed or reported.
- Startup performance claims are backed by configured tests, platform diagnostic evidence, static
  review evidence, or labeled as manual-only or missing.

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

Prefer the narrowest configured test, build, docs, release, or mustflow intent that covers the
changed startup surface and synchronized template surfaces. Do not infer raw Android Studio, Xcode,
emulator, physical device, profiler, platform dashboard, package-manager, benchmark, or dev-server
commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and
  the startup invariant it exercised before editing again.
- If first frame or fully usable state cannot be defined, report that startup performance is not
  reviewable yet instead of adding generic lazy loading.
- If release-build, device, profiler, or production telemetry evidence is missing, complete
  available static and configured-test evidence and report the missing measurement boundary.
- If safe repair requires product changes to auth, config, SDK policy, migration design, native
  module ownership, release profiling, platform entitlements, or third-party SDK settings outside
  scope, report the boundary instead of inventing commands.
- If startup speed conflicts with security, privacy, data migration integrity, crash reporting,
  accessibility, or user trust, keep the safer behavior and report the startup tradeoff.

<!-- mustflow-section: output-format -->
## Output Format

- App startup boundary reviewed
- Startup type, first frame, fully usable state, measurement quality, and evidence level
- Launch critical path, auto-init, dependency graph, static initializer, main-thread I/O, first data,
  auth/config gate, maintenance, first-screen render, asset/font, platform tooling, hybrid framework,
  and deferred-work findings
- Startup fixes made or recommended
- Evidence level: measured, configured-test evidence, static startup risk, manual-only, missing, or
  not applicable
- Command intents run
- Skipped startup diagnostics and reasons
- Remaining app-startup performance risk
