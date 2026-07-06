---
mustflow_doc: skill.module-boundary-review
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: module-boundary-review
description: Apply this skill when code is created, changed, reviewed, or reported and module separation, cohesion, coupling, change axes, stability direction, data ownership, rule ownership, failure ownership, import direction, circular dependency, DTO leakage, shared/common/utils growth, mock-heavy tests, repeated policy conditions, enum interpretation, repository business logic, anemic domain, domain-to-I/O leakage, transaction boundary mismatch, event naming, public API bloat, caller sequencing, premature reuse, co-change history, bug/fix distance, config ownership, log responsibility, exception translation, cache invalidation ownership, repeated authorization checks, frontend/backend policy leakage, time policy, batch or worker bypass, shallow modules, or temporary-code accumulation can make a change spread beyond its real owner.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.module-boundary-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Module Boundary Review

<!-- mustflow-section: purpose -->
## Purpose

Review module separation by tracing change spread, ownership, and ignorance boundaries rather than
folder names, layer names, or file labels.

The review question is not "which folder should this file live in?" It is "when this rule changes,
who must change, who owns the data, who owns the failure, and who should not need to know?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports module boundaries, package boundaries, folder splits,
  services, repositories, validators, mappers, helpers, shared utilities, DTOs, domain models,
  policies, use cases, workers, batches, events, caches, permissions, config reads, or public module
  APIs.
- A change touches several folders, layers, or modules for one reason, or several differently named
  files repeatedly change together.
- A review claims that layering, clean architecture, DDD, modular monolith, feature folders,
  repositories, services, shared utilities, events, DTOs, or frontend/backend separation is clean.
- A design starts from feature folders, technical layers, or CRUD nouns and may be missing the real
  split criterion: who changes the code, when, why, and independently of which other owners.
- A module depends on a more volatile detail such as a provider SDK, UI route flow, database query
  shape, external response, framework object, config dialect, or generated transport model.
- A change creates many thin files whose public APIs are wider than the hidden implementation, or
  whose abstractions only forward calls, wrap switches, or rename CRUD.
- The suspected issue is not a large service split yet, but a local module boundary that leaks
  business rules, data shape, failure handling, sequencing, or ownership to neighbors.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task designs or reviews service ownership, team ownership, cross-service data ownership,
  deployment units, queues, large modular-monolith boundaries, or operational recovery; use
  `service-boundary-architecture`.
- The task asks for an architecture review before choosing a refactor or abstraction; use
  `architecture-deepening-review` first and this skill only for module-leak evidence.
- The task is implementing a new feature where early data flow and failure model decisions dominate;
  use `structure-first-engineering` first and this skill as an adjunct when module ownership is the
  sharpest risk.
- The task is only a behavior-preserving move or rename with known behavior evidence; use
  `behavior-preserving-refactor`.
- The only concern is a single pattern such as adapter, facade, strategy, state machine, dependency
  injection, result type, or composition over inheritance; use that narrower pattern skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Change reason: the policy, feature, bug, data shape, failure path, or operational behavior that
  caused the edit.
- Change-axis ledger: likely independent changes over the next useful planning horizon, including
  policy, external provider, data model, UI flow, permission, pricing, billing, deployment, and
  operational changes, plus who or what would cause each change.
- Changed-file spread: folders, modules, layers, packages, tests, generated files, templates, and
  docs touched by the same reason.
- Co-change evidence when available: recent commits, PRs, repeated paired files, or local diff
  history showing files that usually move together.
- Module graph evidence: imports, exports, public APIs, call sites, dependency direction, cycles,
  shared helpers, DTO flow, and configuration reads.
- Stability evidence: which modules many callers rely on, which modules change because external
  details move, and whether dependencies point toward the more stable policy owner rather than the
  more volatile implementation detail.
- Change-simulation evidence: expected files touched for at least three concrete next changes, such
  as changing a payment provider, adding a pricing rule, changing admin UI flow, changing invoice
  format, changing permissions, or adding a worker path.
- Configured guardrail evidence when available: `code/module-boundary` results for
  `.mustflow/config/module-boundaries.toml` layer deny rules, public entrypoints, feature imports,
  shared budgets, and import cycles.
- Ownership evidence: source of truth for data, owner of policy decisions, owner of failure handling,
  owner of cache invalidation, owner of time and config interpretation, and owner of authorization.
- Test evidence: number and kind of mocks, pure-domain tests, integration tests, worker or batch
  entry tests, and whether callers need to know internal call order.
- Relevant command-intent contract entries for tests, builds, docs, release checks, and mustflow
  validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required inputs are available, or missing ownership, import, co-change, test, or failure evidence
  can be reported without guessing.
- If the review finds security, privacy, cache, concurrency, database, API, or failure-integrity
  risk, also use the relevant narrower skill before editing that part.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Move or tighten policy ownership, DTO boundaries, mapper boundaries, module public APIs, import
  direction, config injection, exception translation, cache invalidation ownership, authorization
  checks, event facts, worker entrypoints, and tests directly tied to the reviewed module boundary.
- Add small facades, use-case functions, policy objects, pure domain helpers, adapters, or result
  mappings only when they reduce caller knowledge, co-change spread, duplicate rules, or mock cost.
- Add focused tests that prove the boundary contract, such as one policy owner, caller order hidden
  inside a module, batch and online paths using the same use case, or frontend receiving a decision
  instead of reconstructing backend state.
- Do not split files, introduce layers, rename modules, or create broad shared helpers only because
  the current folder looks untidy.
- Do not move behavior across a public contract, database owner, event contract, or permission
  boundary without preserving compatibility or reporting the migration risk.

<!-- mustflow-section: procedure -->
## Procedure

1. Start with change spread, not folder names.
   - Name the single reason for the change.
   - Count how many modules, folders, layers, tests, docs, and templates changed for that one reason.
   - If one policy edit forces controller, service, repository, mapper, utility, constants, worker,
     and UI edits together, treat the module boundary as suspect.
   - Before accepting a new split, list the independent change axes first. Do not start with
     `controllers`, `services`, `repositories`, `utils`, or CRUD nouns unless the repository already
     proves those are the real change units.
2. Group by reason to change.
   - Files with different names but the same change reason are one module candidate.
   - `UserService`, `UserValidator`, `UserMapper`, `UserPolicy`, and `UserHelper` changing together is
     evidence of sliced roles, not necessarily separated modules.
   - Write each candidate module as "this module changes when ...". If that sentence names more than
     one independent owner, split the candidate or report the boundary risk.
   - Prefer volatility names and business capabilities, such as pricing policy, payment provider,
     subscription lifecycle, invoice rendering, fraud check, fulfillment handoff, or entitlement
     decision, over role-sliced layer names when those better predict future edits.
3. Check import direction.
   - Infrastructure or low-level modules should not know high-level business use case names unless
     the repository intentionally uses that inversion.
   - Treat lower layers importing policy names such as plan, checkout, approval, permission, or
     subscription as evidence that the policy leaked downward.
   - Check stability direction. Code that many callers depend on should not import volatile details
     such as Stripe, Toss, Prisma, SQLAlchemy, React Router, FastAPI request objects, provider DTOs,
     raw SQL builders, generated clients, or `process.env` unless the repository explicitly makes
     that layer an edge adapter.
   - Prefer interfaces or ports owned by the using side when the abstraction protects stable policy
     code from an unstable provider, database, queue, cache, filesystem, network, framework, or UI
     detail.
4. Treat cycles as boundary failure until proven harmless.
   - If A imports B and B imports A, identify the missing concept, ownership decision, event, port, or
     data-flow direction.
   - Do not accept "they need each other" without naming the invariant that forces the cycle.
   - When the repository declares `.mustflow/config/module-boundaries.toml`, use the read-only
     `code/module-boundary` script-pack report as executable evidence before relying on prose-only
     boundary claims.
5. Trace DTO infection.
   - API response DTOs, request DTOs, ORM rows, provider payloads, and UI view models should not
     become domain, repository, batch, worker, or event models by default.
   - Convert at the boundary and keep internal decision shapes separate from external transport shapes.
6. Audit `common`, `shared`, `utils`, and `helpers`.
   - Low-level pure tools can be shared. Business rules in shared folders are usually ownerless
     policy.
   - If a shared helper imports domain words or changes with one product rule, move ownership closer
     to the domain that owns the rule.
7. Check module responsibility by verbs, not names.
   - A noun-named module that calculates unrelated coupons, points, email, inventory, admin alerts,
     and audit behavior is hiding a process, not a bounded responsibility.
   - A module deleted from the system should remove a coherent business capability, not random
     features from several flows.
8. Use tests as boundary sensors.
   - If one module's core rule test needs many mocks, the module probably knows too many external
     facts or mixes decision logic with orchestration.
   - Prefer pure rule tests for the owner and smaller integration tests for adapters and delivery.
9. Find repeated policy conditions.
   - Repeated `isPremium`, `status === PAID`, `plan === ENTERPRISE`, owner checks, feature flags, or
     time-window branches across modules mean the policy has no single owner.
   - Move interpretation to a policy object, domain method, use case, state machine, capability
     result, or other local pattern that callers can ask instead of reimplement.
10. Check enum spread.
    - Sharing a status value may be fine. Sharing every interpretation of that status across modules
      is not.
    - Refundability, notification behavior, inventory restoration, permission, and UI action
      visibility should have named owners, not scattered enum branches.
11. Check repository language.
    - Repository names such as `findRefundableOrders`, `findUsersEligibleForPromotion`, or
      `saveWithAuditAndNotify` usually mean persistence is making business decisions.
    - Repositories may expose data queries, but policy eligibility and side-effect orchestration need
      an owner above persistence unless the local architecture explicitly says otherwise.
12. Check anemic and overpowered domain shapes.
    - A domain object with only fields while services own every decision is a sign that rules moved
      away from the data that explains them.
    - A domain object that sends email, opens transactions, calls HTTP, invalidates Redis, or reads
      process environment knows too much about the outside world.
13. Check transaction boundaries against module boundaries.
    - If one use case must transactionally mutate many owners, decide which facts are truly one
      consistency boundary and which can move through outbox, event, worker, or reconciliation.
    - Do not hide a cross-owner consistency problem behind a single large service method.
14. Check event language.
    - Events should describe domain facts such as `OrderPaid`, `SubscriptionCancelled`, or
      `RefundApproved`, not storage mechanics such as `UserTableUpdated` or `OrderRowInserted`.
    - A technical event name often exposes another module's internals instead of publishing a useful
      fact.
15. Check public module API size and caller sequencing.
    - Too many exported functions can mean internals are on display.
    - If callers must call `create`, then `apply`, then `reserve`, then `mark`, the module has handed
      out an assembly manual instead of owning the sequence.
    - A good module should have a small door and a deeper inside. If most files only expose one-line
      forwarding methods, wrapper services, or renamed CRUD calls, treat the split as shallow module
      theater until a real hidden decision or variation point is named.
    - A public API wider than the behavior it hides is usually not a boundary; it is implementation
      leakage with extra navigation.
16. Check reuse claims.
    - "Used in many places" is not enough reason to extract a common helper.
    - Reuse is safe only when the callers change for the same reason. Similar code from different
      business contexts may need duplication until the shared concept is real.
17. Check history, not only the current diff.
    - Recent commits and repeated PR pairings can reveal true module candidates better than folder
      names.
    - If a file repeatedly receives temporary exceptions in the same direction, name the missing
      concept instead of adding another branch.
18. Run change simulations.
    - Pick at least three plausible next changes from the change-axis ledger.
    - For each scenario, list which modules should change and which modules must stay ignorant.
    - If changing a provider, UI flow, invoice format, permission rule, or pricing rule repeatedly
      crosses the same unrelated modules, treat that as hidden coupling.
    - If a module would break because a different module's test changed, identify whether the
      boundary couples futures that should be independent.
19. Compare bug location with fix location.
    - If the symptom appears in one module but the fix belongs in an unrelated utility, policy, or
      mapper, the responsibility line may be bent.
20. Check config, time, and logging responsibility.
    - Raw `process.env`, feature flag, remote config, clock, timezone, locale, and date parsing should
      usually be read at the edge and injected as explicit values.
    - Logs that mention another module's job, such as payment code logging welcome-email failure, are
      strong ownership evidence.
21. Translate exceptions at boundaries.
    - Database, provider, filesystem, framework, and payment errors should not leak through every
      layer unchanged.
    - Convert external failure dialect into the receiving module's language while preserving safe
      diagnostic causes.
22. Check cache invalidation, authorization, frontend policy, and alternate entrypoints.
    - Cache invalidation belongs near the data owner, not scattered across random callers.
    - Authorization checks repeated in controllers should move to one use-case entry, policy, or
      capability boundary.
    - Frontend code should receive allowed actions or decisions when possible, not reconstruct
      backend policy from internal statuses.
    - Batch, cron, worker, and admin tools should use the same use case or policy owner as online
      requests instead of bypassing validations, events, logs, and permissions.
23. Attack the design before accepting it.
    - Name the three modules or abstractions most likely to rot first.
    - For each, name the change request that would break it, the owner that would cause the change,
      and whether the blast stays inside one module.
    - Remove or redesign shallow wrappers, central managers, enum-switch strategies, provider-shaped
      "neutral" ports, configuration-driven logic hiding, event-bus call hiding, and CRUD stamp
      modules when they fail the attack.
24. Decide the smallest response.
    - If evidence is strong and the edit is in scope, make the smallest boundary fix.
    - If the fix would be broad, report the module boundary risk and the first safe split point.
    - If evidence is weak, leave the structure alone and report the missing co-change or ownership
      evidence.

<!-- mustflow-section: postconditions -->
## Postconditions

- The changed reason, changed-file spread, co-change evidence, data owner, policy owner, failure
  owner, and public module surface are explicit or reported as missing.
- The relevant change axes and stability direction are explicit, or reported as missing evidence.
- At least three change simulations were checked when designing or accepting a new module boundary,
  unless the task is only auditing an existing small local diff.
- Import direction, cycles, DTO spread, shared helper ownership, repository policy leakage, domain
  I/O leakage, transaction mismatch, event naming, caller sequencing, duplicated policy, and alternate
  entrypoints are fixed or reported where relevant.
- Shallow module signals such as role-sliced CRUD layers, one-line wrappers, provider-shaped ports,
  ownerless managers, event-bus call hiding, config-hidden logic, and public API bloat are removed,
  justified, or reported.
- Any new abstraction hides a named responsibility and reduces caller knowledge, change spread, or
  test mock cost.
- Behavior, public contracts, permissions, data ownership, and failure semantics remain intact or
  are reported as risks.

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

Prefer the narrowest configured test, build, docs, release, or mustflow intent that covers the changed
module boundary. Use release or docs checks when templates, public docs, package metadata, public APIs,
schemas, generated clients, or install surfaces change.

When the command contract and script-pack metadata expose it, `code/module-boundary` may provide
read-only evidence for configured import-boundary rules. A missing module-boundary config is
non-blocking evidence that no executable boundary rules were enforced, not proof that the module
design is clean.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If ownership cannot be identified, report the missing owner instead of creating a vague shared
  helper or new layer.
- If changing the boundary would require broad moves, public API migration, database ownership
  migration, or cross-team decisions, stop at the risk report and name the first safe follow-up.
- If tests require many mocks after the change, revisit the boundary before weakening assertions.
- If a configured command fails, preserve the failing intent and use `failure-triage` before making
  unrelated edits.

<!-- mustflow-section: output-format -->
## Output Format

- Module boundary reviewed
- Change reason, change axes, stability direction, and changed-file spread
- Co-change, import direction, cycle, DTO, shared helper, public API, caller sequencing, and test mock
  evidence
- Data owner, policy owner, failure owner, cache invalidation owner, config/time owner, and
  authorization owner where relevant
- Change simulations and most-likely-to-rot modules
- Shallow module signals found, fixed, justified, or deferred
- Boundary fixes made or recommended
- Evidence level: current diff, local source evidence, history evidence, configured-test evidence,
  missing, or not applicable
- Command intents run
- Skipped diagnostics and reasons
- Remaining module-boundary risk
