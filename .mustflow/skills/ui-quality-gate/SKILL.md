---
mustflow_doc: skill.ui-quality-gate
locale: en
canonical: true
revision: 6
lifecycle: mustflow-owned
authority: procedure
name: ui-quality-gate
description: Apply this skill when user-facing UI, dashboard, settings, navigation, form, copy, responsive layout, accessibility, or visual state changes are planned, edited, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.ui-quality-gate
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# UI Quality Gate

<!-- mustflow-section: purpose -->
## Purpose

Keep user-facing interfaces usable, minimal, accessible, responsive, localization-safe, and verifiable instead of drifting into decorative demos or brittle screenshots.

<!-- mustflow-section: use-when -->
## Use When

- A change touches dashboard, settings, navigation, forms, tables, lists, tabs, buttons, empty states, tooltips, status messages, or user-facing copy.
- A task asks for UI polish, layout, responsive behavior, accessibility, visual states, language switching, labels, or interaction feedback.
- A report claims that UI text fits, controls are understandable, language updates apply, or a page renders correctly.
- A change could add explanatory, marketing-like, decorative, duplicate, invented, or non-actionable UI content.
- AI-generated or vibe-coded UI needs review for predictable conventions, visual hierarchy, mobile usability, touch targets, component boundaries, and interaction feedback.
- A repeated AI-editing loop may have introduced style drift, duplicated state, missing edge cases, undeclared UI dependencies, or oversized components.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task changes only backend logic, CLI output, metadata, or documentation with no user-facing UI surface.
- The task is specifically about conversational AI, chat, copilot, prompt, multimodal input, streaming generation, citations, feedback, or conversation history; use `llm-service-ux-review`.
- The task is only image asset conversion; use `web-asset-optimization` for that part.
- The UI change cannot be rendered or inspected in the current environment; report the inspection gap instead of claiming visual verification.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The changed UI surface, user task, and expected interaction path.
- Existing design patterns, task-essential controls, labels, states, accessibility conventions, and localization rules in the same area.
- Viewports, themes, languages, and state combinations that need inspection.
- The target devices and interaction style, including mobile-first behavior, pointer or touch input, expected keyboard use, and any project breakpoint or design-token conventions.
- Existing design-token, component, data, state, dependency, and accessibility contracts that the changed UI must preserve.
- Any high-risk widget involved, such as toast notifications, tree views, editable grids, drag-and-drop, custom selects, comboboxes, dialogs, or virtualized lists.
- Performance, asset-size, animation, or network constraints that affect the changed surface.
- Relevant command-intent contract entries for status, diff, docs, build, release, or mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add, remove, or refine UI controls, labels, states, layout constraints, localization hooks, and accessibility attributes when they support the user's real task.
- Remove decorative, explanatory, invented, or marketing-like UI content that does not help the user act on real data.
- Prefer existing component patterns and stable dimensions over new visual systems.
- Add subtle interaction feedback only when it clarifies state, confirms action, or improves perceived responsiveness without harming reduced-motion users.
- Add a small intermediate UI contract for complex surfaces before implementation: view tree, data inputs, user actions, state transitions, visual tokens, and verification targets.
- Do not claim a UI is visually verified without an actual render, screenshot, DOM inspection, or clear reason that visual verification was unavailable.
- Do not add undeclared packages, invented component APIs, ad hoc style scales, or framework-specific patterns that conflict with the current project.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify the real user task and the UI surface that supports it.
2. Check nearby UI patterns before adding new layout, component, color, copy, or state conventions.
3. Keep task-essential controls only. Remove or avoid non-essential welcome text, feature summaries, decorative cards, fake metrics, marketing copy, invented filters, and controls that do not operate on real data.
4. Check predictability and visual hierarchy. Follow familiar platform or product conventions, make the next likely action visible, and use spacing, size, weight, grouping, and order to make the primary task easier to scan.
5. Check responsive and touch ergonomics. Prefer mobile-first layout decisions, preserve readable spacing at small widths, keep touch targets and gaps usable, and follow existing breakpoint or design-token conventions instead of inventing one-off sizes.
6. Verify controls are understandable and state-aware: icon buttons need accessible names or tooltips, destructive or state-changing actions need clear labels, hover, active, selected, loading, and disabled states need clear visual treatment, and disabled states need a visible reason when useful.
7. Check keyboard and focus behavior before visual polish: native elements first, semantic landmarks when they clarify page structure, tab order, focus order and return, visible focus state, names for icon-only controls, form error linkage, live status announcements, reduced-motion handling, and sufficient contrast.
8. Check accessible names and states against the actual interaction model, not only the rendered text. Dynamic controls must expose the current expanded, selected, checked, invalid, busy, or disabled state when applicable.
9. Check form validation, error, and empty-state behavior. Validate close to the field when useful, place errors next to the action or input that needs attention, preserve user input after failure, and keep empty states short and action-oriented rather than explaining the product.
10. Check interaction feedback. Loading, skeleton, saving, success, failure, toast, inline message, or micro-interaction feedback should map to real state and should not distract from the task or hide a slow operation.
11. Check localization-safe labels: language switching, fallback text, placeholders, plural or formatted values, long translated labels, bidirectional text, logical spacing, and date, time, number, currency, or unit display where applicable.
12. Check responsive layout without text overlap: text should not overflow, clip, overlap, resize fixed-format controls unexpectedly, or depend on viewport-width font scaling.
13. Check style drift. Repeated AI edits should not create one-off spacing, color, radius, typography, shadow, or inline-style variants when an existing token, utility, or component variant already covers the need.
14. Check state architecture. Async UI should cover the relevant idle, loading, success, empty, error, retrying, and stale-data states without duplicating state variables or leaving race-prone updates after unmount.
15. Check component boundaries. Reusable UI pieces should be small enough to maintain consistent states and accessibility, but not split into wrappers that obscure the user task or duplicate design rules.
16. Check dependency and API reality. Imported UI packages, generated helpers, component props, browser APIs, and event contracts must exist in the project or be handled through the dependency workflow before code relies on them.
17. Check high-risk widgets. Toasts need pauseable timing and appropriate status announcements; tree views need composite keyboard behavior; editable grids need navigation and editing modes; custom selects, dialogs, and comboboxes need proven accessibility patterns or an existing library.
18. Check performance and asset-size awareness when the change adds images, icons, animation, third-party UI code, large client data, or extra network work. Prefer existing assets, lazy loading when appropriate, explicit image dimensions, and bounded rendering cost.
19. Check state coverage: loading, empty, error, saved, changed, disabled, selected, focused, hover, active, validating, and language-switched states should update consistently where applicable.
20. For complex surfaces, write or confirm a compact UI contract before broad implementation: view tree, data contract, interaction model, state model, design-token contract, and verification targets.
21. Inspect responsive and localization-sensitive surfaces when the change affects layout or translated text.
22. Use visual verification only when a configured one-shot command or approved browser workflow exists for the surface. Do not start development servers, watchers, or browser sessions directly from the skill.
23. Run the narrowest configured verification that covers the changed UI, documentation, package, or mustflow contract.

<!-- mustflow-section: postconditions -->
## Postconditions

- The UI supports the user's task without unnecessary explanatory or decorative surface.
- Important controls, labels, states, visual hierarchy, touch ergonomics, keyboard and focus paths, layout constraints, localization updates, and performance-sensitive assets are checked or reported as unverified.
- AI-generated changes preserve existing style tokens, component boundaries, state contracts, dependency reality, and high-risk widget accessibility expectations.
- Final reports distinguish code-level verification from visual or interactive verification.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a narrower configured test, build, browser, screenshot, or accessibility intent when it better proves the changed UI surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If visual inspection is unavailable, report the unverified viewport, state, or interaction instead of assuming it works.
- If UI text overlaps, clips, or fails to update after a state or language change, fix the smallest owning component before adding broader layout changes.
- If controls lack accessible names and states, fix the control contract before polishing color, spacing, or animation.
- If a change adds large media, animation, or third-party UI code, verify the performance and asset-size impact or report the gap.
- If a requested UI element conflicts with repository UI minimalism rules, implement the smallest task-focused control and report the omitted decorative content.
- If verification requires an interactive server or browser command not declared by the command contract, stop at that boundary and report the skipped check.

<!-- mustflow-section: output-format -->
## Output Format

- UI surface reviewed
- User task and states checked
- Task-essential controls kept or removed
- Visual hierarchy, responsive layout, touch ergonomics, keyboard and focus, accessibility, localization, performance, and asset-size checks
- Interaction feedback, style drift, state architecture, dependency, high-risk widget, and component-boundary checks
- Decorative or unnecessary UI avoided or removed
- Command intents run
- Skipped visual checks and reasons
- Remaining UI risk
