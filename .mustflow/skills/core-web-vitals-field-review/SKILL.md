---
mustflow_doc: skill.core-web-vitals-field-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: core-web-vitals-field-review
description: Apply this skill when Core Web Vitals, real-user web performance, CrUX, Search Console page experience, Lighthouse-versus-field discrepancies, RUM instrumentation, web-vitals reporting, LCP, INP, CLS, TTFB, LCP subparts, interaction latency, LoAF, long tasks, bfcache, speculation rules, third-party scripts, tag managers, ads, web fonts, responsive hero media, layout shifts, or deployment performance regressions need review from field data rather than a one-off lab score.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.core-web-vitals-field-review
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

# Core Web Vitals Field Review

<!-- mustflow-section: purpose -->
## Purpose

Review Core Web Vitals as a field-data operating contract, not as a Lighthouse trophy.

The review question is: "Will real users at the 75th percentile on mobile and desktop separately pass LCP, INP, and CLS after this change, and do we have enough attribution to know why not?" Lab tools can reproduce and debug, but Core Web Vitals pass/fail is a real-user distribution problem.

<!-- mustflow-section: use-when -->
## Use When

- Code, docs, tests, reports, dashboards, budgets, or final claims mention Core Web Vitals, page experience, CrUX, Search Console, RUM, Lighthouse, PageSpeed Insights, LCP, INP, CLS, FID replacement, TTFB, first-view performance, interaction responsiveness, layout stability, or web-performance regression.
- A web route, landing page, ecommerce page, dashboard, app shell, SSR/RSC/SPA route, hero media, client bundle, hydration boundary, third-party script, tag manager, ad slot, font, image, iframe, route prefetch, bfcache, or speculation rules change may affect real-user LCP, INP, or CLS.
- A lab score looks good but Search Console, CrUX, RUM, or production users report poor Web Vitals.
- The work needs to decide whether to use `web-render-performance-review`, `image-delivery-performance-review`, `frame-render-performance-review`, `client-bundle-pruning-review`, or `performance-budget-check` next.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only first-render resource discovery, critical CSS, LCP media delivery, TTFB, or cache delivery with no field-data or Core Web Vitals pass/fail claim; use `web-render-performance-review`.
- The task is only image delivery, responsive image markup, image CDN behavior, or image safety; use `image-delivery-performance-review`.
- The task is only frame jank, scroll performance, layout thrash, animation smoothness, or interaction rendering cost; use `frame-render-performance-review`.
- The task is only bundle size, tree shaking, initial JS, or shared vendor weight; use `client-bundle-pruning-review`.
- The task requires collecting new production RUM, opening Search Console, running Lighthouse, starting a browser, launching a dev server, or querying analytics, but no user-provided evidence or configured one-shot intent exists. Report the measurement gap instead of inventing raw browser or service workflows.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Metric contract: current official thresholds when they matter, target percentile, mobile versus desktop split, page or route grouping, route templates, release window, and whether the claim is field, lab, or static risk.
- Field evidence ledger: RUM events, CrUX, Search Console, PageSpeed field data, navigation type, URL, route, device class, connection type, viewport, memory, country or region when safe, and sampling or privacy policy.
- LCP ledger: candidate element, viewport, TTFB, resource load delay, resource load duration, element render delay, discovery path, priority, image candidate size, font or text candidate, render-blocking CSS, JavaScript blockage, and cache status.
- INP ledger: interaction target, interaction type, input delay, processing duration, presentation delay, main-thread queue, hydration, render cascade, long tasks, Long Animation Frames, third-party work, worker boundary, and affected route state.
- CLS ledger: shift source, session window, images and media geometry, ad or embed slots, banners, toasts, personalization, skeleton contracts, font fallback metrics, animations, and user-input exception boundary.
- Lab and diagnostics ledger: Lighthouse, WebPageTest, DevTools trace, Performance panel, LoAF entries, long tasks, Server-Timing, bundle output, resource waterfall, bfcache diagnostics, speculation-rules evidence, or missing evidence.
- Relevant command-intent contract entries for build, tests, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available from current files, diffs, docs, provided reports, configured outputs, or the missing evidence can be reported honestly.
- Current thresholds, browser support, and API status are verified against official sources before adding durable docs, hard-coded gates, or public claims that depend on them.
- If the fix changes HTML, CSS, images, scripts, bundles, framework boundaries, cache headers, or third-party loading, also use the matching narrower skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or adjust RUM instrumentation, metric payload fields, route grouping, privacy-safe attribution, p75 reporting, metric budgets, field-versus-lab wording, LCP candidate annotations, Server-Timing, resource timing hooks, LoAF or long-task capture, bfcache diagnostics, and focused tests when local patterns support them.
- Adjust LCP resource discovery, hero loading, responsive images, critical CSS, fonts, server HTML streaming, hydration boundaries, main-thread scheduling, worker offload, third-party script gates, ad or embed reservation, skeleton geometry, content visibility, route prefetch, and speculation rules only when the repository owns that surface and the matching narrower skill supports the change.
- Do not add unbounded analytics payloads, personal data, raw selectors that expose private content, production-only service calls, third-party tags, new analytics vendors, new browser harnesses, or speculative preload/prerender behavior without product and command-contract support.
- Do not claim a Core Web Vitals improvement from a Lighthouse score alone when field data is absent.

<!-- mustflow-section: procedure -->
## Procedure

1. Anchor the pass/fail contract. As of 2026-06-14, the official "good" Core Web Vitals targets are LCP at or below 2.5 seconds, INP at or below 200 milliseconds, and CLS at or below 0.1, evaluated at the 75th percentile. Re-verify official thresholds before durable public docs or hard-coded policy.
2. Split mobile and desktop. Do not average them together. A desktop p75 pass can hide a mobile failure, and field tools classify experiences by user distributions, not developer machines.
3. Treat INP as current, FID as legacy. INP replaced FID as a Core Web Vital on 2024-03-12; keep FID only when reviewing legacy dashboards or old historical baselines.
4. Classify evidence before conclusions.
   - Field evidence: RUM, CrUX, Search Console, PageSpeed field data, or production telemetry.
   - Lab evidence: Lighthouse, WebPageTest, DevTools traces, local throttled runs, or synthetic monitoring.
   - Static risk: code or config shape without measurement.
   - Manual-only or missing: evidence that cannot be collected through configured intents or user-provided artifacts.
5. Prefer RUM first for operating decisions. Capture metric `rating`, route, URL template, navigation type, metric element or target when safe, load state, viewport class, device memory, effective connection type, and release version when local privacy policy allows it.
6. Report percentiles, not averages. Track p75 for pass/fail and p90 or p95 for tail diagnosis; averages hide the slow devices and bad networks that usually decide field status.
7. Explain Lighthouse-versus-field gaps. A clean lab score can still fail field data because CrUX and RUM include real devices, real networks, cache states, third-party drift, bfcache behavior, route mix, and 28-day rolling windows.
8. Break LCP into subparts: TTFB, resource load delay, resource load duration, and element render delay. Do not call an image "optimized" until discovery, download, and render delay are each accounted for.
9. Keep LCP resource discovery early. Lazy LCP images, CSS background heroes without preload, late client-rendered heroes, wrong `sizes`, font-blocked text candidates, and render-blocking CSS belong in `web-render-performance-review` or `image-delivery-performance-review`.
10. Treat `fetchpriority` and preload as different levers. Preload helps discovery; `fetchpriority` changes priority after discovery. Too many high-priority resources create priority inflation.
11. Use SSR, streaming, static shells, and dynamic holes to lower first-view waits. If TTFB is high, check origin work, cache status, Server-Timing, query counts, API fan-out, and personalization before polishing image bytes.
12. Debug INP as a whole-page responsiveness problem. A short click handler can still have poor INP when hydration, analytics, JSON parsing, React render cascades, layout, ads, or previous tasks block the main thread.
13. Split long tasks and heavy work. Chunk work with explicit yielding where supported, move DOM-free parsing or compute to workers, defer noncritical hydration, use transitions or deferred rendering for expensive UI updates, and route detailed frame work to `frame-render-performance-review`.
14. Instrument Long Animation Frames when available and useful. LoAF can attribute slow UI frames to scripts and rendering work; treat browser support and privacy constraints as part of the evidence ledger.
15. Review third-party scripts as performance debt. Tag managers, ads, heatmaps, chat widgets, A/B tests, and analytics can execute on the main thread even when loaded asynchronously. Gate them by route, consent, idle time, user intent, or budget.
16. Review GTM and marketing tags like client bundle changes. New tags can invalidate bundle savings; record third-party time or LoAF attribution when available.
17. Debug CLS as a space contract. Images need dimensions, but ads, cookie bars, app banners, toast stacks, recommendation modules, personalization blocks, skeletons, font swaps, and embeds often cause the real shifts.
18. Match skeletons to final geometry. A skeleton that changes height when content arrives is a layout-shift generator, not a fix.
19. Animate with layout safety. Prefer transform and opacity; layout-affecting animations can hurt rendering and, when not tied to recent user input, contribute to CLS.
20. Preserve bfcache eligibility. Avoid unnecessary `unload` handlers, synchronous page-exit work, and lifecycle patterns that block instant back or forward navigation.
21. Use speculation rules only for safe next pages. Prefetch or prerender can help predictable navigation, but do not prerender pages with side effects, payment, inventory mutation, personalized secrets, or unsafe GET behavior.
22. Set multidimensional budgets. Track JS, CSS, image bytes, third-party time, main-thread blocking, hydration, LCP resource delay, p75 INP, CLS, and route-level budgets instead of one bundle-size number.
23. Turn performance into release monitoring. Compare pre-change and post-deploy p75 by route, device class, and navigation type; field regressions often appear after content, campaign, tag, or upload changes rather than code alone.
24. Label output honestly. If only static review was possible, recommend RUM or lab follow-up without claiming measured Core Web Vitals improvement.

<!-- mustflow-section: postconditions -->
## Postconditions

- Core Web Vitals target, percentile, mobile and desktop split, route grouping, and evidence level are explicit.
- LCP, INP, and CLS risks are mapped to concrete causes or to missing evidence.
- Lighthouse-only claims, stale FID dashboards, averaged metrics, hidden mobile failures, uninstrumented RUM, lazy LCP media, main-thread interaction blockage, third-party drift, layout-shift space gaps, bfcache blockers, unsafe prerendering, and budget blind spots are fixed or reported.
- Privacy, accessibility, security, cache safety, authorization, and user control remain intact or are reported as tradeoffs.

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

Use the narrowest configured test, build, docs, release, or mustflow intent that covers the changed route, instrumentation, template, or reporting contract. Use browser, Lighthouse, Search Console, CrUX, RUM, analytics, WebPageTest, DevTools, tag-manager, CDN, or production telemetry workflows only when they are configured one-shot intents or explicitly provided or approved by the user.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If current thresholds, browser support, or API status are stale or unverified, report the freshness gap before changing durable docs or policy.
- If field data is missing, do not backfill the gap with Lighthouse certainty. Mark the result as static or lab-only.
- If RUM attribution would collect personal data, raw selectors, URLs with secrets, or sensitive text, reduce or hash the payload according to project privacy policy before instrumentation.
- If the fix needs unconfigured production access, service credentials, browser traces, dev servers, or analytics dashboards, stop at the manual boundary and report the skipped measurement.
- If a configured test or build fails, preserve the failing intent and output tail, then fix only the Core Web Vitals, instrumentation, route, or template contract exercised by the failure.

<!-- mustflow-section: output-format -->
## Output Format

- Core Web Vitals surface reviewed
- Evidence level: field, lab, configured-test evidence, static risk, manual-only, missing, or not applicable
- Threshold and percentile contract
- Mobile and desktop split
- LCP subpart ledger
- INP interaction and main-thread ledger
- CLS space-contract ledger
- Third-party, bfcache, speculation, budget, and release-monitoring notes where relevant
- Fixes or recommendations
- Command intents run
- Skipped field, browser, analytics, or lab measurements and reasons
- Remaining Core Web Vitals field risk
