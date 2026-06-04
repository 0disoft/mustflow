---
mustflow_doc: skill.restricted-handoff-resume
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: restricted-handoff-resume
description: Apply this skill when a task is paused, resumed, handed off, context-compacted, blocked, or reported as incomplete and the next agent or user needs a bounded restart point.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.restricted-handoff-resume
  command_intents:
    - changes_status
    - changes_diff_summary
    - mustflow_check
---

# Restricted Handoff Resume

<!-- mustflow-section: purpose -->
## Purpose

Create bounded handoff or resume evidence without storing hidden reasoning, secrets, raw transcripts, full terminal logs, or authority-changing summaries in project files.

<!-- mustflow-section: use-when -->
## Use When

- A task is incomplete, blocked, paused, interrupted, context-compacted, resumed, or explicitly handed to another agent or future session.
- A final report needs to preserve a restart point, changed files, verification receipts, skipped checks, blockers, or next safe action.
- A user asks to continue later, resume previous work, summarize work for another agent, or explain what remains.
- Repository handoff policy is disabled or report-only and the agent must avoid creating worklogs, plans, tasks, or raw state files.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is complete and the final report only needs normal completion evidence; use `completion-evidence-gate`.
- The repository explicitly configures a richer work-item or handoff system and the user asks to use that system.
- The task asks to archive or persist full transcripts, hidden reasoning, raw terminal logs, secrets, or unrelated session history.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Current user goal and the latest instruction that controls the task.
- Current changed files, in-scope files, and out-of-scope files that must not be touched.
- Command intents run, failed, skipped, manual-only, or missing.
- Verification receipts or current command-result summaries when available.
- Blocking condition, unresolved decision, approval boundary, or next safe action.
- Repository handoff, retention, compaction, generated-state, and reporting policy.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- When repository handoff policy is report-only or disabled, do not create project files solely to preserve handoff state.
- When a configured handoff surface exists and the user requests it, write only bounded restart evidence allowed by that surface.
- Update docs, skills, templates, or tests that define handoff behavior when the task explicitly changes handoff procedure.
- Do not store hidden reasoning, secrets, full chat transcripts, full terminal output, raw command logs, private URLs, credentials, or unrelated work history.
- Do not turn a handoff summary into authority over current files, current user instructions, or command contracts.

<!-- mustflow-section: procedure -->
## Procedure

1. Refresh the nearest instructions required by the repository policy before writing a final report or handoff.
2. Identify whether the task is complete, incomplete, blocked, paused, or resumed.
3. If the task is resumed after compaction or handoff, compare the summary with current files and current user instructions before acting on it.
4. Keep the handoff bounded to the current task: objective, latest controlling instruction, files touched, files intentionally avoided, commands run, commands skipped, failures, blockers, and next safe action.
5. Source-link claims to current files, configured command intents, or run summaries. Do not make a compacted summary outrank current repository evidence.
6. Exclude hidden reasoning, raw terminal logs, full transcripts, secrets, tokens, credentials, personal data, private URLs, and unrelated work history.
7. If repository handoff is disabled or report-only, keep the restart information in the final report instead of creating `.mustflow/` state files.
8. If a configured handoff surface exists, write only the bounded fields allowed by that surface and avoid raw logs.
9. For blocked work, state the exact boundary: missing approval, missing command intent, missing source, failed verification, ambiguous instruction, or external-system requirement.
10. For resumed work, name what was verified against current files and what may still be stale.
11. Run only configured status or validation intents that are appropriate for the report boundary.

<!-- mustflow-section: postconditions -->
## Postconditions

- The next agent or user can restart from a concrete, bounded point.
- The handoff does not include hidden reasoning, secrets, full transcripts, full terminal logs, or unrelated session history.
- The handoff is lower authority than current files, current user instructions, and command contracts.
- Disabled or report-only handoff policy is respected.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `mustflow_check`

Use docs or release validation only when the handoff procedure itself changes docs, templates, package output, or mustflow-owned files.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a summary conflicts with current files or current user instructions, follow the current source and report the conflict.
- If a secret or private value appears in handoff input, activate `secret-exposure-response` and omit the value.
- If the task needs a project handoff file but handoff is disabled or no configured surface exists, keep the handoff in the final report and state the missing surface.
- If command receipts are missing, report that the command was not verified through mustflow instead of claiming it passed.
- If the user asks for full raw logs or hidden reasoning, provide a bounded operational summary instead.

<!-- mustflow-section: output-format -->
## Output Format

- Task status: complete, incomplete, blocked, paused, or resumed
- Latest controlling instruction
- Files touched and files intentionally avoided
- Commands run, failed, skipped, manual-only, or missing
- Verification evidence and stale-summary checks
- Next safe action or blocking boundary
- Excluded sensitive or raw content categories
- Remaining resume risk
