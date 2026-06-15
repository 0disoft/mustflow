---
mustflow_doc: skill.frontend-stress-layout-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: frontend-stress-layout-review
description: Apply this skill when frontend UI is created, changed, reviewed, or reported and layout resilience must be checked against hostile content, narrow parent containers, long strings, async media, skeletons, empty and error states, permission variants, scrollbars, mobile viewport and keyboard behavior, safe areas, line clamps, localization, touch input, motion preferences, observers, portals, z-index layers, tables, charts, browser zoom, cascade layers, or reproducible break conditions.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.frontend-stress-layout-review
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

# Frontend Stress Layout Review

<!-- mustflow-section: purpose -->
## Purpose

Review frontend layout by testing the screen with the data and environment that real users bring, not the friendly fixture that makes the design look correct.

The core question is: "What exact parent size, content shape, loading order, permission set, device condition, or browser setting breaks this UI?" A good review names a reproducible break condition, then either fixes the layout contract or reports the missing stress fixture.

<!-- mustflow-section: use-when -->
## Use When

- Frontend UI, design system components, dashboards, forms, cards, lists, tables, charts, modals, drawers, toasts, tab bars, bottom CTAs, media slots, portals, or responsive layouts are created, changed, reviewed, or reported.
- The UI can receive long names, unbroken IDs, URLs, emails, numbers, translated labels, RTL text, missing data, partial data, async images, delayed fonts, third-party widgets, permission-dependent actions, loading skeletons, errors, or empty state data.
- The affected surface is embedded inside a parent container whose width, height, overflow, transform, zoom, iframe boundary, or scroll container may differ from the viewport.
- A review or final report claims the UI is responsive, stable, polished, mobile-safe, table-safe, chart-safe, localized, accessible on touch, or visually verified.
- A bug report says "the UI breaks", "text overlaps", "card jumps", "button wraps weirdly", "modal is clipped", "table is unusable", "chart disappears", "mobile keyboard covers it", or "only happens in production data".

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only first-render performance, LCP discovery, CLS field metrics, INP, bundle size, or per-frame browser work; use the matching web performance, Core Web Vitals, image delivery, bundle pruning, or frame render performance skill first.
- The task is only state source-of-truth drift, request races, form draft ownership, or query-key correctness; use `frontend-state-ownership-review`.
- The task is only semantic HTML, CSS syntax, utility extraction, or framework-specific code shape with no layout-stress risk; use the narrower HTML, CSS, utility, or framework skill.
- No user-facing UI surface, visual state, embedded component, or rendered artifact is affected.
- Verification would require an unconfigured dev server, browser, screenshot suite, or design tool. Report the missing visual verification boundary instead of inventing raw commands.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, changed UI surface, current diff or target files, framework and styling system signals, and configured command intents.
- Stress fixture ledger: shortest, longest, unbroken, translated, RTL, empty, null, partial, permission-limited, error, loading, delayed-media, and delayed-font data cases relevant to the surface.
- Parent container ledger: viewport sizes, embedded parent widths, grid and flex ancestors, overflow ancestors, scroll containers, transformed parents, iframe or zoom contexts, and container query support or absence.
- Geometry contract ledger: intrinsic media dimensions, `aspect-ratio`, skeleton geometry, line-height, line clamps, min and max sizes, scrollbars, sticky regions, safe-area offsets, keyboard-open height, and reserved layout space.
- Interaction and state ledger: hover, focus, active, disabled, pending, loading, touch-only, reduced-motion, permission variants, retry buttons, bulk actions, sticky headers, selection bars, portals, menus, dialogs, and tooltips.
- Evidence level: static CSS and markup evidence, component fixture evidence, screenshot or browser evidence, design-system story evidence, configured tests, or missing stress evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Existing local patterns for responsive constraints, story fixtures, component tests, design tokens, portals, z-index layers, tables, charts, and empty/error/loading states have been searched before adding a new pattern.
- If a layout stress issue is caused by state ownership, rendering performance, image delivery, accessibility, security, or data contracts, also apply the narrower matching skill for that boundary.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine stress fixtures, stories, tests, or review notes for hostile content, narrow containers, empty/error/loading/permission states, mobile keyboard, safe areas, RTL, zoom, tables, charts, portals, and scrollbars.
- Add responsive constraints such as `min-width: 0`, `minmax(0, 1fr)`, max sizes, `overflow-wrap: anywhere`, stable table scroll wrappers, reserved media dimensions, `aspect-ratio`, `scrollbar-gutter: stable`, explicit `line-height`, logical properties, and safe-area-aware spacing when they match project patterns.
- Replace viewport-only assumptions with parent-container-aware layout, container queries, intrinsic constraints, or component-level size contracts when the component can be embedded in multiple shells.
- Fix skeleton, empty, error, permission, pending, disabled, hover, touch, reduced-motion, portal, z-index, table, or chart states only inside the affected UI surface and directly synchronized docs or tests.
- Do not redesign the product, change design tokens broadly, rewrite the layout system, add a visual testing framework, start a dev server, or introduce browser automation unless the current repository already authorizes that path.

<!-- mustflow-section: procedure -->
## Procedure

1. Build the stress fixture ledger first.
   - Include nice data, empty data, partial data, null-ish data, permission-limited data, API error data, retryable error data, long translated labels, RTL text, long unbroken strings, large numbers, long table headers, single-point charts, all-zero charts, null chart points, and delayed media or font cases when relevant.
   - If no stress fixture exists, report that absence instead of trusting the default screenshot or happy-path story.
2. Review parent container width before viewport width.
   - Components often break inside sidebars, split panes, cards, drawers, CMS slots, iframes, and grid cells even when the viewport is wide.
   - Prefer component constraints and container queries when the layout depends on parent size rather than global viewport breakpoints.
3. Check flex and grid shrink contracts.
   - Flex and grid children that contain text, tables, charts, media, or nested rows usually need `min-width: 0` so they can shrink instead of overflowing.
   - Grid tracks that should shrink often need `minmax(0, 1fr)` instead of a bare `1fr`.
4. Attack text with hostile content.
   - Test long unbroken IDs, URLs, emails, Korean or CJK text, long English words, translated button labels, narrow columns, and large numbers.
   - Use `overflow-wrap: anywhere`, truncation, wrapping, or explicit min and max sizes according to the component contract.
5. Reserve async media and widget space.
   - Images, videos, maps, charts, ads, embeds, custom fonts, and third-party widgets should not resize the page after load.
   - Use intrinsic `width` and `height`, `aspect-ratio`, stable placeholders, or skeleton geometry that matches final content. Keep CLS-sensitive changes routed to the Core Web Vitals skill when field metrics are part of the claim.
6. Make skeletons honest.
   - Skeleton blocks must have approximately the same geometry as final content: line count, media box, button area, card height, table row height, chart frame, and list gaps.
   - A pretty skeleton that collapses or expands differently is a layout bug wearing makeup.
7. Put empty and error states inside the real component contract.
   - Empty states should preserve the parent layout, scroll behavior, minimum height, actions, and alignment expected by the loaded component.
   - Error states need API fail, permission denied, partial failure, retry pending, and retry failed shapes when those states are possible.
8. Review permission and action variants.
   - Different roles can change button counts, hidden actions, disabled actions, bulk bars, admin controls, menus, and CTA placement.
   - Do not let late `display: none` toggles, conditional blocks, or role-based controls shift the primary content unexpectedly.
9. Account for scrollbars.
   - Scrollbar appearance can steal width and wrap text, especially in tables, panels, sidebars, and modals.
   - Use stable scroll containers or `scrollbar-gutter: stable` when the supported browser target and design allow it.
10. Reject fragile viewport-height math.
    - Hard-coded `calc(100vh - 64px)` shells break when headers wrap, banners appear, browser chrome changes, or mobile keyboards open.
    - Prefer dynamic viewport units, parent flex sizing, measured shell contracts, or safe fallback constraints already used by the project.
11. Test mobile viewport, keyboard, and safe area.
    - Mobile `100vh` can include or exclude browser UI depending on platform and moment.
    - Inputs, bottom CTAs, tab bars, sheets, toasts, and sticky footers must survive keyboard-open screens and `safe-area-inset-*`.
12. Check line clamps and row height.
    - Clamped titles, metadata, badges, avatars, and action buttons can fight each other inside cards and rows.
    - Explicit `line-height` on buttons, chips, badges, tabs, labels, and inputs avoids accidental height drift from fonts or localization.
13. Review localization and writing direction.
    - Use logical properties where layout depends on start/end rather than left/right.
    - Check RTL, translated labels, locale number/date formatting, and wider fallback fonts before claiming the layout is internationalized.
14. Review interaction variants.
    - Buttons need icon-only, icon+text, loading, pending, disabled, long-label, two-line, and touch target states where relevant.
    - Hover-only affordances must also work on touch, keyboard, and reduced-motion contexts, and hover should not resize the card.
15. Keep motion layout-safe.
    - Animate `transform` and `opacity` when possible instead of `top`, `left`, `width`, or `height`.
    - Respect `prefers-reduced-motion` for motion that can distract, disorient, or hide state changes.
16. Watch observer feedback loops.
    - `ResizeObserver` callbacks that write size-affecting styles can trigger loops or jitter.
    - Separate measurement from writes and keep observer scope narrow.
17. Stress portals and layers.
    - Menus, comboboxes, popovers, dialogs, sheets, and tooltips must survive viewport edges, scroll containers, transformed parents, overflow hidden ancestors, iframes, browser zoom, and nested portals.
    - Use named z-index layer tokens instead of one-off `9999` values.
18. Stress tables.
    - Test twelve columns, long headers, empty cells, long IDs, negative and large numbers, multiple row actions, horizontal scroll, sticky headers, sticky first columns, selection checkboxes, and bulk action bars.
    - Preserve keyboard, screen reader, and scroll behavior while preventing layout collapse.
19. Stress charts.
    - Test empty data, one point, all zeros, negative values, null points, long labels, huge legends, large y-axis numbers, narrow containers, and width-zero mount moments.
    - Avoid chart initialization that permanently measures a hidden or zero-width container.
20. Test browser zoom and cascade reality.
    - At 125%, 150%, and 200% zoom, fixed-height buttons, clipped labels, and cramped tables expose brittle geometry.
    - Check CSS specificity and `@layer` ordering so fixes actually win without starting a selector arms race.
21. Name the reproducible break condition.
    - A review comment should include the triggering data, parent size, state, role, device condition, zoom, or loading order.
    - "Looks off" is weak; "In a 320px parent with a 64-character order ID and two permission actions, the row action group overlaps the amount" is actionable.

<!-- mustflow-section: postconditions -->
## Postconditions

- The affected UI surface has an explicit stress fixture ledger or the missing fixtures are reported.
- Parent container width, flex and grid shrinking, long content, async media, skeletons, empty and error states, permission variants, scrollbars, viewport height, mobile keyboard, safe areas, line clamps, localization, touch input, reduced motion, observer loops, portals, z-index layers, tables, charts, browser zoom, and cascade ordering are fixed, ruled out, or reported where relevant.
- Layout-stability claims distinguish static evidence, configured test evidence, screenshot or browser evidence, manual-only evidence, and missing evidence.
- Any review finding names a reproducible break condition rather than only a subjective visual complaint.

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

Use the narrowest configured component, story, visual, unit, build, docs, release, or mustflow intent that covers the changed layout-stress boundary. Use browser screenshots, dev servers, design tools, or visual regression suites only when they are configured one-shot intents or explicitly approved by the user.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the break condition cannot be reproduced from current data, fixtures, or configured evidence, report the missing fixture or measurement boundary before changing unrelated layout code.
- If a fix only works for the viewport but not the parent container, treat the component contract as unresolved.
- If reserved space for images, skeletons, charts, or widgets conflicts with content semantics or accessibility, keep the semantic path and report the layout tradeoff.
- If a configured test or build fails after a layout-stress change, preserve the failing intent and output tail, then use `failure-triage` before broadening the fix.
- If verification requires new browser automation, a running dev server, or visual regression infrastructure, report the missing command-contract support instead of inventing a workflow.

<!-- mustflow-section: output-format -->
## Output Format

- Frontend stress layout surface reviewed
- Stress fixture ledger
- Parent container, shrink, text, media, state, permission, scrollbar, mobile viewport, keyboard, safe area, localization, touch, motion, observer, portal, z-index, table, chart, zoom, and cascade checks where relevant
- Reproducible break conditions found, fixed, or ruled out
- Layout changes or recommendations
- Evidence level: configured-test, screenshot or browser evidence, static layout-risk, manual-only, missing, or not applicable
- Command intents run
- Skipped visual checks and reasons
- Remaining frontend stress-layout risk
