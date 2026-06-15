---
mustflow_doc: skill.mobile-energy-efficiency-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: mobile-energy-efficiency-review
description: Apply this skill when Android, iOS, React Native, Flutter, Tauri mobile, or other mobile app code is created, changed, reviewed, or reported and battery, energy, background work, wake locks, exact alarms, push or WebSocket behavior, polling, networking, cellular use, location, sensors, Bluetooth, rendering, animation, timers, disk I/O, Compose recomposition, Low Power Mode, Battery Saver, or platform energy diagnostics need review for whether the app wakes the phone, radio, GPS, sensors, GPU, CPU, or storage only when the user value justifies it.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.mobile-energy-efficiency-review
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

# Mobile Energy Efficiency Review

<!-- mustflow-section: purpose -->
## Purpose

Review mobile battery use as wakeup, radio, sensor, location, rendering, timer, and I/O pressure,
not as a generic CPU speed problem.

The review question is not "is this code fast?" It is "does this app avoid waking the phone,
cellular radio, GPS, sensors, GPU, CPU, and storage when the screen is not asking for it, and does
it degrade correctly under mobile OS power policy?"

<!-- mustflow-section: use-when -->
## Use When

- Android, iOS, React Native, Flutter, Tauri mobile, Kotlin Multiplatform, native mobile SDK, or
  hybrid mobile app code creates, changes, reviews, or reports background work, scheduled work,
  foreground services, WorkManager, JobScheduler, BackgroundTasks, `beginBackgroundTask`, wake
  locks, exact alarms, push notifications, WebSockets, polling, network sync, uploads, downloads,
  prefetch, retries, offline sync, cellular behavior, Low Data Mode, Battery Saver, Low Power Mode,
  location, geofencing, route tracking, sensors, Bluetooth, BLE scanning, rendering, animation,
  spinners, timers, disk writes, Compose recomposition, image decoding, or cache behavior.
- A final report claims a mobile path is battery-friendly, background-safe, Doze-safe,
  App-Standby-safe, low-power-aware, network-efficient, location-efficient, render-efficient,
  sensor-efficient, or safe for app-store or Play quality expectations.
- A bug report mentions battery drain, hot phone, background drain, high energy impact, excessive
  wakeups, excessive wake locks, poor standby life, runaway GPS, constant network activity, cellular
  drain, UI jank plus battery drain, or the app staying active after the user leaves.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is purely web Core Web Vitals, browser rendering, bundle size, first render, or DOM
  frame work outside a packaged mobile app; use the matching web performance skill first.
- The task is primarily memory ownership, listener cleanup, native handle lifetime, or retained
  Activity or View references; use `memory-lifetime-review` first and this skill only for energy
  consequences.
- The task is primarily API rate limiting, backend cost control, retry amplification, or cloud
  spend; use the relevant backend, rate-limit, retry, or cost skill first.
- The operation is a pure local calculation with no mobile runtime, wakeup, background, network,
  location, sensor, UI, timer, storage, or platform power-mode implication.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Energy evidence ledger: Android Vitals, Power Profiler, Macrobenchmark power metric, system
  tracing, Xcode Organizer, MetricKit, Instruments Power Profiler, device logs, battery-drain
  reports, or an explicit note that only static evidence is available.
- User-value ledger: screen or feature, foreground versus background state, user-visible outcome,
  freshness requirement, completion requirement, acceptable delay, cancellation behavior, and
  whether the work can be batched, deferred, or skipped.
- Background work ledger: coroutine, thread, async task, WorkManager, JobScheduler, foreground
  service, exact alarm, push, BackgroundTasks, `beginBackgroundTask`, app lifecycle callback,
  queue, retry, and expiration handling.
- Wakeup and radio ledger: polling, push, WebSocket, network callback, sync cadence, batch size,
  request count, upload/download size, cellular versus Wi-Fi, expensive or constrained network
  policy, retry policy, and offline behavior.
- Location, sensor, and Bluetooth ledger: requested accuracy, update interval, max delay,
  geofence responsiveness, background permission, one-shot versus continuous location, motion
  update interval, observer lifecycle, BLE scan and notification policy.
- Rendering and UI ledger: offscreen work, background animations, overdraw, opacity, blur, shadow,
  frame rate, infinite loader, Compose stability, recomposition triggers, image decode, list cell
  effects, and reduced motion or low-power behavior.
- Timer and storage ledger: repeated timer, tolerance, invalidation, dispatch source, file write
  frequency, database batching, cache persistence, autosave cadence, and app-state flush behavior.
- Platform power-mode ledger: Android Doze, App Standby, Battery Saver, iOS Low Power Mode, Low
  Data Mode, background execution entitlement, permission policy, store policy, and user-visible
  fallback.
- Observability and test evidence: metrics, logs, traces, counters, wakeup counts, job outcome
  events, timeout or expiration logs, power-mode tests, lifecycle tests, fake-clock tests, and
  configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required energy, user-value, background, wakeup, radio, location, sensor, rendering, timer,
  storage, power-mode, observability, and test evidence is available, or missing evidence can be
  reported without guessing.
- Existing mobile lifecycle, background task, networking, location, sensor, rendering, timer,
  storage, telemetry, and test patterns have been searched before adding new shapes.
- If the feature affects money, safety, medical, navigation, authentication, permissions, privacy,
  or legal retention, also apply the relevant security, privacy, payment, data, or failure skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten lifecycle cancellation, WorkManager or JobScheduler constraints, BackgroundTasks
  usage, wake lock timeout and release paths, exact alarm justification, push priority, network
  batching, callback-based network state, cellular and constrained-network policy, location
  accuracy and interval, geofence responsiveness, background-location stop behavior, sensor or BLE
  stop behavior, render throttling, animation stop, frame-rate lowering, timer tolerance, disk I/O
  batching, low-power degradation, observability, and focused tests.
- Replace unbounded background services, always-on WebSockets, frequent polling, exact alarms for
  non-user-critical work, wake locks without timeout and release, continuous GPS for coarse needs,
  always-on sensors, duplicate BLE scans, offscreen animations, overdraw-heavy UI, infinite loaders,
  zero-tolerance timers, and per-keystroke disk writes when in scope.
- Do not add live device tests, store-console actions, production telemetry queries, background
  workers, local servers, platform dashboards, or raw mobile build commands outside the configured
  command contract.
- Do not treat a battery fix as proof of memory safety, privacy compliance, permission safety,
  backend rate limiting, offline sync correctness, or UI performance without matching evidence.

<!-- mustflow-section: procedure -->
## Procedure

1. Start with measurement or mark static-only evidence.
   - Prefer current platform evidence such as Android Vitals, Power Profiler, Macrobenchmark power
     metric, system tracing, Xcode Organizer, MetricKit, or Instruments Power Profiler.
   - If only code review is available, say so. Do not invent battery savings from intuition.
   - Treat older or lightly maintained diagnostic tools as optional context, not the only proof.
2. Classify the user value and urgency.
   - Name whether the work is visible foreground work, user-started completion work, silent sync,
     prefetch, telemetry, upload, notification, navigation, safety, or convenience.
   - Screen-visible work can often be cancelled when the screen disappears.
   - User-started completion work can finish briefly in the background.
   - Silent convenience work should usually wait, batch, or be skipped under power pressure.
3. Split foreground tasks from durable background work.
   - Use ordinary coroutine, thread, async task, or lifecycle-scoped work for visible-only work.
   - Use Android WorkManager, JobScheduler, or iOS BackgroundTasks-style scheduling for work that
     must finish after the user leaves and can tolerate OS scheduling.
   - Do not treat a background worker as a license to run immediately or forever.
4. Reject unbounded Android background services.
   - A long-running background Service or foreground service should have a user-visible reason,
     platform permission basis, notification behavior, stop condition, and fallback.
   - Assume Android background limits, foreground-service restrictions, Doze, and App Standby can
     delay or stop work.
   - If the product needs exact real-time work, name the user-visible reason and platform policy
     evidence.
5. Design for Doze and App Standby.
   - Network, jobs, alarms, wake locks, and background work can be delayed or suppressed by the OS.
   - Replace "run every N seconds/minutes exactly" with retryable, resumable, batched work unless
     there is a true user-facing deadline.
   - Persist enough progress to resume after delay, process death, or maintenance-window execution.
6. Treat exact alarms as scarce.
   - Standard alarms can be delayed under power policy.
   - Allow-while-idle or exact-while-idle alarms should be reserved for genuinely user-critical
     deadlines such as alarm, calendar, safety, or payment-deadline behavior.
   - Report missing platform permission, throttling, fallback, and user-visible justification.
7. Treat wake locks as emergency medicine.
   - Prefer platform-managed work APIs before manual wake locks.
   - If a wake lock remains, require a timeout, shortest possible scope, `try/finally` or
     equivalent release, cancellation release, exception release, and observability for acquire and
     release.
   - Do not hold wake locks across network calls without tight timeout and cancellation policy.
8. Prefer shared push over app-owned always-on sockets.
   - For mobile notifications and server-triggered wakeups, prefer platform push channels such as
     FCM or APNs when the feature fits.
   - Use high-priority push only when it leads to user-visible, time-sensitive behavior.
   - Do not keep WebSocket, MQTT, or polling connections alive in the background for speculative
     prefetch or invisible freshness.
9. Batch network work.
   - Prefer fewer larger transactions over many tiny wakeups when freshness allows it.
   - Coalesce sync, telemetry, uploads, and refreshes instead of firing each event immediately.
   - Respect expensive, constrained, metered, Low Data Mode, roaming, poor-signal, and offline
     conditions.
   - Use connectivity callbacks instead of periodic "are we online?" polling.
10. Put constraints on heavy sync.
    - For Android scheduled work, consider unmetered network, charging, idle, battery-not-low, and
      storage-not-low constraints when the work is not urgent.
    - For iOS networking, decide whether constrained or expensive network access is allowed and
      whether the request should wait for connectivity.
    - Report product requirements that conflict with battery-friendly constraints.
11. Lower location accuracy first.
    - Do not use high accuracy or GPS for coarse place lookup, nearby content, analytics, or
      personalization unless the feature proves it needs it.
    - Prefer balanced, low-power, no-power, reduced-accuracy, or last-known strategies where safe.
    - Treat background location permission as a high-risk energy and privacy surface.
12. Stop one-shot location after one shot.
    - Use one-time location APIs when only one coordinate is needed.
    - If continuous updates are used, stop them when the feature completes, screen disappears, or
      accuracy is good enough.
    - On iOS, pair background location enablement with automatic pauses, appropriate activity type,
      explicit stop, and restoring background updates to false when no longer needed.
13. Batch and slow continuous location.
    - Use the longest acceptable interval for background updates.
    - Use max update delay or deferred update behavior when batch delivery still satisfies product
      value.
    - For geofences, avoid instant responsiveness unless the user-facing feature needs it.
14. Stop sensors and BLE when done.
    - Motion, orientation, accelerometer, gyroscope, magnetometer, camera, microphone, and BLE scan
      work should have clear start and stop ownership.
    - Increase sensor update intervals to the lowest useful frequency.
    - Stop BLE scan after finding the target, avoid duplicate discovery unless needed, and prefer
      notification/subscription over polling for value changes.
15. Stop invisible UI work.
    - When the app backgrounds or a screen disappears, stop animations, progress UI, timers, image
      work, layout loops, and screen-only state updates that no user can see.
    - Keep durable state changes separate from decorative or visual progress.
    - Do not let a spinner, shimmer, Lottie animation, or progress timer run forever behind another
      screen or in background.
16. Reduce pixels and frames.
    - Check Android overdraw, duplicated backgrounds, translucent overlays, nested cards, wrapper
      views, blur, shadows, and large invalidated regions.
    - On iOS, treat opacity, translucent blur, shadows, and high frame rate as costs that must be
      justified by the screen.
    - Lower frame rate for menus, settings, static feeds, loading decoration, and non-interactive
      surfaces where the platform and UI stack support it.
17. Make Compose and declarative UI stable.
    - Stable models let Compose or similar declarative UI skip work; unstable mutable models can
      cause needless recomposition.
    - Avoid passing mutable lists, changing lambdas, large state bags, or module-boundary types that
      the UI runtime cannot prove stable.
    - Track recomposition evidence before claiming the UI is energy-efficient.
18. Give timers slack.
    - Repeating timers wake the CPU. Invalidate them when the screen or task ends.
    - Use timer tolerance, coalescing, debouncing, dispatch sources, lifecycle-aware flows, or
      platform schedulers when exact ticks are not needed.
    - Avoid 1-second or sub-second timers for decorative UI, polling, autosave, or progress that
      can be event-driven.
19. Batch disk I/O.
    - Write only when data changed.
    - Coalesce autosave, cache persistence, telemetry, and app-state writes.
    - Avoid rewriting large JSON or preference blobs on every keystroke, scroll event, or sensor
      sample; use a database or append/merge strategy when partial updates are frequent.
20. React to Low Power Mode and Battery Saver as product states.
    - Define which animation, sync, backup, location, prefetch, ML inference, image decode, and
      background behavior is disabled, delayed, or simplified.
    - Preserve user-critical and safety-critical behavior explicitly.
    - Make the degraded path observable and testable.
21. Keep energy telemetry useful and low-risk.
    - Log job reason, lifecycle state, power mode, network class, constraint decision, location mode,
      wake lock scope, push priority, background expiration, retry count, and stop reason where safe.
    - Keep metrics labels bounded; do not label by user id, raw URL, coordinate, BLE device address,
      payload, or trace id.
    - Include both "started" and "stopped" or "expired" evidence for background work, sensors,
      location, BLE, timers, and wake locks.
22. Test the ugly edges.
    - Cover backgrounding, screen disappear, cancellation, process death resume, Doze or standby
      simulation when configured, Battery Saver or Low Power Mode policy, constrained network,
      offline-to-online callback, location permission downgrade, sensor stop, BLE scan stop, timer
      invalidation, wake lock release on exception, and background-task expiration.
    - If device, emulator, Xcode, Android Studio, store-console, or production telemetry evidence is
      not configured, report that boundary as manual-only instead of approving battery behavior.

<!-- mustflow-section: postconditions -->
## Postconditions

- Measurement status, user value, foreground versus background boundary, OS scheduling, Doze or
  App Standby behavior, exact alarm use, wake lock scope, push versus socket choice, network
  batching, cellular constraints, location accuracy and duration, geofence responsiveness, sensor
  and BLE lifecycle, invisible UI work, overdraw and effects, frame rate, Compose stability, timer
  tolerance, disk I/O batching, Low Power Mode or Battery Saver behavior, telemetry, and tests are
  explicit.
- Unbounded background services, exact periodic sync fantasies, wake locks without timeout, high
  priority push for invisible prefetch, constant WebSocket background connections, polling,
  cellular-as-Wi-Fi assumptions, high-accuracy location by default, forgotten continuous location,
  instant geofence marketing, background location left enabled, unclosed sensors, endless BLE scan,
  offscreen animation, overdraw, excessive blur or shadow, high FPS decoration, infinite loaders,
  unstable Compose models, zero-tolerance timers, per-keystroke disk writes, and low-power blindness
  are fixed or reported.
- Mobile energy claims are backed by configured tests, platform diagnostic evidence, static review
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
changed mobile energy policy and synchronized template surfaces. Do not infer raw Android Studio,
Xcode, emulator, device, store-console, telemetry, background-service, or platform-dashboard checks
outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and
  the energy invariant it exercised before editing again.
- If the user value or urgency cannot be named, report that the energy tradeoff is not reviewable
  yet.
- If platform power behavior cannot be tested locally, complete available static and unit evidence
  and report missing device, emulator, profiler, or production telemetry evidence.
- If safe repair requires product requirement changes, native permission policy, store policy,
  platform entitlement, device lab testing, production telemetry, or OS-specific implementation
  outside the current scope, report the missing boundary instead of inventing commands.

<!-- mustflow-section: output-format -->
## Output Format

- Mobile energy boundary reviewed
- Measurement status, user value, background work, OS scheduling, exact alarm, wake lock, push or
  socket, network batching, cellular or constrained network, location, geofence, sensor, BLE, UI
  rendering, animation, frame rate, Compose or declarative UI stability, timer, disk I/O, low-power
  mode, telemetry, and test findings
- Mobile energy fixes made or recommended
- Evidence level: configured-test evidence, platform diagnostic evidence, static review risk,
  manual-only, missing, or not applicable
- Command intents run
- Skipped mobile energy diagnostics and reasons
- Remaining mobile energy risk
