---
mustflow_doc: skill.admin-control-plane-safety-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: admin-control-plane-safety-review
description: Apply this skill when code is created, changed, reviewed, or reported and admin panels, backoffice tools, operator consoles, support tools, internal dashboards, staff APIs, admin RBAC or ABAC, scoped operator roles, audit logs, change history, impersonation, dangerous action confirmation, approval flows, exports, imports, bulk operations, admin search and filters, production guardrails, PII masking, admin sessions, MFA, or operational evidence need review as a high-risk control plane rather than a convenience UI.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.admin-control-plane-safety-review
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

# Admin Control Plane Safety Review

<!-- mustflow-section: purpose -->
## Purpose

Review administrator and operator surfaces as production control planes.

An admin page is not just a place where staff edits rows faster. It is where one mistaken click, stale permission, unscoped search, silent export, or confused impersonation session can delete customer data, leak private information, grant privilege, break billing, or make incident reconstruction impossible.

<!-- mustflow-section: use-when -->
## Use When

- Admin panels, backoffice tools, support consoles, operator dashboards, staff APIs, internal routes, admin GraphQL or RPC procedures, moderation queues, billing consoles, tenant management tools, feature-flag consoles, data repair tools, or emergency-access tools are created, changed, reviewed, or reported.
- Work touches scoped admin roles, RBAC or ABAC for operators, support permissions, organization or tenant admin scope, role assignment, privilege factories, approval flows, impersonation, break-glass access, or admin session boundaries.
- Work touches admin audit logs, object change history, before/after snapshots, security event logs, denied admin attempts, read access to sensitive data, export logs, import logs, bulk-operation logs, or operational evidence.
- Work touches dangerous actions such as delete, restore, refund, charge, ban, unban, transfer ownership, change roles, reset MFA, invalidate sessions, purge cache, reindex search, run migration-like repair, edit production config, or bulk update.
- Work touches admin search, filtering, sorting, pagination, saved views, exports, imports, bulk actions, CSV or spreadsheet output, PII masking, tenant isolation, production versus staging indicators, or environment guardrails.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task changes the core authentication, authorization, session, token, RBAC, ABAC, tenant, or permission engine. Use `auth-permission-change` first, then this skill for the admin control-plane surface around it.
- The task needs API-specific BOLA, IDOR, object, property, or function authorization review. Use `api-access-control-review` for the API proof and this skill for admin workflow controls, auditability, and operator safety.
- The task is a broad sensitive-data, retention, logging, dependency, or privacy review with no admin surface. Use `security-privacy-review`.
- The task primarily changes a domain workflow such as payment, notification, credit ledger, deletion, deployment, or database migration. Use that domain skill for domain correctness and this skill only for the admin operation that exposes or overrides it.
- The task only changes public website UI copy or layout with no staff-only action, permission, audit, export, or operational evidence surface.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, current diff or target files, affected admin surfaces, operator personas, protected resources, tenant or organization scopes, and environments.
- Admin actor and session ledger: staff identity, authentication method, MFA or passkey status, session lifetime, reauthentication points, device or network constraints, support account status, and revocation behavior.
- Permission ledger: role, capability, scope, tenant, resource, field, condition, explicit deny, policy version, assignment path, approval path, and why the operator may perform the action now.
- Resource and field ledger: object type, tenant, owner, lifecycle state, sensitive fields, masked fields, read-only fields, mutable fields, derived fields, and privileged field update policy.
- Dangerous action ledger: action type, impact, target count, preview, confirmation, reauthentication, approval, idempotency key, queued job, cancel or stop behavior, rollback or compensation path, and final server-side recomputation.
- Audit and change-history ledger: actor, subject, target, action, reason, ticket, before and after values, redaction, denied attempts, read/export events, retention, immutability, correlation id, and reviewer or SIEM handoff when relevant.
- Impersonation ledger: who acts, who is viewed or acted as, purpose, ticket or reason, TTL, visible banner, prohibited actions, notification policy, exit path, and separate actor plus subject logging.
- Search, filter, export, import, and bulk ledger: query dimensions, tenant constraints, row limits, pagination, PII masking, field allowlist, file lifetime, watermarking, download audit, dry run, per-item authorization, and partial-failure policy.
- Existing tests, role matrix, admin docs, runbooks, support procedures, incident expectations, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Treat admin access as an elevated security boundary, not a feature flag or hidden route.
- Treat UI hiding, disabled buttons, menu filtering, and route redirects as operator UX only. Server, service, policy, or database checks must own permission.
- Treat one `is_admin` flag as insufficient unless the product truly has one global superuser role and has accepted the audit and blast-radius risk.
- Identify whether the surface is production, staging, preview, local, or sandbox. Production-like tools need visible environment identity and stronger action friction.
- Separate audit log from object change history before claiming traceability. Audit explains who did what and why; change history explains how the object changed over time.
- Do not let support tooling bypass tenant, field, export, payment, deletion, notification, or privacy policy merely because staff can see the UI.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten admin permission checks, scoped role checks, server-side field allowlists, tenant-scoped lookups, step-up authentication, dangerous-action confirmations, approval gates, audit logs, change-history records, export controls, bulk-operation controls, tests, docs, and role matrices.
- Add explicit operator safety states such as dry-run, preview, pending approval, queued, running, partially failed, cancelled, completed, compensated, or blocked.
- Add masking, redaction, purpose capture, ticket capture, download expiry, and operational evidence fields when the changed admin surface justifies them.
- Keep edits scoped to the admin control plane and directly synchronized domain surfaces. Do not redesign the entire auth model or domain workflow under this skill alone.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the admin surface.
   - Identify whether it is read-only support, customer support mutation, content moderation, billing, security, tenant management, feature/config operation, data repair, incident response, or emergency access.
   - Name the operator persona, tenant scope, environment, target resource, and blast radius.
2. Write the control-plane question before editing.
   - Ask whether this operator can do this action on this tenant, object, field, and environment right now, and whether the system can explain it after an incident.
3. Replace role labels with effective capability evidence.
   - `admin`, `staff`, `support`, and `owner` are labels. The decision needs scoped capability, resource relationship, tenant boundary, explicit deny behavior, and policy version.
4. Enforce permissions at the trusted layer.
   - Check server routes, service methods, jobs, database policies, queue workers, export generators, and storage signers.
   - UI guards may make the console easier to use, but they do not authorize anything.
5. Separate admin role types.
   - Global admin, tenant admin, billing admin, security admin, content moderator, support viewer, support mutator, impersonating operator, and break-glass operator are different roles.
   - Role assignment, API-key issuance, MFA reset, session invalidation, ownership transfer, impersonation, export approval, and emergency access are privilege factories.
6. Review admin sessions.
   - Require MFA or passkeys for elevated admin access when product risk justifies it.
   - Use idle timeout, absolute timeout, session revocation, CSRF protection for browser admin tools, and step-up reauthentication for sensitive actions.
   - Keep customer and staff identity planes separate unless the product intentionally models and audits the shared path.
7. Build an audit record for every meaningful operator action.
   - Log actor, target, tenant, action, result, reason or ticket when useful, source IP or safe session id, request id, correlation id, before and after values when safe, and denial reason for rejected attempts.
   - Audit reads of sensitive PII, exports, impersonation start and stop, role changes, approval decisions, failed dangerous confirmations, and bulk jobs.
   - Do not log secrets, tokens, full payment data, raw private documents, or excessive PII just to make the audit feel complete.
8. Keep audit logs durable and tamper-resistant enough for the product risk.
   - Append-only storage, restricted delete access, retention policy, clock source, hash chaining, WORM storage, SIEM export, or reviewer workflow may be needed for high-impact products.
   - If the log can be edited by the same operator whose actions it records, report audit-integrity risk.
9. Keep object change history separate.
   - Change history should show field-level before and after values, who or what changed them, effective time, source action, and restore or comparison behavior when useful.
   - Redact or omit sensitive values. Prefer value hashes, labels, or structured diffs when full before/after snapshots would leak data.
10. Harden impersonation.
    - Require explicit capability, reason or ticket, reauthentication, TTL, visible banner, easy exit, and actor plus subject logs.
    - Prohibit or step-up high-risk actions during impersonation: password or MFA changes, payment method changes, role changes, exports, destructive actions, and irreversible account actions unless policy explicitly allows them.
    - Consider user notification or post-action review for sensitive impersonation.
11. Add friction to dangerous actions.
    - Show an impact preview, target identity, tenant, count, irreversible consequences, related resources, and recovery path before the action.
    - Use typed confirmation, step-up authentication, approval, or delay for destructive or broad actions.
    - Recompute target counts and permission server-side at execution time; do not trust the preview payload.
12. Treat bulk operations as jobs, not giant button clicks.
    - Require dry run, sample rows, target count, per-item authorization, idempotency, concurrency control, progress state, cancel behavior, partial-failure report, and audit trail.
    - Define whether one denied item fails the whole job or produces per-item failures.
13. Govern exports.
    - Use field allowlists, masking, row limits, async jobs for large exports, purpose or ticket capture, approval for sensitive data, file expiry, watermarking when useful, download audit, and tenant-scoped storage.
    - Do not treat CSV generation as a harmless read. A local spreadsheet can become the real data breach.
14. Govern imports.
    - Use preview, validation report, schema version, row limits, duplicate policy, dry run, idempotency key, rollback or compensation plan, and per-row error reporting.
    - Never let import files mass-assign privileged fields such as role, tenant, owner, balance, entitlement, deletion state, or verified status without explicit policy.
15. Review admin search and filters.
    - Enforce tenant and field scopes in the query, not only in rendered rows.
    - Use cursor pagination or bounded result windows for scale, stable sorting, query limits, and PII masking.
    - Audit sensitive lookups such as email, phone, account id, payment id, VIP user, security event, or cross-tenant search when product risk requires it.
16. Protect production from environment confusion.
    - Display the environment, tenant, and target resource clearly.
    - Require stronger confirmation for production than staging, block production-only dangerous actions from preview environments, and avoid shared cookies or staff sessions across environments when risk justifies it.
17. Review observability and incident reconstruction.
    - Admin jobs need progress, result, failure reason, retry state, initiator, target count, affected item ids or safe references, and correlation ids.
    - Security-relevant admin events should be alertable: role grant, break-glass access, export, mass deletion, impersonation, MFA reset, ownership transfer, and repeated denied attempts.
18. Align admin docs and role matrices.
    - Update role matrices, support runbooks, approval policy, escalation notes, and user-facing support commitments when behavior changes.
19. Add hostile-path tests when the project has a usable test surface.
    - Cover direct API calls with hidden buttons bypassed, wrong tenant, wrong admin scope, denied field update, role assignment by low privilege actor, impersonation prohibited action, export field masking, export expiry, audit event creation, bulk dry-run versus execution consistency, partial failures, reauthorization at execution time, and production guardrails where relevant.
20. Report every admin surface that remains only "trusted because staff will be careful" as a risk.

<!-- mustflow-section: postconditions -->
## Postconditions

- Admin actions are authorized at a trusted layer with scoped roles, resource relationships, tenant boundaries, and default-deny behavior.
- Audit logs and object change history are distinct, durable enough for the risk, and redacted where needed.
- Impersonation, dangerous actions, export, import, bulk operations, search, filters, production guardrails, admin sessions, and approval paths are checked or explicitly scoped out.
- Server-side recomputation, idempotency, job evidence, cancellation, partial-failure, and recovery or compensation are explicit for broad or irreversible actions.
- Tests, docs, role matrices, runbooks, and release notes are synchronized when the admin behavior is public, packaged, or operationally promised.

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

Prefer the narrowest configured tests that prove denial behavior, audit completeness, export masking or expiry, impersonation limits, bulk dry-run consistency, and dangerous-action server-side recomputation. Use release and docs checks when installed skills, templates, public docs, role matrices, or package metadata change.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If operator scope, tenant boundary, target resource, field policy, or decision source of truth is unclear, report the missing ledger instead of adding another broad admin condition.
- If audit evidence is missing, do not claim the action is traceable. Add the audit event or report the traceability gap.
- If the UI hides a dangerous action but the API still permits it, treat the control as incomplete.
- If a dangerous action cannot be rolled back, require stronger preview, approval, delay, or compensation evidence before treating the workflow as safe.
- If tests cannot be added in the current task, name the exact untested admin actor, tenant, action, field, export, impersonation, or bulk-job case.
- If sensitive data appears in logs, exports, fixtures, screenshots, or command output, stop repeating it and use `secret-exposure-response` or `security-privacy-review` as appropriate.

<!-- mustflow-section: output-format -->
## Output Format

- Admin control plane reviewed
- Operator persona, tenant, resource, action, field, and environment scope
- Effective permission, explicit deny, policy version, and trusted enforcement findings
- Admin session, MFA or step-up, CSRF, revocation, and environment guardrail findings
- Audit log versus change-history findings
- Impersonation, dangerous action, approval, export, import, bulk, search, and filter findings
- Job, idempotency, recomputation, cancellation, rollback, compensation, and incident evidence
- Tests or hostile cases covered
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining admin-control-plane risk
