---
mustflow_doc: skill.tailwind-code-change
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: tailwind-code-change
description: Apply this skill when Tailwind classes, className composition, static class detection, theme tokens, variants, safelists, arbitrary values, Tailwind config, v4 CSS-first configuration, @source, @theme, @reference, @apply, or Tailwind migration surfaces are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.tailwind-code-change
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

# Tailwind Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Tailwind static class detection, design tokens, bounded variants, responsive/state behavior, accessibility states, and production build output. Treat Tailwind utilities as build-time tokens, not runtime strings.

<!-- mustflow-section: use-when -->
## Use When

- Tailwind `class`, `className`, `@apply`, `@theme`, `@source`, `@reference`, config, source scanning, safelist, theme tokens, variants, arbitrary values, or component class composition change.
- The task touches Tailwind v3/v4 migration, CSS-first configuration, token addition, responsive modifiers, state modifiers, `clsx`/`cn`, CVA-style variant helpers, `source(none)`, `@source inline()`, `@source not inline()`, path `@source`, path `@source not`, or production CSS generation risk.
- Component APIs accept status, tone, intent, size, column count, color, spacing, or class-related props that affect Tailwind utilities.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Styling is plain CSS without Tailwind utilities; use `css-code-change`.
- Utility generation is UnoCSS, not Tailwind; use `unocss-code-change`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Tailwind version/config or CSS entry, `@import` options, `@source` directives, content/source scanning rules, theme tokens, PostCSS/build config, class merge helpers, variant helpers, component patterns, and tests.
- Existing design system vocabulary, token naming conventions, accessibility state patterns, and component prop APIs.
- Any runtime source for visual values: props, CMS, database, tenant config, user input, API data, or external package markup.
- Framework style boundaries that may need `@reference`, such as Vue or Svelte component styles, CSS Modules, scoped CSS, or separate CSS entrypoints.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Confirm how Tailwind detects source classes before changing class composition, helper-file location, or CSS entry imports.
- Identify whether the project is using Tailwind v3 config safelists or Tailwind v4 CSS source directives.
- Identify whether Tailwind v4 source detection is automatic, disabled with `source(none)`, extended with path `@source`, narrowed with path `@source not`, expanded with candidate `@source inline()`, or narrowed with candidate `@source not inline()`.
- For Tailwind v4 migration, check browser support floors before recommending v4. If the project still supports browsers below Safari 16.4, Chrome 111, or Firefox 128, keep v3.4 as the safer maintenance track unless project policy changes.
- Identify tokens, variant helpers, and semantic visual states before adding arbitrary values or raw colors.
- Confirm whether affected components are local one-offs, shared components, or public design-system surfaces.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Use full static class strings that the build can detect.
- Use existing theme tokens before arbitrary values or raw colors.
- Use static maps, component extraction, or variant helpers for finite repeated variants.
- Use safelists or `@source inline()` only for finite class candidates that cannot appear in scanned source.
- Use `@source not inline()` to block known false-positive class candidates when generated CSS would otherwise include unwanted utilities.
- Use path `@source` to add scan sources and path `@source not` to exclude scan sources. Do not confuse those with candidate safelist or blocklist directives.
- Use `@reference` when component-scoped styles need access to Tailwind theme variables, custom utilities, or variants without duplicating emitted CSS.
- Use inline styles plus CSS variables for unbounded runtime values such as tenant, database, or user-provided colors.
- Keep hover, focus-visible, disabled, aria/data, dark, and motion variants aligned with existing component behavior.

<!-- mustflow-section: procedure -->
## Procedure

1. Read Tailwind config or CSS entry, scanning rules, theme tokens, helpers, and nearby components.
2. Classify the change: token, utility usage, dynamic variant, component extraction, responsive state, accessibility state, or migration.
3. For Tailwind v4, classify CSS-first configuration before touching utility usage: `@theme`, `@utility`, `@variant`, `@custom-variant`, path `@source`, path `@source not`, candidate `@source inline()`, candidate `@source not inline()`, `source(none)`, and `@reference`. Do not apply v3 config instincts to a v4 CSS entry without checking the project pattern.
4. Treat every Tailwind class as a complete build-time token. Reject runtime interpolation, concatenation, array joins, or fragment assembly for utilities such as color, spacing, grid count, span, tone, or arbitrary values.
5. For finite choices, use a static map with semantic keys and full class strings. Good keys describe UI meaning such as `danger`, `muted`, `compact`, or `featured`; bad keys store Tailwind fragments such as `red`, `600`, or `cols-3` for later assembly.
6. Use a CVA-style variant helper only when a shared component has multiple variant axes, defaults, or compound variants. The helper must still contain full static class strings.
7. Use safelists only as a last resort for finite candidates that cannot be present in source files. Tailwind v4 projects should express this through the project's CSS source policy; Tailwind v3 maintenance projects may use config safelists when that is the existing pattern. Do not safelist broad palettes or unbounded ranges to avoid fixing a bad component API.
8. Keep `@source inline()` bounded, named, and close to the CSS entry policy. If `source(none)` disables automatic detection, require explicit path `@source` includes for every package, app, and external component source that owns utilities. Use `@source not inline()` for known false-positive class candidates, and path `@source not` for excluded scan locations, instead of relying on accidental absence.
9. Use inline style plus a CSS variable bridge for unbounded runtime values from databases, APIs, tenants, CMS content, or user input. Do not try to mint Tailwind class names from unbounded values.
10. Treat arbitrary values as escape hatches. Allow them for one-off asset alignment, complex grid templates, complex calculations, local CSS variable assignment, or values that cannot be expressed with regular utilities.
11. Reject arbitrary raw colors in component markup, arbitrary spacing that approximates existing scale values, arbitrary container widths, arbitrary radius or shadow used as a hidden token, and repeated arbitrary values. Repeated values must be promoted to a semantic design token or component variant.
12. Keep raw color literals in theme or token files only. Token names should describe purpose, not numeric value.
13. Use `clsx` or `cn` only to combine complete class strings. Do not hide dynamic Tailwind string construction inside helper functions.
14. Do not expose unrestricted class fragments through public component APIs. If a `className` passthrough exists, preserve internal layout-critical classes and prevent consumer props from becoming the source of required Tailwind generation.
15. Do not extract a component only because a class list is long. Extract a component when structure, behavior, accessibility, and styling repeat together across files.
16. Do not use `@apply` to hide long JSX or template class lists. Reserve `@apply` for third-party markup overrides, CSS-module boundaries, or template systems where component extraction is genuinely heavier.
17. When `@apply` or `@variant` appears in component-scoped CSS, verify that `@reference` points at the shared Tailwind CSS entry or theme source without emitting duplicate CSS.
18. Use mobile-first responsive classes and include focus-visible or equivalent keyboard states for interactive elements.
19. Prefer container, data, aria, `has`, `group`, `peer`, `not`, `supports`, `starting`, motion, and dark-mode variants only when the source selector/state is owned and testable. Keep selector-based dark variants and `color-scheme` aligned with the root theme strategy.
20. Check layout utilities for common browser traps: missing `min-w-0` or `min-h-0` in flex/grid children, viewport height assumptions that should use `dvh`, `svh`, or `lvh`, and `space-*` on wrapped, reordered, or grid-like children where `gap` is the stable contract.
21. Check for conflicting utilities on one element, such as mutually exclusive display, spacing, text-size, viewport, or layout utilities.
22. Choose configured verification intents that cover production build, lint, component tests, accessibility states, and visual risk when available.

<!-- mustflow-section: generation-policy -->
## Generation Policy

- Tailwind classes must appear as complete static strings in scanned source, a static variant map, a CVA-style variant declaration, an explicit finite safelist, or a bounded v4 CSS source directive.
- Dynamic visual state must be represented by exactly one of: static map entry, variant helper entry, explicit safelist entry, or CSS variable bridge.
- Status, tone, intent, size, density, and column props are closed sets until proven otherwise. Model them as finite typed variants, not string fragments.
- Production CSS is the contract. If a class only exists after runtime string construction, assume production CSS may omit it.
- Path `@source`, path `@source not`, candidate `@source inline()`, candidate `@source not inline()`, and `source(none)` are part of the production CSS generation contract. Review them as carefully as code that uses utilities.

<!-- mustflow-section: token-policy -->
## Token Policy

- Use existing tokens and approved utilities first.
- Add a design token when a value repeats, has product meaning, appears in more than one component, supports theming, or has a designer-owned name.
- Do not add value-named tokens such as pixel-width or random-color names. Name tokens by role, surface, status, container, spacing purpose, or component meaning.
- Keep component markup free of raw hex, RGB, OKLCH, arbitrary color, and arbitrary shadow values unless the file is itself a token/theme definition.

<!-- mustflow-section: review-rejection-criteria -->
## Review Rejection Criteria

Reject the change when:

- A Tailwind utility is assembled from runtime fragments.
- A raw color appears outside a token or theme file.
- An arbitrary value appears without a narrow reason.
- The same arbitrary value appears in more than one place.
- A wrapper component exists only to hide a one-off class list.
- `@apply` hides component-specific styling instead of handling a CSS boundary.
- Component-scoped `@apply` or `@variant` relies on Tailwind globals without the needed `@reference` boundary.
- A public component exposes unconstrained Tailwind class fragments.
- A safelist covers broad palettes, broad numeric ranges, or unknown runtime values.
- `@source inline()` covers broad palettes, broad numeric ranges, or unknown runtime values.
- Tailwind v4 is recommended while the project still promises browsers below the v4 floor such as Safari 16.4, Chrome 111, or Firefox 128.
- `source(none)` is used without explicit source includes for all utility-owning files.
- `space-*` is used where wrapped or reordered children require `gap`.
- Conflicting utilities are present on the same element.

<!-- mustflow-section: postconditions -->
## Postconditions

- All generated utilities are visible to Tailwind's detector, a static map, a variant helper, or an intentional finite safelist.
- Arbitrary values are rare, justified, and not repeated without token promotion.
- Runtime visual values are constrained by semantic variants or bridged through CSS variables.
- Interactive states include keyboard and disabled behavior where relevant.
- Production-build class loss risk is checked or reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing production CSS or visual verification intents when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If production styling disappears, inspect dynamic class generation and source scanning first.
- If arbitrary values accumulate, stop and consider whether the design token system is missing a token.
- If helper utilities erase class visibility, rewrite to static maps or report the build risk.
- If a component API requires arbitrary Tailwind fragments, narrow it to semantic variants or report the public API risk.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Class detection and token notes
- Responsive and accessibility state notes
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Tailwind risk
