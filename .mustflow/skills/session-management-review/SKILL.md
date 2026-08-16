---
mustflow_doc: skill.session-management-review
locale: en
canonical: true
revision: 1
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
  single-flight behavior, and reuse detection.
- Cookie and browser ledger: cookie names, domains, prefixes, flags, SameSite, duplicate-name
  behavior, and where tokens live in the browser.
- Expiry ledger: idle and absolute expiry sources, server enforcement points, and restart behavior.
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
   - User Agent, IP, install id, and browser fingerprints are descriptive and anomaly signals only.
     They are spoofable, churn with VPN and carrier NAT, and must never allow or deny a request.
   - Session lists may display "Chrome on Windows" or "Seoul about 2 hours ago" as labels; the actual
     authentication decision comes only from the session secret and server session state.
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
   - For account-wide suspicion such as account recovery, password reset, or MFA reset, bump
     `users.auth_epoch` and record the epoch on every session and token at issuance. Sessions or
     tokens with an older epoch are rejected without iterating all session rows.
6. Do not misclassify concurrent refresh as theft.
   - Multiple browser tabs or mobile retries can submit the same refresh token twice. Simple
     first-wins rotation plus theft verdict on the second request logs legitimate users out, while
     blindly accepting the old token for a window lets attackers reuse it.
   - Store per-session `refresh_generation` and the current token hash, and rotate with one
     conditional update. Record the client's `refresh_attempt_id` so a retry of the same request
     receives the already-created response. If the same old token reappears with a different attempt
     id, revoke the whole token family. One refresh token must never fork into two live branches.
7. Audit the session lifecycle and notify on security events.
   - Log session creation, refresh rotation, reauthentication, privilege escalation, remote logout,
     reuse detection, and expiry. Never log raw tokens, cookies, or `Authorization` headers.
     Abbreviate or separately protect IP addresses when the product does not need full values.
   - Notify the user of new-device login and remote logout. Password reset and account recovery
     should revoke existing sessions except the current recovery session. Enforce idle and absolute
     expiry on the server for every session.
8. Fix session fixation and cookie attributes.
   - Issue a new session id at every trust-level change: anonymous-to-login, password-to-MFA,
     user-to-admin, tenant switch, impersonation start and end, and recovery completion. Revoke the
     old id server-side and do not keep old and new ids valid in parallel; in distributed stores make
     revoke-and-create one atomic operation.
   - Use a host-only `__Host-session` cookie (`Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, no
     `Domain`). Do not merge app, blog, and user-content subdomains into one cookie domain, and test
     which value a framework picks when duplicate cookie names exist across paths or domains.
9. Do not rely on SameSite alone for CSRF.
   - Cookies are sent automatically, so cross-site requests can act with the victim's authority.
     `SameSite=Lax` or `Strict` is one layer, not a replacement for CSRF defense.
   - Require a session-bound CSRF token and exact `Origin` verification on state-changing cookie-auth
     requests, reject cross-site requests where `Sec-Fetch-Site` is supported, and reject form-
     encodable content types on JSON APIs. Never implement state changes via GET. Login and logout
     are not exceptions: login CSRF can put the victim into the attacker's account.
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
