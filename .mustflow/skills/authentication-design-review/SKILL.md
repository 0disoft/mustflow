---
mustflow_doc: skill.authentication-design-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: authentication-design-review
description: Apply this skill when code is created, changed, reviewed, or reported and authentication system design needs review for account versus login-identifier versus authenticator separation, account state machines, authenticator lifecycles, authentication strength per session, auth time and AAL and AMR, step-up requirements, account recovery protection, recovery-code handling, password policy, Argon2id hashing, breached-password blocking, login throttling and account enumeration hiding, or social login and OAuth OIDC account linking.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.authentication-design-review
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

# Authentication Design Review

<!-- mustflow-section: purpose -->
## Purpose

Review authentication as a designed identity system — accounts, identifiers, authenticators,
recovery, and strength — not as a set of login buttons.

The review question is not "does the login work?" It is "when an account is merged, recovered,
upgraded, or attacked, does the model still separate what the user is from how they prove it, and
does every recovery path stay at least as strong as login?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports the account data model, login identifiers, authenticator
  storage, account or authenticator state machines, authentication strength and step-up policy,
  account recovery, recovery codes, password policy and hashing, breached-password blocking, login
  throttling, account enumeration behavior, or social login and OAuth or OIDC account linking.
- A change affects how an account is identified, how authenticators are bound, verified, or removed,
  or how a user recovers access.
- A review needs proof that recovery, authenticator addition, and social-login linking are not weaker
  than the login path.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily authorization, permissions, roles, or permission changes; use
  `auth-permission-change` first.
- The task is primarily token or API-key issuance, storage, rotation, or revocation mechanics; use
  `credential-token-lifecycle-review` first.
- The task is primarily server-side session entities, session lists, logout operations, or cookies;
  use `session-management-review` first.
- The task is primarily how security state survives cache or database failure; use
  `auth-state-resilience-review`.
- The task is only secret scanning or incident response for an already-leaked credential; use
  `secret-exposure-response`.
- The task asks for live credential guessing or penetration testing.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Account model ledger: account id, login identifiers, authenticators, roles or grants, and where
  each is stored and linked.
- State machine ledger: account states, authenticator states, and the transitions, requirements, and
  expiry of each transition.
- Strength ledger: authentication methods per session, `auth_time`, AAL, AMR, authenticator ids,
  step-up requirements per sensitive action, and phishing resistance.
- Recovery ledger: recovery-code generation, hashing, single-use handling, notifications, and which
  sessions and token families are revoked on completion.
- Password ledger: minimum and maximum length, composition rules, breach-list checks, hashing
  parameters, rehash-on-login, and rotation policy.
- Enumeration and throttling ledger: login, signup, and recovery response parity, status-code and
  timing parity, dummy verification cost, and multi-axis attempt limits.
- Social login ledger: OAuth and OIDC flows, PKCE, exact redirect binding, state, nonce, provider
  account binding, and account-linking rules.
- Existing auth tests, security docs, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing model, state, strength, recovery, password, enumeration,
  or social-login evidence can be reported without guessing.
- Use verified implementations for cryptography and protocols: WebAuthn, OAuth, OIDC, password
  hashing, and token generation. This skill reviews the account state, authenticator changes,
  recovery, session revocation, and privilege policy the product owns.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten account-identifier-authenticator separation, explicit state machines, per-session
  authentication strength, recovery protection, password policy and hashing, breached-password
  checks, enumeration-safe responses, and social-login linking rules, and directly synchronized
  documentation or templates owned by the selected boundary.
- Update auth docs, signup or recovery flows, tests, and template surfaces that describe the same
  contract.
- Do not add raw password hashing implementations, cryptography, or new command authority under this
  skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Separate the account, login identifiers, and authenticators.
   - Do not cram email, password hash, social ids, MFA secrets, and refresh tokens into one `users`
     table. Use an immutable random `account_id`, keep email, phone, and username in
     `login_identifiers`, passwords, passkeys, TOTP, and recovery codes in `authenticators`, login
     state in `sessions`, and permissions in `roles` or `grants`.
   - Email changes and added social providers must not change the account identity. Sessions store
     `account_id`, authentication strength, original auth time, and permission version — not the
     mutable email or full role set. Use random identifiers for externally visible user identity.
2. Model account and authenticator lifecycles as explicit state machines.
   - Replace piles of booleans such as `is_verified`, `is_locked`, `is_recovering`, and
     `mfa_enabled` with one account state (`pending`, `active`, `recovery_pending`, `suspended`,
     `disabled`, `deleted`) and an authenticator lifecycle (`pending_binding`, `active`,
     `compromised`, `revoked`).
   - Record the initiating session, one-time transaction id, expiry, required auth strength, and
     which existing sessions to revoke on each transition. Email change, passkey addition, MFA
     removal, and password reset are transactional state changes, not simple updates.
3. Record authentication strength per session and request, not per account.
   - Passing MFA once does not make the account an MFA account forever. Store `auth_time`, AAL, AMR,
     and `authenticator_id` on the session.
   - Ordinary reads may ride an old password session, but payment-method change, API-key display,
     personal-data export, MFA removal, and admin transitions must require fresh authentication
     within recent minutes. Prefer phishing-resistant methods bound to the current site domain;
     manually entered OTP is not phishing-resistant authentication.
4. Protect recovery and authenticator addition more strictly than login.
   - Attackers prefer recovery over attacking the password and MFA head-on. If recovery is weaker
     than login, MFA is decoration.
   - Drop security questions. Generate recovery codes with sufficient randomness, hash them like
     passwords, and revoke each code after one use. On recovery completion, revoke existing sessions
     and refresh families, notify the old email, phone, and app, and require a fresh login instead of
     auto-login. MFA removal, primary-email change, and payout-account change need reauthentication
     or a grace period.
5. Replace password complexity games with offline-cracking cost.
   - Composition rules and 90-day rotation produce predictable mutations and more reuse. Require at
     least 15 characters for password-only authentication or 8 as an MFA component, allow at least 64
     characters with spaces and Unicode, and reject common or breached passwords by full-string
     blocklist. Do not force periodic rotation; require change on actual breach evidence.
   - Store with Argon2id, per-user random salt and parameters, benchmarked to the highest memory and
     work cost the deployment can sustain, and rehash with current parameters on successful login.
     Keep any pepper in KMS or HSM, separate from the database, and never store reversible password
     ciphertext.
6. Combine multi-axis login limits with enumeration hiding.
   - IP-only limits are bypassed by proxies and botnets; account-only locks let attackers freeze
     other users. Combine account identifier hash, IP or network range, device, network provider,
     failure rate, and password spraying across accounts, and escalate delay and additional
     verification as failures accumulate without permanent lockout by attacker requests alone.
   - Hide account existence across login, signup, and recovery: unify message, HTTP status,
     response body, size, redirect, cookie issuance, and processing path; run dummy verification work
     for unknown accounts; and respond identically for registered and unregistered email in recovery
     while sending mail asynchronously.
7. Treat social login as an account-linking protocol, not a merge button.
   - OAuth and OIDC are protocols that prevent attackers from sitting between the browser redirect
     and token exchange. Use the Authorization Code Flow with PKCE `S256` on every client, match the
     redirect URI exactly against the registered value, and bind a fresh `state`, PKCE challenge, and
     OIDC `nonce` to the browser session per attempt. Validate ID Token signature, `iss`, `aud`, and
     `nonce`. Do not use the Implicit Flow or direct password transmission.
   - Never auto-merge accounts because two providers returned the same email. Link accounts only
     after reauthenticating the existing account and verifying a fresh login from the new provider,
     and never substitute an ID Token for an API access token.

<!-- mustflow-section: postconditions -->
## Postconditions

- Account, identifier, and authenticator separation; explicit state machines; per-session strength;
  recovery protection; password policy and hashing; multi-axis limits with enumeration hiding; and
  social-login linking rules are explicit.
- Single-table identity soup, boolean-state contradictions, per-account strength assumptions, weak
  recovery, composition-rule password policy, reversible password storage, permanent locks, leaking
  account existence, and email-based auto-merge are fixed or reported.
- Authentication-design claims are backed by configured tests, model evidence, or labeled as
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

Prefer the narrowest configured tests that prove state-machine transitions, step-up enforcement,
recovery single-use and revocation, breached-password rejection, enumeration response parity, and
social-login linking and PKCE behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If model, state, strength, recovery, password, enumeration, or social-login evidence is missing,
  report the gap instead of claiming the design is safe.
- If recovery or authenticator addition is weaker than login, report it as a design defect before
  other work.
- If the fix requires broad auth model changes, use `auth-permission-change` or
  `session-management-review` before editing that scope.

<!-- mustflow-section: output-format -->
## Output Format

- Authentication design reviewed
- Account, identifier, and authenticator model findings
- State machine and transition findings
- Authentication strength and step-up findings
- Recovery and notification findings
- Password policy and hashing findings
- Throttling and enumeration findings
- Social login and linking findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining authentication-design risk
