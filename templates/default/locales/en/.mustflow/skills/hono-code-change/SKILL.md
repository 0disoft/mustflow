---
mustflow_doc: skill.hono-code-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: hono-code-change
description: Apply this skill when Hono apps, routes, middleware, validators, RPC clients, bindings, context variables, auth boundaries, or runtime adapters are created or changed.
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

Preserve Hono runtime, middleware, validation, context binding, auth, typed route, and response contract boundaries.

<!-- mustflow-section: use-when -->
## Use When

- `new Hono`, `app.get`, `app.post`, `app.use`, `c.env`, `c.get`, `c.set`, validators, RPC clients, middleware, adapters, or Hono route tests change.
- The task touches Cloudflare Workers, Bun, Node, edge-compatible routes, bindings, variables, auth middleware, or response schemas.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only touches framework-agnostic service code behind a Hono handler; use the relevant language or architecture skill.
- Another HTTP framework is used instead of Hono.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Package metadata, TypeScript config, runtime adapter config, worker or server entrypoint, routes, middleware, env/binding types, schemas, client types, and tests.
- Target runtime matrix: Cloudflare, Bun, Node, edge-compatible, or single runtime.
- Existing response envelope and error contract.

<!-- mustflow-section: preconditions -->
## Preconditions

- Confirm runtime before using platform APIs.
- Identify `Bindings` for runtime-provided values and `Variables` for request-local middleware values.
- Identify auth, validation, and error response boundaries before adding routes.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep runtime-specific APIs isolated behind adapters or runtime-specific files.
- Register middleware in an order that preserves logging, CORS, security headers, body limits, auth, validation, and handler behavior.
- Trust only validated request data in handlers.
- Keep success and failure envelopes consistent.

<!-- mustflow-section: procedure -->
## Procedure

1. Read app entrypoint, runtime adapter, route modules, middleware, schemas, client type exports, and tests.
2. Map the route boundary: method, path, runtime, auth, params, query, headers, cookies, body, variables, bindings, response statuses, and content types.
3. Do not put Node-only, Bun-only, or Cloudflare-only APIs in shared routes.
4. Keep auth middleware above protected routes and wildcard or fallback routes after specific routes.
5. Separate `Bindings` from `Variables`; do not store request-local state in globals.
6. Use validator output rather than rereading unvalidated request bodies.
7. Preserve typed route or RPC inference by keeping handler responses in the framework's typed response path.
8. Choose configured verification intents that cover type checks, route tests, auth failure, validation failure, and runtime env mocks when available.

<!-- mustflow-section: postconditions -->
## Postconditions

- Runtime-specific APIs are isolated.
- Middleware order and auth boundary are clear.
- Request validation and response envelope are preserved.
- Typed route or RPC contract impact is reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing multi-runtime or route-level verification intents when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If runtime target is unclear, inspect adapter and deployment config before editing.
- If a route needs a broader permission, binding, or auth change, switch to the relevant security or contract skill.
- If typed route inference breaks, repair schema and response shape before adding more routes.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Runtime and middleware notes
- Validation and response contract notes
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Hono risk
