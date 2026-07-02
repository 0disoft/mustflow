---
mustflow_doc: skill.frontend-component-library-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: frontend-component-library-review
description: Apply this skill when a frontend component library, design system package, UI kit, shared component package, token system, primitive layer, variant API, theming surface, Storybook or docs site, package exports, public CSS or data attributes, accessibility behavior, controlled or uncontrolled component contract, visual regression suite, codemod, SemVer policy, or breaking-change plan is created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.frontend-component-library-review
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

# Frontend Component Library Review

<!-- mustflow-section: purpose -->
## Purpose

Review frontend component libraries as public API platforms, not collections of pretty
components copied from a design file.

The core question is: "Can multiple product teams upgrade this package without guessing which
tokens, props, slots, DOM shape, CSS variables, keyboard behavior, exports, docs examples, and
release notes are contractual?" If the answer is unclear, the library is a shared copy-paste
folder wearing a package name.

<!-- mustflow-section: use-when -->
## Use When

- A design system, component library, UI kit, shared React, Vue, Svelte, Web Component, CSS, or
  framework-agnostic component package is created, changed, reviewed, or reported.
- Code or docs touch design tokens, CSS variables, theme modes, brand themes, density, contrast,
  motion settings, primitive components, compound components, slots, variant props, polymorphic
  `as` or `asChild`, public data attributes, `className` escape hatches, or package exports.
- Button, Link, TextField, Dialog, Popover, Menu, Select, Combobox, Tabs, Tooltip, Toast, Table,
  Data Grid, Icon, Badge, Card, Alert, or similar reusable components gain public behavior.
- Storybook, docs, examples, props tables, visual regression stories, interaction tests,
  accessibility tests, type tests, SSR or hydration checks, bundle-size checks, changelog entries,
  migration guides, deprecation warnings, or codemods define consumer-facing behavior.
- A review or final report claims a component library is reusable, accessible, themeable,
  design-system-ready, stable, backward compatible, SemVer-safe, or ready for external teams.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is ordinary app UI with no reusable package, public component API, token contract, or
  cross-team consumer surface. Use the framework, UI quality, layout, or accessibility skill.
- The task only checks accessibility-tree semantics, keyboard behavior, labels, forms, dialogs, or
  ARIA for a specific UI. Use `frontend-accessibility-tree-review` first.
- The task only checks frontend state drift in an application. Use `frontend-state-ownership-review`
  first.
- The task only checks localization, RTL text behavior, translated layout stress, or locale SEO.
  Use `frontend-localization-review` or `frontend-stress-layout-review` first.
- The task only changes package metadata or exports without component-library contracts. Use the
  matching package, public API, or CLI contract skill.
- Verification would require unconfigured Storybook, browser, screenshot, visual-regression, or
  package-manager commands. Report the missing evidence instead of inventing commands.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, target package or library, framework signals, consumer audience, current diff or
  target files, package manager and build signals, and configured command intents.
- Package API ledger: public entrypoints, `package.json` exports, documented imports, deep-import
  policy, peer dependencies, side-effect CSS, generated styles, tree-shaking claims, SSR support,
  and bundle boundaries.
- Token ledger: primitive tokens, semantic tokens, component tokens, aliases, generated outputs,
  CSS variables, TypeScript types, platform exports, descriptions, deprecations, owners, contrast
  checks, and source-of-truth files.
- Primitive behavior ledger: dialog, popover, menu, select, combobox, tabs, tooltip, toast, focus
  scope, portal, scroll lock, typeahead, roving focus, escape behavior, outside interaction, and
  restore-focus contracts.
- Component contract ledger: props, slots, compound parts, refs, events, DOM ownership, data
  attributes, CSS variable hooks, `className` or style overrides, polymorphic behavior, default
  element, form participation, and documented examples.
- State contract ledger: controlled and uncontrolled pairs such as `value`, `defaultValue`,
  `onValueChange`, `open`, `defaultOpen`, `onOpenChange`, reset rules, disabled behavior, loading
  behavior, and duplicate-submit policy.
- Variant and theming ledger: semantic variant axes, impossible combinations, required accessible
  names, brand, light and dark mode, density, contrast, reduced motion, forced colors, responsive
  behavior, and theme-resolution order.
- Docs and test ledger: Storybook stories, anatomy docs, do and do-not guidance, accessibility and
  keyboard docs, controlled examples, theme-token docs, migration docs, type tests, behavior tests,
  visual regression matrix, accessibility automation, manual evidence, SSR, hydration, and bundle
  checks.
- Release ledger: SemVer classification, public API definition, deprecation warnings, migration
  guide, codemods, changelog, consumer upgrade path, and known breaking-change inventory.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Existing local patterns for tokens, primitives, variant helpers, styling, package exports, docs,
  tests, and release notes have been searched before inventing a new component-library pattern.
- If the change touches app data, auth, payments, notifications, deployment, database, or security
  behavior, also apply the narrower matching skill for that boundary.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Create or refine component-library skill, docs, tests, route metadata, package metadata, template
  copies, token docs, story contracts, migration notes, or release notes directly tied to the
  changed component-library surface.
- Tighten public API boundaries by documenting exports, removing undocumented example deep imports,
  making internal paths private, or marking such changes as breaking when consumers may rely on
  them.
- Add focused tests for exports, types, roles and names, keyboard behavior, controlled and
  uncontrolled state, variant constraints, token output, visual regression stories, SSR, hydration,
  and bundle boundaries when existing project patterns support them.
- Do not migrate the library to a new framework, styling engine, primitive library, package manager,
  Storybook setup, or token compiler unless the current task explicitly requires that migration.
- Do not treat `className`, raw `style`, hex-color props, arbitrary DOM selectors, or undocumented
  internal files as harmless flexibility when they become consumer contracts.

<!-- mustflow-section: procedure -->
## Procedure

1. Decide whether this is a component library or ordinary app UI.
   - A library has downstream consumers, public imports, reusable components, upgrade risk, docs
     examples, and package or workspace boundaries.
   - If it is just one screen, route to the narrower app UI skill and report that this skill does
     not apply.
2. Build the public API ledger first.
   - List public exports, documented imports, package entrypoints, peer dependencies, CSS side
     effects, token exports, generated files, and documented slot or DOM hooks.
   - Treat docs examples as public API. Consumers copy them.
   - Flag undocumented deep imports such as `dist/internal/*`, helper hooks, generated class files,
     or internal token maps. Blocking existing deep imports can be breaking.
3. Separate top-level library layers.
   - Prefer clear boundaries for tokens, primitives, components, icons, utilities, docs, testing,
     and codemods.
   - Reject a structure where every reusable concern lands in `components/*` and the Button prop
     list becomes the escape hatch for the whole system.
4. Review token architecture.
   - Separate primitive tokens such as raw colors and spacing, semantic tokens such as
     action-background and text-primary, and component tokens only when component-specific tuning
     is truly needed.
   - Product components should usually consume semantic tokens, not Figma variable names, raw hex
     values, or one-off pixel literals.
   - Token source, generated CSS variables, generated TypeScript types, docs tables, platform
     outputs, deprecations, and contrast checks must agree.
5. Review theming as value substitution, not logic spread.
   - Prefer root attributes, classes, or scopes that swap CSS variable values.
   - Keep brand, mode, density, contrast, and motion as independent axes unless the product has a
     documented reason to bundle them.
   - Flag per-component `theme.mode === ...` branches, theme-object reads on every component, and
     theme names that encode every axis into one untestable mega-theme.
6. Review primitives before styled components.
   - Dialog, Popover, Menu, Select, Combobox, Tabs, Tooltip, Toast, and similar primitives own
     accessibility behavior, focus, keyboard, portal, layering, scroll, and dismissal policy.
   - Styled components should wrap or compose primitive behavior without weakening it.
   - If the project hand-rolls a primitive, require the same behavior ledger a proven primitive
     library would have supplied.
7. Treat accessibility as public API.
   - Native elements, accessible names, labels, keyboard behavior, focus management, form
     participation, disabled behavior, live regions, and high contrast behavior are contractual.
   - `role`, `aria-*`, and data attributes imply behavior promises. Attributes without keyboard
     and focus behavior are not accessibility.
   - Route detailed accessibility fixes to `frontend-accessibility-tree-review`.
8. Review component state contracts.
   - Controlled and uncontrolled modes need consistent pairs: `value` with `onValueChange`,
     `defaultValue` for initial internal state, `open` with `onOpenChange`, and `defaultOpen`.
   - Do not mix controlled and uncontrolled ownership silently.
   - Components should not couple to app stores, routers, data-fetching libraries, or form
     libraries except through explicit adapters.
9. Review variant API shape.
   - Keep axes semantic and small, such as tone, emphasis, size, loading, icon-only, and disabled.
   - Prevent impossible combinations with types, runtime guards, docs, or component split.
   - Require an accessible name for icon-only controls, block duplicate submit when loading, and
     review polymorphic `as` or `asChild` combinations for semantic breakage.
10. Review styling contracts.
    - Stable slots, data attributes, CSS variables, and documented class hooks are safer than
      consumers styling incidental DOM shape.
    - Decide which DOM parts are public and which are internal.
    - If internal DOM, class names, or data attributes appear in docs, tests, examples, or consumer
      code, changing them may be breaking.
11. Review component-specific traps.
    - Button: native button behavior, `type`, loading duplicate-submit policy, icon-only names,
      disabled versus `aria-disabled`, and focus-visible styling.
    - TextField: durable label, description, error wiring, `aria-invalid`, required, readOnly,
      disabled, prefix and suffix, clear button, password reveal, and form reset behavior.
    - Dialog: name, initial focus, focus containment, restore focus, Escape, outside interaction,
      background inertness, scroll lock, nested overlays, and portal container.
    - Select and Combobox: do not conflate them. Review typeahead, search, highlighted option,
      selected option, groups, disabled items, mobile fallback, IME, scroll, and form behavior.
    - Table and Data Grid: separate semantic table from product-grade grid behavior such as
      sorting, pagination, virtualization, editing, export, and fetching.
    - Icon: `currentColor`, tree-shaking, viewBox consistency, decorative `aria-hidden`, and
      meaningful label strategy.
12. Review docs as executable specs.
    - Storybook or docs should show anatomy, when to use, when not to use, variants, controlled and
      uncontrolled examples, accessibility names, keyboard behavior, theme tokens, form behavior,
      migration notes, and do-not patterns.
    - Props tables are not enough.
    - Happy-path-only stories are weak contracts; important states need stories that tests can
      target.
13. Review test layers.
    - Type and export tests catch public API drift.
    - Behavior tests should use roles, names, keyboard events, state changes, and form behavior
      instead of brittle internal selectors.
    - Accessibility automation is a floor, not proof. Manual keyboard, focus, screen-reader smoke,
      forced-colors, reduced-motion, and target-size evidence may still be needed.
    - Visual regression should cover a representative matrix, not every combinatorial explosion.
      Keep failures diagnosable.
    - SSR, hydration, bundle size, tree-shaking, and CSS side-effect checks matter when the package
      claims app-framework or library-mode support.
14. Classify breaking changes broadly.
    - Public API includes exports, props, prop meaning, defaults, event timing, refs, CSS variables,
      token names, slot names, data attributes, documented DOM hooks, keyboard behavior, form
      behavior, theme resolution order, peer dependency ranges, generated files, and docs examples.
    - Removing, renaming, narrowing, changing defaults, changing ref targets, changing event order,
      blocking deep imports, deleting CSS variables, or changing documented data attributes may be
      major-version work.
15. Plan migrations before removals.
    - Prefer deprecation warnings and docs in a compatible release before removal.
    - Provide migration notes and codemods for broad prop, import, token, or slot renames.
    - Keep examples, changelog, tests, and generated docs aligned with the migration path.
16. Report the evidence level honestly.
    - Separate static package inspection, docs inspection, type-test evidence, behavior-test
      evidence, visual-regression evidence, accessibility evidence, browser evidence, and
      consumer-upgrade evidence.
    - If an evidence path is unconfigured, name the missing configured intent or manual review
      instead of claiming readiness.

<!-- mustflow-section: postconditions -->
## Postconditions

- Public API, token, primitive behavior, component contract, state contract, variant, theming,
  styling, docs, test, and release ledgers are fixed, ruled out, or reported.
- Component-library consumers can tell what is safe to import, style, theme, override, test, and
  rely on across upgrades.
- Breaking-change risk is classified across code, tokens, CSS, docs, tests, package exports, and
  runtime behavior.
- Missing Storybook, browser, visual, accessibility, package, or consumer-upgrade evidence is named
  instead of hidden.

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

Use the narrowest configured unit, component, docs, release, build, package, visual, accessibility,
or mustflow intent that covers the changed component-library contract. Do not infer raw Storybook,
browser, package-manager, visual-regression, or dev-server commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the public API ledger cannot be built, stop treating the change as SemVer-safe and report the
  missing source of truth.
- If token source, generated CSS variables, generated types, and docs disagree, fix the source and
  generated-surface contract before changing individual components.
- If a component requires custom primitive behavior but keyboard and focus behavior are unknown,
  route to `frontend-accessibility-tree-review` or report the missing evidence.
- If a variant or theming change creates impossible combinations, narrow the API, split the
  component, or report the product decision needed.
- If tests fail, preserve the configured intent name and failure evidence, then fix the contract
  surface rather than weakening tests.
- If release impact is unclear, apply `date-number-audit` before editing versions or release notes.

<!-- mustflow-section: output-format -->
## Output Format

- Component-library surface reviewed
- Package API, token, primitive, component, state, variant, theming, styling, docs, test, and release
  ledgers
- Findings, fixes, or recommendations
- Breaking-change and migration classification
- Evidence level by docs, types, behavior, accessibility, visual, package, browser, and consumer
  upgrade surface
- Narrower skills used or deferred
- Command intents run
- Skipped component-library checks and reasons
- Remaining component-library contract risk
