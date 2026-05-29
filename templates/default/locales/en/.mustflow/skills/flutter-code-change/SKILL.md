---
mustflow_doc: skill.flutter-code-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: flutter-code-change
description: Apply this skill when Flutter widgets, screens, routing, state management, async UI, platform channels, assets, responsive layout, accessibility, or Flutter tests are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.flutter-code-change
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

# Flutter Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Flutter widget, state owner, build purity, async lifecycle, navigation, platform channel, asset, responsive layout, and accessibility boundaries.

<!-- mustflow-section: use-when -->
## Use When

- Flutter `lib/**.dart`, widgets, screens, routing, state management, platform channels, assets, tests, integration tests, or platform project files change.
- The task touches `StatefulWidget`, `StatelessWidget`, `setState`, `BuildContext`, navigation, `FutureBuilder`, `StreamBuilder`, controllers, subscriptions, `MethodChannel`, `pubspec.yaml` assets, or responsive layout.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is pure Dart package or CLI logic with no Flutter UI/lifecycle surface; use `dart-code-change`.
- The task only reads Flutter code for orientation.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- `pubspec.yaml`, analyzer config, app root, route config, state management setup, target screen, parent widgets, assets, platform channel files, and tests.
- Existing state management, navigation, accessibility, theming, and responsive layout conventions.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify widget tree owner, state owner, route owner, async source, platform boundary, asset declaration, and verification surface.
- Keep `build` as UI description, not a side-effect runner.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Put network calls, subscriptions, controllers, timers, analytics, navigation side effects, and snackbars in the proper lifecycle or event boundary.
- Use the project's existing state management and routing style.
- Use constraints and layout information rather than device-name assumptions.
- Dispose controllers, streams, timers, animations, and subscriptions.

<!-- mustflow-section: procedure -->
## Procedure

1. Read app root, route config, parent widgets, state owner, target widget, platform files, assets, and tests.
2. Classify the change: widget layout, state, async lifecycle, navigation, platform channel, asset, accessibility, or test-only.
3. Do not create futures, streams, controllers, listeners, or side effects inside `build`.
4. Keep `setState` narrow and synchronous; do not put awaited work inside the `setState` callback.
5. After async gaps, ensure the widget is still mounted before using context or state, and prefer disposing owners so dead widgets are not touched.
6. Keep navigation consistent with the project's router.
7. If platform channel or native permission changes, verify Dart interface, native implementation, serialization shape, and error shape together.
8. Check small width, wide width, long text, text scaling, keyboard/open input states, and screen-reader semantics when relevant.

<!-- mustflow-section: postconditions -->
## Postconditions

- Widget build remains pure.
- State owner and async lifecycle are clear.
- Layout responds to constraints and text scaling.
- Platform, asset, and accessibility risks are checked or reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing widget, integration, golden, or platform verification intents when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a lifecycle fix requires repeated mounted checks, inspect ownership and disposal before adding more guards.
- If layout only works for one viewport, redesign with constraints before finishing.
- If platform permissions or channels are unclear, stop that part and inspect native config.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- State, lifecycle, layout, and accessibility notes
- Platform or asset impact
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Flutter risk
