---
mustflow_doc: skill.trust-boundary-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: trust-boundary-review
description: Apply this skill when security design needs trust boundaries defined or reviewed across users and APIs, internal services and queue consumers, tenants, control and data planes, personal, authentication, and payment data domains, originals and logs, backups, caches, queues, or ciphertext and keys, including zero-trust architecture, workload identity, per-service credentials, data minimization, breach blast-radius minimization, short-lived credentials, mass query and export controls, or egress allowlists.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.trust-boundary-review
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

# Trust Boundary Review

<!-- mustflow-section: purpose -->
## Purpose

Review trust boundaries as the points where subject, permission, data purpose, operational
ownership, or key custody changes — not as firewall or VPC lines.

The review question is not "is this internal?" It is "at this hop, does the prior trust still hold,
or must the caller be re-authenticated and re-authorized for this specific resource request?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports system security design, service boundaries, internal
  service calls, queue or job payloads, workload identity, per-service credentials, control-plane or
  data-plane separation, sensitive-data domain separation, data minimization, short-lived
  credentials, mass query or export controls, or egress allowlists.
- A review needs proof that a network, cluster, or service boundary is not being treated as implicit
  trust.
- A change affects what a compromised service, operator account, or leaked credential could reach.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is tenant isolation mechanics such as context, composite keys, or RLS; use
  `multi-tenant-isolation-review`.
- The task is object, property, or function-level API authorization; use `api-access-control-review`.
- The task is encryption layers, key management, or field encryption; use
  `cryptographic-storage-review`.
- The task is the admin or operator control plane; use `admin-control-plane-safety-review`.
- The task is deletion, retention, or backup lifecycles; use `deletion-lifecycle-review`.
- The task is log, trace, or error-output leakage; use `error-message-integrity-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- System flow ledger: request and data flows from user through gateway, services, workers, databases,
  caches, queues, storage, analytics, and external providers.
- Boundary ledger: for each hop, who or what changes, what prior trust must be cut, and what
  authentication and authorization must be re-established.
- Credential ledger: service accounts, workload identities, database roles, short-lived grants, and
  which data each can reach.
- Data-domain ledger: personal, authentication, payment, content, and analytics data, where each is
  stored, and which service account touches it.
- Breach-scope ledger: what a compromised service, operator, or leaked key could read, write, and
  export.
- Existing security docs, architecture docs, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing flow, boundary, credential, or data-domain evidence can
  be reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten trust-boundary definitions, per-service credentials and workload identity, narrow
  delegation for jobs, control and data plane separation, data-domain separation, data
  minimization, short-lived grants, export controls, and directly synchronized documentation or
  templates owned by the selected boundary.
- Update architecture docs, runbooks, and tests that describe the same boundary.
- Do not add network firewall or VPC reconfiguration commands, or new command authority under this
  skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Define trust boundaries by what changes, not by network topology.
   - NIST zero-trust guidance does not grant implicit trust to private networks or internal
     resources; every resource request needs its own authentication and authorization decision.
   - A boundary exists where subject, permission, data purpose, operational responsibility, or key
     ownership changes and the old trust must be cut and re-established.
2. Bound the user-device-session to public API edge.
   - Login success confirms who the subject is, not a system-wide pass. The gateway checks token
     signature, issuer, audience, and expiry, and the service that owns the data re-authorizes at
     tenant, object, and action granularity.
   - High-risk actions such as password change, payment-method change, and data export must check
     recent authentication time and method and require reauthentication even when the session is
     alive. Accepting permissions or tenant ids from the request body or arbitrary headers fails
     here.
3. Bound internal services, batch jobs, and queue consumers.
   - Running in the same VPC, Kubernetes cluster, or server is not trust. A single compromised
     service must not compromise the whole system.
   - Give each service a unique workload identity and database account, and issue credentials
     limited to the target, allowed actions, and expiry. Put narrow delegation such as
     `tenant_id`, `subject_id`, `action`, `resource_id`, and `expires_at` in async job payloads
     instead of a copy of the user's full JWT, and re-check suspension and revocation at execution
     time.
4. Bound tenants, organizations, and projects.
   - The tenant context derives from verified identity and membership, never client-supplied
     values, and the same boundary is enforced in database queries, cache keys, object storage
     paths, search and vector indexes, queue messages, and rate limits. RLS is the last defense
     line with explicit application conditions as the first.
   - Operator access uses short-lived separate emergency grants with reason, approver, target
     tenant, and executed query fully audited, not a standing admin role.
5. Bound the runtime data plane from the control plane.
   - CI/CD, deployment systems, cloud IAM, KMS, database administration, and backup systems hold
     far stronger rights than application APIs. Do not run them with application runtime accounts
     and credentials; a leaked deployment token then exposes operating data and keys.
   - Give the deployment system deploy rights without plaintext data-read rights, and give the
     runtime only the cryptographic operations it needs, never key creation, deletion, or policy
     change.
6. Bound personal, authentication, and payment data domains.
   - The three domains are sensitive for different reasons and need different protection. Support
     needs names and contacts but not password hashes or TOTP secrets; the authentication service
     verifies credentials but does not need addresses or payment methods; the payment service reads
     PSP tokens and billing state but not login sessions.
   - Separate service accounts, APIs, store permissions, encryption keys, and audit logs per
     domain. One admin database account that reads every table voids schema-level separation.
7. Bound originals from logs, traces, analytics, backups, and exports.
   - Data does not live only in the operational database. Logs, APM traces, event buses, search
     indexes, caches, warehouses, error trackers, support screens, CSV exports, and backups are new
     stores and new boundaries.
   - Remove or mask passwords, tokens, session ids, keys, personal data, and payment data before
     shipping to the log pipeline; deleting from the central log later is too late. Keep security,
     audit, and product analytics logs in separate stores with separate retention.
8. Bound ciphertext from keys.
   - Storing data and keys in the same database, environment, or backup makes encryption
     decorative. Separate data encryption keys (DEKs) from the key encryption keys (KEKs) that
     protect them, keep KEKs in KMS or HSM, split keys per service, environment, and data domain,
     and give applications short-lived data keys or KMS operations instead of master key plaintext.
   - Audit key lookup, decryption, rotation, and revocation separately.
9. Minimize breach scope by not collecting what is not needed.
   - Define purpose, consuming service, retention, and deletion condition per field, and remove
     originals when the purpose ends. An identity-verification service should return a verification
     verdict and needed attributes, not raw identification numbers or ID images.
   - When originals replicate into analytics, support, logs, or temporary tables, the retention
     policy replicates with them.
10. Split real data permissions, not service count.
    - Ten services sharing one database superuser and one KMS key have the blast radius of a
      monolith. Separate authentication, personal, payment, content, and analytics storage with
      distinct service accounts, and let each service read its own data while reaching other
      domains only through minimal-result APIs.
11. Remove long-lived global credentials.
    - Do not let one database password or cloud access key read every table and bucket. Split
      per-service read and write roles, keep batch export and migration rights out of routine roles,
      issue short-lived permissions at execution time via workload identity or role assumption, and
      include tenant or data type in policy conditions.
    - Support and operator rights are granted per approved task with an expiry, never standing.
12. Use keys as breach-scope boundaries and tokens or verdicts across services.
    - If the application can decrypt every row with one key, encryption does not limit a
      compromised application. Use per-tier or per-tenant DEKs under a KEK in KMS, and make a data
      access broker check tenant, calling service, purpose, and field before returning values.
    - Keep raw values such as payment instruments, email, phone, and identity attributes in a
      dedicated vault; products store random tokens or internal subject ids. Return a `verified`
      verdict instead of an email, an age-ok result instead of a birth date, masked values for
      display, and attribute claims instead of raw attributes.
13. Control mass queries and external egress separately.
    - Normal application accounts read page-sized fields, never full customer lists, full emails,
      or all files. Export and admin search use a separate role with reauthentication, approval,
      maximum rows, field limits, rate limits, and a per-tenant query budget.
    - Restrict outbound destinations with an allowlist so a compromised server cannot exfiltrate to
      an arbitrary collector, and make session revocation, short-credential revocation, export
      disablement, and key rotation independently executable during incident response.
14. Pre-build containment actions as product features.
    - Do not write firewall rules and permission policies after an incident. Implement host
      quarantine, service-account revocation, session termination, tenant blocking, deployment
      stop, queue pause, database read-only switch, and region-link cut ahead of time, with both
      automatic and manual triggers.
    - Preserve memory dumps, logs, and disk snapshots while isolating so evidence survives the
      containment itself.
15. Separate Tier-0 systems before ordinary services.
    - IdP, PKI, KMS, Secret Manager, DNS, time sync, CI/CD, audit logs, and backups are more
      sensitive than application code; an application admin who can modify them is effectively a
      full infrastructure admin. Give them separate accounts, projects, admin roles, and access
      paths, and never let low-trust zones write upward into high-trust ones.
16. Replace servers instead of repairing them.
    - Manage infrastructure and security policy as code with validated images and declarative
      deploys; emergency manual changes auto-expire and are forced back to the IaC state, so
      configuration drift and untracked privileges do not accumulate.
17. Compute a blast budget per credential.
    - For each credential class, quantify how many servers, tenants, data sets, regions, and backup
      generations a single compromise could modify or delete, and walk the attack path as if it
      were stolen. If one credential can destroy two or more independent security zones, split the
      structure, and never concentrate production deletion, backup deletion, key deletion, and
      audit-log deletion in one principal.

<!-- mustflow-section: postconditions -->
## Postconditions

- Trust boundaries, per-service credentials, narrow job delegation, control and data plane
  separation, data-domain separation, data minimization, key boundaries, export controls, and
  egress controls are explicit.
- Network-location trust, shared superuser or key patterns, standing operator rights, full-JWT job
  payloads, and unchecked mass exports are fixed or reported.
- Trust-boundary claims are backed by configured tests, credential evidence, or labeled as
  manual-only or missing.

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

Prefer the narrowest configured tests that prove per-service credential reach, job delegation
revalidation, data-domain isolation, and mass export denial.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If flow, boundary, credential, or data-domain evidence is missing, report the gap instead of
  claiming the system is zero-trust.
- If a network or cluster boundary is the only control, report the missing per-request
  authentication and authorization.
- If the fix requires tenant, crypto, admin, deletion, or logging changes, use the matching skill
  before editing that scope.

<!-- mustflow-section: output-format -->
## Output Format

- Trust boundaries reviewed
- Boundary-by-boundary findings and trust-cut points
- Credential and workload-identity findings
- Control and data plane findings
- Data-domain separation and minimization findings
- Key-boundary and egress-control findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining trust-boundary risk
