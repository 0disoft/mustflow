---
mustflow_doc: skill.instruction-conflict-scope-check
locale: zh
canonical: false
revision: 1
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

Resolve conflicting instructions by narrowing authority, edit scope, command scope, and reporting boundaries before work proceeds.

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

1. List the conflicting sources in priority order: direct user request, host safety rules, nearest repository instructions, mustflow config, skills, preferences, generated state, and lower-priority docs.
2. Identify the affected action: edit, read, verify, command run, commit, push, delete, migration, background process, browser launch, or final report.
3. Select the nearest applicable repository root and path scope. If a nested repository is involved, reread that repository's instructions before editing there.
4. Apply the stricter safe rule when safety, secrets, destructive actions, command permission, or repository boundaries conflict.
5. Treat preferences as defaults only. Do not let preferences authorize commands, commits, pushes, migrations, or edits that higher-priority rules block.
6. If command authority is unclear, use configured command intents only or report the missing command rather than inferring a raw command.
7. If the conflict can be resolved by a small documentation or template clarification, update the source that caused confusion and keep the wording subordinate to the canonical contract.
8. Report the chosen scope, skipped scope, and reason when part of the request cannot be completed safely.

<!-- mustflow-section: postconditions -->
## Postconditions

- The active instruction source, repository root, edit scope, command scope, and skipped scope are clear.
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
- If the nearest repository root is unclear, inspect read-only status and instruction files before editing.
- If a command, Git operation, migration, or destructive action lacks authority, do not run it. Report the missing approval or command contract.
- If validation finds command-permission or authority drift, fix that drift before adding unrelated behavior.

<!-- mustflow-section: output-format -->
## Output Format

- Conflicting instruction sources
- Chosen priority rule and repository scope
- Actions allowed, narrowed, skipped, or deferred
- Documentation or template clarifications made
- Command intents run
- Skipped checks and reasons
- Remaining authority or scope risk
