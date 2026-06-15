---
mustflow_doc: skill.api-access-control-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: api-access-control-review
description: Apply this skill when code is created, changed, reviewed, or reported and API security needs access-control review for BOLA or IDOR, object-level authorization, object-property authorization, function-level authorization, broken authentication, tenant isolation, role and relationship checks, mass assignment, DTO exposure, admin or internal APIs, route ordering, GraphQL resolvers, batch APIs, exports, downloads, signed URLs, cache keys, async jobs, webhooks, OAuth or OIDC, JWTs, sessions, cookies, reauthentication, reset tokens, account enumeration, automation defense, or denial-case tests.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.api-access-control-review
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

# API Access Control Review

<!-- mustflow-section: purpose -->
## Purpose

Review API security as an access-control proof, not as a login check.

The review question is not "is the user authenticated?" It is "may this principal, at this moment,
perform this action on this object, this field, and this tenant context?"

<!-- mustflow-section: use-when -->
## Use When

- Code review, implementation, or refactor work touches API routes, controllers, handlers,
  resolvers, RPC procedures, service methods, repositories, database queries, storage signers,
  exports, downloads, previews, batch APIs, background jobs, webhooks, auth middleware, sessions,
  cookies, JWTs, OAuth or OIDC flows, password reset, MFA, admin APIs, internal APIs, cache keys,
  DTO mapping, tests, or API docs.
- A request, token, body, query string, path parameter, webhook payload, queue payload, or client
  state supplies `userId`, `accountId`, `tenantId`, `orgId`, `workspaceId`, `projectId`, `role`,
  `ownerId`, object id, file key, status, price, entitlement, plan, or other authority-bearing data.
- A review needs API-specific authorization coverage for BOLA or IDOR, broken authentication,
  object-property authorization, function-level authorization, mass assignment, object storage
  access, tenant isolation, GraphQL resolver access, batch authorization, signed URLs, token
  validation, session hardening, account enumeration, automation defense, or denial-case tests.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task changes the authorization model, role matrix, permission implementation, route guards, or
  session/token code and needs implementation guidance; use `auth-permission-change` first and this
  skill for API-specific review coverage.
- The task is a broad security source-to-sink review beyond API access control; use
  `security-flow-review`.
- The task is only public API schema compatibility, pagination shape, status codes, or generated
  client drift; use `api-contract-change` first.
- The task is only caller ergonomics or API misuse risk without security boundary pressure; use
  `api-misuse-resistance-review`.
- The task asks for live exploitation, credential guessing, penetration testing traffic, or unsafe
  payload collection. Stay within defensive local code review and tests.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, current diff or target files, API surface, and the access-control claim being reviewed.
- Subject-object-action-context ledger: principal, session, token, API key, service account, tenant,
  organization, workspace, role, relationship, resource, object id, field or property, action,
  state, and request context.
- Object authorization ledger: list, detail, count, search, export, download, preview, share,
  update, delete, approve, invite, refund, transfer, admin, batch, worker, and webhook paths that
  can reach the same object.
- Property authorization ledger: request fields, response fields, updateable fields, hidden fields,
  sensitive fields, computed fields, internal ids, storage keys, provider ids, and privileged
  mutable fields.
- Function authorization ledger: API route, resolver, RPC procedure, admin function, support tool,
  internal endpoint, queue handler, webhook handler, and storage signer operations.
- Authentication proof ledger: auth middleware, session store, cookie settings, JWT verifier,
  OAuth/OIDC handling, API key verifier, reset tokens, reauthentication points, account enumeration
  behavior, and automation controls.
- Existing tests, denial cases, role matrices, API docs, security docs, and configured command
  intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required inputs are available, or missing subject, object, action, tenant, field, token, cache, or
  denial-test evidence can be reported without guessing.
- Treat client-provided identity, tenant, role, ownership, status, plan, and entitlement values as
  untrusted until server context and persisted relationships prove them.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten server-side object authorization, tenant-scoped lookups, relationship checks,
  function-level checks, property allowlists, DTO mappers, signed URL scoping, cache-key dimensions,
  worker revalidation, webhook ownership mapping, token verification, session hardening,
  reauthentication gates, enumeration-safe responses, rate limits, audit logs, and denial-case tests.
- Update route docs, API examples, role matrices, security docs, fixtures, SDK tests, and template
  surfaces that describe the same access-control contract.
- Keep changes scoped to the reviewed API boundary and its synchronized surfaces.
- Do not add broad scanners, live external probes, offensive payload collections, unrelated
  hardening, or new command authority under this skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Ask the full permission question.
   - Do not stop at "logged in".
   - Ask whether this requester can perform this action on this object, this field, in this tenant,
     in this state, right now.
2. Treat request-supplied identity as hostile.
   - `userId`, `accountId`, `tenantId`, `orgId`, `workspaceId`, `role`, `ownerId`, `plan`, and
     similar values from body, query, headers, path params, local storage, or token claims are leads,
     not authority.
   - Derive truth from server session, verified token context, database relationships, and current
     persisted state.
3. Bind authorization to the data lookup.
   - Prefer lookups such as `findByIdAndOwner`, `where id = ? and tenant_id = ?`, or policy-scoped
     repository methods over `findById` followed by a fragile caller-side check.
   - If existence disclosure must be hidden, keep missing and unauthorized behavior consistent.
4. Separate authentication from authorization.
   - `isAuthenticated`, valid session, API key, or decoded JWT says who is calling.
   - It does not say whether the object, field, tenant, or action is allowed.
5. Replace role-only checks with relationship and context checks.
   - `role === "admin"` is usually too small.
   - Check whether the principal is admin for this organization, owner of this project, seller for
     this order, billing admin for this account, or allowed to act in this resource state.
6. Compare list and detail scopes.
   - If list filters by current user or tenant but detail, count, search, analytics, export, or
     download uses only object id, report the gap.
7. Review write APIs harder than read APIs.
   - `PUT`, `PATCH`, `DELETE`, approve, refund, invite, transfer, publish, restore, and role-change
     operations need write-specific permission, state, amount, and audit checks.
   - Read permission is not write permission.
8. Stop mass assignment at the boundary.
   - Flag request-body-to-entity binding, raw DTO persistence, GraphQL input passthrough, ORM update
     data from raw body, and blind spread or object assignment.
   - Privileged fields such as `role`, `status`, `ownerId`, `tenantId`, `isVerified`, `plan`,
     `credit`, `deletedAt`, `price`, and `quota` must be derived, guarded, or allowlisted.
9. Check response DTOs for property-level exposure.
   - Entity-to-JSON responses can leak `passwordHash`, `mfaSecret`, `internalMemo`,
     `billingCustomerId`, storage keys, provider IDs, deletion reasons, or admin-only fields later.
   - Use public response mappers and role-aware field policies when field visibility differs.
10. Treat client-side admin UI as decoration.
    - Hidden buttons, disabled controls, frontend routes, mobile checks, and generated clients are
      not access control.
    - Admin and support operations need server-side scope, reason, audit, and denial tests.
11. Search for temporary public holes.
    - Inspect `permitAll`, `anonymous`, `skipAuth`, `bypassAuth`, `public`, `internalOnly`,
      `devOnly`, `TODO auth`, debug endpoints, health endpoints with extra data, and test-only
      switches that can reach real data or operations.
12. Review router and middleware order.
    - Dynamic routes like `/:id` can shadow `/me`, `/admin`, or `/settings`.
    - Prefix middleware can leave sibling paths, nested routers, serverless functions, or framework
      route groups unauthenticated.
13. Review GraphQL per resolver.
    - Endpoint-level auth is not enough.
    - Check `node(id)`, nested fields, connections, edges, aggregates, mutations, and field
      resolvers for object and property authorization.
14. Review batch APIs per item.
    - Bulk create, delete, export, import, and update endpoints must authorize every object.
    - Define whether one denied item fails the whole request, returns per-item results, or produces
      a retrievable failure report.
15. Review export, download, preview, thumbnail, and share paths.
    - CRUD may be protected while file delivery, generated previews, thumbnails, CSV exports, and
      shared links bypass the same policy.
16. Treat signed storage URLs as outputs of authorization.
    - S3, GCS, R2, CDN, and private file URLs must be generated only after object authorization.
    - Check key predictability, URL lifetime, scope, content disposition, cache behavior, revocation,
      and whether direct object access bypasses policy.
17. Enforce tenant boundaries in every query and cache.
    - `WHERE id = ?` is weak in multi-tenant code; include tenant, membership, owner, sharing, or
      database policy constraints.
    - Cache keys for private data need tenant and permission dimensions, not just object id.
18. Revalidate asynchronous jobs.
    - Queue payloads with only `userId`, `tenantId`, or `fileId` can outlive permission changes.
    - Workers, retries, admin reruns, scheduled tasks, and webhook-triggered jobs need actor,
      tenant, resource, state, and current permission or service-principal checks at execution time.
19. Separate webhook authenticity from authorization.
    - Signature verification proves the provider sent the event.
    - Ownership mapping proves the event belongs to this tenant, account, customer, installation,
      repository, subscription, or resource.
20. Keep OAuth and OIDC purposes distinct.
    - OIDC ID tokens identify a user for login.
    - OAuth access tokens authorize delegated API access.
    - Do not use an ID token as an API permission token or an access token as a login proof without
      the appropriate validation and intent.
21. Verify JWTs completely.
    - Decoding is not verification.
    - Check signature, algorithm allowlist, issuer, audience, expiry, not-before when used, key
      source, key rotation, subject, tenant binding, and stale authorization claims.
22. Treat token claims as snapshots, not eternal truth.
    - Long-lived `role`, `plan`, `tenantId`, and permission claims can survive demotion, removal,
      subscription cancellation, suspension, or revocation.
    - Important decisions should check current server-side state or use short-lived tokens with
      revocation strategy.
23. Regenerate session identity after privilege changes.
    - Login, password change, MFA changes, role changes, user-to-admin transitions, and account
      recovery should rotate session identifiers or refresh tokens according to local policy.
24. Check authentication cookies.
    - Cookies carrying session authority need `Secure`, `HttpOnly`, appropriate `SameSite`,
      domain, path, lifetime, rotation, logout, revocation, and CSRF posture.
    - Avoid URL-carried session identifiers.
25. Require reauthentication for sensitive actions.
    - Password change, email change, MFA disable, payment method change, organization ownership
      transfer, API-key creation, and destructive admin actions should require fresh proof.
26. Review reset and magic-link tokens.
    - Tokens need strong randomness, one-time use, short expiration, purpose binding, user binding,
      safe storage, link-preview protection, session invalidation where needed, and no reuse across
      unrelated flows.
27. Compare account-enumeration responses.
    - Login, signup, password reset, magic link, invitation, and email verification should avoid
      leaking account existence through message, status, timing, or email-sending behavior unless
      product policy accepts that disclosure.
28. Treat automation defense as part of authentication.
    - Login, OTP, magic link, password reset, invite acceptance, coupon application, email
      verification, and MFA attempts need rate limits, lockouts, challenge policy, IP/device/user
      dimensions, and observability.
29. Separate internal and external identity planes.
    - Backoffice, operator, database, middleware, and support accounts should not flow through the
      same customer login path unless the product intentionally models and audits that boundary.
30. Test the denial matrix.
    - Success tests prove little.
    - For each protected resource, cover anonymous, normal user, other owner, same organization
      different role, other tenant, admin wrong tenant, revoked user, suspended member, stale token,
      read-only API key, and service account cases where relevant.

<!-- mustflow-section: postconditions -->
## Postconditions

- The API access-control decision names subject, object, action, field or property, tenant or owner,
  current state, and trusted context when those apply.
- Authentication, object authorization, property authorization, and function authorization are not
  collapsed into one route guard.
- Client-supplied identity and authority fields are either ignored, verified against server-side
  state, or explicitly reported as risky.
- List, detail, search, export, download, batch, worker, webhook, signed URL, cache, GraphQL, and
  admin paths are checked or explicitly scoped out.
- Token, session, cookie, OAuth/OIDC, reset, reauthentication, account-enumeration, and automation
  defenses are checked when touched.
- Denial-case tests or missing test gaps are named from the attacker's point of view.

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

Prefer the narrowest configured tests that prove denial behavior: wrong owner, wrong tenant, wrong
role, revoked or suspended actor, stale token, forbidden field update, mass-assignment attempt,
unauthorized export or download, unauthorized batch item, worker revalidation, webhook ownership,
and account-enumeration response parity.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If subject, object, action, field, tenant, state, source of truth, or denial evidence is missing,
  report the gap instead of claiming the API is safe.
- If the fix requires broad auth model changes, use `auth-permission-change` before editing that
  scope.
- If a sensitive value appears in logs, diffs, fixtures, screenshots, command output, or final
  reports, stop repeating it and use `secret-exposure-response` when it may be a real secret.
- If a command fails, use `failure-triage` before further edits.

<!-- mustflow-section: output-format -->
## Output Format

- API access control reviewed
- Subject, object, action, field, tenant or owner, state, and trusted context
- Object, property, and function authorization findings
- Authentication, session, token, cookie, OAuth/OIDC, reset, reauthentication, enumeration, and
  automation findings
- List/detail/search/export/download/batch/worker/webhook/signed URL/cache/GraphQL/admin findings
- Fixes made or recommendation
- Denial tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining API access-control risk
