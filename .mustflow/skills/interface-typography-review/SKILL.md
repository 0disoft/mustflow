---
mustflow_doc: skill.interface-typography-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: interface-typography-review
description: Review interface typography, type scales, font fallback, text wrapping, truncation, and multilingual text rendering in a selected screen or component.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.interface-typography-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - docs_validate_fast
    - mustflow_check
---

# Interface Typography Review

<!-- mustflow-section: purpose -->
## Purpose

Review interface typography, type scales, font fallback, text wrapping, truncation, and multilingual text rendering in a selected screen or component.

<!-- mustflow-section: use-when -->
## Use When

Text hierarchy, font loading or fallback, numeric alignment, wrapping, clipping, or readable density is being designed or corrected.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

The task changes only wording, semantic heading structure, or general container layout. Use the corresponding copy, accessibility, or stress-layout procedure instead.

<!-- mustflow-section: required-inputs -->
## Required Inputs

Target text roles and real content; current type tokens, font assets and usage rights, supported languages, fallback stack, container sizes, and available rendering evidence. Read DESIGN.md when it exists and applies; do not create it merely for this procedure.

<!-- mustflow-section: preconditions -->
## Preconditions

The selected repository instructions and command contract define authority. Establish whether the user requested review, design, or implementation. Use available evidence and label material missing inputs rather than inventing them.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

Change the owning type token, font declaration, or text component and directly affected examples. Preserve brand and language choices; a typography review does not authorize downloading fonts, changing dependencies, or redesigning the page.

<!-- mustflow-section: procedure -->
## Procedure

1. Map text roles before choosing values: headings, reading text, labels, supporting text, code, and tabular values. Reuse the current scale and distinguish semantic heading order from visual emphasis; neither a heading tag nor a font size alone establishes both.
2. Inspect the actual font files and fallback coverage for the required scripts, weights, and styles. Prefer the platform's semantic font properties when supported. Confirm variable axes exist before setting them; disabling synthetic styles must not silently erase meaningful emphasis in fallbacks.
3. Choose size, measure, line height, and tracking for the role, script, density, and input distance. Test wrapped content and user text overrides. Fixed Latin character counts, minimum weights, and negative tracking are not universal rules for CJK, Arabic, or every font.
4. Test real labels, long IDs, URLs, mixed-direction names, translated text, and changing numeric values at the component's narrow container. Preserve meaningful reading and copy order. Use numeric alignment features only when the selected font supports them and the task benefits.
5. Set wrapping and truncation intentionally. Keep distinguishing identifiers and critical actions recoverable through an accessible expansion, detail view, or another appropriate path. A hover-only tooltip does not restore access for every input method.
6. Observe initial font loading and fallback substitution where available. Check clipped diacritics, baseline shifts, missing glyphs, emphasis loss, and layout movement. Do not claim a font-loading improvement from the final screenshot alone.
7. Compare before and after with the same content and scale. Inspect affected themes, language samples, narrow layouts, text resizing, and selection. Keep text readable without disabling zoom or applying transform tricks solely to bypass platform input behavior.

<!-- mustflow-section: postconditions -->
## Postconditions

The changed text roles, token ownership, font and fallback assumptions, content recovery, and checked rendering conditions are explicit.

<!-- mustflow-section: verification -->
## Verification

Resolve verification against the repository being changed. Use its configured `test_related`, `docs_validate_fast`, or `mustflow_check` only when they cover the changed contract; use the narrowest configured rendering, interaction, or accessibility check for the selected UI. Do not start servers, browser sessions, or watchers from this skill. Separate source inspection, automated checks, and observed rendering evidence.

<!-- mustflow-section: failure-handling -->
## Failure Handling

If font rights, script coverage, or runtime rendering are unknown, preserve the existing asset and label the assumption. Fix the owning token or text constraint before adding per-string offsets.

<!-- mustflow-section: output-format -->
## Output Format

Text roles and changes; measured or observed rendering evidence; font and language assumptions; remaining clipping, loading, or interaction checks. Report command intents run or skipped and why. Keep the report proportional to the requested task.
