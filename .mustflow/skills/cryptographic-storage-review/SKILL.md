---
mustflow_doc: skill.cryptographic-storage-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: cryptographic-storage-review
description: Apply this skill when storage protection needs review for encryption at rest, transport encryption, field-level encryption, envelope encryption, DEK and KEK separation, key management and rotation, KMS or HSM custody, AEAD and authenticated encryption, AAD binding, password hashing versus reversible encryption, TOTP secret encryption, payment card data handling, HMAC lookup indexes, deterministic encryption, lazy re-encryption, or encryption key backup and recovery.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.cryptographic-storage-review
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

# Cryptographic Storage Review

<!-- mustflow-section: purpose -->
## Purpose

Review encryption layers as overlapping defenses against different attackers, not as one "encrypt
everything" flag.

The review question is not "is AES applied?" It is "which attacker does each layer stop, where does
plaintext legitimately appear, who owns each key, and what happens on rotation, failure, and
recovery?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports encryption at rest, transparent database encryption,
  transport encryption, field-level encryption, envelope encryption, DEK and KEK separation, key
  management, key rotation, KMS or HSM custody, AEAD and AAD binding, password or recovery-code
  hashing, TOTP secret encryption, payment card data handling, HMAC lookup indexes, deterministic
  encryption, lazy re-encryption, or key backup and recovery.
- A change stores personal, authentication, or payment data and needs a decision on whether to
  encrypt, hash, or never collect it.
- A review needs proof that a database dump, backup, or read-only account cannot reveal protected
  fields.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is trust boundaries or data-domain separation; use `trust-boundary-review`.
- The task is password hashing parameters or account recovery codes specifically; use
  `authentication-design-review`.
- The task is secret scanning or incident response for a leaked key; use `secret-exposure-response`.
- The task is TLS configuration for a specific transport hop without storage protection; use the
  matching network or deployment skill.
- The task is general privacy review without a storage-protection decision; use
  `security-privacy-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Threat-model ledger: which attackers the product must stop, including disk loss, stolen snapshots,
  backup files, network interception, database dumps, read-only database accounts, backup operators,
  and data-warehouse compromise.
- Plaintext-flow ledger: where plaintext appears on the path from client through CDN, origin,
  services, database, backups, caches, queues, and analytics.
- Data-class ledger: which fields need reversible encryption, which need one-way hashing, and which
  must never be collected or stored.
- Key-ownership ledger: who holds keys for each layer, how DEK and KEK are separated, where KEKs
  live, and how key version is recorded with ciphertext.
- Search and query ledger: which fields are indexed, range-searched, sorted, joined, or
  exact-matched, and what the query features require.
- Rotation, failure, and recovery ledger: key rotation windows, lazy re-encryption, KMS outage
  behavior, and key backup and recovery controls.
- Existing security docs and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing threat-model, plaintext-flow, data-class, or
  key-ownership evidence can be reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten encryption-layer decisions, key management, AEAD and AAD binding, HMAC lookup
  indexes, password hashing, field-classification, and key rotation, failure, and recovery behavior,
  and directly synchronized documentation or templates owned by the selected boundary.
- Update crypto docs, key runbooks, and tests that describe the same storage contract.
- Do not add raw encryption implementations, cryptography, or new command authority under this
  skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the attacker each layer stops before choosing algorithms.
   - Encryption at rest stops lost disks, stolen snapshots, backup files, and discarded media from
     being read outside the application. Transport encryption stops network eavesdropping,
     tampering, and impostor servers. Field-level encryption stops database dumps, read-only
     database accounts, backup operators, and warehouse compromise when the application's
     decryption authority is not also compromised.
   - Starting with "AES" before a threat model leaves the intended attacker standing.
2. Locate where plaintext appears.
   - Transparent database encryption decrypts inside the database process, so normal SQL results are
     plaintext. TLS terminates at each endpoint, so when CDN terminates TLS, a separate TLS hop is
     needed between CDN and origin. Field encryption encrypts before storage so the database holds
     ciphertext and the application decrypts only when a feature needs the value.
   - Draw the client-to-CDN-to-origin-to-service-to-database-to-backup path and mark plaintext at
     each point.
3. Classify data by protection type.
   - Personal data that must be displayed again uses reversible encryption. Passwords and recovery
     codes need slow one-way hashes with per-user salt and cost parameters such as Argon2id; they
     are never encrypted for later decryption. TOTP secrets are needed by the authenticator and are
     encrypted with a dedicated key; passkey public credentials need integrity protection, not
     secrecy.
   - Payment card numbers and CVVs are not something to store well; they should never enter your
     servers, logs, or error trackers. Use the provider's hosted payment page or iframe and store
     only the PSP customer id, payment-method token, brand, last four digits, and expiry.
4. Own keys at the right layer.
   - Encryption-at-rest keys are often managed by the cloud or storage vendor; customer-managed keys
     still get used automatically by the runtime storage. TLS keys are about server identity and
     certificate lifecycle. Field-encryption keys belong to the application security domain and are
     meaningless if handed to the database administrator or used inside database functions, because
     a database compromise then includes the key.
   - Separate DEKs from KEKs with envelope encryption, keep KEKs in KMS or HSM, split keys per
     service, environment, and data domain, and store the key version with every ciphertext.
5. Choose field encryption by search, sort, and join needs.
   - Random field encryption breaks plaintext indexes, range searches, sorting, and partial
     matches. Values that are only looked up and displayed, such as names and addresses, fit random
     encryption. Exact-match lookups such as email use a separate keyed-HMAC lookup index. Do not
     field-encrypt values that need range, sort, or aggregate queries, or you will end up with a
     decrypted replica table that widens the boundary.
   - Deterministic encryption reveals equality and frequency; avoid it without a specific reason.
6. Provide confidentiality and integrity together.
   - Field encryption should use an AEAD mode such as AES-GCM. Store the nonce, key version, and
     algorithm version with the ciphertext, and bind AAD such as `tenant_id`, `subject_id`, table,
     field name, and schema version so ciphertext cannot be swapped between users or fields.
   - TLS also provides integrity and server authentication in transit, but client identity needs
     mTLS or application-level authentication.
7. Apply the layers to every replica and hop.
   - Encryption at rest on the operational database does not protect developer SQL dumps, CSV
     files, search indexes, Redis caches, message queues, or error logs. External HTTPS does not
     protect CDN-to-origin, service-to-database, or service-to-broker hops.
   - Field ciphertext survives replicas, but a pipeline that decrypts before loading the warehouse
     voids it. Include logs, caches, queues, backups, and external providers in the data-flow
     diagram, not only databases.
8. Design rotation, failure, and recovery per layer.
   - At-rest key rotation may be transparent to the vendor, but check that backups and snapshots do
     not depend on old keys. TLS is about automatic certificate renewal and non-disruptive
     replacement. Field encryption records a key version per ciphertext and lazily re-encrypts on
     read with the newest key.
   - Never fall back to plaintext storage when KMS is unavailable; fail only the sensitive-data
     features and keep the rest degraded. Key loss means data loss, so key backup and recovery must
     be a separate control from data backup.

<!-- mustflow-section: postconditions -->
## Postconditions

- Threat-model, plaintext-flow, data-class, key-ownership, search-impact, and rotation, failure,
  and recovery decisions are explicit.
- Encrypt-everything-without-a-threat-model, decrypt-in-database functions, master keys in the
  application, plaintext fallback on KMS failure, and reversible password storage are fixed or
  reported.
- Cryptographic-storage claims are backed by configured tests, key and ciphertext evidence, or
  labeled as manual-only or missing.

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

Prefer the narrowest configured tests that prove ciphertext does not contain plaintext, AAD binding
rejects swaps, lookup indexes use keyed HMAC, and KMS outage fails closed.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If threat-model, plaintext-flow, data-class, or key-ownership evidence is missing, report the gap
  instead of approving the storage design.
- If a field is both field-encrypted and queried by range or sort, report the boundary widening.
- If the fix requires authentication or trust-boundary changes, use the matching skill before
  editing that scope.

<!-- mustflow-section: output-format -->
## Output Format

- Cryptographic storage reviewed
- Threat-model and plaintext-flow findings
- Data-class and protection-type findings
- Key-ownership and envelope findings
- Search and query-impact findings
- AEAD, AAD, and integrity findings
- Rotation, failure, and recovery findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining cryptographic-storage risk
