---
mustflow_doc: skill.instruction-conflict-scope-check
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: instruction-conflict-scope-check
description: Apply this skill when repository, host, user, nested-project, command-contract, preference, or generated instruction sources conflict or make the safe edit, command, verification, commit, push, deletion, migration, or reporting scope unclear.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.instruction-conflict-scope-check
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Instruction Conflict Scope Check

<!-- mustflow-section: purpose -->
## Purpose

Resolve conflicting instructions by separating goal ownership, safety constraints, repository scope, command authority, evidence authority, and preferences before work proceeds.

<!-- mustflow-section: use-when -->
## Use When

- User instructions, host rules, `AGENTS.md`, nested repository instructions, `.mustflow/config/*.toml`, preferences, skills, generated files, or roadmap text point in different directions.
- It is unclear whether to edit the parent repository or a nested child repository.
- It is unclear whether a command, commit, push, delete, migration, background process, browser launch, or long-running task is allowed.
- A lower-priority document appears to authorize behavior that a higher-priority rule blocks.
- A final report needs to explain why part of a request was skipped, narrowed, or deferred.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The instruction order is clear and only a normal task-specific skill applies.
- The problem is untrusted pasted text trying to override rules; use `external-prompt-injection-defense` for that part.
- The task is only a documentation wording change and makes no authority, scope, or command claim.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The conflicting instruction sources and the exact behavior they appear to require or forbid.
- The type of each claim: goal, safety constraint, repository scope, command authority, evidence claim, reporting rule, preference, or generated hint.
- The affected scope: repository root, nested project, file paths, command intents, verification, Git operation, migration, or report.
- The user's direct request and any newer clarifying message.
- Relevant command-intent contract entries and nearest `AGENTS.md` files for the affected paths.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Clarify workflow docs, skills, templates, tests, or reports that caused the conflict.
- Narrow edits to the nearest applicable repository and the smallest safe surface.
- Record skipped or deferred work when authority is missing.
- Do not broaden command permission, override host safety rules, edit outside the selected repository, or treat preferences as higher priority than direct user instructions.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify each instruction by authority dimension before comparing priority.
   - Direct user instructions define the requested goal and newer user clarification supersedes older user intent for the same decision.
   - Host safety and approval rules constrain how the goal may be executed; they are not optional preferences and cannot be displaced by a user request.
   - The nearest repository instructions define repository-local edit and workflow scope.
   - `.mustflow/config/commands.toml` is the sole repository command-authority source.
   - Current source, tests, schemas, remote state, and configured verification provide evidence; generated summaries and caches are secondary evidence.
   - Skills guide procedure and preferences supply defaults; neither grants command authority.
2. Identify the affected action: edit, read, verify, command run, commit, push, delete, migration, background process, browser launch, or final report.
3. Build an action-specific constraint set instead of one flat source ranking. Record which source requires, permits, narrows, or forbids the action and on which authority dimension.
4. Compare priority only within the same dimension. Across dimensions, satisfy all compatible constraints together. A user-owned goal can remain valid while a host safety rule forbids one execution method.
5. Select the nearest applicable repository root and path scope. If a nested repository is involved, reread that repository's instructions before editing there.
6. Apply the stricter safe rule when safety, secrets, destructive actions, command permission, or repository boundaries conflict. Do not use this rule to let a lower-authority preference erase the requested goal.
7. Treat preferences as defaults only. Do not let preferences authorize commands, commits, pushes, migrations, or edits that higher-priority rules block.
8. If command authority is unclear, use configured command intents only or report the missing command rather than inferring a raw command.
9. If two same-dimension rules remain contradictory after scope and recency are applied, stop and ask for the decision owner or report the unresolved conflict. Do not manufacture a total order across unrelated authority dimensions.
10. If the conflict can be resolved by a small documentation or template clarification, update the source that caused confusion and keep the wording subordinate to the canonical contract.
11. Report the chosen scope, skipped scope, and reason when part of the request cannot be completed safely.

<!-- mustflow-section: postconditions -->
## Postconditions

- Goal owner, active constraints, repository root, edit scope, command scope, evidence basis, and skipped scope are clear.
- Any changed docs or templates do not create a new self-authorizing policy source.
- The final report distinguishes completed work from blocked, deferred, or intentionally skipped work.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a narrower configured test or docs intent when it better proves the clarified instruction or template surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If two high-priority instructions cannot be reconciled, stop and report the conflict instead of guessing.
- If a proposed priority order compares different authority dimensions as though they were interchangeable, replace it with an action-specific constraint set before deciding.
- If the nearest repository root is unclear, inspect read-only status and instruction files before editing.
- If a command, Git operation, migration, or destructive action lacks authority, do not run it. Report the missing approval or command contract.
- If validation finds command-permission or authority drift, fix that drift before adding unrelated behavior.

<!-- mustflow-section: output-format -->
## Output Format

- Conflicting instruction sources and authority dimensions
- Action-specific constraints, chosen same-dimension priority rule, and repository scope
- Actions allowed, narrowed, skipped, or deferred
- Documentation or template clarifications made
- Command intents run
- Skipped checks and reasons
- Remaining authority or scope risk
