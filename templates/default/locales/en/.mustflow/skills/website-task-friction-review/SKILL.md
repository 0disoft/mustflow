---
mustflow_doc: skill.website-task-friction-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: website-task-friction-review
description: Apply this skill when a public website, landing page, marketing page, ecommerce flow, signup flow, checkout flow, account page, support surface, navigation, search, form, mobile web surface, cookie or consent surface, pricing page, or conversion path is planned, edited, reviewed, or reported and common user complaints such as slowness, popups, forced signup, confusing navigation, broken mobile layout, unclear errors, hidden costs, dark patterns, weak trust, or missing recovery paths must be prevented.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.website-task-friction-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Website Task Friction Review

<!-- mustflow-section: purpose -->
## Purpose

Prevent website changes from blocking the user's intended task. Review the site by whether a real visitor can find, understand, decide, enter information, recover from errors, trust the service, and complete the action without surprise or coercion.

<!-- mustflow-section: use-when -->
## Use When

- A change touches a public website, landing page, ecommerce page, product page, pricing page, signup flow, checkout flow, account flow, support page, help center, contact path, search path, cookie or consent surface, promotional overlay, or mobile web experience.
- A task asks for website UX review, conversion review, landing-page polish, navigation improvement, form or checkout improvement, mobile usability, trust signals, dark-pattern removal, or complaint prevention.
- A report claims a website is usable, fast, clear, trustworthy, accessible, mobile-ready, conversion-ready, or ready to ship.
- A UI change could add friction through overlays, forced account creation, hidden fees, vague copy, long forms, weak error recovery, hard-to-find support, inaccessible controls, or slow first interaction.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task changes only backend internals, CLI output, data processing, or documentation with no public website or user task path.
- The task is only visual component geometry, hostile content, responsive container behavior, or layout stress; use `frontend-stress-layout-review` for that focused layer.
- The task is only accessibility-tree semantics, keyboard behavior, focus, ARIA, labels, or assistive-technology evidence; use `frontend-accessibility-tree-review` for that focused layer.
- The task is only first-render performance, Core Web Vitals field instrumentation, image delivery, bundle size, or frame rendering; use the narrower performance skill for that focused layer.
- The task is an internal dashboard or app UI with no public website, acquisition, support, signup, checkout, or visitor conversion path; use `ui-quality-gate`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The primary visitor task, target audience, entry point, and expected completion point.
- The changed route, page, component, copy, form, navigation, search, checkout, support, consent, or conversion surface.
- Existing product constraints, legal requirements, pricing, account requirements, support policy, privacy boundary, and trust or compliance claims relevant to the flow.
- The likely devices and input modes, especially small-screen touch use, keyboard use, slow networks, logged-out users, new users, returning users, and users with incomplete information.
- Current evidence from code, tests, screenshots, analytics, complaints, support tickets, field metrics, or product requirements when available.
- Relevant command-intent contract entries for status, diff, docs, build, test, release, visual, browser, accessibility, or mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- The primary user task can be named. If it cannot, stop and ask for or infer the smallest plausible task from repository evidence, then report the uncertainty.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Change website copy, navigation labels, page order, form fields, validation, error states, mobile layout, support links, trust disclosures, pricing visibility, consent behavior, and recovery paths when they directly reduce task friction.
- Remove or defer overlays, decorative content, forced account gates, vague marketing blocks, nonessential form fields, misleading urgency, and interruptions that do not help the current task.
- Add focused tests, fixtures, docs, or template updates that preserve the website task contract.
- Do not invent pricing, policy, compliance, delivery, guarantee, refund, legal, or support claims.
- Do not add dark patterns, hidden costs, coerced consent, preselected paid add-ons, fake urgency, nagging opt-ins, or visually weakened rejection controls.
- Do not claim visual, mobile, accessibility, performance, or interactive verification without actual evidence or a named verification gap.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the primary visitor task in plain language. Use the user's words, not the company's internal taxonomy.
2. Walk the task from entry to completion: arrive, orient, find, compare, decide, enter information, submit or pay, recover from failure, and get help.
3. Identify the first blocking point. Treat a delay, forced decision, hidden requirement, unclear label, missing price, broken mobile control, or vague error as a product defect, not a cosmetic nit.
4. Check interruption pressure. Avoid first-task-blocking newsletter modals, app-install prompts, surveys, promotional overlays, cookie banners beyond legal need, chat widgets covering controls, and upsells that block completion.
5. Check account pressure. Do not force account creation before checkout, booking, inquiry, download, trial, or support unless the product cannot function without an account. Offer guest, passkey, magic-link, or deferred-account paths when the business rules allow them.
6. Check cost and commitment clarity. Show total price, taxes, shipping, fees, renewal terms, cancellation terms, delivery estimates, refund rules, and required commitments before the user reaches the final commit action.
7. Check navigation and search. Labels should match user vocabulary, sibling categories should be distinguishable, search should be discoverable on content-heavy sites, and no-results states should offer spelling help, related links, popular paths, or a way back to browsing.
8. Check mobile task completion. Core tasks must work on small screens without zooming, hover, tiny targets, horizontal scrolling, covered bottom actions, keyboard-covered inputs, or sticky elements hiding validation messages.
9. Check form load. Every field must earn its place for the current task. Use labels, input types, autocomplete, examples, sane defaults, grouped fields, inline recovery, preserved entered data, and field-level errors.
10. Check error language. Replace developer-centered messages with what happened, which field or action needs attention, how to fix it, and whether the user's entered data or payment state is safe.
11. Check trust and proof. Make operator identity, contact, support, security, privacy, returns, cancellation, unsubscribe, delete-account, and policy paths findable where users expect them. Do not bury trust-critical information behind marketing copy.
12. Check content for scanning. Put the next decision near the top, use concrete headings, remove vague claims, shorten paragraphs, and expose requirements, limits, risk, price, and next steps before asking for commitment.
13. Check accessibility as task completion. Keyboard-only users, screen-reader users, zoomed users, users with reduced motion, and users who cannot rely on color should complete the same task with visible focus, labels, error associations, contrast, target size, and no focus traps.
14. Check performance from the user's patience budget. Prefer evidence for Core Web Vitals, responsive first interaction, stable layout, reserved media dimensions, bounded third-party scripts, and no render-blocking decorative assets.
15. Check recovery and support. Users should have a next useful action after search failure, validation failure, payment failure, permission denial, empty state, unavailable inventory, timeout, expired session, or partial submission.
16. Check coercion and dark patterns. Remove hidden opt-outs, fake urgency, confirmshaming, cancellation mazes, prechecked add-ons, subscription traps, unclear consent, and asymmetric accept or reject controls.
17. If the issue belongs to a narrower skill, route the focused fix there after naming the website-level friction. Examples: Core Web Vitals, image delivery, bundle pruning, accessibility tree, layout stress, localization, payment integrity, or support-surface selection.
18. For implemented fixes, preserve existing style, component, data, policy, and localization patterns. Do not add a one-off UX framework or dependency for a flow-level problem.
19. Use the narrowest configured verification that covers the changed website, docs, package, template, or mustflow contract.

<!-- mustflow-section: postconditions -->
## Postconditions

- The primary visitor task is named and can be followed without unnecessary interruption.
- Navigation, search, mobile use, forms, errors, accessibility, performance, trust, cost clarity, account pressure, support, and recovery paths are checked or explicitly reported as unverified.
- Any dark pattern, hidden commitment, invented claim, or support-policy uncertainty is removed, deferred, or reported.
- Focused follow-up skills are named when a narrower performance, accessibility, layout, payment, support, localization, or security review is still needed.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a narrower configured build, browser, screenshot, accessibility, performance, or related-test intent when it better proves the changed website task path.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the primary task is unclear, stop broad polishing and identify the task before editing.
- If business, legal, pricing, support, or compliance facts are missing, do not invent them; add placeholders only when the repository already uses placeholder policy text and report the unresolved authority.
- If visual or interactive inspection is unavailable, report the unverified viewport, device, state, and interaction instead of claiming the website is ready.
- If a stakeholder asks for a friction pattern, such as forced signup or an interrupting popup, implement the least coercive version allowed by direct instructions and report the conversion, trust, support, and regulatory risk.
- If a fix conflicts with a narrower skill's rule, follow the stricter task-safety or public-contract rule and report the conflict.

<!-- mustflow-section: output-format -->
## Output Format

- Website task reviewed
- Entry point and completion point
- Friction findings by severity
- User complaint in the user's likely words
- Cause, fix, and acceptance test
- Navigation, search, mobile, form, error, accessibility, performance, trust, pricing, consent, support, and recovery checks
- Narrower skills used or recommended
- Command intents run
- Skipped visual or interactive checks and reasons
- Remaining website task risk
