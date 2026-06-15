---
mustflow_doc: skill.change-blast-radius-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: change-blast-radius-review
description: Apply this skill when code is created, changed, reviewed, or reported and maintainability needs review by predicting the next-change blast radius, deletion path, policy owner, workflow owner, controller or service responsibility, boolean and option-mode sprawl, scattered domain rules, scattered authorization, state-transition ownership, direct time or randomness, transaction and external-call coupling, retry idempotency, cache-as-truth decisions, config flag combinations, tenant or partner hardcoding, legacy branch isolation, DTO/entity/view model mixing, nullable meaning, swallowed exceptions, low-context logs, implementation-coupled tests, mock-heavy tests, decorative abstraction, premature DRY, hidden ordering dependency, event contract visibility, migration/runtime compatibility, or feature removal boundary.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.change-blast-radius-review
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

# Change Blast Radius Review

<!-- mustflow-section: purpose -->
## Purpose

Review maintainability by predicting where the next change, failure, retry, migration, or deletion
will spread.

The review question is not "is this code clean?" It is "if the policy changes, where do I edit;
if the flow fails halfway, what state remains; if the event runs twice, is it safe; and if the
feature is removed, what can I delete?"

<!-- mustflow-section: use-when -->
## Use When

- Code review, implementation, or refactor work touches domain policies, controllers, services,
  use cases, workflows, DTOs, entities, view models, authorization, state transitions, persistence,
  transactions, external APIs, retries, caches, config flags, tenant branches, migrations, events,
  logging, tests, abstractions, helpers, or legacy compatibility.
- A single requirement would force edits across several files, layers, modules, frontend code, SQL,
  jobs, events, cache keys, tests, or docs.
- A file or service has several unrelated reasons to change under one broad noun such as `Manager`,
  `Helper`, `Processor`, `Handler`, or `Service`.
- A review needs to decide whether to use `module-boundary-review`, `structure-first-engineering`,
  `testability-boundary-review`, `failure-integrity-review`, `cache-integrity-review`,
  `auth-permission-change`, `state-machine-pattern`, `strategy-pattern`, `result-option`, or
  `database-migration-change`.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The only concern is module ownership, import direction, DTO leakage, or co-change evidence; use
  `module-boundary-review` as the primary skill.
- The task is early implementation structure for a known feature; use `structure-first-engineering`
  first and this skill only for predicted change-spread evidence.
- The main issue is deterministic tests or hidden test inputs; use `testability-boundary-review`.
- The main issue is a specific failure path, cache invariant, authorization boundary, migration,
  state machine, strategy, result type, or dependency-injection seam; use the narrower skill first.
- The change is a tiny pure helper with explicit inputs, deterministic output, no policy, no I/O,
  no shared state, and no meaningful future-change branch.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, current diff or target files, and the requirement or policy that caused the change.
- Change-reason ledger: which business rule, user flow, data shape, failure path, compatibility
  rule, tenant exception, or operational behavior would make this code change next.
- Blast-radius ledger: controllers, services, repositories, entities, DTOs, frontend conditions,
  SQL, migrations, batches, events, caches, config, tests, docs, and templates touched by one reason.
- Ownership ledger: source of truth for domain rule, authorization rule, state transition, retry
  rule, transaction boundary, cache truth, event contract, log context, and data model language.
- Deleteability ledger: what files, flags, columns, event handlers, cache keys, tests, and branches
  would need removal if the feature or policy disappears.
- Test and operations evidence: mocks, call-order assertions, logs, trace IDs, retry/idempotency
  behavior, migration compatibility, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required inputs are available, or missing blast-radius, ownership, deleteability, or operational
  evidence can be reported without guessing.
- If the review finds a concrete module, failure, cache, authorization, migration, state-machine,
  testability, or pattern issue, use the narrower skill before editing that part.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Move or name ownership for domain policy, authorization, state transitions, workflow sequencing,
  retry/idempotency, transaction boundaries, DTO mapping, cache truth, config interpretation, event
  contracts, logs, migrations, and tests directly tied to the reviewed change-spread risk.
- Split responsibilities only when the split follows different reasons to change, not because a
  file is long or the names look untidy.
- Replace boolean mode flags, trash-can option objects, tenant hardcoding, legacy branches, and
  premature shared helpers with explicit concepts, named policies, adapters, or duplicated code
  when that reduces future change spread.
- Add focused tests that prove a policy owner, state transition, idempotent retry, deletion boundary,
  migration compatibility, or stable observable outcome.
- Do not add decorative interfaces, broad service layers, generic managers, speculative factories,
  or shared helpers that hide rather than reduce the next-change blast radius.

<!-- mustflow-section: procedure -->
## Procedure

1. Start with the next likely change.
   - Ask: "If this requirement changes next month, which files move?"
   - If one policy edit needs controller, service, repository, SQL, frontend, batch, cache, and test
     edits, the code is a puzzle, not a boundary.
2. Count reasons to change, not lines.
   - A short file can still hold signup, login, points, notification, referral, admin blocking, and
     reporting rules.
   - Split by different change reasons, not by noun labels.
3. Keep controllers as doors, not bosses.
   - Controllers should parse requests, call an application boundary, and map the result.
   - Treat controller `if`, `for`, state mutation, external API calls, discount logic, inventory
     checks, or notification orchestration as workflow leakage.
4. Reject junk-drawer services.
   - Broad names such as `OrderService`, `UserService`, `Manager`, `Helper`, `Processor`, and
     `Handler` often hide unrelated workflows.
   - Name the actual responsibility or split by workflow owner when changes would not arrive
     together.
5. Decode boolean mode flags.
   - `createUser(user, true)` and `sendNotification(user, true, false)` mean one function already
     has hidden modes.
   - Replace modes with named variants, policy objects, strategy objects, or separate functions when
     behavior contracts differ.
6. Inspect option objects for combinatorial behavior.
   - Fields such as `skipValidation`, `dryRun`, `force`, `source`, `mode`, `type`, `retry`,
     `legacy`, and `includeInactive` can turn one call into many products.
   - If field combinations change behavior, use explicit mode types or separate boundaries.
7. Find the policy source of truth.
   - Repeated rules such as "VIP gets free shipping" across backend, frontend, SQL, batch, and
     cache code are not harmless duplication.
   - Name one owner and make other layers consume facts or capabilities from that owner.
8. Centralize authorization policy.
   - Scattered checks such as `role == admin`, `ownerId == user.id`, or membership scans make policy
     changes scary.
   - Use `auth-permission-change` when action permission needs one policy source and denial tests.
9. Make state transitions visible.
   - Status values are not enough. Review where `status = ...` happens and which transitions are
     legal.
   - Use `state-machine-pattern` when allowed transitions need to be represented explicitly.
10. Pull time, randomness, and generated IDs to a boundary.
    - Direct `new Date()`, `Date.now()`, `LocalDateTime.now()`, UUIDs, random order numbers, random
      filenames, and generated referral codes hide reproducibility and future policy changes.
    - Use explicit time, generator, or identifier inputs from the shell.
11. Draw the transaction boundary.
    - When several saves happen, ask what remains if the middle save fails.
    - If the answer is unclear, use `failure-integrity-review` or the relevant database skill before
      changing behavior.
12. Separate external calls from committed state.
    - DB save, payment API, DB save, notification API in one flow creates timeout, retry, and
      duplicate-effect traps.
    - Prefer local state plus outbox, idempotency keys, or effect descriptions when the operation
      must survive partial failure.
13. Check retry idempotency.
    - `retry(3)`, queues, webhooks, schedulers, and manual replays are dangerous without a duplicate
      rule.
    - Ask what happens when the same event arrives twice.
14. Reject cache-as-truth for important decisions.
    - Cache can speed reads, but it should not become the source of truth for authorization, payment
      eligibility, inventory, or other critical decisions.
    - Use `cache-integrity-review` when cache freshness or fallback can mislead the decision.
15. Count config flag combinations.
    - Flags such as `enableNewPolicy`, `useLegacyFlow`, `skipValidationForPartner`, and
      `specialCaseTenantIds` can create untested products inside one code path.
    - Name the supported combinations or isolate the variation behind a policy boundary.
16. Isolate tenant, partner, country, product, and app-version exceptions.
    - Hardcoded `tenantId`, `partnerCode`, country code, app version, or product ID branches are
      product debt, not just conditionals.
    - Prefer configured capabilities, adapters, policy tables, or explicit exceptions with removal
      owners.
17. Keep legacy compatibility out of the new core.
    - `legacy`, `old`, `v1`, `deprecated`, and `temp` branches inside the main path pull old rules
      into new code.
    - Put compatibility in adapters, translators, migration paths, or isolated old-entry boundaries.
18. Separate data-object languages.
    - DB entities, API DTOs, view models, external provider payloads, and domain objects should not
      quietly become the same object.
    - If one side changes and another side must follow, name the mapping owner.
19. Give nullable values a reason.
    - `null` must not mean absence, unknown, failed calculation, forbidden access, and provider
      timeout at the same time.
    - Use variants, result types, or explicit fields that tell callers why a value is missing.
20. Do not hide exceptions as normal data.
    - `catch (e) { return null }`, `catch (e) { log.warn(...) }`, and empty catches make the system
      lie far from the failure.
    - Use visible failure values, typed errors, or explicit degraded modes.
21. Make logs traceable, not decorative.
    - Logs like `start` and `failed` without order ID, user ID, request ID, external call ID, tenant,
      or operation name do not help future maintainers.
    - Add safe correlation context when it is the only way to connect the failure path.
22. Keep tests attached to behavior.
    - Tests that assert private methods, mock call order, or internal collaborator choreography make
      refactors expensive.
    - Prefer outcomes, state transitions, persisted commands, emitted events, or public results.
23. Treat mock count as a change-impact sensor.
    - More than three mocks deserves a responsibility review.
    - Five or more mocks usually means the class absorbs too many change directions.
24. Validate abstraction against real volatility.
    - Interfaces, factories, strategies, and abstract classes help only when the variation axis is
      real.
    - Ask whether there are two real implementations now or a known future swap along this exact
      axis.
25. Do not DRY together different futures.
    - Removing duplication is harmful when two similar blocks change for different reasons.
    - Keep duplication when it preserves independent policy evolution.
26. Make required ordering explicit.
    - Initialization, validation, save, event publication, cache invalidation, notification, and
      cleanup steps can be order-sensitive.
    - If swapping two lines would break correctness, encode the sequence in a named workflow,
      transaction, state transition, or command object.
27. Treat events as invisible function calls until proven otherwise.
    - `publish(Event)` hides subscribers, failure behavior, ordering, duplicate delivery, and
      compatibility.
    - Name the event contract, listener expectations, idempotency, and failure handling.
28. Pair migrations with runtime compatibility.
    - Schema changes, enum additions, defaults, indexes, and backfills must be checked against old
      code on new schema and new code on old data.
    - Use `database-migration-change` when deploy order or data backfill matters.
29. Run the deletion test.
    - Ask: "If this feature disappears, what do I delete?"
    - If flags, columns, conditions, events, caches, batch jobs, UI checks, and tests are scattered,
      the feature is already rooted too deeply.
30. Pick the smallest boundary repair.
    - If one owner is missing, introduce that owner.
    - If one mode is hidden, name that mode.
    - If the risk is too broad for the current task, report the exact next-change or deletion path
      that remains unpredictable.

<!-- mustflow-section: postconditions -->
## Postconditions

- The next likely policy or workflow change has a named owner and a predictable edit path, or the
  unpredictable spread is explicitly reported.
- Important side effects, transactions, retries, events, caches, config flags, migrations, and logs
  have clear owners or remaining risks.
- Boolean modes, option-object combinations, tenant exceptions, legacy compatibility, and premature
  shared helpers are either tightened or named as future-change traps.
- Tests and observability focus on outcomes, state, events, idempotency, and public behavior rather
  than private choreography.
- The deletion path for the changed feature or policy is clearer, or the remaining deletion debt is
  named.

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

Prefer the narrowest checks that cover the changed owner, behavior, tests, template surface, or
public contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the blast radius cannot be predicted from current evidence, report the missing owner, hidden
  dependency, unknown subscriber, migration uncertainty, or deletion path instead of inventing a
  clean boundary.
- If the review discovers security, cache, failure, migration, testability, or state-machine risk,
  switch to the narrower skill before editing that part.
- If a boundary repair would change behavior, use `behavior-preserving-refactor` or
  `repro-first-debug` before continuing.
- If a command fails, use `failure-triage` before further edits.

<!-- mustflow-section: output-format -->
## Output Format

- Change blast radius reviewed
- Next likely change and owner
- Files, layers, jobs, caches, events, tests, docs, or migrations in the blast radius
- Policy, authorization, state, transaction, retry, cache, config, tenant, legacy, DTO, nullable,
  log, test, abstraction, ordering, event, migration, or deletion findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining change-spread or deletion risk
