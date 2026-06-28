---
mustflow_doc: skill.http-api-semantics-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: http-api-semantics-review
description: Apply this skill when HTTP API method semantics, safe or idempotent behavior, GET or HEAD request-body assumptions, OPTIONS or Allow discovery, HTTP QUERY, POST versus PUT URI ownership, PUT replacement, PATCH document formats, DELETE behavior, conditional requests, status codes, cache headers, CORS method discovery, retry behavior, or intermediary compatibility need review.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.http-api-semantics-review
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

# HTTP API Semantics Review

<!-- mustflow-section: purpose -->
## Purpose

Review HTTP APIs as method, status, header, cache, retry, and intermediary contracts, not as CRUD
labels or controller naming preferences.

The review question is not "does this route work in the current framework?" It is "will browsers,
crawlers, caches, gateways, SDKs, retries, stale clients, and concurrent callers interpret this
request the same way the server does?"

<!-- mustflow-section: use-when -->
## Use When

- HTTP or REST routes, handlers, OpenAPI documents, API docs, SDKs, gateways, middleware, CORS
  policy, cache policy, status-code maps, or request/response headers are created, changed,
  reviewed, or reported.
- A change chooses or changes GET, HEAD, OPTIONS, POST, PUT, PATCH, DELETE, QUERY, or fallback
  behavior.
- A review claims that an endpoint is safe, idempotent, cacheable, retry-safe, crawler-safe,
  prefetch-safe, proxy-safe, CDN-compatible, or portable across HTTP clients.
- The task involves PUT full replacement, PATCH document semantics, DELETE bodies, POST search,
  GET or HEAD request bodies, HTTP QUERY, Accept-Patch, Accept-Query, Allow, ETag, If-Match,
  If-None-Match, Cache-Control, Vary, Location, Content-Location, Retry-After, or CORS method
  discovery.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main work is broad API source-of-truth synchronization, generated clients, schema drift, or
  compatibility classification; use `api-contract-change` first and this skill only for HTTP
  method semantics.
- The main work is caller ergonomics, ambiguous DTOs, hidden operation modes, or SDK usability; use
  `api-misuse-resistance-review`.
- The main work is duplicate business side effects or retry delivery; use
  `idempotency-integrity-review`.
- The main work is cache key truth, stale data, invalidation, Redis, or cache outage behavior; use
  `cache-integrity-review`.
- The main work is response streaming, compression, proxy buffering, SSE, WebTransport, or delivery
  transport behavior; use `http-delivery-streaming`.
- The API is not HTTP-facing and no HTTP method, status, header, cache, CORS, retry, or
  intermediary behavior is part of the contract.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Endpoint ledger: method, path, request body meaning, success statuses, error statuses, headers,
  auth and permission requirement, cacheability, caller types, and fallback paths.
- Method contract: whether the caller requests a safe operation, an idempotent operation, a full
  representation replacement, a patch document application, a server-selected creation, a
  client-selected target URI, a delete/unlink operation, or a safe body-bearing query.
- Concurrency contract: ETag or version source, conditional request requirements, lost-update
  behavior, conflict behavior, and retry behavior after unknown outcomes.
- Patch contract when PATCH is used: media type, patch grammar, null and omission semantics,
  atomicity boundary, validation timing, Accept-Patch discovery, and status-code recovery map.
- Query contract when GET, QUERY, or POST search is used: canonical GET strategy, query body media
  type, Accept-Query or Allow discovery, fallback behavior, cache-key inputs, canonicalization,
  Location or Content-Location behavior, and sensitive-data handling.
- Cache and capability contract: Cache-Control, Vary, ETag, Last-Modified, Location,
  Content-Location, Allow, Access-Control-Allow-Methods, Accept-Patch, Accept-Query, Retry-After,
  and RateLimit header behavior when relevant.
- Relevant command-intent contract entries for tests, builds, docs, release checks, and mustflow
  validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- The current contract source of truth is known, such as OpenAPI, route validators, handler tests,
  API docs, gateway config, or SDK examples.
- If HTTP semantics changes affect request or response shapes, generated clients, auth, permission,
  cache correctness, duplicate side effects, or streaming delivery, also apply the narrower matching
  skill before finalizing that part.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update route handlers, method choices, validators, OpenAPI or API docs, SDK examples, gateway
  rules, CORS rules, cache headers, conditional request handling, status-code maps, and focused
  tests tied to the changed HTTP contract.
- Add explicit support or rejection for GET or HEAD bodies, DELETE bodies, unsupported methods,
  unsupported patch media types, missing preconditions, and body-bearing safe queries.
- Add capability discovery through Allow, Accept-Patch, Accept-Query, and documented fallback
  behavior when the API exposes those capabilities.
- Do not silently convert PUT into partial merge, PATCH into ambiguous JSON merge, GET into a
  command, POST search into a safe operation without naming fallback semantics, or cache policy into
  prose-only behavior.

<!-- mustflow-section: procedure -->
## Procedure

1. Build a method semantics ledger for every endpoint under review:
   - method;
   - target URI ownership;
   - whether the method is safe, idempotent, and cacheable for this operation;
   - request body meaning;
   - expected automatic retry behavior;
   - success, conflict, validation, unsupported-media, precondition, rate-limit, and overload
     statuses.
2. Check safe methods first.
   - GET, HEAD, and OPTIONS must not request business mutations.
   - Safe does not mean unauthenticated, cheap, unmetered, or cache-public.
   - Crawlers, link previews, browser prefetch, health checks, and monitoring can trigger safe
     methods.
3. Reject public GET and HEAD request-body semantics unless the API intentionally documents a
   non-portable private contract.
   - Prefer GET query parameters for small, shareable, cacheable, non-sensitive reads.
   - Prefer QUERY for safe, idempotent, body-bearing queries when clients, gateways, servers, and
     docs can support it.
   - Use POST as a compatibility fallback or state-changing processing request, not as an unnamed
     safe query.
4. Review OPTIONS as capability discovery.
   - OPTIONS is not only a CORS preflight shortcut.
   - Keep `Allow` for HTTP method support separate from `Access-Control-Allow-Methods` for CORS.
   - Ensure 405 responses include an accurate `Allow` header.
5. Review POST versus PUT URI ownership.
   - Use POST when the server chooses the new resource URI or processes a resource-specific command.
   - Use PUT when the client knows the target URI and wants that target representation created or
     replaced.
   - Do not let PUT write to a different URI without redirect or explicit contract.
6. Review PUT as replacement.
   - A PUT body is the new representation for the target URI, not a partial DTO by default.
   - Reject incomplete replacement bodies, require full client-owned representations, or choose
     PATCH or a command resource instead.
   - For create-only PUT, require `If-None-Match: *` where concurrent creation matters.
   - For update-only PUT, require `If-Match` or another version precondition where lost updates
     matter.
7. Review PATCH as patch document application.
   - Pick and document the patch media type, such as `application/merge-patch+json`,
     `application/json-patch+json`, or a domain-specific media type.
   - Do not use bare `application/json` when null, omission, delete, array, and command semantics
     are ambiguous.
   - Advertise supported patch formats with `Accept-Patch` where capability discovery matters.
   - Apply the whole patch atomically. Partial patch success is a contract failure.
   - Validate the resulting resource, not only the patch document syntax.
8. Review DELETE as target-resource unlinking, not necessarily physical storage deletion.
   - Do not require identical repeat response statuses for idempotency; require identical intended
     effect and duplicate-safe side effects.
   - Avoid DELETE request bodies for portable bulk or filtered deletes. Prefer item DELETE calls or
     POST command resources such as deletion jobs.
   - Document soft-delete, tombstone, retention, restore, and audit behavior when callers rely on
     lifecycle outcomes.
9. Review conditional requests and lost-update protection.
   - Use strong ETags or equivalent version tokens when concurrent writers can overwrite one
     another.
   - Use `If-Match` for update preconditions and `If-None-Match: *` for create-if-absent.
   - Return `412 Precondition Failed` for failed preconditions and `428 Precondition Required` when
     the API refuses unsafe writes without preconditions.
10. Review QUERY and search design.
    - Keep simple, bookmarkable, shareable, cacheable searches on GET where possible.
    - Use QUERY for safe, idempotent, body-bearing queries whose inputs do not belong cleanly in the
      URI.
    - Define the request media type and reject missing or inconsistent Content-Type.
    - Expose support through `Allow` and supported query formats through `Accept-Query` when
      clients need discovery.
    - Build cache keys from request content plus relevant metadata, and canonicalize only
      semantically insignificant differences.
    - Decide whether `Content-Location`, `Location`, or `303 See Other` gives callers a GET-able
      result, equivalent query, or stored job/resource.
    - Use POST fallback only as a compatibility shell over the same internal query model.
11. Review status codes as recovery instructions.
    - Use `201` plus `Location` and preferably `ETag` when a resource is created.
    - Use `202` plus a status resource when work is accepted but unfinished.
    - Use `204` for successful no-body responses, `206` for partial content, and `304` for
      conditional cache validation.
    - Separate malformed input (`400`), unsupported media (`415`), current-state conflict (`409`),
      failed precondition (`412`), missing precondition (`428`), valid-but-unprocessable content
      (`422`), method unsupported for the resource (`405` with `Allow`), method unknown (`501`),
      rate limit (`429` with `Retry-After` where useful), and overload (`503` with `Retry-After`
      where useful).
12. Review HTTP cache semantics.
    - `no-cache` means revalidate before reuse. `no-store` means do not store.
    - Use `private`, `public`, `s-maxage`, validators, and `Vary` according to viewer, auth,
      language, encoding, content negotiation, and tenant dimensions.
    - Do not assume a successful unsafe method invalidates every list, search, feed, recommendation,
      CDN tag, or read model that can include the changed resource.
13. Check synchronized surfaces before finalizing.
    - Route code, validators, OpenAPI or docs, generated clients, SDK examples, gateway and CORS
      config, cache config, status-code fixtures, retry docs, tests, monitoring, and release notes
      should agree with the HTTP method contract.
    - If deterministic proxy, CDN, browser, or gateway evidence is unavailable, report that gap
      instead of claiming portability.

## Strongly Forbidden Patterns

- GET, HEAD, or OPTIONS hidden business mutations.
- Public GET or HEAD request bodies as if they were portable HTTP contracts.
- PUT partial update merge without an explicit non-PUT contract.
- PATCH with ambiguous `application/json` semantics.
- PATCH partial success.
- DELETE request bodies for portable bulk or filtered operations.
- Treating DELETE idempotency as identical status codes while duplicate side effects replay.
- Treating `no-cache` as `no-store`.
- Mixing `Allow` with `Access-Control-Allow-Methods`.
- POST search without naming safe-query fallback and cache behavior.
- QUERY without media type, support discovery, body-aware cache key, and intermediary support plan.
- Collapsing status codes so clients cannot tell whether to fix input, refresh state, retry later,
  update ETags, or change media type.

<!-- mustflow-section: postconditions -->
## Postconditions

- Method semantics, request body meaning, URI ownership, retry expectations, status-code recovery,
  conditional requests, capability discovery, cache semantics, and intermediary assumptions are
  explicit or reported as missing.
- PUT, PATCH, DELETE, GET, HEAD, OPTIONS, POST, and QUERY behavior is either aligned with HTTP
  semantics or intentionally documented as a narrow non-portable contract.
- API docs, tests, SDKs, generated clients, gateways, CORS rules, cache headers, and observability
  agree with the chosen HTTP contract where relevant.

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

Prefer the narrowest configured tests or docs checks that exercise the HTTP method, status, header,
cache, conditional request, QUERY, fallback, or generated-client contract from a caller's
perspective. Do not infer raw browser, proxy, CDN, gateway, load-test, or live-network commands
outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the contract source of truth is unclear, stop and report the competing route, schema, gateway,
  docs, and SDK sources instead of editing only one surface.
- If a method choice conflicts with existing callers, classify the compatibility risk and use
  `api-contract-change` before changing public behavior.
- If duplicate side effects, cache sharing, security, or streaming delivery risks are found, switch
  to the narrower matching skill before finalizing that part.
- If deterministic HTTP interoperability proof requires browser, gateway, CDN, proxy, or production
  telemetry not configured in `.mustflow/config/commands.toml`, complete available local checks and
  report the manual evidence gap.

<!-- mustflow-section: output-format -->
## Output Format

- HTTP API semantics reviewed
- Endpoint method ledger
- Safe, idempotent, cacheable, request-body, URI-ownership, PUT, PATCH, DELETE, QUERY, conditional
  request, status-code, header discovery, CORS, cache, retry, and intermediary findings
- Fixes made or recommendations
- Synchronized docs, tests, SDK, generated client, gateway, and cache surfaces
- Evidence level: configured-test evidence, docs evidence, static review risk, manual-only,
  missing, or not applicable
- Command intents run
- Skipped HTTP interoperability checks and reasons
- Remaining HTTP semantics risk
