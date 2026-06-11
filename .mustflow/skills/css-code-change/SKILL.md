---
mustflow_doc: skill.css-code-change
locale: en
canonical: true
revision: 3
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
- Target surfaces for narrow viewports, 200% zoom, text scaling, delayed media, third-party markup, and browser compatibility.
- Browser-native capabilities in use or available for the target: cascade layers, `:where`, `:is`, `:has`, container queries, logical properties, `dvh`/`svh`/`lvh`, `color-scheme`, `content-visibility`, `contain-intrinsic-size`, `text-wrap`, and view-transition styling.
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
3. Do not patch visible symptoms with stronger specificity. Resolve conflicts by checking layer order, import order, token choice, component boundary, parent layout, and selector scope first.
4. Do not add ID selectors for styling, selectors with more than two combinators, or new `!important` unless an allowed exception is documented.
5. Do not use negative margin to repair normal content flow. Fix parent layout, spacing, alignment, or intrinsic sizing instead.
6. Do not add inline styles for color, spacing, typography, focus, dark mode, or responsive layout. Inline styles are for runtime geometry such as drag positions, virtualized offsets, and measured canvas/SVG values.
7. Use existing color, spacing, font, radius, shadow, z-index, and breakpoint tokens before adding literals.
8. Keep raw color values out of component CSS. Add or reuse semantic tokens for surfaces, text, borders, actions, danger states, focus, disabled states, and dark mode.
9. Avoid raw pixel values for typography, spacing, layout dimensions, and radius. Allow narrow values such as one-pixel borders, intrinsic icon/media dimensions, and established breakpoint tokens.
10. Make layout responsive through constraints, `min-width: 0`, `min-height: 0`, min/max sizing, flex/grid, wrapping, gap, intrinsic media dimensions, container/media queries, logical properties, and content-based rules rather than fixed viewport assumptions.
11. Prefer named containers and container queries when a component responds to its actual slot, not the whole viewport. Keep media queries for page-level viewport decisions.
12. Do not set fixed width on page, section, container, card, modal, or form layouts. Do not set fixed height on components that contain text.
13. Use dynamic viewport units intentionally: `dvh` for current viewport height, `svh` for stable small viewport layout, and `lvh` only when the larger viewport behavior is intended. Avoid hard `100vh` for mobile app shells unless the target proves safe.
14. Do not use viewport-only typography. Use bounded responsive type patterns that survive small screens and large displays.
15. Do not use `overflow: hidden` to hide layout bugs. Allow it only for intentional clipping such as avatars, media crops, masks, or animation containers.
16. Reserve dimensions or aspect ratio for images, videos, iframes, ads, embeds, skeletons, fonts, and lazy content that could cause layout shift.
17. Prefer `:where` to keep wrapper and rich-text selector specificity low. Use `:has` only when it improves state ownership and the fallback remains usable for target browsers.
18. Use `content-visibility` only for offscreen or below-the-fold content whose skipped rendering will not hide focus targets, search-relevant initial content, or accessibility-critical relationships. Pair it with `contain-intrinsic-size` to avoid layout jumps.
19. Use `color-scheme` with theme tokens so native controls, scrollbars, and form UI match the active theme before component JavaScript runs.
20. Preserve visible focus, sufficient contrast, 200% text resize behavior, text-spacing stress, keyboard navigation, and reduced-motion behavior.
21. If hover styling changes an interactive affordance, provide a matching focus-visible affordance.
22. Prefer outline and outline-offset for focus indicators. Do not rely only on shadows when ancestors may clip overflow.
23. Respect reduced motion for parallax, large transforms, auto-scroll, route transitions, autoplay carousels, skeleton shimmer, and looping decorative animation.
24. Check browser compatibility before adding new CSS features. Use progressive enhancement for newly available features and avoid limited-availability features unless the project browser target allows them.
25. Choose configured verification intents that cover style lint, build, visual states, accessibility, and browser target risk when available.

<!-- mustflow-section: cascade-specificity-policy -->
## Cascade And Specificity Policy

- Keep component styling overrideable with low-specificity class selectors.
- Do not use IDs as styling weight. IDs are for anchors, form/ARIA relationships, or JavaScript hooks.
- Do not write DOM-path selectors that break when markup gains or loses a wrapper.
- Use low-specificity contextual selectors for rich text or CMS areas. Prefer patterns that keep specificity easy to override.
- Use `:where` for low-specificity grouping and `@layer` for order. Do not use `:is` or `:has` to smuggle in heavy selectors when a class boundary would be clearer.
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

<!-- mustflow-section: token-accessibility-policy -->
## Token And Accessibility Policy

- Name visual values by role, not by raw color or numeric value.
- Search existing tokens before adding a value. If a new value has product meaning, theme impact, repeated use, or dark-mode behavior, add it at the token source.
- Body text and normal UI text should meet the project contrast target; large text and meaningful non-text UI indicators must remain distinguishable against adjacent colors.
- Do not communicate state by color alone. Pair color with text, icon shape, border, position, or another non-color signal when meaning matters.
- Never remove focus indication without replacing it in the same change.
- Verify focus, error, selected, disabled, hover, active, and dark-mode states when token or component color changes.

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
- It repairs normal document flow with negative margins or absolute positioning.
- It uses fixed width for containers or fixed height for text-containing UI.
- It hides layout bugs with `overflow: hidden`.
- It adds unsized media, embeds, ads, or lazy content that can shift layout.
- It uses `content-visibility` without an intrinsic-size fallback or on content that must be immediately reachable.
- It hardcodes raw component colors, spacing, font sizes, radius, or shadows without an exception.
- It removes focus styling, creates hover-only affordances, or clips the focus indicator.
- It adds motion without reduced-motion behavior.
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
