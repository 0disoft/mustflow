---
mustflow_doc: skill.file-encryption-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: file-encryption-integrity-review
description: Apply this skill when file-level encryption, signing, or integrity verification needs review, including per-file data encryption keys, envelope encryption, wrapped DEKs, file ownership and metadata binding in AAD, chunked authenticated encryption, nonce management, secretstream, normalized manifest signing, canonical JSON or CBOR, signature and encryption key separation, re-verification at trust boundaries, key rotation versus key retirement, or cryptographic erasure of files.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.file-encryption-integrity-review
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

# File Encryption and Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review file-level encryption, signing, and integrity verification as distinct, non-interchangeable
protections that survive storage, transformation, replication, and delivery.

The review question is not "is the file hashed?" It is "who may decrypt this file, can a copied or
tampered file be detected at every trust boundary, and can rotation and deletion actually retire the
old key and the old bytes?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports per-file encryption, file envelope encryption, wrapped
  DEKs, AAD binding, chunked authenticated encryption, file signing, manifest signing, canonical
  serialization, file integrity verification, key rotation, or cryptographic erasure of files.
- A change affects how a stored file is encrypted, signed, verified, re-encrypted, or deleted.
- A review needs proof that one user's or tenant's ciphertext cannot be replayed or copied into
  another's context and that tampered files fail at every consuming boundary.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is general storage encryption layers or key management without a file-specific boundary;
  use `cryptographic-storage-review`.
- The task is the file upload, validation, transformation, or download lifecycle; use
  `file-upload-security-review`.
- The task is per-tenant key and secret isolation; use `tenant-key-secret-isolation-review`.
- The task is artifact or supply-chain integrity for build outputs; use `artifact-integrity-check`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- File-key ledger: how file DEKs are created, wrapped, stored, and retired, and what a single key
  compromise exposes.
- Ciphertext-format ledger: algorithm, key version, nonce, wrapped DEK, file format version, and
  chunk layout per file.
- AAD ledger: which ownership and metadata values are bound to each ciphertext.
- Signature ledger: which manifest fields are signed, the canonical serialization, and how signature
  keys are separated from encryption keys.
- Trust-boundary ledger: where uploaded, transformed, restored, or delivered files are verified.
- Rotation and deletion ledger: KEK rotation versus DEK retirement, re-encryption coverage, and
  cryptographic-erase scope.
- Existing security docs and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing key, format, AAD, signature, boundary, or rotation
  evidence can be reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten per-file DEK and envelope encryption, AAD binding, chunked authenticated
  encryption, manifest signing, canonical serialization, boundary re-verification, key rotation and
  retirement, and cryptographic-erase behavior, and directly synchronized documentation or templates
  owned by the selected boundary.
- Update crypto and file-lifecycle docs, runbooks, and tests that describe the same contract.
- Do not add raw encryption implementations, cryptography, or new command authority under this
  skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Do not substitute hashing, signing, and encryption for each other.
   - Encryption hides content; authenticated encryption also detects tampering; a digital signature
     proves who produced the data. Storing a `SHA-256` next to the file blocks nothing when the
     attacker changes both.
   - Use an authenticated cipher such as AES-GCM or XChaCha20-Poly1305 for stored files, add a
     separate signature for externally distributed files or audit evidence, and treat plain
     checksums as transport-error detection only.
2. Encrypt each file with an independent data key under a KEK.
   - Do not encrypt every file with one master key; one leak opens the whole store. Generate a
     random DEK per file, encrypt the file with it, and wrap the DEK with a KMS KEK, storing only
     ciphertext and the wrapped DEK, algorithm, key version, nonce, and format version.
   - Never export the KMS master key to application servers, and split KEKs per tenant so one
     customer's key compromise does not open other customers' files.
3. Bind ownership and metadata into the AAD.
   - A sound ciphertext still leaks when an attacker moves user A's ciphertext into user B's object
     location. Put `tenant_id`, `object_id`, file version, upload id, original size, and chunk
     number into the authenticated additional data so decryption fails when the current request's
     metadata does not match.
   - Never reuse a nonce under the same key with AES-GCM; for large files prefer libsodium's
     `secretstream`, which manages chunking and nonce derivation for you.
4. Authenticate large files per chunk with ordering and end markers.
   - Loading a whole file into memory to encrypt it at once breaks on large files and recovery.
     Authenticate fixed-size chunks with the file id, chunk number, and total size so chunks cannot
     be swapped or reordered, and mark the final chunk so truncation cannot pass as a complete file.
   - If any chunk fails authentication, discard the plaintext decoded so far and fail the whole
     operation instead of emitting partial output.
5. Sign a normalized manifest, not only the bytes.
   - Signing only the file hash leaves filename, MIME, owning tenant, version, created time, and key
     version mutable. Build one manifest with object id, tenant id, plaintext hash, ciphertext hash,
     size, media type, created time, encryption algorithm, and key version, and sign its canonical
     byte representation.
   - JSON is not canonical across key order and number representation; use a canonicalization scheme
     or deterministic CBOR. Keep signature keys completely separate from encryption keys and use
     them only inside KMS or HSM.
6. Re-verify at every trust boundary, not only at upload.
   - A single check at upload misses storage tampering, replication errors, operator mistakes, and
     poisoned caches. Verify integrity before promotion, before handing the file to a transform
     worker, after backup restore, and immediately before external download, and check
     authentication tags and signatures before a vulnerable parser reads the bytes.
   - Do not auto-repair a failed verification; quarantine the file and route to original re-upload
     or a verified replica.
7. Treat key rotation and key retirement as different operations.
   - Rotating the KEK re-wraps existing DEKs without re-encrypting the files. When a file DEK is
     compromised or the algorithm changes, re-encrypt the files with a new DEK.
   - For deletion, cryptographic erasure requires removing the object plus its wrapped DEK, cached
     plaintext keys, and replicated key metadata. Audit key creation, use, rotation, disablement,
     and destruction without logging key material or plaintext file hashes.

<!-- mustflow-section: postconditions -->
## Postconditions

- Per-file DEK and envelope structure, AAD binding, chunk authentication, manifest signing, boundary
  re-verification, rotation and retirement, and cryptographic-erase scope are explicit.
- Master-key-per-store, hash-as-integrity, nonce reuse, unsigned mutable metadata, and
  rotate-and-keep-forever patterns are fixed or reported.
- File encryption and integrity claims are backed by configured tests, ciphertext and key evidence,
  or labeled as manual-only or missing.

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

Prefer the narrowest configured tests that prove cross-context decryption fails, chunk reorder and
truncation fail, manifest tampering fails, and key retirement makes ciphertext unrecoverable.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If key, format, AAD, signature, boundary, or rotation evidence is missing, report the gap instead
  of claiming the file is protected.
- If verification fails on a real file, quarantine it and report; do not auto-repair.
- If the fix requires general crypto, file-handling, or tenant-key changes, use the matching skill
  before editing that scope.

<!-- mustflow-section: output-format -->
## Output Format

- File encryption and integrity reviewed
- Per-file key and envelope findings
- AAD and chunk-authentication findings
- Manifest signing and canonicalization findings
- Trust-boundary re-verification findings
- Rotation, retirement, and erasure findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining file encryption and integrity risk
