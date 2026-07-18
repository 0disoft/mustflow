# Session Authorization and Stream Resume Checklist

Use this checklist when session handoff crosses multiple state stores, transfers authorization or
credential state, or resumes a bidirectional or media stream. Record protocol fields and evidence;
do not infer correctness from copied objects, transport continuity, token signature, or sticky
routing alone.

## Contents

1. [Authority envelope](#authority-envelope)
2. [Consistent state boundary](#consistent-state-boundary)
3. [Hidden state, expiry, and deletion](#hidden-state-expiry-and-deletion)
4. [Cursor and acknowledgment semantics](#cursor-and-acknowledgment-semantics)
5. [Schema and feature compatibility](#schema-and-feature-compatibility)
6. [Handoff and resume credentials](#handoff-and-resume-credentials)
7. [Authorization freshness and delegation](#authorization-freshness-and-delegation)
8. [Credential ownership and revocation](#credential-ownership-and-revocation)
9. [Router and partition behavior](#router-and-partition-behavior)
10. [Connection ownership](#connection-ownership)
11. [Bidirectional replay and resume](#bidirectional-replay-and-resume)
12. [Make-before-break and drain](#make-before-break-and-drain)
13. [Message, compression, and media boundaries](#message-compression-and-media-boundaries)
14. [Early-data replay](#early-data-replay)
15. [Failure matrix](#failure-matrix)
16. [Invariants](#invariants)
17. [Skill handoffs](#skill-handoffs)

## Authority envelope

Keep these concepts separate even when the storage schema uses different names:

| Concept | Meaning |
| --- | --- |
| Logical session | User-visible continuity boundary. |
| Owner instance | One process boot or runtime incarnation, not a reusable hostname. |
| Owner epoch | Monotonic generation accepted by authoritative sinks. |
| Handoff attempt | One logical cutover decision and its retries. |
| Protocol phase | Current legal transition state. |
| Snapshot revision | Source fact boundary represented by the snapshot. |
| Input cursor | Durable application position for incoming commands. |
| Directional ACK | Peer-confirmed application position for one direction. |
| Authorization grant | Current authority being delegated or exchanged. |
| Policy revision | Policy version used for target activation. |
| Lease identity | Coordination liveness record, not the fencing authority itself. |
| Connection generation | One transport attachment to the logical session. |

Do not reuse a pod name, worker label, IP address, socket identity, cookie, or connection ID as the
owner instance identity. Generate a distinct runtime-incarnation identity and bind it to the session
epoch through the authoritative record.

## Consistent state boundary

One-store state should bind snapshot and replay through one source revision. Multi-store state needs
either one transactional source of truth or a cursor vector with an explicit activation predicate.

Example evidence shape:

| Store or domain | Snapshot or read point | Applied through | Next expected | Validation |
| --- | --- | --- | --- | --- |
| Session facts | source revision | inclusive cursor | next cursor | canonical state hash |
| Authorization | grant and policy revision | latest evaluated revision | refresh rule | active grant check |
| Command inbox | admitted sequence | last terminal command | next admitted command | gap and duplicate scan |
| Output log | durable server sequence | peer application ACK | first replay sequence | replay-window check |
| Artifact manifest | immutable manifest ID | all required chunks | none | schema and hash check |

Name range semantics. `offset=100` is ambiguous; fields equivalent to `applied_through=100` and
`next_expected=101` are not. Verify inclusivity at empty, first-item, cutoff, duplicate, gap, and
resume-window boundaries.

When no global revision exists:

- capture each store's authoritative cursor;
- bind the cursor vector to one handoff attempt;
- keep one writer during catch-up;
- define which cross-store invariants the target must validate;
- reject activation when any component is stale, missing, or from another attempt;
- do not use wall-clock proximity as consistency proof.

Couple input position, state mutation, and output intent transactionally where one authority can own
them. Otherwise use durable inbox, outbox, effect receipts, and a recovery rule that prevents the
cursor from advancing beyond uncommitted state or lagging behind an already committed effect.

## Hidden state, expiry, and deletion

Inventory future-behavior state that ordinary DTOs often omit:

- timer intent and next eligible time;
- retry attempt, delay, and absolute deadline;
- rate-limit and concurrency budget;
- pending callback, subscription, and filter state;
- unconfirmed provider intent or external effect;
- random seed or deterministic generation position;
- heartbeat interpretation and liveness decision;
- application credit, batch boundary, and flow-control state;
- cancellation and approval wait state.

Classify each item as:

- transfer exactly with versioned evidence;
- rebuild from a named durable log or authority;
- discard and recreate under an explicit semantic rule;
- block handoff because safe reconstruction is impossible.

Preserve absolute expiry chosen by the authority. Do not reset a remaining TTL to a new default on
import. If wall-clock skew can affect behavior, use authority-service time or a stored absolute
deadline plus an explicitly bounded skew policy.

Treat deletion as a versioned event. Preserve tombstone identity and deletion revision longer than
the maximum stale-replica, cache, reconnect, and handoff window. A missing value without a deletion
version cannot distinguish never-created, deleted, not-yet-replicated, filtered, or read-failed.

## Cursor and acknowledgment semantics

Track client-to-server and server-to-client progress independently.

| Direction | Producer sequence | Receiver application ACK | Replay start |
| --- | --- | --- | --- |
| Client to server | Client command sequence | Server durable application position | First command after ACK |
| Server to client | Server event or output sequence | Client applied position | First event after ACK |

Separate at least:

- durable: replayable from authoritative storage;
- sent: passed to the local transport implementation;
- transport observed: optional delivery hint only;
- application acknowledged: peer states that the item reached the protocol's meaningful apply point.

Do not delete replay state at `sent`. Do not interpret socket write success, transport ACK, ping or
pong, stream flush, queue acceptance, or gateway forwarding as application acknowledgment.

For command responses, persist `command identity -> terminal result or status reference` before
success becomes externally visible. A retry after response loss must replay the stored result or
query the external effect, not execute the command as new work.

Scope durable dedupe to the logical tenant and session, operation type, target resource where
needed, and stable client command identity. Preserve it across owners and connection generations for
the maximum permitted offline, retry, replay, and handoff window.

Replay within one ordering domain must remain serial unless commutativity or independence is proven.
Parallel replay by arrival batch can reverse causally dependent commands even when every item has a
valid cursor.

## Schema and feature compatibility

Include enough envelope metadata to reject silent reinterpretation:

- schema version;
- writer runtime or protocol version;
- required feature set;
- units and precision for time and numeric values;
- enum and discriminator namespace;
- null, missing, empty, and tombstone semantics;
- cursor and range inclusivity;
- compression, media, or artifact format where applicable;
- migration identity and resulting canonical hash.

Test every supported source-target version pair in both directions that rolling deployment,
rollback, failover, or regional skew can produce. Do not assume API compatibility means persisted
session compatibility.

Reject activation when a required feature is unknown. Silently dropping a field, mapping an unknown
enum to a default, resetting a deadline, or narrowing an integer can create valid-looking but
semantically corrupted state.

## Handoff and resume credentials

Keep ordinary API credentials separate from handoff or resume authority. A handoff credential
should be usable only to accept or resume the named session transfer and should bind:

- issuer and explicit credential type;
- opaque session identity;
- source and target owner or audience;
- owner epoch and handoff attempt;
- connection generation when relevant;
- directional application ACK positions when resuming;
- nonce and one-time consumption record;
- short absolute expiry;
- permitted handoff or resume action only.

Store a hash or authoritative consumption record and consume the credential atomically with target
attachment or connection-generation registration. Reject wrong target, wrong epoch, expired,
replayed, downgraded, or already-consumed credentials.

Do not copy a source bearer credential or private key into the target. Exchange a credential
reference or delegated subject token for target-audience, least-privilege, preferably sender-bound
authority. Bind the new authority to the target's own key when the platform supports proof of
possession.

## Authorization freshness and delegation

Compute target authority from the intersection of:

- the currently active user or service grant;
- current tenant membership and policy;
- target audience and resource;
- target runtime capability;
- declared handoff purpose;
- still-valid approval or step-up evidence;
- restrictions attached by the source or control plane.

Do not union source scope with target defaults. Do not treat a copied authorization snapshot as
current when role, membership, device posture, grant state, or policy may change during transfer.
Re-evaluate immediately before target acceptance or activation and bind the evaluated grant and
policy revisions to the decision.

Keep these actors distinct in audit and downstream authorization:

- user or workload subject;
- source service actor;
- target service actor;
- intermediary or gateway actors;
- delegation chain and handoff purpose.

Handoff does not create new authentication. Preserve original authentication time, authentication
method, and assurance level. If the target needs stronger or fresher authentication, request step-up
instead of rewriting authentication metadata.

Validate every credential for its declared type, issuer, target audience, authorized party or client,
subject, tenant, validity window, algorithm policy, and purpose. Signature validity alone does not
prove that the credential belongs to this protocol or target.

## Credential ownership and revocation

- Do not let source and target independently hold reusable refresh authority.
- Rotate or transfer refresh ownership atomically where refresh is necessary.
- Detect reuse of retired refresh authority and apply the repository's family-revocation policy.
- Propagate logout, revocation, grant disablement, policy invalidation, and minimum valid epoch to
  source, target, gateways, routers, and effect dispatchers.
- Make cached authorization decisions versioned and short enough to respect revocation objectives.
- Put only bounded credential identity metadata in audit logs; redact raw credentials and
  authorization headers from logs, traces, errors, queues, URLs, dumps, and model-visible context.

If revocation delivery is delayed, final effect sinks still need an authoritative current-grant or
minimum-epoch check for actions whose risk cannot tolerate the delay.

## Router and partition behavior

Routing affinity is an optimization. The authority record remains the source of truth.

Routers and gateways should carry or cache:

- logical session identity;
- owner instance and epoch;
- authority-map revision;
- connection generation;
- target audience and protocol mode;
- bounded cache expiry and refresh trigger.

On stale-owner rejection, refresh the authoritative map rather than retrying blindly against the
same owner. Never let a client-selected backend address, sticky cookie, consistent-hash result, DNS
cache, or long-lived connection outrank the owner epoch.

Under partition, a side without authority quorum or a current fence cannot continue writes merely
to preserve availability. It must reject, redirect, buffer only under an explicitly safe durable
admission contract, or become read-only. "Both sides stay writable with no conflict" is not a
reachable guarantee for exclusive session ownership.

## Connection ownership

A transport connection and a logical session are different lifecycles.

- A stable edge or gateway may retain the client connection and switch the backend logical stream.
- If the edge changes or the transport dies, use reconnect plus application-level resume.
- Do not promise arbitrary backend socket migration unless the actual platform contract provides it
  and the full application state still has an explicit transfer protocol.
- Keep connection generation separate from owner epoch: multiple connections may overlap while one
  epoch alone owns writes.

Transfer logical state, not kernel or library buffers:

- subscriptions and per-channel cursors;
- flow-control credit and batch boundary;
- unacknowledged command and event identities;
- last accepted and applied directional sequences;
- negotiated application features;
- resume and replay deadline;
- connection-specific cancellation and close state.

## Bidirectional replay and resume

Define a bounded replay log per session or ordering domain. For each direction, record:

- sequence space and wrap policy;
- durable start and end;
- peer application ACK;
- replay start rule;
- gap and duplicate behavior;
- retention and storage pressure policy;
- full-resynchronization trigger;
- connection generation and owner epoch.

If the requested resume point predates retained history, return an explicit resume-too-old outcome.
Perform full snapshot or state synchronization and establish new sequence baselines. Do not quietly
skip missing history or replay from an arbitrary retained point.

Treat connection close, mobile backgrounding, gateway restart, route change, and owner handoff as
the same replay-safety surface. Dedupe and ACK state must survive all of them.

## Make-before-break and drain

Make-before-break may overlap old and new connections to reduce interruption, but it must not create
two write authorities.

Suggested protocol evidence:

1. new connection presents a one-time resume credential;
2. target validates epoch, handoff, cursor, grant, policy, and capability;
3. target catches up without executing new authoritative commands;
4. owner commit or already-committed epoch is confirmed;
5. source sends a switch barrier with last accepted client sequence and last server sequence;
6. client or gateway acknowledges the barrier on the new path;
7. new path becomes the only command-send path;
8. old path becomes redirect-only and closes after bounded drain.

A drain contract should expose, where safe:

- final client sequence accepted by the old owner;
- final server event sequence emitted by the old owner;
- target or reconnect route;
- new owner epoch;
- resume deadline;
- disposition of in-flight commands;
- reason and whether full synchronization is required.

## Message, compression, and media boundaries

Cut over on complete application units. Avoid ownership change in the middle of:

- fragmented logical message;
- compressed message that depends on a prior dictionary;
- transaction or batch whose atomicity is application-visible;
- RPC item with an uncommitted effect;
- file chunk without manifest completion;
- media frame or segment that depends on earlier codec state.

Reset or renegotiate compression context on a new transport unless the complete context is safely
specified and transferred. Do not copy opaque library compression state as ordinary session data.

For audio or video, preserve application-defined presentation and decode timeline, initialization
data, rendition identity, and a decodable keyframe or independent-segment boundary. Signal an
explicit discontinuity when seamless continuation cannot be proven. Byte offsets alone are not
decode boundaries.

## Early-data replay

Connection resumption optimizations may permit replayable early data. Keep these operations out of
that phase unless the full path has stable idempotency and anti-replay enforcement:

- handoff or resume credential consumption;
- owner activation or epoch commit;
- payment, order, message-send, or other irreversible command;
- refresh or credential rotation;
- approval consumption;
- mutation that cannot query or deduplicate its external effect.

Read-only operations still need tenant, authorization, and privacy review. A syntactically safe
request is not necessarily safe to replay if it reveals time-sensitive or one-time state.

## Failure matrix

| Fault | Required behavior |
| --- | --- |
| One store snapshot lags another. | Target rejects cursor vector or catches every store to the bound predicate. |
| Cursor inclusivity differs. | Boundary fixture detects exactly one duplicate or gap before release. |
| Tombstone expires during handoff. | Deleted state cannot reappear from stale cache or replica. |
| Absolute expiry passes during import. | Target does not revive the session with a fresh TTL. |
| Old and new schema overlap. | Unsupported direction rejects before activation. |
| Grant revoked after snapshot. | Fresh target evaluation denies activation or the affected action. |
| Resume credential replayed. | Atomic consumption allows one connection generation only. |
| Source refresh authority reused. | Rotation or family policy detects and contains reuse. |
| Router sends traffic to stale owner. | Fence rejects; router refreshes authority revision. |
| Source pauses through lease expiry. | Resumed source remains unable to produce accepted effects. |
| New connection catches up before commit. | Target remains shadow and effect-free. |
| Two connections overlap. | One epoch and switch barrier own command sending. |
| Replay position is older than retention. | Explicit resume-too-old causes full synchronization. |
| Transport write succeeds but peer crashes. | Unacknowledged durable output replays. |
| Application ACK is duplicated or reordered. | Monotonic per-direction ACK rule preserves replay range. |
| Compression context is missing. | Context resets or reconnect rejects incompatible resume. |
| Media cutover misses a decode boundary. | Discontinuity or new decodable segment is required. |
| Early data is replayed. | Irreversible operation is absent or deduplicated by stable authority. |

## Invariants

- One logical session has at most one accepted write epoch.
- Every owner instance identity names one runtime incarnation.
- Every snapshot or cursor vector identifies one coherent activation boundary.
- State mutation, input position, and output intent cannot acknowledge contradictory progress.
- Deleted or expired state does not revive during import, cache refill, or reconnect.
- Target authorization is no broader or staler than the currently valid delegated grant.
- Handoff and resume credentials are target-bound, short-lived, purpose-limited, and one-time.
- Source and target do not simultaneously own reusable refresh authority.
- Client-to-server and server-to-client sequence and application ACK spaces are independent and monotonic.
- Output is removed from replay only after the protocol's application acknowledgment.
- A resume point outside retention causes explicit full synchronization.
- Overlapping connections never imply overlapping write authority.
- Cutover occurs at complete application and decode boundaries.
- Replayable early data cannot consume owner, approval, or irreversible-effect authority without a complete anti-replay contract.

## Skill handoffs

- Use `session-handoff-integrity-review` for the complete owner, state, authorization, and stream
  transition.
- Use `api-access-control-review` or `security-flow-review` for authorization enforcement and
  credential exposure paths.
- Use `idempotency-integrity-review` for command, ticket, refresh, and effect replay identities.
- Use `two-phase-transition-integrity-review` for the atomic owner decision and post-commit recovery.
- Use `dual-write-consistency` for cursor, state, and publication convergence across commit systems.
- Use `input-event-synchronization-review` when remote input, focus, capture, or continuous controls
  travel across the session boundary.
- Use `async-timing-boundary-review` for reconnect deadlines, timeouts, cancellation, and waits.
- Use `race-condition-review` for owner, router, connection, grant, ACK, and replay interleavings.
- Use `secret-exposure-response` if raw credentials enter prompts, logs, traces, queues, URLs, or
  artifacts.
