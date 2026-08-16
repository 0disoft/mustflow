---
mustflow_doc: skill.credential-token-lifecycle-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: credential-token-lifecycle-review
description: Apply this skill when code is created, changed, reviewed, or reported and credential or token lifecycle needs review for API key issuance, key id and secret splitting, API key or refresh-token storage, HMAC or hashed secret persistence, session token design, opaque sessions, JWT issuance and validation rules, token type separation, short access tokens, refresh token rotation and family reuse detection, token revocation, sign-out, denylist or introspection, key rotation, step-up authentication, BFF or HttpOnly cookie storage, DPoP, mTLS or certificate binding, or credential entropy or leakage review.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.credential-token-lifecycle-review
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

# Credential Token Lifecycle Review

<!-- mustflow-section: purpose -->
## Purpose

Review credentials and tokens as a full lifecycle — issuance, storage, validation, rotation,
revocation, and client-side handling — not as "a token was generated".

The review question is not "is a JWT signed?" It is "when this API key, refresh token, or session is
issued, stored, used, rotated, revoked, and eventually leaked, what is the blast radius at each
stage?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports API key generation, key id and secret splitting,
  session token design, opaque sessions, JWT issuance or verification, refresh token rotation,
  token families, revocation, sign-out, denylists, introspection, key rotation, signer key
  management, step-up authentication, BFF or cookie storage, DPoP, mTLS or certificate-bound tokens,
  or credential logging and leakage.
- A change affects how long a credential lives, where it is stored, who can use it, what it can do,
  or how quickly it stops working after revocation.
- A review needs proof that a leaked credential has a bounded lifetime, a bounded scope, and a real
  revocation path.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily whether a principal may act on an object, field, or function; use
  `api-access-control-review` or `auth-permission-change` first and this skill for the credential
  lifecycle part.
- The task is only login, signup, OTP, or automation defense behavior; use `auth-flow-triage` or
  `rate-limit-integrity-review` first.
- The task is only secret scanning or incident response for an already-leaked secret; use
  `secret-exposure-response` or the configured secret-risk scanner.
- The task is only password hashing of user passwords; use the matching authentication skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Credential issuance ledger: token kinds in the system (opaque session, JWT access, refresh, API
  key, reset, magic link, service account, webhook secret), issuer, audience, lifetime, entropy, and
  purpose per kind.
- Storage ledger: where each secret or token is persisted, whether it is reversible, the hashing or
  keyed-hash construction, the pepper or KMS boundary, and how comparison happens.
- Rotation and revocation ledger: rotation triggers, refresh family lineage, reuse detection,
  revocation scope, sign-out behavior, denylist or introspection design, and key-rotation grace
  windows.
- Client storage ledger: browser storage, cookies, headers, URLs, logs, APM traces, and third-party
  SDK exposure for each credential kind.
- Existing auth tests, token fixtures, security docs, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing issuance, storage, rotation, revocation, or client
  storage evidence can be reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten secure issuance, key id and secret splitting, HMAC or hashed storage,
  constant-time comparison, rotation and revocation, refresh family reuse detection, short-lived
  access tokens, token type and audience separation, step-up gates, binding, and directly
  synchronized documentation or templates owned by the selected boundary.
- Update token, session, and key documentation, fixtures, SDK tests, and template surfaces that
  describe the same credential contract.
- Do not add raw shell key-generation examples, live credential generation, or new command authority
  under this skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Separate token kinds by purpose.
   - Browser-based self-hosted SaaS defaults to server-side opaque sessions in HttpOnly cookies.
     OAuth-token browser apps should keep access and refresh tokens in a BFF and hand the browser a
     session cookie only.
   - Use JWTs only when many services must verify without an auth-server call, and API keys only for
     projects or automation clients, not human login sessions. Never store bearer tokens in
     `localStorage` or `sessionStorage`.
2. Split the public identifier from the secret.
   - Issue API keys as a public key id plus a high-entropy secret, for example `zdp_live_k7F3pQ_...`,
     so the server can look up the record by key id and verify only the secret part.
   - Generate session and API-key secrets with a CSPRNG at 128 bits minimum, and 256 bits for new
     designs. Show only the key id and a few trailing characters in logs and UI.
3. Store self-issued tokens as one-way hashes, not plaintext.
   - For API keys, refresh tokens, and session tokens the server verifies itself, store
     `HMAC_SHA256(server_pepper, presented_secret)` with the key id, authority, owner, issuance,
     expiry, and revocation times, and compare in constant time.
   - Keep JWT signing private keys in KMS, HSM, or Secrets Manager; publish only public keys via
     JWKS. Use reversible encryption only when a plaintext credential must be forwarded to an
     external service.
4. Fix JWT validation rules instead of trusting the library default.
   - Pin allowed algorithms per issuer; never let the token's `alg` choose the algorithm. Validate
     issuer, audience, expiry, not-before, token type, subject and scope shape, and a trusted `kid`
     inside the pinned JWKS.
   - Refuse `jku` and `x5u` URLs from the token. Keep access, ID, email, and password-reset tokens
     on separate `typ`, audience, and validation rules, with separate signing keys when practical.
5. Pair short access tokens with rotating refresh tokens.
   - Issue access tokens in minutes (about 10 minutes is a reasonable SaaS start) so a leaked token
     has a short damage window.
   - Rotate refresh tokens on every use, invalidate the previous token, and revoke the whole token
     family plus require re-login when an already-used refresh token reappears. Rotate session ids on
     login, privilege escalation, password change, and MFA change.
6. Design revocation separately from key rotation.
   - Key rotation starts issuing with a new key and keeps old public keys valid for verification
     until outstanding tokens expire; it is not a logout feature.
   - For immediate JWT revocation choose short lifetimes with a per-user `authVersion`, a `jti`
     denylist, opaque introspection, or session-state checks on sensitive APIs. Persist at least
     token id, family id, subject, client, issuance, expiry, last use, revocation, and replacement.
7. Assume bearer tokens leak.
   - Never place API keys, JWTs, or session ids in URLs, query strings, error messages, analytics,
     APM traces, or access logs; mask `Authorization`, `Cookie`, `Set-Cookie`, and refresh-token
     fields at the logging layer.
   - For high-risk service accounts and financial or admin APIs, bind tokens to a key with DPoP or
     mTLS so a stolen token string cannot be replayed from another client.

<!-- mustflow-section: postconditions -->
## Postconditions

- Token kinds, issuance entropy, storage, validation rules, rotation, revocation, client storage,
  and binding are explicit.
- Plaintext secret storage, single-part keys, browser-stored bearer tokens, library-chosen JWT
  algorithms, unrotated or reuse-tolerant refresh tokens, revocation-less JWTs, unbounded lifetimes,
  and bearer leakage are fixed or reported.
- Credential-lifecycle claims are backed by configured tests, storage or framework evidence, or
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

Prefer the narrowest configured tests that prove rotation, reuse detection, revocation windows,
algorithm pinning, audience and type rejection, and constant-time or hashed-storage behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If issuance, storage, rotation, or revocation evidence is missing, report the gap instead of
  claiming the credential design is safe.
- If the fix requires broad auth model changes, use `auth-permission-change` or
  `api-access-control-review` before editing that scope.
- If a real secret appears in code, fixtures, logs, or reports, stop repeating it and use
  `secret-exposure-response`.
- If a configured command fails, use `failure-triage` before further edits.

<!-- mustflow-section: output-format -->
## Output Format

- Credential and token lifecycle reviewed
- Token kind, issuance, entropy, and purpose findings
- Storage, hashing, and comparison findings
- Validation, rotation, family, and revocation findings
- Client storage, logging, and binding findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining credential-lifecycle risk
