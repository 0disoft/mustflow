---
mustflow_doc: skill.html-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: html-code-change
description: Apply this skill when HTML, templates, JSX or component markup, forms, controls, dialogs, navigation, tables, media, metadata, SEO head content, or structured data are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.html-code-change
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

# HTML Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve semantic structure, native controls, keyboard access, focus behavior, form labeling, metadata, and browser-valid markup. Treat non-native interactive markup as suspicious by default; HTML already gives browsers, keyboards, forms, password managers, mobile input, and assistive technology a working contract.

<!-- mustflow-section: use-when -->
## Use When

- `.html`, JSX, TSX, Vue, Svelte, Astro, or template markup changes.
- The task touches layout landmarks, headings, forms, buttons, links, dialogs, menus, tabs, accordions, custom selects, composite widgets, tables, media, metadata, canonical links, Open Graph, robots, hreflang, viewport, or JSON-LD.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Only CSS changes and markup semantics are unchanged; use `css-code-change`.
- The markup is generated and should be changed through a source component or template.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Existing page layout, document shell, head/SEO helpers, metadata builders, canonical URL helpers, sitemap or robots config, form components, interactive control components, and tests.
- Target framework conventions for rendering, routing, hydration, and metadata.
- Visible page content, H1 or primary title, main entity, locale, indexing intent, and data sources for title, description, image, author, date, price, rating, availability, and FAQ content when metadata changes.
- Accessibility and validation tooling declared in the command contract.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify the document structure, interactive controls, form ownership, focus path, metadata source, and verification surface.
- Prefer native HTML elements before adding ARIA or JavaScript behavior.
- Classify every interactive element by user intent before changing markup.
- Do not edit metadata, canonical, Open Graph, robots, hreflang, or JSON-LD from a single file in isolation.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Use semantic landmarks, headings, native links, native buttons, and native form controls where possible.
- Connect labels, help text, error text, required state, autocomplete, and input type explicitly.
- Keep metadata and structured data consistent with visible page content.
- Add ARIA only when native semantics cannot express the control and the required role, state, keyboard, and focus behavior are implemented.

<!-- mustflow-section: procedure -->
## Procedure

1. Read the page shell, route layout, metadata helpers, component patterns, and tests before editing.
2. Check document outline, landmarks, source order, and heading levels.
3. Classify each interactive element by intent. Navigation to a URL uses an anchor with `href`. Commands, toggles, submit actions, open/close actions, destructive actions, copy actions, disclosure triggers, and modal triggers use buttons.
4. Use native form controls for text entry, selection, checkbox, radio, and file input. Use grouped native radio or checkbox controls with fieldset and legend when the group label matters.
5. Treat composite widgets such as tabs, action menus, comboboxes, listboxes, trees, grids, and custom selects as high-risk. Prefer native HTML or an existing audited component; otherwise implement the complete role, state, focus, and keyboard pattern.
6. Reject clickable `div` or `span` controls, clickable icons without buttons, anchors without `href`, links used as buttons, nested interactive controls, positive `tabindex`, focusable `aria-hidden` content, and focus outline removal without a replacement focus style.
7. Use ARIA only when native HTML cannot express the needed semantics. Validate the role is legal for the element, the accessible name exists, required states are present, visual and ARIA states stay synchronized, keyboard behavior matches the widget pattern, and focus behavior is explicit.
8. For custom legacy button-like elements that cannot be replaced, require `role`, focusability, Enter activation, Space activation, Space scroll prevention, pointer activation, duplicate-event prevention, and visible focus. Use native buttons instead whenever possible.
9. For dialogs, prefer native dialog when the project can support it. Otherwise implement focus entry, Tab and Shift+Tab containment, Escape behavior, inert or unreachable background content, visible close or cancel control, focus return, and an accessible name.
10. For tabs, use tablist, tab, and tabpanel semantics only for a real tabbed interface. Require one active tab, panel linkage, roving tabindex, arrow key movement, Home and End where expected, and Enter or Space activation when activation is manual.
11. For menus, do not use ARIA menu roles for ordinary site navigation. Site navigation is a nav landmark with links. Use ARIA menu patterns only for application-style action menus with a button trigger, expanded state, focus strategy, Escape close behavior, and focus return.
12. For forms, verify visible label association, help association, error association, required text, native required state, autocomplete, validation timing, invalid state, error summary behavior, and submission behavior.
13. Use placeholder, title, aria-label, color, icon, or toast-only feedback only as supplementary affordances, not as the only label, required indicator, or error explanation.
14. For metadata, read visible content and the metadata generation path first. Keep title, description, canonical, Open Graph, Twitter or X card data, robots, hreflang, and JSON-LD aligned with visible content, locale, URL, and indexing intent.
15. Structured data must describe content visible on the same page. Do not invent ratings, reviews, FAQ items, authors, prices, availability, dates, organizations, product properties, or claims not backed by the page data source.
16. Ensure every HTML page has a valid non-empty language and responsive viewport that does not disable zoom. Mixed-language passages should identify their language when needed.
17. Keep inline script and style minimal; move behavior and styling to the existing project layers unless the framework requires an inline boundary.
18. Choose configured verification intents that cover markup validity, lint, build, accessibility, route rendering, metadata, and docs when available.

<!-- mustflow-section: form-accessibility -->
## Form Accessibility Rules

- Every user-editable native form control needs a persistent visible label, preferably an explicit label whose `for` value exactly matches the control `id`.
- Placeholder text, title text, aria-label, icon-only labels, and visual proximity are not substitutes for visible labels unless a strong design constraint is reported and the accessible name remains clear.
- Help text and error text must be real DOM text with stable IDs and connected through `aria-describedby` when relevant.
- Required native controls should use native `required`; the required state must also be visible in text or an explained marker. Do not rely on color alone.
- Use `aria-required` mainly for custom ARIA controls or deliberate compatibility needs; it does not enforce browser validation.
- Do not set `aria-invalid` before the user has interacted with the field or attempted submission. Set it when validation has determined the field is invalid.
- Error messages must identify what is wrong and how to fix it when the fix is known. Avoid generic text such as "Invalid" with no recovery instruction.
- Multiple submit errors should use an error summary near the top of the form or page when the project pattern supports it. Summary items should link to invalid fields, and inline errors should remain next to fields.
- Use alert or live regions only for dynamic validation or submit feedback that should be announced. Do not spam alerts on every keystroke or place interactive controls inside alerts.
- Inputs collecting information about the current user should use appropriate autocomplete tokens. Do not blindly disable autocomplete on login, checkout, contact, signup, or account forms.

<!-- mustflow-section: metadata-policy -->
## Metadata And Structured Data Rules

Before editing page metadata, identify the rendered route, canonical production URL, visible H1 or main title, visible primary entity, locale, indexing intent, and source of page facts.

- Titles must match the visible primary topic, avoid repeated keyword stuffing, avoid stale boilerplate, and use the page's visible language.
- Descriptions must summarize the actual visible page and must not fabricate claims, guarantees, prices, ratings, dates, or features.
- Canonical URLs must be absolute production URLs for the preferred version of the same or near-duplicate content. Do not point canonical to staging, localhost, unrelated pages, wrong locale pages, redirects, 404s, noindex pages, or parameter URLs unless explicitly intended.
- Canonical, sitemap, hreflang, internal links, and social URL metadata should not contradict each other.
- Open Graph and Twitter or X title, description, URL, and image should come from the same source of truth as page metadata unless a campaign override is documented. Social images must be absolute, crawlable, and representative of the visible page.
- Prefer JSON-LD for structured data. Validate JSON syntax and ensure required properties for the chosen rich result type are present when rich-result eligibility matters.
- Robots directives such as noindex, nofollow, nosnippet, or restrictive crawl hints need explicit intent. Before removing one, check whether the page is intentionally private, duplicated, thin, internal, staged, or blocked.

<!-- mustflow-section: rejection-criteria -->
## Review Rejection Criteria

Reject or revise the patch when any of these appear without strong justification and verification:

- New `div` or `span` interaction where a native link, button, or form control would work.
- Anchors without `href`, buttons implemented as links, links implemented as buttons, nested interactive controls, clickable icons without native controls, or site navigation using ARIA menu roles.
- Custom controls without complete accessible name, role, state, keyboard, focus, and hidden-content behavior.
- Positive `tabindex`, hidden content that remains tabbable, focusable `aria-hidden` content, or invisible focus.
- Form controls without visible labels, placeholder-only labels, disconnected help or error text, color-only required or error state, premature `aria-invalid`, or autocomplete removed without reason.
- Metadata or JSON-LD that contradicts visible content, fabricates facts, points canonical or social URL at the wrong page, disables zoom, omits page language, or accidentally noindexes a public page.

<!-- mustflow-section: postconditions -->
## Postconditions

- Markup communicates the intended structure without relying on visual styling alone.
- Keyboard and focus behavior are preserved.
- Forms have labels and errors connected.
- Metadata and structured data reflect visible content.
- Hidden content is not reachable by keyboard when it should be inactive.
- Native controls are used unless a complete custom interaction pattern is justified.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing accessibility, browser, or HTML validation intents when relevant.

When configured or manual verification is available, cover keyboard-only navigation with Tab, Shift+Tab, Enter, Space, Escape, Arrow keys, Home, and End where applicable. Confirm visible focus, accessible name, role, value, state, hidden-content behavior, form errors, metadata consistency, and structured data truthfulness.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a custom control cannot meet keyboard and focus requirements, replace it with a native element or report the blocker.
- If metadata source of truth is unclear, inspect the framework route and SEO helpers before editing.
- If form validation timing or error ownership is unclear, keep native validation behavior and report the unresolved custom validation boundary.
- If structured data facts cannot be traced to visible content or a trusted page data source, do not add them.
- If accessibility verification is unavailable, report the manual keyboard and focus checks that remain.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Semantic, form, focus, and metadata notes
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining HTML risk
