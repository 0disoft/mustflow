---
mustflow_doc: skill.next-action-menu
locale: en
canonical: true
revision: 5
lifecycle: mustflow-owned
authority: procedure
name: next-action-menu
description: Apply this skill when a final report, completion note, repository improvement loop, or follow-up workflow should offer a bounded numbered next-action menu that a user can select with a single digit in the next turn. Use especially after non-trivial code, behavior, test, docs, workflow, release, deploy, commit, push, verification, paused-work, or approval-gated work when concrete follow-up actions exist.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.next-action-menu
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Next Action Menu

<!-- mustflow-section: purpose -->
## Purpose

Turn useful follow-up work into a compact, selectable menu after a task is reported complete or
paused.

The menu should make the next turn cheaper for the user without pretending that a digit can bypass
scope, approval, verification, command contracts, release gates, or safety rules.

<!-- mustflow-section: use-when -->
## Use When

- A final report, completion note, handoff, or repository improvement cycle has one or more useful
  follow-up tasks.
- A non-trivial task is being reported after changed files, a created commit, completed verification,
  push readiness, release or deploy preparation, paused work, or another concrete approval gate.
- A code, behavior, test, public API, config, workflow, docs, package, security, data, UI, or
  performance change has been completed or paused and the final report can name a bounded next
  action such as verify, commit, push, release, deploy, document, or continue a related slice.
- The user repeatedly asks for "next recommended work", "continue", "proceed", or selects follow-up
  items after previous completion reports.
- The agent needs to present a bounded backlog that can be selected by a single digit in the next
  user turn.
- Follow-up tasks differ in value, risk, or urgency enough that ranking helps the user choose.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The current answer is a tiny direct response with no meaningful follow-up.
- There are no evidence-backed next actions, or all plausible next actions are speculative.
- The user asked not to include recommendations, menus, or follow-up prompts.
- The only possible next action requires a blocking product, security, privacy, legal, release,
  migration, destructive, dependency, credential, deployment, or payment decision that has not been
  authorized and there is no safe bounded action to describe. Report the decision gate instead of
  offering it as a one-digit action.
- Another interface already owns selection state and has a stricter picker, ticket, or work-order
  contract.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The completed or paused task goal and the evidence gathered during the task.
- Current changed-file, verification, skipped-check, and remaining-risk evidence.
- The skills used and any next-step candidates produced by those skills.
- Command contract limits, approval requirements, and release or publish constraints that affect
  follow-up actions.
- A freshness boundary for the menu: which final report or latest assistant answer the selection
  belongs to.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Completion evidence has been calibrated when the menu follows changed files or verification claims.
- Follow-up items are grounded in current repository evidence, user direction, or explicit skipped
  checks.
- High-risk actions remain gated by the user's direct authorization and the repository command
  contract.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Prefer no edits. This skill normally shapes final reporting and next-turn interpretation.
- Update workflow docs, skill procedures, templates, or tests only when the menu behavior itself is
  being added, changed, or synchronized.
- Do not add autonomous loops, background workers, hidden state files, transcript logs, or persistent
  task queues solely to remember menu items.
- Do not convert a menu choice into a command permission, release approval, push approval, deploy
  approval, destructive action, or dependency-install approval.

<!-- mustflow-section: procedure -->
## Procedure

1. Decide whether a menu is useful or required.
   - Include a menu when at least one concrete follow-up task is valuable.
   - For non-trivial completion reports, commits, completed verification, push readiness, release or
     deploy preparation, paused work, or unresolved approval gates, treat the menu as required when
     any concrete next action exists.
   - Do not fabricate filler items to reach a fixed row count.
2. Build at most nine items.
   - Use digits `1` through `9`.
   - Use fewer than nine rows when fewer real next actions exist.
   - Keep each item a bounded task instruction, not a vague theme such as "improve quality".
3. Rank items by user value, risk reduction, unblock value, confidence, and effort.
4. Assign a recommendation score:
   - `A`: high-value, low-ambiguity, safe to start next under current scope.
   - `B`: valuable and reasonably clear, with manageable verification.
   - `C`: useful but less urgent, broader, or dependent on more evidence.
   - `D`: defer unless the user specifically wants this branch.
   - `E`: low value or blocked by notable uncertainty.
   - `F`: not recommended now; include only when explicitly useful as a warning or rejected option.
5. Render the menu as a Markdown table after the completion evidence and skill-selection note when
   the host format allows it.
   - Use four columns: number, next task title, description, and recommendation score.
   - In Korean final reports, use wider short-column labels so narrow renderers do not wrap
     two- or three-character headers vertically. Prefer `선택 번호` over `번호`, and
     `추천 등급` over `추천도`.
   - Use non-breaking spaces inside the short header labels so those labels stay together.
     Prefer this template:
     `| 선택&nbsp;번호 | 다음 작업 | 설명 | 추천&nbsp;등급 |`
     `|---:|---|---|:---:|`
     For English, prefer:
     `| Select&nbsp;No. | Next task | Description | Recommendation&nbsp;grade |`
     `|---:|---|---|:---:|`
   - Keep descriptions short enough to scan but specific enough to execute.
   - Localize column labels to the report language when appropriate.
6. Mark gated items plainly.
   - Commit, push, publish, deploy, release, destructive cleanup, dependency upgrade, credential
     work, migration, billing, auth, privacy, or cross-repository edits may appear only when they are
     genuinely plausible follow-ups.
   - The description must state the gate, such as explicit user approval, configured command intent,
     owner decision, or manual verification.
   - A gated item in the table is only a visible next-action option; it is not approval to perform
     that action.
7. Interpret a single-digit next user message as a menu selection only when all conditions hold:
   - the immediately relevant previous assistant final report contained a next-action menu;
   - the digit maps to an item in that menu;
   - the menu is still fresh for the current repository, branch, and task context;
   - the selected item does not bypass approvals, command contracts, or safety rules.
8. If a digit is stale, ambiguous, unmapped, or conflicts with newer user instructions, do not guess.
   Ask for clarification or report that no active menu item can be selected.
9. After a valid selection, treat the selected row as the new user task, then re-run normal
   instruction refresh, skill selection, repository evidence gathering, and verification selection.
10. If the selected row is high-risk or gated, stop at the gate and ask for the missing approval or
    decision before performing that action.

<!-- mustflow-section: postconditions -->
## Postconditions

- The menu offers only real, bounded next actions.
- Single-digit follow-up behavior is convenient but cannot override newer user instructions, safety
  rules, or command contracts.
- High-risk actions are visibly gated instead of hidden behind a number.
- The next selected task can be executed as a normal mustflow task with fresh instruction and skill
  selection.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use narrower configured checks when the menu behavior changes code, tests, templates, or public docs.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If there are no concrete next actions, omit the menu instead of padding it.
- If every valuable next action is gated, show the gate and do not present the digit as sufficient
  approval.
- If a selected digit no longer matches current state, ask for confirmation before acting.
- If follow-up items become broad backlog planning, switch to `repo-improvement-loop` or
  `idea-triage`.
- If a menu item would require task-instruction repair before execution, use
  `clarifying-question-gate` or `task-instruction-authoring` before implementation.

<!-- mustflow-section: output-format -->
## Output Format

- Menu included or omitted, with reason
- Numbered next-action rows, when included
- Recommendation scores and gate labels
- Active-menu freshness boundary
- Selected digit interpretation, when applicable
- Skills used for the selected follow-up task
- Command intents run
- Skipped checks and reasons
- Remaining selection, approval, or stale-context risk
