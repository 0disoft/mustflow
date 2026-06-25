---
mustflow_doc: skill.line-ending-hygiene
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: line-ending-hygiene
description: Apply this skill when Git reports CRLF/LF warnings, Docker or shell scripts fail with CRLF interpreter errors, or tracked text files may need repository line-ending policy or normalization review.
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

Detect line-ending drift without silently rewriting a repository, distinguish current working-tree drift from Git conversion warnings, and normalize only when a repository policy and explicit user request make it safe.

<!-- mustflow-section: use-when -->
## Use When

- Git reports CRLF, LF, or line-ending replacement warnings.
- A diff or formatter appears to rewrite files only because of line endings.
- Docker, Linux, WSL, CI, or shell execution fails with `bad interpreter`, `bash\r`, `env: ...\r`, `exec format error`, or similar CRLF-related symptoms.
- A proposal suggests creating `.gitattributes`, running renormalization, or rewriting tracked files to fix cross-platform line endings.
- A PowerShell, formatter, scaffold, generated update, or mechanical rewrite is suspected of changing line endings.
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
- Per-file EOL evidence from Git when available, including index EOL, working-tree EOL, and attribute result.
- Current changed-file status.
- Whether the request is diagnosis-only, policy authoring, or explicit tracked-file normalization.
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
- Do not create `.gitattributes`, run repository-wide renormalization, or commit line-ending changes as an automatic fallback from a build, Docker, clone, scaffold, or script failure.
- Do not change local Git EOL configuration or run repository-wide renormalization in a dirty worktree unless the user explicitly requests that scope and reviews the resulting diff.

<!-- mustflow-section: procedure -->
## Procedure

1. Inspect the changed-file status before deciding whether line endings are the actual issue.
2. Inspect the repository EOL policy before blaming a specific write command. A root `.gitattributes` rule such as `* text=auto eol=lf` is the durable source of truth; local Git settings are secondary evidence.
3. Inspect per-file EOL evidence for any named file before assigning cause. Treat `i/lf w/lf attr/text=auto eol=lf` as currently clean. Treat `w/crlf` or mixed working-tree evidence as actual drift. Treat Git's "LF will be replaced by CRLF" wording as a future-conversion warning from configuration, not proof that the working tree is already CRLF.
4. Use the `line_endings_check` intent when it is configured and agent-runnable.
5. If no LF policy is declared, report the missing policy instead of normalizing files.
6. If a runtime error mentions CRLF symptoms, classify it as a line-ending/platform issue before treating it as a missing executable, missing dependency, Docker image problem, or shell bug.
7. If a PowerShell or formatter rewrite is involved, separate the read step from the write step. Reading a file does not prove it changed line endings; the writer API, Git checkout policy, previous edits, or generated output may be the actual source.
8. If drift is found, report the affected tracked files and whether normalization was only previewed.
9. If a policy file needs to be created or changed, keep that as an explicit policy change with reviewable scope. Do not smuggle a new repository-wide policy into an unrelated bug fix.
10. Use normalization only after an explicit user request, and treat `line_endings_normalize` as manual-only unless the repository declares otherwise.
11. After any normalization, re-run the line-ending check and a relevant validation intent for the touched scope.
12. Keep the final report focused on policy, per-file EOL evidence, files changed, checks run, and remaining risk.

<!-- mustflow-section: postconditions -->
## Postconditions

- The agent has not silently rewritten the working tree.
- The agent has not silently created or changed a repository-wide line-ending policy.
- The agent has not attributed a line-ending warning to a specific tool without per-file EOL evidence.
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
- If a fix would require repository-wide policy authoring or tracked-file renormalization, report the prerequisite unless the user explicitly requested that scope.

<!-- mustflow-section: output-format -->
## Output Format

- Line-ending policy found
- Per-file EOL evidence inspected
- Policy changes made or deferred
- Files with CRLF or mixed line endings
- Files normalized
- Command intents run
- Command intents skipped with reasons
- Remaining line-ending risk
