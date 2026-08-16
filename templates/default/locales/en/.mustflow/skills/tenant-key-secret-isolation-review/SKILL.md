---
mustflow_doc: skill.tenant-key-secret-isolation-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: tenant-key-secret-isolation-review
description: Apply this skill when per-tenant encryption keys, secrets, or external-service credentials need isolation review, including tenant-scoped KEKs, key hierarchies, wrapped DEKs, AAD or KMS encryption-context binding, secret storage namespaces, secret brokers, key-management versus key-use rights, dynamic credentials, short-lived leases, per-tenant OAuth, key rotation as versioned migration, or plaintext secret paths through memory, cache, and logs.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.tenant-key-secret-isolation-review
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

# Tenant Key and Secret Isolation Review

<!-- mustflow-section: purpose -->
## Purpose

Review encryption keys, secrets, and external-service credentials as tenant-scoped security
boundaries, not as shared infrastructure with tenant labels.

The review question is not "is the data encrypted?" It is "if tenant B's application, worker, or
operator role asks to decrypt, read a secret, or call an external API, does the key, secret, or
credential layer independently refuse — or is a shared key or credential the real boundary?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports per-tenant encryption keys, tenant-scoped KEKs, key
  hierarchies, wrapped DEKs, AAD or KMS encryption-context binding, secret storage namespaces,
  secret brokers, key-management versus key-use rights, dynamic credentials, short-lived leases,
  per-tenant OAuth or external-service credentials, key rotation, or plaintext secret paths through
  memory, cache, and logs.
- A change affects what a compromised tenant, service account, or leaked key or secret could reach.
- A review needs proof that one tenant's ciphertext, secret, or credential cannot be used under
  another tenant's context.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is general encryption layers, envelope encryption, or key management without a tenant
  dimension; use `cryptographic-storage-review`.
- The task is trust boundaries, per-service credentials, or data-domain separation; use
  `trust-boundary-review`.
- The task is tenant isolation mechanics such as context, composite keys, RLS, cache, queue, or
  file namespaces; use `multi-tenant-isolation-review`.
- The task is incident response for an already-leaked secret; use `secret-exposure-response`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Tenant-key ledger: which keys exist, per-tenant KEKs or shared hierarchies, how DEKs are wrapped,
  and what a single key compromise would expose.
- Ciphertext-context ledger: what AAD or KMS encryption context is bound to each ciphertext and who
  can claim which context values.
- Secret ledger: where tenant secrets live, how the storage boundary is split, and which service
  accounts can read which paths.
- Credential ledger: stored versus dynamic credentials, per-tenant scopes, leases, and external
  service mappings.
- Rotation ledger: key and secret versions, re-wrap or re-encrypt coverage, and retirement
  evidence.
- Plaintext-path ledger: where secret values pass through memory, cache, logs, traces, error
  objects, queue messages, and support screens.
- Existing security docs and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing key, context, secret, credential, rotation, or
  plaintext-path evidence can be reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten tenant-scoped key hierarchies, AAD and encryption-context binding, secret storage
  boundaries, key-management and key-use separation, dynamic credentials, versioned rotation, and
  plaintext-path controls, and directly synchronized documentation or templates owned by the
  selected boundary.
- Update key and secret runbooks, docs, and tests that describe the same contract.
- Do not add raw KMS, Vault, or cloud-account administration commands, or new command authority
  under this skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Do not call a single global key per-tenant encryption.
   - High-sensitivity tenants need independent KEKs. With many tenants, use a hierarchy where a
     shared root key wraps tenant-specific intermediate KEKs, which wrap object DEKs; store
     ciphertext and the wrapped DEK in the database.
   - Be explicit that a shared-root structure is logical isolation within a shared trust boundary,
     not equivalent to independent KMS keys.
2. Bind tenant context as AAD, but never treat AAD as authorization.
   - Encrypt with `tenant_id`, resource kind, resource id, and schema version in the AAD or KMS
     encryption context, and require the same context to decrypt so copying tenant A ciphertext
     into tenant B's record fails.
   - AAD alone is not authorization: a service role that can claim any `tenant_id` can request
     decryption with an arbitrary context. Restrict claimable contexts through KMS policy, session
     tags, per-tenant grants, or separate keys.
3. Split secret storage boundaries per tenant, not only names.
   - Path prefixes such as `tenants/acme/api-key` with a `tenants/*` read grant give no isolation.
     Use Vault namespaces, separate cloud projects or accounts, or tenant-specific mounts where
     policy and login paths actually separate.
   - A shared application should not hold full secret-store read rights; use a Secret Broker that
     validates tenant and purpose and returns only the needed secret, and prefer Workload Identity
     short-lived credentials over stored cloud keys.
4. Separate key-management rights from key-use rights.
   - Applications encrypt and decrypt without reading key material. Key administrators create,
     rotate, disable, and destroy keys without decrypting customer data, and runtime accounts never
     get disable, delete, or policy-change rights. Audit accounts read logs but not plaintext or
     secrets.
   - When the key manager and the data user are the same account, one compromised account voids
     every control.
5. Prefer dynamic credentials over stored long-lived ones.
   - For database accounts, cloud access keys, and certificates that support dynamic issuance,
     create per-tenant or per-task credentials with a short TTL and lease, and revoke them when the
     job ends or the tenant is disabled.
   - Keep per-tenant OAuth consent and refresh tokens separate, mint minimal-scope access tokens
     just before the call, and if only static API keys exist, split them by tenant, environment, and
     purpose with restricted permissions, IP, and quota. One external-service master key shared by
     all tenants lets a single leak compromise every customer.
6. Implement key rotation as versioned data migration.
   - Store `key_ref` and a key version beside every ciphertext. Write with the new key, keep
     reading with the old, re-wrap existing DEKs with the new KEK, verify coverage, and only then
     disable the old key after evidence that all data moved.
   - KMS automatic rotation does not re-encrypt existing ciphertext. External-service secrets
     overlap old and new values during deploy and retire the old value only after every instance is
     confirmed on the new one.
7. Treat plaintext secret paths in memory, cache, and logs as tenant boundaries.
   - Secret values never enter logs, trace spans, error objects, environment dumps, queue messages,
     or support screens. Cache secrets with `(tenant_id, secret_id, version)` keys and a short TTL,
     and do not reuse global provider clients that keep tenant state in memory.
   - Prefer capability adapters that call the specific external API over returning secret strings
     to general code. Audit every lookup and decrypt with workload, tenant, purpose, resource, and
     key version, and detect mass decryption and tenant mismatch. Remember that KMS encryption
     context appears in plaintext in logs, so never put personal data or secrets in it.
8. Review IAM delegation and impersonation graphs, not only direct grants.
   - A user with no direct resource grant can still gain everything through high-privilege roles
     attached to workloads, service-account impersonation, PassRole or `actAs`, token creator,
     service-account key creation, or IAM policy change rights. Treat those as separate high-risk
     permissions and review the full permission graph from user through role, service account, and
     workload to the final resource.
   - Retire default and shared service accounts; issue one per workload, environment, and
     lifecycle, split build from deploy and control from data, block broad default-role grants,
     and disable before deleting unused accounts.
9. Set organizational permission ceilings above per-account least privilege.
   - A project or account admin who is compromised can recreate wildcard permissions, public
     resource policies, and long-lived keys. Use service control policies, permission boundaries,
     organization policies, and explicit denies to define the maximum a lower-level admin cannot
     exceed, and centrally forbid external identity addition, service-account key creation, broad
     default roles, and public buckets.
10. Do not treat KMS encryption as a second approval.
    - Encrypting a secret with KMS still delivers plaintext to every caller with read permission, so
      default-managed keys with broad read grants contribute little separation. Use customer-managed
      keys and control the KMS key policy, the secret policy, and the runtime role through different
      principals, and never combine secret administration, new-version creation, runtime lookup, and
      KMS administration in one role.

<!-- mustflow-section: postconditions -->
## Postconditions

- Tenant-key scope, ciphertext-context binding, secret storage boundaries, key-management and
  key-use separation, dynamic credentials, versioned rotation, and plaintext-path controls are
  explicit.
- A single global key labeled per-tenant, AAD-as-authorization, path-prefix-only secret isolation,
  shared master keys, and secrets in logs or cache are fixed or reported.
- Tenant key and secret isolation claims are backed by configured tests, KMS or secret-store
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

Prefer the narrowest configured tests that prove cross-tenant decryption fails, secret access is
tenant-bounded, dynamic credentials expire, and plaintext secrets never reach logs or cache.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If key, context, secret, credential, rotation, or plaintext-path evidence is missing, report the
  gap instead of claiming tenant crypto isolation.
- If a shared key or secret store is the only boundary, report the shared trust boundary and the
  required split.
- If the fix requires general crypto, trust-boundary, or tenant-isolation changes, use the matching
  skill before editing that scope.

<!-- mustflow-section: output-format -->
## Output Format

- Tenant key and secret isolation reviewed
- Key hierarchy and ciphertext-context findings
- Secret storage boundary findings
- Key-management and key-use separation findings
- Credential and lease findings
- Rotation and plaintext-path findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining tenant key and secret isolation risk
