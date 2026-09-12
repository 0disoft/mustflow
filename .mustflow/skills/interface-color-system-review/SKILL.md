---
mustflow_doc: skill.interface-color-system-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: interface-color-system-review
description: Design or review semantic color tokens, palette roles, rendered contrast pairs, themes, and color-dependent interface states.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.interface-color-system-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - docs_validate_fast
    - mustflow_check
---

# Interface Color System Review

<!-- mustflow-section: purpose -->
## Purpose

Design or review semantic color tokens, palette roles, rendered contrast pairs, themes, and color-dependent interface states.

<!-- mustflow-section: use-when -->
## Use When

A palette, semantic color mapping, light or dark theme, contrast pair, or status-color relationship is being created or corrected.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

The task concerns only chart choice, animation timing, or generic UI layout. Accessibility-tree and keyboard behavior remain with their existing procedure.

<!-- mustflow-section: required-inputs -->
## Required Inputs

Token source and consumers; brand constraints; actual foreground/background pairs and states; transparency or imagery; supported color formats, themes, and accessibility target. Read DESIGN.md when it exists and applies; do not create it merely for this procedure.

<!-- mustflow-section: preconditions -->
## Preconditions

The selected repository instructions and command contract define authority. Establish whether the user requested review, design, or implementation. Use available evidence and label material missing inputs rather than inventing them.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

Change relevant palette roles, token aliases, state styles, and their examples. Preserve the established token hierarchy and representation unless a migration is explicitly in scope.

<!-- mustflow-section: procedure -->
## Procedure

1. Trace from visible role to token owner and value: canvas, raised surface, text, border, focus, action, and status. Reuse a role with the same meaning rather than borrowing a token merely because its present value matches.
2. Separate primitive values, semantic roles, and component overrides where the existing system benefits. Do not force extra tiers onto a small system. Add only palette steps with actual consumers or a specified design need.
3. Review palettes perceptually and in their rendered roles. Hue movement, lightness spacing, and saturation depend on brand, gamut, and role; a fixed hue distance or perfectly constant hue is not a universal semantic rule. Verify supported color spaces and conversion tools before changing formats.
4. Measure the foreground against the actual background for each relevant theme and state. Include alpha compositing, overlays, gradients, imagery, and disabled-state exceptions where applicable. Record values, method, threshold source, and target standard; do not invent ratios or infer them from token names.
5. Treat sampled screenshot pixels as evidence about that capture, not recovered source colors or proof of application contrast conformance. Compression, anti-aliasing, scaling, color management, and unknown backgrounds can affect the result. Distinguish a computed source pair from a screenshot estimate.
6. Keep status and affordance meaning consistent and provide text, shape, icon, or another appropriate non-color cue. Assign primary emphasis by the actual task hierarchy; neither exactly one filled control nor a ban on neutral interactive controls applies to every screen.
7. Check hover, focus, pressed, selected, invalid, loading, and disabled states that exist. Inspect forced colors or high-contrast settings when relevant; do not suppress platform adjustments merely to preserve branding.
8. For a requested fix, change the smallest owning role and remeasure dependent pairs. For review-only work, report the pair and consequence without mutating it. Verify light and dark modes independently instead of assuming numeric inversion produces a usable theme.

<!-- mustflow-section: postconditions -->
## Postconditions

Color roles and affected consumers are identified; contrast claims name the pair, method, target, and evidence limits; state meaning survives without hue alone.

<!-- mustflow-section: verification -->
## Verification

Resolve verification against the repository being changed. Use its configured `test_related`, `docs_validate_fast`, or `mustflow_check` only when they cover the changed contract; use the narrowest configured rendering, interaction, or accessibility check for the selected UI. Do not start servers, browser sessions, or watchers from this skill. Separate source inspection, automated checks, and observed rendering evidence.

<!-- mustflow-section: failure-handling -->
## Failure Handling

If measurement is unavailable, report unmeasured pairs rather than estimating a passing ratio. If a token fix harms other consumers, narrow the role or compare alternatives within the authorized scope.

<!-- mustflow-section: output-format -->
## Output Format

Role and token changes; measured pairs and theme/state coverage; semantic conflicts; remaining measurement or platform gaps. Report command intents run or skipped and why. Keep the report proportional to the requested task.
