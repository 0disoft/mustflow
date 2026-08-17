---
mustflow_doc: skill.agent-operational-hygiene-review
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: agent-operational-hygiene-review
description: Apply this skill when files, tests, scripts, or workflows are finalized for commit and the change set, the verification evidence, the mechanical edits, or the final report could disagree with the final files — staged paths that escape the task write set, changed executable artifacts without a direct witness, verification receipts that went stale, mechanical-edit residue after merges or regex rewrites, or final-report claims that no longer match the artifact hashes, git head, or working directory.
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

Own the finalization boundary of a change: the intended change set, the staged set, the
verification evidence, the mechanical edits, and the final report must all agree with the final
files. Everything else is owned by a more specific skill.

The review question is not "does the change work?" It is "when I commit, does every claim — the
staged paths, the executed witnesses, the edited bytes, the reported hashes — still match the
files that will be committed?"

<!-- mustflow-section: use-when -->
## Use When

- A change set is being staged and committed, and staged paths could escape the task write set,
  include a repo-root scratch file, or drift from the reviewed worktree.
- A changed executable artifact (script, test, generator) needs a direct witness that actually
  ran, or a verification receipt must match the final artifact hash, git head, and working
  directory.
- A merge, split, rename, or regex or block rewrite could leave mechanical omissions or residue:
  missing imports, moved symbols, dropped fixtures, orphaned sub-tables, or stale old paths.
- A final report claims verification, staging hygiene, or execution evidence that the current
  files no longer support.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is shell quoting, expansion, argv conversion, `pwsh -Command` parsing, or native
  argument passing; use `shell-code-change` or `powershell-code-change`.
- The task is EOL policy diagnosis, normalization decisions, or bulk line-ending or BOM
  normalization; use `line-ending-hygiene`.
- The task is finding residual runtime paths, duplicate execution, or lifecycle after whole files
  or modules moved; use `split-refactor-residual-path-review`.
- The task is test fixture design, isolation, per-case reset, or stale-test judgment; use
  `test-maintenance`.
- The task is public GitHub issue, PR body, or review-comment content quality; use
  `github-contribution-quality-gate`.
- The task is CI trigger filters, skipped jobs, false green, or job graphs; use
  `ci-pipeline-triage`.
- The task is coordinating multiple workers, subagents, or worktrees in one task; use
  `multi-agent-work-coordination` (the product-side long-running job API belongs to
  `agent-job-control-review`).
- The task is durable run, attempt, effect, or receipt ledger design; use
  `completion-evidence-gate` or `execution-ledger-integrity-review`.
- The task is keeping skill sources, template copies, catalogs, and i18n synchronized; use
  `contract-sync-check` or `template-install-surface-sync`.
- The task is file mode, executable bit, symlink, or case-only rename drift; use
  `artifact-integrity-check`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The intended write set for the task and the actual staged set (`changes_staged_status`).
- The changed artifact list and the direct witnesses that were declared and executed for them.
- The verification receipt: artifact hashes, git head, working directory, intent, and exit code.
- The mechanical-edit list: merged, split, renamed, or regex-rewritten files and the identifiers
  or blocks they touched.
- Existing tests, fixtures, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or the missing staging, witness, receipt, or residue evidence can
  be reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Unstage or reject staged paths outside the task write set, remove repo-root scratch files, and
  restage reviewed content.
- Fix missing imports, moved symbols, dropped fixtures, and residual fragments in mechanically
  edited files.
- Rewrite a final report whose claims no longer match the artifact hashes, git head, or working
  directory.
- Update the directly synchronized documentation, templates, or tests that describe the same
  artifact.
- Do not redesign shell parsing, EOL policy, test isolation, CI matrices, or skill sync surfaces
  under this skill; hand those to their owners.
- Do not include secrets, tokens, or full logs in reports.

<!-- mustflow-section: procedure -->
## Procedure

1. Prove the staged set stays inside the task's intended write set.
   - Run `changes_staged_status` and `scripts/guard-staged-scope.mjs --allow <task write set>`:
     a staged file outside the write set, a repo-root scratch file (`msg.tmp`, root `*.tmp`), or
     an index/worktree mismatch is a defect.
   - Keep commit-message transport at the boundary, not content: backticks, `$(...)`, `$VAR`, and
     separators are ordinary message text; they only become dangerous when assembled inside a
     shell command string (`sh -c`, `bash -c`, `pwsh -Command`, `cmd /c`). Pass the message
     through direct argv or `git commit -F <file>`, with `-F` scratch files outside the worktree
     (OS temp directory) or under `<repo>/.git/mustflow/`. Run
     `scripts/guard-commit-message.mjs` to check NUL, valid UTF-8, size, and file location.
2. Prove every changed executable artifact has a direct witness that ran.
   - A broad-suite pass is not a witness: the suite may never select the changed file. Each
     changed executable artifact needs a declared witness (`verification-targets.toml`) or
     self-witness (a test file), and the witness must actually execute.
   - Related-mode verification fails closed on an undeclared executable artifact; treat the
     fail-closed error as a contract gap to declare, not a gate to bypass.
   - When verification finishes, the receipt's artifact hash, git head, and working directory must
     still match the current files; a stale receipt means the evidence no longer applies.
3. Re-scan mechanically edited files for omissions and residue.
   - After a merge or split, prove every identifier is still imported (`node:assert`,
     `node:child_process`, `node:crypto`, `node:fs`, `node:os`, `node:path`, `node:test`,
     `node:url`, plus project helpers) and every moved symbol, fixture, and per-case state
     survived.
   - After a regex or block removal, grep for the removed names, orphaned sub-tables, dangling
     references, and leftover old paths — after the edit, not before.
   - Use line numbers reported by the tool; never hand-compute ranges (inclusive versus exclusive
     ends, 0-based versus 1-based).
   - If encoding or line-ending drift is suspected after a rewrite, run the line-endings check and
     hand off normalization to `line-ending-hygiene`.
4. Make the final report's evidence match the final files.
   - Only re-read files that were line-referenced, mechanically rewritten, structurally merged, or
     generator-rewritten; diff and contract checks cover the rest.
   - Report the artifact, witness, intent, result, and any manual-only reason for each changed
     executable artifact, and confirm the receipt hash, git head, and working directory against
     the files being committed.

<!-- mustflow-section: new-class-criteria -->
## New Failure Class Admission Criteria

Add a new failure class to this skill only when every condition holds; otherwise route it to an
existing skill or a new one:

1. The failure recurs independently twice within 90 days, or one escape reached a real commit or
   release.
2. The failure repeats across more than one language or domain skill.
3. No existing skill owns the root cause.
4. The failure is a new invariant, not an example of an existing class.
5. The failure is observable at the single-repo finalization boundary.
6. Positive and neighbor forbidden route fixtures can be written for it.
7. An automated guard or an explicit human exception rule exists.

Keep the core invariant list at five items or fewer; adding a sixth requires moving one existing
item to a specialist skill.

<!-- mustflow-section: postconditions -->
## Postconditions

- The staged set equals the intended write set, with no repo-root scratch files and no
  index/worktree mismatch.
- Every changed executable artifact has a declared or self witness that ran, and the receipt
  hash, git head, and working directory match the final files.
- Mechanically edited files carry every import, moved symbol, fixture, and per-case state, with
  no residual fragments.
- The final report claims only evidence that the current files support.

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
with `git diff --stat`, the staged-scope guard, the commit-message transport guard, and the
verification receipt that the staging, witness, residue, and freshness classes are clean.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a staged path escapes the write set or a scratch file is staged, unstage it, move scratch
  files outside the worktree, and re-run the staged-scope guard before continuing.
- If a changed executable artifact has no declared witness, declare it in
  `verification-targets.toml` and run its witness; never bypass the fail-closed gate.
- If the receipt is stale (artifact changed, head moved, or wrong working directory), re-run the
  verification against the final files and confirm the new receipt.
- If a merged or regex-rewritten file lost an import, symbol, fixture, or left residue, restore
  and re-run before continuing.
- If a real secret appears in a commit message, fixture, log, or report, stop repeating it and use
  `secret-exposure-response`.

<!-- mustflow-section: output-format -->
## Output Format

- Agent operational hygiene reviewed
- Staging findings: staged set, scratch files, index/worktree mismatch, `-F` transport
- Witness findings: declared witnesses, executed artifacts, receipt hash/head/cwd
- Mechanical-edit findings: imports, moved symbols, fixtures, residue
- Report freshness findings: claims versus final files
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining agent-operational risk
