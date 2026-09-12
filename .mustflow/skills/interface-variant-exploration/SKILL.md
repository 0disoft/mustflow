---
mustflow_doc: skill.interface-variant-exploration
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: interface-variant-exploration
description: Create and compare meaningfully different UI design alternatives for a selected component or flow while preserving shared tasks, content, and accessibility requirements.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.interface-variant-exploration
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - docs_validate_fast
    - mustflow_check
---

# Interface Variant Exploration

<!-- mustflow-section: purpose -->
## Purpose

Create and compare meaningfully different UI design alternatives for a selected component or flow while preserving shared tasks, content, and accessibility requirements.

<!-- mustflow-section: use-when -->
## Use When

The user requests interface variants, design directions, comparative prototypes, or exploration before selecting an implementation.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

The user already selected a design and asks for implementation, or requests a straightforward fix with no alternatives. Do not add a variant picker to ordinary product work.

<!-- mustflow-section: required-inputs -->
## Required Inputs

Selected component or flow and decision to resolve; user task; shared data and states; existing tokens and platform; allowed preview location and runtime; who selects or has delegated selection. Read DESIGN.md when it exists and applies; do not create it merely for this procedure.

<!-- mustflow-section: preconditions -->
## Preconditions

The selected repository instructions and command contract define authority. Establish whether the user requested review, design, or implementation. Use available evidence and label material missing inputs rather than inventing them.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

Create bounded alternatives and a comparison artifact within the authorized workspace. Integrate the selected alternative when requested or already delegated. Do not install packages, publish a preview, or alter live behavior solely to show options.

<!-- mustflow-section: procedure -->
## Procedure

1. State the decision the comparison should resolve. Pick a small useful set of alternatives proportional to the brief; two can be enough. Scope a broad flow to a coherent decision without silently discarding the user's requested coverage.
2. Name a primary axis such as information order, density, navigation, emphasis, or interaction model. Keep unrelated dimensions stable where possible so differences are interpretable. Color-only alternatives are appropriate when color is the question, not when comparing interaction models.
3. Share the same task, realistic fixture content, permissions, and applicable loading, empty, error, and success states. Mark synthetic data. Do not connect experimental actions to production writes or present placeholders as operational features.
4. Reuse the actual component primitives and tokens where possible. Preview in an existing story or task-scoped surface with representative parent chrome and constraints. Preserve contextual realism without injecting an unrequested picker, query override, or experiment flag into shipped routes.
5. Define the common acceptance floor: understandable controls, accessible names, keyboard and touch access, readable contrast, content recovery, and reduced-motion behavior when relevant. Eliminate a variant that relies on breaking a required behavior rather than trading accessibility for appearance.
6. Use configured rendering or browser paths when available. Compare full-size alternatives at the same container and content; inspect important interactions rather than judging thumbnails alone. A static design is valid if that is the requested deliverable, but label unimplemented interactions.
7. Present the tradeoff that each alternative makes, evidence checked, and remaining uncertainty. Recommend a direction with reasons when useful. If selection was delegated, choose within that delegation; otherwise leave the alternatives reviewable without claiming a user decision.
8. After selection or prior authorization, integrate only the chosen behavior and verify its owning surface. Remove task-created preview scaffolding when it is no longer requested; preserve user-owned artifacts and explicitly retained alternatives. Finish with no untracked experiment behavior in the production path.

<!-- mustflow-section: postconditions -->
## Postconditions

Alternatives answer the same decision with comparable evidence; selection authority and integration status are explicit; temporary surfaces and synthetic behavior have a defined lifecycle.

<!-- mustflow-section: verification -->
## Verification

Resolve verification against the repository being changed. Use its configured `test_related`, `docs_validate_fast`, or `mustflow_check` only when they cover the changed contract; use the narrowest configured rendering, interaction, or accessibility check for the selected UI. Do not start servers, browser sessions, or watchers from this skill. Separate source inspection, automated checks, and observed rendering evidence.

<!-- mustflow-section: failure-handling -->
## Failure Handling

If the preview runtime is unavailable, produce the authorized static comparison or source artifact and name missing runtime proof. If no alternative clears the behavior floor, revise or report the conflict rather than declare a winner.

<!-- mustflow-section: output-format -->
## Output Format

Comparison axis and alternatives; shared constraints; per-option benefit and cost; evidence and recommendation; selection/integration status and preview cleanup. Report command intents run or skipped and why. Keep the report proportional to the requested task.
