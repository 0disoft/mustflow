---
mustflow_doc: skill.hono-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: hono-code-change
description: Apply this skill when Hono apps, route chains, middleware order, validators, RPC or typed clients, OpenAPI schema generation, runtime bindings, context variables, auth, CORS, cookie, header, streaming, WebSocket, cache, static asset, or Cloudflare, Bun, Node, Deno, edge, or serverless adapter boundaries are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.hono-code-change
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

# Hono Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Hono route registration, runtime adapter, middleware ordering, validation, context binding, auth, typed client, OpenAPI, streaming, cache, static asset, and response contract boundaries.

<!-- mustflow-section: use-when -->
## Use When

- `new Hono`, `app.route`, `basePath`, `app.get`, `app.post`, `app.use`, wildcard routes, fallback routes, `c.env`, `c.get`, `c.set`, `c.req.valid`, validators, RPC clients, middleware, adapters, or Hono route tests change.
- The task touches Cloudflare Workers, Bun, Node, Deno, edge-compatible, serverless, SSR, static file, WebSocket, SSE, streaming, cache, cookie, CORS, CSRF, JWT, JWK, header, body-limit, binding, variable, auth middleware, OpenAPI, or response schema behavior.
- The task exports or consumes `typeof app`, `typeof routes`, `AppType`, `hc`, `InferRequestType`, `InferResponseType`, `ApplyGlobalResponse`, OpenAPI clients, or generated SDKs from Hono routes.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only touches framework-agnostic service code behind a Hono handler; use the relevant language or architecture skill.
- Another HTTP framework is used instead of Hono.
- The task only updates external framework version prose; use `source-freshness-check` unless the Hono procedure itself changes.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Package metadata, TypeScript config, runtime adapter config, worker or server entrypoint, route modules, middleware registration, env and binding types, context variables, schemas, validators, client type exports, OpenAPI generation, generated SDKs, and tests.
- Target runtime matrix: Cloudflare Workers or Pages, Bun, Node with `@hono/node-server`, Deno, Lambda or other serverless adapter, edge-compatible, or single runtime.
- Existing response envelope, status-code contract, error contract, CORS, cookie, header, cache, streaming, WebSocket, static file, body-size, and upload behavior.
- Official or repository-local source evidence before preserving exact latest-version, patch-note, or adapter-behavior claims.

<!-- mustflow-section: preconditions -->
## Preconditions

- Confirm runtime before using platform APIs.
- Identify `Bindings` for runtime-provided values and `Variables` for request-local middleware values.
- Identify auth, validation, and error response boundaries before adding routes.
- Refresh official package or vendor sources before preserving exact "latest", release-date, or security-patch claims; otherwise keep those facts out of the skill or mark them as snapshot-only in the report.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep runtime-specific APIs isolated behind adapters or runtime-specific files.
- Register middleware in an order that preserves logging, CORS, security headers, body limits, auth, validation, and handler behavior.
- Trust only validated request data in handlers.
- Keep success and failure envelopes consistent.
- Keep route type exports, RPC clients, OpenAPI documents, generated SDKs, tests, and docs synchronized when public API behavior changes.

<!-- mustflow-section: procedure -->
## Procedure

1. Read app entrypoint, runtime adapter, route modules, middleware, schemas, validator helpers, OpenAPI setup, client type exports, generated clients, and tests.
2. Map the route boundary: method, path, registration order, runtime, auth, params, query, headers, cookies, body, variables, bindings, response statuses, content types, cache headers, streaming mode, and public client surface.
3. Treat Hono route order as behavior. Keep specific routes before wildcard or fallback routes; check `route()`, `basePath()`, `mount`, optional params, regexp params, static routes, and fallback registration for shadowing or doubled prefixes.
4. Keep auth, CORS, CSRF, secure headers, body limit, cookie, JWT, JWK, cache, ETag, compression, and logging middleware in an order that matches the security and observability boundary.
5. For CORS with credentials, require an explicit origin allowlist or exact origin callback; do not rely on wildcard origin behavior or loose suffix checks.
6. Separate `Bindings` from `Variables`; do not store request-local auth, user, session, tenant, or trace state in globals, module singletons, or runtime-wide mutable objects.
7. Use `createMiddleware<{ Variables }>()` or route-local generics for context values that depend on middleware execution. Avoid `ContextVariableMap` unless the value is truly available for every request path.
8. Use `c.req.valid(...)` output rather than rereading unvalidated request bodies. Remember that request bodies are one-shot, query and params are strings, header validator keys are lowercase, and `json` or `form` validators need the matching `Content-Type`.
9. For multipart uploads, large JSON, webhooks, raw-body signatures, and file routes, check parser shape, body limits, runtime limits, storage limits, repeated-field behavior, and raw request cloning before changing handlers.
10. Preserve typed route, RPC, and SDK inference by exporting the route chain actually used by `hc<AppType>()`, keeping handler responses on typed `c.json(payload, status)` paths, and avoiding broad `Context` handler extraction that drops path, validator, or response types.
11. Keep runtime validation schema, OpenAPI schema, response schema, generated SDKs, and Hono RPC types from becoming separate truths. Choose one canonical contract and verify drift with tests or snapshots when available.
12. Do not put Node-only, Bun-only, Cloudflare-only, Deno-only, Lambda-only, static-serving, connection-info, WebSocket, or filesystem APIs in shared route modules. Keep runtime entry files thin and pass plain config or adapter functions into shared app code.
13. For streaming, SSE, WebSocket, cache, ETag, static file, and SSR or JSX routes, check cancellation, abort handling, backpressure, already-started-response errors, header retention, path traversal, cache key and `Vary`, repeated `Set-Cookie`, and adapter header normalization.
14. Choose configured verification intents that cover type checks, route tests, auth failure, validation failure, CORS/cookie/header behavior, streaming or WebSocket behavior, OpenAPI or SDK generation, and runtime env mocks when available.

<!-- mustflow-section: postconditions -->
## Postconditions

- Runtime-specific APIs are isolated.
- Middleware order, route order, and auth boundary are clear.
- Request validation, body parsing, header/cookie/CORS/cache, and response envelope behavior are preserved.
- Typed route, RPC, OpenAPI, generated SDK, and runtime adapter contract impact is reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing multi-runtime, route-level, streaming, WebSocket, OpenAPI, SDK, or adapter verification intents when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If runtime target is unclear, inspect adapter and deployment config before editing.
- If a route needs a broader permission, binding, or auth change, switch to the relevant security or contract skill.
- If typed route inference breaks, repair the route chain, validator, schema, and response shape before adding more routes.
- If official source freshness cannot be checked for a version, release, or security-patch claim, omit the claim from durable skill text and report it as unverified snapshot context.
- If streaming, WebSocket, cache, static, or adapter-specific behavior cannot be tested by configured intents, report the missing runtime smoke coverage.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Runtime, adapter, route-order, and middleware notes
- Validation, RPC, OpenAPI, SDK, and response contract notes
- CORS, cookie, header, cache, streaming, WebSocket, static, or SSR notes when touched
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Hono risk
