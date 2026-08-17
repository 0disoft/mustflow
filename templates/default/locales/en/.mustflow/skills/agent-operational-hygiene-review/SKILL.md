---
mustflow_doc: skill.agent-operational-hygiene-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: agent-operational-hygiene-review
description: Apply this skill when files, tests, scripts, or workflows are created, changed, merged, split, renamed, or committed and the change risks agent-operational mistakes such as merged files with missing standard-module imports or stale fixtures, staged sets that escape the task write set, commit-message transport through a shell string, CRLF or BOM line-ending drift, hand-computed line offsets, regex-removal residue, unverified refactors, or host-shell breakage that a named checklist can prevent before the verification gate runs.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.agent-operational-hygiene-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - changes_staged_status
    - lint
    - build
    - test_related
    - test
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Agent Operational Hygiene Review

<!-- mustflow-section: purpose -->
## Purpose

Prevent recurring agent work-loop mistakes by turning each known failure class into a named
checklist item that is checked before the verification gate runs — not discovered by it.

The review question is not "does the change work?" It is "before I commit, did I execute the
artifact I changed, keep every import and fixture, keep the commit message safe for the host
shell, keep line endings and encoding stable, avoid hand-computed line offsets, and leave no
residue behind a regex or block removal?"

<!-- mustflow-section: use-when -->
## Use When

- A change merges, splits, consolidates, or renames test, fixture, helper, or source files, so
  imports, shared state, moved constants, and per-file setup can silently disappear.
- A commit message or inline command could be interpreted by the host shell (PowerShell, bash,
  zsh, cmd) because it contains backticks, command substitution, variable interpolation, or
  command separators.
- A change writes or rewrites text files where line endings or encoding can drift to CRLF or BOM.
- An edit is applied by hand-computed line offsets, block removal, or regex replacement where a
  residual fragment can survive.
- A refactor or consolidation is verified only by a broad suite that may never execute the exact
  artifact that changed.
- A report claims a merged, split, renamed, or refactored artifact is complete.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily bulk line-ending or BOM normalization of an existing tree; use
  `line-ending-hygiene`.
- The task is primarily finding residual references or dead paths after whole files or modules
  were split, moved, or renamed; use `split-refactor-residual-path-review`.
- The task is primarily authoring a shell script, PowerShell script, or CLI wrapper; use
  `shell-code-change` or `powershell-code-change`.
- The task is primarily commit, PR, or contribution process policy, branch protection, or review
  gates; use `github-contribution-quality-gate`.
- The task is primarily deciding whether tests should exist, be pruned, or be maintained; use
  `test-maintenance` or `test-suite-value-pruning-review`.
- The task is only a generic code review without a merge, split, shell, encoding, offset, or
  residue risk; use `code-review` or `behavior-preserving-refactor`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The changed artifact and its diff: merged or split files, moved helpers or constants, and any
  file whose content was rewritten.
- The command surface used: host shell and quoting context, commit message text, and any inline
  command that carries user-provided or generated text.
- The encoding state of touched files: observed line endings, BOM presence, and the writer or
  cmdlet that produced them.
- The verification state: which configured intent actually executed the changed artifact, and
  which checks were skipped and why.
- Existing tests, fixtures, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or the missing merge, shell, encoding, offset, residue, or
  verification evidence can be reported without guessing.
- Every checklist item is treated as a real guard: a missing check is reported as a gap, not
  skipped silently.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Fix missing imports, stale fixtures, and broken shared state in merged or split artifacts.
- Rewrite or regenerate commit messages at the transport boundary, and run the commit-message and
  staged-scope guards when they are configured.
- Re-write touched text files as LF with UTF-8 no BOM when encoding drift is detected, and remove
  residual fragments left by regex or block removals.
- Update the directly synchronized documentation, templates, or tests that describe the same
  artifact.
- Do not normalize unrelated files, rewrite commit policy, or add new command authority under
  this skill.
- Do not include secrets, tokens, or full logs in reports.

<!-- mustflow-section: procedure -->
## Procedure

1. After any merge or split, prove every identifier is still imported and every moved symbol still
   exists.
   - When files are consolidated, check the standard-module imports first: `node:assert`,
     `node:child_process`, `node:crypto`, `node:fs`, `node:os`, `node:path`, `node:test`,
     `node:url`, plus project helpers. A merged file that passes `node --test` only because the
     missing import path was never executed is still broken.
   - Verify moved constants, helper functions, shared fixtures, and per-file setup blocks survived
     the merge, and that per-case state (such as metadata variables, timeouts, or cursor
     constants) is initialized exactly once.
2. Run the changed artifact before committing — not after.
   - Execute the merged, split, or renamed file at least once (`test_related` for the changed test
     file, `build` for compiled code, the narrowest configured intent that touches the artifact).
   - "Covered by the broad suite later" is not evidence: a broad run may not select the file at
     all. If the artifact cannot be executed, label the change unverified in the report.
3. Keep commit messages safe at the transport boundary, not by content filtering.
   - Backticks, `$(` command substitution, `$VAR` interpolation, and separators are ordinary
     message text. They only become dangerous when the message is assembled inside a shell command
     string (`sh -c`, `bash -c`, `pwsh -Command`, `cmd /c`) and re-parsed.
   - Pass the message through direct argv or `git commit -F <file>`; never build it through a shell
     string. Put `-F` scratch files outside the worktree (OS temp directory) or under
     `<repo>/.git/mustflow/`; a repo-root scratch file is a staging defect.
   - Run `scripts/guard-commit-message.mjs` on the message to check the transport contract (NUL,
     valid UTF-8, size, and file location); treat a guard failure as a defect to fix, not a message
     to retype.
   - Before committing, verify the staged set with `changes_staged_status` and
     `scripts/guard-staged-scope.mjs --allow <task write set>`: a staged file outside the write
     set, a repo-root scratch file, or an index/worktree mismatch is a defect.
4. Never compute line ranges by hand.
   - Use line numbers reported by the read or search tool (`Select-String`, editor jump-to-line),
     and treat tool-reported lines as 1-based unless the tool states otherwise.
   - Before splicing, verify the boundary twice: inclusive versus exclusive ends, and the line
     after the last removed or inserted line.
5. After any regex, block, or table removal, re-scan for residue.
   - Grep for the removed names, orphaned sub-tables, dangling references, and leftover old paths
     after the edit, not before it.
   - A surviving fragment — a sub-table that outlived its parent, a renamed shard still referenced
     by an old path, a fixture that still pins a deleted count — is a defect, not cosmetics.
   - When whole files or modules moved, hand residual-path discovery to
     `split-refactor-residual-path-review`.
6. Check encoding and line endings on every rewrite.
   - Write text files as LF with UTF-8 no BOM. Avoid writers that rewrite newlines
     (`WriteAllLines`, `ConvertTo-Json`); re-normalize after any transformation with an explicit
     LF and UTF-8-no-BOM write, and confirm with `git diff --stat` and a byte-level check.
   - Defer bulk normalization of unrelated files to `line-ending-hygiene`.

<!-- mustflow-section: postconditions -->
## Postconditions

- Merged, split, or renamed artifacts carry every import, moved symbol, fixture, and per-case
  state they need, and were executed at least once before commit.
- Commit messages and inline commands are safe for the host shell, or were passed through a file
  (`git commit -F`) so the shell never parses them.
- Touched text files are LF with UTF-8 no BOM, or the drift is reported and routed to
  `line-ending-hygiene`.
- Edits applied by offsets, blocks, or regex leave no residual fragments, verified by re-scanning
  after the edit.
- Every checklist item is either verified or reported as a gap in the final report.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `changes_staged_status`
- `lint`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured tests that execute the changed artifact directly, and confirm
with `git diff --stat`, a commit-message transport guard run, and the staged-scope guard that the
staging, shell-transport, encoding, and residue classes are clean.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a merged or split file fails with a missing import or moved symbol, fix the import or
  restore the symbol and rerun the artifact before continuing.
- If a commit fails because the host shell interpreted the message, retry through
  `git commit -F <file>` with the scratch file outside the worktree, and record the transport class
  in the report.
- If line endings or BOM drift is found, re-write the touched files with explicit LF and UTF-8 no
  BOM, re-diff, and report the class.
- If a regex or block removal left residue, remove the fragment and re-grep for the removed names
  before continuing.
- If a real secret appears in a commit message, fixture, log, or report, stop repeating it and use
  `secret-exposure-response`.

<!-- mustflow-section: output-format -->
## Output Format

- Agent operational hygiene reviewed
- Merge and split findings: imports, moved symbols, fixtures, per-case state
- Execution findings: which artifact was run before commit, and which was not
- Commit-message and transport findings: transport boundary used, `-F` file location
- Encoding and line-ending findings: drift found or confirmed clean
- Offset, block, and regex findings: residue found or confirmed clean
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining agent-operational risk
