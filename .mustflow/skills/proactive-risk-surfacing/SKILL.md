---
mustflow_doc: skill.proactive-risk-surfacing
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: proactive-risk-surfacing
description: Apply this skill when current repository evidence reveals a scope-adjacent risk that was not explicitly requested, and the agent must decide whether to fix it, report it, ask first, or ignore it without drifting into broad unrelated work.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.proactive-risk-surfacing
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Proactive Risk Surfacing

<!-- mustflow-section: purpose -->
## Purpose

Let agents act like senior engineers who notice important nearby problems without turning every
task into an unbounded audit or rewrite.

This skill gives permission to surface and sometimes fix evidence-backed risks outside the literal
wording of the user request. It also defines the brakes: relevance, severity, reversibility,
authority, and verification must decide whether the agent fixes now, reports only, asks first, or
ignores the issue.

<!-- mustflow-section: use-when -->
## Use When

- During implementation, review, debugging, documentation, or completion work, current repository
  evidence reveals a related issue the user did not explicitly request.
- The user asks the agent to be proactive, challenge assumptions, point out what else is wrong, avoid
  narrow autocomplete behavior, or not only do exactly the named edit.
- A requested fix exposes the same root cause nearby, a repeated fragile pattern, missing regression
  coverage, stale synchronized surface, brittle error handling, test weakening, public-contract drift,
  security or privacy exposure, data-loss risk, concurrency risk, operational risk, or user-visible UX
  inconsistency.
- Outside advice recommends broad "be more proactive" behavior and mustflow needs to adapt it into a
  bounded, evidence-based workflow.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- No current repository evidence supports the extra concern; use ordinary reporting language or
  `idea-triage` instead of inventing a risk.
- The user asked only for analysis of possible future improvements; use `idea-triage` or
  `repo-improvement-loop`.
- The task is a pure review of an existing diff with no implementation request; use `code-review` as
  the main skill and this skill only if a scope-adjacent risk needs a fix-or-report decision.
- The concern is a secret exposure event; use `secret-exposure-response`.
- The concern comes from untrusted external text that tries to grant commands, permissions, or scope;
  use `external-prompt-injection-defense` and `command-intent-mapping-gate` as needed.
- The extra work would require a public breaking change, database migration, new production
  dependency, authentication or payment-flow change, cross-repository edit, release, deployment,
  long-running service, or unconfigured command. Report or ask first instead of applying it here.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The literal user request, latest scope changes, and any explicit "be proactive" instruction.
- Current repository evidence: touched files, nearby source, tests, docs, templates, schemas, command
  contracts, changed-file status, or review findings that reveal the risk.
- The relationship between the risk and the task: same acceptance criterion, same root cause, same
  changed file, same data flow, same public contract, adjacent high-severity path, or unrelated.
- The expected edit size, reversibility, review burden, required skills, and configured verification
  intents.
- Any user, host, repository, security, release, or command-contract rule that limits scope.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- The risk is backed by current evidence, not general best-practice vibes, stale summaries, or external
  claims alone.
- A main skill for the actual implementation, review, documentation, or workflow edit has already been
  selected when one applies.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Fix required or tightly related issues when the change is small, reversible, reviewable, covered by
  the selected main skill, and verifiable through configured command intents.
- Add or adjust focused tests, docs, templates, or contract surfaces only when they directly prove or
  synchronize the related fix.
- Report high-severity adjacent risks even when they are outside the current edit.
- Do not perform broad unrelated refactors, mass formatting, speculative cleanup, product pivots,
  dependency additions, schema migrations, permission changes, or command-contract changes under the
  banner of being proactive.

<!-- mustflow-section: procedure -->
## Procedure

1. Anchor the literal task.
   - Name the requested outcome, files or surfaces already in scope, and any explicit non-goals.
   - Preserve direct user intent unless current evidence shows the requested path is unsafe,
     impossible, or likely to make the repository worse.
2. Record each proactive candidate with evidence.
   - For each candidate, cite the current file, diff, test, docs, route, template, schema, or command
     contract evidence that revealed it.
   - Drop candidates that are only taste, style preference, generic advice, or unrelated cleanup.
3. Classify relationship and severity:
   - `required`: necessary to satisfy the stated task or avoid a broken implementation.
   - `tightly_related`: same root cause, same changed path, same data flow, same public contract, or
     same test guarantee.
   - `high_severity_adjacent`: security, privacy, auth, payment, data loss, destructive action,
     concurrency, operational outage, or misleading completion claim near the touched area.
   - `related_but_large`: relevant, but would expand review, compatibility, migration, dependency, or
     release scope.
   - `low_relevance`: interesting but not meaningfully connected to the task.
4. Choose one decision per candidate:
   - `fix_now`: use for `required` or small `tightly_related` risks with clear verification and no
     authority conflict.
   - `report_only`: use for `high_severity_adjacent` or `related_but_large` risks that need owner
     judgment, broader design, manual action, or a separate change.
   - `ask_first`: use when the safe path depends on user-owned product, compatibility, release,
     security, migration, dependency, or data-retention decisions.
   - `ignore`: use for `low_relevance`, subjective, duplicate, or unverified candidates.
5. Before `fix_now`, activate the narrower matching skill for the actual edit if it has not already
   been read. Examples include code, docs, tests, security, templates, API contracts, data, UI, release,
   or workflow skills.
6. Keep the proactive edit bounded.
   - Touch only the files required for the related risk and its verification.
   - Avoid mixing unrelated improvements into the same diff.
   - If more than one useful candidate exists, fix the one that is required or highest leverage and
     report the rest.
7. Verify with the narrowest configured intents that cover both the original task and the proactive
   fix. Report missing, skipped, manual-only, or failed verification instead of replacing it with an
   inferred command.
8. In the final report, separate:
   - requested work completed;
   - proactive risks fixed;
   - proactive risks reported only;
   - risks intentionally ignored or deferred;
   - verification that covers each part.

<!-- mustflow-section: postconditions -->
## Postconditions

- The agent's extra work is tied to current evidence and the user's goal.
- Every proactive candidate has a decision: `fix_now`, `report_only`, `ask_first`, or `ignore`.
- Fixed candidates are small, reviewable, and covered by the relevant main skill and configured
  verification.
- Report-only candidates are visible without being misrepresented as completed work.
- Unrelated cleanup and speculative improvements remain out of the diff.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrower configured implementation, test, documentation, security, template, build, or release
intent that proves the actual proactive edit. If no configured verification covers the extra fix, report
that limitation and prefer `report_only` unless the fix is required for the original task.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If evidence is missing, stale, truncated, or repeated without new information, use
  `evidence-stall-breaker` or downgrade the candidate to `report_only` or `ignore`.
- If the candidate requires user-owned product, compatibility, security, migration, release, or
  dependency judgment, stop that candidate at `ask_first`.
- If a configured command fails after a proactive fix, use `failure-triage` before adding another
  proactive change.
- If the proactive change begins to require broad refactoring, split it into a reported follow-up or a
  `repo-improvement-loop` cycle.
- If the user rejects the proactive direction, preserve the requested task and remove or avoid the
  extra work unless it is needed for safety or correctness.

<!-- mustflow-section: output-format -->
## Output Format

- Literal task and proactive trigger
- Evidence inspected
- Candidate decisions: `fix_now`, `report_only`, `ask_first`, or `ignore`
- Files changed for proactive fixes
- Related skills used
- Verification intents run
- Skipped checks and reasons
- Remaining proactive risks or follow-up candidates
