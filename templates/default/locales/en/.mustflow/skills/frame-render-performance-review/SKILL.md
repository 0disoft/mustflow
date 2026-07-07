---
mustflow_doc: skill.frame-render-performance-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: frame-render-performance-review
description: Apply this skill when browser rendering performance, per-frame work, INP, animation smoothness, scroll responsiveness, style recalculation, layout, forced synchronous layout, layout thrashing, paint, compositing, DOM size, CSS selector cost, global class toggles, CSS custom property churn, containment, content-visibility, virtualization, image or media geometry, IntersectionObserver, passive listeners, overscroll behavior, requestAnimationFrame, long tasks, web workers, OffscreenCanvas, ResizeObserver, runtime CSS injection, React memo, context rerenders, deferred rendering, transitions, hydration cost, DevTools rendering traces, or interaction-to-next-paint flame analysis need review.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.frame-render-performance-review
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

# Frame Render Performance Review

<!-- mustflow-section: purpose -->
## Purpose

Review browser rendering performance by reducing the work needed for each frame and interaction: JavaScript, style recalculation, layout, paint, compositing, and the next paint after user input.

The review question is not "did we add `useMemo`?" It is "what work does the browser have to redo before the next frame, and can the changed code reduce the affected DOM, style, layout, paint, or main-thread scope?"

<!-- mustflow-section: use-when -->
## Use When

- A frontend change affects animation, scrolling, drag, resize, pointer movement, keyboard input, search input, list rendering, charts, maps, canvas, virtualized lists, hydration, or any interaction whose next paint can lag.
- Code touches DOM reads and writes, `offset*`, `client*`, `scroll*`, `getBoundingClientRect()`, computed styles, inline styles, class toggles, CSS variables, runtime CSS injection, layout-affecting CSS properties, `will-change`, `contain`, `content-visibility`, `contain-intrinsic-size`, `aspect-ratio`, or media dimensions.
- Code touches scroll listeners, wheel or touch handlers, passive event listener options, `IntersectionObserver`, `ResizeObserver`, `requestAnimationFrame`, timers, long tasks, `scheduler.yield`, web workers, `OffscreenCanvas`, or canvas/chart redraw loops.
- Code touches React render boundaries, `memo`, `useMemo`, `useCallback`, context providers, `useDeferredValue`, `useTransition`, hydration, lazy islands, or framework-specific rerender behavior with user-perceived responsiveness risk.
- A review or final report claims smoother rendering, fewer layout shifts, better INP, less jank, faster animation, lower main-thread cost, smaller DOM cost, or improved DevTools rendering traces.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is about first discovery of LCP resources, critical CSS, font loading, first-view data, TTFB, CDN caching, resource hints, or first-render delivery rather than per-frame work; use `web-render-performance-review`.
- The task is about initial JavaScript bytes, tree-shaking, shared vendor chunks, package imports, polyfills, or bundler pruning rather than runtime frame cost; use `client-bundle-pruning-review`.
- The task is broad performance budgeting, backend latency, throughput, or p95/p99 service behavior without browser frame impact; use `performance-budget-check`.
- The task is only visual polish or accessibility with no frame, INP, style, layout, paint, or main-thread performance risk; use `ui-quality-gate`, `css-code-change`, or `html-code-change`.
- The needed proof requires an unconfigured browser trace, DevTools session, Lighthouse run, RUM report, dev server, profiler, or package-manager script. Report the missing measurement boundary instead of inventing raw commands.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Interaction and frame ledger: affected interaction, route, viewport, target frame rate, user-visible symptom, expected INP or next-paint boundary, and whether the path runs during startup, scroll, input, animation, resize, or idle.
- DOM and layout ledger: node count, tree depth, affected subtree, list size, virtualization boundary, layout containment, geometry reads, geometry writes, reserved media slots, and layout-shift evidence.
- DOM update ledger: node attach count, observable mutation count, keyed update behavior, fragment or template usage, `innerHTML`, `replaceChildren`, focus, selection, scroll position, listener ownership, and event delegation.
- Style and CSS ledger: class or attribute toggles, selector complexity, global state classes, CSS custom property scope, runtime style injection, CSS animations, transitions, `will-change`, `contain`, `content-visibility`, and stacking or containing block side effects.
- Paint and compositing ledger: animated properties, repaint area, layer promotion, transform and opacity usage, canvas or SVG drawing, image/video/ad slots, shadows, filters, clipping, and expensive visual effects.
- Event and scheduling ledger: scroll, wheel, touch, pointer, resize, observer, timer, `requestAnimationFrame`, long task, worker, `OffscreenCanvas`, `scheduler.yield`, debounce, throttle, and cancellation behavior.
- Framework render ledger: component rerender scope, React props stability, context value changes, memo boundaries, deferred updates, transitions, hydration scope, island or partial hydration strategy, and stale async result handling.
- Evidence ledger: DevTools Rendering or Performance panel findings, paint flashing, layout shift regions, Selector Stats, long task output, INP flame, RUM, trace, screenshot, configured tests, or missing evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available from current files, diffs, docs, configured outputs, user-provided evidence, or can be reported as missing without guessing.
- If changes touch actual HTML, CSS, framework code, canvas, media assets, accessibility, security-sensitive embeds, or package metadata, also use the matching narrower skill.
- If browser API or framework behavior is version-sensitive, verify against project dependencies or current official documentation before durable docs or code comments rely on it.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Separate DOM reads and writes, batch layout-affecting writes, move animations to transform or opacity, narrow or remove `will-change`, add safe containment, add `content-visibility` with intrinsic size, virtualize large lists, simplify selectors, narrow global class and CSS variable scope, reserve media geometry, replace JS scroll geometry polling with observers, add passive listeners where scroll is not cancelled, use CSS overscroll behavior, move visual updates into `requestAnimationFrame`, split long tasks, move DOM-free heavy work to workers, use `OffscreenCanvas` where supported, use `ResizeObserver`, reduce runtime CSS injection, narrow rerender scope, stabilize props and context values, defer expensive results, narrow hydration, add focused tests, and update directly synchronized docs or templates.
- Add instrumentation, trace notes, or budget assertions only when the repository already has a pattern or configured command intent.
- Keep edits local to the affected frame, interaction, component subtree, CSS scope, or scheduling path. Do not migrate frameworks, replace rendering engines, introduce virtualization libraries, add worker infrastructure, or start browser measurement workflows without explicit scope and command-contract support.
- Do not break accessibility, keyboard behavior, scroll intent, reduced motion, focus management, layout stability, media semantics, localization, authorization, privacy, or correctness merely to reduce frame work.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the bottleneck before optimizing. Separate JavaScript long task, style recalculation, layout, paint, compositing, hydration, or framework rerender risk. If no trace exists, label the finding as static frame-risk evidence.
2. Keep DOM reads and writes separate. Collect geometry reads such as `offsetHeight`, `scrollTop`, `getBoundingClientRect()`, and computed style first, then batch writes in a later phase or frame to avoid forced synchronous layout.
3. Look for layout thrashing inside loops, scroll handlers, resize handlers, animation steps, pointer moves, and render effects. Repeated read/write/read cycles are higher risk than a single geometry read.
4. Animate composite-friendly properties first. Prefer `transform` and `opacity` for movement and fade. Treat `width`, `height`, `top`, `left`, `margin`, layout-affecting grid values, and expensive filters as layout or paint suspects.
5. Use `will-change` only as a temporary hint. Add it shortly before real animation when evidence supports it, and remove it afterward. Do not leave broad `will-change` on static elements.
6. Add containment to independent widgets when safe. Cards, panels, messages, and dashboard tiles can use `contain` to limit layout and paint scope, but check containing block, stacking context, overflow, `position: fixed`, `absolute`, and z-index behavior.
7. Use `content-visibility: auto` for large below-fold sections. Pair it with `contain-intrinsic-size` or stable placeholders so skipped rendering does not create scroll jumps.
8. Stop offscreen work, not only offscreen rendering. For skipped or hidden charts, maps, canvas, or media widgets, pause redraws, resize loops, observers, polling, and expensive updates while the widget is not visible.
9. Virtualize long lists. Large tables, chat logs, feeds, option lists, and grids should keep only the visible window plus buffer in the DOM when item count can grow.
10. Reduce DOM depth and breadth where it affects a hot render path. Deep wrapper chains and wide repeated structures increase style and layout propagation even when no single node looks expensive.
11. Reduce DOM attachment and observable mutation count. `DocumentFragment` can make batch assembly cleaner, but it is not magic by itself; the win is fewer live DOM attachments, fewer layout-visible changes, and a narrower subtree to reconcile.
12. Avoid repeated hot-path `innerHTML` replacement. Replacing a large parent destroys node identity, focus, selection, scroll position, listener ownership, and browser reuse. Prefer keyed patching, targeted `replaceChildren`, template clones, or virtualization when only part of the subtree changed.
13. Use event delegation for large repeated regions. Lists, grids, tables, menus, and icon rows should usually attach one container listener and resolve the target with `closest()` instead of attaching thousands of per-node listeners.
14. Simplify selectors on hot or broad subtrees. Prefer simple class selectors over selectors that depend on deep descendants, complex siblings, expensive pseudo-classes, or global ancestor state.
15. Focus on invalidation scope, not selector folklore alone. Ask how many elements a class, attribute, CSS variable, or DOM mutation invalidates before spending time on cosmetic selector rewrites.
16. Avoid broad global class toggles. `body` or `html` state changes force wide style invalidation. Use the narrowest subtree root unless the state is truly global, such as theme.
17. Scope frequently changing CSS variables close to the affected subtree. Avoid changing `:root` custom properties on pointer move, scroll, drag, or animation. Use non-inheriting registered properties when project support and browser targets allow it.
18. Reserve media, ad, and embed geometry. Use width, height, `aspect-ratio`, or stable placeholders so image, video, iframe, and ad loads do not trigger layout shifts and repeated paint.
19. Keep LCP media and first-render discovery concerns routed to `web-render-performance-review`. In this skill, focus on whether loaded media shifts layout, repaints broad regions, or forces per-frame work.
20. Prefer native lazy loading for below-fold images and iframes when it covers the case. Avoid JS lazy loaders that add scroll handlers, observers, state churn, and rerenders without a project reason.
21. Use `IntersectionObserver` for visibility and infinite-scroll triggers. Do not calculate viewport intersection manually on every scroll event unless a browser limitation forces it.
22. Debounce or throttle high-frequency input only after deciding the interaction contract. Scroll, resize, pointermove, mousemove, and text input can flood async work, state updates, layout reads, and network calls; keep urgent visual feedback separate from delayed heavy work.
23. Use passive wheel, touch, and scroll listeners when the handler does not call `preventDefault()`. Do not mark listeners passive when the gesture intentionally cancels scrolling.
24. Use CSS `overscroll-behavior` before JavaScript scroll blocking for modals, drawers, and nested scroll containers. Keep JS scroll locks as the narrow fallback for focus and body-lock requirements.
25. Schedule visual writes with `requestAnimationFrame`. Do not use fixed `setTimeout(..., 16)` as a frame clock. Use the animation timestamp so high-refresh displays do not speed up motion.
26. Split long tasks. Work longer than one frame or around 50ms should yield between chunks, show urgent UI first, and move non-urgent analytics, cache cleanup, validation, or transformation out of the immediate interaction path.
27. Move DOM-free heavy computation off the main thread when the boundary cost is worth it. Filtering, sorting, diffing, crypto, markdown parsing, image preprocessing, and search indexing can move to a worker when data transfer and cancellation are defined.
28. Consider `OffscreenCanvas` for heavy canvas rendering when browser targets and architecture support it. Charts, whiteboards, maps, and image editors should not block input and paint if a worker boundary is practical.
29. Use `ResizeObserver` for element size changes. Avoid window resize handlers that read every card and write layout back in the same pass.
30. Avoid runtime CSS rule churn. Do not inject new style tags or rules during click, hover, drag, pointer move, or repeated list rendering. Use static classes and narrow CSS variables where dynamic values are needed.
31. Treat React `memo` as a rerender scope tool, not a cure. It fails when props are fresh objects, arrays, or functions each render. Prefer smaller component boundaries and stable primitive props.
32. Split React context by change frequency and audience. A fresh provider object rerenders all consumers of that context; do not put theme, auth, permissions, feature flags, and editor state into one object unless they change together.
33. Keep input updates urgent and heavy results deferred. Use deferred rendering or transitions for large filtered lists, charts, panels, or route changes when immediate input feedback matters more than full result freshness.
34. Narrow hydration. SSR can still hurt INP when the client hydrates too much at once. Hydrate only interactive islands early and defer low-priority regions by visibility, idle time, or route intent when the framework supports it.
35. Verify with the right evidence. Prefer DevTools Performance, paint flashing, layout shift regions, Selector Stats, Long Tasks API or `PerformanceObserver`, and INP flame evidence when configured or provided. If unavailable, report static risks and skipped measurement reasons.

<!-- mustflow-section: postconditions -->
## Postconditions

- The affected interaction, frame phase, DOM scope, style scope, layout reads/writes, paint or compositing cost, scheduling path, and framework render boundary are explicit where relevant.
- Forced synchronous layout, layout thrashing, layout-affecting animations, stale `will-change`, missing containment, unsafe `content-visibility`, offscreen background work, oversized DOM, high mutation count, hot-path `innerHTML`, missing event delegation, complex selectors, broad style invalidation, broad global class toggles, root CSS variable churn, unreserved media geometry, JS scroll polling, high-frequency event floods, non-passive listeners, JS scroll blocking, timer-based animation, long tasks, main-thread heavy computation, canvas main-thread cost, resize measurement loops, runtime CSS injection, ineffective memo, broad context rerenders, urgent heavy results, and full hydration cost are fixed or reported.
- Rendering performance claims are backed by current configured evidence or labeled as static frame-risk, manual-only measurement, or missing evidence.
- Accessibility, focus, scroll intent, reduced motion, layout stability, privacy, and framework semantics remain intact or are reported as tradeoffs.

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

Use the narrowest configured test, build, docs, release, or mustflow intent that covers the changed rendering path. Use DevTools, browser traces, Lighthouse, RUM, dev servers, or profiler workflows only when they are configured one-shot intents or explicitly approved by the user.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the affected frame phase is unknown, report the unknown before adding memoization, observers, workers, containment, or virtualization.
- If a configured test or build fails, preserve the failing intent and output tail, then fix only the rendering, CSS, framework, or scheduling boundary exercised by the failure.
- If the fix needs unconfigured browser measurement, dev servers, worker infrastructure, virtualization dependencies, framework upgrades, or profiler tooling, stop and report the missing product or command-contract decision.
- If frame performance conflicts with accessibility, scroll intent, focus management, reduced motion, layout stability, or correctness, keep the safer behavior and report the tradeoff.
- If verification fails after a frame-rendering change, use `failure-triage` before broadening the fix.

<!-- mustflow-section: output-format -->
## Output Format

- Frame rendering surface reviewed
- Interaction, frame phase, DOM/style/layout/paint/compositing/scheduling/framework ledgers
- Findings or fixes
- Evidence level: measured, configured-test evidence, static frame-risk, manual-only, missing, or not applicable
- Command intents run
- Skipped browser or rendering measurements and reasons
- Remaining frame-render performance risk
