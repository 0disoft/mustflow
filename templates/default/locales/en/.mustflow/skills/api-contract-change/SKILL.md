---
mustflow_doc: skill.api-contract-change
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: api-contract-change
description: Apply this skill when HTTP, REST, HTTP QUERY, Accept-Query, GraphQL, tRPC, Hono RPC, Elysia Eden, gRPC, protobuf, OpenAPI, API schemas, generated clients, SDKs, status codes, headers, content negotiation, cache headers, error envelopes, pagination, filtering, sorting, search, or public API examples are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.api-contract-change
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

# API Contract Change

<!-- mustflow-section: purpose -->
## Purpose

Treat an API change as a contract change, not as a route or controller edit. The contract includes request method semantics, request schema, response schema, status code, headers, content negotiation, cache semantics, error shape, auth and permission behavior, pagination, filtering, sorting, search semantics, generated clients, SDKs, mocks, fixtures, examples, and documentation.

The goal is to keep runtime behavior, type contracts, generated artifacts, callers, tests, and docs aligned.

<!-- mustflow-section: use-when -->
## Use When

- HTTP, REST, RPC, GraphQL, tRPC, Hono RPC, Elysia Eden, gRPC, protobuf, OpenAPI, AsyncAPI, webhook, callback, public endpoint, internal endpoint, generated client, SDK, schema, mock, fixture, or API docs behavior changes.
- HTTP method choices change, including GET, POST, PUT, PATCH, DELETE, safe/idempotent operations, request-body semantics, HTTP QUERY, or Accept-Query support.
- Request body, query parameters, path parameters, headers, cookies, response body, content negotiation, content coding, status codes, redirects, caching headers, rate-limit headers, error envelopes, validation errors, auth errors, or permission errors change.
- SSE, streaming response, WebTransport handshake, WebSocket fallback, compression negotiation, or delivery headers become part of the API behavior that callers rely on.
- Pagination, filtering, sorting, search, includes, field selection, sparse fields, expansions, cursor shape, or total-count semantics change.
- A route is renamed, moved, split, merged, deprecated, versioned, or made more restrictive.
- A framework-specific API surface changes and may need another skill as a follow-up, such as `hono-code-change`, `elysia-code-change`, `typescript-code-change`, `http-delivery-streaming`, `auth-permission-change`, or `security-regression-tests`.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is a purely private implementation refactor with no request, response, generated type, client, docs, status, or error behavior change.
- The task is only authentication or authorization policy with no API contract change; use `auth-permission-change`.
- The task is only CLI output contract; use `cli-output-contract-review`.
- The changed schema is a private in-flight workflow or checkpoint representation rather than a caller-facing API; use `durable-workflow-orchestration` for workflow semantics and `migration-safety-check` for old-to-new persisted transformation.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Changed route, controller, resolver, handler, schema, validator, generated client, SDK, tests, fixtures, mocks, and docs.
- Current method semantics, request and response schema, status code map, headers, content negotiation, content coding, error envelope, auth and permission behavior, rate-limit behavior, cache behavior, streaming or reconnect behavior, pagination/filter/sort/search contract, and deprecation/versioning policy.
- For body-bearing read operations, current GET, POST, and QUERY tradeoffs; request body media type; Accept-Query or Allow discovery; cache-key construction; client, proxy, CDN, browser, and server framework support; fallback behavior; and canonical GET URI strategy when present.
- OpenAPI, GraphQL schema, tRPC router, Hono app type, Elysia Eden type surface, protobuf files, generated clients, SDK examples, frontend callers, mobile callers, integration tests, docs examples, and mock servers when present.
- Current public consumers, backwards-compatibility expectations, supported client versions, and migration or deprecation policy.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Classify the API surface before editing: REST/HTTP, GraphQL, tRPC, Hono RPC, Elysia Eden, gRPC/protobuf, webhook, callback, generated SDK, or internal-only API.
- Identify whether the change is source-compatible, runtime-compatible, behavior-compatible, or breaking for existing callers.
- Read the schema and generated client source of truth before editing route code.
- If auth, permission, tenant, object-level access, or API key behavior changes, also apply `auth-permission-change`.
- If compression, content coding, streaming responses, SSE, WebTransport, WebSocket fallback, proxy buffering, CDN behavior, or browser delivery behavior changes, also apply `http-delivery-streaming`.
- If the change needs denied-abuse coverage, also apply `security-regression-tests`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update route code, validators, schemas, generated types, examples, fixtures, mocks, docs, and tests together when they describe the same contract.
- Add explicit deprecation or compatibility handling when an existing public caller would otherwise break.
- Add or tighten tests for request validation, response shape, error shape, auth failures, permission failures, pagination, filtering, sorting, search, and generated client behavior.
- Do not silently weaken validation, widen responses, or change error/status semantics to make a caller compile.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the contract source of truth: OpenAPI, GraphQL schema, route validator, tRPC router, Hono `AppType`, Elysia app/Eden surface, protobuf definition, hand-written SDK type, or docs-backed public contract.
2. Build a contract ledger for each changed endpoint or operation:
   - method or operation name, including safe, idempotent, cacheable, and request-body semantics;
   - path or field name;
   - request path, query, header, cookie, and body shape;
   - auth and permission requirement;
   - response success status and body;
   - error status and body;
   - relevant headers, content negotiation, content coding, cache variance, and request-content cache-key inputs;
   - pagination, filtering, sorting, and search semantics;
   - generated clients, SDK functions, mocks, fixtures, examples, and docs.
3. Classify each change:
   - additive optional field;
   - required request field added;
   - request field removed or renamed;
   - response field removed, renamed, narrowed, widened, or made nullable;
   - status code changed;
   - header added, removed, or changed;
   - method semantics changed, including safe/idempotent behavior or body-bearing read behavior;
   - content coding, compression negotiation, streaming, reconnect, or cache-variance behavior changed;
   - error code or envelope changed;
   - pagination cursor or total semantics changed;
   - auth/permission requirement changed;
   - route moved, versioned, deprecated, or removed.
4. Decide compatibility from the caller's perspective. Treat required inputs, removed outputs, renamed fields, stricter validation, status-code changes, error-envelope changes, pagination token changes, and generated-client signature changes as likely breaking unless a compatibility path exists.
5. Apply the API style policy below for the relevant protocol or framework.
6. Apply the response, error, and pagination policy below before changing envelopes, status codes, headers, cursors, filters, sorts, or search.
7. Apply the dependent surface checklist before finalizing. Do not stop at route/controller changes.
8. Use framework-specific skills for implementation details when needed after the contract has been classified.
9. Report the contract source, compatibility classification, synchronized surfaces, skipped surfaces, verification, and remaining caller risk.

## API Style Policy

- REST and HTTP APIs must keep method semantics, status code meanings, headers, content type, content coding, cache behavior, redirects, streaming behavior, and error envelope stable.
- HTTP QUERY is for safe and idempotent read operations whose query input does not fit the URI cleanly. It is not a default replacement for GET or POST: keep GET for simple, shareable, bookmarkable, and widely cached URLs; avoid GET request bodies as portable API contracts; and call POST-as-search a semantic or compatibility fallback when QUERY support is unavailable.
- A QUERY contract must define the query request media type with Content-Type, supported query formats with Accept-Query when advertised, Allow or fallback behavior for unsupported clients and intermediaries, CORS preflight expectations for browser callers, and whether Content-Location, Location, or 303 See Other lets callers repeat the operation with GET.
- QUERY caching must include request content and relevant metadata in the cache key. Any cache-key normalization must match resource semantics; do not normalize the body only for convenience if that can merge distinct queries.
- OpenAPI changes must include every status/body/header variant that callers rely on. A schema-only success response is not enough when errors are part of the contract.
- GraphQL must not be forced into a REST envelope. Preserve GraphQL `data`, `errors`, `extensions`, partial response, nullability, and resolver error propagation semantics.
- GraphQL nullable-to-non-null and non-null-to-null changes are contract changes. Nullability can change whether partial data survives an error.
- tRPC changes must treat input validators, output validators, error formatter, transformer, router names, procedure kind, and client inference as contract surfaces. Type-checking alone is not enough when HTTP adapters and runtime errors change.
- Hono RPC changes must keep route chaining, validators, returned `c.json` shape, status, `AppType`, and `hc` client inference aligned. Breaking a chain can silently degrade client types.
- Elysia Eden changes must check success and error narrowing, schema validation, status handling, `onError`, and Eden client inference from the caller's perspective.
- gRPC and protobuf changes must never reuse field numbers, must reserve deleted fields and enum values, and must treat type changes, required-like behavior, enum renames, and default-value meaning changes as wire-contract risks.
- Webhooks and callbacks are APIs. Signature verification, retry behavior, idempotency, event version, payload shape, and error response behavior are part of the contract.

## Response Error Pagination Policy

- Keep a single response envelope per API family unless the framework protocol has its own envelope, such as GraphQL.
- Do not mix success and error shapes casually. Callers should be able to distinguish success, validation failure, auth failure, permission failure, not found, conflict, rate limit, and server failure consistently.
- Do not change 401, 403, and policy-driven 404 behavior without checking auth, permission, docs, callers, and audit expectations.
- Validation errors must preserve stable field paths, machine-readable codes, and human-readable messages when callers depend on them.
- Pagination must define cursor opacity, sort stability, page size limits, `next` and `previous` meaning, empty page behavior, total-count semantics, and whether filters affect counts.
- Filtering and sorting must define allowed fields, default sort, null ordering, case sensitivity, timezone or locale behavior, invalid filter behavior, and whether unknown fields are rejected or ignored.
- Search must define query normalization, tokenization, ranking stability expectations, highlight fields, typo tolerance, permissions, and private-data exclusion.
- Headers such as content-type, accept-query, content-encoding, vary, cache-control, etag, location, content-location, retry-after, rate-limit, pagination links, content-disposition, and deprecation headers are contract surfaces.

## Dependent Surface Checklist

Check every relevant surface before finalizing:

- route/controller/resolver/handler implementation;
- request validators and response serializers;
- shared schemas and generated types;
- OpenAPI, GraphQL schema, protobuf, tRPC router, Hono `AppType`, Elysia Eden surface, or SDK definitions;
- generated clients and checked-in generated artifacts;
- frontend, mobile, CLI, worker, webhook, and partner callers;
- mocks, fixtures, contract tests, integration tests, snapshots, and examples;
- API docs, README snippets, changelog, migration notes, deprecation notices, role matrix, and status-code docs;
- auth and permission checks;
- rate limits, cache keys, cache headers, search indexes, pagination cursors, and background jobs;
- QUERY support, Accept-Query discovery, request-body cache-key logic, CORS preflight behavior, unsupported-method fallback, and GET-equivalent Location or Content-Location paths when body-bearing read operations are caller-visible;
- streaming delivery, SSE event ids, reconnect behavior, proxy or CDN delivery settings, content-coding variants, and fallback clients when they are caller-visible;
- observability dashboards, audit logs, analytics events, and alerting that parse status or error codes.

## Strongly Forbidden Patterns

- Changing a response shape because the current frontend only reads one field.
- Returning raw database rows as API responses.
- Treating TypeScript inference as proof that runtime JSON is compatible.
- Changing status codes without updating callers, docs, tests, and audit expectations.
- Changing content encoding, streaming flush, reconnect, cache variance, or fallback behavior without updating callers, docs, tests, and delivery verification.
- Treating GET request bodies as portable API contracts.
- Switching complex read-only searches to QUERY without client/server/proxy/CDN support evidence, fallback behavior, Content-Type and Accept-Query policy, and request-content cache-key rules.
- Treating generated clients as disposable when they are the public API.
- Mixing GraphQL partial-response semantics with REST success/error envelopes.
- Adding required request fields in a minor-compatible change without a default or compatibility path.
- Removing response fields because no local code uses them.
- Changing pagination cursor shape, default sort, or filter semantics without migration notes.
- Widening API responses to include internal ids, storage keys, private URLs, provider ids, hidden fields, or admin-only data.
- Trusting client-provided tenant, role, owner, price, entitlement, or plan values.
- Updating docs examples without verifying the runtime route and schema still match.
- Regenerating clients without checking the diff from a caller's perspective.

<!-- mustflow-section: postconditions -->
## Postconditions

- The API contract source of truth is known.
- Request method semantics, response, status, header, content negotiation, cache, error, auth, permission, pagination, filtering, sorting, and search impacts are classified.
- Breaking or compatibility-sensitive changes are named.
- Generated clients, mocks, fixtures, tests, docs, and examples are synchronized or explicitly reported as skipped.
- Framework-specific protocol semantics are preserved.

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

Prefer the narrowest configured checks that exercise the changed contract from a caller's perspective. Report missing contract tests, generated-client checks, OpenAPI or schema validation, GraphQL introspection or operation tests, tRPC runtime adapter tests, Hono RPC client inference checks, Elysia Eden client checks, gRPC compatibility checks, docs validation, or mock/fixture refresh when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the contract source of truth is unclear, stop and report the competing sources instead of editing one surface.
- If route code and schema disagree, fix the source of truth and synchronized surfaces before adding behavior.
- If a change is breaking and no versioning, deprecation, migration, or compatibility path exists, report the break instead of hiding it.
- If generated clients or docs cannot be regenerated or verified, report the skipped surface and caller risk.
- If auth, permission, tenant, or private-data behavior changes, switch to the matching security skill before finalizing that part.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- API style and contract source of truth
- Changed operations or endpoints
- Compatibility classification
- Request method semantics, response, status, header, content negotiation, cache, error, auth, permission, pagination, filter, sort, search, and QUERY support notes when relevant
- Generated client, SDK, mock, fixture, docs, and caller surfaces synchronized
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining API contract risk
