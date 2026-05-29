---
mustflow_doc: skill.api-contract-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: api-contract-change
description: Apply this skill when HTTP, REST, GraphQL, tRPC, Hono RPC, Elysia Eden, gRPC, protobuf, OpenAPI, API schemas, generated clients, SDKs, status codes, headers, error envelopes, pagination, filtering, sorting, search, or public API examples are created or changed.
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

Treat an API change as a contract change, not as a route or controller edit. The contract includes request schema, response schema, status code, headers, error shape, auth and permission behavior, pagination, filtering, sorting, search semantics, generated clients, SDKs, mocks, fixtures, examples, and documentation.

The goal is to keep runtime behavior, type contracts, generated artifacts, callers, tests, and docs aligned.

<!-- mustflow-section: use-when -->
## Use When

- HTTP, REST, RPC, GraphQL, tRPC, Hono RPC, Elysia Eden, gRPC, protobuf, OpenAPI, AsyncAPI, webhook, callback, public endpoint, internal endpoint, generated client, SDK, schema, mock, fixture, or API docs behavior changes.
- Request body, query parameters, path parameters, headers, cookies, response body, status codes, redirects, caching headers, rate-limit headers, error envelopes, validation errors, auth errors, or permission errors change.
- Pagination, filtering, sorting, search, includes, field selection, sparse fields, expansions, cursor shape, or total-count semantics change.
- A route is renamed, moved, split, merged, deprecated, versioned, or made more restrictive.
- A framework-specific API surface changes and may need another skill as a follow-up, such as `hono-code-change`, `elysia-code-change`, `typescript-code-change`, `auth-permission-change`, or `security-regression-tests`.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is a purely private implementation refactor with no request, response, generated type, client, docs, status, or error behavior change.
- The task is only authentication or authorization policy with no API contract change; use `auth-permission-change`.
- The task is only CLI output contract; use `cli-output-contract-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Changed route, controller, resolver, handler, schema, validator, generated client, SDK, tests, fixtures, mocks, and docs.
- Current request and response schema, status code map, headers, error envelope, auth and permission behavior, rate-limit behavior, cache behavior, pagination/filter/sort/search contract, and deprecation/versioning policy.
- OpenAPI, GraphQL schema, tRPC router, Hono app type, Elysia Eden type surface, protobuf files, generated clients, SDK examples, frontend callers, mobile callers, integration tests, docs examples, and mock servers when present.
- Current public consumers, backwards-compatibility expectations, supported client versions, and migration or deprecation policy.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Classify the API surface before editing: REST/HTTP, GraphQL, tRPC, Hono RPC, Elysia Eden, gRPC/protobuf, webhook, callback, generated SDK, or internal-only API.
- Identify whether the change is source-compatible, runtime-compatible, behavior-compatible, or breaking for existing callers.
- Read the schema and generated client source of truth before editing route code.
- If auth, permission, tenant, object-level access, or API key behavior changes, also apply `auth-permission-change`.
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
   - method or operation name;
   - path or field name;
   - request path, query, header, cookie, and body shape;
   - auth and permission requirement;
   - response success status and body;
   - error status and body;
   - relevant headers;
   - pagination, filtering, sorting, and search semantics;
   - generated clients, SDK functions, mocks, fixtures, examples, and docs.
3. Classify each change:
   - additive optional field;
   - required request field added;
   - request field removed or renamed;
   - response field removed, renamed, narrowed, widened, or made nullable;
   - status code changed;
   - header added, removed, or changed;
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

- REST and HTTP APIs must keep method semantics, status code meanings, headers, content type, cache behavior, redirects, and error envelope stable.
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
- Headers such as cache-control, etag, location, retry-after, rate-limit, pagination links, content-disposition, and deprecation headers are contract surfaces.

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
- observability dashboards, audit logs, analytics events, and alerting that parse status or error codes.

## Strongly Forbidden Patterns

- Changing a response shape because the current frontend only reads one field.
- Returning raw database rows as API responses.
- Treating TypeScript inference as proof that runtime JSON is compatible.
- Changing status codes without updating callers, docs, tests, and audit expectations.
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
- Request, response, status, header, error, auth, permission, pagination, filtering, sorting, and search impacts are classified.
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
- Request, response, status, header, error, auth, permission, pagination, filter, sort, and search notes
- Generated client, SDK, mock, fixture, docs, and caller surfaces synchronized
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining API contract risk
