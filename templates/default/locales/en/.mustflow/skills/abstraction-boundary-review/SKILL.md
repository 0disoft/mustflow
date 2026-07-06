---
mustflow_doc: skill.abstraction-boundary-review
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: abstraction-boundary-review
description: Apply this skill when code is created, changed, refactored, reviewed, or reported and an agent needs to choose or audit abstraction boundaries by reason-to-change, future variation, domain meaning, layer import contracts, ownership, side-effect placement, public promises, interface necessity, boilerplate deletion, test shape, reversibility, over-abstraction signals, under-abstraction signals, or post-refactor layer integrity.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.abstraction-boundary-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Abstraction Boundary Review

<!-- mustflow-section: purpose -->
## Purpose

Choose or audit an abstraction by the reason it will change, not by how similar the current code
looks.

The review question is not "can this be DRY?" It is "will these callers change for the same reason,
which public promise is stable, which details stay hidden, and can we inline this abstraction again if
that promise was imaginary?"

<!-- mustflow-section: use-when -->
## Use When

- Code generation, implementation, refactoring, or review must decide whether to extract a helper,
  interface, adapter, service, policy object, strategy, mapper, DTO, base class, hook, component,
  utility, facade, or shared module.
- Similar code exists in multiple places, but it is unclear whether the similarity is one concept or
  several independent futures.
- Refactoring removes duplication and may accidentally merge different domain concepts, failure
  policies, security boundaries, lifecycles, operational policies, or caller language levels.
- An AI-generated or assistant-authored change created many tiny files, one-caller interfaces,
  generic helpers, factories, conversion layers, mode flags, provider switches, or dependency
  injection plumbing.
- A change is hard to test without a server, database, HTTP call, framework runtime, browser, queue,
  clock, filesystem, or provider SDK, and the core decision might need a purer boundary.
- External SDK, DB, HTTP, CLI, process, framework, or UI details leak into domain policy, tests, or
  user-facing decisions.
- Layered code needs explicit domain, application, infrastructure, and presentation dependency
  rules, including which imports, DTOs, ORM types, provider payloads, transactions, or controllers
  would make the architecture fail.
- A change introduces or preserves vague `Service`, `Manager`, `Helper`, `Util`, `Common`, `Base`,
  or `Abstract` names, pass-through classes, future-only interfaces, implementation-only ports, or
  single-caller wrapper modules.
- A reviewer needs to decide whether under-abstraction, over-abstraction, deliberate duplication, or
  a smaller local abstraction is the safer next step.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The only concern is import direction, module ownership, DTO infection, public module APIs, or
  circular dependencies; use `module-boundary-review` as the primary boundary skill.
- The main concern is overall maintainability blast radius, deletion path, hidden ordering,
  migration/runtime compatibility, or future edit spread beyond the abstraction itself; use
  `change-blast-radius-review`.
- The task needs first-pass implementation structure for a new feature before code exists; use
  `structure-first-engineering` first, then this skill for the abstraction decision.
- The task is only selecting a known pattern such as adapter, strategy, facade, dependency injection,
  result type, state machine, composition over inheritance, or pure-core/imperative-shell; use the
  narrower pattern skill first.
- The change is a small deterministic helper with explicit inputs, one clear caller family, no
  policy, no side effects, no shared state, no public surface, and no expected variation.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, current diff or intended edit scope, and the behavior or policy that caused the change.
- Change-reason ledger: which business rule, data shape, provider contract, failure path, UI state,
  performance constraint, compatibility promise, or operational behavior would make the code change.
- Future-change scenarios: at least three plausible next changes or an explicit note that the task is
  too narrow to predict beyond the current request.
- Domain vocabulary and ownership map: names the repository already uses, data owner, policy owner,
  state owner, side-effect owner, failure owner, and caller owner.
- Candidate boundary ledger: at least three candidate boundaries when a new abstraction is being
  chosen, including "no new abstraction yet" or "keep local duplication" when plausible.
- Public-promise ledger: what the abstraction promises callers, what it deliberately hides, and what
  callers must not know.
- Side-effect ledger: network, database, filesystem, process, clock, randomness, queue, logging,
  cache, browser, framework, SDK, and provider effects.
- Test-shape ledger: pure tests, adapter tests, integration tests, mocks, call-order assertions, and
  the smallest behavior evidence that would prove the boundary.
- Layer-integrity ledger: import direction, new type references, DTO or ORM references, framework or
  infrastructure words in higher layers, exception propagation, transaction owner, condition
  location, and test-double location before and after the change.
- Layer-contract ledger when layered architecture is relevant: allowed dependency direction, domain
  forbidden imports, application use-case and port ownership, infrastructure implementation
  ownership, presentation entrypoint limits, DTO or ORM mapping boundaries, transaction owner, and
  domain-event recording versus dispatch boundary.
- Type-existence ledger: every new class, interface, function, module, service, manager, helper,
  port, adapter, policy, mapper, or wrapper and the evidence for why it cannot stay in an existing
  owner, local function, value object, domain method, or deliberate duplicate.
- Public-contract ledger: input type, output type, error meaning, null or empty semantics,
  idempotency behavior, ordering guarantees, and compatibility expectations before and after the
  change.
- Existing helpers, interfaces, adapters, patterns, tests, and configured command intents that cover
  the changed surface.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority repository instructions, selected main-route skills, and
  `.mustflow/config/commands.toml` have been checked for the current scope.
- The abstraction decision can be tied to current repository evidence, current diff evidence, or an
  explicitly prediction-only review.
- Missing future-change, ownership, public-promise, or test-shape evidence can be reported instead
  of guessed.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add, remove, inline, split, rename, or narrow abstractions directly tied to the reviewed change
  reason and verified by local source, tests, or configured command evidence.
- Keep duplication when similar code has different owners, different change reasons, or different
  public promises.
- Move policy decisions into a named owner and move side effects to shell, adapter, infrastructure,
  or delivery boundaries when that reduces caller knowledge or test cost.
- Replace vague abstractions with named concepts, concrete functions, explicit policies, typed
  variants, or local duplication when that lowers mode flags, conversion churn, mock count, or edit
  spread.
- Add focused tests that prove the public promise, pure policy, adapter mapping, side-effect boundary,
  reversibility, or caller outcome.
- Update directly synchronized route metadata, templates, docs, or package metadata when the
  abstraction skill itself or installed workflow surfaces change.
- Do not introduce a new layer, interface, base class, factory, strategy, DI container, event bus, or
  shared helper only because code looks similar today.
- Do not merge two call sites into one abstraction when their future changes, owners, failure
  semantics, or public promises are different.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the change reason before looking for duplication.
   - Write the sentence: "This code changes when ..."
   - If two similar blocks finish that sentence differently, treat the duplication as possibly
     intentional.
   - If several files finish that sentence the same way, treat a missing abstraction as possible.
2. Run the same-concept gate before deduplication.
   - Ask whether the candidates share the same domain noun in the repository's language. Treat
     `user`, `customer`, `member`, `account`, `profile`, `email`, `payment`, `refund`, and similar
     near-synonyms as different until ownership evidence says otherwise.
   - Ask whether failure handling and recovery are the same. Payment failure, notification failure,
     logging failure, search failure, and cache failure usually have different meanings even when
     their happy paths look similar.
   - Ask whether permission, privacy, audit, retention, and security boundaries are the same. Do not
     merge data handling only because the field names match.
   - Ask whether the data lifecycle is the same: creation, mutation, expiry, deletion, archival,
     replay, and legal or operational retention.
   - Ask whether behavior tests would tell the same story in natural language. Different test
     sentences are evidence for different concepts.
   - Ask whether the callers speak at the same abstraction level. A caller saying "confirm order"
     should not be forced to learn SQL, HTTP, Redis, S3, process environment, framework request, or
     provider SDK language.
   - Ask whether caching, transaction, retry, timeout, idempotency, and operational policies match.
   - Ask whether the merged name would become clearer. If the best name is `common`, `shared`,
     `utils`, `helper`, `base`, `manager`, `processor`, or `handleData`, reject or defer the merge.
   - Ask whether merging removes conditions or merely moves `type`, `mode`, `variant`, `provider`,
     `tenant`, `legacy`, `admin`, `refund`, or `coupon` branches into one central switch.
   - Ask whether changing one concept would break another concept's tests. If yes, the abstraction is
     coupling futures that should stay apart.
3. Build a small future-change ledger.
   - List at least three plausible next changes: new provider, new policy, new UI state, new input
     shape, new failure mode, new deployment mode, new tenant rule, or feature removal.
   - Mark each scenario as likely, speculative, or unknown. Do not design a tower for an unknown
     scenario.
4. Map vocabulary and ownership.
   - Prefer names already used by the repository over generic names such as `Manager`, `Helper`,
     `Common`, `Base`, `Core`, `Engine`, or `Util`.
   - Name who owns data, policy, state transition, side effect, failure translation, and public API.
   - For layered code, write the import contract before accepting the boundary:
     `presentation -> application -> domain`, `infrastructure -> application/domain`, and
     `domain -> no external layer`.
   - Treat domain imports of framework, HTTP, ORM, database, cache, queue, filesystem, environment,
     logger, config, infrastructure, or provider SDK code as failure unless the repository has a
     stronger local rule.
   - Treat application imports of concrete infrastructure as failure. Application code may define
     action-oriented use cases and capability-named ports, then depend on domain code and those
     ports.
   - Treat infrastructure as the owner of SQL, ORM models, API clients, message brokers, cache
     clients, file storage, and third-party SDKs. Infrastructure implements ports; it should not own
     business decisions.
   - Treat presentation code as an entrypoint that calls application use cases only. A controller,
     router, resolver, CLI handler, or UI event handler that calls repositories, gateways, database
     clients, cache clients, external SDKs, or provider clients directly is a boundary failure.
5. Separate policy from execution mechanism.
   - Policy decides what should happen. Mechanism performs database, HTTP, SDK, filesystem, process,
     UI, queue, cache, clock, randomness, or framework work.
   - If a policy cannot be tested without the mechanism, look for a pure-core/imperative-shell,
     adapter, result, or command boundary.
   - Put business decisions in domain entities, value objects, policies, or domain services; put
     workflow orchestration, authorization sequencing, transaction boundaries, persistence calls, and
     external side effects in application use cases; put transport and provider mechanics in
     infrastructure or presentation.
   - Keep HTTP request or response DTOs in presentation or application boundary mapping, ORM models
     in infrastructure, and provider payloads at adapter boundaries. Do not pass those shapes into
     domain objects.
   - Let domain objects record domain events as facts. Dispatch them from application or
     infrastructure boundaries so domain code does not know Kafka, SNS, webhooks, queues, or SDKs.
6. Decide the public promise before writing the abstraction.
   - Name what callers may rely on.
   - Name what callers must not know: order of internal calls, provider dialect, DB rows, retry
     machinery, cache shape, DTO fields, or framework lifecycle.
   - Reject an abstraction whose promise is only "shared code lives here."
7. Compare at least three candidate boundaries.
   - Include one candidate that keeps the code local or duplicated.
   - Include one candidate that extracts the smallest named rule or operation.
   - Include one candidate that isolates the side-effect mechanism.
   - Score each candidate by same reason-to-change, caller ignorance, test shape, reversibility,
     public-surface risk, and likely next-change edit count.
8. Prefer no new file on the first pass unless ownership is clear.
   - Local extraction inside the current module is often enough to reveal the real boundary.
   - Create a new module only when the owner, direction, public promise, and tests are already
     visible.
9. Keep the abstraction reversible.
   - A good early abstraction can be inlined without changing behavior, public contracts, tests, or
     caller meaning.
   - If rollback would require editing many callers, schemas, or docs, the abstraction may already be
     too public for the evidence available.
10. Check over-abstraction signals.
   - One tiny behavior change touches many abstraction files.
   - A helper grows `mode`, `type`, `variant`, `provider`, `source`, `legacy`, `dryRun`, or
     `skipValidation` flags.
   - The names are vague: `Manager`, `Helper`, `Common`, `Base`, `Core`, `Engine`, `Processor`, or
     `Util`.
   - An interface has one implementation and one caller with no real swap axis.
   - A `Service`, `Manager`, `Helper`, `Util`, `Common`, `Base`, `Abstract`, or `IThing` name exists
     without a precise sentence proving why a domain, use-case, policy, adapter, value-object, or
     local function name is impossible.
   - A `Manager` does not manage a real lifecycle such as create, start, stop, retry, cleanup,
     ownership transfer, pooling, sessions, or process/resource lifetime.
   - An interface is not an external I/O port, does not have at least two real implementations, is
     not needed for a boundary fake, and does not protect against a third-party, database, queue,
     cache, filesystem, network, or provider dependency.
   - A wrapper only forwards the same inputs to another object and returns the same result without
     enforcing a rule, mapping a boundary model, changing a transaction boundary, or coordinating a
     workflow.
   - A helper owns a business rule that belongs on a domain entity, value object, domain policy, or
     named use case.
   - A shared utility was extracted after only two similar usages without evidence that the same
     concept will change for the same reason.
   - An abstraction exists only because a future variation might happen, with no current second
     implementation, port boundary, policy isolation, or caller ignorance benefit.
   - Tests mock internal plumbing, call order, factories, container wiring, or pass-through methods.
   - DTOs or value objects are converted through several layers without a policy boundary.
   - Errors are normalized so aggressively that retryability, provider cause, permission meaning, or
     user action disappears.
   - Config, dependency injection, registration, reflection, proxy, or event-bus wiring is more
     complex than the logic it protects.
   - Performance-sensitive paths hide work behind dynamic dispatch, proxies, reflection, event buses,
     repeated adapters, or unbounded fan-out.
11. Check under-abstraction signals.
    - The same business rule, authorization decision, eligibility check, status transition, or policy
      constant is scattered.
    - External SDK, DB row, HTTP response, CLI output, process environment, framework object, or UI
      shape leaks through many layers.
    - Core policy needs a full server, database, provider API, browser, queue, or filesystem to test.
    - Raw request inputs, provider payloads, ORM rows, or UI view models travel deep into the app.
    - Provider errors, database errors, HTTP statuses, or framework exceptions leak into domain,
      UI, CLI, or user-facing text.
    - Policy numbers, time windows, feature flags, tenant exceptions, retry counts, or default values
      are hardcoded in several places.
    - Dependencies point from domain or low-level code toward delivery, framework, provider, or
      orchestration code without an explicit inversion boundary.
12. Check post-refactor layer integrity.
    - Compare import direction before and after the refactor. Flag new reverse dependencies, cycles,
      or high-level modules importing lower-level implementation details directly.
    - Search higher-level policy or domain code for newly introduced infrastructure words such as
      SQL, ORM, Redis, S3, bucket, HTTP client, `fetch`, framework request or response, process
      environment, filesystem, queue client, provider SDK, or raw cache key language.
    - Check whether domain objects now reference API request DTOs, response DTOs, ORM rows, database
      table shapes, provider payloads, or UI view models.
    - Check whether domain models contain persistence, HTTP, framework, environment, logging, cache,
      queue, filesystem, or provider-SDK language.
    - Check whether application use cases are named by user actions and workflow outcomes, such as
      `PlaceOrder`, `CancelOrder`, `ApplyCoupon`, or `CapturePayment`, instead of broad nouns such
      as `OrderService`.
    - Check whether ports are named by the capability the use case needs, while implementations are
      named by technology or provider. Prefer capability names such as `LoadOrderPort`,
      `SaveOrderPort`, `ChargePaymentPort`, or `SendReceiptPort` over vague one-implementation
      `IFooService` shapes.
    - Check whether external exceptions such as database, provider, filesystem, framework, or SDK
      errors now cross into domain, application, CLI, UI, or user-facing code without translation.
    - Name the transaction owner. A lower-level repository, adapter, or helper should not secretly
      orchestrate a business workflow by opening a transaction around several owners.
    - Inspect new conditions. Domain branches should not appear in adapters or repositories; transport
      and provider branches should not leak into policy objects.
    - For simple CRUD with no meaningful business invariants, check that the code did not invent
      fake aggregates, empty domain services, ceremonial ports, or multi-layer pass-through files.
    - Compare public contracts: inputs, outputs, errors, absence semantics, empty collection behavior,
      idempotency, ordering, and compatibility.
    - Check test doubles. Mocks should attach to external ports, repositories, clocks, filesystem,
      network, browser, queues, or provider clients, not private internal choreography.
    - Assume the refactor broke the layer boundary and list the five most suspicious locations with
      evidence from imports, type references, exception flow, condition placement, transaction owner,
      or test dependencies. A bare "no issue found" is not enough unless the inspected evidence is
      named.
13. Choose the smallest repair.
    - For over-abstraction, inline, collapse pass-through layers, remove decorative interfaces,
      split mode flags, move configuration out of the core path, or keep duplication.
    - For under-abstraction, name the missing policy, adapter, mapper, result, state transition, or
      side-effect boundary.
    - If both are present, fix the part that reduces caller knowledge and test cost first.
    - Before finishing generated or heavily refactored code, run a deletion pass: remove or justify
      single-caller abstractions, implementation-only interfaces, stateless wrapper classes,
      pass-through methods, generic helpers, vague managers, and future-only ports.
    - Keep a new type only when the type-existence ledger proves a current rule, boundary, lifecycle,
      public promise, side-effect shell, test seam, or change reason that cannot live more simply in
      an existing owner.
14. Verify behavior and boundary shape.
    - Prefer tests that assert the public promise or observable outcome, not private collaborator
      choreography.
    - Use mocks only at true external boundaries.
    - Run the narrowest configured command intents that cover changed code, tests, docs, templates,
      package metadata, or installed workflow surfaces.

<!-- mustflow-section: postconditions -->
## Postconditions

- The abstraction's reason-to-change, owner, public promise, hidden implementation details, side
  effects, and test shape are explicit or reported as missing.
- At least three boundary candidates were compared before a new abstraction was accepted, or the
  task explains why an existing abstraction was simply audited.
- Deduplication was accepted only when domain meaning, failure policy, security boundary, lifecycle,
  caller language, operational policy, and test story align.
- Post-refactor layer integrity was checked through imports, forbidden type references, exception
  translation, transaction owner, condition placement, public-contract comparison, and test-double
  boundaries where relevant.
- Layer boundaries were accepted only when domain, application, infrastructure, and presentation
  dependency rules are explicit, or reported as not applicable for the code shape.
- Vague services, managers, helpers, utilities, bases, abstracts, future-only interfaces,
  pass-through wrappers, and fake-DDD CRUD layers were removed, justified, or reported.
- Over-abstraction and under-abstraction signals were fixed, ruled out, or reported with evidence.
- Any new abstraction reduces caller knowledge, change spread, test mock cost, side-effect leakage,
  or repeated policy drift.
- Any deliberate duplication has a named reason and owner.
- Any remaining abstraction risk is reversible, deferred with a concrete follow-up, or reported as a
  public-surface risk.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured checks that cover the changed abstraction, public promise, tests,
template surface, package metadata, or workflow docs.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the change reason is unclear, do not create a new shared abstraction. Keep the code local,
  report the missing change reason, or ask for the product rule when guessing would be risky.
- If future-change scenarios are speculative, prefer reversible local structure over public
  interfaces, broad base classes, or default-template additions.
- If ownership cannot be named, do not create an ownerless helper. Use `module-boundary-review` or
  `change-blast-radius-review` when the missing owner is broader than the abstraction.
- If tests become more mock-heavy after the abstraction, revisit the boundary before weakening the
  tests.
- If the abstraction would change behavior, public contracts, migrations, or security decisions,
  switch to the relevant narrower skill before continuing.
- If a configured command fails, preserve the failing intent and use `failure-triage` before making
  unrelated edits.

<!-- mustflow-section: output-format -->
## Output Format

Include:

- Abstraction boundary reviewed
- Change reason and future-change scenarios
- Candidate boundaries compared and chosen boundary
- Public promise and hidden implementation details
- Data, policy, state, side-effect, and failure owners
- Same-concept gate result for deduplication candidates
- Layer dependency contract and forbidden import result when relevant
- Type-existence and deletion-pass result
- Layer-integrity report: imports, forbidden references, exception flow, transaction owner,
  condition placement, public-contract diff, and test-double boundary
- Over-abstraction signals found, fixed, ruled out, or deferred
- Under-abstraction signals found, fixed, ruled out, or deferred
- Test shape and mock-boundary decision
- Files changed or recommended
- Command intents run
- Skipped checks and reasons
- Remaining abstraction risk and reversibility note
