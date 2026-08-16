---
mustflow_doc: skill.auth-state-resilience-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: auth-state-resilience-review
description: Apply this skill when code is created, changed, reviewed, or reported and authentication security state must survive infrastructure failure or restarts, including Redis, Valkey, or database outages, session or refresh-token state stored in a cache, auth epochs, session versions, refresh generations, password reset or recovery state, MFA state, outbox event publication, cache invalidation after commits, fail-open or fail-closed policy for auth reads, expiry derived from database timestamps, conditional atomic rotation or revocation, monotonic version checks, or recovery and restart verification.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.auth-state-resilience-review
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

# Auth State Resilience Review

<!-- mustflow-section: purpose -->
## Purpose

Review authentication security state as durable truth that must survive cache eviction, cache
outage, failover, and server restart — not as a value that happens to live in Redis.

The review question is not "does the session work when everything is healthy?" It is "after a Valkey
restart, a failover, a server crash between commit and response, or a clock change, can a revoked
session, a consumed token, or a demoted permission come back to life?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports where session, refresh-token, auth-epoch, MFA, or
  recovery state is stored, how it is invalidated, and what happens when the cache or database fails
  or restarts.
- A change stores session revocation, `auth_epoch`, refresh generations, MFA state, or recovery-token
  usage only in Redis, Valkey, or another cache; or derives expiry from memory timers or cache TTL.
- A change emits cache invalidation or events after a database commit, uses pub/sub for invalidation,
  or needs an outbox for transactional events.
- A change determines fail-open or fail-closed behavior for authentication reads when the cache is
  unavailable.
- A review needs proof that monotonic versions such as epoch, session version, or refresh generation
  are compared, not just keys deleted.
- A final report claims sessions, tokens, or permissions survive restarts or are fail-safe.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily how sessions are modeled, listed, or terminated; use `session-management-review`.
- The task is primarily token issuance, storage, rotation, or revocation mechanics; use
  `credential-token-lifecycle-review`.
- The task is primarily authorization or permission-cache behavior; use `auth-permission-change`.
- The task is a general database or cache performance review without an authentication security-state
  boundary; use `database-change-safety`, `cache-integrity-review`, or `database-query-bottleneck-review`.
- The task is a general crash-consistency or dual-write review without auth state; use
  `crash-consistency-recovery-review` or `dual-write-consistency`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Security-state ledger: which session, token, epoch, MFA, recovery, and permission states exist and
  where each is stored (database, cache, memory, token claim).
- Persistence and failover ledger: cache persistence settings, replication mode, durability windows,
  failover behavior, and what can be lost in each failure scenario.
- Transaction ledger: which security-state changes and which event publications must commit together,
  and how the outbox or equivalent is consumed.
- Fail-mode ledger: what each authentication function does when the cache is down, when the database
  is down, and when a token cannot be checked online.
- Version ledger: auth epoch, session version, refresh generation, membership or policy version,
  where each is recorded at issuance, and where it is compared.
- Expiry ledger: absolute and idle expiry sources, restart behavior, and who computes the remaining
  time.
- Recovery ledger: startup, cache rebuild, outbox replay, stale-cache cleanup, and the focused
  failure cases that must be verified.
- Existing tests, fixtures, security docs, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing state, failover, transaction, fail-mode, version, or
  recovery evidence can be reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten database-owned security state, cache-as-acceleration boundaries, transactional
  event publication, fail-closed policies, version comparisons, database-derived expiry, startup
  recovery, and focused failure tests, and directly synchronized documentation or templates owned by
  the selected boundary.
- Update auth durability docs, runbooks, tests, and template surfaces that describe the same
  contract.
- Do not add raw Redis or Valkey administration commands, chaos engineering platforms, or new command
  authority under this skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Make the database the source of truth for security state.
   - Session revocation, `auth_epoch`, the current refresh generation, MFA change state, and
     recovery-token usage must not live only in Valkey. A cache restart or failover can resurrect an
     already-revoked session when the only copy was in the cache.
   - Use a durable database such as PostgreSQL for the source of truth and Valkey only for session
     lookup acceleration, rate-limit counters, and temporary risk scores. Remember that default AOF
     `everysec` can lose about one second of writes on failure, and async replication can drop
     acknowledged writes during failover; `WAIT` does not turn it into a strong-consistency system.
2. Put security-state changes and event publication in one transaction.
   - Password reset is not just a hash update. Commit the old recovery-token revocation, `auth_epoch`
     bump, session revocation, MFA recovery state, and audit event in one transaction.
   - Write cache-invalidation messages to an outbox table in the same transaction and let a worker
     deliver them to Valkey or the message system. Directly deleting cache keys after a commit leaves
     the cache alive if the process dies between commit and delete. Outbox consumers must be
     idempotent on the event id.
3. Fix fail-mode behavior per failure type.
   - Treating a cache error as `null` and allowing authentication is the most dangerous pattern;
     "unknown" and "healthy" are different values.
   - When Valkey is down, fall back session-cache lookups to the database; strengthen per-instance
     and edge rate limits; and throttle or close with 503 the low-cost attack surfaces such as OTP
     verification and password reset until the central limiter returns. When the database is down,
     stop new login, refresh, password change, session termination, MFA change, and privilege
     escalation.
   - If already-issued short access tokens must keep working, allow only explicitly listed low-risk
     reads. Payment, personal-data download, API-key issuance, and admin work must deny when
     security state cannot be checked. Opening everything for availability is an authentication
     bypass, not a degraded mode.
4. Derive expiry from database absolute timestamps, not memory timers or cache TTL alone.
   - Store session `created_at`, `idle_expires_at`, `absolute_expires_at`, and `revoked_at` as
     absolute times in the database. Cache TTLs are copies computed from those times. After a server
     restart, recompute remaining TTLs from the database times.
   - `setTimeout`, process-uptime arithmetic, and in-memory last-activity are reset by a restart.
     Expiry decisions are server-side, never from client-sent times or cookie values.
5. Make rotation and revocation conditional atomic operations.
   - Never rotate with lookup, validate, generate, delete old, save new. Two concurrent requests both
     pass validation and mint different successors. Instead, replace the current hash and generation
     in one `UPDATE ... WHERE` and take only the succeeded row via `RETURNING`; use row locks or
     Serializable isolation when needed and retry the whole operation on serialization failure.
   - Session termination is idempotent with a `revoked_at IS NULL` condition so a client retry after
     a server crash between commit and response reaches the same safe result.
6. Judge validity by monotonic versions, not by deletion.
   - A missing cache key is meaningless: the entry may never have existed, expired, been evicted, or
     been lost in failover.
   - Keep `auth_epoch` per user, `session_version` per session, and `refresh_generation` per token
     family. Bump the epoch on password reset or all-device logout, the session version on per-session
     changes, and the generation on every refresh. Reject any token or cached value whose recorded
     version is lower than the current database value.
   - Preserve revoked rows and the last generation until possible token lifetimes pass, so stale
     backups or delayed cache events cannot revive a lower version. The defense against session
     resurrection is a monotonic value, not a deletion.
7. Focus recovery and failure verification on small fatal cases.
   - On startup, rebuild the cache from the database, replay unprocessed outbox events, and clean
     sessions that the database shows as revoked but the cache still shows as active. Never rebuild
     the database from Valkey contents.
   - Verification should target the cases where security state actually flips: session revocation
     just before a Valkey restart, a rate-limit increment just before failover, a server crash after
     commit before response, concurrent refresh submission, a failed cache invalidation after a
     successful database write, and a system clock change.

<!-- mustflow-section: postconditions -->
## Postconditions

- Security-state ownership, cache boundaries, transactional event publication, fail-mode policy,
  expiry sources, atomic conditional operations, monotonic version checks, and recovery behavior are
  explicit.
- Cache-only revocation or epochs, TTL-only expiry, memory-timer expiry, lossy pub/sub
  invalidation, cache-miss-as-allowed behavior, and delete-based validity are fixed or reported.
- Auth-state durability claims are backed by configured tests, storage or failover evidence, or
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

Prefer the narrowest configured tests that prove conditional rotation and revocation, epoch or
version rejection, fail-closed behavior on cache or database outage, outbox replay idempotency, and
startup recovery.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If state ownership, failover, transaction, fail-mode, version, or recovery evidence is missing,
  report the gap instead of claiming the auth state survives failures.
- If fail-open behavior is found on an auth decision, fix or report it as an authentication bypass
  before other work.
- If cache-only state cannot be moved to the database in the current scope, report the resurrection
  window and the required migration.

<!-- mustflow-section: output-format -->
## Output Format

- Auth state resilience reviewed
- Security-state ownership and cache boundary findings
- Transaction and outbox findings
- Fail-mode policy findings
- Expiry source findings
- Atomic operation and version findings
- Recovery and verification findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining auth-state resilience risk
