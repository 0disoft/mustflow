---
mustflow_doc: skill.webview2-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: webview2-code-change
description: Apply this skill when Microsoft Edge WebView2 code, SDK or Runtime selection, CoreWebView2Environment initialization, user data folders, profiles, web messages, host objects, document or frame trust, navigation, popups, downloads, permissions, process failures, memory or performance behavior, Evergreen or Fixed Version deployment, WPF, WinForms, WinUI, or Win32 WebView2 tests are created, changed, reviewed, debugged, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.webview2-code-change
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

# WebView2 Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve WebView2's runtime, process, storage, initialization, native-bridge, navigation, threading,
lifecycle, security, performance, update, and deployment boundaries across WPF, WinForms, WinUI,
and Win32 hosts.

Treat WebView2 as a Chromium process group, a persistent browser profile, and a native RPC boundary,
not as a browser-shaped UI control whose lifetime ends when a window disappears.

<!-- mustflow-section: use-when -->
## Use When

- `Microsoft.Web.WebView2`, `CoreWebView2*`, `ICoreWebView2*`, `EnsureCoreWebView2Async`,
  `CreationProperties`, `WebMessageReceived`, `PostWebMessageAsJson`, host objects, virtual host
  mappings, document or frame origins, navigation events, popups, downloads, permissions, process
  events, profiles, or user data folders change.
- A WPF, WinForms, WinUI, or Win32 application creates, disposes, recycles, packages, diagnoses, or
  tests WebView2 controls or environments.
- The task chooses or changes Evergreen versus Fixed Version Runtime distribution, feature
  detection, prerelease SDK usage, runtime update adoption, or enterprise update policy.
- The task investigates initialization failures, incompatible environment options, UDF locks,
  bridge authorization, stale document responses, Runtime update adoption, process-failure
  classification, memory retention, process growth, shutdown delay, rendering stalls, GPU behavior,
  popup or download bugs, or packaged Runtime availability.
- Durable guidance makes exact claims about current WebView2 SDKs, Runtimes, preview channels,
  release cadence, API stability, platform support, or distribution requirements.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is ordinary frontend code with no WebView2 host, native bridge, profile, runtime, or
  packaged behavior; use the matching frontend skill.
- The task changes a Tauri or Wails application without direct WebView2 APIs or Windows-specific
  runtime behavior; use `tauri-code-change` or `wails-code-change`.
- The task is only generic desktop memory analysis with no WebView2-specific lifecycle or process
  boundary; use `desktop-memory-footprint-review`.
- The task only refreshes an external version statement and does not change WebView2 procedure;
  use `source-freshness-check` or `version-freshness-check`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Host stack and target: WPF, WinForms, WinUI, or Win32; packaged or unpackaged; architecture;
  minimum Windows version; installed SDK package; Runtime distribution mode; and target channels.
- Environment ledger: Runtime executable folder, normalized user data folder, environment options,
  profile name, InPrivate choice, owner, sharing boundary, initialization call sites, and first
  navigation trigger.
- Trust ledger: top-level origins, frame origins, virtual host mappings, remote content, injected
  scripts, web-message commands, host objects, native capabilities, navigation and redirect policy,
  popups, downloads, permissions, external schemes, and document-generation rules.
- Ownership ledger: control, controller, environment, profile, process group, document generation,
  frame, navigation, child window, download, deferral, event subscription, pending bridge request,
  disposal, update, and restart owners.
- Failure evidence: exception or HRESULT, effective environment options, actual UDF path, Runtime
  and SDK versions, process kind, source origin, crash reason, packaged or unpackaged state, and
  reproduction sequence.
- Performance evidence: browser, renderer, GPU, or helper process identity; WebView and window
  count; navigation id; page and host timestamps; bridge request ids; memory metric; DevTools or OS
  trace; hidden or suspended state; and before-open, steady-state, after-close, and repeated-cycle
  observations.
- Current official Microsoft documentation before preserving exact version, release-date,
  stable-versus-prerelease, API phase, runtime cadence, or deployment claims.
- Configured verification intents for host builds, focused tests, packaged startup, runtime
  detection, initialization, UDF/profile behavior, bridge security, navigation, lifecycle, memory,
  performance, update adoption, and docs.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify the host framework and actual WebView2 SDK and Runtime evidence before changing API
  calls. Do not infer Runtime capability from the NuGet version alone.
- Distinguish stable APIs, prerelease or experimental APIs, Runtime-only fixes, and future plans.
  Feature-detect recent APIs where deployed Evergreen clients may lag or enterprise policy may
  block updates.
- Refresh official release notes and concept documentation before writing date-sensitive claims.
  If freshness cannot be checked, keep the procedure version-agnostic and report the gap.
- Treat web content, messages, frames, paths, URLs, file objects, permission requests, and host
  object arguments as untrusted even when the HTML is bundled with the app.
- Keep command execution within the selected repository's configured intents.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update WebView2 host initialization, environment registries, profile and UDF policy, bridge DTOs
  and handlers, document trust and navigation policy, popup/download/permission handlers, lifecycle
  owners, update adoption, process-failure diagnostics, performance instrumentation, packaging,
  tests, and directly synchronized docs or templates.
- Add narrow state machines, registries, typed message envelopes, origin policies, resource
  filters, cleanup paths, or feature-detection adapters when the existing ownership is implicit.
- Keep framework-specific UI integration in the established WPF, WinForms, WinUI, or Win32 layer.
- Do not delete or reset a UDF as a generic initialization retry, weaken origin or permission
  checks to make navigation work, or adopt prerelease APIs as production requirements without an
  explicit compatibility decision.

<!-- mustflow-section: procedure -->
## Procedure

1. Read package metadata, target framework files, app startup, control creation, environment
   construction, first navigation, event registration, bridge code, window shutdown, packaging,
   tests, and diagnostic hooks. Record the host framework and Runtime distribution mode.
2. Build one ownership map for four distinct lifetimes:
   - native control and controller;
   - `CoreWebView2Environment`, UDF, profile, and Chromium process group;
   - top-level document, frames, scripts, and bridge requests;
   - host window, application session, restart, update, and uninstall policy.
   Do not use window visibility or field nulling as proof that the other lifetimes ended.
3. Centralize environment creation. Key a shared initialization task by the effective Runtime path,
   normalized UDF path, environment options, language, browser arguments, and access policy. Reject
   incompatible options for an already-active UDF instead of racing a second environment into it.
4. Make initialization an explicit state machine such as `Created -> Initializing -> Ready ->
   Closing -> Closed` with one shared task and a generation or cancellation token. Apply creation
   properties or the explicit environment before `EnsureCoreWebView2Async`; register handlers and
   document-created scripts after successful initialization; navigate last. Do not let XAML or
   constructor `Source` start an implicit default initialization first.
5. Treat UDF and profile design as storage architecture:
   - use a writable, user-local UDF path and avoid network drives;
   - use multiple profiles inside one UDF for account separation within one trust boundary;
   - use different UDFs only for process, trust, regulatory, or independent-lifecycle isolation;
   - use stable opaque profile identifiers rather than email addresses or display names;
   - distinguish logout, browsing-data clearing, profile deletion, factory reset, and uninstall;
   - wait for all owning WebViews and browser processes to exit before moving or deleting a UDF.
6. Choose Runtime distribution deliberately. Prefer Evergreen unless exact binary reproducibility
   or a constrained certification contract justifies Fixed Version. For Fixed Version, require an
   owned patch SLA, retained signed artifacts and hashes, architecture-specific packaging, update
   and rollback tests, disk-budget evidence, and required filesystem permissions. For Evergreen,
   handle continuous-running apps by coordinating release of all environments or a state-saving
   restart after `NewBrowserVersionAvailable`.
7. Bind bridge availability to the current trusted document generation. Issue a new document id or
   generation at navigation start, complete a native-to-web handshake only after an allowed origin
   is ready, reject requests from older generations, and cancel pending work when the document,
   renderer, or control is replaced.
8. Treat every native bridge as a privileged RPC surface:
   - parse and compare exact normalized scheme, host, and effective port; never use prefix matching;
   - keep top-level and frame origin policies separate;
   - use a finite command allowlist with typed request and response schemas, size and depth limits,
     request ids, timeouts, cancellation, idempotency for side effects, and bounded concurrency;
   - bind pending requests to the current document generation and cancel them on navigation,
     renderer loss, or disposal;
   - send data through JSON message APIs instead of interpolating values into script source;
   - expose small capability objects only when messages cannot meet the requirement, and recheck
     native authorization on every host-object call.
9. Separate trusted app content from external content when native capabilities differ. Prefer a
   dedicated WebView for external pages. Configure scripts, web messages, host objects, and virtual
   host mappings before first navigation. Map only the resource directory, deny unnecessary
   cross-origin access, and keep sensitive files physically outside mapped trees and reparse-point
   escape paths.
10. Build navigation state around WebView instance, top-level versus frame scope, and
    `NavigationId`:
    - re-evaluate every redirect rather than trusting the first URL;
    - keep same-document source or history changes separate from a new document generation;
    - reject stale completion events after a newer navigation has started;
    - use `IsSuccess`, `WebErrorStatus`, and HTTP status only for transport evidence, not business
      success;
    - keep request-header inspection separate from mutation and restrict injected headers to the
      exact resource context and origin.
11. Route every escape from the current document through one native policy engine:
    - top-level and frame navigation;
    - `NewWindowRequested` and opener behavior;
    - `LaunchingExternalUriScheme`;
    - downloads and final save paths;
    - script dialogs and permission requests.
    Treat `IsUserInitiated` as a gesture signal, not authorization. Check the initiating frame and
    destination, default-deny unknown schemes and origins, and keep permission decisions keyed by
    origin and permission kind.
12. Treat popups and downloads as owned asynchronous state:
    - initialize a child WebView under a deferral before assigning `NewWindow`;
    - dispose half-created children when initialization or the parent lifetime fails;
    - distinguish `DownloadStarting.Handled` from `Cancel`;
    - validate the final absolute save path against an allowed directory and safe filename policy;
    - track `CoreWebView2DownloadOperation.State`, including unknown total length, until terminal
      completion or interruption;
    - unregister per-child and per-download handlers at their terminal state.
13. Preserve the STA threading contract. Create, initialize, and access WebView2 on the UI STA
    thread with a message pump. Keep one asynchronous initialization owner and do not block its
    callbacks with `.Wait()` or `.Result`. When an event requires asynchronous policy work, acquire
    its deferral, enter `try`, and complete exactly once in `finally`; track outstanding deferrals so
    closing can cancel work and still terminate.
14. Make shutdown idempotent and ordered: mark closing, reject new navigation, popup, bridge, and
    download work, cancel pending operations, complete deferrals, close children, unregister events
    from long-lived publishers, remove host objects, close or dispose the controller or control,
    clear references, and wait for browser exit only when a Runtime or UDF operation requires it.
    Hidden controls remain alive; choose hide, suspend, low-memory mode, and permanent disposal as
    distinct policies.
15. Coordinate Runtime update adoption and UDF maintenance at the environment-sharing boundary.
    Stop bridge traffic, dispose every WebView using the UDF, release environment references, wait
    for the owning browser process to exit when deletion or replacement requires it, and then create
    the new environment. Recreating one window while another shares the UDF does not adopt a new
    Runtime or release the profile lock.
16. Classify `ProcessFailed` by process kind and reason before recovery. Distinguish normal exit,
    abnormal exit, integrity failure, renderer unresponsiveness, launch failure, and whole browser
    process exit when the deployed API exposes them. Use nullable crash details as diagnostics, not
    as a required recovery input. Do not recreate for auto-recoverable GPU or utility exits. Coordinate
    browser-process recovery with `BrowserProcessExited`, deduplicate events across controls, and
    bound recovery by environment generation, retry count, backoff, and one concurrent recovery.
17. Diagnose memory by ownership, not the total of every `msedgewebview2.exe` process. Separate
    JavaScript heap and detached DOM, renderer memory, shared browser or helper processes, native
    window/ViewModel retention, environment event cycles, host-object graphs, pending deferrals,
    hidden controls, and expected caches. Pair process ids with UDF, kind, associated frames, active
    controls, and repeated open-close evidence before calling growth a leak.
18. Diagnose performance across page and host boundaries. Correlate page performance marks,
    WebView2 event timestamps, navigation ids, process ids, bridge ids, DevTools/CDP traces, and host
    or WPR/WPA traces. Check broad `WebResourceRequested` interception, synchronous UI-thread work,
    bridge chatter, large payloads, slow or network UDF storage, security software, GPU fallback,
    hidden controls, suspension, and low-memory targets before rewriting frontend code.
19. Verify the smallest relevant matrix: supported Windows and host framework, installed Runtime
    floor, Evergreen current and preview channel when compatibility matters, Fixed artifact when
    used, packaged and unpackaged startup, first and repeated initialization, navigation and frame
    denial, redirect denial, bridge negative cases, popup and download cancellation, deferral
    completion, permission and external-scheme denial, process-failure recovery, repeated open-close
    memory, planned restart, and UDF cleanup or retention policy.

<!-- mustflow-section: hard-bans -->
## Hard Bans

- Do not treat the NuGet SDK version as proof of the installed Runtime version or API availability.
- Do not set `Source` before custom environment initialization and then attempt to replace the
  environment.
- Do not delete a UDF because initialization threw an unclassified exception.
- Do not authorize native work from `Source.StartsWith`, `IsUserInitiated`, a frontend role flag,
  an arbitrary reflected method name, or a path supplied by JavaScript.
- Do not expose a service container, application object, shell execution, unrestricted filesystem,
  secrets, tokens, or broad host object to web content.
- Do not leave event subscriptions, host objects, pending bridge requests, document generations,
  environment references, deferrals, child windows, downloads, or profile locks without an explicit
  owner and cleanup path.
- Do not treat `IsUserInitiated`, `NavigationCompleted`, `DownloadStarting`, process count, or a
  lower working set as proof of a safe destination, business success, completed download, memory
  leak, or reduced live memory.
- Do not ship prerelease or experimental API assumptions as a stable production contract without
  feature detection, compatibility bounds, and fallback behavior.

<!-- mustflow-section: postconditions -->
## Postconditions

- Host, SDK, Runtime, channel, distribution mode, environment, UDF, profile, document, and process
  ownership are explicit.
- Initialization, navigation, bridge, popup, download, permission, deferral, process failure,
  update adoption, and UDF cleanup paths have bounded states and terminal cleanup.
- Origin, frame, message schema, native authorization, permission, filesystem, and external-launch
  boundaries are enforced on the native side.
- Memory and performance claims name the process, metric, scenario, timestamps, and after-close or
  recovery evidence.
- Missing packaged, Runtime-channel, initialization, security-negative, lifecycle, memory, or
  process diagnostic coverage is reported rather than hidden behind a generic frontend test.

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
- `mustflow_check`

Report missing WebView2-specific intents when relevant: packaged startup smoke, installed Runtime
detection, SDK/Runtime compatibility, custom-environment initialization, UDF/profile isolation,
origin and frame denial, malformed or oversized bridge messages, host-object reachability,
document-generation invalidation, redirect denial, popup initialization, download cancellation and
path safety, deferral completion, permission and external-scheme denial, process-failure recovery,
repeated open-close memory, Evergreen restart adoption, Fixed Version packaging, GPU fallback, and
preview-channel regression.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If initialization fails, classify environment option mismatch, UDF path or permission, Runtime
  discovery, window handle, UI thread, disposed control, policy override, and browser-process exit
  before retrying or touching stored data.
- If a blank view appears only after packaging, inspect built assets, virtual host mappings, CSP,
  navigation denial, Runtime availability, architecture loaders, and packaged path permissions
  before changing application state.
- If bridge responses are stale or duplicated, add document generations, request correlation,
  cancellation, idempotency, and bounded queues before adding retries.
- If a UDF remains locked, inspect shared environments, other app instances, active WebViews,
  environment references, and browser-process exit before deleting, moving, or recreating it.
- If a popup, download, dialog, permission, or external launch hangs, inspect deferral completion,
  parent lifetime, initiating frame, terminal operation state, and event cleanup before adding a
  retry or bypass.
- If memory or processes remain after close, inspect shared UDF ownership, environment event cycles,
  host objects, child windows, downloads, deferrals, hidden controls, renderer heap, and expected
  caches before forcing termination or trimming working sets.
- If a performance trace disagrees with page timing, preserve both observations and correlate the
  page, WebView event, process, bridge, and OS timelines before assigning the bottleneck.
- If exact current release claims cannot be refreshed from official sources, remove the precise
  claim from durable guidance and report the unverified boundary.
- If repository intents cannot exercise a Windows or packaged path, report the missing platform
  evidence and keep the completion claim limited to the checks actually run.

<!-- mustflow-section: output-format -->
## Output Format

- WebView2 boundary checked
- Host, SDK, Runtime, channel, and distribution mode
- Environment, UDF, profile, process, document, frame, and lifecycle ownership notes
- Initialization, UDF/profile, document/frame trust, bridge, and native authorization findings
- Navigation, redirect, popup, download, permission, external-launch, and deferral findings
- Runtime distribution, lifecycle, update adoption, process-failure, memory, performance, and
  packaging findings
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining WebView2 risk
