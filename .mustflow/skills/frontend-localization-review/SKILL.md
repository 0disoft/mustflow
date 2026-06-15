---
mustflow_doc: skill.frontend-localization-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: frontend-localization-review
description: Apply this skill when frontend UI, product copy, messages, metadata, notifications, exports, locale handling, formatting, sorting, search, SSR hydration, RTL behavior, or i18n tests are created, changed, reviewed, or reported and localization correctness must be checked beyond visible JSX text.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.frontend-localization-review
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

# Frontend Localization Review

<!-- mustflow-section: purpose -->
## Purpose

Review frontend localization by tracing every user-visible string, locale-sensitive value, direction-sensitive layout choice, and exported text surface instead of only scanning visible JSX text.

The core question is: "Can the product say the right thing, in the right grammar, format, direction, tone, and channel for this user's language, region, currency, unit, and time zone?" A translated screen is not localized if placeholders, validation errors, file names, emails, metadata, numbers, dates, sort order, or fallback behavior still leak the source locale.

<!-- mustflow-section: use-when -->
## Use When

- Frontend UI, product copy, forms, validation, error messages, empty states, toasts, dialogs, emails, push notifications, share text, exports, downloads, PDFs, CSVs, calendar invites, charts, canvas, SVG text, document titles, metadata, Open Graph, or SEO text are created, changed, reviewed, or reported.
- Code adds or changes translation keys, message catalogs, `t(...)`, ICU messages, placeholders, `aria-label`, `title`, `alt`, `meta` tags, Open Graph text, browser `confirm` text, chart labels, file names, copy-to-clipboard text, or backend error-code mapping.
- Code adds or changes date, time, relative-time, number, currency, percent, unit, plural, list, case, collation, search normalization, truncation, string length, or user-input parsing logic.
- UI needs to support long translated labels, pseudo localization, RTL or bidirectional text, locale-specific font fallback, language switching, server rendering, hydration, or client/server locale agreement.
- A review or final report claims a surface is translated, localization-safe, i18n-ready, RTL-ready, locale-aware, or global-ready.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only hostile layout resilience from long translated text or RTL layout without translation, formatting, or locale-state risk; use `frontend-stress-layout-review` first and this skill only for localization semantics.
- The task is only accessibility names, labels, ARIA, keyboard, focus, or assistive-technology behavior; use `frontend-accessibility-tree-review` first and this skill only when translated names or visible-label consistency are involved.
- The task is only copy tone in one language with no locale, formatting, fallback, or translation-key surface.
- No user-visible text, locale-sensitive value, user-entered text, exported text, metadata, search, sort, SSR locale, or direction-sensitive behavior is affected.
- Verification would require an unconfigured pseudo-localization, screenshot, browser, or translation-management workflow. Report the missing localization evidence instead of inventing raw commands.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, changed UI or text surface, current diff or target files, framework and i18n library signals, supported locale policy, and configured command intents.
- String exposure ledger: visible text, placeholders, labels, `aria-label`, `title`, `alt`, document title, metadata, Open Graph, toasts, validation, errors, empty states, confirm prompts, chart labels, SVG text, canvas text, clipboard text, download file names, emails, push notifications, exports, PDFs, CSV headers, and calendar invites.
- Message-shape ledger: full sentence keys, interpolation values, grammatical context, plural categories, zero case, Korean particles or other inflection needs, tone or formality, reusable key risks, and HTML or component interpolation.
- Format ledger: dates, times, relative times, time zones, calendars, numbers, currency, percent, units, measurement systems, list formatting, input parsing, and display versus storage values.
- Text-processing ledger: case conversion, search, sort, collation, accent handling, Unicode normalization, grapheme segmentation, truncation, ellipsis policy, and file or user name handling.
- Direction and layout ledger: RTL, bidirectional user content, `dir="auto"`, logical CSS properties, direction-sensitive icons, font fallback, line height, long translated labels, pseudo localization, and locale-specific screenshot coverage.
- Runtime locale ledger: language versus region versus currency versus time zone versus unit settings, fallback behavior, missing-key handling, server-rendered locale, client hydration locale, and backend error-code mapping.
- Evidence level: static string inventory, catalog diff, pseudo-localization evidence, locale snapshot evidence, configured tests, SSR hydration evidence, or missing evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Existing local patterns for message catalogs, ICU syntax, locale routing, formatters, error-code mapping, pseudo localization, RTL support, and exported text have been searched before adding a new pattern.
- If localization changes affect layout, accessibility, payment, business rules, security, or API contracts, also apply the narrower matching skill for that boundary.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Move hardcoded user-visible strings into the project-approved message catalog or translation mechanism.
- Replace string concatenation and word-fragment assembly with full-sentence messages and named interpolation values.
- Add or correct plural, zero, context-specific, tone-specific, Korean particle, or inflection-safe messages when the project pattern supports them.
- Replace ad hoc date, time, number, currency, unit, list, sort, search, and segmentation logic with locale-aware helpers or existing project formatters.
- Add or refine RTL, `dir="auto"`, logical CSS property, pseudo-localization, locale screenshot, missing-key, backend error-code mapping, and export-text coverage where existing project patterns support them.
- Do not invent a translation-management system, rewrite all catalogs, install i18n packages, machine-translate production copy, or broaden product language policy beyond the changed surface.

<!-- mustflow-section: procedure -->
## Procedure

1. Build the string exposure ledger before editing.
   - Include JSX text, `placeholder`, `aria-label`, `title`, `alt`, document title, metadata, Open Graph, toasts, validation, empty states, dialogs, browser `confirm`, chart labels, SVG `<text>`, canvas text, clipboard text, file names, emails, push notifications, exports, PDFs, CSV headers, and calendar invites.
   - Treat "not on the screen" as still user-visible when the user can save, share, print, hear, search, preview, or receive it.
2. Check full-sentence translation units.
   - Reject `t('hello') + name + t('welcome')`, translated word fragments, and grammar assembled in code.
   - Use full messages with named interpolation values so translators can change word order and surrounding grammar.
3. Check context-specific wording.
   - Do not reuse a generic key when the same source word means different things, such as file open, business open, and public status.
   - Prefer keys that name the product context, user action, and destination surface rather than a short dictionary word.
4. Check destructive and action labels as complete phrases.
   - Do not build labels like `Delete {item}` from separate translated parts when languages need different order, case, or particles.
   - Use context-specific messages such as delete project, delete file, or delete account.
5. Check plural and zero cases.
   - Do not model plural as only `count === 1`.
   - Use ICU plural or the project's plural system for all supported locale categories.
   - Give zero-result states their own UX wording when "0 items" would be awkward or misleading.
6. Check language-specific grammar traps.
   - For Korean, review particles such as eun/neun, i/ga, eul/reul, and wa/gwa or avoid the particle with a safer sentence shape.
   - For other languages, check case, gender, noun class, politeness, or inflection needs when dynamic values are inserted into prose.
7. Check tone and formality inside one flow.
   - Compare adjacent labels, confirmations, validation messages, empty states, and recovery actions.
   - A flow that mixes formal and casual voice should be fixed or reported as product-language drift.
8. Check date, time, and relative-time formatting.
   - Reject manual assembly such as `year + '.' + month + '.' + day`.
   - Use locale-aware formatters and confirm whether the user's time zone, server time zone, and stored instant can shift deadlines, bookings, billing dates, or "yesterday" labels.
   - Treat `new Date()` in render paths, server-rendered relative time, and client hydration time as mismatch risks.
9. Check numbers, currency, percent, and units.
   - Do not rely on comma insertion, fixed decimal assumptions, or locale-agnostic `Number(input)` parsing.
   - Separate display format from canonical stored value.
   - Keep language, region, currency, time zone, and measurement unit as separate settings unless the product has an explicit rule tying them together.
10. Check collation, search, and normalization.
   - Do not trust default `sort()`, raw `localeCompare` without locale intent, or plain `toLowerCase()` for user-facing search and sort.
   - Use locale-aware collation where order matters.
   - Normalize Unicode when comparing user names, filenames, tags, search queries, accents, combining characters, or Hangul variants.
11. Check grapheme-safe length, truncation, and ellipsis.
   - Do not use `.length` and `slice(0, n)` when user-visible text may contain emoji, flags, skin tones, combining marks, or complex scripts.
   - Use grapheme-aware segmentation or existing utilities.
   - Choose ellipsis by content meaning: paths may need middle truncation, names may need enough disambiguating text, and amounts should not be truncated.
12. Check RTL and bidirectional text.
   - Replace physical `left` and `right` assumptions with logical `start`, `end`, `inline-start`, and `inline-end` where direction depends on language.
   - Use `dir="auto"` for user-generated names, comments, reviews, addresses, chat, and profile text when direction may differ from the UI locale.
   - Do not mirror all icons blindly. Back, next, drawer, and carousel direction may flip; play, download, clock, and brand icons usually should not.
13. Check translated layout resilience.
   - Long German, French, Vietnamese, Arabic, pseudo-localized, and compact CJK labels need real fixtures.
   - Fixed-width buttons, tabs, table headers, modal titles, `white-space: nowrap`, and fixed-height rows should be routed to `frontend-stress-layout-review` when geometry changes are needed.
14. Check font fallback.
   - CJK, Thai, Arabic, Hindi, and emoji may need safe fallback fonts, line-height tolerance, and real glyph coverage.
   - Watch icon fonts, fake bold, missing weights, and square tofu glyphs.
15. Check pseudo localization and locale snapshots.
   - Prefer pseudo localization for hardcoded strings, missing keys, broken interpolation, glyph support, and expansion stress before real translations arrive.
   - For high-trust flows, compare at least a long-language locale, an RTL locale, and a dense CJK or Japanese-style locale when the project has such coverage.
16. Check SSR and hydration locale agreement.
   - Server and client must receive compatible locale, time zone, messages, and formatter inputs.
   - Default-language server output followed by client language switching can cause flicker, hydration mismatch, SEO drift, and different date or number text on first render.
17. Check fallback and missing-key behavior.
   - In development, missing keys should be loud enough to catch.
   - In production, fallback should protect the user while logs, metrics, or diagnostics make the missing translation visible to maintainers.
   - Do not treat silent English fallback as a successful localization state.
18. Check HTML and rich text in translations.
   - Do not let translators edit raw HTML when component interpolation can preserve link, emphasis, and accessibility structure safely.
   - Links and emphasis inside a sentence must be movable by locale without exposing XSS, broken tags, or fixed English word order.
19. Check backend error message boundaries.
   - Do not show raw backend prose such as "Invalid password" directly in localized UI.
   - Prefer stable error codes mapped to localized frontend messages, with safe fallback for unknown codes.
20. Check export, share, and notification surfaces.
   - Confirm CSV headers, PDF receipts, downloaded file names, email subjects, email bodies, push notifications, share text, clipboard output, printed output, and calendar invites follow the same language and formatting policy as the screen.
21. Report evidence by surface.
   - Separate string-inventory evidence, catalog evidence, formatter evidence, pseudo-localization evidence, screenshot evidence, SSR evidence, and export or notification evidence.
   - If a claim is static-only, say which runtime locale, time zone, RTL, pseudo-localization, or export proof is missing.

<!-- mustflow-section: postconditions -->
## Postconditions

- User-visible strings across screen, metadata, notifications, exports, downloads, and assistive labels are either localized, intentionally excluded, or reported.
- Messages use full translation units, named interpolation, contextual keys, plural and zero handling, tone consistency, and grammar-safe dynamic values where relevant.
- Dates, times, numbers, currencies, units, search, sort, case conversion, Unicode normalization, grapheme length, truncation, RTL, bidi text, font fallback, SSR locale, fallback, backend errors, and rich text are fixed, ruled out, or reported where relevant.
- Localization readiness claims distinguish static catalog evidence from pseudo-localization, locale snapshot, SSR, runtime formatter, and export evidence.

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

Use the narrowest configured unit, component, i18n, screenshot, build, docs, release, or mustflow intent that covers the changed localization contract. Use pseudo-localization, browser screenshots, translation-management checks, SSR render checks, or export generation only when they are configured one-shot intents or explicitly approved by the user.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a string surface cannot be enumerated, report the missing exposure ledger before claiming localization coverage.
- If the project has no plural, formatter, collation, segmentation, pseudo-localization, or missing-key pattern, preserve existing behavior and report the missing project contract instead of inventing a broad framework.
- If language, region, currency, time zone, or unit settings are conflated, avoid patching one locale branch only; report the model issue or make the smallest local split required by the changed surface.
- If translation changes alter accessibility names, focus recovery, layout geometry, payment meaning, legal copy, or security-sensitive messaging, apply the matching skill before continuing that part.
- If a configured test or build fails after a localization change, preserve the failing intent and output tail, then use `failure-triage` before broadening the fix.
- If verification requires unconfigured browser, pseudo-localization, screenshot, SSR, export, or translation-management tooling, stop at that boundary and report the skipped check.

<!-- mustflow-section: output-format -->
## Output Format

- Frontend localization surface reviewed
- String exposure ledger
- Message-shape, plural, zero, grammar, tone, formatter, search, sort, normalization, segmentation, RTL, bidi, font, SSR, fallback, backend-error, rich-text, export, share, and notification checks where relevant
- Localization fixes or recommendations
- Evidence level: static inventory, catalog, configured test, pseudo-localization, screenshot, SSR, export, manual-only, missing, or not applicable
- Command intents run
- Skipped localization checks and reasons
- Remaining localization risk
