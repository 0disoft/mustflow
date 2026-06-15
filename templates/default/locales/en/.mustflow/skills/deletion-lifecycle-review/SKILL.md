---
mustflow_doc: skill.deletion-lifecycle-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: deletion-lifecycle-review
description: Apply this skill when code, schema, migrations, APIs, admin tools, jobs, storage, caches, search indexes, analytics, logs, backups, docs, tests, or reviews introduce, change, or assess delete, soft delete, hard delete, purge, restore, undelete, account deletion, tenant deletion, retention, legal hold, erasure, anonymization, pseudonymization, tombstone, backup recovery, PITR, WAL, binlog, transaction-log, downstream deletion, or deletion audit behavior.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.deletion-lifecycle-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - test
    - lint
    - build
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Deletion Lifecycle Review

<!-- mustflow-section: purpose -->
## Purpose

Keep deletion behavior from pretending that hiding a row, flipping a boolean, or running `DELETE FROM` is the whole contract.

The review question is: "Which kind of deletion is this, who can reverse it, what must survive for law or operations, what must disappear from every user-visible surface, and what evidence proves each downstream system caught up?" Treat deletion as a lifecycle with state, events, retention windows, recovery evidence, irreversible purge boundaries, backup residue, and audit limits.

<!-- mustflow-section: use-when -->
## Use When

- Code, schema, migrations, repositories, APIs, admin tools, UI actions, jobs, workers, tests, docs, or reviews create or change delete, soft delete, hard delete, purge, restore, undelete, account deletion, tenant deletion, data retention, legal hold, erasure, anonymization, pseudonymization, or tombstone behavior.
- A table, model, or query adds or depends on `is_deleted`, `deleted_at`, `deleted_by`, `delete_reason`, `delete_source`, `restore_deadline_at`, `restored_at`, `restored_by`, `purged_at`, `scheduled_for_purge_at`, `legal_hold`, `retention_until`, or similar fields.
- A feature must remove data from search indexes, caches, object storage, generated files, data warehouses, analytics tools, email tools, CRM, billing providers, webhooks, queues, exports, or backups.
- A delete flow interacts with PITR, backup retention, WAL, binlog, transaction logs, object-lock storage, restore drills, partition drops, bulk delete jobs, tenant offboarding, or operational dry-run approval.
- A task claims that data is deleted, recoverable, irreversible, anonymized, retained for legal reasons, hidden from users, removed from downstream systems, or safe to restore.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only removes source code, files, feature flags, dead branches, or generated artifacts from the repository and no product data, persisted state, user data, audit record, backup, or downstream store is involved.
- The task only changes queue message settlement terms such as ack, nack, reject, or delete with no data deletion lifecycle; use `queue-processing-integrity-review`.
- The task only changes database query performance around soft-delete predicates; use `database-query-bottleneck-review` first and this skill only when lifecycle, restore, purge, retention, or downstream deletion semantics are present.
- The task only changes generic schema ownership with no deletion, retention, restore, purge, or legal-hold behavior; use `database-change-safety`.
- The task is only a migration rollout question; use `database-migration-change` or `migration-safety-check` first and this skill as an adjunct for delete-state compatibility.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Deletion class: hide from normal views, user-restorable soft delete, operator-restorable recovery, legal-retention hold, anonymization or pseudonymization, cryptographic erasure, hard purge, tenant offboarding, or bulk retention purge.
- Entity and dependency graph: parent rows, child rows, ownership relationships, business records, audit logs, files, search documents, caches, analytics, warehouse tables, external services, exports, backups, and public identifiers.
- State model: allowed states, allowed transitions, actor, source, reason, request id, timestamp policy, restore deadline, purge deadline, legal hold rules, and terminal states.
- Query and uniqueness model: default visibility, admin visibility, global scopes, row-level security, repository filters, partial unique indexes, active-only indexes, deleted-id reuse policy, and public URL or webhook identity rules.
- Recovery model: who can restore, restore scope, point-in-time recovery assumptions, sidecar restore instance workflow, related rows and external resources to revive, audit evidence, and restore drill expectations.
- Purge and retention model: hard-delete timing, legal basis for retention, backup residue window, tombstone shape, downstream delete events, idempotent workers, retries, dry-run approval, batch size, partition strategy, and observability.
- Privacy and audit model: personal data separation, anonymization or pseudonymization, sensitive audit redaction, append-only logs, legal hold ownership, and cryptographic erase key ownership where relevant.
- Relevant command-intent contract entries for tests, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing deletion class, dependency graph, restore, purge, legal, backup, or downstream evidence can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- If deletion affects personal data, authentication, authorization, tenant scope, audit logs, security events, backups, or legal claims, also use the relevant security, privacy, database, adapter, or migration skill.
- If deletion behavior is a state machine, also use `state-machine-pattern` when editing executable state-transition code.
- If deletion is asynchronous or crosses external systems, also use idempotency, queue, observability, or transaction-boundary skills as needed for the changed path.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or change deletion states, columns, constraints, partial indexes, repositories, scopes, policies, tombstone tables, purge jobs, restore jobs, downstream deletion events, audit records, tests, fixtures, docs, and directly synchronized template surfaces tied to the task.
- Replace a lone `is_deleted` or unscoped `deleted_at` behavior with explicit lifecycle fields when the changed surface justifies it.
- Add dry-run, batch cursor, idempotency key, legal-hold guard, restore ledger, purge ledger, and downstream progress tracking when required by the changed deletion path.
- Do not use `ON DELETE CASCADE` for business records unless ownership is proven and audit, retention, restore, and legal obligations are unaffected.
- Do not store sensitive pre-delete values in audit logs solely to prove deletion happened.
- Do not claim irreversible erasure while backups, logs, downstream stores, exports, or encryption keys can still reconstruct the data unless that residual window is explicit.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the deletion.
   - Hidden from ordinary views: data remains current enough for admin or recovery paths but must not appear in user-facing lists, search, recommendations, exports, or APIs.
   - User-restorable soft delete: the user can undo within a defined window.
   - Operator recovery: staff can recover from mistake, compromise, or incident with stronger audit and approval.
   - Legal hold or mandatory retention: data must stay for a legal, financial, security, or dispute reason even when user-facing identity is removed.
   - Anonymization or pseudonymization: personal identifiers are detached while required business facts remain.
   - Hard purge or cryptographic erasure: data is made unrecoverable within a stated operational and backup boundary.
2. Build the deletion graph.
   - List parent rows, child rows, join rows, files, generated artifacts, cache entries, search documents, analytics rows, warehouse rows, webhook states, provider ids, exports, and backups.
   - Separate true owned children from business records that must survive, such as orders, invoices, ledger entries, tax records, audit logs, usage records, and security events.
   - Reject broad cascade deletes when ownership, restore, legal retention, and audit survival are unclear.
3. Check the state machine.
   - Prefer explicit states such as `active`, `pending_deletion`, `soft_deleted`, `restore_requested`, `scheduled_for_purge`, `legal_hold`, `purging`, and `purged` when more than one delete outcome exists.
   - Record delete and restore events with actor, source, reason, request id, server UTC timestamp, and any user-local timestamp needed for support.
   - Keep restore events distinct from clearing `deleted_at`; preserve who restored, why, and which deletion event was reversed.
   - Prevent contradictory states such as restored and purged at the same time, legal hold plus purge, or deleted rows still eligible for normal workflow actions.
4. Check query, identity, and uniqueness behavior.
   - Do not rely on every caller remembering `deleted_at IS NULL`. Use repository boundaries, global scopes, views, row-level policies, or other local enforcement patterns.
   - Add active-only unique indexes or equivalent constraints when soft-deleted rows should not block future active records.
   - Never reuse exposed ids, order numbers, account ids, tenant ids, webhook ids, or storage keys after deletion.
   - Keep tombstones for hard-deleted entities when duplicate webhooks, retries, imports, sync jobs, caches, or external providers need to know the entity used to exist.
5. Check restore semantics.
   - Define what is restored: core row only, permissions, memberships, subscriptions, files, search visibility, notification settings, tokens, provider mappings, generated records, and external-service state.
   - Do not treat PITR as a single-record undo button. If point-in-time recovery is relevant, define whether it restores a separate instance, extracts rows, reconciles relationships, and replays current-state differences.
   - Store enough recovery anchors, such as UTC event time, request id, transaction id, logical sequence, or provider event id, without leaking sensitive data.
6. Check purge, retention, and legal boundaries.
   - Define `scheduled_for_purge_at`, `purged_at`, purge actor or job id, legal hold owner, retention basis, backup residue window, and downstream completion criteria.
   - Separate personal data from business facts so legal retention does not force keeping unnecessary identifiers.
   - Consider cryptographic erase only when key ownership, key scope, backup copies, and remaining metadata are explicit.
   - Make backup and log retention honest: operational deletion can be immediate while backups age out later.
7. Check downstream deletion.
   - Emit or record deletion work for search, cache, object storage, generated files, analytics, warehouses, email tools, CRM, billing providers, external integrations, exports, and webhooks where relevant.
   - Make workers idempotent, resumable, observable, and safe to retry.
   - Track per-system pending, success, failure, skipped, and blocked states when deletion crosses systems.
8. Check bulk and tenant deletion.
   - Use dry-run counts and approval for admin deletion tools.
   - Process large deletes in bounded batches with a stable cursor and resume point.
   - Prefer partition drop or detach for date-retention logs when the schema supports it.
   - For tenant deletion, verify `tenant_id` leading indexes, partition strategy, cross-tenant references, shared resources, and rate limits before deleting large populations.
9. Check audit and privacy.
   - Keep deletion audit append-only and separate from rows that may be purged.
   - Log decisions, actor, request id, result, and reason codes without copying full personal data into audit logs.
   - Redact or hash sensitive identifiers when audit evidence does not require raw values.

<!-- mustflow-section: postconditions -->
## Postconditions

- The deletion class, state transitions, restore path, purge path, retention boundary, legal hold behavior, and backup residue window are explicit.
- Deleted data cannot leak through ordinary queries, admin views, search, caches, generated artifacts, exports, or downstream systems without that exception being intentional and documented.
- Hard purge and erasure claims are tied to tombstones, audit survival, downstream completion, backup/log age-out, or cryptographic erase evidence.
- Existing rows, old/new writers, migrations, batch jobs, restore drills, and operator dry-runs are addressed when affected.
- Remaining deletion lifecycle risk is named instead of hidden behind `is_deleted`.

<!-- mustflow-section: verification -->
## Verification

- Run the narrowest configured tests covering deletion states, default visibility, restore, purge, legal hold, partial unique indexes, cascade boundaries, tombstones, downstream deletion jobs, idempotency, batch resume, audit redaction, and template packaging changed by the task.
- Use configured docs and release checks when skill text, routes, templates, package metadata, or user-facing docs change.
- Prefer tests that prove deleted rows stay hidden from ordinary paths, active uniqueness still works, restores rebuild expected relationships, purges keep tombstones, legal holds block purge, and downstream deletion work is resumable.
- If backup, PITR, object-lock, legal, or external-provider behavior cannot be exercised locally, report that evidence as manual-only or missing instead of claiming it passed.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the deletion class is unknown, stop before implementing hard delete or purge and report the missing policy.
- If legal retention conflicts with user erasure, preserve the legal boundary, remove unnecessary personal identifiers, and report the policy decision needed.
- If a broad cascade would delete business records or audit evidence, block the cascade and require an explicit per-entity deletion plan.
- If downstream systems cannot confirm deletion, record pending or failed state and avoid claiming completion.
- If a configured test or build fails, preserve the failing intent and output tail, then fix only the deletion lifecycle contract or synchronized surface exercised by the failure.

<!-- mustflow-section: output-format -->
## Output Format

Report:

- Deletion surface reviewed
- Deletion class and state model
- Entity, file, cache, search, analytics, external-service, export, backup, and tombstone graph
- Visibility, uniqueness, identity reuse, cascade, legal hold, audit, restore, purge, backup, and downstream deletion decisions
- Batch, tenant, partition, dry-run, idempotency, and observability notes
- Tests and command intents run
- Evidence level: static diff risk, configured-test evidence, migration evidence, restore drill evidence, external-system evidence, manual-only, missing, or not applicable
- Remaining deletion lifecycle risk
