---
mustflow_doc: skill.line-ending-hygiene
locale: fr
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: line-ending-hygiene
description: Apply this skill when Git reports CRLF/LF warnings or when tracked text files may need repository line-ending normalization.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.line-ending-hygiene
  command_intents:
    - line_endings_check
    - changes_status
    - mustflow_check
---

# Line Ending Hygiene

<!-- mustflow-section: purpose -->
## Purpose

Detect line-ending drift without silently rewriting a repository, and normalize only when a repository policy and explicit user request make it safe.

<!-- mustflow-section: use-when -->
## Use When

- Git reports CRLF, LF, or line-ending replacement warnings.
- A diff or formatter appears to rewrite files only because of line endings.
- A user asks why line-ending warnings appear.
- A user asks to normalize tracked files to the repository line-ending policy.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is unrelated to Git, text files, formatting, or command-output warnings.
- The repository has no line-ending policy and the user has not asked to create one.
- The only affected files are generated artifacts, package archives, images, databases, or other binary files.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The warning text or changed-file evidence.
- Current `.gitattributes` or equivalent repository line-ending policy.
- Current changed-file status.
- The configured command intents for line-ending checks and manual normalization.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update line-ending policy files only when the user asks for a repository policy change.
- Normalize tracked text files only when the user explicitly requests normalization and the repository declares an LF policy.
- Do not rewrite binary files, generated archives, dependency folders, or unrelated source files.
- Do not change formatting, indentation, or content while handling line endings.

<!-- mustflow-section: procedure -->
## Procedure

1. Inspect the changed-file status before deciding whether line endings are the actual issue.
2. Use the `line_endings_check` intent when it is configured and agent-runnable.
3. If no LF policy is declared, report the missing policy instead of normalizing files.
4. If drift is found, report the affected tracked files and whether normalization was only previewed.
5. Use normalization only after an explicit user request, and treat `line_endings_normalize` as manual-only unless the repository declares otherwise.
6. After any normalization, re-run the line-ending check and a relevant validation intent for the touched scope.
7. Keep the final report focused on policy, files changed, checks run, and remaining risk.

<!-- mustflow-section: postconditions -->
## Postconditions

- The agent has not silently rewritten the working tree.
- Any normalization is tied to a declared repository policy.
- Remaining CRLF, mixed line endings, missing policy, or manual-only command gaps are reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `line_endings_check`
- `changes_status`
- `mustflow_check`

If normalization touched code, documentation, templates, or release surfaces, also run the narrowest configured verification that covers those changed files.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If Git is unavailable or the repository is not a Git working tree, report that tracked-file inspection is unavailable.
- If a line-ending check fails because drift exists, do not treat it as a tool failure; report the affected files and next safe action.
- If normalization fails, stop after the first relevant error and do not attempt broader formatting.
- If the repository policy conflicts with user intent, ask for an explicit policy decision before editing.

<!-- mustflow-section: output-format -->
## Output Format

- Line-ending policy found
- Files with CRLF or mixed line endings
- Files normalized
- Command intents run
- Command intents skipped with reasons
- Remaining line-ending risk
