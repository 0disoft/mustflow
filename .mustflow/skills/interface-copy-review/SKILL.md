---
mustflow_doc: skill.interface-copy-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: interface-copy-review
description: Write or review product microcopy for controls, forms, empty states, errors, confirmations, settings, and recovery actions.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.interface-copy-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - docs_validate_fast
    - mustflow_check
---

# Interface Copy Review

<!-- mustflow-section: purpose -->
## Purpose

Write or review product microcopy for controls, forms, empty states, errors, confirmations, settings, and recovery actions.

<!-- mustflow-section: use-when -->
## Use When

User-facing labels or state messages need clearer actions, consistent terminology, truthful status, or localization-safe phrasing.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

The task is marketing copy, long-form documentation, typography, or an API error contract without interface wording. Use the owning procedure for those tasks.

<!-- mustflow-section: required-inputs -->
## Required Inputs

User task and current UI state; actual action and recovery behavior; nearby terminology and product voice; message catalog, variables, plural rules, and input constraints. Read DESIGN.md when it exists and applies; do not create it merely for this procedure.

<!-- mustflow-section: preconditions -->
## Preconditions

The selected repository instructions and command contract define authority. Establish whether the user requested review, design, or implementation. Use available evidence and label material missing inputs rather than inventing them.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

Edit the selected UI strings and their owning localization entries. Change behavior only when requested; do not invent a recovery action, permission, promise, or success state to make copy sound better.

<!-- mustflow-section: procedure -->
## Procedure

1. Map each string to the decision or action it supports. Read the actual handler, state, and adjacent messages before rewriting. Distinguish initial loading, background refresh, first-use empty, filtered empty, partial failure, permission denial, and completion where those states exist.
2. Use the product's vocabulary consistently across navigation, labels, confirmation, progress, and completion. Prefer explicit action labels when they remove ambiguity, but preserve established platform language and natural grammar in the user's locale.
3. Name the action and consequence in confirmations. Distinguish reversible archive or trash from permanent deletion, local changes from published changes, and a queued request from a completed operation. Do not hide material cost or data loss behind euphemisms.
4. Write errors around what the user can do next. Preserve entered data where behavior permits; place useful guidance near its cause. Do not expose secrets or internal traces, blame the user for service failure, or offer retries that the real operation cannot safely support.
5. Give empty states a next step only when that action exists and is available. Avoid fabricated sample metrics or onboarding promises. Explain a disabled control when the reason helps the user act, without implying that a UI label enforces authorization.
6. Keep durable field labels separate from examples and placeholders. Settings should make the resulting state understandable; avoid double negatives. Link labels should identify the destination or purpose in context rather than rely on generic wording.
7. Preserve variable names, plural branches, interpolation escaping, units, and message IDs. Do not concatenate fragments that assume English word order or silently overwrite unreviewed translations. A source-language edit may require a translation status update, not invented translations.
8. Review the complete interaction with realistic strings and assistive names where available. Check that visible wording and accessible names agree, and that shortened text retains necessary meaning. Report copy-only verification separately from behavior and accessibility proof.

<!-- mustflow-section: postconditions -->
## Postconditions

Strings correspond to real states and actions; terminology, consequences, recovery, localization variables, and visible/accessible labels remain consistent.

<!-- mustflow-section: verification -->
## Verification

Resolve verification against the repository being changed. Use its configured `test_related`, `docs_validate_fast`, or `mustflow_check` only when they cover the changed contract; use the narrowest configured rendering, interaction, or accessibility check for the selected UI. Do not start servers, browser sessions, or watchers from this skill. Separate source inspection, automated checks, and observed rendering evidence.

<!-- mustflow-section: failure-handling -->
## Failure Handling

When the actual outcome or recovery action is unclear, inspect the owner or report the missing contract. Do not solve a missing feature by promising it in a message.

<!-- mustflow-section: output-format -->
## Output Format

Affected strings and rationale; state/action correspondence; localization and accessible-name coverage; unresolved behavior or translation gaps. Report command intents run or skipped and why. Keep the report proportional to the requested task.
