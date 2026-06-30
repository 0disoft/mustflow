---
mustflow_doc: skill.wails-code-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: wails-code-change
description: Apply this skill when Wails v3 applications, Go services, generated bindings, TypeScript runtime calls, windows, menus, system tray, dialogs, events, frontend bridge payloads, WebView platform behavior, Taskfile or build config, signing, packaging, custom protocols, file associations, server builds, or Wails-related tests are created, changed, reviewed, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.wails-code-change
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

# Wails Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Wails v3 application structure, Go service boundaries, generated binding compatibility, WebView platform behavior, native OS integration, and build or packaging contracts.

Treat Wails as a native shell around OS WebViews plus a Go-to-frontend bridge. Do not design it like Electron, a localhost web server, or a single browser runtime.

<!-- mustflow-section: use-when -->
## Use When

- `wails.json`, `build/config.yml`, `Taskfile.yml`, `go.mod`, Wails Go APIs, `application.New`, services, generated bindings, `@wailsio/runtime`, frontend calls to Go methods, events, raw messages, windows, menus, system tray, dialogs, browser, clipboard, autostart, notifications, file associations, custom protocols, single-instance handling, signing, packaging, server builds, or Wails tests change.
- A task touches Wails v2-to-v3 migration, Electron-to-Wails migration, multi-window design, bridge payloads, binding generation, platform WebView behavior, OS integration, or cross-platform packaging.
- The task writes durable guidance about Wails version status, Wails CLI or runtime versions, WebView2, WKWebView, WebKitGTK, GTK build tags, Taskfile behavior, or platform packaging.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is pure Go with no Wails app, service, binding, WebView, or packaging boundary; use `go-code-change`.
- The change is pure web frontend with no Wails runtime, bridge, native window, or packaged WebView behavior; use the matching frontend skill.
- The change is a Tauri app; use `tauri-code-change`.
- The task only updates external version prose; use `source-freshness-check` or `version-freshness-check` unless the Wails procedure itself changes.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Wails version track, Go module metadata, frontend package metadata, lockfiles, generated bindings, Taskfile and build config, Wails app entry point, service registration, window creation, event setup, menu or tray setup, dialog usage, and tests.
- Map of frontend calls to Go services: generated function, Go method, request DTO, response DTO, error contract, concurrency owner, cancellation path, and security or permission boundary.
- Window and native integration ledger: window name or id, owner, lifecycle, hide versus close policy, event subscriptions, runtime-ready handshake, menu projection, tray behavior, dialog decision flow, file association, custom protocol, and single-instance policy.
- Platform ledger: Windows WebView2 runtime and user-data folder assumptions, macOS WKWebView and signing or notarization expectations, Linux GTK/WebKitGTK target, build tags, package format, and unsupported or legacy distribution targets.
- Official or repository-local source evidence before preserving exact Wails status, alpha, release, CLI, runtime, package, platform dependency, or OS-support claims.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify whether the app is Wails v2 or Wails v3 before editing. Do not translate v2 `wails.Run` patterns by search-and-replace.
- Treat generated bindings, Go binary, frontend runtime package, lockfiles, and Wails CLI version as one compatibility set.
- Treat every frontend-provided path, URL, protocol payload, file association, raw message, event payload, and service argument as untrusted.
- Refresh official Wails sources before writing exact status, release-date, latest-version, WebView dependency, GTK/WebKitGTK, signing, or packaging claims. If freshness cannot be checked, keep durable wording version-agnostic and report the boundary.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep Wails-specific app assembly, service registration, window factories, menu/tray setup, event wiring, and build packaging surfaces synchronized.
- Keep Go services as app capability boundaries with typed DTOs, validation, thread-safe state, and explicit errors.
- Keep frontend calls thin around generated bindings and runtime event subscriptions with cleanup.
- Keep build and package changes in declared Wails config, Taskfile, Go module, frontend package, signing, installer, and docs surfaces.
- Do not expose debug, destructive, secret, filesystem, shell, updater, protocol, or raw-message behavior through exported Go methods without an explicit product and security boundary.

<!-- mustflow-section: procedure -->
## Procedure

1. Read Wails app entry points, `go.mod`, service files, generated bindings, frontend runtime imports, frontend call sites, event subscription sites, Taskfile, build config, package metadata, platform packaging files, and tests.
2. Identify Wails major version and runtime mode: v2, v3 alpha, server build, native window build, or migration. For v3, use the app and manager API model rather than v2 single-run assumptions.
3. Build an app ownership map:
   - application object and startup/shutdown owner;
   - registered services and resource owners;
   - windows, names, ids, and lifecycle policy;
   - menus, tray, dialogs, custom protocols, file associations, browser and clipboard operations;
   - frontend runtime import and binding generation path.
4. Build a bridge map for every frontend-to-Go call:
   - frontend wrapper or generated function;
   - Go method and service;
   - request and response DTO;
   - error shape;
   - mutable state touched;
   - cancellation or job id;
   - large payload, streaming, or batching decision;
   - security-sensitive input or output.
5. Treat exported Go service methods as an internal RPC surface. Remove accidental exports from binding reachability, or mark them ignored or internal using the repository's established Wails pattern.
6. Keep binding DTOs boring and explicit:
   - use strings for identifiers, money, precise timestamps, and large integers that JavaScript `number` cannot safely represent;
   - avoid returning domain models with unexported fields, file handles, channels, functions, broad `any` or `interface{}`, and complex cross-package aliases;
   - distinguish missing, null, empty, forbidden, and not-yet-loaded states with explicit DTO fields;
   - use `error` returns for expected failures and reserve panic for truly fatal programmer errors.
7. Guard concurrent calls. Wails bridge calls can run simultaneously, so protect shared Go service state with a clear owner, mutex, channel, worker, database transaction, or immutable snapshot. Do not store current user, selected document, request-local data, or window-local state in a shared service field unless it is keyed and synchronized.
8. Batch small repeated calls and keep large data off the ordinary call path. Use pagination, file handles, job ids, chunks, or progress events for large files, logs, binary blobs, or long-running output.
9. Treat raw messages and low-level runtime calls as escape hatches. Require explicit schema validation, origin or caller validation when applicable, response correlation, timeout, and failure reporting before accepting a raw-message path.
10. Design events as state notifications, not hidden data stores:
    - wait for the target window runtime-ready event before emitting into a new window;
    - keep and call unsubscribe functions for frontend and Go listeners;
    - distinguish app-wide broadcasts from window-specific events;
    - include request, window, workspace, or document ids when events target scoped state;
    - throttle high-frequency progress, resize, move, drag, log, or stream events.
11. Design windows as native lifecycle objects, not only frontend routes:
    - classify each window as singleton, document-scoped, temporary, tray-attached, hidden reusable, or close-and-dispose;
    - keep stable internal names separate from user-visible titles;
    - choose hide versus close deliberately;
    - use cancellable close hooks for unsaved work or protected shutdown flows;
    - store size and position with monitor, scale, and off-screen recovery policy.
12. Keep services, not windows, as long-lived resource owners. Database handles, file watchers, background workers, sync loops, and queues need startup, shutdown, cancellation, and wait paths independent of one window.
13. Treat menus, tray, dialogs, autostart, notifications, clipboard, browser open, custom protocols, file associations, and single-instance behavior as product policies:
    - keep macOS menu conventions separate from Windows and Linux window menus;
    - update menu and tray projections after state changes;
    - make dialogs asynchronous decision flows, not synchronous browser confirms;
    - validate URLs, paths, protocol payloads, clipboard data, and file association inputs in Go;
    - provide a fallback when tray support or notification features vary by desktop environment.
14. Check WebView platform behavior before blaming frontend code:
    - Windows uses WebView2 and has runtime, update, user-data folder, profile lock, and enterprise policy concerns;
    - macOS uses WKWebView and has ATS, WebContent process, inspector, minimum OS, signing, notarization, and bundle concerns;
    - Linux uses WebKitGTK and has GTK/WebKitGTK version, distro, portal, Wayland, AppImage, DEB/RPM, and driver concerns.
15. Check build and packaging as a first-class contract:
    - Wails v3 build and package behavior is Taskfile and build-config oriented;
    - do not assume one host can produce all signed distributable artifacts without platform-specific runners or signing steps;
    - keep WebView runtime strategy, installer format, macOS notarization, Linux distribution matrix, custom protocol registration, and file association registration explicit.
16. When migration is involved, reject search-and-replace migrations. Rebuild the app assembly around application, services, windows, managers, lifecycle, generated bindings, events, and build tasks.
17. Choose configured verification intents that cover Go code, frontend typecheck, generated bindings, package build, Wails build, platform package smoke, and docs. If those intents are missing, report the exact missing coverage.

<!-- mustflow-section: hard-bans -->
## Hard Bans

- Do not design Wails v3 as Electron with multiple browser windows and shared frontend-only state.
- Do not create or rely on a localhost API server unless the app explicitly chooses that integration pattern.
- Do not use `latest` CLI or runtime claims in durable docs without a refreshed source and lockfile strategy.
- Do not expose raw paths, raw URLs, raw protocol payloads, arbitrary shell commands, secrets, tokens, debug dumps, or destructive operations through exported Go methods.
- Do not send large binary or text payloads repeatedly through ordinary binding calls or high-frequency events.
- Do not broadcast window-local or sensitive state to every window.
- Do not ignore generated binding drift between Go services, frontend imports, runtime package, and CLI version.
- Do not fix platform-specific packaging failures by weakening security settings, signing assumptions, or dependency requirements without naming the platform tradeoff.

<!-- mustflow-section: postconditions -->
## Postconditions

- Wails major version, runtime package, generated bindings, and build surfaces are explicit.
- Go service methods, DTOs, errors, shared state, and concurrency ownership are clear.
- Window lifecycle, event subscriptions, menu/tray/dialog/native integration, and runtime-ready behavior are explicit.
- Platform WebView and packaging assumptions are recorded when touched.
- Missing Wails-specific verification is reported rather than hidden behind generic Go or frontend checks.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing Wails-specific intents when relevant: generated binding check, frontend typecheck, Go tests, race-sensitive tests, native Wails build, packaged WebView startup smoke, Windows WebView2 runtime check, macOS signing or notarization check, Linux GTK/WebKitGTK package check, custom protocol or file association smoke, tray/menu/dialog smoke, and server-build smoke.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If binding generation or runtime calls fail after version changes, check CLI, Go module, frontend runtime package, lockfile, generated binding, and binary compatibility before changing application logic.
- If a Wails app shows a blank window, check platform WebView startup, runtime-ready timing, built frontend assets, CSP or protocol configuration, and console evidence before rewriting UI state.
- If bridge calls race or return stale results, add request sequencing, cancellation, job ownership, or synchronized Go state before adding frontend retries.
- If a large payload stalls, move the payload to pagination, chunks, file handles, or pull-after-notification events.
- If a tray, menu, dialog, file association, protocol, or packaging behavior differs by OS, document and test the platform-specific path instead of forcing a fake cross-platform abstraction.
- If exact Wails version or platform support claims cannot be refreshed from official sources, keep the skill behavior version-agnostic and report the unverified source boundary.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Wails version, app assembly, service, bridge, binding, window, event, menu, tray, dialog, and OS integration notes
- WebView platform and packaging notes when touched
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Wails risk
