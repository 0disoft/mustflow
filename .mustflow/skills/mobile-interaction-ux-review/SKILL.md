---
mustflow_doc: skill.mobile-interaction-ux-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: mobile-interaction-ux-review
description: Apply this skill when native or cross-platform iOS and Android UI needs review for back, up, dismiss, tabs, sheets, gestures, touch targets, system insets, keyboards, pickers, platform controls, accessibility, process restoration, deep links, or external-app return behavior. Do not use it for web-only responsive layout or for backend async-operation durability.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.mobile-interaction-ux-review
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

# Mobile Interaction UX Review

<!-- mustflow-section: purpose -->
## Purpose

Make mobile interaction feel native, recoverable, and understandable without forcing iOS and
Android into one pixel-identical behavior. Share product meaning and state invariants while letting
navigation, presentation, input, system areas, and accessibility follow each platform's contract.

<!-- mustflow-section: use-when -->
## Use When

- SwiftUI, UIKit, Jetpack Compose, Android Views, React Native, Flutter, Kotlin Multiplatform,
  Tauri mobile, or another native mobile surface changes interaction behavior.
- Code touches back, up, dismiss, close, cancel, exit, predictive or interactive back, navigation
  stacks, deep links, tab branches, sheets, dialogs, gestures, touch targets, system bars, safe areas,
  keyboard insets, focus, pickers, native controls, or platform-specific rendering.
- A flow leaves the app for permissions, settings, camera, photo picker, browser authentication,
  payment, sharing, or another external activity and must resume safely.
- A mobile UI claim depends on Dynamic Type or font scaling, VoiceOver, TalkBack, Switch Access,
  orientation, process recreation, window resizing, dark mode, or real-device behavior.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is browser-only responsive layout, browser accessibility tree, CSS safe areas, or web
  keyboard behavior; use `frontend-stress-layout-review` or
  `frontend-accessibility-tree-review`.
- The task is primarily tablet, foldable, resizable large-screen, multi-pane, mixed-input, or
  multi-window workspace adaptation; use `large-screen-adaptive-ux-review` and this skill only for
  the underlying platform interaction contract.
- The task is general visual hierarchy, decorative excess, cards, copy, or UI state coverage with
  no native platform behavior; use `ui-quality-gate`.
- The task is truthful progress, cancellation, retry, background completion, stale data, or offline
  operation UX; use `async-operation-ux-review` and this skill only for its mobile presentation.
- The task is low-memory device support or battery and background energy; use
  `low-end-device-support-review` or `mobile-energy-efficiency-review`.
- The task is authentication, permission authorization, payment integrity, or durable workflow
  semantics rather than the mobile interaction surface; use the owning security, payment, or
  workflow skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Platform and runtime ledger: supported iOS and Android families, UI toolkit, navigation owner,
  lifecycle owner, minimum runtime contract, device classes, and platform-specific code paths.
- Navigation ledger: route identity, stack or branch, parent relation, back, up, dismiss, close,
  cancel, exit, deep-link entry, tab reselection, saved draft, and terminal destination.
- Presentation ledger: inline, menu, popover, sheet, bottom sheet, dialog, full-screen flow, nested
  overlay, focus owner, scroll owner, unsaved-work rule, and close behavior per platform.
- Input and geometry ledger: touch target and spacing, gesture arbitration, pointer cancellation,
  system and keyboard insets, focused field visibility, picker and keyboard type, dynamic text,
  orientation, window size, and system-bar appearance.
- Lifecycle ledger: foreground, background, process recreation, external launch, result identity,
  one-time consumption, persisted draft, transient state, and restoration version.
- Accessibility ledger: semantic role, name, state, action, traversal order, focus entry and return,
  gesture alternative, text scaling, contrast, reduced motion, VoiceOver, TalkBack, and switch or
  keyboard access where supported.
- State matrix and evidence: loading, empty, error, offline, permission denial, long text, maximum
  supported text scale, keyboard open, dark mode, narrow and large device, rotation, duplicate tap,
  delayed response, back during work, process recreation, and available simulator or device tests.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify which behavior is shared product meaning and which behavior belongs to each platform.
- Inspect current platform navigation, inset, lifecycle, input, accessibility, and design-system
  patterns before adding a custom abstraction.
- Verify framework or SDK-specific behavior against current project dependencies or official
  sources before encoding it as a durable rule.
- Keep command execution under the selected repository's configured command contract.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine semantic navigation commands, platform renderers, route and tab state, presentation
  mappings, gesture ownership, hit areas, insets, keyboard avoidance, focus, system pickers,
  restoration records, external-result consumption, accessibility semantics, state fixtures, and
  focused tests.
- Preserve shared validation, data, product intent, and state invariants while allowing platform-
  specific navigation bars, sheets, dialogs, pickers, menus, buttons, and gestures.
- Prefer platform controls and accessibility behavior over custom replicas unless a product need
  and complete interaction contract justify the custom control.
- Do not redesign unrelated screens, introduce a new navigation framework, replace the design
  system, or claim real-device behavior from static code alone.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the current user decision and primary action.
   - Arrange information as target, current state, important change, and next action rather than as
     database entities or service modules.
   - Keep one dominant decision and a bounded emphasis budget; secondary actions remain available
     without competing visually.
2. Separate navigation commands by meaning.
   - Model `back`, `up`, `dismiss`, `close`, `cancel`, and `exit` as distinct intents.
   - Define behavior for empty stacks, open keyboard, open overlay, dirty draft, deep-link entry,
     external return, and app root. Do not route every command to one generic pop operation.
3. Give navigation one authority.
   - Represent the visible hierarchy with a navigation stack or serializable route state rather
     than scattered `isOpen`, `showDetail`, `isEditing`, and step flags.
   - Coalesce duplicate navigation to the same destination, serialize only conflicting transitions,
     and reject late callbacks owned by a screen instance that no longer exists.
4. Preserve independent tab branches.
   - Treat top-level tabs as sibling destinations, not ordinary pushed pages. Preserve each tab's
     nested stack, scroll state, and restoration identity.
   - Specify tab reselection and platform back behavior instead of inheriting accidental global
     history order.
5. Choose presentation from task lifetime.
   - Keep short contextual choices inline, in a menu, or in the platform-appropriate sheet.
   - Give multi-step input, keyboard-heavy work, deep links, external launches, payment, and
     shareable destinations a full route when their lifetime exceeds an overlay.
   - Avoid nested modal chains; on close, restore the owning focus and scroll position.
6. Arbitrate gestures explicitly.
   - System edge navigation wins in its reserved region. Inside content, wait until direction and
     distance establish one gesture owner.
   - Commit ordinary actions on release, permit cancellation by moving away before release, and do
     not trigger destructive work from an ambiguous short movement.
   - Keep visible menu, button, accessibility action, or single-pointer alternatives for swipe,
     drag, long press, path, and multi-touch shortcuts.
7. Treat touch geometry as an error-cost contract.
   - Separate visible icon size from the actual target and verify the current platform's target-size
     guidance. Visualize hit regions where possible and prevent adjacent expanded targets from
     overlapping.
   - Separate opposite or high-consequence actions by distance plus another cue such as position,
     shape, or text. Use undo for reversible effects and result-specific confirmation for truly
     irreversible effects.
8. Consume runtime insets instead of guessed constants.
   - Draw backgrounds edge-to-edge when appropriate, but keep controls, sliders, handles, and
     bottom actions outside system gesture, cutout, home-indicator, and keyboard regions.
   - Animate with changing insets and preserve focused field, error text, and next action together;
     do not hardcode keyboard height or reset the user's scroll position.
9. Prefer platform input behavior.
   - Share field meaning, validation, serialization, and locale rules, but use platform keyboard
     types, return-key actions, autofill and password-manager hooks, date and time pickers, focus
     movement, and dismissal conventions.
   - Verify locale date and time formats and keyboard-open layout on actual supported device shapes
     when the workflow depends on them.
10. Restore durable task state, not transient animation state.
    - Persist source input, operation or route identity, current meaningful step, and draft version
      when process recreation or external-app round trips can interrupt the task.
    - Rebuild open menus, animation progress, pressed state, and other transient presentation.
    - Correlate external results and consume each result once; handle cancel, stale return, repeated
      delivery, background restoration, rotation, and notification re-entry.
11. Use native controls as behavior packages.
    - Treat buttons, switches, menus, pickers, and navigation components as bundled focus, pressed,
      haptic, scaling, and accessibility behavior, not merely default pixels.
    - Express brand through semantic tokens, type, spacing, imagery, and content hierarchy. A shared
      design system maps semantic roles to platform renderers instead of forcing identical controls.
12. Design accessibility and scaling as alternate operation modes.
    - Map visual groups to logical semantic groups, hide decoration, expose current state and actions,
      keep focus inside active overlays, and restore it to the opener.
    - At large text sizes, reflow rows and actions, replace fixed height with minimum height, and
      preserve the task before decoration. Do not encode important text inside images or canvas.
    - Use text, shape, icon, or direct labels in addition to color, and evaluate contrast after
      transparency, imagery, blur, pressed, disabled, dark, and overlay composition.
13. Classify screen data states instead of one loading boolean.
    - Distinguish initial load, compatible refresh, pagination, loaded data, first-use empty,
      filtered empty, search empty, permission denial, partial failure, full failure, cached data,
      and offline mode when reachable.
    - Preserve last safe content during refresh, keep failures local to their region, and route
      operation truth, stale-action blocking, retry, and offline queues to
      `async-operation-ux-review` and `cache-integrity-review`.
14. Verify a mobile state matrix.
    - Cover supported text scales, long localized text, narrow and large devices, keyboard open,
      system bars, dark and high-contrast modes, rotation or window change, duplicate taps, slow and
      reordered responses, back during transition, external return, and process recreation.
    - Test critical flows with the platform accessibility service and alternate input where the
      project has configured or manual evidence. Automated checks are a floor, not final proof.
15. Label evidence precisely.
    - Separate static code, unit or component tests, simulator or emulator evidence, accessibility
      inspection, and real-device evidence. Do not claim iOS and Android parity when only one platform
      or one interaction mode was exercised.

<!-- mustflow-section: postconditions -->
## Postconditions

- Shared product meaning remains consistent while navigation, presentation, input, system-area, and
  accessibility behavior follows each supported platform.
- Back, up, dismiss, tabs, gestures, touch targets, insets, keyboard, restoration, external results,
  dynamic text, and assistive-technology paths are explicit or reported as unverified.
- The UI preserves user input and task identity through expected lifecycle loss without restoring
  stale callbacks or transient presentation as authority.
- Mobile quality claims name the tested platform, device or simulator class, state matrix, and
  evidence level.

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

Use the narrowest configured unit, component, platform build, navigation, lifecycle, accessibility,
simulator, emulator, device, docs, release, or mustflow intent that covers the changed interaction.
Do not invent raw mobile builds, simulators, emulators, dev servers, or device automation outside the
command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If supported platforms or navigation ownership are unknown, stop shared-behavior abstraction and
  report the missing platform contract.
- If framework or SDK behavior is version-sensitive and current evidence is unavailable, keep the
  rule semantic and report platform-specific implementation as deferred.
- If a custom control cannot preserve the platform's focus, input, scaling, semantics, and gesture
  behavior, keep or restore the native control and report the branding limitation.
- If only static or single-platform evidence exists, do not claim real-device or cross-platform
  behavior.
- If safe restoration depends on durable workflow, cache, identity, payment, or permission changes
  outside scope, hand off to the owning skill and keep the mobile surface explicitly pending or
  recoverable.

<!-- mustflow-section: output-format -->
## Output Format

- Mobile interaction surface reviewed
- Supported platforms, runtime, and evidence level
- User decision and shared-versus-platform contract
- Navigation, presentation, gesture, touch, inset, keyboard, input, restoration, accessibility,
  scaling, and state-matrix decisions
- Changes made or recommendations
- Command intents run
- Skipped platform and real-device checks with reasons
- Remaining mobile interaction or platform-parity risk
