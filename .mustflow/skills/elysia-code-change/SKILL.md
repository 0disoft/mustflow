---
mustflow_doc: skill.elysia-code-change
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: elysia-code-change
description: Apply this skill when Elysia routes, schemas, plugins, decorators, derives, resolves, guards, macros, auth, error handling, OpenAPI or Scalar docs, Eden Treaty clients, streaming, WebSocket, or Bun-backed Elysia server behavior are created, changed, reviewed, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.elysia-code-change
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - mustflow_check
---

# Elysia Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Elysia schema-first runtime validation, type inference, plugin, auth, error, OpenAPI, Eden Treaty, lifecycle, streaming, and Bun-backed runtime boundaries.

<!-- mustflow-section: use-when -->
## Use When

- `new Elysia`, route methods, `t.Object`, Standard Schema validators, request or response schemas, `.model`, `.use`, `.guard`, `.derive`, `.resolve`, `.decorate`, `.state`, `.macro`, `.onError`, auth middleware, OpenAPI or Scalar docs, Eden Treaty, streaming, WebSocket, or Bun server tests change.
- The task adds API routes, plugins, validators, error envelopes, authentication, generated client contracts, SDK-facing route paths, runtime deployment settings, or Elysia version-sensitive behavior.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only edits framework-free service functions called by Elysia routes; use the relevant language or architecture skill unless route contracts, schemas, lifecycle hooks, OpenAPI, or Eden types also change.
- Another web framework owns the route surface.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Package metadata, Bun lockfile if present, TypeScript config, server entrypoint, route modules, plugin modules, schema/model files, auth/session files, cookie and CORS config, error handling, OpenAPI config, Eden client exports, streaming and WebSocket config, deployment config, and tests.
- Existing response envelope, status-code contract, and strict TypeScript policy.
- Current Elysia and plugin version evidence when the task depends on release-specific behavior. Refresh official package or vendor sources before preserving exact "latest" claims.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify whether schema is the source of truth for runtime validation and type inference.
- Inventory method, path, params, query, headers, cookies, body, response statuses, auth, and plugin/decorator dependencies.
- Identify whether the public client contract is Eden Treaty, OpenAPI JSON, generated SDKs, or a mix. Eden uses `typeof app`; OpenAPI SDKs use the OpenAPI document.
- Identify whether Bun runtime deployment details are in scope. If so, apply `bun-code-change` for Bun-specific runtime, compile, package manager, and deploy risks.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Define request and response schemas with the route.
- Keep framework context at the route boundary and move only framework-free business logic into services.
- Preserve plugin, decorator, derive, resolve, and store inference through Elysia chaining.
- Preserve method chaining or return typed Elysia plugin instances so `typeof app`, decorators, schemas, and lifecycle additions remain visible to Eden and tests.
- Use `.derive` only for intentional pre-validation context shaping. Use `.resolve` by default for auth, session, user, tenant, permission, or other request-derived values that depend on validated headers, body, query, or params.
- Keep OpenAPI and Eden Treaty clients aligned with route schemas when present.
- Use `model()` or named schema references for reused schemas in larger route sets when it reduces duplicate schema drift and OpenAPI component churn.
- Keep reusable plugins explicit with `new Elysia({ name, seed })` when lifecycle deduplication, encapsulation, or dependency visibility matters.

<!-- mustflow-section: procedure -->
## Procedure

1. Read server entry, routes, plugins, schemas, auth, cookies, CORS, error handling, OpenAPI, Eden exports, runtime deployment config, and tests.
2. Build a route inventory for the changed surface.
3. Treat route schemas as the primary contract for runtime validation and Eden inference. For OpenAPI, determine whether the project uses runtime schemas, `fromTypes()`, or both; when both are present, runtime schema takes precedence. Avoid duplicating contracts as unrelated interfaces or generated definitions.
4. Add or update schemas for every external input and meaningful response status, including non-2xx statuses.
5. For URL and header inputs, remember that params, query, and headers arrive as HTTP strings:
   - use lower-case header schema keys;
   - use explicit numeric or boolean coercion schemas such as `t.Numeric()` where the route expects converted URL values;
   - use array schemas for query arrays instead of relying on caller convention;
   - distinguish `t.Optional` around an input object from optional properties inside the object.
6. For file uploads, distinguish `t.File()` behavior from Standard Schema file validation. If using Zod, Valibot, or another Standard Schema, require explicit JSON Schema or file magic-number mapping when OpenAPI or runtime file validation depends on it.
7. Check body parser ownership. For webhook verifiers, tRPC, oRPC, proxy, or raw-body endpoints, require an explicit raw-body or `parse: 'none'` design instead of letting schema inference consume the request body first.
8. Reject GET or HEAD bodies as portable public API contracts unless the repository has an explicit non-portable exception. Use query contracts or a POST search/action endpoint instead.
9. Do not annotate handlers with broad `any`, duplicated manual interfaces, or imported `Context` types that erase inference. Keep Elysia context at the route boundary and pass only validated values into services.
10. Keep request-specific state out of module-level mutable globals, `.store`, and `.decorate`. Use validated `.resolve` or handler context for user, session, tenant, request id, or permission data.
11. For request-derived context, choose the lifecycle hook by validation dependency:
   - use `.derive` only when transforming raw request context before validation is intentional;
   - use `.guard()` to apply schema and auth-related validation around a route group;
   - use `.resolve()` inside the validated chain for user, session, tenant, permission, or other values that depend on validated input;
   - check the order between `.resolve()` and `beforeHandle` before relying on a value in an auth or permission hook.
12. Check lifecycle scope and registration order:
   - hooks generally affect routes registered after them;
   - plugin lifecycle is local unless scoped or global behavior is explicitly chosen;
   - `global` scope should be reserved for true app-wide policy, not hidden feature dependencies;
   - async or lazy plugins may require tests to wait for registered modules before asserting routes.
13. Treat macros as public route-option APIs. Review their schema, lifecycle, OpenAPI, type-inference, dedupe, and error-response effects before adding or changing macro options.
14. Centralize expected error envelope and auth failure behavior. Prefer typed `status(...)` return paths for expected route failures when Eden or OpenAPI clients need status-specific types; use `throw status(...)` intentionally when `onError` logging or transformation must run.
15. Register custom errors and map unknown errors deliberately. Avoid collapsing business, auth, validation, upstream, and server bugs into one unknown 500.
16. Review security defaults and exposure:
   - configure CORS origins and credential behavior explicitly;
   - protect or intentionally expose `/openapi`, `/openapi/json`, Scalar or Swagger UI routes;
   - do not treat `detail.hide` as access control;
   - sign and secure session cookies where applicable;
   - avoid production validation details that leak schema internals.
17. Review OpenAPI separately from docs UI:
   - the official Elysia OpenAPI plugin and its docs UI provider are not the same thing as the raw OpenAPI document;
   - confirm the raw OpenAPI JSON path, UI provider, and access policy before telling SDK consumers where to read the spec;
   - if `fromTypes()` or type generation is used, verify production and bundled builds can still read the required `.d.ts`, `projectRoot`, and `tsconfigPath`;
   - for file uploads, review runtime file validation and OpenAPI conversion separately. Configure `mapJsonSchema` when a Standard Schema implementation cannot produce the required OpenAPI schema, and independently verify runtime file size, MIME, extension, and magic-number policy where those checks are required;
   - remember `withHeader()` documents response headers; it does not enforce that the runtime sets them.
18. Review Eden Treaty separately from OpenAPI codegen:
   - export `type App = typeof app` from the server boundary;
   - keep frontend imports type-only so server runtime code does not enter client bundles;
   - keep server and client Elysia versions and strict TypeScript settings aligned;
   - treat route path shape as SDK surface;
   - handle Treaty `error` before assuming `data` is non-null;
   - centralize auth headers in Treaty config or request hooks;
   - split public, admin, internal, WebSocket, and streaming surfaces when one giant `App` type would expose too much or slow typechecking.
19. Review routing semantics:
   - static, dynamic, wildcard, optional, group, guard, prefix, mount, and `all()` behavior affect auth, cache, generated clients, and tests;
   - auto HEAD behavior, explicit HEAD routes, range responses, SSE, and stream headers need separate verification when relevant;
   - avoid `all()` unless accepting every method is the intended public contract.
20. If Bun-backed runtime behavior changes, also review Elysia production settings that affect idle timeout, WebSocket backpressure, clustering, compile targets, port binding, Docker build context, and observability. Use `bun-code-change` for Bun-specific edits.
21. Choose configured verification intents that cover types, server boot, route happy path, validation failure, auth failure, OpenAPI JSON, Eden inference, streaming/WebSocket behavior, and deployment config when available.

<!-- mustflow-section: postconditions -->
## Postconditions

- Schemas, runtime validation, and inferred types remain one contract.
- Error and auth responses are consistent.
- OpenAPI docs UI, raw OpenAPI JSON, generated SDK, and Eden Treaty impact is known and not conflated.
- No route relies on unvalidated input, pre-validation auth context, request-specific global state, or erased context types.
- Plugin scope, hook order, macro behavior, and public route path shape are deliberate.
- Runtime, streaming, WebSocket, or deploy-specific Elysia/Bun risks are handled or reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing route, OpenAPI JSON, Eden Treaty, streaming, WebSocket, security, Docker, deploy, or runtime verification intents when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If schema and manual types diverge, make schema the source of truth or report the competing contract.
- If plugin inference breaks after extraction, return context-sensitive code to the Elysia chain or narrow the extraction.
- If auth or session state is derived before validation through `.derive`, move it to a validated `.guard()` plus `.resolve()` chain or report the validation-order risk.
- If OpenAPI output looks correct only in development, inspect type generation inputs and production or bundled artifact availability before trusting generated SDKs.
- If `detail.hide` is used for sensitive routes, add real access control or report the exposure risk.
- If Eden types require importing server runtime into a frontend bundle, split type-only exports or report the bundling risk.
- If streaming, WebSocket, or long-lived request behavior is touched without timeout or backpressure evidence, report the operational risk.
- If auth behavior is unclear, stop the route change and inspect or request the auth contract.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Schema and type inference notes
- Lifecycle, plugin, macro, auth, and error notes
- OpenAPI, Scalar or Swagger UI, generated SDK, and Eden Treaty impact
- Bun-backed runtime, streaming, WebSocket, or deployment notes
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Elysia risk
