---
mustflow_doc: skill.frontend-render-stability
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: frontend-render-stability
description: Apply this skill when frontend navigation flicker, theme flash, hydration flash, blank initial render, unstable loading shell, route transition jank, BFCache breakage, browser-native navigation regression, or first-paint instability is reported, created, edited, reviewed, or verified.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.frontend-render-stability
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - docs_validate_fast
    - mustflow_check
---

# Frontend Render Stability

<!-- mustflow-section: purpose -->
## Purpose

Diagnose and fix visible frontend instability by proving which layer flashes first: document navigation, theme or CSS application, hydration, first-render data, loading layout, font or media loading, or view-transition behavior.

This skill is symptom-first. It is not an Astro, SvelteKit, CSS, or performance checklist by itself. Use it to decide the root cause order, then activate the narrower framework, markup, CSS, UI, or performance skill before editing that surface.

<!-- mustflow-section: use-when -->
## Use When

- A user reports page flicker, theme flash, flash of unstyled content, dark-mode flash, blank page before content, hydration flash, route transition jank, state loss across navigation, layout shift during loading, or slow first visible render.
- A change adds, removes, or reviews client-side routing, view transitions, prefetching, shared layouts, persistent shells, early theme initialization, root HTML templates, hydration boundaries, skeletons, font loading, or first-render data flow.
- An Astro, SvelteKit, React, Vue, or other frontend app needs evidence that navigation keeps the common UI and theme stable instead of replacing the whole document unnecessarily.
- Browser-only state, local storage, cookies, media queries, locale, time, randomness, or async client effects affect initial HTML, hydration, or theme selection.
- A change may replace browser-native navigation, form submission, history, scrolling, focus restoration, BFCache eligibility, event delivery, or image/font loading with JavaScript behavior.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is ordinary visual polish with no navigation, first-paint, hydration, loading, or route-transition symptom; use `ui-quality-gate` or `css-code-change`.
- The task is only framework-specific routing, content, or data behavior with no visible instability; use the matching framework skill.
- The change is purely backend performance, database latency, or queue throughput with no browser render impact; use `performance-budget-check`.
- A configured browser, visual, or performance verification intent is missing. Do not invent ad hoc dev-server, watcher, or browser-session steps inside this skill; report the missing intent.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Symptom description, affected routes, whether it happens on first load, client-side navigation, hard reload, theme toggle, slow network, reduced motion, or reduced data.
- App framework, version signals, root HTML or layout files, route/link components, router configuration, root CSS, theme initialization, font loading, and affected components.
- Evidence from current files or allowed verification showing whether navigation requests a new document, whether the shared shell persists, and when theme and CSS are applied.
- Data-loading ownership for above-the-fold content: SSR or static data, route load function, streamed data, client effect, store initialization, or browser-only fetch.
- Native browser contracts affected by the change: anchors, forms, history, scroll restoration, focus, BFCache, HTTP cache, service worker, preload hints, passive event listeners, Pointer Events, ResizeObserver, IntersectionObserver, or abortable requests.
- Configured verification intents and any project-approved visual, browser, or build checks.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and the command contract have been checked.
- The symptom is tied to a visible render, navigation, first-paint, or loading behavior, not only subjective animation preference.
- Framework-specific API names and browser features are verified against project dependencies or current official documentation before relying on them in code or durable docs.
- Any external advice, snippets, or AI output is treated as input, not authority.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Root HTML templates, app shells, layouts, route links, router configuration, early theme scripts, root CSS, theme tokens, font and media loading hints, skeleton or loading state layout, hydration boundaries, route data loaders, and tests or docs directly tied to render stability.
- Browser-native behavior restoration such as semantic links/forms, reserved media geometry, `fetchpriority` where appropriate, passive event listeners, abortable stale requests, focus restoration, BFCache-safe lifecycle handling, and reduced JavaScript work before first paint.
- Framework-specific edits only after using the matching skill, such as `astro-code-change`, `svelte-code-change`, `html-code-change`, `css-code-change`, or `ui-quality-gate`.
- Keep fixes local to the proven instability layer. Do not migrate frameworks, disable SSR, convert the app to an SPA, add a client router, add animation libraries, or broaden preload behavior without evidence and a reported tradeoff.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the symptom by phase: hard reload, same-document navigation, cross-document navigation, first paint, hydration, data arrival, loading placeholder, font swap, media load, theme toggle, or view-transition animation.
2. Prove or rule out a full document reload before optimizing animation. Inspect link behavior and router configuration first. In browser evidence, a new `document` request during an internal navigation usually means the shared shell, CSS, and theme are being replaced.
3. If full reload is not intended, inspect the framework-native navigation path before adding custom JavaScript:
   - Astro: check whether `<ClientRouter />` is intentionally present, whether links opt out with `data-astro-reload`, whether persistent shared UI needs `transition:persist`, whether `astro:before-swap` or `astro:after-swap` must preserve theme state, and whether prefetch policy is bounded.
   - SvelteKit: check whether internal links or GET forms are using normal SvelteKit navigation, whether `data-sveltekit-reload`, `rel="external"`, or direct `window.location` forces a reload, whether `data-sveltekit-preload-data` or `data-sveltekit-preload-code` is appropriate, and whether `onNavigate` view-transition work can finish quickly.
   - Other frameworks: use their native router, layout persistence, and preload primitives before adding a second navigation layer.
4. If the symptom is a theme or color flash, inspect first-paint ordering. Theme state that changes global colors must be applied on `document.documentElement` before first paint when possible, with `color-scheme`, root `html, body` backgrounds, and CSS tokens matching the same state. Do not rely on component mount or a late store subscription for initial theme.
5. If CSP is active, check the framework's supported nonce, hash, or template mechanism before adding inline early scripts. Do not weaken CSP just to hide a flash.
6. If hydration flashes or mismatches appear, compare server-rendered markup with first client state. Remove time, randomness, locale, timezone, viewport, localStorage, and browser-only values from SSR-visible initial markup unless they are serialized or guarded with an intentional placeholder.
7. If above-the-fold content appears blank until client effects run, move first-render data to the framework's route loader, server data, static generation, or serialized initial data when that matches secrecy and freshness rules. Use client effects for enhancement, subscriptions, and browser-only work, not required initial page data.
8. If a client effect fetches required first-screen data, check whether it can move to server/static/route data. When it must stay client-side, abort stale requests, ignore obsolete responses, and keep the previous stable shell until the new result is ready.
9. If loading UI shifts layout, reserve final geometry for skeletons, images, videos, embeds, ads, fonts, and lazy content. Loading states should preserve the app shell and task context rather than replacing the page with an unrelated blank screen.
10. For LCP media, avoid accidental lazy loading, reserve dimensions, and use project-approved priority hints only for the actual first-viewport candidate. Do not preload every hero-like asset.
11. Check whether JavaScript replaced a browser-native contract. Prefer anchors for navigation, forms for form submission, CSS for simple states, native scroll behavior where acceptable, Pointer Events over duplicate mouse/touch stacks, passive listeners for scroll-blocking inputs, and observers over polling.
12. Preserve BFCache and history behavior where possible. Avoid unconditional `unload` handlers, global synchronous storage work during navigation, and stale global state that assumes every navigation creates a fresh document.
13. If view transitions are used, treat motion as progressive enhancement. Keep names unique where required, avoid duplicate rendered `view-transition-name` values, respect reduced motion, and disable or narrow transitions that conceal content state changes or stall navigation.
14. Check font and CSS delivery only after document reload, theme order, hydration, and data timing are understood. Use project-approved font loading, preloads, `font-display`, and root background policies without bypassing existing asset strategy.
15. Choose the narrowest configured verification intents that cover the changed layer. If a real browser, visual diff, network-panel, throttled-load, BFCache, or INP check would be required but no configured one-shot intent exists, report that gap instead of claiming visual proof.

<!-- mustflow-section: postconditions -->
## Postconditions

- The report names the proven or most likely instability layer and the layers ruled out.
- Navigation behavior is intentional: full document reload is either removed, preserved with a reason, or reported as an unresolved product decision.
- Theme, CSS, font, hydration, data, loading, and transition changes preserve accessibility, reduced motion, state ownership, and framework boundaries.
- Native browser contracts are preserved, restored, or explicitly traded off with a reason.
- Any framework-specific changes have used the matching framework skill.
- Visual verification is current and explicit, or the missing configured visual/browser intent is reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `docs_validate_fast`
- `mustflow_check`

Use broader configured tests only when route behavior, SSR/client boundaries, public docs, templates, or shared UI contracts change. Use visual or browser verification only through configured one-shot intents or an explicit user-approved workflow.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the symptom cannot be reproduced from current evidence, report the reproduction gap and avoid adding speculative router, animation, or preload code.
- If the fix would require a new router, SSR disablement, framework migration, CSP weakening, global preload policy, or development server workflow, stop and report the architectural or command-contract decision needed.
- If JavaScript is fighting browser defaults, remove the unnecessary ownership first before adding more lifecycle hooks, timers, polling, or global state.
- If official framework docs conflict with snippets or older advice, follow the current project version and official docs, then report the source-freshness boundary.
- If verification fails after a render-stability change, use `failure-triage` before broadening the fix.
- If the route is stable but visual polish remains, hand off to `ui-quality-gate` or `css-code-change` instead of expanding this skill.

<!-- mustflow-section: output-format -->
## Output Format

- Symptom and affected phase
- Evidence inspected
- Instability layer found or ruled out
- Framework-specific skills used
- Files changed
- Command intents run
- Skipped visual or browser checks and reason
- Remaining render-stability risk
