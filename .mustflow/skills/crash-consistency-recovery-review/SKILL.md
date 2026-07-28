---
mustflow_doc: skill.crash-consistency-recovery-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: crash-consistency-recovery-review
description: Apply this skill when code, tests, docs, or reports create, change, review, or claim safety for process-crash, power-loss, forced-termination, disk-full, short-write, flush, atomic-replace, multi-file publication, startup recovery, local journal, resumable upload or download, stale-worker fencing, or fault-injection behavior where persisted state must remain a complete old or complete new generation and incomplete work must resume, roll back, quarantine, or reconcile safely.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.crash-consistency-recovery-review
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

# Crash Consistency Recovery Review

<!-- mustflow-section: purpose -->
## Purpose

Keep persisted work truthful and recoverable when a process, machine, network path, or storage layer
stops between any two durable steps. Prove that readers observe a complete previous generation or a
complete new generation, never a half-published mixture, and that recovery itself remains safe when
interrupted repeatedly.

<!-- mustflow-section: use-when -->
## Use When

- Code writes or replaces durable files, local state, manifests, indexes, checkpoints, journals,
  generation pointers, upload sessions, download state, or multi-file snapshots.
- A process crash, forced termination, power loss, disk-full condition, partial write, flush error,
  stalled I/O, restart, failover, or stale worker can interrupt persistence or publication.
- Startup code discovers unfinished work, temporary files, stale `RUNNING` jobs, incomplete
  generations, or ambiguous external effects and must resume, roll back, quarantine, or reconcile.
- Upload or download work must resume without mixing chunks, versions, owners, or final objects.
- A test or report claims crash safety, power-loss safety, durable completion, atomic publication,
  restart safety, resumability, or recovery correctness.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main concern is path traversal, symlink, reparse point, permission, or platform filename
  safety; use `cross-platform-filesystem-safety` first and this skill for crash durability only.
- The main concern is malicious upload content, parser isolation, download authorization, or signed
  URL security; use `file-upload-security-review` first.
- The work spans multiple business participants, callbacks, timers, compensations, or deployments;
  use `durable-workflow-orchestration` first and this skill only for its local persistence boundary.
- The main risk is duplicate logical effects, stale request replay, queue delivery, or provider
  uncertainty; use `idempotency-integrity-review`, `dual-write-consistency`, or
  `queue-processing-integrity-review` first.
- The task only packages or checks an already-generated artifact; use `artifact-integrity-check`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Persisted-state ledger: authoritative records, files, directories, metadata, indexes, pointers,
  checkpoints, temporary objects, journals, receipts, and cleanup ownership.
- Commit-boundary ledger: intent record, data write, flush, close, rename or replace, directory-entry
  persistence, pointer publication, database commit, external effect, acknowledgement, and success
  state in their actual order.
- Platform and storage ledger: operating system, local or network filesystem, volume boundaries,
  runtime APIs, flush and replace guarantees, object-store semantics, database guarantees, and any
  best-effort fallback.
- Recovery-state table for each incomplete form: detectability, authority, resume, rollback,
  quarantine, reconciliation, user-confirmation, retention, and cleanup decision.
- Ownership ledger: operation ID, attempt ID, state version, generation, lease, fencing token,
  current owner, stale-owner rejection, and conditional write result.
- Transfer ledger when applicable: session ID, owner, immutable source or target version, expected
  size, chunk geometry, received ranges, per-chunk digest, whole-object digest, expiry, finalize
  receipt, destination publication, and cleanup policy.
- Fault-injection ledger: kill points, one-way network failures, duplicate requests, hung I/O,
  short writes, flush or close errors, quota or inode exhaustion, read-only transitions, repeated
  crash during recovery, invariant oracle, and liveness bound.
- Relevant command-intent entries for implementation, tests, docs, package, and mustflow checks.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- The authoritative old state, intended new state, visibility boundary, and acceptable incomplete
  states are named before selecting an atomic-write or recovery technique.
- Platform guarantees are verified from the actual runtime and storage target or the claim is
  explicitly downgraded to best-effort.
- Existing filesystem, journal, transaction, state-machine, idempotency, generation, upload, and
  recovery helpers have been inspected before adding a new mechanism.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten explicit operation states, intent journals, same-volume staging, durable flush and
  replacement, generation publication, checksums, startup recovery, resumable transfer sessions,
  fencing, reconciliation, cleanup, diagnostics, and deterministic fault-injection tests.
- Use the database's transaction log for database-owned state. Add an application journal only for
  state outside that transaction boundary or for a separately owned publication protocol.
- Preserve incomplete artifacts until their recovery disposition is known. Cleanup must not erase
  the only evidence needed to resume, roll back, reconcile, or diagnose.
- Do not claim `write`, `close`, function return, HTTP success, rename, queue ack, or process survival
  alone proves durable business completion.
- Do not depend on graceful shutdown, `finally`, exit hooks, sleep, one successful restart, or a
  process-local flag as the recovery boundary.

<!-- mustflow-section: procedure -->
## Procedure

1. Define safety and liveness separately.
   - Safety: after any interruption, observers see one valid old generation or one valid new
     generation; no partial mixture, duplicate irreversible effect, or success without result exists.
   - Liveness: unfinished work reaches a declared terminal, retry, quarantine, or operator state
     within a bounded policy after recovery.
2. Draw the durable commit sequence. Separate function return, memory mutation, buffered write,
   durable data, durable namespace publication, external effect, acknowledgement, and visible
   success. Mark every gap where interruption changes the surviving truth.
3. Model work with monotonic states and conditional transitions. Use states such as `PENDING`,
   `RUNNING`, `COMMITTING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `UNKNOWN`, or local equivalents only
   when each has a durable invariant. Allow `SUCCEEDED` only when required results and receipts are
   durably queryable, and reject stale state, version, attempt, generation, or fence writes.
4. Record intent before non-transactional mutation. Persist operation ID, target, expected prior
   version, intended change, expected result, and recovery policy before the side effect. Persist
   completion only after the new state is durable. Do not duplicate a database transaction log with
   an application journal for state already committed atomically by that database.
5. Publish one file through a platform-appropriate atomic-write protocol. Prefer an unpredictable
   same-directory temporary file on the same volume, complete writes including short-write handling,
   file-data flush, close-error handling, atomic rename or replace, and parent-directory persistence
   where supported. Preserve and report weaker Windows, network-filesystem, overlay, object-store, or
   runtime guarantees instead of borrowing POSIX claims.
6. Publish related files as one generation. Build a new immutable generation away from readers,
   verify required files, sizes, digests, references, and schema compatibility, then atomically move
   a small current-generation pointer. Readers must pin one generation for the whole read. Leave
   incomplete generations invisible and clean them only after recovery and retention rules permit.
7. Coordinate database and external effects with their owning protocols. Persist outbox or effect
   intent with the local transaction, reuse one idempotency identity at the provider, retain the
   response receipt, and reconcile `UNKNOWN` outcomes before retry. Do not pretend two independent
   systems share a crash-atomic commit.
8. Fence stale owners. A lease timeout does not kill the old worker. Issue a monotonically increasing
   generation or fencing token and require the authoritative store or publication step to reject an
   older token. Treat a zero-row conditional update or rejected pointer publication as lost authority,
   not success.
9. Make startup recovery a first-class phase before normal mutation. Inventory incomplete journals,
   temporary files, uncommitted generations, stale running jobs, ambiguous receipts, and transfer
   sessions. Apply an explicit state table that selects resume, rollback, quarantine, reconciliation,
   user confirmation, or safe cleanup. Bound recovery work and keep degraded or read-only startup
   available when policy permits.
10. Design resumable transfers as staged publication.
    - Create a server-owned transfer session with owner, immutable file version, expected size,
      chunk geometry, expiry, and destination identity; never expose in-progress bytes as final.
    - Bind each range or chunk number to length and digest. Accept identical replay, reject conflicting
      replay, and acknowledge only the durability level promised by the protocol.
    - Resume from authoritative server state, not only a client bitmap. Pin the download source
      version so resumed ranges cannot combine different files.
    - Make finalize idempotent: verify ranges, total size, chunk digests, whole-object digest, and
      destination ownership before one final publication; replay returns the same receipt.
    - Keep transport checksums distinct from a whole-file content digest. Do not treat multipart
      provider ETags as universal content hashes.
11. Design cleanup as a recoverable operation. Bind temporary objects to owner, operation,
    generation, creation state, and retention. Never delete a path solely because its name looks
    temporary. Cleanup must tolerate duplicate execution and a crash midway through cleanup.
12. Add fault-injection points at every durable boundary: before and after intent persistence, data
    write, flush, close, rename, directory persistence, pointer publication, external call, local
    commit, acknowledgement, finalize, and cleanup.
13. Exercise asymmetric and storage failures. Cover request delivered with response lost, read-only
    or write-only network failure, duplicate and delayed packets, hung I/O, disk bytes exhausted,
    metadata or inode exhaustion where applicable, quota failure, short writes, flush failure, close
    failure, read-only filesystem transition, and destination-volume mismatch.
14. Crash recovery itself repeatedly. Interrupt journal replay, generation selection, transfer
    finalize, outbox resend, reconciliation, and cleanup. Recovery must be idempotent and monotonic;
    repeated restart must not grant, charge, publish, merge, or delete again.
15. Verify business invariants with an independent oracle. Check result existence, digest, counts,
    money or credit totals, unique effects, queue state, state-result consistency, old-or-new
    generation visibility, and stale-owner rejection. A restarted process or green health endpoint
    is not a recovery proof.
16. Verify liveness separately. Ensure recoverable work is eventually retried or surfaced, poison or
    corrupt work is quarantined, and no job, lease, temporary object, or transfer session remains
    permanently stuck without an operator-visible owner and deadline.
17. Run the narrowest configured verification covering the changed persistence, platform, transfer,
    workflow, fault-injection, docs, package, and mustflow surfaces.

<!-- mustflow-section: postconditions -->
## Postconditions

- Durable completion, visibility, acknowledgement, and business success are separate observable
  boundaries with no unsupported equivalence.
- Single-file and multi-file publication leave a complete old or complete new state after every
  tested interruption.
- Startup recovery has an explicit disposition for every detectable incomplete state and remains
  safe under repeated interruption.
- Resumable transfers bind one owner, session, immutable version, range map, digests, final object,
  and idempotent finalize receipt.
- Stale workers, ambiguous effects, unsafe cleanup, and false success are fenced, reconciled,
  quarantined, or reported with a bounded owner.
- Safety and liveness claims are backed by named invariants and fault-injection evidence or clearly
  marked as unverified.

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

Prefer deterministic crash points, fake storage faults, disposable filesystems, controlled network
proxies, and invariant oracles exposed by configured intents. Do not infer raw process killers,
virtual machines, containers, privileged disk tools, live provider calls, or destructive fault
commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the authoritative state, visibility point, or durability guarantee is unknown, stop the strong
  claim and report the exact platform or storage evidence needed.
- If recovery cannot distinguish not-started, committed, and unknown effects, disable automatic
  replay for irreversible work and require reconciliation or operator review.
- If atomic replace, durable directory publication, conditional state update, or fencing is
  unavailable, narrow the design to immutable outputs plus a verified pointer or downgrade the
  guarantee explicitly.
- If fault injection can only prove process restart, report missing storage, network, invariant, and
  repeated-recovery evidence.
- If cleanup would destroy the only recovery evidence, defer cleanup and surface the retained state.
- If a configured check fails, preserve the failing boundary and use `failure-triage` before
  broadening the change.

<!-- mustflow-section: output-format -->
## Output Format

- Persistence surface, authoritative state, platform, and durability claim
- Commit sequence, visibility boundary, operation state, journal, generation, and fencing decisions
- Transfer session, chunk or range, immutable version, digest, finalize, and cleanup decisions
- Startup recovery state table and incomplete-state dispositions
- Fault-injection matrix, safety oracle, liveness bound, and evidence level
- Files changed and compatibility impact
- Command intents run and skipped checks
- Remaining crash-consistency or recovery risk
