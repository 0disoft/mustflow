---
mustflow_doc: skill.type-state-modeling-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: type-state-modeling-review
description: Apply this skill when code is created, changed, reviewed, or reported and type design should make impossible states unrepresentable, including branded IDs, units, discriminated unions, nullable state fields, broad string statuses, DTO boundary types, raw external data, partial update inputs, Result error variants, permission capabilities, state transitions, exhaustiveness, any/cast usage, and non-empty collection invariants.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.type-state-modeling-review
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

# Type State Modeling Review

<!-- mustflow-section: purpose -->
## Purpose

Review types as runtime bug prevention, not just compiler appeasement.

The core question is: "Can this type represent a value the domain says cannot exist?" If yes, the type is a loose note, not a guardrail. Tighten the shape so invalid IDs, units, statuses, lifecycle states, partial inputs, raw external payloads, and impossible success or error combinations cannot quietly enter ordinary code.

<!-- mustflow-section: use-when -->
## Use When

- Code is created, changed, reviewed, or reported and the risk is invalid domain state hidden behind permissive types.
- TypeScript, JavaScript with JSDoc, Rust, Go, Kotlin, Swift, Java, C#, Python typing, database schemas, API schemas, GraphQL schemas, protobufs, OpenAPI contracts, or validation schemas introduce or change IDs, statuses, modes, DTOs, request or response shapes, error shapes, permissions, money, time, units, external payloads, or lifecycle states.
- Code uses broad primitives such as `string`, `number`, `boolean`, arrays, maps, `any`, `unknown`, casts, non-null assertions, optional fields, nullable fields, `Partial<T>`, untyped records, or generic payload names for domain values with stricter meaning.
- A review or final report claims a type is safe because it compiles, has validation somewhere else, is "just a DTO", is only used internally, or is currently populated by trusted code.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only a syntax or typecheck fix with no domain, boundary, invariant, lifecycle, error, or API shape risk.
- The task only changes one concrete state machine implementation; use `state-machine-pattern` first and this skill only for type-shape adjunct checks.
- The task only changes expected failure or absence handling; use `result-option` first and this skill only when the surrounding type shape still permits impossible states.
- The task only changes API compatibility or serialized output contracts; use `api-contract-change` or `public-json-contract-change` first and this skill only for domain-type boundary leakage.
- The language or local project style cannot express the invariant statically; report the limitation and require a constructor, parser, validator, test, or database constraint instead of pretending the type alone enforces it.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Domain invariant: the impossible states, invalid transitions, invalid IDs, unit mistakes, absence semantics, permission rules, or trusted-boundary assumptions the code must prevent.
- Current type surface: domain models, DTOs, database rows, API request and response types, form inputs, validation schemas, generated types, error types, permissions, state fields, and helper aliases.
- Construction path: where raw data becomes trusted data, where IDs and units are parsed, where variants are created, and where casts or assertions bypass checks.
- Boundary map: raw external payload, parsed input, create input, update input, persisted row, domain model, public response, internal event, queue message, and test fixture shapes.
- Exhaustiveness surface: match, switch, visitor, sealed hierarchy, enum handling, `never` or equivalent checks, default cases, and generated client behavior.
- Relevant command-intent contract entries for build, typecheck, tests, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available, or missing invariants can be reported without guessing.
- Existing local patterns for branded types, newtypes, discriminated unions, sealed classes, enums, validators, parsers, constructors, `Result`, `Option`, state machines, and schema validation have been searched before adding new helpers.
- If the type surface crosses persistence, external protocols, generated schemas, or public APIs, also apply the relevant database, adapter, migration, API, or JSON contract skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Replace broad primitives with branded types, newtypes, wrappers, enums, literal unions, sealed variants, discriminated unions, parser-produced types, or domain constructors when local style supports them.
- Split invalid optional or nullable field clusters into variants with required fields per state.
- Separate raw external DTOs, validated inputs, create inputs, partial update inputs, persisted rows, domain models, public responses, events, and queue messages.
- Add exhaustive handling helpers such as `assertNever` or the local equivalent, and update tests to cover impossible-state construction where the project has type-level or runtime boundary tests.
- Add focused validators, parsers, constructors, schema refinements, and database constraints only when types alone cannot enforce the invariant.
- Do not introduce a new type framework, broad generated-type rewrite, or global taxonomy when a local alias, constructor, or union fixes the current boundary.
- Do not hide uncertainty behind casts, non-null assertions, broad `Record<string, unknown>`, or comments that say a value "should" be valid.

<!-- mustflow-section: procedure -->
## Procedure

1. Ask the guardrail question first: can the current type construct a value the domain rejects? Name at least one concrete impossible example or state that the change must prevent.
2. Classify primitive domain values.
   - Split IDs such as user, post, team, order, tenant, account, provider, and public IDs into branded or wrapper types when accidental swapping is plausible.
   - Split money, currency, duration, timestamp, local date, timezone, ratio, percentage, byte count, and quantity values so unit confusion cannot compile or silently serialize.
3. Remove boolean flag soup.
   - Avoid several booleans that encode one lifecycle, such as `isLoading`, `isError`, `isSuccess`, `isPaid`, `isCancelled`, or `isDeleted`.
   - Use one discriminant, enum, sealed class, or state variant with required fields for each state.
4. Close status vocabularies.
   - Replace `status: string`, broad enum-like strings, and unchecked external strings with literal unions, enums, sealed variants, or validated parser output.
   - Keep unknown provider values at the boundary as parse errors, unknown variants, or reconciliation states instead of casting them into an internal status.
5. Split nullable and optional fields by state.
   - If a field is required in one state and invalid in another, make separate variants rather than a single object with many optional fields.
   - Define one absence meaning for `null`, `undefined`, `None`, or `nil`; do not mix "not loaded", "not applicable", "not found", and "intentionally empty" in one field.
6. Separate raw, validated, persisted, domain, and response types.
   - Raw external API, database row, form input, URL query, localStorage, webhook, queue, and file parse data should not be the same type as trusted domain data.
   - Create, update, patch, persisted, internal domain, public response, and event types should be named by responsibility even when their fields look similar.
7. Treat `Partial<T>`, `Pick<T>`, and `Omit<T>` as debt signals.
   - Use them for local mechanical transformations only when the resulting role is obvious and bounded.
   - Promote repeated or security-sensitive shapes into named types such as `UpdateUserProfileInput`, `PublicUserProfile`, or `PersistedUser`.
8. Narrow maps and records.
   - Check whether `Record<string, T>`, string-key maps, index signatures, metadata bags, and event payloads truly allow any key.
   - Use a closed key union, branded key, schema parser, or value narrowing when keys are locale, feature, role, plan, permission, status, or metric names.
9. Audit `any`, `unknown`, casts, and non-null assertions.
   - `unknown` must be narrowed by validation before use.
   - Repeated `as`, non-null `!`, force unwraps, unchecked type assertions, and `JSON.parse(...) as ...` usually mean the construction path is missing.
   - Keep unavoidable casts at one small boundary with a parser, invariant comment, or test that proves the assumption.
10. Model success, failure, and absence without impossible combinations.
    - Replace `{ success: boolean; data?: T; error?: E }` with a discriminated `Result<T, E>` or local equivalent.
    - Give `Result` an error type; a result without typed errors often loses the reason the caller needs.
    - Use `Option` or equivalent for meaningful absence, and convert absence to a typed error at the layer where absence becomes failure.
11. Model collection invariants.
    - Use a `NonEmpty` type, constructor, parser, database constraint, or runtime guard when empty collections are invalid.
    - Name sorted, unique, paginated, trusted, selected, active, or primary collections when those properties affect behavior.
12. Model permissions and capabilities by action.
    - Avoid scattering `role: string`, `isAdmin`, or boolean permission flags when access depends on role, plan, tenant, owner, resource state, or experiment.
    - Prefer capability, policy, or permission-result types that say what action is allowed and why.
13. Align lifecycle and temporal types.
    - Split new, persisted, active, deleted, archived, draft, published, expired, revoked, and restored variants when timestamps or IDs are only valid in some states.
    - Do not let `createdAt?`, `updatedAt?`, `deletedAt?`, `publishedAt?`, or `expiresAt?` combinations encode contradictory lifecycle facts.
14. Enforce exhaustiveness.
    - Use `never`, sealed-class exhaustiveness, match expressions, exhaustive switch linting, or equivalent local tools.
    - Avoid broad `default` branches that hide newly added variants unless they intentionally handle externally unknown values at a boundary.
15. Add tests at the right layer.
    - Prefer type-level tests when the repository already supports them.
    - Otherwise add parser, constructor, boundary, or domain tests showing invalid states fail to enter trusted code and valid variants remain easy to construct.
16. Report residual gaps honestly. If language limits, generated types, framework constraints, or public compatibility still permit impossible states, name the remaining constructor, validation, schema, database, or review burden.

<!-- mustflow-section: postconditions -->
## Postconditions

- Impossible domain states are prevented by type shape, constructor, parser, validator, schema, or constraint at the earliest reasonable boundary.
- IDs, units, currencies, durations, timestamps, local dates, permissions, statuses, variants, and collection invariants are no longer erased into broad primitives where swaps or contradictions matter.
- Raw external data, validated input, persisted rows, domain models, public responses, and update inputs have explicit ownership boundaries.
- Expected failures, meaningful absence, state transitions, and lifecycle timestamps do not rely on optional-field combinations that can contradict themselves.
- Casts, assertions, non-null escapes, `any`, and broad records are removed or isolated with evidence.
- Exhaustive handling and focused tests cover the changed type surface when configured.

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

Use the narrowest configured typecheck, build, test, docs, release, or mustflow intent that covers the changed type boundary. Do not infer raw package-manager, schema-generation, or type-test commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If an invariant is unknown, stop widening types and report the missing domain decision.
- If a stricter type causes many call-site errors, fix the construction boundary and closest callers first; do not silence the errors with casts.
- If generated or public compatibility types must stay permissive, add an internal parsed type and boundary mapper instead of weakening domain types.
- If the language cannot enforce an invariant statically, use a constructor, parser, validator, database constraint, or focused test and report the residual static gap.
- If configured verification is missing, report the missing intent instead of inventing raw typecheck or schema commands.

<!-- mustflow-section: output-format -->
## Output Format

- Type surface reviewed
- Impossible states found or ruled out
- IDs, units, status vocabulary, nullable or optional fields, raw boundary types, partial update inputs, DTO/domain/response split, maps or records, casts, non-null assertions, `any`, `Result`, `Option`, non-empty collections, permissions, lifecycle timestamps, and exhaustiveness checked where relevant
- Type shape, parser, constructor, validator, schema, or constraint changes made or recommended
- Tests or verification evidence
- Command intents run
- Skipped type-level checks and reasons
- Remaining impossible-state risk
