---
mustflow_doc: skill.web-render-performance-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: web-render-performance-review
description: Apply this skill when web pages, frontend routes, landing pages, ecommerce pages, dashboards, SSR/RSC/SPA routes, hero media, LCP candidates, CSS, fonts, images, iframes, third-party scripts, client bundles, hydration boundaries, route prefetching, first-view data, HTML streaming, CDN caching, resource hints, long tasks, Core Web Vitals, or web-performance tests need review for first-render performance, LCP, CLS, FCP, TTFB, render-blocking CSS, asset priority, JavaScript execution cost, or cache and delivery risk.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.web-render-performance-review
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

# Web Render Performance Review

<!-- mustflow-section: purpose -->
## Purpose

Review web first-render performance as a critical rendering path problem: the browser must discover the first viewport HTML, CSS, data, fonts, scripts, and LCP media early, while noncritical work stays out of the way.

The review question is not "did we compress assets?" It is "what blocks the first useful pixels, what competes with the LCP resource, what shifts layout later, and what work runs on the main thread before the user can see or use the page?"

<!-- mustflow-section: use-when -->
## Use When

- A web page, frontend route, landing page, product page, dashboard, SPA, SSR route, RSC route, streamed page, app shell, or route transition is created, changed, reviewed, or reported with performance risk.
- Code touches hero images, above-the-fold media, CSS delivery, global styles, route CSS, fonts, font preloads, responsive images, lazy media, iframes, embeds, ads, chat widgets, analytics, tag managers, maps, charts, editors, markdown renderers, syntax highlighters, or third-party scripts.
- Code touches client/server component boundaries, hydration, dynamic imports, code splitting, modulepreload, route prefetching, first-view data fetching, SSR loaders, serialized initial data, Suspense, streaming HTML, CDN HTML caching, cache headers, compression, Early Hints, preconnect, `content-visibility`, workers, idle work, or long main-thread tasks.
- A review or final report claims improved Core Web Vitals, LCP, CLS, FCP, TTFB, critical CSS, bundle size, render-blocking behavior, lazy loading, preloading, cacheability, or first-render speed.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only backend latency, database throughput, queue throughput, repeated work, or p95/p99 service behavior without browser first-render impact; use `hot-path-performance-review`, `database-query-bottleneck-review`, or `performance-budget-check`.
- The task is only visible flicker, hydration flash, theme flash, route transition jank, or blank first render as a symptom; use `frontend-render-stability` first, then this skill only if the root cause is resource, data, cache, bundle, or main-thread performance.
- The task only adds, converts, resizes, or replaces raster image files; use `web-asset-optimization` for asset bytes and this skill only if page delivery, LCP priority, or responsive markup also changes.
- The task is only visual layout polish, accessibility, styling correctness, or design-token work with no render-performance claim; use `ui-quality-gate`, `html-code-change`, or `css-code-change`.
- A real browser, network waterfall, Lighthouse, WebPageTest, trace, RUM, or lab measurement is required but no configured one-shot intent or explicit user-approved workflow exists. Report the measurement gap instead of inventing raw browser, server, profiler, or package-manager commands.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- First viewport and LCP candidate ledger: route, viewport, largest visible element candidates, hero media, above-the-fold text, skeletons, fallback content, and responsive breakpoints.
- Critical resource discovery ledger: HTML location, markup versus CSS background, preload, preconnect, Early Hints, modulepreload, framework image component behavior, SSR or CSR discovery timing, and competing high-priority resources.
- CSS and render-blocking ledger: critical CSS, global CSS, route CSS, common or vendor CSS, unused above-the-fold rules, CSS-in-JS injection timing, and blocking stylesheet order.
- Font loading ledger: font files, weights, subsets, `unicode-range`, format, preload list, `font-display`, fallback metrics, Korean or CJK coverage, FOIT risk, and CLS risk.
- Image, video, and iframe ledger: `srcset`, `sizes`, intrinsic dimensions, `aspect-ratio`, lazy/eager loading, `fetchpriority`, CDN transformation, thumbnails, embeds, ads, maps, and offscreen media.
- Third-party script ledger: analytics, tag managers, ads, A/B testing, heatmaps, chat widgets, payment widgets, maps, embeds, consent gates, page scope, and user-intent loading.
- JavaScript bundle and hydration ledger: initial route bundle, client/server boundaries, `use client` placement, dynamic imports, chunk graph, modulepreload, route prefetching, parse/compile/execute cost, and main-thread tasks.
- Data and HTML delivery ledger: first-view data owner, SSR/RSC/loader/static generation, client effects, serialized initial data, streaming shell, Suspense or loading boundaries, personalization holes, and TTFB evidence.
- Cache, compression, and resource-hint ledger: CDN HTML cacheability, cache-control headers, fingerprinted assets, private data boundaries, text compression, Early Hints, preconnect origins, and preload accuracy.
- Main-thread and long-task ledger: expensive parsing, syntax highlighting, charting, search indexing, markdown rendering, JSON work, layout-heavy below-fold DOM, idle work, worker offload, and chunking strategy.
- Existing tests, performance budgets, traces, RUM, lab reports, build output, bundle output, server timing, or configured command-intent evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available from current files, diffs, docs, configured outputs, or user-provided evidence, or missing inputs can be reported without guessing.
- Framework-specific APIs and delivery behavior are verified against project dependencies or current official documentation before durable docs or framework-specific code changes rely on them.
- If the change modifies actual HTML, CSS, framework, image assets, security-sensitive third-party scripts, cache privacy, or backend TTFB behavior, also use the matching narrower skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Adjust LCP media loading, responsive image markup, intrinsic dimensions, priority hints, critical CSS, route CSS splitting, font loading, font preloads, font subsets, lazy media, iframe loading, third-party script gates, chat-widget loading, hydration boundaries, dynamic imports, route prefetch policy, first-view data ownership, HTML streaming boundaries, static shell and dynamic hole split, cache headers, compression settings, resource hints, below-fold rendering containment, long-task scheduling, focused tests, and directly synchronized docs or templates.
- Add lightweight instrumentation or assertions for LCP candidate delivery, query or data count, server timing, bundle or asset budgets, resource hints, cache headers, or lazy-media geometry when the repository already has a pattern or configured intent.
- Keep changes local to the proven first-render path. Do not introduce a new framework, CDN, image service, analytics stack, service worker, router, bundler, worker runtime, or benchmark harness without explicit product and command-contract support.
- Do not trade correctness, accessibility, privacy, security, authorization, localization, cache safety, visual stability, or user control for faster-looking first paint.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify the LCP candidate before tuning. Name the likely largest first-viewport element for desktop and mobile, whether it is text, image, video poster, background image, or rendered component, and how the browser discovers it.
2. Do not lazy-load the LCP image. Above-the-fold hero or first product media should be eager by default, and `fetchpriority="high"` should be reserved for the actual LCP resource after checking competing resources and framework behavior.
3. Preload background hero images when CSS hides discovery. If the LCP candidate is a CSS background, carousel first slide, dynamically selected hero, or responsive background, add or verify an accurate preload strategy instead of assuming the browser finds it early.
4. Budget `fetchpriority`. Marking many resources as high is priority inflation; it makes the browser choose between too many "urgent" things. Use high priority for the one critical candidate and leave secondary assets normal or lazy.
5. Inline only critical CSS needed for the first viewport when the project supports it. Do not inline large global styles, component libraries, or below-fold rules under the name of critical CSS.
6. Split route CSS. A common, global, vendor, or design-system stylesheet that grows with every page can block render for pages that use only a fraction of it.
7. Choose `font-display` deliberately. Decide whether `optional`, `swap`, or another strategy is right for the page, then check fallback metrics so text appears quickly without large layout shifts.
8. Preload only first-view fonts. Preload the exact font file, weight, subset, and format needed for first paint; do not preload every family, weight, italic variant, icon font, or locale subset.
9. Subset Korean and CJK fonts. Large Korean, Japanese, Chinese, and full Unicode fonts need subsets, `unicode-range`, variable or minimal weights, and fallback planning before they are allowed on the first-render path.
10. Use `srcset` and `sizes` before celebrating WebP or AVIF. A modern format still hurts if the browser downloads a desktop-sized image on mobile or an image wider than its rendered slot.
11. Use an image CDN or transformation pipeline when the page has many responsive images and the repository already supports one. The important property is per-device dimensions, format, quality, and cacheability, not the vendor name.
12. Reserve space for lazy media. Offscreen images, videos, ads, embeds, and iframes can lazy-load, but they need width, height, `aspect-ratio`, placeholders, or stable containers so they do not create CLS later.
13. Lazy-load or click-load offscreen iframes and heavy embeds. Maps, videos, dashboards, social embeds, and ads should not compete with first paint unless they are the first task on the page.
14. Gate third-party scripts by page, consent, timing, and user intent. Analytics, heatmaps, tag managers, A/B tests, widgets, and ads should not load globally just because one route might use them.
15. Defer chat widgets until intent. A chat launcher can be visible without loading the full SDK, iframe, fonts, analytics, and network stack before first paint.
16. Keep `use client` boundaries narrow in React and Next.js style apps. A top-level layout or page marked client-side can drag static markup, data, and child components into the hydration and bundle cost.
17. Lazy-load heavy interactive widgets. Modals, charts, editors, maps, markdown renderers, syntax highlighters, date pickers, and rarely opened panels should usually enter through dynamic import or route-level loading.
18. Split code by "not needed for this route now," not by chunk theater. Too many tiny chunks can add request and module scheduling overhead, while one giant common chunk ships unused code everywhere.
19. Use `modulepreload` only for critical initial modules. Preloading every possible route, widget, or secondary chunk creates a new waterfall in nicer clothes.
20. Do not fetch first-view data in a client effect when server, route loader, RSC, static generation, or serialized initial data can safely provide it. Client effects are for enhancement, subscriptions, and browser-only data, not required first pixels.
21. Stream HTML and shell early. Send stable layout, navigation, critical content, and placeholders as soon as possible; put slow regions behind Suspense, loading boundaries, or progressive sections when the framework supports it.
22. Split static shells from dynamic holes. Cache and reuse stable HTML around narrow personalized or fast-changing regions instead of making the whole page uncached and origin-bound for one username, cart count, or recommendation slot.
23. Investigate slow TTFB before polishing the browser side. If TTFB is around or above one second, use Server-Timing, origin logs, cache status, query count, API count, SSR timing, or configured evidence to find the upstream wait.
24. Cache HTML at the edge when it is safe. Low-personalization pages can often be CDN cached with revalidation or hole punching; private or user-specific pages need explicit cache boundaries to avoid data leaks.
25. Cache fingerprinted assets with long immutable headers. Do not confuse `no-cache`, `no-store`, `private`, and long-lived immutable caching; the wrong header can either slow every visit or leak user-specific content.
26. Enable text compression for HTML, CSS, JS, JSON, SVG, and other text resources. Do not waste time recompressing already compressed media such as JPEG, PNG, WebP, AVIF, video, or font formats that are already compressed.
27. Use Early Hints and preconnect sparingly. They help only when the critical resource or origin is definitely needed soon; speculative hints for many origins can steal sockets and bandwidth from the real first-render path.
28. Use `content-visibility: auto` with `contain-intrinsic-size` for huge below-fold DOM when supported. It can reduce early layout and paint work, but missing intrinsic size can cause scroll jumps.
29. Break long main-thread tasks. Heavy JSON parsing, syntax highlighting, chart rendering, markdown rendering, search indexing, diffing, and data formatting may need chunking, idle callbacks, workers, virtualization, or server-side precomputation.
30. Audit route prefetch behavior. Framework prefetching can help a few likely next clicks, but a page with hundreds of links can turn prefetch into a silent network and CPU tax; disable or move it to hover or viewport intent when needed.
31. Label evidence honestly. If there is no configured browser trace, network waterfall, bundle report, RUM, or lab measurement, report findings as static critical-path risk or configured-test evidence, not measured Web Vitals improvement.

<!-- mustflow-section: postconditions -->
## Postconditions

- The first viewport, LCP candidate, discovery path, critical CSS, fonts, media, scripts, data, HTML delivery, cache behavior, resource hints, and main-thread work are explicit.
- Lazy LCP media, hidden background hero discovery, priority inflation, render-blocking global CSS, over-preloaded fonts, unsubset Korean or CJK fonts, oversized images, missing dimensions, eager offscreen embeds, global third-party scripts, broad client boundaries, eager heavy widgets, client-effect first data, all-or-nothing HTML waits, unsafe cache headers, hint spam, below-fold layout work, long tasks, and overbroad prefetch are fixed or reported.
- Performance claims are backed by current configured evidence or labeled as static review risk, manual-only measurement, or missing evidence.
- Accessibility, layout stability, privacy, security, cache correctness, and framework boundaries remain intact or are reported as tradeoffs.

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

Use the narrowest configured test, build, docs, release, or mustflow intent that covers the changed render path. Use browser, Lighthouse, WebPageTest, trace, RUM, bundle-analyzer, server, CDN, or profiler workflows only when they are configured one-shot intents or explicitly approved by the user.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the LCP candidate or first viewport is unknown, report the unknown before adding preloads, priority hints, or lazy-loading changes.
- If a configured test or build fails, preserve the failing intent and output tail, then fix only the render, resource, cache, or template contract exercised by the failure.
- If the fix needs unconfigured browser measurement, dev servers, production traces, CDN changes, package-manager scripts, or framework upgrades, stop and report the missing command or product decision.
- If speed conflicts with privacy, authorization, cache safety, accessibility, or layout stability, keep the safer behavior and report the performance tradeoff.
- If verification fails after a performance change, use `failure-triage` before broadening the fix.

<!-- mustflow-section: output-format -->
## Output Format

- Web render surface reviewed
- First viewport and LCP candidate
- Resource discovery, CSS, font, media, third-party, JavaScript, data, cache, hint, and main-thread ledgers
- Findings or fixes
- Evidence level: measured, configured-test evidence, static critical-path risk, manual-only, missing, or not applicable
- Command intents run
- Skipped browser or performance measurements and reasons
- Remaining web-render performance risk
