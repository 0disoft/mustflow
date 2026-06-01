---
mustflow_doc: skill.tailwind-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: tailwind-code-change
description: Apply this skill when Tailwind classes, className composition, static class detection, theme tokens, variants, safelists, arbitrary values, Tailwind config, @theme, @apply, or Tailwind migration surfaces are created or changed.
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

- Tailwind `class`, `className`, `@apply`, `@theme`, config, source scanning, safelist, theme tokens, variants, arbitrary values, or component class composition change.
- The task touches Tailwind v3/v4 migration, token addition, responsive modifiers, state modifiers, `clsx`/`cn`, CVA-style variant helpers, `@source`, or production CSS generation risk.
- Component APIs accept status, tone, intent, size, column count, color, spacing, or class-related props that affect Tailwind utilities.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Styling is plain CSS without Tailwind utilities; use `css-code-change`.
- Utility generation is UnoCSS, not Tailwind; use `unocss-code-change`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Tailwind version/config or CSS entry, content/source scanning rules, theme tokens, PostCSS/build config, class merge helpers, variant helpers, component patterns, and tests.
- Existing design system vocabulary, token naming conventions, accessibility state patterns, and component prop APIs.
- Any runtime source for visual values: props, CMS, database, tenant config, user input, API data, or external package markup.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Confirm how Tailwind detects source classes before changing class composition.
- Identify whether the project is using Tailwind v3 config safelists or Tailwind v4 CSS source directives.
- Identify tokens, variant helpers, and semantic visual states before adding arbitrary values or raw colors.
- Confirm whether affected components are local one-offs, shared components, or public design-system surfaces.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Use full static class strings that the build can detect.
- Use existing theme tokens before arbitrary values or raw colors.
- Use static maps, component extraction, or variant helpers for finite repeated variants.
- Use safelists only for finite class candidates that cannot appear in scanned source.
- Use inline styles plus CSS variables for unbounded runtime values such as tenant, database, or user-provided colors.
- Keep hover, focus-visible, disabled, aria/data, dark, and motion variants aligned with existing component behavior.

<!-- mustflow-section: procedure -->
## Procedure

1. Read Tailwind config or CSS entry, scanning rules, theme tokens, helpers, and nearby components.
2. Classify the change: token, utility usage, dynamic variant, component extraction, responsive state, accessibility state, or migration.
3. Treat every Tailwind class as a complete build-time token. Reject runtime interpolation, concatenation, array joins, or fragment assembly for utilities such as color, spacing, grid count, span, tone, or arbitrary values.
4. For finite choices, use a static map with semantic keys and full class strings. Good keys describe UI meaning such as `danger`, `muted`, `compact`, or `featured`; bad keys store Tailwind fragments such as `red`, `600`, or `cols-3` for later assembly.
5. Use a CVA-style variant helper only when a shared component has multiple variant axes, defaults, or compound variants. The helper must still contain full static class strings.
6. Use safelists only as a last resort for finite candidates that cannot be present in source files. Tailwind v4 projects should express this through the project's CSS source policy; Tailwind v3 maintenance projects may use config safelists when that is the existing pattern. Do not safelist broad palettes or unbounded ranges to avoid fixing a bad component API.
7. Use inline style plus a CSS variable bridge for unbounded runtime values from databases, APIs, tenants, CMS content, or user input. Do not try to mint Tailwind class names from unbounded values.
8. Treat arbitrary values as escape hatches. Allow them for one-off asset alignment, complex grid templates, complex calculations, local CSS variable assignment, or values that cannot be expressed with regular utilities.
9. Reject arbitrary raw colors in component markup, arbitrary spacing that approximates existing scale values, arbitrary container widths, arbitrary radius or shadow used as a hidden token, and repeated arbitrary values. Repeated values must be promoted to a semantic design token or component variant.
10. Keep raw color literals in theme or token files only. Token names should describe purpose, not numeric value.
11. Use `clsx` or `cn` only to combine complete class strings. Do not hide dynamic Tailwind string construction inside helper functions.
12. Do not expose unrestricted class fragments through public component APIs. If a `className` passthrough exists, preserve internal layout-critical classes and prevent consumer props from becoming the source of required Tailwind generation.
13. Do not extract a component only because a class list is long. Extract a component when structure, behavior, accessibility, and styling repeat together across files.
14. Do not use `@apply` to hide long JSX or template class lists. Reserve `@apply` for third-party markup overrides, CSS-module boundaries, or template systems where component extraction is genuinely heavier.
15. Use mobile-first responsive classes and include focus-visible or equivalent keyboard states for interactive elements.
16. Check for conflicting utilities on one element, such as mutually exclusive display, spacing, text-size, or layout utilities.
17. Choose configured verification intents that cover production build, lint, component tests, accessibility states, and visual risk when available.

<!-- mustflow-section: generation-policy -->
## Generation Policy

- Tailwind classes must appear as complete static strings in scanned source, a static variant map, a CVA-style variant declaration, or an explicit finite safelist.
- Dynamic visual state must be represented by exactly one of: static map entry, variant helper entry, explicit safelist entry, or CSS variable bridge.
- Status, tone, intent, size, density, and column props are closed sets until proven otherwise. Model them as finite typed variants, not string fragments.
- Production CSS is the contract. If a class only exists after runtime string construction, assume production CSS may omit it.

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
- A public component exposes unconstrained Tailwind class fragments.
- A safelist covers broad palettes, broad numeric ranges, or unknown runtime values.
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
