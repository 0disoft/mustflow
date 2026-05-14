---
mustflow_doc: skill.architecture-deepening-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: architecture-deepening-review
description: Apply this skill when architecture, module boundaries, or codebase structure need review before choosing a refactor or abstraction.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.architecture-deepening-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - test
    - lint
    - build
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Architecture Deepening Review

<!-- mustflow-section: purpose -->
## Purpose

Find high-leverage structure improvements before adding abstractions, splitting files, or moving behavior behind new boundaries.

This is a review-first skill. It helps decide whether code needs a deeper module, clearer boundary, or smaller behavior-preserving refactor. It is not a license to create architecture because a pattern exists.

<!-- mustflow-section: use-when -->
## Use When

- The user asks for architecture review, module boundaries, structural improvement, codebase deepening, maintainability review, or testability improvement.
- A file, module, service, handler, command, controller, or test suite looks broad enough that the next edit may add another responsibility.
- Code exposes internal steps to many callers, repeats orchestration, or makes tests hard because policy, I/O, formatting, and dispatch are mixed.
- A shallow wrapper adds naming without hiding complexity, or a helper has become a pass-through layer around many unrelated concerns.
- Several narrower pattern skills might apply, but the right structural move is not clear yet.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The user already selected a specific refactor with known behavior evidence; use `behavior-preserving-refactor`.
- The task is a bug fix or confusing failure; use `repro-first-debug` first.
- The change introduces a new feature, folder layout, routing, data model, or external service boundary before structure assumptions are clear; use `structure-discovery-gate`.
- The task only reviews a completed diff for bugs; use `code-review` or `diff-risk-review`.
- A specific pattern is already the narrowest match, such as `facade-pattern`, `strategy-pattern`, `pure-core-imperative-shell`, `dependency-injection`, `adapter-boundary`, `result-option`, or `state-machine-pattern`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Target area, current pain, and the user-facing or maintainer-facing reason to inspect architecture.
- Relevant source files, call sites, exports, tests, fixtures, schemas, templates, or documentation that show current behavior and ownership.
- Local patterns for modules, boundaries, naming, errors, dependency direction, and tests.
- Current changed-file list when the worktree is already dirty.
- Relevant command-intent contract entries for verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The review can cite concrete local evidence. If the area is unfamiliar, use `codebase-orientation` before ranking candidates.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- In analysis-only mode, produce a ranked candidate list without changing source files.
- When the user asks to proceed, make at most one small structural change tied to the selected candidate.
- Update related tests, docs, templates, or metadata only when the selected candidate changes a declared contract.
- Do not create a broad abstraction, move many files, or apply a named pattern without local evidence and a behavior-preserving path.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the review target.
   - Name the current pain: repeated orchestration, leaked internals, broad responsibility, weak test boundary, unclear ownership, or mixed policy and I/O.
   - Identify whether the expected output is analysis-only or one scoped implementation.
2. Inspect local evidence before judging.
   - Read imports, exports, public functions, call sites, related tests, and nearby module conventions.
   - Prefer evidence from current code and tests over generic architecture advice.
3. Identify one to three candidate boundaries.
   - Each candidate must name the responsibility it would hide or clarify.
   - Reject candidates that only rename, wrap, or move code without lowering caller complexity or test cost.
4. Score each candidate from 1 to 9.
   - User value: whether the structure protects a user-visible or public contract.
   - Maintenance value: whether future changes become smaller or less error-prone.
   - Blast radius: how many callers, files, schemas, templates, or docs would change.
   - Testability: whether behavior can be proven with existing or focused tests.
   - Reversibility: whether the change can be undone without a public migration.
   - Evidence confidence: whether the diagnosis is supported by local code, tests, or repeated change patterns.
5. Choose the next action.
   - Recommend one smallest structural move, or explicitly stop at analysis-only when the evidence is not strong enough.
   - If implementation proceeds, use the narrower matching skill before editing that boundary.
6. Keep the structure move shallow-to-deep.
   - Start with caller simplification, naming, and responsibility boundaries.
   - Then extract a focused facade, policy, strategy, pure core, adapter, result type, or dependency boundary only when it clearly removes real complexity.
   - Avoid turning a broad file into many vague files with the same responsibilities.
7. Verify and report.
   - Run the narrowest configured command intents that cover the changed surface.
   - Report skipped checks, unknown behavior evidence, and any candidate intentionally deferred.

<!-- mustflow-section: postconditions -->
## Postconditions

- The output contains a ranked architecture candidate list or one scoped structural change.
- Any chosen change has a named reason tied to lower change cost, lower defect risk, or better testability.
- Behavior changes are excluded or explicitly moved to a separate follow-up.
- Verification evidence or verification gaps are reported without claiming unrun checks passed.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `test`
- `lint`
- `build`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use documentation and release checks only when the review or chosen change touches public docs, templates, schemas, package metadata, or release-sensitive surfaces.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If evidence is too thin to rank candidates, stop with the missing evidence instead of inventing architecture.
- If the best candidate needs a product, compatibility, security, or release decision, stop and report that gate.
- If the selected change turns into a broad rewrite, stop and split it into a smaller behavior-preserving refactor.
- If verification fails, triage the failing configured intent before continuing architecture work.
- If a narrower pattern skill becomes the clear match, switch to that skill before editing.

<!-- mustflow-section: output-format -->
## Output Format

- Review target and current pain
- Evidence inspected
- Candidate boundaries and scores
- Selected next action
- Narrower skill used or intentionally avoided
- Files changed or analysis-only note
- Verification intents run
- Skipped checks and reasons
- Remaining architecture risks
