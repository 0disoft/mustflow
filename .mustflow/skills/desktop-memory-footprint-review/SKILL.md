---
mustflow_doc: skill.desktop-memory-footprint-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: desktop-memory-footprint-review
description: Apply this skill when Windows, macOS, Linux, Electron, WebView, WPF, WinUI, Win32, Qt, Java Swing or JavaFX, .NET, JVM, Rust, C++, Python, or other desktop app code needs memory-footprint review for working set versus private memory, RSS, dirty pages, live set, peak and after-close memory, UI and data virtualization, renderer and window count, module loading, image decode size, OS-discardable caches, memory-mapped files, `madvise`, `EmptyWorkingSet`, .NET LOH and `ArrayPool<T>`, WPF visual trees, GDI or USER handles, detached DOM nodes, hidden windows or tabs, string deduplication, large buffer capacity, struct padding, object graph shape, undo history, inactive views, low-memory signals, and scenario-level memory budgets.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.desktop-memory-footprint-review
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

# Desktop Memory Footprint Review

<!-- mustflow-section: purpose -->
## Purpose

Review desktop app memory as a scenario-level footprint problem across UI objects, data residency,
native handles, renderer processes, decoded media, caches, mapped files, heap live sets, and
after-close cleanup.

The review question is not "can GC run more often?" It is "which screens, files, windows, renderers,
decoded assets, caches, handles, buffers, strings, and history entries remain resident, private,
dirty, or expensive after the user no longer needs them?"

<!-- mustflow-section: use-when -->
## Use When

- Windows, macOS, Linux, Electron, WebView, WPF, WinUI, Win32, Qt, Java Swing, JavaFX, .NET, JVM,
  Rust, C++, Python, or other desktop app code is created, changed, reviewed, or reported with
  memory use, working set, RSS, private bytes, dirty memory, live set, heap growth, GPU memory,
  native handles, renderer process, hidden window, tab, large file, image, cache, undo history, or
  after-close memory risk.
- Code touches large lists, tables, trees, CSV or log viewers, binary viewers, image viewers, note
  apps, chat apps, design tools, document editors, preview panes, hidden tabs, background windows,
  file loading, memory maps, caches, pooled buffers, strings, object models, visual templates,
  event listeners, WebViews, Electron `BrowserWindow`, preload scripts, `require()` graphs, native
  GDI or USER objects, or low-memory handling.
- A final report claims a desktop path is memory optimized, leak-free, lightweight, safe for large
  files, safe for long-running sessions, safe after closing tabs or windows, or validated by Task
  Manager, Activity Monitor, Chrome DevTools, JFR, dotnet counters, heap snapshots, or platform
  memory tools.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only about retained-reference leaks, setup and cleanup symmetry, listeners, timers,
  streams, workers, or native handle release ownership; use `memory-lifetime-review`.
- The task is only about generic hot-path latency, throughput, allocation churn, GC pressure, or
  cost multipliers with no desktop app memory surface; use `performance-budget-check`.
- The task is only installed app startup from process launch to first frame or fully usable state;
  use `app-startup-performance-review`.
- The task is only low-end or constrained-device policy across mobile or installed app capability
  budgets; use `low-end-device-support-review`.
- The task is only browser page rendering, INP, DOM frame work, CSS layout, paint, or compositing;
  use `frame-render-performance-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Scenario ledger: app type, platform, runtime, process model, target device class, user scenario,
  baseline state, peak state, steady state, after-close state, and what user action should release
  memory.
- Measurement ledger: working set, RSS, private bytes, dirty memory, live set after full collection,
  heap snapshot, allocation sampling, detached DOM evidence, renderer memory, native handle count,
  GPU texture memory, page faults, memory pressure event, or an explicit static-only boundary.
- UI residency ledger: list, table, tree, virtualized control, data model, visual tree, template,
  row container recycling, offscreen view, hidden tab, hidden window, preview pane, WebView,
  renderer process, iframe, DOM node, event listener, and teardown behavior.
- Data residency ledger: full file load, streaming parser, memory-mapped file, mapped window,
  `madvise` or OS-discardable range, parsed row model, sort index, filter index, search index,
  undo history, diff model, document snapshot, and after-close release point.
- Cache ledger: cache owner, cache item cost, total cost limit, count limit, eviction, weak or
  discardable behavior, decoded image bytes, GPU texture size, parsed object cost, font or renderer
  cache, and low-memory response.
- Runtime ledger: Electron `BrowserWindow`, preload and `require()` graph, WPF virtualization,
  WPF visual tree, Qt `canFetchMore()` and `fetchMore()` or lazy model loading, .NET LOH,
  `ArrayPool<T>`, GDI or USER
  handles, JVM live set, Java string deduplication, Rust or C++ buffer capacity, struct padding,
  and native resource ownership.
- Existing tests, profiler traces, telemetry, build outputs, package surfaces, synchronized docs or
  templates, and configured command-intent evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required memory evidence is available from current files, diffs, docs, configured outputs,
  user-provided evidence, or can be reported as missing without guessing.
- Treat Task Manager working set, Activity Monitor, RSS, and one-off heap-used snapshots as partial
  evidence. Do not equate lower resident pages with lower owned memory without private, dirty, live
  set, after-close, or retainer evidence.
- If the change touches privacy, security, payment, persistence, migrations, crash reporting,
  telemetry, or data recovery, also use the narrower matching skill when its trigger is present.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten UI virtualization, data virtualization, container recycling, lazy model fetch,
  renderer or window disposal, feature-entry module loading, image downsampling, cache cost limits,
  discardable cache behavior, streaming or memory-mapped file access, mapped-range release hints,
  low-memory handlers, after-close cleanup, undo compaction, object-shape flattening, string or
  symbol tables, pooled-buffer scope, native handle release, and focused tests.
- Replace full UI object creation, full file reads, eager renderer creation, hidden window retention,
  original-size bitmap retention, unbounded dictionaries, per-item visual templates, whole-document
  undo snapshots, and long-lived large buffer capacity when the repository evidence supports it.
- Do not call working-set trimming APIs such as `EmptyWorkingSet` merely to make Task Manager look
  better.
- Do not add a "clear cache" button as the primary memory policy when the app can release memory
  automatically by scenario, pressure, close, or eviction.
- Do not trade correctness, user data recovery, undo semantics, accessibility, security, privacy,
  crash diagnostics, or platform lifecycle safety for lower memory numbers.
- Do not start raw profilers, device tools, dashboards, browser sessions, app launches, or
  platform-specific measurement workflows outside the configured command contract.

<!-- mustflow-section: procedure -->
## Procedure

1. Define scenario budgets before optimizing.
   - Prefer scenario budgets such as first launch, empty document, open small file, open large file,
     scroll many rows, preview many images, open many tabs, close all tabs, and idle after close.
   - Track peak, steady-state, and after-close memory separately.
   - If no budget exists, report the missing product memory contract instead of claiming complete
     optimization from a small cleanup.
2. Choose the right memory number.
   - Distinguish working set or RSS from private committed memory, dirty pages, live heap after full
     collection, mapped file pages, GPU resources, renderer processes, and native handles.
   - Treat page faults and memory mapping as reasons resident memory may move without ownership
     changing.
   - Reject "working set went down" as proof when the change only forces paging and the next user
     interaction faults pages back in.
3. Separate UI virtualization from data virtualization.
   - UI virtualization reduces visible containers and visual objects.
   - Data virtualization reduces resident source rows, parsed objects, sort indexes, and filter
     indexes.
   - A million-row view that keeps a million parsed rows in memory is not fixed by virtualizing
     only row controls.
4. Virtualize lists, tables, and trees.
   - Ensure large views create only visible containers plus a bounded buffer.
   - Enable container recycling where the framework supports it.
   - Avoid per-row buttons, text objects, checkboxes, handlers, and layout objects for offscreen
     rows.
5. Count expanded visual objects.
   - In WPF, WinUI, Qt, JavaFX, WebView, or custom UI frameworks, inspect expanded templates and
     repeated visual trees, not only component count.
   - A single friendly-looking template multiplied by thousands of rows can create the real memory
     footprint.
6. Control Electron and WebView process count.
   - Treat each `BrowserWindow`, WebView, iframe, preload script, and renderer as a memory owner.
   - Prefer stateful navigation or view reuse only when it does not keep hidden DOM, JS heap, GPU
     textures, and renderer caches alive.
   - Destroy closed windows when fast reopen can be served by persisted state rather than a hidden
     renderer.
7. Defer desktop modules by journey.
   - Do not load PDF engines, spell checkers, AI models, export libraries, ZIP libraries, markdown
     renderers, plugin hosts, or full font and theme packs at app start when a feature entry can
     load them.
   - In Electron and Node-like runtimes, inspect preload and `require()` graphs for modules that
     survive only because startup imported them.
8. Decode media to displayed size.
   - Judge images by decoded pixel bytes, not file size.
   - Downsample large images for thumbnails, previews, chat cells, notes, and document sidebars.
   - Bound decoded bitmap caches and GPU texture caches by cost, not only item count.
9. Make caches discardable by cost.
   - Store only rebuildable values in memory caches.
   - Use byte, texture, DOM node, parsed-object, or renderer cost when deciding eviction.
   - Prefer OS-discardable, weak, pressure-aware, or cost-limited caches where the platform supports
     them, such as `NSCache` with `countLimit` and `totalCostLimit`.
   - Avoid global `Map`, `Dictionary`, or static cache structures that never evict.
10. Stream or map large files.
    - Avoid full `readAll`, `read()`, `ReadAllBytes`, `json.load`, or equivalent APIs on growing
      logs, CSVs, database dumps, binary files, and media.
    - Prefer streaming, chunked parsing, paging, or memory-mapped files with bounded windows.
    - For mapped files, remember that address-space visibility is not the same as resident physical
      RAM.
11. Release mapped or inactive ranges deliberately.
    - Where supported, use OS hints such as `madvise`-style discard for ranges the app can reread.
    - Keep this as a paging and residency tool, not as a substitute for shrinking live object graphs.
12. Handle .NET large objects carefully.
    - Treat arrays near or above the 85,000 byte LOH threshold as Gen 2 and fragmentation risks.
    - Use `ArrayPool<T>` for short-lived buffers only when ownership is tight and return timing is
      provable.
    - Do not return pooled buffers while another async operation, native API, or consumer may still
      use them.
13. Keep native handles in the memory review.
    - Track GDI, USER, bitmap, brush, font, pen, region, cursor, icon, file, socket, and OS handle
      counts where applicable.
    - Pair native create and destroy functions and test repeated open, draw, print, capture, tray,
      and close paths.
14. Find detached UI trees.
    - For Electron, WebView, browser-based UI, and hybrid apps, inspect detached DOM nodes, event
      listeners, console-retained objects, devtools artifacts, and JS references from stores,
      callbacks, promises, and logs.
    - Separate measurement artifacts from app leaks when DevTools or a console binding retains the
      object.
15. Shrink duplicate strings and symbols.
    - Repeated JSON field names, log levels, file paths, status strings, tags, categories, and table
      cell text can dominate live heap.
    - Use enums, symbol ids, intern tables, shared dictionaries, or JVM string deduplication where
      the runtime and workload justify it.
16. Watch live set after cleanup.
    - For JVM and similar runtimes, inspect live set after old or full collection across repeated
      open, close, search, tab, and file workflows.
    - A staircase increase after every close is a leak or retention problem even when current heap
      use looks temporarily low.
17. Shrink large buffer capacity explicitly.
    - In Rust, C++, and similar runtimes, `clear()` usually preserves capacity.
    - After one-time large operations, use an explicit shrink, replacement, or bounded reusable
      buffer policy when retaining capacity hurts later scenarios.
18. Reduce padding and pointer forests in bulk models.
    - For millions of rows, render nodes, cells, or document spans, review struct field order,
      alignment padding, object headers, boxed metadata, and pointer-heavy object graphs.
    - Prefer columnar arrays, struct-of-arrays, shared style tables, integer ids, compact enums, and
      pooled strings where the product model supports it.
19. Store history as deltas.
    - Avoid undo stacks made of full document snapshots.
    - Prefer operation logs, field-level patches, tile diffs, rope or piece-table structures, and
      bounded checkpoints when the product needs undo or diff.
20. Degrade inactive views.
    - When tabs, documents, previews, canvases, images, search results, WebViews, and GPU textures
      become inactive, release or downgrade backing stores by tier.
    - Keep enough state to restore the view, not necessarily the whole rendered surface.
21. Make low-memory handling real.
    - On memory pressure, release thumbnail caches, decoded images, inactive document caches,
      hidden WebViews, search index caches, parsed previews, GPU textures, and large temporary
      buffers in a defined order.
    - Log or expose bounded reason and outcome evidence where the repository already has a safe
      observability pattern.
22. Prove after-close behavior.
    - Repeat open, load, scroll, search, preview, close, reopen, and idle transitions.
    - Prefer tests or probes that assert row container count, model page count, cache total cost,
      native handle count, renderer count, hidden window count, pool checkout count, undo memory
      budget, or after-close state.
    - If heap snapshots, allocation sampling, JFR, dotnet counters, Instruments, Windows tools,
      Chrome DevTools, or platform profilers are not configured intents, report them as manual-only
      evidence gaps.

<!-- mustflow-section: postconditions -->
## Postconditions

- Scenario budget, measurement metric, UI virtualization, data virtualization, visual tree count,
  renderer or window count, module loading, decoded media, cache cost, mapped files, inactive
  ranges, LOH or pooled buffers, native handles, detached UI trees, duplicate strings, live set,
  buffer capacity, object graph shape, undo strategy, inactive views, low-memory handling, and
  after-close behavior are explicit.
- Full UI object creation, UI-only virtualization, hidden renderer retention, eager feature modules,
  original-size thumbnails, item-count-only caches, full file reads, mapped ranges held forever,
  working-set trimming theater, unsafe pooled buffer return, GDI or USER handle leaks, detached DOM
  retention, console measurement artifacts, duplicate strings, live-set staircases, cleared-but-huge
  buffers, padded bulk structs, pointer-heavy row models, whole-document undo snapshots, inactive
  tabs kept fully rendered, and no-op low-memory handlers are fixed or reported.
- Desktop memory claims are backed by configured tests, profiler or telemetry evidence,
  static-review evidence, or labeled as manual-only or missing.

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
changed desktop memory surface and synchronized template surfaces. Do not infer raw heap snapshots,
JFR, dotnet counters, Chrome DevTools, Windows Performance tools, Instruments, Activity Monitor,
Task Manager, app launchers, or platform profilers outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and
  the memory invariant it exercised before editing again.
- If the metric is only working set, RSS, or a single live heap value, report the evidence boundary
  before claiming memory was reduced.
- If scenario budgets are missing, report that desktop memory fitness cannot be fully judged yet
  instead of treating isolated GC, cache, or object-count changes as complete.
- If safe repair requires product changes to undo semantics, document recovery, renderer
  architecture, plugin policy, native resource ownership, profiler setup, or OS-specific behavior
  outside scope, report the boundary instead of inventing commands.
- If memory reduction conflicts with correctness, persistence, undo, accessibility, crash
  diagnostics, privacy, security, or user trust, keep the safer behavior and report the tradeoff.

<!-- mustflow-section: output-format -->
## Output Format

- Desktop memory footprint boundary reviewed
- Scenario budget, measurement metric, UI/data virtualization, renderer/window, module loading,
  media, cache, file, runtime, native handle, UI retention, string, data model, history, inactive
  view, memory-pressure, and after-close findings
- Desktop memory fixes made or recommended
- Evidence level: measured, configured-test evidence, static desktop-memory risk, manual-only,
  missing, or not applicable
- Command intents run
- Skipped desktop memory diagnostics and reasons
- Remaining desktop memory footprint risk
