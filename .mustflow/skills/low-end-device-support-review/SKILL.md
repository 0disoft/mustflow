---
mustflow_doc: skill.low-end-device-support-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: low-end-device-support-review
description: Apply this skill when Android Go, low-RAM Android, older iOS, React Native, Flutter, Tauri mobile, Electron, desktop app shell, or other constrained-device support needs review for low-end target devices, runtime memory class, `isLowRamDevice()`, `getMemoryClass()`, cold-start frequency, peak memory, low memory killer, iOS dirty memory, memory warnings, `onTrimMemory()`, image decode sizes, GIF or Lottie cost, list virtualization, Compose recomposition, SwiftUI body work, main-thread work, frozen frames, blur, shadow, gradient, glass effects, SDK diet, remote config defaults, network fan-out, disk writes, cache limits, DB paging and indexes, background work, polling, sensors, permissions, bottom-percentile device measurement, and product-level p90 budgets.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.low-end-device-support-review
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

# Low-End Device Support Review

<!-- mustflow-section: purpose -->
## Purpose

Review low-end device support as a capability budget across CPU, GPU, RAM, storage, network,
startup, rendering, SDKs, and background work.

The review question is not "which single algorithm is slow?" It is "does the app try to wake too
many SDKs, decode too many pixels, make too many requests, open too much data, animate too much UI,
and keep too much cache at the same time for the weakest supported device?"

<!-- mustflow-section: use-when -->
## Use When

- Android Go, low-RAM Android, older iOS, React Native, Flutter, Tauri mobile, Electron, desktop app
  shell, TV, embedded, kiosk, or other constrained-device code is created, changed, reviewed, or
  reported with low-end, low RAM, weak CPU, weak GPU, small storage, slow disk, slow network,
  out-of-memory, low memory killer, LMK, ANR, hangs, frozen frames, dropped frames, slow startup,
  heavy first screen, image decode, GIF, Lottie, cache, database, SDK, polling, sensor, or
  background-work risk.
- Code or product policy touches `isLowRamDevice()`, `getMemoryClass()`, Android Go behavior,
  memory class, low-end mode, cache sizing, image sizing, animation reduction, prefetch width,
  request fan-out, list batch size, feature degradation, remote config defaults, SDK auto-init, or
  bottom-percentile device budgets.
- A final report claims low-end safe, Android Go safe, older-device safe, memory efficient,
  lightweight, responsive, low RAM compatible, production performance ready, or measured on weak
  devices.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only launch critical-path review from icon tap to first frame or fully usable state;
  use `app-startup-performance-review`.
- The task is only battery, wakeup, mobile radio, background scheduling, GPS, sensors, or Low Power
  Mode behavior; use `mobile-energy-efficiency-review`.
- The task is only browser per-frame work, INP, scroll jank, style, layout, paint, compositing, or
  DOM cost; use `frame-render-performance-review`.
- The task is only backend latency, service throughput, data-structure cost, N+1 access,
  allocation churn, or broad hot-path budgeting without a constrained-device surface; use
  `performance-budget-check` or a narrower performance skill.
- The task is only responsive layout, hostile content, keyboard, safe area, overflow, i18n, or
  visual resilience without runtime capability limits; use `frontend-stress-layout-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Target-device ledger: supported platforms, lowest comfort baseline, lowest support baseline,
  OS versions, memory class, RAM, storage, CPU/GPU class, screen density, network assumptions, and
  whether the target is Android Go, low-RAM Android, older iOS, emulator, simulator, or physical
  device.
- Measurement ledger: release or profile build evidence from bottom 10% devices, Android Vitals,
  crash, ANR, startup, slow rendering, frozen frame, LMK, wake lock, Perfetto, Macrobenchmark, iOS
  Organizer, Instruments, MetricKit, device traces, or an explicit static-only boundary.
- Product budget ledger: home first frame p90, fully usable p90, screen peak memory, image memory
  limit, cache limit, request fan-out, concurrency width, dropped-frame or frozen-frame target,
  background work count, SDK initialization timing, and feature degradation policy.
- Startup and first-screen ledger: cold-start frequency, TTID, TTFD, local cache, skeleton, local
  defaults, remote config, ContentProvider auto-init, AndroidX App Startup, Baseline Profile,
  Startup Profile, R8, first-screen API fan-out, first-screen image decode, first-screen list size,
  and post-first-frame work.
- Memory-pressure ledger: peak memory, average memory, Android LMK, zRAM, iOS dirty memory,
  `onTrimMemory()`, iOS memory warning, image cache, screen cache, hidden tabs, search results,
  temporary models, and cleanup behavior.
- Rendering and list ledger: main-thread work, frozen frames over 700ms, 16ms frame budget,
  transform, opacity, rotation, layout-property animations, blur, shadow, gradient, glass effects,
  list virtualization, stable keys, lazy layout, Compose `remember`, `derivedStateOf`, delayed state
  reads, SwiftUI `body`, and offscreen work.
- Data, network, and disk ledger: thumbnail versus original image sizing, GIF or video or Lottie
  choice, API field selection, first-screen API fan-out, DB query shape, indexes, sort, paging,
  selected columns, SQLite WAL, transactions, JSON, plist, XML, cache bounds, LRU policy, and batch
  disk writes.
- SDK and background ledger: first-run essential SDKs, after-first-screen SDKs, feature-entry SDKs,
  analytics, ads, CRM, chat, session replay, A/B tests, crash reporting, remote config, payments,
  maps, push token, auto screen tracking, WorkManager, polling, wake locks, sensors, location, and
  permission start or stop ownership.
- Existing tests, profiler traces, telemetry, build outputs, package surfaces, synchronized docs or
  templates, and configured command-intent evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required low-end evidence is available from current files, diffs, docs, configured outputs,
  user-provided evidence, or can be reported as missing without guessing.
- Review release or profile behavior on weak physical devices when making performance claims. Treat
  debug builds, simulators, emulators, hot reload, flagship-only testing, and warm developer caches
  as weak evidence unless the task explicitly scopes them.
- If the change touches auth, privacy, payments, migrations, storage, permissions, telemetry,
  background services, or third-party SDK behavior, also use the narrower matching skill when its
  trigger is present.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten runtime capability detection, low-end mode switches, target-device budgets, cache
  bounds, image decode sizing, first-screen local defaults, skeleton or cached data paths, SDK
  deferral, remote config fallback, API field reduction, request fan-out limits, screen-level
  concurrency queues, list virtualization, animation reduction, memory-warning cleanup, disk-write
  batching, database paging and indexes, background-work constraints, polling removal, sensor stop
  paths, low-end telemetry, and focused tests.
- Stage SDKs into first-run essential, after-first-screen, and feature-entry groups when repository
  evidence supports the change.
- Reduce decorative blur, shadow, gradient, glass, GIF, complex Lottie, offscreen animation,
  oversized thumbnails, unbounded cache, eager prefetch, and hidden-tab retention when they harm
  the target device budget.
- Do not fake low-end support by only adding a model blacklist, longer splash hold, spinner, reduced
  marketing copy, or generic "optimize later" comment.
- Do not remove correctness, safety, auth, privacy, crash diagnostics, accessibility, required
  migration integrity, or user-critical behavior merely to fit a low-end budget.
- Do not start raw Android Studio, Xcode, emulator, device lab, profiler, dashboard, dev-server,
  package-manager, or telemetry workflows outside the configured command contract.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the low-end product contract before tuning.
   - Name the comfort baseline and support baseline separately.
   - Define p90 home first frame, p90 fully usable state, screen peak memory, image memory limit,
     cache limit, dropped-frame or frozen-frame threshold, background work count, API fan-out, and
     SDK initialization timing.
   - If budgets do not exist, report that low-end support is policy-incomplete instead of treating
     isolated micro-optimizations as a complete answer.
2. Check measurement quality.
   - Prefer release or profile builds on bottom 10% physical devices.
   - Use Android Vitals, LMK reports, ANR, frozen frames, startup, wake locks, Perfetto,
     Macrobenchmark, iOS Organizer, Instruments, and MetricKit only when configured or supplied.
   - Label static-only review clearly when device, profiler, release-build, or field evidence is
     missing.
3. Detect capability at runtime.
   - Use platform capability signals such as `isLowRamDevice()` and `getMemoryClass()` where
     available.
   - Avoid model-name blacklists as the primary decision because vendor, region, carrier, and
     custom builds drift.
   - Tie capability to concrete limits: image resolution, cache size, animation, prefetch count,
     concurrency width, list batch size, and feature entry.
4. Treat cold start as common on low-end devices.
   - Low-end users often hit cold start more often because the OS kills background processes.
   - Separate TTID from TTFD and first frame from useful state.
   - Route startup-only launch work to `app-startup-performance-review` while keeping low-end
     capability budgets here.
5. Keep process entry small.
   - Keep `Application.onCreate()`, `AppDelegate`, first Activity, and first ViewController limited
     to process-critical work.
   - Defer analytics, ad SDKs, remote config refresh, push token, payments, maps, chat, A/B tests,
     database open, cache cleanup, and prefetch until after first frame or feature entry unless
     product safety requires them.
6. Audit hidden Android startup.
   - Check ContentProvider auto-init and AndroidX App Startup ownership before assuming visible
     application code controls launch.
   - Disable or defer auto-init when the SDK supports it and first screen does not require it.
7. Keep remote config local-first.
   - Provide local defaults for feature flags and low-end limits.
   - Let server values update after the first usable state when product semantics allow it.
   - Report any experiment, kill switch, or remote config that blocks first screen without a local
     fallback.
8. Protect the main thread.
   - Treat main-thread UI work as scarce. Move image decode, JSON parsing, DB open, decompression,
     recommendation computation, cache cleanup, and network waits off the immediate UI path.
   - Fix frozen frames over 700ms before spending effort on tiny 16ms frame optimizations.
   - Keep 16ms frame budgets and input responsiveness visible as constraints, not as proof without
     trace evidence.
9. Reduce expensive pixels.
   - Prefer transform, opacity, and rotation for animation.
   - Avoid per-frame width, height, margin, padding, constraint, or layout-property changes.
   - Limit repeated blur, shadow, gradient, glass, translucent layer, and complex effect use,
     especially inside list cells.
10. Watch peak memory, not only averages.
    - Review screen transitions, image-heavy screens, search, maps, media, hidden tabs, and cached
      results for peak memory spikes.
    - On Android, account for LMK and zRAM pressure. On iOS, account for dirty memory.
    - Do not approve "average memory is fine" when one screen can spike over the device budget.
11. Make memory pressure handlers real.
    - Use `onTrimMemory()` and iOS memory warning paths to release image cache, screen cache, search
      results, temporary models, hidden-tab data, decoded bitmaps, and stale prefetch.
    - Test or report the missing test boundary for these cleanup paths.
12. Cap concurrency by screen.
    - Avoid running image decode, JSON parsing, DB queries, decompression, recommendation compute,
      and prefetch all at once.
    - Use screen-level or feature-level queues with cancellation, backpressure, timeout, and owner
      visibility.
13. Decode images to display size.
    - Never decode original images for thumbnails.
    - Treat large `ARGB_8888` images as memory events; a 4048x3036 image can be about 48MB when
      fully decoded.
    - Use thumbnail URLs, server transforms, downsampling, hardware bitmap policy, and low-end image
      quality limits where the platform and project support them.
14. Degrade animated media.
    - Treat GIF as disabled or heavily restricted in low-end mode unless it is core user content.
    - Prefer small video or static fallback where product semantics allow it.
    - Keep Lottie simple; complex vector animation can become CPU work even when it looks light.
15. Keep lists visible-only.
    - Use lazy layout or virtualization, stable keys, bounded buffers, and paging.
    - Avoid pre-rendering offscreen cells, measuring every cell repeatedly, decoding every image
      eagerly, or changing keys across updates.
16. Keep declarative UI bodies cheap.
    - In Compose, use `remember`, `derivedStateOf`, stable models, and delayed state reads to avoid
      recomputing sort, filter, date, permission, and price work during composition.
    - In SwiftUI, keep `body` dumb; move formatters, image resizing, sorting, filtering, and state
      combination into a view model or preparation layer.
17. Bound caches.
    - Set smaller RAM cache limits for low-end mode and define eviction behavior.
    - Prefer LRU or project-standard bounded eviction over unbounded maps.
    - Release screen-local caches on screen exit when the next screen needs memory more than the
      previous screen needs instant restore.
18. Shape database work for scroll.
    - Review index fit, sort order, paging, selected columns, and query count for home feeds, chats,
      notifications, and other frequently opened lists.
    - Use SQLite WAL and transactions where the repository already supports them and the write path
      needs batching.
    - Do not overfetch full records just to render thumbnails or list rows.
19. Batch disk writes.
    - Avoid rewriting a large JSON, plist, or XML file for a tiny value change.
    - Coalesce autosave, scroll position, telemetry, cache metadata, and preferences writes.
    - Prefer partial updates, append or merge strategies, or a database when frequent small updates
      outgrow a single serialized blob.
20. Reduce first-screen network fan-out.
    - Fetch only the fields and thumbnails needed for orientation and first action.
    - Defer detailed data until screen entry.
    - Avoid many parallel first-screen APIs that create CPU, memory, radio, TLS, JSON, and retry
      pressure at once.
21. Respect mobile background and sensor cost.
    - Use system-batched work such as WorkManager when durable background work can wait.
    - Avoid wake locks, polling, and exact periodic refresh by default.
    - Start GPS, camera, microphone, Bluetooth, Wi-Fi scan, and other sensors only for explicit
      visible value, use coarse location where enough, and stop when the screen or task ends.
22. Put the app on an SDK diet.
    - Classify SDKs as first-run essential, after-first-screen, or feature-entry only.
    - Review analytics, ads, CRM, chat, session replay, A/B testing, crash reporting, remote config,
      payments, maps, and push setup.
    - Disable auto screen tracking, unused event collection, eager modules, and hidden auto-init
      where product and SDK policy allow it.
23. Define low-end degradation as a product behavior.
    - Name which image resolution, cache size, animation, prefetch, list batch size, background
      work, SDK timing, recommendation, ML, or ornamental effect changes under low-end mode.
    - Keep user-critical safety, accessibility, auth, privacy, payment, and data-integrity paths
      explicit.
24. Verify or report the gap.
    - Use configured tests, builds, docs checks, release checks, and mustflow checks for changed
      repository surfaces.
    - Use device, profiler, platform dashboard, and field telemetry evidence only when configured or
      supplied.
    - Report missing bottom-percentile device evidence, release-build traces, low-memory simulation,
      memory-warning tests, startup traces, list-scroll traces, or field telemetry instead of
      claiming measured low-end improvement.

<!-- mustflow-section: postconditions -->
## Postconditions

- Target-device baseline, capability detection, low-end mode, p90 budgets, startup and first-screen
  boundary, memory pressure, peak memory, main-thread work, frozen frames, image decode, animated
  media, list virtualization, Compose or SwiftUI work, cache limits, DB shape, disk writes, network
  fan-out, background work, polling, sensors, SDK staging, degradation policy, and evidence level
  are explicit.
- Model blacklist shortcuts, splash masking, local-default gaps, hidden ContentProvider auto-init,
  eager SDK setup, remote-config blocking, first-screen API fan-out, main-thread decode or parsing,
  frozen frames, layout-property animation, repeated blur or shadow, peak memory spikes, no-op
  memory warnings, unbounded caches, original-size thumbnails, GIF decoration, unstable list keys,
  heavy Compose or SwiftUI body work, overfetching DB queries, giant JSON rewrites, polling, sensors
  left on, and first-run SDK bloat are fixed or reported.
- Low-end support claims are backed by configured tests, device or telemetry evidence, static review
  evidence, or labeled as manual-only or missing.

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
changed low-end support surface and synchronized template surfaces. Do not infer raw Android
Studio, Xcode, emulator, device, profiler, platform dashboard, package-manager, benchmark,
telemetry, or dev-server commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and
  the low-end invariant it exercised before editing again.
- If target-device baselines or budgets are missing, report that low-end support cannot be fully
  judged yet instead of adding isolated optimizations.
- If release-build, weak-device, profiler, memory-warning, platform-dashboard, or production
  telemetry evidence is missing, complete available static and configured-test evidence and report
  the missing measurement boundary.
- If safe repair requires product requirement changes, native permission policy, third-party SDK
  dashboard changes, device lab testing, production telemetry, or platform-specific implementation
  outside the current scope, report the boundary instead of inventing commands.
- If low-end performance conflicts with security, privacy, payment correctness, migration
  integrity, crash reporting, accessibility, or user trust, keep the safer behavior and report the
  tradeoff.

<!-- mustflow-section: output-format -->
## Output Format

- Low-end device support boundary reviewed
- Target-device baseline, budgets, capability detection, startup, memory, rendering, list, data,
  network, disk, background, sensor, SDK, degradation, and evidence findings
- Low-end support fixes made or recommended
- Evidence level: measured, configured-test evidence, static low-end risk, manual-only, missing, or
  not applicable
- Command intents run
- Skipped low-end diagnostics and reasons
- Remaining low-end device support risk
