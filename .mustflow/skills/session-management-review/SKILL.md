---
mustflow_doc: skill.session-management-review
locale: en
canonical: true
revision: 6
lifecycle: mustflow-owned
authority: procedure
name: session-management-review
description: Apply this skill when code is created, changed, reviewed, or reported and server-side session management needs review for multi-device login sessions, session entities, session lists, terminate-session APIs, current-other-all logout operations, forced logout latency, auth epochs, session fixation, session-id rotation, cookie attributes, __Host cookies, cookie tossing, SameSite and CSRF for session APIs, refresh token families and concurrent refresh races, refresh attempt ids, idle and absolute session expiry, session audit logging, or new-device and remote-logout notifications.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.session-management-review
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

# Session Management Review

<!-- mustflow-section: purpose -->
## Purpose

Review server-side sessions as the product's account-management surface, not as an implementation
detail behind the login button.

The review question is not "can the user log in?" It is "when a user has sessions on a phone, a
laptop, and a desktop, can they see them, terminate one, terminate all others, and is forced logout
actually forced?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports multi-device login sessions, session entities, session
  lists, terminate-session endpoints, logout-all or logout-other-devices endpoints, forced logout,
  session fixation, session-id rotation, cookie attributes, `__Host` cookies, cookie tossing,
  SameSite or CSRF handling for session APIs, refresh token families, concurrent refresh races,
  refresh attempt ids, idle or absolute session expiry, session audit events, or new-device and
  remote-logout notifications.
- A change affects how many sessions a user may have, how a session is displayed, terminated, or
  invalidated, or how quickly a revoked session stops working.
- A review needs proof that "logout" and "terminate this device" really end the server-side session
  and its token family.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily token issuance, storage, rotation, or revocation mechanics for API keys,
  JWTs, or refresh tokens; use `credential-token-lifecycle-review` first and this skill for the
  session-level view.
- The task is primarily authorization, permissions, roles, or permission-cache behavior; use
  `auth-permission-change` first.
- The task is primarily object-level API authorization or denial matrices; use
  `api-access-control-review`.
- The task is primarily how an in-progress session handoff or resume protocol works across devices;
  use `session-handoff-integrity-review`.
- The task is primarily how security state survives Redis, Valkey, or database failure or restarts;
  use `auth-state-resilience-review`.
- The task asks for live session hijacking or credential guessing.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Session entity ledger: session table or store, per-session fields, token hash construction,
  refresh family linkage, and how many sessions a user may keep.
- Session API ledger: list, terminate-one, terminate-other, terminate-all, and account-wide
  invalidation endpoints, their ownership predicates, response codes, and CSRF posture.
- Forced-logout latency ledger: which credential types are immediately revocable and which are
  self-validating, and where online session checks are required.
- Refresh ledger: family id, generation, token hash, consumed and replaced state, attempt ids,
  single-flight owner and coordination scope across tabs or BFF instances, bounded protected retry
  results, waiter delivery, and reuse detection.
- Cookie and browser ledger: cookie names, domains, prefixes, flags, SameSite, duplicate-name
  behavior, where tokens live in the browser, and separate short-lived OAuth/OIDC correlation
  cookies and supported response modes when federation is used.
- Risk ledger when monitoring is used: trusted proxy boundary, combined signals, proportionate
  actions and reason codes, legitimate-user recovery, and data minimization and retention.
- Expiry ledger: idle and absolute expiry sources, server enforcement points, and restart behavior.
- Recovery ledger: ordinary login session versus short-lived recovery transaction and purpose-bound
  reset grant, allowed operations, grant consumption/expiry, and pre-recovery credential revocation.
- Audit and notification ledger: session lifecycle events, safe identifiers, and user notifications.
- Existing auth tests, session fixtures, security docs, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing session, refresh, cookie, expiry, or audit evidence can be
  reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten session entities, session-list and termination APIs, logout operations, session-id
  rotation, cookie attributes, CSRF posture, refresh family coordination, expiry enforcement, audit
  events, notifications, and directly synchronized documentation or templates owned by the selected
  boundary.
- Update session docs, API examples, tests, and template surfaces that describe the same session
  contract.
- Do not add live session hijacking, broad scanners, or new command authority under this skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Model each login as an independent session entity.
   - Do not store one token per user such as `users.current_token`. Create an `auth_sessions` row per
     login with session id, user id, token hash, refresh family id, created, last-seen, idle expiry,
     absolute expiry, revoked, auth level, and auth time.
   - Hand the client an unguessable random token and store only a hash or HMAC of it server-side.
     Generate session tokens with a CSPRNG at 128 bits minimum, 256 bits for new designs.
2. Keep device identifiers out of authentication.
   - User Agent, IP, install id, and browser fingerprints are descriptive and risk signals, not
     authentication evidence. Matching them must not authenticate a user or grant access without a
     valid session secret and server session state. They are spoofable and change during normal use.
   - Session lists may display "Chrome on Windows" or "Seoul about 2 hours ago" as labels; the actual
     authentication evidence comes from the session secret and server session state.
   - A valid secret does not override a declared risk policy: combined evidence may require fresh
     authentication, hold a sensitive action, deny a request, or terminate a session. Record the
     evidence, reason, action, and legitimate-user recovery path. Do not permanently block someone
     merely because their IP changed; include VPN, mobile-network, NAT, and device-change cases.
   - Evaluate client IP only through a configured trusted proxy chain, never arbitrary forwarded
     headers. Minimize collected signals and their retention. This does not require new fingerprint
     collection or a risk engine in every product.
3. Treat session list and termination APIs as sensitive account management.
   - Terminate with one ownership-bound query such as
     `UPDATE auth_sessions SET revoked_at = now() WHERE id = ? AND user_id = ? AND revoked_at IS NULL`.
     Do not fetch the session first and check ownership afterwards; that invites races and IDOR.
   - Return the same response (for example 204) whether the target was already terminated or never
     existed. For cookie-authenticated session APIs, do not implement termination via GET; require
     CSRF tokens, Origin verification, and Fetch Metadata where supported.
   - Require recent password, passkey, or MFA reauthentication for "logout all other devices" so a
     single stolen current session cannot kill every legitimate session.
4. Be honest about forced-logout latency.
   - Server-checked sessions block immediately once `revoked_at` is recorded. Self-validating JWTs
     cannot be recalled after issuance; a 15-minute access token means logout takes up to 15 minutes.
   - When immediate termination with JWTs is required, embed a session id (`sid`) and check session
     state online per request, or at least on payment, personal-data, and admin functions. Refresh
     tokens must always be checked against the server session record, and logout must revoke the
     whole refresh family of that session.
5. Separate current-session, other-session, and all-session logout.
   - Current-session logout revokes one session row. Device termination revokes one ownership-verified
     row. Logout-all-others revokes rows except the current session id.
   - On verified account recovery, password reset, or MFA reset completion, or confirmed account-wide
     compromise, bump
     `users.auth_epoch` and record the epoch on every session and token at issuance. Sessions or
     tokens with an older epoch are rejected without iterating all session rows.
6. Do not misclassify concurrent refresh as theft.
   - Multiple browser tabs or mobile retries can submit the same refresh token twice. Simple
     first-wins rotation plus theft verdict on the second request logs legitimate users out, while
     blindly accepting the old token for a window lets attackers reuse it.
   - Name one refresh single-flight owner per shared token family. Coordinate all tabs or BFF
     instances that share it before token exchange; an in-process mutex cannot coordinate other
     processes. Waiters obtain the current generation through the owner instead of independently
     exchanging the old token. Define owner failure, bounded waiting, and result delivery so a
     delayed response cannot overwrite newer credentials.
   - Store per-session `refresh_generation` and the current token hash, and rotate with one
     conditional update. A `refresh_attempt_id` identifies a retransmission, not whether two
     independent requests are legitimate. For a verified retransmission, return only the previously
     created result: bind it to the authenticated client, family, generation, and request; limit its
     lifetime and access; protect any retained token material with encryption; and erase it on expiry
     or revocation. Never log retry results or use an attempt id alone as authentication.
   - After coordination, unexplained reuse of a consumed token still revokes the family and requires
     a fresh login. If the provider cannot safely recover the same response, use its documented
     failure policy. Do not introduce blanket old-token grace or mint another successor. One refresh
     token must never fork into two live branches.
7. Audit the session lifecycle and notify on security events.
   - Log session creation, refresh rotation, reauthentication, privilege escalation, remote logout,
     reuse detection, and expiry. Never log raw tokens, cookies, or `Authorization` headers.
     Abbreviate or separately protect IP addresses when the product does not need full values.
   - Notify the user of new-device login and remote logout. Separate ordinary login sessions from
     short-lived recovery transactions and password-change-only `reset_grant` credentials. Recovery
     state may continue only its declared recovery steps; it cannot authorize general APIs, MFA
     removal, email change, or access/refresh-token issuance.
   - On verified reset or recovery completion, consume the used grant and terminate its transaction;
     revoke pre-recovery sessions and refresh families under the account epoch policy, including
     the current browser's old login session. Require a fresh login; do not promote recovery state
     into a login session. Expire or cancel abandoned recovery grants without granting new access.
     Enforce idle and absolute expiry on ordinary sessions independently.
   - A product choosing a different post-recovery login policy must explicitly redesign its
     authentication requirements and new-session issuance with `authentication-design-review`,
     replacing the no-auto-login policy consistently rather than keeping contradictory exceptions.
8. Fix session fixation and cookie attributes.
   - Issue a new session id at every trust-level change: anonymous-to-login, password-to-MFA,
     user-to-admin, tenant switch, and impersonation start and end. After recovery, issue a login
     session only upon the required fresh login, not merely recovery completion. Revoke the
     old id server-side and do not keep old and new ids valid in parallel; in distributed stores make
     revoke-and-create one atomic operation.
   - Password-to-MFA or another assurance increase requires fresh authentication bound to the
     current session and purpose. Account flags, authenticator registration, and token refresh alone
     do not elevate a session. Preserve initial authentication history separately from verified
     step-up method, time, assurance, and expiry; reject failed or expired elevation and old ids.
   - Use a host-only `__Host-session` cookie (`Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, no
     `Domain`). Do not merge app, blog, and user-content subdomains into one cookie domain, and test
     which value a framework picks when duplicate cookie names exist across paths or domains.
9. Do not rely on SameSite alone for CSRF.
   - Cookies are sent automatically, so cross-site requests can act with the victim's authority.
     `SameSite=Lax` or `Strict` is one layer, not a replacement for CSRF defense.
   - For ordinary application endpoints, require a session-bound CSRF token and exact `Origin`
     verification on state-changing cookie-auth
     requests, reject cross-site requests where `Sec-Fetch-Site` is supported, and reject form-
     encodable content types on JSON APIs. Never implement state changes via GET. Login and logout
     on these endpoints are not exceptions: login CSRF can put the victim into the attacker's account.
   - Separate dedicated OAuth/OIDC protocol callbacks from that middleware. A supported OIDC
     `response_mode=form_post` callback is a cross-site POST and must use the authentication library's
     protocol validation path: single-use state bound to the starting browser and transaction, PKCE,
     OIDC nonce, expected issuer, and signature/audience/expiry validation. Reject missing, expired,
     reused, or mismatched transaction evidence before establishing a session. Never exempt all of
     `/auth/*` or allow an unvalidated callback.
   - Do not rely on a general `SameSite=Lax` session cookie being sent on a cross-site POST. Give
     short-lived correlation/nonce cookies their own library- and supported-browser-specific policy,
     including `Secure` when `SameSite=None` is required, narrow scope, and prompt cleanup. Keep
     ordinary session-cookie protections; do not change them all to `SameSite=None`. Reject unsupported
     response modes during configuration instead of weakening validation at runtime.
10. Keep logout a server operation.
    - Deleting the browser cookie only removes the client's copy; the server session and refresh
      family stay alive and stolen credentials keep working.
    - Logout revokes the server session and the current refresh family. All-device logout revokes
      every family or bumps the account auth version. Password reset, MFA removal, recovery
      completion, suspension, and admin permission changes run the same revocation policy.
    - WebSocket and SSE connections must close or re-verify when a revocation event arrives; do not
      assume an external IdP logout automatically ends service sessions.

<!-- mustflow-section: postconditions -->
## Postconditions

- Session entities, session APIs, logout operations, forced-logout latency, refresh family
  coordination, cookie attributes, CSRF posture, expiry enforcement, audit events, and notifications
  are explicit.
- Single-token-per-user storage, device-identifier authentication, ownership-less termination,
  unfixable sessions, unbounded latency claims, ambiguous logout semantics, refresh forks, SameSite-
  only CSRF, cookie-delete-only logout, and memory-only expiry are fixed or reported.
- Session-management claims are backed by configured tests, session contract evidence, or labeled as
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

Prefer the narrowest configured tests that prove terminate-one and logout-all ownership, session-id
rotation at trust changes, concurrent refresh single-flight, forced-logout latency, and cookie or
CSRF behavior.

Review three distinct refresh cases: a verified same-id retransmission gets the same protected
result within its retention limit; independent concurrent tabs or BFF requests are coalesced before
exchange and receive one generation; unexplained old-token reuse revokes the family. Also cover
owner failure and expired retry results without treating a different attempt id as proof of theft.

For risk monitoring, reject access based only on a matching IP or device label; process a legitimate
IP change under the declared policy; and permit proportionate step-up or denial for combined risk
signals even with a valid secret. Include spoofed forwarded headers and a legitimate recovery path.

In a declared test environment, reject ordinary cross-site API mutations while allowing a supported
form_post callback only after its transaction and token checks. Reject absent or reused state,
wrong browser binding, wrong issuer, invalid nonce/PKCE, and unsupported response modes. Use fixtures
or a local test provider; real IdP accounts and production tokens are not required for this review.

Review recovery as explicit transitions: a valid limited grant permits its password-change step but
denies general APIs and token issuance; completion consumes the grant and revokes all pre-recovery
sessions and refresh families, including the current browser's; grant replay and old credentials
fail; only a subsequent successful fresh login issues a new ordinary session. Expired or canceled
grants fail without automatically granting access or treating a recovery request as verified proof.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If session entity, refresh family, cookie, or expiry evidence is missing, report the gap instead of
  claiming logout is safe.
- If the fix requires broad auth model changes, use `auth-permission-change` before editing that
  scope.
- If token mechanics change, use `credential-token-lifecycle-review` before editing that scope.
- If a real secret appears in code, fixtures, logs, or reports, stop repeating it and use
  `secret-exposure-response`.

<!-- mustflow-section: output-format -->
## Output Format

- Session management reviewed
- Session entity and multi-device model findings
- Session list and termination API findings
- Logout operation and forced-logout latency findings
- Refresh family and concurrency findings
- Cookie, fixation, and CSRF findings
- Expiry, audit, and notification findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining session-management risk
