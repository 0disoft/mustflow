---
mustflow_doc: skill.large-screen-adaptive-ux-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: large-screen-adaptive-ux-review
description: Apply this skill when native or cross-platform tablet, foldable, desktop-windowed mobile, split-screen, or large-screen UI needs adaptive multi-pane layout, list-detail, supporting-pane, inspector, mixed touch-pointer-keyboard-stylus input, window resizing, rotation, multi-window, drag-and-drop, or task-state continuity review. Do not use it for browser-only responsive CSS or ordinary phone interaction without a large-screen workspace contract.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.large-screen-adaptive-ux-review
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

# Large-Screen Adaptive UX Review

<!-- mustflow-section: purpose -->
## Purpose

Turn a resizable large-screen surface into a coherent workspace rather than a stretched phone or a
compressed desktop. Preserve the user's active task while pane structure, navigation presentation,
input device, focus, keyboard, window size, orientation, and multi-window state change.

<!-- mustflow-section: use-when -->
## Use When

- A native or cross-platform app targets tablets, foldables, resizable desktop windows, external
  displays, split screen, freeform windows, or another large-screen mobile surface.
- The UI uses or proposes list-detail, feed, supporting-pane, sidebar, navigation rail, inspector,
  canvas, preview, editor, multi-column grid, draggable divider, or pane-local toolbar structures.
- Window width or height, rotation, hinge or posture, keyboard, pointer, stylus, drag and drop,
  multi-selection, focus, hover, or multi-window behavior can change the task.
- A quality claim depends on transitions between one, two, and three panes rather than one static
  tablet screenshot.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is browser-only responsive CSS, hostile content, container queries, browser zoom, or web
  safe areas; use `frontend-stress-layout-review`.
- The task is ordinary phone navigation, back, dismiss, platform controls, touch targets, system
  insets, or external-app return without a large-screen workspace; use
  `mobile-interaction-ux-review`.
- The task is only state ownership, async progress, durable drafts, cache freshness, accessibility
  semantics, or stylus rendering performance; use the owning state, async, workflow, cache,
  accessibility, or performance skill and this skill only for adaptive presentation.
- The task is a desktop-only multi-window application with no mobile or adaptive large-screen
  surface; use the matching desktop or platform skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Surface ledger: supported platforms and runtimes, toolkit, minimum window contract, resizing,
  rotation, split-screen, freeform, fold posture, external display, and process recreation behavior.
- Workspace ledger: task modes, pane roles, pane ownership, selection identity, active pane, focus
  owner, scroll owner, unsaved draft, undo history, and pane-local versus global commands.
- Geometry ledger: available width and height, system and keyboard insets, hinge or occlusion,
  content-derived minimum, preferred, and maximum pane sizes, divider sizes, gutters, and collapse
  thresholds.
- Adaptation ledger: navigation form, visible panes, compact destination, pane exit order, user
  visibility preferences, overlay or route fallback, and transition behavior at each threshold.
- Input ledger: touch, pointer, keyboard, stylus, accessibility action, hover, focus, selection,
  press, drag and drop, multi-selection, context menu, shortcut, handedness, and command identity.
- Multi-window and lifecycle ledger: per-window UI session, shared data authority, visibility,
  activity, focus, background state, external return, conflicting edits, and restoration version.
- State and evidence matrix: loading, refresh, pagination, empty, partial failure, stale content,
  keyboard open, text scaling, rotation, continuous resize, input-device switch, process recreation,
  and configured simulator, emulator, device, or component evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify the user's current task and the information relationship that earns simultaneous panes.
- Inspect existing navigation, pane, state, input, accessibility, lifecycle, and design-system
  patterns before adding a new large-screen abstraction.
- Derive thresholds from content survival and current window geometry. Treat platform size classes
  as inputs or starting evidence, not device detection or universal product breakpoints.
- Verify version-sensitive framework behavior against current project dependencies or official
  sources before encoding implementation-specific rules.
- Keep command execution under the selected repository's configured command contract.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine adaptive pane models, pane size contracts, navigation presentation, selection and
  compact-destination state, pane-local toolbars, scroll ownership, focus restoration, input
  adapters, semantic commands, drag and drop, multi-selection, per-window sessions, state fixtures,
  transition tests, and synchronized docs.
- Preserve shared task identity, drafts, undo history, selection, and data authority while changing
  only the presentation needed for current window geometry and task mode.
- Reuse native or framework adaptive components where their behavior contract fits; add custom
  layout only when the project needs a capability they cannot express.
- Do not add filler cards, duplicate navigation, device-name forks, orientation-only layouts,
  input-device-wide modes, or network and persistence side effects driven by layout measurement.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the workspace relationship before pane count.
   - Name the primary task and classify the useful relationship as list-detail, feed,
     supporting-pane, navigation-content, canvas-inspector, editor-preview, or another explicit
     structure.
   - Add simultaneous information only when it removes navigation, memory, comparison, or context
     switching. White space is not itself a defect.
2. Give every pane one role and one owner.
   - Separate navigation, collection selection, content reading or editing, and contextual
     inspection. Keep pane titles, actions, status, and scroll containers local to their owner.
   - Reserve global bars for commands whose effect is genuinely application-wide.
3. Contract pane geometry from content survival.
   - Record minimum, preferred, and maximum sizes for each pane, including text scaling, localized
     labels, error text, keyboard, dividers, and insets.
   - Collapse, replace, or move a pane when it cannot remain usable; do not compress every pane by
     percentage or stretch controls and reading measures to fill the window.
4. Adapt from current window geometry.
   - Use available width and height after occlusion and insets rather than `isTablet`, model name,
     orientation, or one full-screen resolution.
   - Let platform size classes inform the initial mapping, then validate thresholds against the
     product's actual pane contracts.
5. Preserve the active task while structure changes.
   - Keep the active pane, selected item ID, draft ID, focused field, cursor or selection, scroll
     anchors, undo history, and operation identity through one-, two-, and three-pane transitions.
   - When space shrinks, preserve the pane that owns current focus or unsaved work and retire the
     lowest-value supporting pane. When space grows, reveal context around the current task instead
     of navigating to a default item.
6. Separate selection, navigation, and editing.
   - In a multi-pane layout, selecting a row updates the detail selection without manufacturing a
     new full-screen navigation entry. In compact presentation, the same semantic selection may
     present detail as the current destination.
   - Enter editing through an explicit command. Keep short contextual edits in an inspector and
     promote long, keyboard-heavy, or multi-step work to the primary work area.
7. Transform one navigation model.
   - Map one destination set, selection state, badges, and access policy into the appropriate
     compact bar, rail, sidebar, or other platform presentation.
   - Do not render duplicate navigation surfaces or let sidebar visibility masquerade as content
     history. Preserve user visibility preferences per meaningful geometry class.
8. Keep layout state separate from work state.
   - Pane visibility, widths, placement, and navigation chrome are layout state. Documents,
     selections, drafts, undo history, filters, operation progress, and permissions are task state.
   - A resize may change presentation immediately but must not restart network requests, saving,
     analytics, or other business effects solely because geometry changed.
9. Stabilize continuous resize and rotation.
   - Reflow visual geometry continuously where supported, but run structural transitions only when a
     threshold is actually crossed.
   - Anchor the current item or edit surface, avoid animation restart loops, and define cancellation
     or continuation for drag, modal, popover, and keyboard states during a transition.
10. Treat overlays and keyboards as part of the window.
    - Anchor menus and popovers to the invoking pane and keep them inside the current window.
    - Convert short wide-window inspectors or popovers to a sheet or destination when compact, and
      recalculate around actual keyboard and system insets without discarding the draft.
11. Route every input through semantic commands.
    - Map touch, pointer, keyboard, stylus, accessibility actions, context menus, and shortcuts to
      shared commands so permission, undo, validation, telemetry, and destructive safeguards do not
      drift by input path.
    - Keep hover, focus, selection, and pressed state distinct. Provide discoverable alternatives
      for hover-only, secondary-click-only, long-press-only, drag-only, stylus-only, and shortcut-only
      actions.
12. Support mixed input without one global device mode.
    - Decide each active interaction from its pointer or key event rather than the last connected or
      last-used device.
    - Preserve generous touch hit geometry while providing pointer precision, visible focus,
      conventional shortcuts, multi-selection, drag and drop, clipboard, and context menus where the
      product task benefits.
    - Treat pressure, tilt, prediction, palm rejection, and ink latency as a specialist stylus or
      rendering contract instead of assuming the pen is a precise finger.
13. Keep pane states and failures local.
    - Model initial load, refresh, pagination, content, empty causes, partial failure, fatal failure,
      stale content, and permission state per pane when their authorities differ.
    - Preserve independent usable panes and stable geometry. Route progress truth, offline queues,
      stale-action blocking, and retry semantics to `async-operation-ux-review` or the owning data
      skill.
14. Model multi-window lifecycle explicitly.
    - Keep selection, scroll, open document, focus, and layout preference per window while sharing
      durable data through one authority.
    - Distinguish visible, active, focused, and background states. Define exclusive resource release,
      continued operations, process recreation, external return, and concurrent edit conflict rules.
15. Verify transition paths, not screenshots.
    - Exercise one-, two-, and three-pane thresholds in both directions; narrow and short windows;
      split and freeform windows; rotation; keyboard show and hide; text scaling; input-device
      switching; drag; modal or popover; process recreation; and multi-window focus changes.
    - Assert semantic continuity: selected ID, compact destination, draft, cursor, scroll anchor,
      focus, pane preference, undo history, and operation identity. Pixel snapshots alone do not
      prove an adaptive workspace.
16. Label evidence precisely.
    - Separate static layout inspection, unit or component tests, screenshot evidence, simulator or
      emulator transitions, accessibility inspection, and real-device or multi-window evidence.
    - Do not claim tablet optimization, input parity, or resize continuity from one full-screen
      screenshot or one platform.

<!-- mustflow-section: postconditions -->
## Postconditions

- Pane count and placement derive from current usable geometry, task mode, content survival, and user
  preference rather than device identity or orientation alone.
- Navigation, selection, editing, pane visibility, input paths, per-window sessions, and work state
  retain distinct ownership.
- Selection, drafts, focus, scroll, undo, and operation identity survive supported adaptive
  transitions or are reported as unverified.
- Large-screen quality claims name the transition matrix, platforms, input modes, and evidence level.

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

Use the narrowest configured unit, component, adaptive-layout, navigation, lifecycle, accessibility,
simulator, emulator, device, docs, release, or mustflow intent that covers the changed workspace.
Do not invent raw mobile builds, resize harnesses, dev servers, simulators, or device automation
outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If supported window modes, pane roles, or state owners are unknown, stop adding adaptive branches
  and report the missing workspace contract.
- If content-derived thresholds cannot be measured, keep a bounded provisional layout and report the
  missing stress fixtures rather than encoding device detection as certainty.
- If framework behavior is version-sensitive and current evidence is unavailable, keep the rule
  semantic and defer framework-specific implementation.
- If durable drafts, shared data conflicts, operation truth, accessibility behavior, or stylus
  performance is outside scope, hand off to the owning skill and keep the adaptive presentation
  explicitly pending.
- If only static or single-window evidence exists, do not claim transition, multi-input,
  multi-window, or real-device behavior.

<!-- mustflow-section: output-format -->
## Output Format

- Large-screen adaptive surface reviewed
- Supported platforms, window modes, task modes, and evidence level
- Workspace relationship and pane-role ledger
- Geometry, adaptation, navigation, selection, editing, input, keyboard, overlay, lifecycle, and
  multi-window decisions
- Transition matrix and semantic continuity evidence
- Changes made or recommendations
- Command intents run
- Skipped platform, device, input, and transition checks with reasons
- Remaining adaptive workspace or platform-parity risk

