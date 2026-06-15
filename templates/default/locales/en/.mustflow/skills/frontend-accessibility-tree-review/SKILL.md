---
mustflow_doc: skill.frontend-accessibility-tree-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: frontend-accessibility-tree-review
description: Apply this skill when frontend UI is created, changed, reviewed, or reported and accessibility must be checked through the browser accessibility tree, accessible names, visible label consistency, native HTML semantics, keyboard navigation, focus order and return, dialogs, forms, errors, live regions, ARIA attributes, hidden content, icon and image text alternatives, custom widgets, contrast, target size, dragging alternatives, or automated accessibility evidence.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.frontend-accessibility-tree-review
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

# Frontend Accessibility Tree Review

<!-- mustflow-section: purpose -->
## Purpose

Review frontend accessibility by checking what browsers expose to assistive technology, not whether code contains enough ARIA.

The core question is: "Does the accessibility tree, keyboard path, visible label, and announced state describe the same UI the sighted pointer user sees?" Native HTML should carry the contract first. ARIA should repair unavoidable gaps, not repaint broken semantics.

<!-- mustflow-section: use-when -->
## Use When

- Frontend UI, controls, forms, dialogs, menus, tabs, comboboxes, custom selects, tables, cards, media, icons, images, drag interactions, loading states, error states, toasts, live updates, or design-system components are created, changed, reviewed, or reported.
- Code adds or changes `onClick`, `role`, `tabIndex`, `aria-*`, `alt`, `hidden`, `display: none`, `visibility: hidden`, visually hidden text, focus styles, keyboard handlers, dialogs, popovers, menus, tabs, form validation, or live regions.
- A review or final report claims the UI is accessible, keyboard usable, screen-reader friendly, WCAG-ready, axe-clean, semantically correct, or correctly labeled.
- A bug report mentions missing names, wrong screen-reader text, inaccessible icon buttons, broken Tab order, focus loss, modal focus leaks, keyboard traps, placeholder-only fields, unannounced async status, or custom widget keyboard failures.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only visual layout stress, overflow, mobile viewport, zoom, or hostile content resilience; use `frontend-stress-layout-review` first and this skill only when assistive-technology or keyboard contracts are also affected.
- The task is only broad UI quality or visual polish with no semantic, keyboard, focus, form, status-message, target-size, or assistive-technology risk; use `ui-quality-gate`.
- The task is only first-render performance, Core Web Vitals, bundle size, or per-frame rendering; use the matching frontend performance skill.
- No user-facing UI, rendered artifact, browser DOM, or interaction contract is affected.
- Verification would require an unconfigured browser, screen reader, accessibility snapshot, or dev server. Report the missing accessibility evidence instead of inventing raw commands.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, changed UI surface, current diff or target files, framework and component-library signals, and configured command intents.
- Semantic ledger: each interactive element, intended role, native element used, accessible name source, visible label, current state, disabled behavior, and destination or action semantics.
- Keyboard ledger: tab order, Enter and Space behavior, arrow-key contract, Escape behavior, focus trap, focus return, roving tabindex if used, and skip or landmark navigation when relevant.
- Assistive-technology ledger: accessibility tree role/name/state evidence, `aria-labelledby` and `aria-describedby` references, live region behavior, hidden content policy, and icon or image text alternatives.
- Form ledger: labels, instructions, placeholder usage, fieldset and legend groups, validation timing, `aria-invalid`, error descriptions, error summary, and submit-failure focus behavior.
- Interaction ledger: dialogs, menus, tabs, comboboxes, custom selects, drag and drop, sliders, touch targets, pointer alternatives, focus visibility, obscured focus, non-text contrast, reduced motion, and async status updates.
- Evidence level: static markup evidence, lint or axe evidence, Testing Library `getByRole` evidence, Playwright accessibility snapshot evidence, keyboard walkthrough evidence, screen-reader manual evidence, or missing evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Existing local patterns for buttons, links, icons, forms, dialogs, menus, tabs, comboboxes, toasts, live regions, focus rings, and visually hidden text have been searched before adding a new accessibility pattern.
- If an accessibility issue is caused by state ownership, permission logic, layout stress, rendering performance, or security flow, also apply the narrower matching skill for that boundary.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Replace fake interactive elements with native HTML such as `<button type="button">`, `<a href>`, `<label>`, `<fieldset>`, `<legend>`, `<select>`, and form controls when they match the interaction.
- Add or correct accessible names, label associations, descriptions, `aria-invalid`, `aria-expanded`, `aria-selected`, `aria-checked`, `aria-current`, `aria-busy`, live regions, focus management, keyboard handlers, and hidden-content behavior when native semantics are insufficient.
- Fix icon, SVG, image, and alt text contracts; add decorative `aria-hidden`, `focusable="false"`, meaningful labels, or empty alt text according to the element's role.
- Add focused tests, fixtures, or assertions that use roles, names, keyboard interaction, focus behavior, or accessibility snapshots when existing project patterns support them.
- Do not replace native controls with custom widgets, add broad ARIA frameworks, create a visual test suite, start a browser or screen-reader workflow, or change product interaction semantics beyond the affected accessibility contract.

<!-- mustflow-section: procedure -->
## Procedure

1. Start from the accessibility tree, not the JSX.
   - For each important control, name the exposed role, accessible name, state, and description.
   - If no tree evidence exists, do a static semantic pass and label the result as static evidence.
2. Prefer native semantics before ARIA.
   - A clickable `div`, `span`, `li`, `svg`, or `img` is suspicious when the intended control is a button or link.
   - Use `<button type="button">` for actions and `<a href>` for navigation. Do not accept `role="button"` until the native element is proven impossible.
3. Separate links from buttons.
   - Navigation, file downloads, external URLs, and section jumps are links.
   - Saving, deleting, opening menus, toggling panels, submitting forms, and launching modals are buttons.
   - Flag `href="#"`, `javascript:void(0)`, `preventDefault()` link fakery, and `<a onClick>` without a real `href`.
4. Audit `onClick` and keyboard parity.
   - Pointer actions need keyboard access. Native buttons already cover focus, Enter, Space, disabled behavior, and form defaults.
   - Custom widgets must define the key contract explicitly instead of sprinkling `tabIndex={0}` and hoping.
5. Audit tabindex.
   - `tabIndex={0}` should be rare and tied to a real composite widget or programmatic focus need.
   - `tabIndex={-1}` is for script focus targets such as error summaries or dialog headings.
   - A positive tabindex almost always creates a fake tab order and should be removed or reported.
6. Preserve visible focus.
   - Reject `outline: none`, global focus removal, and focus styles hidden under sticky headers, bottom bars, banners, or overlays.
   - Prefer `:focus-visible` when mouse focus rings caused the team to remove focus indicators.
   - Check that focused controls are not obscured by fixed or sticky content.
7. Review dialogs by focus flow.
   - A dialog needs a name, initial focus, contained Tab movement, Escape or clear close behavior when appropriate, background inertness or equivalent blocking, and focus return to the opener.
   - `role="dialog"` or `aria-modal="true"` alone is not enough.
8. Check icon-only controls.
   - `<button><Icon /></button>` needs an accessible name such as an `aria-label` or associated visible text.
   - If visible text already names the control, do not override it with a conflicting `aria-label`.
   - The visible label should be included in the accessible name so speech input users can say what they see.
9. Validate label references.
   - `aria-labelledby` and `aria-describedby` values must be element id references, not prose.
   - Check that referenced ids exist, are unique, are not hidden incorrectly, and remain translated with the visible UI.
10. Audit hidden content.
    - `aria-hidden="true"` on a parent hides all descendants from assistive technology; do not leave focusable buttons or links inside it.
    - Distinguish `hidden`, `display: none`, `visibility: hidden`, visually hidden text, and `aria-hidden`.
    - Offscreen or visually hidden content must not trap focus outside the visible viewport.
11. Review SVG and icon defaults.
    - Decorative icons should usually be `aria-hidden="true"` and `focusable="false"`.
    - Meaningful standalone icons need a name strategy.
    - Avoid duplicate announcements such as icon title plus visible text reading the same word twice.
12. Review image alt by role.
    - Informative images need concise useful text.
    - Functional images inside links or buttons should describe the action or destination.
    - Decorative images should use `alt=""`.
    - Reject filler alt such as "image", "thumbnail", "icon", or raw filenames.
13. Review forms.
    - Placeholder is not a label. Each input needs a durable label relationship unless a project-approved equivalent exists.
    - Radio and checkbox groups need a group name, usually `fieldset` and `legend`.
    - Instructions and errors should be programmatically connected to the relevant controls.
14. Review validation and submit failure.
    - Errors need text, not only red borders or icons.
    - Invalid controls should expose invalid state and error descriptions.
    - After submit failure, move focus to an error summary or first invalid control when that best supports recovery, and do not steal focus during ordinary typing.
15. Announce important async status.
    - Saving, saved, failed, cart updated, search results changed, zero results, upload progress, and background validation may need a `status`, `alert`, or live region pattern.
    - Do not spam announcements for every minor rerender.
16. Review ARIA pattern widgets by keyboard contract.
    - Menus, menu buttons, tabs, comboboxes, listboxes, tree views, grids, sliders, and custom selects need their pattern's role, state, focus, and key behavior together.
    - Attributes without keyboard behavior create an accessibility-tree costume, not an accessible widget.
17. Challenge custom select and combobox work.
    - Prefer native `<select>` unless search, async options, multi-select, rich option content, or a proven library requires custom behavior.
    - Custom selects need mobile touch, keyboard, screen reader, IME, scroll, portal, and focus behavior checked together.
18. Check non-text contrast and target size.
    - Focus rings, input borders, toggle states, chart lines, error icons, and meaningful graphics need sufficient contrast against adjacent colors.
    - Pointer targets need a real clickable area, not just a visible icon size.
19. Provide non-drag alternatives.
    - Sorting, sliders, map pins, uploads, and kanban moves cannot be drag-only when the product task can be exposed through buttons, numeric input, or single-pointer alternatives.
20. Treat automation as a floor.
    - eslint accessibility rules, axe, Testing Library `getByRole`, and Playwright accessibility snapshots are useful smoke checks.
    - They do not prove focus return, meaningful business labels, speech input label consistency, or human-understandable error recovery by themselves.
21. Report the evidence honestly.
    - Separate static markup evidence, automated rule evidence, accessibility-tree evidence, keyboard walkthrough evidence, and manual screen-reader evidence.
    - If a finding is based on code inspection only, say so and name the missing runtime proof.

<!-- mustflow-section: postconditions -->
## Postconditions

- Important controls have correct native semantics or a justified ARIA pattern with matching keyboard behavior.
- The accessibility tree exposes the intended role, accessible name, description, and state without fighting visible labels or translated text.
- Tab order, focus visibility, focus containment, focus return, hidden content, forms, errors, live regions, icons, images, custom widgets, contrast, target size, and drag alternatives are fixed, ruled out, or reported where relevant.
- Automated accessibility claims are not treated as full accessibility proof unless keyboard and assistive-technology behavior were also verified or explicitly marked as unverified.

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

Use the narrowest configured unit, component, accessibility, browser, build, docs, release, or mustflow intent that covers the changed accessibility contract. Use axe, Playwright accessibility snapshots, screen readers, browser DevTools, dev servers, or interactive keyboard walkthroughs only when they are configured one-shot intents or explicitly approved by the user.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If runtime accessibility-tree evidence is unavailable, report the missing evidence instead of claiming screen-reader safety.
- If native HTML can solve the interaction, prefer that before adding ARIA and custom keyboard code.
- If an ARIA pattern cannot be completed with the required keyboard and focus behavior, keep or restore the simpler native control and report the unsupported custom widget.
- If a fix changes product semantics, navigation behavior, form submission, or permission visibility, apply the relevant business, state, or security skill before continuing.
- If a configured test or build fails after an accessibility change, preserve the failing intent and output tail, then use `failure-triage` before broadening the fix.
- If verification requires unconfigured browser automation or manual screen-reader testing, stop at that boundary and report the skipped check.

<!-- mustflow-section: output-format -->
## Output Format

- Frontend accessibility surface reviewed
- Semantic, keyboard, focus, accessible-name, hidden-content, form, status-message, widget, contrast, target-size, and drag-alternative checks where relevant
- Accessibility tree or static semantic evidence level
- Findings, fixes, or recommendations
- Automated accessibility evidence and its limits
- Command intents run
- Skipped accessibility checks and reasons
- Remaining accessibility-tree risk
