---
mustflow_doc: skill.code-review
locale: en
canonical: true
revision: 9
lifecycle: mustflow-owned
authority: procedure
name: code-review
description: Apply this skill when reviewing code changes, scope, risks, or verification gaps.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.code-review
  command_intents:
    - test
    - test_related
    - test_audit
    - lint
    - mustflow_check
---

# Code Review

<!-- mustflow-section: purpose -->
## Purpose

Verify that a change aligns with the request and ensure that no behavioral risks or verification gaps persist.
The goal is not perfect code; it is to improve the codebase's long-term correctness, safety,
maintainability, and operability. Prefer real defects, design debt, missing tests, security risks,
and contract drift over taste, formatting, or alternative implementations without evidence.

<!-- mustflow-section: use-when -->
## Use When

- Code changes, diffs, pull requests, or potential regression risks require review.
- The primary objective is risk assessment rather than implementing new behavior.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task involves only wording, translation, or formatting changes.
- No changed files or diffs are available for review.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Modified files or diffs
- Change intent, PR description, issue, requirement, or user request when available
- User-specified review criteria
- Author-provided focus areas, non-goals, deployment timing, or files that should receive extra attention when available
- Test changes, migration or deployment notes, and security/privacy/permission relevance when available
- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/commands.toml`

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep edits within the scope described by this skill, the user request, and the matching route in `.mustflow/skills/INDEX.md`.
- Do not broaden command permission, invent project facts, or change unrelated workflow files.

<!-- mustflow-section: procedure -->
## Procedure

1. Review the list of modified files.
2. Identify any unrelated or extraneous edits.
3. Establish the review standard before looking for comments:
   - approve imperfect changes when they make the codebase healthier and leave no blocking risk
   - block only on evidence-backed correctness, safety, data, contract, test, compatibility, or release risk
   - treat preference-only rewrites, unsupported performance fears, and style comments covered by automation as non-blocking
   - resolve judgment conflicts in this order: reproducible technical evidence, repository contracts and style guides, design principles, existing codebase consistency, then author preference for neutral choices
4. Review in this order unless the user specifies a narrower mode:
   - changed intent and requirement fit
   - design placement, responsibility split, and compatibility with local patterns
   - correctness, edge cases, concurrency, and data integrity
   - security, privacy, permissions, secrets, files, external requests, and logs
   - test relevance and regression coverage
   - maintainability, naming, complexity, and deletion or rollback path
   - performance, resource use, cache invalidation, and repeated work
   - documentation, migration, deployment, release, and operational impact
5. Check maintainability risks that should be caught before PR readiness:
   - long `if`/`else if` dispatch over one reason, status, or type code where a `switch`, lookup table, or policy helper would clarify intent
   - user-visible strings embedded in control flow instead of the existing localization or message-catalog surface
   - repeated metadata reads or object assembly across success, failure, preview, and reporting paths
   - external bot or AI review comments treated as authority instead of triage evidence
   - future-looking abstractions that do not simplify at least two current requirements or remove concrete duplication
6. Route specialist risk instead of expanding this skill into every checklist:
   - use `security-privacy-review` or `security-regression-tests` for authentication, authorization, secrets, personal data, cryptography, uploads, external requests, or deployment security
   - use `test-design-guard`, `requirement-regression-guard`, or `test-maintenance` for detailed test strategy or regression coverage
   - use `performance-budget-check` for measured performance, cache, startup, indexing, memory, or repeated-work claims
   - use `source-anchor-authoring` for adding, revising, or validating `mf:anchor` comments
   - use `behavior-preserving-refactor`, `structure-discovery-gate`, or architecture-pattern skills for broad refactors or module-boundary decisions
7. Categorize findings by review priority:
   - `P1`: blocking correctness, security, data loss, command contract, output contract, or release risk
   - `P2`: likely bug, maintainability issue, missing test, compatibility risk, or unclear ownership boundary
   - `P3`: non-blocking clarity, naming, small cleanup, or follow-up suggestion
   - keep findings evidence-based and tied to changed behavior, not author preference
   - only `P1` and unresolved high-confidence `P2` findings should block approval or release readiness
   - never use `P3` findings as approval blockers
8. Write comments in a useful shape:
   - problem: what is wrong or uncertain
   - impact: why it matters for behavior, users, data, maintainability, or operations
   - suggestion: the smallest reasonable fix or follow-up
   - confidence: high, medium, or low when evidence is incomplete
9. Focus review effort on risks that automation cannot fully judge:
   - do not spend review budget on formatting or style issues already covered by configured checks
   - for large diffs, report review-scope risk and inspect the riskiest files or behavior paths first
   - flag mixed-purpose diffs when behavior changes are bundled with broad formatting, file moves, generated output churn, or unrelated cleanup
   - for hotfixes, prioritize blast radius, rollback path, regression tests, and release safety
   - for refactors, prioritize behavior preservation, public contract compatibility, and test relevance
10. Review source-anchor impact when changed code adds, removes, or moves exported boundaries,
   command execution, verification decisions, state writes, security/privacy boundaries, or
   external-system adapters:
   - flag missing anchors only when a durable navigation point would help future reviewers find a high-value boundary
   - flag anchor bloat when anchors explain ordinary code, duplicate nearby anchors, or compensate for mixed responsibilities
   - flag authority drift when anchors instruct agents, grant command permission, claim verification success, weaken tests, or override repository policy
   - if an anchor must be added or revised, route that work through `source-anchor-authoring` instead of expanding this review procedure
11. Review test relevance:
   - missing tests for new functionality
   - obsolete tests for removed functionality
   - redundant tests that fail to address new risks
   - weakened or insufficient assertions
   - snapshot updates lacking a clear rationale
   - tests that inadvertently reintroduce removed behavior
   - bug fixes should include a regression guard, or the review must state why one is not practical
12. Verify the existence of relevant command intents.
13. Document findings categorized by severity and priority.
14. When review context is missing, continue with observable risks and list the missing context as questions instead of blocking the review.

<!-- mustflow-section: postconditions -->
## Postconditions

- The expected output can be produced with clear evidence, executed command intents, skipped checks, and remaining risks.
- Any missing command intent, unknown input, or authority conflict is reported instead of hidden.

<!-- mustflow-section: verification -->
## Verification

Follow `.mustflow/docs/agent-workflow.md#command-execution-policy`.

Related command intents:

- `test`
- `test_related`
- `test_audit`
- `lint`
- `mustflow_check` when source anchors, skills, workflow documents, or mustflow authority boundaries are involved

Avoid introducing raw shell commands; reference the command intent names defined in `.mustflow/config/commands.toml`.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a command intent is missing, restricted to manual execution, disabled, or unknown, report the status rather than guessing.
- Document any skipped verifications and the associated remaining risks.
- Immediately halt and report if sensitive data or destructive command risks are identified.

<!-- mustflow-section: output-format -->
## Output Format

- Summary
- Findings categorized by severity and priority
- Blocking decision and rationale
- List of reviewed files
- Command intents executed
- Skipped command intents and justifications
- Notes on test relevance
- Missing context or follow-up questions
- Identified remaining risks
