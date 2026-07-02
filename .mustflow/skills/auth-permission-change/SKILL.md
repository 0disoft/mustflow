---
mustflow_doc: skill.auth-permission-change
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: auth-permission-change
description: Apply this skill when authentication, authorization, permissions, roles, RBAC or ABAC policy decisions, tenants, organization or team memberships, sessions, cookies, JWTs, refresh tokens, OAuth or OIDC, passkeys, MFA, account recovery, API keys, route guards, admin access, database policies, object-level access control, signed delivery URLs, credentialed event streams, private cache behavior, or account-takeover response paths are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.auth-permission-change
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

# Auth Permission Change

<!-- mustflow-section: purpose -->
## Purpose

Keep authentication and authorization separate, enforce permissions on the server or database for every protected request, and prevent client-only guards from being treated as a security boundary.

Authentication answers who the requester is. Authorization answers what that principal can do to this resource in this tenant right now. Login state, verified email, a valid JWT, a visible admin button, or a client redirect is not permission.

<!-- mustflow-section: use-when -->
## Use When

- Authentication, authorization, role, permission, capability, RBAC, ABAC, policy, tenant, workspace, organization, team, session, cookie, JWT, refresh token, OAuth, OIDC, passkey, MFA, API key, invite, reset token, email change, account recovery, route guard, admin, impersonation, audit, or database policy behavior changes.
- A route, resolver, controller, service, command handler, job, webhook, API client, generated SDK, UI guard, or database query starts relying on user, tenant, role, ownership, membership, or resource identity.
- A change affects object-level access control, multi-tenant isolation, shared resources, signed URLs, exports, search, autocomplete, background jobs, webhooks, or admin/support tooling.
- A change affects credentialed EventSource/SSE streams, WebTransport sessions, WebSocket fallback, signed delivery URLs, private file delivery, CDN/proxy cache keys, CORS credentials, cookies, or auth tokens embedded in delivery URLs.
- A change modifies status code behavior for auth failures, especially 401, 403, or policy-driven 404.
- A permission model, role matrix, API docs, admin docs, migration, or tests need to stay aligned with authorization behavior.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only password hashing, cryptography, secure transport, secret handling, or generic privacy review with no auth or permission boundary; use `security-privacy-review`.
- The task only adds abuse-case tests after a boundary is already understood; use `security-regression-tests` for that part.
- The task only changes UI text for a public page and does not affect route guards, server checks, roles, sessions, or access decisions.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Changed files, user goal, affected actors, protected resources, actions, tenants, organizations, teams, roles, and status-code expectations.
- Permission decision tuple for each changed protected action: subject, action, object, tenant or
  organization, relationship path, request environment, policy version, data revision, token issue
  time, and final allow or deny reason.
- Effective-permission evidence, not only role names: computed capabilities, inherited
  relationships, explicit denies, wildcard policies, policy-combination rules, and default-deny
  behavior.
- Attribute and relationship evidence for ABAC or relationship-based policy: attribute source of
  truth, freshness, trust boundary, failure behavior, policy version, and explainable deny reason.
- Auth middleware, framework hooks, gateway checks, session config, cookie config, JWT verifier,
  refresh-token store, OAuth/OIDC callback, MFA or passkey verifier, API key verifier, and logout
  or revocation code when relevant.
- Route guards, client guards, server controllers, resolvers, command handlers, services, policy functions, role or permission tables, database queries, RLS, views, stored procedures, and ORM scopes.
- Tenant, organization, workspace, project, team, membership, invite, suspension, ownership,
  last-owner, sharing, account-recovery, and admin-support data models.
- Background jobs, queue payloads, webhooks, import/export flows, search or autocomplete indexes, signed URL generation, storage keys, SSE or streaming channels, WebTransport sessions, WebSocket fallback, CDN cache, proxy cache, and permission caches when they can expose protected data.
- Audit logs, admin action logs, impersonation records, denied-access logs, API docs, role matrix docs, migrations, and tests.
- Revocation and cache evidence: token claim freshness, session lifetime, permission-cache key and
  TTL, policy replication delay, search-index or export lag, stale queue payloads, and rollback or
  shadow-evaluation behavior when policy changes.
- Account-takeover and recovery evidence: login throttling, credential-stuffing controls, password
  reset, magic-link, MFA reset, email change, trusted-device, session-kill, notification, and
  high-risk-action hold behavior.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Classify the change as authentication, authorization, or both before editing.
- Identify principal, tenant, resource, action, and context for each protected operation.
- Treat client-provided `userId`, `tenantId`, `workspaceId`, `role`, `isAdmin`, object id, API key label, token claim, and local storage value as untrusted.
- For browser web apps, identify whether auth state is server-held, BFF-mediated, or token-held by
  browser code. Treat local storage, session storage, URL tokens, and JavaScript-readable long-lived
  tokens as exposure risks, not neutral implementation details.
- Find the current policy source of truth. If authorization is scattered across routes, do not add another scattered condition without first considering a central policy function.
- Know whether the product intentionally hides resource existence with 404 or exposes permission denial with 403.
- If SSE, WebTransport, WebSocket fallback, signed URL, CORS, cookie, CDN cache, proxy cache, or streaming delivery behavior changes, use `http-delivery-streaming` for the transport contract while this skill checks access control.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten server-side authorization checks, policy functions, database scopes, RLS, query constraints, audit logs, docs, and tests.
- Adjust client guards only as UX, and only while keeping or adding server/database enforcement.
- Add role or permission migration logic only with deny-by-default behavior and explicit backfill rationale.
- Keep docs, generated clients, role matrices, status-code behavior, and tests synchronized with changed auth behavior.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the boundary:
   - authentication: verifies a principal from a session, cookie, JWT, refresh token, OAuth/OIDC
     account, passkey, MFA event, API key, service account, reset token, magic link, or anonymous
     state;
   - authorization: decides whether that principal can perform an action on a resource within a tenant and context.
2. Read the mandatory surfaces that apply:
   - auth middleware, hooks, gateway, session store, cookies, JWT, refresh tokens, OAuth/OIDC,
     passkeys, MFA, API key verification, logout, revocation, and token rotation;
   - route guards, client redirects, server controllers, resolvers, services, command handlers, policy calls, and admin tools;
   - tenant resolver, membership schema, role assignment, invite flow, suspension, ownership,
     last-owner, sharing, account-recovery, and impersonation model;
   - database queries, tenant scopes, ownership joins, soft-delete filters, RLS, views, stored procedures, and ORM helpers;
   - background jobs, queues, webhooks, import/export, file storage, signed URLs, SSE or streaming channels, WebTransport sessions, WebSocket fallback, search, autocomplete, caches, CDN or proxy cache rules, audit logs, docs, migrations, and tests.
3. Write the permission decision inputs for each protected action: principal, tenant, resource, action, and context.
4. Freeze the authorization decision tuple.
   - Record subject, action, object, tenant, environment, policy version, data revision, token issue
     time, matched policy, inheritance path, and final allow or deny reason.
   - A role label is not the decision. Use effective permissions and relationship paths.
5. Separate identity from permission:
   - `req.user`, a valid session, verified email, valid JWT, OAuth scope, or API key proves identity only;
   - owner, active member, org admin, global admin, support user, service account, API client, and shared-link viewer need separate authorization rules.
6. Prefer one central policy shape, such as a `can(principal, action, resource, context)` function, over route-local `isAdmin`, `isOwner`, or `isMember` fragments.
7. Require explainable policy decisions.
   - A production-supportable permission engine should expose which policy matched, which condition
     failed, which inherited relationship granted access, and whether an explicit deny won.
   - If the implementation cannot explain allow or deny decisions, report observability risk before
     claiming the policy is maintainable.
8. Enforce deny by default. New roles, actions, resource types, tenant types, sharing modes, and admin paths must deny until explicitly allowed.
9. Define policy-combination semantics. Check whether multiple policies combine by union,
   intersection, priority, explicit deny, boundary policy, or tenant override; write tests for
   allow-plus-deny and no-match cases.
10. Check ABAC and relationship-policy inputs.
    - Subject attributes, object attributes, device posture, employment status, department,
      resource classification, IP or region, and time windows are only useful when their source of
      truth, freshness, tamper resistance, and unknown-value behavior are explicit.
    - Attribute fetch failure, policy-store timeout, stale policy bundle, or missing relationship
      data should deny or degrade to a documented low-risk mode, not silently allow.
11. Validate every request. Do not rely on login-time checks, client guards, disabled buttons, hidden menus, generated types, OpenAPI docs, or mobile local checks.
12. Load resources safely before final authorization:
   - include tenant, membership, owner, sharing, and soft-delete constraints in the resource lookup when possible;
   - when existence must be hidden, keep wrong-tenant and missing-resource behavior consistent with the project's 404 policy.
13. Check multi-tenant and organization/team risks:
   - body, query, header, path, JWT claim, or local storage tenant ids must not become trusted tenant context;
   - tenant-scoped queries must include tenant or membership constraints;
   - pending, suspended, removed, revoked, deleted, disabled, and invited states must not be treated as active access;
   - user-level roles must not stand in for organization, team, project, billing, security, or
     support scope;
   - invitations need target email, target organization, target role, single-use, expiration, and
     accepter-identity binding;
   - owner transfer, owner removal, organization deletion, and account deletion must preserve a
     last-owner or break-glass policy with audit and time bounds.
   - shared links, exports, signed URLs, previews, search, cache, and CDN entries must stay inside the permission model.
   - event streams, WebTransport sessions, WebSocket fallback channels, private downloads, and reconnect URLs must not bypass tenant, resource, role, token expiry, or revocation policy.
14. Check session, browser-token, JWT, refresh-token, OAuth/OIDC, MFA, recovery, and API-key
    contracts when touched:
   - browser web apps should prefer server sessions or BFF-mediated tokens with `HttpOnly`,
     `Secure`, appropriately scoped `SameSite`, and preferably host-only cookies; broad domain
     cookies and JavaScript-readable long-lived tokens need an explicit risk decision.
   - sessions need idle expiry, absolute expiry, renewal, session-id rotation, logout, all-device
     revocation, server-side invalidation, cookie flags, and CSRF posture;
   - refresh tokens need hash storage, family or device binding, rotation, reuse detection,
     single-flight or short grace handling for multi-tab and retry races, and revocation triggers;
   - JWTs need signature verification, algorithm allowlist, issuer, audience, subject, expiry, not-before, key rotation, and stale-claim handling;
   - OAuth/OIDC needs exact redirect binding, state, nonce, PKCE when relevant, provider account binding, and safe account linking;
   - password reset, magic-link, email change, and account recovery tokens need purpose binding,
     single use, short expiry, safe storage, enumeration-safe responses, and post-success session
     invalidation;
   - MFA and passkey flows need step-up policy, recovery-code storage, reset policy, phishing
     resistance expectations, trusted-device boundaries, and failure notifications;
   - API keys need hashing, prefix-only display, owner type, scope, tenant/resource constraints, expiry, rotation, revocation, last-used, rate limit, and audit.
15. Check permission creators more strictly than ordinary permissions.
    - Role creation, role assignment, invitation, service-account issuance, API-key creation,
      impersonation, support access, MFA reset, account recovery, email change, ownership transfer,
      and token minting are privilege factories.
    - A low-privilege actor that can attach a high privilege to itself collapses the whole model.
16. Check revocation time.
    - Demotion, removal, suspension, role deletion, membership expiry, subscription cancellation,
      ownership transfer, password change, MFA change, email change, account recovery, refresh-token
      reuse, suspected account takeover, and support access expiry should say how long old sessions,
      refresh tokens, JWT claims, caches, search indexes, queued jobs, signed URLs, and replicas can
      keep authorizing the old state.
    - Sensitive actions need server-side recheck, short-lived tokens, revocation lists, or policy
      version gates when stale tokens would be harmful.
17. Check account-takeover response paths.
    - Login, signup, password reset, magic link, OTP, MFA, invite acceptance, email verification,
      API-key creation, and support impersonation need rate limits, account/IP/device dimensions,
      enumeration-safe responses, audit events, and notification policy.
    - High-risk sequences such as new-device login followed by MFA reset, email change, API-key
      creation, organization invite, export, billing change, or ownership transfer should trigger
      step-up, hold, read-only quarantine, or session revocation according to product risk.
18. Check dependent surfaces: API routes, controllers, services, DB schema, DB queries, RLS, UI navigation, UI actions, API clients, audit logs, notifications, jobs, webhooks, search, file storage, docs, migrations, monitoring, and tests.
    - For credentialed delivery surfaces, check whether EventSource can supply the intended credentials, whether CORS and cookies match the policy, whether signed URLs expire and scope correctly, and whether caches vary on auth, tenant, and private response dimensions.
19. Require denial-first tests for changed protected actions when the project has a usable test surface. Cover anonymous, expired, revoked, no role, wrong tenant, wrong team, wrong owner, suspended or removed member, stale token, refresh-token reuse, stale cache, unknown role, unknown action, wildcard policy, explicit deny, shared-link, read-only API key, org admin, team admin, billing admin, global admin, support user, and impersonating admin cases as applicable.
20. When changing policies, consider shadow evaluation.
    - Compute old and new decisions side by side for representative requests before flipping broad
      policy changes when the product has the infrastructure to do so.
    - Log policy version and data revision for both decisions without exposing secrets or sensitive
      object contents.
21. Update docs and role matrices when external behavior, status codes, role names, permission names, admin scope, or API errors change.
22. Report the policy source of truth, effective-permission evidence, decision explanation, server/database enforcement, client UX-only guards, revocation window, account-takeover response, test coverage, skipped checks, and remaining permission risk.

## Boundary Rules

- Client guards are UX only. They may hide buttons, menus, and pages, but they do not authorize API calls.
- Route middleware may perform coarse authentication and tenant resolution, but final resource/action authorization belongs in server policy, service authorization, gateway policy, or database policy.
- Database RLS, tenant-scoped queries, views, and stored procedures are defense-in-depth and may be the strongest final boundary, but they do not excuse unclear application policy.
- Background jobs, webhooks, imports, exports, and cron paths need actor or service-principal context. User-request paths are not the only permission paths.
- Admin is scoped. Global admin, org admin, project admin, billing admin, support, and impersonating admin are different roles and need different audit and action rules.
- Organization and team membership are authorization relationships, not user attributes. A user can
  be owner in one organization, viewer in another, removed from a team, and still retain a direct
  resource grant unless the policy says otherwise.
- Owner is not a wildcard permission. Owners may still lack delete, export, invite, transfer, billing, or admin powers.
- API keys are principals with scopes and owners, not user sessions with unlimited power.
- ABAC inputs are security dependencies. Unknown, stale, or client-controlled attributes should not
  become allow decisions.
- Account recovery, MFA reset, email change, and invite acceptance are login-equivalent or
  privilege-factory flows.
- Wildcard permissions are future permissions. Adding a new action under an old wildcard should be
  treated as a permission expansion and reviewed accordingly.
- Unknown roles, unknown actions, malformed identifiers, and missing relationship data deny by
  default; they are not normalized into a normal user path.

## Strongly Forbidden Patterns

- Treating authentication as authorization.
- Trusting client-provided `userId`, `tenantId`, `role`, `isAdmin`, `ownerId`, `scope`, price, entitlement, or plan.
- Relying on hidden buttons, disabled controls, client redirects, mobile checks, TypeScript types, docs, or Storybook examples as permission boundaries.
- Reading tenant-scoped resources with an object id alone.
- Treating membership row existence as active membership without checking status.
- Treating OAuth provider scopes as internal app permissions.
- Treating JWT role claims as fresh authorization after role changes.
- Storing long-lived browser auth tokens in local storage or URLs without an explicit browser-threat
  model and revocation plan.
- Treating refresh tokens as harmless because access tokens are short-lived.
- Accepting OAuth account links by email alone instead of provider issuer and subject plus
  reauthentication.
- Treating API keys as normal user sessions.
- Mixing org admin, global admin, support admin, and impersonation into one `admin` check.
- Treating team membership, invitation, account recovery, or last-owner handling as UI workflow
  only.
- Changing 403 to 404, or 404 to 403, without naming the information-disclosure policy.
- Relaxing permissions without denial-case tests or a written migration and audit plan.
- Letting role changes ship without permission-cache or token-staleness handling.
- Shipping a permission engine that cannot explain why a request was allowed or denied.
- Treating an effective-permission bug as solved because the `role` column looks correct.
- Treating token-embedded roles as fresh after demotion, removal, or policy version changes.
- Creating shared links, signed URLs, exports, search results, or CDN responses outside tenant and resource policy.
- Creating credentialed event streams, WebTransport sessions, WebSocket fallback channels, signed delivery URLs, or private caches outside tenant and resource policy.
- Logging impersonation without separate actor and subject.
- Backfilling broad permissions to every existing user because migration is easier.

<!-- mustflow-section: postconditions -->
## Postconditions

- Authentication and authorization are separated in code and report language.
- Every changed protected action has a server-side or database-side permission boundary.
- Tenant isolation, organization or team membership, resource ownership, sharing, admin scope, and status-code behavior are explicit.
- Effective permissions, policy-combination rules, decision explanation, policy version, data
  revision, and revocation window are explicit when relevant.
- Client guards are described as UX only.
- Session, cookie, browser-token, refresh-token, OAuth/OIDC, MFA, passkey, recovery, API key, cache, audit, docs, migration, and tests are synchronized when touched.
- Signed URL, event-stream, WebTransport, WebSocket fallback, CORS, cookie, CDN/proxy cache, and reconnect behavior remains inside the permission model when touched.

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

Prefer the narrowest configured test intent that covers the changed protected actions and denial cases. Report missing auth-specific policy tests, tenant-isolation tests, organization/team permission tests, token/session/refresh-token tests, account-recovery tests, API-key tests, cache-staleness tests, audit-log checks, docs validation, or database-policy verification when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the current policy source of truth is unclear, stop and report the competing policy locations before adding more checks.
- If a server check is missing and only the UI hides the action, treat it as incomplete work, not as authorization.
- If a tenant-scoped query lacks tenant, membership, ownership, sharing, or RLS coverage, fix the data access path before broadening features.
- If denial tests cannot be written in the current task, report the exact untested actor, tenant, resource, action, and context combinations.
- If the change relaxes permissions, changes status-code policy, or broadens admin/API-key behavior, call out the security risk and required verification.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Authentication versus authorization classification
- Principal, tenant, resource, action, and context affected
- Policy source of truth
- Effective permission, policy version, data revision, decision explanation, and revocation window
- Server/database enforcement notes
- Client guard UX-only notes
- Tenant, organization/team, ownership, sharing, admin, token/session/refresh-token/MFA/API-key, account-recovery, cache, and audit notes
- Event stream, WebTransport, WebSocket fallback, signed URL, CORS, cookie, and CDN/proxy cache notes when relevant
- Tests or denial cases covered
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining auth or permission risk
