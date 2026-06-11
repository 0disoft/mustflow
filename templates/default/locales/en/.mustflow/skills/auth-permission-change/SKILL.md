---
mustflow_doc: skill.auth-permission-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: auth-permission-change
description: Apply this skill when authentication, authorization, permissions, roles, tenants, sessions, JWTs, OAuth or OIDC, API keys, route guards, admin access, database policies, object-level access control, signed delivery URLs, credentialed event streams, or private cache behavior are created or changed.
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

- Authentication, authorization, role, permission, capability, policy, tenant, workspace, organization, session, JWT, OAuth, OIDC, API key, invite, reset token, route guard, admin, impersonation, audit, or database policy behavior changes.
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

- Changed files, user goal, affected actors, protected resources, actions, tenants, roles, and status-code expectations.
- Auth middleware, framework hooks, gateway checks, session config, cookie config, JWT verifier, OAuth/OIDC callback, API key verifier, and logout or revocation code when relevant.
- Route guards, client guards, server controllers, resolvers, command handlers, services, policy functions, role or permission tables, database queries, RLS, views, stored procedures, and ORM scopes.
- Tenant, organization, workspace, project, membership, invite, suspension, ownership, sharing, and admin-support data models.
- Background jobs, queue payloads, webhooks, import/export flows, search or autocomplete indexes, signed URL generation, storage keys, SSE or streaming channels, WebTransport sessions, WebSocket fallback, CDN cache, proxy cache, and permission caches when they can expose protected data.
- Audit logs, admin action logs, impersonation records, denied-access logs, API docs, role matrix docs, migrations, and tests.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Classify the change as authentication, authorization, or both before editing.
- Identify principal, tenant, resource, action, and context for each protected operation.
- Treat client-provided `userId`, `tenantId`, `workspaceId`, `role`, `isAdmin`, object id, API key label, token claim, and local storage value as untrusted.
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
   - authentication: verifies a principal from a session, JWT, OAuth/OIDC account, API key, service account, or anonymous state;
   - authorization: decides whether that principal can perform an action on a resource within a tenant and context.
2. Read the mandatory surfaces that apply:
   - auth middleware, hooks, gateway, session store, cookies, JWT, OAuth/OIDC, API key verification, logout, revocation, and token rotation;
   - route guards, client redirects, server controllers, resolvers, services, command handlers, policy calls, and admin tools;
   - tenant resolver, membership schema, role assignment, invite flow, suspension, ownership, sharing, and impersonation model;
   - database queries, tenant scopes, ownership joins, soft-delete filters, RLS, views, stored procedures, and ORM helpers;
   - background jobs, queues, webhooks, import/export, file storage, signed URLs, SSE or streaming channels, WebTransport sessions, WebSocket fallback, search, autocomplete, caches, CDN or proxy cache rules, audit logs, docs, migrations, and tests.
3. Write the permission decision inputs for each protected action: principal, tenant, resource, action, and context.
4. Separate identity from permission:
   - `req.user`, a valid session, verified email, valid JWT, OAuth scope, or API key proves identity only;
   - owner, active member, org admin, global admin, support user, service account, API client, and shared-link viewer need separate authorization rules.
5. Prefer one central policy shape, such as a `can(principal, action, resource, context)` function, over route-local `isAdmin`, `isOwner`, or `isMember` fragments.
6. Enforce deny by default. New roles, actions, resource types, tenant types, sharing modes, and admin paths must deny until explicitly allowed.
7. Validate every request. Do not rely on login-time checks, client guards, disabled buttons, hidden menus, generated types, OpenAPI docs, or mobile local checks.
8. Load resources safely before final authorization:
   - include tenant, membership, owner, sharing, and soft-delete constraints in the resource lookup when possible;
   - when existence must be hidden, keep wrong-tenant and missing-resource behavior consistent with the project's 404 policy.
9. Check multi-tenant risks:
   - body, query, header, path, JWT claim, or local storage tenant ids must not become trusted tenant context;
   - tenant-scoped queries must include tenant or membership constraints;
   - pending, suspended, removed, revoked, deleted, disabled, and invited states must not be treated as active access;
   - shared links, exports, signed URLs, previews, search, cache, and CDN entries must stay inside the permission model.
   - event streams, WebTransport sessions, WebSocket fallback channels, private downloads, and reconnect URLs must not bypass tenant, resource, role, token expiry, or revocation policy.
10. Check session, JWT, OAuth/OIDC, and API key contracts when touched:
   - sessions need expiry, refresh, rotation, logout, revocation, cookie flags, and CSRF posture;
   - JWTs need signature verification, algorithm allowlist, issuer, audience, subject, expiry, not-before, key rotation, and stale-claim handling;
   - OAuth/OIDC needs exact redirect binding, state, nonce, PKCE when relevant, provider account binding, and safe account linking;
   - API keys need hashing, prefix-only display, owner type, scope, tenant/resource constraints, expiry, rotation, revocation, last-used, rate limit, and audit.
11. Check dependent surfaces: API routes, controllers, services, DB schema, DB queries, RLS, UI navigation, UI actions, API clients, audit logs, notifications, jobs, webhooks, search, file storage, docs, migrations, monitoring, and tests.
    - For credentialed delivery surfaces, check whether EventSource can supply the intended credentials, whether CORS and cookies match the policy, whether signed URLs expire and scope correctly, and whether caches vary on auth, tenant, and private response dimensions.
12. Require denial-first tests for changed protected actions when the project has a usable test surface. Cover anonymous, expired, revoked, no role, wrong tenant, wrong owner, suspended or removed member, stale cache, shared-link, read-only API key, org admin, global admin, and impersonating admin cases as applicable.
13. Update docs and role matrices when external behavior, status codes, role names, permission names, admin scope, or API errors change.
14. Report the policy source of truth, server/database enforcement, client UX-only guards, test coverage, skipped checks, and remaining permission risk.

## Boundary Rules

- Client guards are UX only. They may hide buttons, menus, and pages, but they do not authorize API calls.
- Route middleware may perform coarse authentication and tenant resolution, but final resource/action authorization belongs in server policy, service authorization, gateway policy, or database policy.
- Database RLS, tenant-scoped queries, views, and stored procedures are defense-in-depth and may be the strongest final boundary, but they do not excuse unclear application policy.
- Background jobs, webhooks, imports, exports, and cron paths need actor or service-principal context. User-request paths are not the only permission paths.
- Admin is scoped. Global admin, org admin, project admin, billing admin, support, and impersonating admin are different roles and need different audit and action rules.
- Owner is not a wildcard permission. Owners may still lack delete, export, invite, transfer, billing, or admin powers.
- API keys are principals with scopes and owners, not user sessions with unlimited power.

## Strongly Forbidden Patterns

- Treating authentication as authorization.
- Trusting client-provided `userId`, `tenantId`, `role`, `isAdmin`, `ownerId`, `scope`, price, entitlement, or plan.
- Relying on hidden buttons, disabled controls, client redirects, mobile checks, TypeScript types, docs, or Storybook examples as permission boundaries.
- Reading tenant-scoped resources with an object id alone.
- Treating membership row existence as active membership without checking status.
- Treating OAuth provider scopes as internal app permissions.
- Treating JWT role claims as fresh authorization after role changes.
- Treating API keys as normal user sessions.
- Mixing org admin, global admin, support admin, and impersonation into one `admin` check.
- Changing 403 to 404, or 404 to 403, without naming the information-disclosure policy.
- Relaxing permissions without denial-case tests or a written migration and audit plan.
- Letting role changes ship without permission-cache or token-staleness handling.
- Creating shared links, signed URLs, exports, search results, or CDN responses outside tenant and resource policy.
- Creating credentialed event streams, WebTransport sessions, WebSocket fallback channels, signed delivery URLs, or private caches outside tenant and resource policy.
- Logging impersonation without separate actor and subject.
- Backfilling broad permissions to every existing user because migration is easier.

<!-- mustflow-section: postconditions -->
## Postconditions

- Authentication and authorization are separated in code and report language.
- Every changed protected action has a server-side or database-side permission boundary.
- Tenant isolation, resource ownership, sharing, admin scope, and status-code behavior are explicit.
- Client guards are described as UX only.
- Session, token, OAuth/OIDC, API key, cache, audit, docs, migration, and tests are synchronized when touched.
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

Prefer the narrowest configured test intent that covers the changed protected actions and denial cases. Report missing auth-specific policy tests, tenant-isolation tests, token/session tests, API-key tests, cache-staleness tests, audit-log checks, docs validation, or database-policy verification when relevant.

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
- Server/database enforcement notes
- Client guard UX-only notes
- Tenant, ownership, sharing, admin, token/session/API-key, cache, and audit notes
- Event stream, WebTransport, WebSocket fallback, signed URL, CORS, cookie, and CDN/proxy cache notes when relevant
- Tests or denial cases covered
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining auth or permission risk
