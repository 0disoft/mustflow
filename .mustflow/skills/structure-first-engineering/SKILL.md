---
mustflow_doc: skill.structure-first-engineering
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: structure-first-engineering
description: Apply this skill as an adjunct for non-trivial code changes where early structure decisions affect domain rules, public contracts, external I/O, operational safety, testability, error handling, concurrency, data flow, or future change cost.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.structure-first-engineering
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

# Structure-First Engineering

<!-- mustflow-section: purpose -->
## Purpose

Make structural decisions before coding when the wrong boundary would be expensive to unwind.

This skill is not anti-abstraction. It assumes high-quality structure can be cheap to create with
LLM help, while late boundary repair can be expensive. Invest early in hard-to-reverse boundaries,
but reject abstractions that do not lower change cost, failure risk, or cognitive load.

<!-- mustflow-section: use-when -->
## Use When

- A code task changes domain rules, public contracts, external I/O, persistence, authorization, concurrency, operational behavior, or error semantics.
- A task needs a new module boundary, use case, adapter, DTO, schema, state transition, result type, provider boundary, or testable core.
- The user asks to think like a senior or long-experienced engineer, design well up front, avoid later rewrites, or prevent structural debt.
- A proposed implementation could mix validation, transformation, domain decisions, I/O, formatting, and output mapping in one place.
- A change could create hard-to-reverse coupling to a framework, provider response, database shape, CLI/API schema, local filesystem, time, randomness, environment, process memory, queue, webhook, or worker behavior.
- A bug fix reveals that failures, retries, partial success, or duplicated effects are not modeled clearly.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a surface-only documentation, copy, comment, log wording, or UI text change with no execution-path risk.
- A narrow pattern skill is already sufficient and the risk block would add no new decision.
- The user explicitly asks for analysis-only code review; use `code-review` or `architecture-deepening-review` unless implementation will follow.
- The task is a tiny local logic change with obvious inputs, outputs, tests, and no contract or I/O boundary.
- The proposed structure is only a file split, naming wrapper, `Service`, `Manager`, `Handler`, factory, or interface without a concrete pressure it removes.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User request, target files, project context if known, and current repository instructions.
- Existing source, tests, schemas, templates, contracts, docs, and nearby local patterns for the affected boundary.
- Current or expected data flow: input, validation, transformation, storage or external calls, and output.
- Failure classes: user input, authorization, business rule, external system, transient fault, concurrency, partial failure, and recovery path.
- Public contracts affected: API response, CLI output, config schema, database schema, event, queue, webhook, migration, docs example, or user-visible behavior.
- Relevant command-intent contract entries for verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Skill-selection has chosen one main implementation skill when applicable; this skill normally acts as an adjunct gate.
- Missing product, domain, compatibility, security, or migration decisions are either safely inferable from repository evidence or routed through a clarification gate.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or adjust boundaries, types, DTOs, pure domain functions, adapters, mappers, result/error models, tests, and docs that are directly required by the changed behavior.
- Structure the implementation at module scale when it lowers change cost, isolates external volatility, or makes failure and tests explicit.
- Do not add vague layers named only `Service`, `Manager`, `Handler`, `Helper`, or `Factory` unless the responsibility and volatility hidden by that layer are named.
- Do not split files solely because they are large.
- Do not invent dependency installation, migration execution, external services, or command authority.

<!-- mustflow-section: procedure -->
## Procedure

1. Print or internally prepare a risk block before editing. If the host or user-facing flow makes pre-edit output noisy, keep the block as working notes and include the relevant parts in the final report.

   ```text
   [Work risk]: surface change | local logic change | domain rule change | public contract change | external I/O change | operational risk change
   [Project context]: prototype | staging | production | unknown
   [Core boundary]: domain/API/I/O/contract being touched
   [Data flow]: input -> validation -> transformation -> storage/call -> output
   [Failure points]: expected failures and handling strategy
   [Test contract]: tests or reproduction/verification commands to add, update, or run
   [Structure change]: needed/not needed, with reason
   ```

2. Classify the highest applicable work risk.
   - Surface change: keep edits narrow and avoid structure changes.
   - Local logic change: keep cleanup within the module and add or update focused tests.
   - Domain rule change: isolate rules from I/O and framework delivery; prefer pure functions or use-case boundaries.
   - Public contract change: preserve compatibility when possible and pin schema, fixture, snapshot, or contract tests.
   - External I/O change: isolate the adapter, timeout and retry behavior, partial failure, and provider response mapping.
   - Operational risk change: treat security, money, audit, deletion, concurrency, and recovery as highest intensity.
3. Decide whether structure is allowed. Require at least one real pressure:
   - responsibility separation is necessary;
   - tests are tied to external factors;
   - public contracts and internal representation are mixed;
   - error categories are implicit or wrong;
   - domain rules are duplicated;
   - change impact is too broad;
   - provider, framework, filesystem, network, time, randomness, or environment volatility leaks into domain logic.
4. Control abstraction.
   - Create an interface, factory, strategy, mapper, adapter, or use case only when there are at least two implementations, external volatility to hide, tests need control, a public contract must stay stable, a high-change area needs isolation, or duplicated domain rules need one owner.
   - Name the responsibility in domain words. If the best name is only `Service`, `Manager`, `Handler`, or `Helper`, the boundary is probably still unclear.
5. Trace data flow end to end.
   - Keep system boundaries behind DTOs, schemas, interfaces, or mappers.
   - Convert external API, database, CLI, event, or UI payloads into internal types near the boundary.
   - Keep domain data immutable when practical.
   - Avoid spreading raw `any`, broad `unknown`, provider response shapes, request bodies, or ORM records through the domain core.
6. Model expected failures explicitly.
   - Use local Result, Option, typed error, status object, or existing project convention for expected failures.
   - Separate user-facing messages from debugging detail.
   - Do not swallow exceptions or convert all failures into generic false, null, or success-with-warning states.
   - Classify failures as input, auth/permission, business rule, external system, transient, concurrency, or partial failure.
7. Isolate external I/O and unstable inputs.
   - Keep domain rules from directly calling network, database, filesystem, clock, random, UUID, process environment, or framework request objects.
   - Inject time, randomness, UUID, environment, and external clients when tests or determinism need control.
   - Guard duplicate execution, timeout-unknown state, concurrent updates, partial failure, and compensation failure in code or explicitly report why the risk is not relevant.
8. Protect public contracts.
   - Treat API response/status codes, CLI output/exit codes, config schemas, database schemas/migrations, event/queue/webhook payloads, and docs examples as more stable than implementation shape.
   - When a contract changes, synchronize docs, fixtures, schema, migration, generated clients, and tests that encode that contract.
9. Set the test contract before or during implementation.
   - Test pure logic without I/O.
   - Make time, randomness, and environment controllable.
   - For bug fixes, include a failing reproduction or explain why one is impossible.
   - Name tests after the guarantee, not the implementation detail.
   - Avoid mock-only confidence, meaningless copied fixtures, and snapshot-heavy approval unless the snapshot is the real contract.
10. Check observability, security, and performance for risky paths.
    - Add structured logs or trace/request IDs for important state transitions when the project has logging conventions.
    - Keep authentication and authorization separate from untrusted input parsing and business rules.
    - Remove I/O from tight loops or name why it is bounded. Include cache invalidation or freshness strategy when adding cache behavior.
11. Handle verification failure by classifying the cause before changing more code:
    - real regression;
    - existing failure;
    - wrong contract test;
    - environment, dependency, or flaky issue.
    If the cause is unknown, do not claim completion.
12. If you intentionally skip a rule, record the exception:

    ```text
    [Exception applied]: skipped rule and reason
    [Risk]: possible consequence
    [Compensation]: test, TODO, docs, or follow-up
    ```

<!-- mustflow-section: postconditions -->
## Postconditions

- The highest work risk is named and the structure decision matches that risk.
- Domain rules, public contracts, adapters, data flow, and error handling have clear owners when touched.
- External I/O and unstable inputs are behind testable boundaries when relevant.
- Concurrency, partial failure, idempotency, and recovery are handled or explicitly marked not relevant.
- Tests or verification commands cover the behavior and contract actually changed.
- Any exception to the structure-first rules is reported with risk and compensation.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Choose the narrowest configured verification that covers the highest work risk. Use release or docs checks when public contracts, templates, package metadata, schemas, or docs examples change.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the risk block exposes a missing product, security, migration, or compatibility decision, stop and ask or use the clarifying-question gate.
- If structure pressure is weak, do the narrow implementation and report that structure was intentionally deferred.
- If the implementation starts becoming a broad rewrite, stop and split the work into a smaller boundary-preserving step.
- If tests require too many mocks, revisit the boundary instead of weakening assertions.
- If a configured command fails, switch to `failure-triage` before claiming completion.

<!-- mustflow-section: output-format -->
## Output Format

- Work risk and project context
- Core boundary and data flow
- Structure decision and reason
- Failure model, I/O boundary, concurrency, and partial-failure notes
- Public contract impact
- Tests added, updated, or intentionally not added
- Command intents run
- Exceptions applied, if any
- Remaining structure risk
