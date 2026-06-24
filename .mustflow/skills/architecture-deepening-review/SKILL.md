---
mustflow_doc: skill.architecture-deepening-review
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: architecture-deepening-review
description: Apply this skill when architecture, module boundaries, layered boundaries, or codebase structure need review before choosing a refactor or abstraction.
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

- The user asks for architecture review, layered architecture review, module boundaries, structural improvement, codebase deepening, maintainability review, or testability improvement.
- The user asks where a design will break first as it grows, which responsibility boundary is most likely to blur, or whether a module, service, database owner, permission model, deployment unit, or failure boundary is still clear enough.
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
- Current change-pressure evidence: which business rules, providers, data contracts, permissions, read paths, or operational demands are expected to change independently.
- Current enforcement evidence: physical modules, package boundaries, import rules, architecture tests, public API surfaces, or reviewer-only conventions that allow or block boundary violations.
- The data owner, write path, failure mode, and expected 3x, 10x, or 100x growth pressure when the review is about a design rather than only a file split.
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
3. Reject layer theater before proposing deeper structure.
   - Do not treat `controller`, `service`, `repository`, `domain`, `infra`, or similar folder names
     as architecture evidence by themselves.
   - Check whether one business change forces edits across many technical folders. If yes, rank the
     feature or capability boundary before adding another technical layer.
   - Check whether dependency direction is enforced by modules, packages, import rules, architecture
     tests, or build boundaries. Reviewer memory is weak evidence.
   - Treat caller-owned ports, narrow use-case interfaces, adapter mappings, and explicit public
     module surfaces as stronger boundary evidence than broad infrastructure-owned interfaces.
   - Mark pass-through services, table-shaped repositories, generic CRUD bases, and `common`,
     `shared`, or `utils` growth as smells unless they hide real policy, translation, transaction,
     test, or provider complexity.
4. Identify one to three candidate boundaries.
   - Each candidate must name the responsibility it would hide or clarify.
   - Reject candidates that only rename, wrap, or move code without lowering caller complexity or test cost.
5. Force the design through the ownership and failure questions before scoring.
   - Name the first likely mixed-responsibility boundary. Common early failures are business rules leaking into controllers, repositories, external adapters, UI components, or framework-specific handlers.
   - Name the final owner for important data. The owner is the module that protects the invariant, not necessarily the module that reads the value most often.
   - Separate original state from cache, search index, analytics, summary, AI output, provider response, or other derived state.
   - Identify every direct write path for high-impact fields such as status, role, permission, balance, quota, plan, entitlement, deleted state, payment state, or ownership.
   - Ask whether a failure creates a visible failure state or silently creates false success. High-impact paths such as authorization, payment, entitlement, deletion, and destructive administration should fail closed.
   - Ask whether duplicate requests, retries, webhook redelivery, queue replay, or worker restart can repeat a harmful effect. If yes, require an idempotency, ledger, outbox, or reconciliation boundary before calling the design safe.
6. Check growth pressure in concrete stages.
   - At 3x scale, look first for implementation-quality failures: missing indexes, N+1 reads, large responses, synchronous file or image work, repeated external calls, and insufficient connection pools.
   - At 10x scale, look first for ownership and state failures: write hot spots, queue delay, cache invalidation, server-local files, scattered permission rules, external API rate limits, and deployment units that change for unrelated reasons.
   - At 100x scale, look first for partitioning and operational failures: data split boundaries, tenant or region hot spots, retry storms, external dependency isolation, long deploy recovery, missing observability, and manual-only recovery paths.
7. Check scaling direction without forcing premature distribution.
   - A small team may start with one larger server or a simple server set, but request handlers should not depend on process memory, local uploads, duplicate cron execution, in-transaction external calls, or server-specific job state.
   - Application servers should be able to become stateless. Databases may start with vertical scaling, but the design should not block read replicas, read models, queue-backed work, or future data partitioning.
   - Horizontal scaling is only real if any server can handle the same request, workers can safely duplicate or retry work, and database writes do not all converge on an uncontrolled hot spot.
8. Score each candidate from 1 to 9.
   - User value: whether the structure protects a user-visible or public contract.
   - Maintenance value: whether future changes become smaller or less error-prone.
   - Blast radius: how many callers, files, schemas, templates, or docs would change.
   - Testability: whether behavior can be proven with existing or focused tests.
   - Reversibility: whether the change can be undone without a public migration.
   - Evidence confidence: whether the diagnosis is supported by local code, tests, or repeated change patterns.
9. Choose the next action.
   - Recommend one smallest structural move, or explicitly stop at analysis-only when the evidence is not strong enough.
   - If implementation proceeds, use the narrower matching skill before editing that boundary.
10. Keep the structure move shallow-to-deep.
   - Start with caller simplification, naming, and responsibility boundaries.
   - Then extract a focused facade, policy, strategy, pure core, adapter, result type, or dependency boundary only when it clearly removes real complexity.
   - Avoid turning a broad file into many vague files with the same responsibilities.
11. Verify and report.
   - Run the narrowest configured command intents that cover the changed surface.
   - Report skipped checks, unknown behavior evidence, and any candidate intentionally deferred.

<!-- mustflow-section: postconditions -->
## Postconditions

- The output contains a ranked architecture candidate list or one scoped structural change.
- Any chosen change has a named reason tied to lower change cost, lower defect risk, or better testability.
- Layered-architecture claims are backed by change-pressure, dependency-direction, public-surface,
  and enforcement evidence rather than folder names alone.
- Important data has a named owner, write path, original-or-derived classification, and failure behavior when the reviewed design touches durable state.
- Growth pressure is either checked at 3x, 10x, and 100x or explicitly marked not relevant to the current architecture decision.
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
- Layering, change-pressure, and boundary-enforcement evidence
- Data owner, write path, and original-versus-derived state when relevant
- Failure mode, idempotency, and recovery boundary when relevant
- 3x, 10x, and 100x growth pressure when relevant
- Vertical versus horizontal scaling direction when relevant
- Candidate boundaries and scores
- Selected next action
- Narrower skill used or intentionally avoided
- Files changed or analysis-only note
- Verification intents run
- Skipped checks and reasons
- Remaining architecture risks
