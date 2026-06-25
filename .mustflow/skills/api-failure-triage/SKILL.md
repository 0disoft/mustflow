---
mustflow_doc: skill.api-failure-triage
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: api-failure-triage
description: Apply this skill when an API request, SDK call, webhook callback, browser request, mobile call, gateway route, CORS preflight, CDN or load-balancer path, upstream dependency call, or OpenAPI-backed integration is failing, intermittent, slow, returning the wrong status or body, blocked by authentication or authorization, rate-limited, retried, cached incorrectly, or not yet localized to client, network, proxy, app, database, cache, provider, or deployment configuration. Use before api-request-performance-review when the first job is to preserve the failing wire evidence and cut the failure boundary.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.api-failure-triage
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

# API Failure Triage

<!-- mustflow-section: purpose -->
## Purpose

Triage API failures by preserving the actual request and cutting the path boundary before editing
code.

The first question is not "which log looks suspicious?" It is "what bytes left the caller, what
bytes came back, which boundary changed them, and what evidence would disprove each hypothesis?"

<!-- mustflow-section: use-when -->
## Use When

- A user reports that an API call, SDK request, browser request, mobile request, webhook callback,
  backend-for-frontend path, gateway route, CDN path, load-balancer path, or provider integration is
  failing or intermittent.
- The failure is not yet localized to client code, DNS, TCP, TLS, proxy, CORS preflight, redirect,
  gateway, app handler, database, cache, external provider, rate limiter, retry policy, auth,
  deployment configuration, or OpenAPI drift.
- Code or docs claim an API failure is a network issue, CORS issue, server issue, auth issue, cache
  issue, provider issue, or retry issue without preserved wire evidence.
- A fix might otherwise start from logs, framework assumptions, SDK behavior, browser console text,
  or a broad search before one failing request is captured.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The failing request is already reproduced and the root cause is clear enough for a targeted fix;
  use the narrower code, API contract, cache, retry, auth, database, or failure-integrity skill.
- The task is only per-request latency optimization after the API path is known; use
  `api-request-performance-review`.
- The task is only public error wording or error-envelope cleanup; use
  `error-message-integrity-review`.
- The task is only observability design with no current API failure to localize; use
  `observability-debuggability-review`.
- Reproduction requires live production secrets, destructive calls, real payments, real user data,
  private logs, or unconfigured external systems. Preserve available static evidence and report the
  manual boundary instead.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Failure packet: observed time and timezone, request id or trace id when present, caller, client or
  SDK version, API version, method, URL route template, sanitized headers, sanitized body shape,
  status code, response headers, response body shape, total latency, and retry or redirect behavior.
- Success comparator: a nearby successful request, previous working version, same request with one
  dimension changed, or a documented expected request shape.
- Boundary ledger: client, browser preflight, SDK middleware, DNS, TCP, TLS, proxy, CDN, WAF,
  gateway, load balancer, app, queue, database, cache, external provider, and response serialization
  boundaries relevant to the path.
- Timing ledger: name lookup, connection, TLS, first byte, total transfer, app handler time, queue
  time, pool wait, database time, cache time, external dependency time, serialization time, and
  download time when evidence exists.
- Contract ledger: HTTP method, redirect behavior, content negotiation, content type, encoding,
  status code semantics, error envelope, retryability, idempotency, rate-limit headers, cache
  headers, OpenAPI or generated-client contract, and deployment version.
- Auth ledger: credential presence, token expiry and not-before time, signature timestamp, clock
  skew, user or service principal, object authorization, tenant scope, and proxy header preservation.
- Change ledger: deploy, config, secret, feature flag, routing rule, schema migration, provider
  version, generated client, cache policy, rate-limit policy, and environment difference near the
  first bad time.
- Relevant command-intent contract entries for tests, builds, docs, release checks, and mustflow
  validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required request, response, boundary, timing, contract, auth, and change evidence is available or
  can be reported as missing without guessing.
- If the preserved evidence exposes secrets, tokens, cookies, personal data, payment data, private
  URLs, raw bodies, or hidden reasoning, summarize and redact rather than copying it into docs,
  tests, logs, commits, or final reports.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten request parsing, content-type handling, status mapping, Problem Details or local
  error-envelope mapping, request ID propagation, trace context, auth checks, proxy header handling,
  timeout classification, retry and idempotency classification, rate-limit response handling, cache
  header handling, OpenAPI contract tests, deployment config comparison tests, and focused
  reproduction fixtures.
- Add focused tests that preserve the failing wire shape, success/failure comparator, status and
  body contract, auth boundary, retryability, cache behavior, OpenAPI drift, or deployment config
  difference.
- Do not add broad retries, blanket cache bypasses, CORS wildcards, auth bypasses, status-code
  remapping, proxy header trust, live provider calls, raw production log dumps, or speculative
  framework rewrites before the failing boundary is localized.
- Do not treat browser console text, SDK exception text, status code alone, or application logs alone
  as the failing request evidence.

<!-- mustflow-section: procedure -->
## Procedure

1. Preserve one failing request packet.
   - Record method, route template, sanitized headers, sanitized body shape, status, response
     headers, response body shape, total latency, request id, trace id, caller version, API version,
     and observed time basis.
   - If the failure is intermittent, keep the first bad time and a small sample of failing and
     successful packets rather than a raw log dump.
2. Compare success and failure at the wire boundary.
   - Compare actual transmitted method, URL encoding, query order and defaults, headers, cookies,
     body shape, null versus empty string, array order, content type, accept header, charset, API
     version, and redirect path.
   - Do not compare only source code or SDK call arguments because middleware, retries, proxies,
     redirects, and defaults can rewrite the request.
3. Cut the path into boundaries.
   - Check whether the request reaches each boundary: client, preflight, SDK, DNS, TCP, TLS, proxy,
     CDN, WAF, gateway, load balancer, app handler, queue, database, cache, external provider, and
     response serializer.
   - Prefer evidence that halves the search space. If the app never sees the request, app logs are
     not the first evidence source.
4. Split timing before assigning blame.
   - Separate name lookup, connection, TLS, first byte, total download, app handler time, queue time,
     pool wait, database time, cache time, external dependency time, serialization time, and payload
     transfer when available.
   - Average latency is weak evidence. Use endpoint, status, region, client, API version, and
     percentile slices when telemetry exists.
5. Check browser-only failures separately.
   - For browser-only symptoms, inspect preflight, allowed method, allowed headers, credentials
     mode, redirect behavior, and whether the failing request happens before the real method is sent.
   - For server-to-server failures, do not diagnose CORS unless a browser boundary is actually
     involved.
6. Check redirect and proxy mutation.
   - Verify whether redirects change method, body, host, scheme, authorization, cookies, or signed
     headers.
   - Verify whether proxies preserve `Authorization`, `Host`, forwarded headers, request ids,
     trace context, content length, idempotency keys, and rate-limit headers according to local
     trust policy.
7. Check status, body, and content-type consistency.
   - A `200` response with an error body, a `500` for caller validation, a hidden `404` for auth,
     or a JSON content type with an HTML error body can break clients and monitoring.
   - Map API errors to stable codes, request IDs, invalid fields, retryability, and safe support
     evidence when the local contract supports it.
8. Split authentication from authorization.
   - Verify credentials were sent, valid, not expired, and signed against the expected time basis.
   - Separately verify whether the authenticated principal can access the target object, property,
     tenant, or function.
   - Treat "same token, different resource id returns another user's data" as an access-control
     incident, not ordinary debugging.
9. Check clock and signature time.
   - Review token `exp` or `nbf`, signed request timestamps, webhook timestamps, cache expiry, rate
     limit windows, and server/client clock skew when the failure is intermittent or boundary-time
     sensitive.
10. Check retry, timeout, rate limit, and idempotency.
    - Separate connect, TLS, first-byte, read, write, dependency, pool, and total-deadline failures
      when evidence exists.
    - Confirm retries are bounded, jittered, scoped to one layer, and safe for the operation.
    - For side-effecting requests, require a durable idempotency key and result replay or unknown
      outcome reconciliation before retrying.
    - Preserve `429`, rate-limit policy, and retry-after semantics instead of turning throttling into
      generic server failure.
11. Check cache and content negotiation.
    - Compare cached and cache-bypassed behavior when allowed by the current command and environment
      boundary.
    - Inspect cache-control, validators, age, vary dimensions, authorization or cookie variance,
      API version, language, query dimensions, and stale or negative-cache behavior.
12. Check app-internal cost and dependency fan-out only after the request reaches the app.
    - If the app receives the request, build a compact cost ledger for database, cache, external API,
      serialization, compression, and response size.
    - Use `api-request-performance-review`, database, cache, retry, queue, or observability skills
      for the localized subproblem.
13. Check OpenAPI and generated-client drift.
    - Compare deployed behavior with the documented contract: required fields, nullability, enum
      values, status codes, headers, content type, and error envelope.
    - Treat generated client, SDK, or schema drift as a contract issue even when the server and
      client each look locally correct.
14. Check deployment and environment diffs.
    - Near the first bad time, compare release id, config, secret names, routing rules, feature
      flags, provider account, migration state, cache policy, rate-limit policy, and generated
      artifacts.
    - Do not blame code before environment and route changes are ruled in or out.
15. Maintain a hypothesis table.
    - For each hypothesis, write the expected evidence and the observation that would disprove it.
    - Kill wrong hypotheses quickly. Long log reading without a falsifiable hypothesis is not
      progress.
16. Apply the smallest localized fix.
    - Once the boundary is proven, switch to the specific skill for that boundary and edit only the
      owning code, contract, test, doc, template, or config surface.
    - Re-run the original reproduction path or the closest configured intent after the fix.

<!-- mustflow-section: postconditions -->
## Postconditions

- The failing request packet, success comparator, boundary ledger, timing ledger, contract ledger,
  auth ledger, and change ledger are explicit or reported as missing.
- The failure is localized to a boundary or left as a named evidence gap instead of a guessed cause.
- Status/body/content-type, CORS/preflight, redirects, proxy headers, authn/authz, clock skew,
  timeout/retry/rate-limit/idempotency, cache headers, OpenAPI drift, and deployment diffs are fixed
  or reported where relevant.
- Any follow-up skill is selected because the boundary is now localized, not because the first guess
  sounded plausible.

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

Prefer the narrowest configured test, build, docs, release, or mustflow intent that covers the
localized API failure boundary. Do not infer raw servers, live providers, database shells, browser
sessions, packet captures, production logs, load tests, profilers, or network probes outside the
command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the failing request packet cannot be captured, stop speculative edits and report the closest
  safe evidence plus the missing packet fields.
- If evidence contains secrets or personal data, redact before storing or reporting it.
- If boundary evidence requires live production access, private dashboards, external provider
  consoles, or unconfigured network diagnostics, report the manual evidence boundary.
- If a configured command fails, preserve the failing intent and output tail, then fix only the API
  boundary or contract exercised by that failure.
- If the root cause points to security, payment, rate limit, cache, retry, queue, or deployment risk,
  switch to the narrower matching skill before editing that part.

<!-- mustflow-section: output-format -->
## Output Format

- API failure triaged
- Failing request packet and success comparator, with redactions
- Boundary and timing ledger
- Status/body/content-type, CORS/preflight, redirect/proxy, authn/authz, clock, retry/timeout,
  rate-limit/idempotency, cache, OpenAPI, and deployment-diff findings
- Hypotheses killed, still open, and selected localized boundary
- Fix applied or recommended
- Evidence level: reproduced packet, comparator evidence, configured-test evidence, static review
  risk, manual-only, missing, or not applicable
- Command intents run
- Skipped diagnostics and reasons
- Remaining API-failure risk
