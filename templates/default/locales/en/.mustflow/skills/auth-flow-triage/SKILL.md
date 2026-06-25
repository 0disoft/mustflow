---
mustflow_doc: skill.auth-flow-triage
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: auth-flow-triage
description: Apply this skill when login, signup, logout, session refresh, OAuth or OIDC redirect, PKCE, nonce, state, passkey, MFA, password reset, magic link, cookie, JWT, token exchange, JWKS, IdP callback, account linking, or authorization-after-login behavior is failing, intermittent, browser-only, client-specific, or not yet localized to identity, cookie, token, proxy, session store, provider, clock, rate limit, or permission policy.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.auth-flow-triage
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

# Auth Flow Triage

<!-- mustflow-section: purpose -->
## Purpose

Localize authentication-flow failures without collapsing identity proof, session issuance, token
validation, browser cookie behavior, external provider callbacks, MFA, and authorization into one
"login is broken" bucket.

<!-- mustflow-section: use-when -->
## Use When

- Login, signup, logout, refresh, password reset, magic link, MFA, passkey, OAuth, OIDC, SAML-like
  handoff, API-key login, or account-linking behavior fails or behaves differently across clients.
- A user appears authenticated on one boundary but logged out, forbidden, redirected, or assigned to
  the wrong account on another boundary.
- The failure may involve cookies, SameSite, CORS credentials, CSRF, proxy headers, redirect URI,
  state, nonce, PKCE, authorization code exchange, JWT claims, JWKS rotation, refresh token
  rotation, session storage, account lockout, rate limit, IdP metadata, passkeys, OTP, clocks, or
  authorization after login.
- The task is to diagnose or review an auth failure before the exact code owner is known.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is already localized to implementing or changing the permission model; use
  `auth-permission-change`.
- The task is specifically API object, property, or function authorization review; use
  `api-access-control-review`.
- The task is only generic API failure triage before any auth-specific signal exists; use
  `api-failure-triage`.
- The task asks for live credential testing, brute force, phishing simulation, or production token
  collection. Stay within defensive code review, sanitized traces, and configured tests.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Auth attempt packet: observed time, timezone, trace or request id, client type, route, sanitized
  request and response shape, redirect chain, status codes, user-facing message class, and result.
- Stage ledger: user lookup, credential verification, external provider round trip, callback,
  token exchange, session issue, cookie write, redirect, authorization decision, and logout or
  revocation when relevant.
- Token and session ledger: session id hash, token type, issuer, audience, subject, `jti`, `iat`,
  `nbf`, `exp`, key id, refresh-token family state, cookie attributes, session-store key, and
  revocation or rotation state.
- Browser and proxy ledger: origin, host, forwarded proto and host, redirect URI, cookie domain and
  path, SameSite, Secure, HttpOnly, CORS credentials, CSRF token, and proxy trust boundary.
- Provider ledger: IdP issuer, discovery metadata, JWKS URI, registered redirect URIs, client id,
  PKCE method, state, nonce, passkey RP ID, WebAuthn origin, MFA method, and provider error class.
- Denial and privacy ledger: enumeration policy, lockout or rate-limit decision, internal result
  code, public error message, redaction boundary, and denial-case tests.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked.
- Secrets, tokens, OTPs, passwords, cookies, raw provider payloads, personal identifiers, and private
  callback URLs are redacted before being written into docs, tests, commits, or reports.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten stage-specific result codes, safe trace ids, token validation, cookie settings,
  proxy trust handling, redirect URI checks, PKCE, state, nonce, JWKS refresh behavior, session
  rotation, refresh-token serialization, account-linking checks, passkey origin checks, MFA tests,
  redaction, docs, fixtures, and denial-case tests.
- Add focused tests that reproduce the sanitized failure stage, token claim mismatch, cookie
  behavior, callback binding, refresh-token race, session fixation boundary, or account-linking
  policy.
- Do not add auth bypasses, broad CORS wildcards, loose redirect matching, disabled TLS checks,
  widened clock skew, token logging, provider-console assumptions, or live credential probes.

<!-- mustflow-section: procedure -->
## Procedure

1. Split the symptom by stage before editing: user lookup, credential or passkey verification,
   provider redirect, callback validation, token exchange, session issue, cookie persistence,
   refresh, logout, and authorization-after-login.
2. Preserve one sanitized failing attempt plus one success comparator. Compare the actual redirect
   chain, cookies sent and set, status codes, provider error class, token type, and client version.
3. Keep public and internal errors separate. Public messages should avoid account enumeration;
   internal evidence should keep stable reason codes such as missing user, credential mismatch,
   disabled account, MFA required, token expired, nonce mismatch, PKCE mismatch, and policy denied.
4. Verify clocks before treating tokens as bad. Compare server epoch, token `iat`, `nbf`, `exp`,
   OTP window, signed request timestamp, certificate validity, and applied clock skew.
5. For browser-only failures, check actual cookie attributes, CORS credential behavior, CSRF,
   redirect handling, preflight, duplicate cookie names, and whether the callback writes the cookie
   on the host and path the app later uses.
6. For proxy-backed apps, verify trusted forwarded headers, external URL calculation, secure cookie
   detection, host allowlists, and callback URL generation. Do not trust arbitrary forwarded headers.
7. For OAuth or OIDC, compare the exact registered and transmitted redirect URI, issuer, discovery
   metadata, client id, state, nonce, PKCE method, code-verifier binding, token endpoint, and JWKS.
8. For token validation, check signature, algorithm allowlist, key id refresh, issuer, audience,
   authorized party when needed, subject, expiry, not-before, nonce, token type, and stale role or
   permission claims.
9. For refresh and logout failures, separate local cookie deletion, server session revocation,
   refresh-token family state, access-token lifetime, IdP SSO session, and provider logout.
10. For passkeys and MFA, check challenge one-time use, origin, RP ID, credential id, user handle,
    user-verification flags, OTP reuse, recovery path, reauthentication, and registration or removal
    policy.
11. For account linking, use provider `issuer + subject` as the external identity key. Treat email
    equality as weak evidence that requires an authenticated linking flow.
12. If authentication succeeds but the user is still blocked, switch to `auth-permission-change` or
    `api-access-control-review` and inspect tenant, resource, role, scope, stale cache, and token
    claim freshness.
13. Apply the smallest localized fix and rerun the narrowest configured intent that covers the
    affected auth stage, denial case, docs, template, or package surface.

<!-- mustflow-section: postconditions -->
## Postconditions

- The failing auth stage is localized or named as an evidence gap.
- Public error wording, internal reason codes, trace ids, session or token identifiers, and redaction
  boundaries are explicit.
- Cookie, proxy, redirect, token, JWKS, provider metadata, passkey, MFA, refresh, logout, rate limit,
  and authorization-after-login checks are fixed or reported where relevant.
- Any permission follow-up is routed to the narrower access-control skill instead of hidden inside
  login debugging.

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

Prefer the narrowest configured tests that cover the failing auth stage and denial behavior. Report
missing browser cookie, provider callback, JWKS rotation, MFA, passkey, refresh-token race, and
session-store integration evidence instead of inventing live auth probes.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the failing auth attempt cannot be captured safely, report the missing stage evidence instead
  of changing auth code from guesses.
- If sensitive values appear in evidence, stop repeating them and summarize the shape only.
- If fixing the failure requires external IdP console changes, provider credentials, production
  tokens, live email or SMS delivery, or browser automation outside the command contract, report the
  manual boundary.
- If configured verification fails, preserve the failing intent and output tail, then fix only the
  localized auth stage or test contract.

<!-- mustflow-section: output-format -->
## Output Format

- Auth flow triaged
- Failing stage, sanitized attempt packet, and success comparator
- Cookie, proxy, redirect, provider, token, JWKS, session, refresh, logout, passkey, MFA, rate limit,
  enumeration, and authorization-after-login findings
- Fix applied or recommended
- Evidence level: configured-test evidence, static review risk, manual-only, missing, or not
  applicable
- Command intents run
- Skipped auth diagnostics and reasons
- Remaining auth-flow risk
