---
mustflow_doc: skill.multi-tenant-isolation-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: multi-tenant-isolation-review
description: Apply this skill when code is created, changed, reviewed, or reported and multi-tenant isolation needs review for tenant context derivation, request-supplied tenant identifiers, organization or workspace membership, composite tenant resource keys, tenant-scoped queries, unique constraints and foreign keys, PostgreSQL RLS, connection-pool tenant leakage, tenant namespaces on cache, session, idempotency, lock, rate-limit, queue, search, storage, temp-file, log, or metric surfaces, async worker or export tenant revalidation, webhook or email tenant mapping, admin or cross-tenant tooling, or cross-tenant denial tests.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.multi-tenant-isolation-review
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

# Multi-Tenant Isolation Review

<!-- mustflow-section: purpose -->
## Purpose

Review multi-tenant isolation as an end-to-end boundary that forces the tenant from the request
context through database, cache, queue, storage, search, logs, and async work — not as a per-query
filter convention.

The review question is not "does this query add `WHERE tenant_id`?" It is "if application code
makes one mistake, does the database and infrastructure boundary still stop real cross-tenant
exposure?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports tenant-scoped APIs, tenant context middleware, user
  organization or workspace selection, membership checks, tenant-scoped queries, composite keys,
  unique constraints, foreign keys, RLS policies, database roles, connection pools, cache or session
  keys, idempotency keys, distributed locks, rate-limit counters, queue partitions, search indexes,
  object storage paths, temporary files, logs, metrics, async jobs, workers, exports, webhooks,
  email, admin tooling, or cross-tenant tests.
- A change can let one tenant read, modify, delete, export, search, cache, or receive another
  tenant's data, files, events, or credentials.
- A review needs proof that tenant boundaries hold across synchronous APIs, background jobs,
  retries, dead-letter queues, admin APIs, and shared infrastructure.
- A final report claims data is tenant-isolated, RLS-protected, or safe across organizations.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily who may act on which object or action; use `api-access-control-review` or
  `auth-permission-change` first and this skill for the tenant-boundary proof.
- The task changes only PostgreSQL schema, roles, privileges, or RLS implementation mechanics; use
  `postgresql-code-change` first and this skill for the end-to-end isolation review.
- The task is only database schema design, indexes, or migrations without a tenant dimension; use
  `database-change-safety` or `database-migration-change`.
- The system is single-tenant, or the data model has no tenant or account dimension.
- The task asks for live cross-tenant exploitation or unowned external testing.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Tenant-context derivation ledger: how a verified principal becomes a tenant context, the membership
  or organization lookup, when the context is set, and whether any request value can change it.
- Resource identifier ledger: every resource query, write, delete, export, search, batch, file, and
  webhook path that can reach a tenant-scoped object, and the identifier shape used at each hop.
- Shared-resource namespace ledger: cache, session, idempotency, lock, rate-limit, queue, search,
  storage, temp-file, log, and metric keys or partitions that must carry the tenant dimension.
- Async boundary ledger: queue messages, jobs, retries, dead-letter queues, exports, webhooks, email,
  and stats that carry or must re-derive tenant context.
- Database policy ledger: RLS policies, roles, `BYPASSRLS` or ownership status, `FORCE ROW LEVEL
  SECURITY`, migration versus runtime roles, and constraint or foreign-key shapes.
- Existing cross-tenant tests, fixtures, security docs, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing derivation, identifier, namespace, async, or database
  policy evidence can be reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten server-derived tenant context, membership-validated organization selection,
  composite tenant lookups and constraints, RLS backup policies, transaction-scoped tenant state,
  tenant-namespaced shared resources, worker and export revalidation, cross-tenant tests, and
  directly synchronized documentation or templates owned by the selected boundary.
- Update tenant-isolation claims in docs, fixtures, admin tools, and template surfaces that describe
  the same contract.
- Do not add broad scanners, live cross-tenant probes, offensive payload collection, unrelated
  hardening, or new command authority under this skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Derive the tenant context from authentication, not from request values.
   - Never trust `X-Tenant-ID`, a URL `tenantId`, a body field, or a client-chosen organization id as
     the authority. Query the authenticated principal's membership and build a server-owned
     `TenantContext` that stays immutable for the request lifetime.
   - When a user may select among organizations, validate the selected value against membership
     before converting it into a verified context. Authentication and role checks alone do not
     complete tenant isolation.
2. Make the tenant part of every resource identity.
   - Do not look up by `id` and compare ownership in application code afterwards; query with the
     tenant from the start: `WHERE tenant_id = $1 AND id = $2`.
   - Use composite unique constraints and foreign keys on `(tenant_id, id)` so a record that
     references another tenant's resource cannot be inserted at all.
   - When a request names another tenant's id, return a uniform 404 that does not reveal whether the
     object exists.
3. Use RLS as a backup defense line, not a replacement for application filters.
   - On PostgreSQL, enable RLS on tenant tables, use `USING` to limit readable and modifiable rows and
     `WITH CHECK` to limit inserted or changed rows.
   - The application role must not be the table owner or a `BYPASSRLS` role; apply `FORCE ROW LEVEL
     SECURITY` where needed, and keep migration roles separate from runtime roles.
   - Do not treat an application filter convention as equivalent to RLS; RLS is the boundary that
     still fires when application code forgets the filter.
4. Scope tenant context to the transaction lifetime in connection pools.
   - Setting a tenant id on a pooled session and returning it to the pool lets the next request
     inherit the previous user's context.
   - Set tenant state with `SET LOCAL` or transaction-scoped `set_config` inside an explicit
     transaction so it dies with the transaction, and make queries fail closed when context is
     missing. The default is denied access, not a system tenant.
5. Namespace every shared resource by tenant.
   - Cache, session, idempotency key, distributed lock, rate-limit counter, queue partition, search
     index, object storage path, temporary file, log, and metric keys must carry the tenant
     dimension, for example `tenant:{tenantId}:user:{userId}`.
   - For sensitive caches, record the owning tenant in the value as well as the key, and re-check it
     on read so a key collision cannot serve another tenant's data.
6. Re-validate tenant context in async and internal calls.
   - A worker that receives only `resource_id` loses the tenant boundary at the queue edge. Put a
     verifiable tenant context and the resource id in the job message, and have the consumer re-query
     the resource inside that tenant scope.
   - Search indexing, data exports, webhook delivery, email, stats aggregation, retries, and
     dead-letter queues follow the same rule. "It is internal, so we trust it" is a common origin of
     multi-tenant leaks.
7. Test with a cross-tenant attack matrix, not feature tests.
   - Seed tenants A and B with similar names and numeric ids; call B's read, update, delete, search,
     batch, file download, cache hit, cache miss, async retry, and admin APIs with A's token.
   - Assert responses and side effects: database changes, cache entries, queue messages, search
     results, and log or metric rows, not only response bodies.
   - Security logs should record the request tenant, the actor, the actual tenant of the target
     resource, and the action, and alert when they differ.

<!-- mustflow-section: postconditions -->
## Postconditions

- Tenant context derivation, composite resource identity, database backup defense, connection-pool
  scoping, shared-resource namespaces, async revalidation, and the cross-tenant attack matrix are
  explicit.
- Request-supplied tenant identifiers, tenantless queries or cache keys, single-column cross-tenant
  references, pooled-context leakage, missing RLS backup, and async paths without tenant context are
  fixed or reported.
- Tenant-isolation claims are backed by configured tests, database policy evidence, async-path
  evidence, or labeled as manual-only or missing.

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

Prefer the narrowest configured tests that prove cross-tenant denial: read, update, delete, search,
batch, export, file, cache, queue, retry, and admin paths with a different tenant's token, plus
missing-context fail-closed behavior and RLS policy coverage.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If tenant context derivation, database policy, or async evidence is missing, report the gap instead
  of claiming isolation is safe.
- If RLS or privilege separation cannot be proven, fail closed or report the boundary gap rather than
  accepting application-filter-only isolation.
- If the fix requires broad authorization model changes, use `auth-permission-change` or
  `api-access-control-review` before editing that scope.
- If a sensitive value appears in logs, diffs, fixtures, command output, or final reports, stop
  repeating it and use `secret-exposure-response` when it may be a real secret.

<!-- mustflow-section: output-format -->
## Output Format

- Multi-tenant isolation reviewed
- Tenant-context derivation and membership validation findings
- Composite resource identity, constraint, and foreign-key findings
- Database backup defense and role-separation findings
- Connection-pool scoping and shared-resource namespace findings
- Async, export, webhook, and admin boundary findings
- Cross-tenant attack matrix results or missing evidence
- Fixes made or recommendation
- Command intents run
- Skipped checks and reasons
- Remaining multi-tenant isolation risk
