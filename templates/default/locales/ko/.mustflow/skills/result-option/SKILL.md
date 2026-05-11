---
mustflow_doc: skill.result-option
locale: ko
canonical: false
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: result-option
description: Apply this skill when expected failures, meaningful absence, null or undefined returns, thrown business errors, boolean success flags, raw string errors, repository lookups, validation, parsing, external adapter errors, or boundary error mapping need explicit Result and Option handling.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.result-option
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

# Result / Option

<!-- mustflow-section: purpose -->
## Purpose

Represent expected failures and meaningful absence as explicit values.

Use `Result<T, E>` when an operation can fail and the caller must know why. Use `Option<T>` when a value may be absent and absence is normal. Use `throw` only for programmer errors, impossible states, corrupted invariants, fatal startup failures, or third-party exceptions before an adapter converts them at a boundary.

Expected failure must be data. Meaningful absence must be data. Exceptions are only for truly exceptional situations.

<!-- mustflow-section: use-when -->
## Use When

- Code throws for normal business failures such as validation failure, not found, permission denied, conflict, invalid state, expired token, insufficient balance, rate limit, timeout, payment rejection, or file validation.
- Domain, application, or service functions return `null` or `undefined` to signal meaningful absence.
- Code returns ambiguous success flags, optional error fields, raw string errors, or generic `Error` values.
- A repository lookup can fail due to persistence and can also legitimately find no record.
- External SDK, database, HTTP, payment, email, filesystem, or framework exceptions leak into business logic.
- A controller, adapter, or command handler must convert typed failures into HTTP, UI, CLI, or queue responses.
- Tests need stable success, failure, and absence cases without relying on thrown exceptions.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- A function is a total pure calculation that cannot fail and always returns a value; return `T` directly.
- Absence is a bug because an invariant promises the value exists; use a stricter type or assert at the invariant boundary.
- The task is only about separating decision logic from side effects; use `pure-core-imperative-shell`.
- The task is only about provider mapping, timeout, retry, or protocol containment; use `adapter-boundary`.
- Absence is an optional collaborator that can safely perform a neutral same-interface behavior without changing caller flow; use `null-object-pattern`.
- The codebase already has a different established `Result` or `Option` shape and the task does not touch failure or absence handling.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The operation being modeled and whether it can fail, be absent, both, or neither.
- Existing local `Result`, `Option`, error, `Either`, `Maybe`, exception, and response-mapping conventions.
- The layer where failure originates and the layer where it should be handled.
- Error categories, stable error codes, safe user-facing message rules, and sensitive data constraints.
- Tests or examples that show successful, failing, and absent outcomes.
- Relevant command-intent contract entries for verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Existing local result and option helpers have been searched before adding new helpers.
- If external libraries or providers throw, `adapter-boundary` has been considered for conversion at that boundary.
- If core logic currently performs I/O or logs while deciding failures, `pure-core-imperative-shell` has been considered.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Replace expected-failure `throw` paths with `Result<T, E>`.
- Replace domain-level `null` or `undefined` absence with `Option<T>`.
- Convert `Option<T>` to `Result<T, E>` at the point where absence becomes an error.
- Add or reuse small discriminated-union helpers such as `ok`, `err`, `some`, `none`, `fromNullable`, `isOk`, `isErr`, `isSome`, `isNone`, `map`, `mapErr`, `andThen`, `matchResult`, `matchOption`, `fromPromise`, `okOr`, and `allResults` when local style supports them.
- Add typed error unions, stable error codes, categories, and boundary mappers.
- Add tests for success, failure, absence, error code, and error category.
- Do not introduce a broad functional programming library unless the codebase already uses that style.

<!-- mustflow-section: procedure -->
## Procedure

1. Choose the return shape.
   - Return `T` when the value always exists and the operation cannot fail.
   - Return `Option<T>` when absence is normal and needs no explanation.
   - Return `Result<T, E>` when failure is expected and the caller must know why.
   - Return `Promise<Result<T, E>>` for asynchronous expected failures.
   - Return `Result<Option<T>, E>` when an operation can fail and success may still have no value.
   - Return `Result<void, E>` for commands that can fail but have no useful success value.
   - Use `throw` or `assertNever` only for impossible states, programmer errors, corrupted invariants, fatal startup failures, or test assertions.
   - Use a null object only when the absence is an optional dependency with honest neutral behavior and the caller should not branch on presence.
2. Keep expected failures out of exceptions.
   - Do not throw for invalid input, missing resource, denied access, duplicate state, invalid transition, external timeout, rate limit, persistence failure, or payment rejection.
   - Catch third-party exceptions in adapters and convert them to typed errors before they cross inward.
3. Keep absence explicit.
   - Domain, application, and service functions should not use `null` or `undefined` as meaningful absence.
   - Raw DTOs, database rows, framework objects, and external API responses may contain `null` or `undefined`, but boundary mappers must convert them before they enter core logic.
4. Use structured errors.
   - Avoid raw string errors, generic `"ERROR"` codes, and optional error fields.
   - Prefer stable machine-readable codes such as `INVALID_EMAIL`, `USER_NOT_FOUND`, `ORDER_ALREADY_PAID`, or `PAYMENT_PROVIDER_TIMEOUT`.
   - Prefer consistent categories such as `validation`, `authentication`, `permission`, `not_found`, `conflict`, `invariant`, `rate_limit`, `timeout`, `external`, `persistence`, and `internal`.
   - Keep raw causes, secrets, tokens, stack traces, SQL, payment payloads, and private user data out of public responses.
5. Preserve specificity inside the system.
   - Use narrow error unions close to the rule when practical.
   - Widen to an application error type near use cases or boundaries.
   - Preserve the underlying cause when useful, but do not make domain logic depend on third-party error classes.
6. Compose results deliberately.
   - Return, transform with `mapErr`, handle explicitly, or convert to a boundary response.
   - Do not swallow `err` by returning success.
   - Avoid nested results such as `Result<Result<T, A>, B>`; prefer `Result<T, A | B>`.
   - Avoid `Result<Promise<T>, E>`; use `Promise<Result<T, E>>`.
   - Prefer `Result<Option<T>, E>` over `Option<Result<T, E>>`.
7. Use names that match meaning.
   - Use `find*` when absence is normal.
   - Use `get*` when absence is an error.
   - Use `parse*`, `validate*`, and fallible `create*` functions when invalid input should produce `Result`.
   - Use `is*`, `has*`, and `can*` only when a boolean answer is truly enough and cannot fail.
8. Map at boundaries.
   - Repositories that can fail and may not find data should return `Result<Option<T>, E>`.
   - Services may convert an `Option` into a domain error when the value is required.
   - Controllers, CLI handlers, queue consumers, and UI boundary code should convert `Result` into protocol responses.
   - Do not serialize internal `Result` or `Option` shapes as public API responses unless that is the explicit public contract.
9. Log once at the outer boundary.
   - Do not log the same error at every layer.
   - Pure domain functions must not log.
   - Boundary logs may include category, code, safe details, and non-serialized cause according to privacy rules.
10. Test the branches.
    - Every `Result`-returning function should have tests for success, at least one representative failure, error code, error category, and important details.
    - Every `Option`-returning function should have tests for `some` and `none`.
    - Test stable codes and categories rather than complete free-form messages unless the message is a public contract.

<!-- mustflow-section: postconditions -->
## Postconditions

- Expected failures are represented as typed data.
- Meaningful absence is represented as `Option` or the local equivalent.
- Normal business failures do not rely on thrown exceptions or rejected promises.
- Infrastructure and provider errors are converted at boundaries before reaching business logic.
- Public responses expose stable safe error shapes, not internal `Result`, raw causes, secrets, or stack traces.
- Tests cover success, failure, and absence branches.

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

Prefer focused tests for the functions whose return shape or error handling changed. Use release or documentation checks when templates, public docs, package metadata, schemas, CLI behavior, or skill routing change.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If local helper shape conflicts with this skill, follow the local convention and report the difference.
- If replacing exceptions would require a broad public API change, narrow the change to one boundary and report remaining throw paths.
- If error categories or codes are missing, add the smallest local error union or mapper instead of inventing a global taxonomy too early.
- If a supposedly impossible condition can happen through user or system behavior, model it as `Result` instead of throwing.
- If adapter conversion is incomplete, keep third-party error handling in the adapter and report remaining leakage.

<!-- mustflow-section: output-format -->
## Output Format

- Failure or absence surface changed
- Return shape chosen and why
- Error codes and categories introduced or reused
- Boundary conversions added
- Throw paths preserved and why
- Tests added or updated
- Command intents run
- Remaining exception, null, or error-shape risks
