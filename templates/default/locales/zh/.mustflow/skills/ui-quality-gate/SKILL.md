---
mustflow_doc: skill.ui-quality-gate
locale: zh
canonical: false
revision: 1
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

Keep user-facing interfaces usable, minimal, responsive, and verifiable instead of drifting into decorative demos or brittle screenshots.

<!-- mustflow-section: use-when -->
## Use When

- A change touches dashboard, settings, navigation, forms, tables, lists, tabs, buttons, empty states, tooltips, status messages, or user-facing copy.
- A task asks for UI polish, layout, responsive behavior, accessibility, visual states, language switching, labels, or interaction feedback.
- A report claims that UI text fits, controls are understandable, language updates apply, or a page renders correctly.
- A change could add explanatory, marketing-like, decorative, duplicate, invented, or non-actionable UI content.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task changes only backend logic, CLI output, metadata, or documentation with no user-facing UI surface.
- The task is only image asset conversion; use `web-asset-optimization` for that part.
- The UI change cannot be rendered or inspected in the current environment; report the inspection gap instead of claiming visual verification.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The changed UI surface, user task, and expected interaction path.
- Existing design patterns, labels, states, accessibility conventions, and localization rules in the same area.
- Viewports, themes, languages, and state combinations that need inspection.
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
- Do not claim a UI is visually verified without an actual render, screenshot, DOM inspection, or clear reason that visual verification was unavailable.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify the real user task and the UI surface that supports it.
2. Check nearby UI patterns before adding new layout, component, color, copy, or state conventions.
3. Remove or avoid non-essential welcome text, feature summaries, decorative cards, fake metrics, marketing copy, and invented controls.
4. Verify controls are understandable: icon buttons need accessible names or tooltips, destructive or state-changing actions need clear labels, and disabled states need a visible reason when useful.
5. Check layout constraints: text should not overflow, overlap, resize fixed-format controls unexpectedly, or depend on viewport-width font scaling.
6. Check state coverage: loading, empty, error, saved, changed, disabled, selected, focused, and language-switched states should update consistently where applicable.
7. Inspect responsive and localization-sensitive surfaces when the change affects layout or translated text.
8. Run the narrowest configured verification that covers the changed UI, documentation, package, or mustflow contract.

<!-- mustflow-section: postconditions -->
## Postconditions

- The UI supports the user's task without unnecessary explanatory or decorative surface.
- Important controls, labels, states, layout constraints, and localization updates are checked or reported as unverified.
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
- If a requested UI element conflicts with repository UI minimalism rules, implement the smallest task-focused control and report the omitted decorative content.
- If verification requires an interactive server or browser command not declared by the command contract, stop at that boundary and report the skipped check.

<!-- mustflow-section: output-format -->
## Output Format

- UI surface reviewed
- User task and states checked
- Layout, accessibility, and localization checks
- Decorative or unnecessary UI avoided or removed
- Command intents run
- Skipped visual checks and reasons
- Remaining UI risk
