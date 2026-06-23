---
mustflow_doc: skill.unocss-code-change
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: unocss-code-change
description: Apply this skill when UnoCSS config, presets, Wind4 migration, theme extension, extraction, content pipeline, shortcuts, rules, variants, safelist, blocklist, attributify, transformers, icons, shadow DOM styling, or utility usage are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.unocss-code-change
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

# UnoCSS Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve UnoCSS extraction, preset, shortcut, rule, safelist, blocklist, variant, attributify, and production CSS boundaries. Treat UnoCSS utilities as statically extracted tokens, not runtime-generated strings.

<!-- mustflow-section: use-when -->
## Use When

- `uno.config.*`, `unocss.config.*`, presets, Wind4 preset migration, theme extension, rules, shortcuts, variants, extractors, content pipeline, safelist, blocklist, transformers, attributify, icon utilities, shadow DOM style injection, or UnoCSS utility usage changes.
- The task touches Vue, Svelte, Astro, MDX, TSX, backend templates, markdown-generated HTML, runtime class maps, generated CSS visibility, static class maps in `.ts` or `.js`, or utility generation in shared files.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Utility styling is Tailwind, not UnoCSS; use `tailwind-code-change`.
- Styling is plain CSS without UnoCSS extraction risk; use `css-code-change`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- `uno.config.*` or `unocss.config.*`, package metadata, bundler integration, CSS entry, content extraction rules, presets, Wind4 or Wind3 compatibility signals, theme extension or `extendTheme`, shortcuts, rules, variants, safelist, blocklist, transformers, attributify settings, icon loader settings, and tests.
- The file types that actually contain utilities, including static maps or variant helpers in `.ts` or `.js` files.
- Approved token allowlists for intent, tone, size, color, spacing, theme, state, icon, and variant values.
- Any runtime source for visual values: CMS, database, backend templates, user input, API data, generated markdown, or external components.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Confirm extraction targets before adding utilities or moving class maps.
- Identify whether the project uses default pipeline extraction, explicit `content.pipeline.include`, `@unocss-include`, safelist, or custom extractors.
- Identify whether the project uses the classic preset stack, `presetWind4`, theme compatibility tokens, shortcut layers, variant groups, icons, attributify, directives, reset packages, compatibility presets, or framework-specific plugin order.
- Identify whether shortcuts, rules, variants, or safelist entries are design-system vocabulary or one-off hiding places.
- If the config is unclear, do not introduce attributify, custom rules, custom variants, broad shortcuts, or broad safelists. Use plain `class` utilities with complete static strings.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep utilities statically extractable or narrowly safelisted.
- Add shortcuts only for shared design-system vocabulary.
- Add variants only for clear team conventions.
- Use blocklist or lint policy to prevent raw pixels, raw colors, non-canonical aliases, and uncontrolled arbitrary utilities when the project supports it.
- Extend extraction only through narrow pipeline include patterns or a single-file include marker when static class maps live outside default scanned file types.
- Add safelist entries only for finite candidates that cannot exist statically in source.
- Add icon loaders, custom rules, and shadow DOM CSS only with explicit package, bundle-size, and injection ownership.

<!-- mustflow-section: procedure -->
## Procedure

1. Read UnoCSS config, presets, extraction config, CSS import, framework integration, and nearby utility usage.
2. Classify the change: extraction, preset, Wind4 migration, theme extension, shortcut, rule, variant, safelist, blocklist, attributify, transformer, icon utility, shadow DOM styling, or component usage.
3. Treat every UnoCSS utility as a build-time extraction token. Reject runtime interpolation, concatenation, array joins, broad template fragments, or values built only from API, CMS, database, backend, or user-input strings.
4. If a missing utility comes from string interpolation, replace it with a finite static map. If that map lives in `.ts` or `.js`, ensure the file is included by a narrow content pipeline pattern or a single-file include marker.
5. Use safelist only for classes that cannot appear statically in source, such as CMS schema values, external runtime input, backend-rendered fragments, or external components. Do not use safelist to cover a bad component API or forgotten extraction include.
6. Keep safelists small, finite, named, and bounded by approved token lists and maximum generated count. Treat feature-local safelists over 50 classes, shared safelists over 200 classes, or total safelists over 300 classes as design/extraction failures unless explicitly justified.
7. Do not generate safelists from whole theme objects, full color palettes, all shades, all spacing values, all breakpoints, or broad property and variant multiplication.
8. Use token allowlists before writing shortcuts, rules, variants, or safelists. Do not use every theme key as an allowed product value.
9. For Wind4 migration, verify preset choice, theme token migration, reset ownership, variant behavior, and compatibility with existing Tailwind-like class vocabulary before changing utilities at call sites. Use a token rename matrix instead of vague "theme review":
   - `fontFamily` -> `font`;
   - `borderRadius` -> `radius`;
   - `easing` -> `ease`;
   - `breakpoints` -> `breakpoint`;
   - `verticalBreakpoints` -> `verticalBreakpoint`;
   - `boxShadow` -> `shadow`;
   - size scale families that now share spacing -> `spacing`;
   - `container.maxWidth` -> `containers.maxWidth`.
   Also check duplicate resets from existing `@unocss/reset` or `normalize.css`, remove `presetRemToPx` when Wind4 covers the behavior internally, and do not combine `presetLegacyCompat` with Wind4 OKLCH color behavior.
10. Use `extendTheme` or equivalent merge hooks when preserving existing theme tokens matters. Do not replace the whole theme object if the local config expects extension semantics.
11. Add shortcuts only for repeated product primitives. Prefer static shortcuts when all combinations are known. Dynamic shortcuts must be anchored, token allowlisted, and free of broad catch-all groups.
12. Do not use shortcuts as one-off wrappers for long class strings in a single screen.
13. Add custom rules only for CSS primitives or token bridges that existing presets cannot express. Do not pass arbitrary raw values directly into CSS.
14. Returning raw CSS strings from custom rules requires explicit review because escaping, variants, and generated CSS structure become the rule author's responsibility.
15. Add custom variants only for stable team selector conventions such as known data states, ARIA states, or approved themes. Variants must be allowlisted and selector-scoped.
16. Use blocklist policy to catch raw pixel utilities, raw color utilities, non-token arbitrary values, and non-canonical aliases when the project supports it. Pair blocklist entries with actionable messages and lint visibility when available.
17. If attributify is used in JSX or TSX, require prefixed-only attributes, the JSX transformer, and framework type shims. Prefer a project prefix such as `un-`; do not introduce unprefixed `text`, `color`, `size`, or `border` attributes.
18. If attributify transformer limitations make an attribute ambiguous, use valued prefixed attributes or plain `class` utilities.
19. For icons, verify package ownership, icon collection size, loader source, currentColor behavior, mask/background mode, and whether `FileSystemIconLoader` or custom loaders introduce file-system or bundling risk.
20. For Svelte, Vue, Astro, MDX, shadow DOM, web components, or framework-scoped CSS, verify plugin order and style injection order before blaming missing utilities on class names.
21. Choose configured verification intents that cover production build, extraction coverage, lint, component tests, generated CSS size risk, and visual risk when available.

<!-- mustflow-section: extraction-policy -->
## Extraction Policy

- Static class maps are valid only when UnoCSS actually scans the file that contains the full utility strings.
- Default framework scanning may not include plain `.ts` or `.js` utility files. Check the project config before moving variants into helper files.
- Extraction can come from file-system scans, `content.pipeline.include`, inline include markers, framework transforms, markdown/MDX pipelines, backend templates, or custom extractors. Name which owner makes each utility visible.
- Prefer static maps for finite values such as intent, tone, size, density, column count, state, and theme.
- Use narrow content pipeline includes for repeated helper-map locations.
- Use a single-file include marker only for isolated files that intentionally hold extractable utilities.
- Do not add broad extraction globs that pull tests, generated files, build output, dependencies, or unrelated scripts into utility extraction.

<!-- mustflow-section: shortcut-rule-variant-policy -->
## Shortcut, Rule, And Variant Policy

- Shortcuts, rules, and variants create project-wide styling vocabulary. Treat them as public design-system surface, not local convenience.
- Dynamic shortcut regexes must not contain unbounded catch-all groups. They must be anchored and restricted to approved token values.
- Custom rules must not become raw CSS property tunnels.
- Custom variants must not create arbitrary selector DSLs.
- One-off names such as page-specific hero, pricing, landing, or copy wrappers do not belong in global shortcuts.
- If all combinations are known, prefer generated static shortcut entries over runtime-like regex behavior.
- Rules, shortcuts, and variants must remain layer-aware. Do not let a shortcut hide whether a style belongs in reset, preflight, tokens, utilities, components, or a local framework style block.

<!-- mustflow-section: safelist-blocklist-policy -->
## Safelist And Blocklist Policy

- Safelist is a last resort for finite utilities absent from source.
- Safelist functions must have a named source, an approved candidate list, and a cap.
- Broad theme iteration, palette multiplication, shade multiplication, and variant multiplication are rejected by default.
- Blocklist should reject raw pixel, raw hex, raw color-function, and non-token arbitrary utilities when those violate the design system.
- Blocklist failures should explain the preferred token, scale value, CSS variable, or source file to change.
- If blocklist only removes generated CSS without a lint or test signal, report the developer-experience risk.

<!-- mustflow-section: preset-icon-shadow-policy -->
## Preset, Icon, And Shadow DOM Policy

- Wind4 migration must preserve theme tokens, reset ownership, variant semantics, generated CSS size, and color behavior before call-site cleanup.
- Wind4 includes Tailwind 4-style reset behavior. Existing `@unocss/reset` or `normalize.css` imports need duplicate-reset review.
- Wind4 migration should remove obsolete `presetRemToPx` usage and avoid `presetLegacyCompat` when OKLCH color compatibility matters.
- Icon utilities are production assets. Verify the chosen icon collections, loader ownership, package footprint, currentColor inheritance, accessibility label path, and whether dynamic icon names require a finite safelist.
- Shadow DOM and web component styles need an explicit injection owner. Do not assume global utility CSS reaches closed or separately injected roots.
- Framework plugin order is part of extraction. Svelte, Vue, Astro, MDX, transformers, variant-group handling, and attributify can change whether the token exists before UnoCSS scans it.

<!-- mustflow-section: attributify-policy -->
## Attributify Policy

- Do not introduce attributify in a project whose UnoCSS config is unclear.
- In JSX/TSX, attributify requires prefixed-only mode, JSX transformation, and framework type declarations.
- Avoid unprefixed attributes that collide with DOM or component props.
- Prefer plain `class` utilities when transformer, type shim, or prop conflict handling is missing.

<!-- mustflow-section: review-rejection-criteria -->
## Review Rejection Criteria

Reject the change when:

- Utilities are assembled from runtime fragments.
- A static map moves into a file UnoCSS does not scan.
- Safelist hides an extraction mistake.
- Safelist generation is broad, uncapped, or based on whole theme objects.
- Dynamic shortcuts use catch-all regex groups or accept arbitrary values.
- Custom rules pass raw values directly into CSS.
- Custom variants accept arbitrary selectors or themes.
- Blocklist removes utilities without an actionable developer-facing signal.
- JSX/TSX attributify lacks prefix, transformer, or type support.
- Wind4 migration replaces theme, reset, color, or preflight behavior without compatibility review.
- Icon utilities accept unbounded runtime icon names.
- Shadow DOM utility usage has no style injection owner.

<!-- mustflow-section: postconditions -->
## Postconditions

- Utilities are extractable or intentionally safelisted.
- Preset, shortcut, variant, rule, icon, and shadow DOM additions are bounded and reviewable.
- Safelist and blocklist changes are finite, token-aware, and visible to maintainers.
- Production generated CSS risk is checked or reported.
- Attributify conflicts are considered when relevant.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing production CSS, extractor, or visual verification intents when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a utility is missing in production, inspect extraction targets and runtime-only class composition first.
- If safelist growth is broad, stop and require a smaller token-bounded contract.
- If a custom extractor is needed, treat it as build-system risk and use a narrower contract skill if command metadata changes.
- If static maps are not extracted, fix the source include boundary before adding safelist.
- If attributify breaks JSX or component props, fall back to plain `class` utilities or add the missing prefixed transformer/type contract.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Extraction, safelist, shortcut, or variant notes
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining UnoCSS risk
