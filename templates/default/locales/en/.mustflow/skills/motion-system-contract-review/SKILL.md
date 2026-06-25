---
mustflow_doc: skill.motion-system-contract-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: motion-system-contract-review
description: Apply this skill when UI motion, animation, transition, microinteraction, motion design systems, WAAPI, CSS animation or transition, Framer Motion, GSAP, view transition, hover/press/focus animation, reduced-motion behavior, animation interruption, or motion state settlement is planned, edited, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.motion-system-contract-review
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

# Motion System Contract Review

<!-- mustflow-section: purpose -->
## Purpose

Review UI motion as an explicit state-transition contract instead of decorative prose.
Motion must not own product state. It may visualize a state change, but the logical state,
async result, permission, selection, route, or persisted value must be owned outside the animation.

<!-- mustflow-section: use-when -->
## Use When

- UI motion, animation, transition, microinteraction, motion recipe, or design-system motion token work is created, edited, reviewed, or reported.
- The work mentions CSS `animation`, CSS `transition`, `@keyframes`, `animation-fill-mode`, Web Animations API, Framer Motion, GSAP, View Transitions, or component-library motion props.
- Hover, press, focus, drag, route transition, viewport entry, loading, async success, async failure, toast, dialog, carousel, skeleton, or list reorder motion behavior is part of the change.
- Reduced motion, interruption, cancellation, settlement, timeline tracks, transform, opacity, filter, layout animation, additive composition, or channel collision needs review.
- Natural-language animation directions need conversion into observable roles, semantic events, logical from-state and to-state, timeline tracks, and failure policies.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only per-frame rendering jank, style recalculation, layout thrash, paint cost, or INP delay after the motion contract is already clear; use `frame-render-performance-review`.
- The task is only first-paint, navigation flicker, hydration flash, blank first render, or state loss across navigation; use `frontend-render-stability`.
- The task is only general UI polish, layout stress, copy, or visual state coverage without motion-specific behavior; use `ui-quality-gate` or `frontend-stress-layout-review`.
- The task is only semantic HTML, keyboard operation, focus management, accessible names, or accessibility-tree evidence; use `frontend-accessibility-tree-review`.
- The change has no user-facing motion, transition, animated state change, or animation-adjacent behavior.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Motion slot, surface, component, route, or design-system recipe being changed.
- Source role, target roles, semantic event, and whether the event is interaction, component-state, signal, viewport, or timer driven.
- Logical from-state and to-state, including the source of truth for each state.
- Timeline tracks with target, channel, range, keyframes, easing, duration, delay, and composition mode when available.
- Interruption policy for same event, opposite event, unrelated event, route change, unmount, and async cancellation.
- Settlement policy that explains what durable state is applied after motion completes and which animation effects are cleared.
- Reduced motion policy and the fallback behavior for no-animation or low-motion users.
- Binding approach for targets, such as component refs, roles, slots, data attributes, or brittle CSS selectors.
- Async signal ownership for loading, success, failure, retry, optimistic update, and rollback feedback.
- Evidence level: static contract review, unit or integration test, story fixture, browser runtime proof, DevTools trace, or reported gap.

<!-- mustflow-section: preconditions -->
## Preconditions

- The motion behavior is tied to a user-visible state, event, or feedback path.
- The nearest workflow instructions and configured command intents have been checked.
- Nearby frontend, accessibility, render performance, and state ownership skills have been considered for overlap.
- The review can inspect enough code, design-system config, docs, story fixtures, or tests to distinguish logical state from animation effects.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update motion recipes, component motion props, CSS keyframes, transition declarations, animation lifecycle handlers, reduced-motion rules, story fixtures, tests, and directly synchronized docs or templates.
- Replace brittle selector binding with explicit role/ref/slot/data binding when the local pattern supports it.
- Add or tighten state, signal, interruption, settlement, reduced-motion, and failure policies near the motion owner.
- Add focused tests or fixtures that prove state ownership, async signal timing, interruption behavior, reduced motion, and settlement.
- Do not introduce a new animation framework, global motion DSL, or design-system schema unless the task explicitly asks for that broader architecture.
- Do not make animation completion the only owner of business, navigation, permission, payment, async result, or persistence state.
- Do not claim runtime visual proof from a static code review.

<!-- mustflow-section: procedure -->
## Procedure

1. Convert animation prose into a contract ledger. Natural-language instructions such as "click makes it pop" are not the source of truth. Record the motion slot, roles, event, from-state, to-state, tracks, policies, and evidence.
2. Identify the logical state owner before evaluating the animation. Name whether state lives in component state, URL, server cache, form draft, store, DOM attribute, design-system primitive, async signal, or browser capability.
3. Classify the trigger event as interaction, component-state, signal, viewport, or timer. Do not let a timer pretend to be a real success, failure, permission, or completion signal.
4. For async success and failure motion, require actual result signals. Loading shimmer, success check, error shake, retry pulse, optimistic success, and rollback motion must follow real async state, not elapsed time alone.
5. Require explicit from-state and to-state values. If either side is unknown, report the gap before reviewing easing or visual style.
6. Model the timeline as tracks. For each track, record target role, channel, range, keyframes, easing, duration, delay, fill, and composition.
7. Check same target and channel overlap. Two tracks writing the same channel over the same time range are a collision unless additive composition is explicit and allowed by the motion profile.
8. Treat additive composition as opt-in. Confirm all involved tracks, tokens, and runtime APIs support additive behavior. Reject accidental accumulate behavior when the platform or library semantics are unclear.
9. Keep layout channels off by default. Prefer `transform` and `opacity`; challenge width, height, top, left, margin, padding, grid, or text-flow animation unless there is a measured and accessible reason.
10. Define interruption policy for same, opposite, and unrelated events. Decide whether to restart, reverse, finish, cancel, queue, merge, or ignore. Include route change, unmount, gesture cancel, and rapid repeat input.
11. Define settlement policy. On completion, apply durable target state through the state owner, then remove temporary animation effects, inline styles, classes, handles, timers, and observers.
12. Do not use `animation-fill-mode: forwards`, WAAPI fill, or library fill behavior as durable UI state. Fill may visually bridge the end of a track, but it must not be the source of truth after settlement.
13. Require reduced motion behavior. Respect `prefers-reduced-motion` and product settings where present. Replace motion with instant state, opacity-only feedback, shorter duration, or non-motion affordances as appropriate.
14. Check input capability and parity. Hover motion requires hover and fine-pointer capability and must not be the only access path; keyboard, touch, and assistive interaction paths need equivalent state or feedback.
15. Prefer role/ref binding over brittle selectors. Recipes should bind to component slots, refs, semantic roles, or stable data hooks, not `nth-child`, layout-depth selectors, or visual-only class chains.
16. Define lifecycle and failure behavior. Development may throw on impossible recipes, but production should skip-effect-and-report animation failures while preserving the core UI action.
17. Separate contract review from runtime proof. Report whether evidence is static, test-backed, story-backed, browser-observed, or missing.

<!-- mustflow-section: postconditions -->
## Postconditions

- Motion intent has a state-transition contract, not only animation prose.
- Logical state owner, semantic event class, from-state, to-state, tracks, interruption, settlement, reduced motion, binding, lifecycle, and failure policies are named.
- Any same target/channel collision, false async signal, fill-mode state lie, layout-channel risk, hover-only behavior, selector-binding drift, or missing reduced-motion path is fixed or reported.
- Verification and evidence level are reported honestly.

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

Use focused tests, story fixtures, or browser checks only when the repository command contract exposes them as configured oneshot commands or the user explicitly authorizes that verification path.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the logical state owner cannot be found, stop motion-specific edits and report the missing state owner before changing animation timing.
- If from-state or to-state is unknown, keep the motion conservative and record the unknown transition instead of inventing a recipe.
- If async success or failure is timer-driven, route the issue to the async state owner and avoid success/failure motion until real signals exist.
- If reduced-motion behavior is missing, add an explicit policy or report it as a release-blocking accessibility risk for user-facing motion.
- If a same target/channel collision exists and additive composition is unsupported or unclear, remove, sequence, or split the conflicting tracks.
- If runtime proof is unavailable, report static contract evidence and the skipped visual verification instead of claiming the animation works.

<!-- mustflow-section: output-format -->
## Output Format

- Motion surfaces reviewed
- State owner and semantic event class
- From-state and to-state contract
- Timeline tracks and channel collision result
- Interruption, settlement, reduced-motion, lifecycle, and failure policies
- Binding approach and selector drift risk
- Async signal and false-feedback risk
- Verification run
- Skipped checks and reasons
- Remaining motion contract risk
