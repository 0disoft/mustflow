---
mustflow_doc: skill.css-code-change
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: css-code-change
description: Apply this skill when CSS, Sass, Less, CSS Modules, CSS-in-JS, global styles, cascade layers, selector specificity, design tokens, container queries, browser-native state selectors, layout, responsive behavior, focus styles, animation, color, or component styling are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.css-code-change
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

# CSS Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve cascade order, specificity discipline, resilient responsive layout, design tokens, focus visibility, contrast, reduced motion, browser compatibility, and layout stability. Treat CSS as a long-lived system, not a screenshot patch.

<!-- mustflow-section: use-when -->
## Use When

- `.css`, Sass, Less, CSS Modules, CSS-in-JS, global styles, reset, theme variables, cascade layers, selectors, design tokens, component styles, animations, or responsive rules change.
- The task touches specificity, `!important`, inline styles, negative margins, layout shift, browser compatibility, dark mode, focus style, contrast, typography, zoom, text scaling, container queries, browser-native state selectors, viewport units, content visibility, or motion preference.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Styling is entirely Tailwind utility usage; use `tailwind-code-change`.
- Styling is entirely UnoCSS utility usage; use `unocss-code-change`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Global CSS entrypoints, reset/base styles, cascade layer strategy, token files, theme config, component CSS, parent layout styles, browserslist, build config, and style lint config.
- Existing responsive, dark mode, accessibility, focus, reduced-motion, breakpoint, and design-token conventions.
- Theme and token graph: raw palette tokens, semantic role tokens, component tokens, theme axes, user override state, system preference handling, forced-colors policy, and generated platform token outputs when present.
- Target surfaces for narrow viewports, 200% zoom, text scaling, delayed media, third-party markup, and browser compatibility.
- Browser-native capabilities in use or available for the target: cascade layers, `:where`, `:is`, `:has`, container queries, logical properties, `dvh`/`svh`/`lvh`, `color-scheme`, `content-visibility`, `contain-intrinsic-size`, `text-wrap`, and view-transition styling.
- Motion and transition capabilities in use or available for the target: `@starting-style`, `transition-behavior`, individual transform properties, `@property`, scroll-driven animation, reduced motion, and `will-change` policy.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify the cascade layer, selector scope, token source, layout constraints, and browser target before editing.
- Prefer low-specificity selectors, parent layout fixes, and existing semantic tokens.
- Identify whether the style belongs in global CSS, token/theme CSS, component-scoped CSS, CSS Modules, or a third-party wrapper.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add styles in the correct layer or module.
- Use class-level selectors, custom properties, design tokens, intrinsic sizing, flex, grid, container queries, or media queries according to local patterns.
- Use browser-native selectors, layout, and containment features as progressive enhancement when they reduce JavaScript ownership and fit the browser target.
- Preserve visible focus, contrast, text scaling, reduced motion, and reserved space for late-loaded media.
- Use narrow exceptions for legacy/third-party markup, runtime geometry, rich text/prose wrappers, and urgent accessibility overrides when lower-specificity or token-based fixes cannot solve the issue.

<!-- mustflow-section: procedure -->
## Procedure

1. Read global style entrypoints, tokens, component styles, parent layout styles, and build/lint config.
2. Map the cascade: reset, base, tokens, layout, components, utilities, overrides.
3. Debug cascade before selector strength. Resolve conflicts by checking origin, importance, layer order, unlayered rules, selector specificity, `@scope` proximity, source order, import order, token choice, component boundary, parent layout, and selector scope first.
4. Treat `@layer` as an ordering contract. Put reset, vendor, design-system, component, utility, and override CSS into intentional layers; do not migrate only one part of a stylesheet into layers when unlayered legacy CSS would silently beat it.
5. Remember that `!important` reverses layer priority. Do not add important declarations until the layer model and exception reason are clear.
6. Do not add ID selectors for styling, selectors with more than two combinators, or new `!important` unless an allowed exception is documented.
7. Do not use negative margin to repair normal content flow. Fix parent layout, spacing, alignment, or intrinsic sizing instead.
8. Do not add inline styles for color, spacing, typography, focus, dark mode, or responsive layout. Inline styles are for runtime geometry such as drag positions, virtualized offsets, and measured canvas/SVG values.
9. Use existing color, spacing, font, radius, shadow, z-index, and breakpoint tokens before adding literals.
10. Keep raw color values out of component CSS. Add or reuse semantic tokens for surfaces, text, borders, actions, danger states, focus, disabled states, and dark mode.
11. Avoid raw pixel values for typography, spacing, layout dimensions, and radius. Allow narrow values such as one-pixel borders, intrinsic icon/media dimensions, and established breakpoint tokens.
12. Make layout responsive through constraints, `min-width: 0`, `min-height: 0`, min/max sizing, flex/grid, wrapping, gap, intrinsic media dimensions, container/media queries, logical properties, and content-based rules rather than fixed viewport assumptions.
13. Use `flex: 1 1 0` plus `min-width: 0` when equal columns must actually shrink. Use `minmax(0, 1fr)` for grid tracks that must not be held open by long content.
14. Prefer named containers and container queries when a component responds to its actual slot, not the whole viewport. Keep media queries for page-level viewport decisions.
15. Remember that container queries style descendants, not the queried container itself. Do not add `container-type: size` without checking that size containment will not collapse an element that depends on its children for size.
16. Do not set fixed width on page, section, container, card, modal, or form layouts. Do not set fixed height on components that contain text.
17. Use dynamic viewport units intentionally: `dvh` for current viewport height, `svh` for stable small viewport layout, and `lvh` only when the larger viewport behavior is intended. Avoid hard `100vh` for mobile app shells unless the target proves safe.
18. Do not use viewport-only typography. Use bounded responsive type patterns that survive small screens and large displays.
19. Do not use `overflow: hidden` to hide layout bugs. Allow it only for intentional clipping such as avatars, media crops, masks, or animation containers.
20. Check containing blocks and stacking contexts before increasing z-index. `position`, `transform`, `opacity`, `filter`, `contain`, `container-type`, and overflow ancestors can change sticky behavior, absolute positioning, clipping, and overlay ordering.
21. Prefer `gap` inside flex or grid stacks instead of vertical margin choreography when margin collapse could make spacing ambiguous.
22. Ensure shared UI reset or base CSS uses `box-sizing: border-box` unless the project intentionally preserves content-box sizing.
23. Reserve dimensions or aspect ratio for images, videos, iframes, ads, embeds, skeletons, fonts, and lazy content that could cause layout shift.
24. Prefer `:where` to keep wrapper and rich-text selector specificity low. Use `:is`, `:not`, `:has`, and native nesting only after checking the highest selector in the list will not smuggle in unwanted specificity.
25. Keep `:has` anchored to a narrow owner such as a component root and narrow the inner selector with child or sibling combinators when possible. Avoid `body:has(...)`, `:root:has(...)`, or `*:has(...)` unless the broad invalidation cost and fallback are explicitly accepted.
26. Use `content-visibility` only for offscreen or below-the-fold content whose skipped rendering will not hide focus targets, search-relevant initial content, or accessibility-critical relationships. Pair it with `contain-intrinsic-size` to avoid layout jumps.
27. Use `color-scheme` with theme tokens so native controls, scrollbars, and form UI match the active theme before component JavaScript runs. Do not treat `color-scheme` as a replacement for actual page background, text, surface, and border tokens.
28. Preserve visible focus, sufficient contrast, 200% text resize behavior, text-spacing stress, keyboard navigation, and reduced-motion behavior.
29. If hover styling changes an interactive affordance, provide a matching focus-visible affordance.
30. Prefer outline and outline-offset for focus indicators. Do not rely only on shadows when ancestors may clip overflow or forced-colors mode may remove shadows.
31. Respect reduced motion for parallax, large transforms, auto-scroll, route transitions, autoplay carousels, skeleton shimmer, and looping decorative animation.
32. Animate `transform`, individual transform properties, and `opacity` before layout-affecting properties. Avoid `transition: all`.
33. Use newer transition and animation features such as `@starting-style`, `transition-behavior`, intrinsic-size interpolation, `@property`, individual transforms, scroll timelines, and animation composition only with browser-target review and a safe fallback.
34. Keep `will-change` narrow, temporary, and evidence-backed. Do not leave broad permanent compositor hints on ordinary components.
35. Check browser compatibility before adding new CSS features. Use progressive enhancement for newly available features and avoid limited-availability features unless the project browser target allows them.
36. Choose configured verification intents that cover style lint, build, visual states, accessibility, and browser target risk when available.

<!-- mustflow-section: cascade-specificity-policy -->
## Cascade And Specificity Policy

- Keep component styling overrideable with low-specificity class selectors.
- Do not use IDs as styling weight. IDs are for anchors, form/ARIA relationships, or JavaScript hooks.
- Do not write DOM-path selectors that break when markup gains or loses a wrapper.
- Use low-specificity contextual selectors for rich text or CMS areas. Prefer patterns that keep specificity easy to override.
- Use `:where` for low-specificity grouping and `@layer` for order. Do not use `:is` or `:has` to smuggle in heavy selectors when a class boundary would be clearer.
- Keep third-party, reset, and vendor CSS in lower layers when possible. Do not assume a high-specificity vendor selector beats a lower-specificity app selector in a later layer.
- Treat unlayered CSS as a migration hazard because normal unlayered declarations outrank normal layered declarations.
- Do not mix ID selectors into a shared `:is`, `:not`, `:has`, or nested selector list unless every generated selector is intended to carry that specificity.
- Use `[id="..."]` instead of `#id` only when a real ID anchor must be selected without ID specificity, and document the reason.
- Treat `@scope` proximity as part of conflict analysis when scoped rules with equal weight compete.
- Do not add global overrides for local component problems when component-scoped styling or tokens can solve the issue.
- New `!important` requires an explicit exception for immutable third-party/legacy markup, third-party inline style override, urgent accessibility protection, or equivalent narrow reason.

<!-- mustflow-section: responsive-layout-policy -->
## Responsive Layout Policy

- Layout must survive narrow screens, 200% zoom, increased text size, longer localized text, delayed media loading, and reduced motion.
- Prefer fluid width plus max constraints over fixed width.
- Prefer min-height, padding, and line-height over fixed height for text-containing controls.
- Prefer content-based layout, flex/grid, `minmax`, wrapping, and `clamp` over breakpoint patching.
- Avoid `100vw` except for deliberate full-bleed designs; otherwise prefer normal containing-block width.
- Avoid `100vh` for mobile app shells when browser chrome can change the visual viewport. Choose `dvh`, `svh`, or a layout-owned min-height intentionally.
- Avoid absolute positioning for normal document flow. Use it only for overlays, decorative placement, controls anchored to known boxes, or measured geometry.
- Check sticky positioning against overflow ancestors and required inset values before changing z-index or position.
- Check absolute positioning against the nearest positioned ancestor before changing coordinates.
- Prefer logical properties such as `inline-size`, `block-size`, `padding-inline`, `margin-block`, and `inset-inline-end` for component CSS that should survive RTL or alternate writing modes.

<!-- mustflow-section: token-accessibility-policy -->
## Token And Accessibility Policy

- Name visual values by role, not by raw color or numeric value.
- Keep the token graph layered as palette or raw values, semantic role tokens, then component tokens. Components should not consume raw palette values when the value carries theme, brand, contrast, or state meaning.
- Do not encode `light` or `dark` into the core token name when theme mode is an axis that should select the value. Prefer stable role names whose values vary by theme, brand, density, or contrast mode.
- Treat `prefers-color-scheme` as the system default only. If the product has an app theme setting, model `system`, explicit light, and explicit dark so user choice can override the OS preference.
- Treat `forced-colors` and high-contrast modes as separate accessibility modes, not as darker dark mode. Use system colors, borders, and outlines where shadows or brand colors may be ignored.
- Search existing tokens before adding a value. If a new value has product meaning, theme impact, repeated use, or dark-mode behavior, add it at the token source.
- Review token aliases for cycles, stale references, and source-to-generated drift before adding derived tokens.
- Scope global custom properties to product-wide contracts and component custom properties to component roots. Do not dump one-off component internals into `:root`.
- Use `@property` only for runtime tokens that benefit from typed validation, inheritance control, or animation; avoid registering every design token by default.
- Body text and normal UI text should meet the project contrast target; large text and meaningful non-text UI indicators must remain distinguishable against adjacent colors.
- Review contrast as foreground/background pairs such as text-on-surface, text-on-action, border-on-danger, and focus-on-surface. A single color token cannot prove contrast alone.
- Do not communicate state by color alone. Pair color with text, icon shape, border, position, or another non-color signal when meaning matters.
- Never remove focus indication without replacing it in the same change.
- Keep focus-ring tokens separate from brand color tokens. Focus needs width, offset, inner or outer color, and background-specific contrast that survives dark mode, images, clipping, and forced colors.
- Include assets, icons, charts, illustrations, shadows, elevation, disabled states, error states, and skeletons in theme review; a theme is not only background and text color.
- Verify focus, error, selected, disabled, hover, active, and dark-mode states when token or component color changes.

<!-- mustflow-section: motion-policy -->
## Motion And Transition Policy

- Do not use `transition: all`; list the properties that are intentionally animated.
- Prefer `transform`, individual transform properties such as `translate`, `scale`, and `rotate`, and `opacity` for cheap motion.
- Do not animate layout-affecting properties such as height, width, margins, top, left, or font size unless the interaction genuinely changes layout and the target browsers and fallback are reviewed.
- Use `@starting-style` for first-render entry transitions only when supported or safely progressive.
- Use `transition-behavior: allow-discrete` and overlay-related discrete transitions only when display or top-layer exit behavior actually needs it and fallback behavior remains acceptable.
- Use intrinsic-size animation such as `interpolate-size` or `calc-size()` only as progressive enhancement; do not assume it removes layout cost.
- Use registered custom properties for animatable typed values only when project browser targets allow it.
- Do not let multiple transforms from hover, state, and keyframes overwrite each other accidentally. Prefer individual transform properties or explicit composition.
- Keep scroll-driven animation behind compatibility checks and declare `animation-timeline` after the `animation` shorthand when both are used.
- Respect `prefers-reduced-motion` by removing, shortening, or replacing nonessential large movement; do not merely speed up the same disorienting motion.
- Add `will-change` only near a known animation or interaction and remove or scope it when the hint is no longer needed.

<!-- mustflow-section: browser-compatibility-policy -->
## Browser Compatibility Policy

- New CSS features require browser-target awareness before use.
- Widely supported features may be used normally.
- Newly available features need a fallback or progressive enhancement path.
- Limited-availability features are blocked unless the repository browser target explicitly allows them.
- Feature queries are enhancements only. Keep an accessible fallback outside the query and layer the new behavior inside it.

<!-- mustflow-section: exception-policy -->
## Exception Policy

Allowed exceptions include:

- Legacy or third-party markup that cannot be changed.
- Runtime geometry such as drag positions, virtualized list offsets, canvas/SVG measurements, or measured transforms.
- Accessibility emergency overrides such as focus visibility or reduced-motion protection.
- Rich text, CMS, or prose styling scoped to a wrapper with low specificity.
- Essential two-dimensional layouts such as data tables, maps, diagrams, code blocks, canvas, games, and design tools.

Every exception must explain why a lower-specificity, token-based, or layout-level fix is not enough and must include a removal condition when practical.

<!-- mustflow-section: review-rejection-criteria -->
## Review Rejection Criteria

Reject the change when:

- It adds styling ID selectors, long descendant chains, or unexplained `!important`.
- It patches cascade failures without checking layer order, unlayered CSS, specificity from `:is` or nesting, scope proximity, or source order.
- It repairs normal document flow with negative margins or absolute positioning.
- It uses fixed width for containers or fixed height for text-containing UI.
- It hides layout bugs with `overflow: hidden`.
- It raises z-index without checking containing blocks, stacking contexts, top-layer options, or overflow clipping.
- It adds unsized media, embeds, ads, or lazy content that can shift layout.
- It adds raw palette values to component CSS, encodes theme modes into stable role-token names, treats `color-scheme` as a complete dark-mode implementation, or ignores forced-colors/high-contrast behavior.
- It uses `content-visibility` without an intrinsic-size fallback or on content that must be immediately reachable.
- It hardcodes raw component colors, spacing, font sizes, radius, or shadows without an exception.
- It removes focus styling, creates hover-only affordances, or clips the focus indicator.
- It adds motion without reduced-motion behavior.
- It uses `transition: all`, permanent broad `will-change`, or layout-affecting animation without compatibility and performance review.
- It uses a new CSS feature without compatibility/fallback review.

<!-- mustflow-section: postconditions -->
## Postconditions

- Selectors remain maintainable and low-specificity.
- Tokens are used or new literals are justified.
- Responsive, zoom, text-scaling, focus, contrast, motion, compatibility, and layout-shift risks are checked or reported.
- Exceptions are narrow, explained, and not used as a normal styling path.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing visual, accessibility, or browser compatibility verification intents when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a style requires `!important` or high specificity, inspect the cascade conflict before adding it.
- If a raw token is missing, report whether a token should be added or the existing system should be reused.
- If visual verification is unavailable, report the unverified viewport, zoom, contrast, or motion states.
- If layout only works for the current screenshot, stop and rework it around content, constraints, and parent layout.
- If a new CSS feature fails in the target browser or WebView, add a fallback or remove the feature.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Cascade, token, and responsive notes
- Accessibility and layout-stability notes
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining CSS risk
