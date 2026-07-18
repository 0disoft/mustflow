# Session Handoff Protocol Checklist

Use this checklist when a live session changes runtime owner while commands, state changes, tool
effects, output, or approvals may still be in flight. Record concrete fields, transition guards,
and evidence. Do not treat a copied snapshot or a healthy target process as proof of safe takeover.

## Contents

1. [Protocol invariants](#protocol-invariants)
2. [Identity and authority](#identity-and-authority)
3. [Durable state machine](#durable-state-machine)
4. [Transfer-class inventory](#transfer-class-inventory)
5. [Snapshot, delta, and manifest](#snapshot-delta-and-manifest)
6. [Live commands and quiescence](#live-commands-and-quiescence)
7. [Target acceptance](#target-acceptance)
8. [Commit and fencing](#commit-and-fencing)
9. [Timeout, retry, and recovery](#timeout-retry-and-recovery)
10. [Cache, lock, and drain behavior](#cache-lock-and-drain-behavior)
11. [AI-agent context envelope](#ai-agent-context-envelope)
12. [Tools, artifacts, output, and approvals](#tools-artifacts-output-and-approvals)
13. [Observability and audit](#observability-and-audit)
14. [Fault matrix](#fault-matrix)
15. [History properties](#history-properties)
16. [Operational evidence](#operational-evidence)
17. [Skill handoffs](#skill-handoffs)

## Protocol invariants

Write each invariant in the same vocabulary used by code, state-transition events, tests, and
operational alerts.

| Invariant | Required evidence |
| --- | --- |
| At most one owner epoch can produce accepted effects. | Owner audit plus sink-level stale-epoch rejection. |
| Owner epoch and state version never decrease. | Conditional authority writes and full transition history. |
| Target executes no authoritative command before owner commit. | Target-mode checks and pre-commit negative fixtures. |
| A successful command is not lost during transfer. | Command ledger, effect receipt, response record, and takeover history. |
| One command identity produces at most one accepted effect. | Effect dedupe key and final sink evidence. |
| Every handoff terminates or becomes explicitly quarantined. | Reconciler ownership and nonterminal-age evidence. |
| Pending approval does not become approval during transfer. | Approval ledger and target resume gate. |
| Sensitive runtime authority is not copied into model context. | Envelope schema, redaction, and scoped credential evidence. |

Reject claims such as "exactly once", "zero loss", or "no downtime" unless the named evidence
covers every permitted retry, response-loss, crash, stale-owner, and recovery branch.

## Identity and authority

Record separate identities for:

- user or service session;
- logical handoff;
- handoff execution attempt;
- protocol phase;
- owner epoch or generation;
- state version or source revision;
- command and input message;
- external effect and effect receipt;
- output stream and committed output sequence;
- tool call and external resource;
- artifact and immutable content version;
- approval request and policy version;
- trace and causal link.

For the authority record, capture:

| Field | Question |
| --- | --- |
| `session_id` | Which continuity boundary is moving? |
| `owner` | Which runtime may currently execute? |
| `epoch` | Which generation must every final sink accept? |
| `state_version` | Which source state is authoritative? |
| `handoff_id` | Which logical transfer owns the transition slot? |
| `protocol_state` | Which legal action can occur next? |
| `accepted_target` | Which target proved readiness for this exact state? |
| `protocol_version` | Which recovery rules interpret the record? |

The authority record must be read and changed through one linearizable or transactionally
conditional boundary. Process memory, routing caches, lease ownership, health checks, and target
acknowledgments are evidence inputs, not independent owner authorities.

## Durable state machine

Use repository-native names, but cover these semantic stages:

1. source owner and transition slot confirmed;
2. preparation record persisted;
3. live-input cutoff or durable admission policy active;
4. snapshot and manifest sealed;
5. target import and delta catch-up complete;
6. target validation and explicit acceptance persisted;
7. owner and epoch committed atomically;
8. target activation observed;
9. source redirected or drained without execution authority;
10. cleanup completed after the observation window;
11. terminal success, pre-commit abort, or quarantine recorded.

For every transition, record:

- permitted source states;
- actor and fencing identity;
- conditional predicate;
- durable writes;
- external effects;
- idempotency key;
- retry classification;
- response-loss interpretation;
- next recovery owner;
- terminal or bounded retry path.

Do not use one Boolean such as `moving`, `ready`, or `active` to represent authority, transfer
progress, target acceptance, and observer knowledge.

## Transfer-class inventory

Classify each item before choosing transfer behavior.

| Class | Transfer rule | Failure to avoid |
| --- | --- | --- |
| Durable session fact | Copy or reference with source version. | Stale snapshot becoming truth. |
| Immutable artifact | Transfer by immutable ID, schema, and hash. | Path reuse or partial overwrite. |
| Derived cache | Rebuild or select through state-version namespace. | Old cache repopulating current state. |
| Lease or lock | Reacquire under new epoch. | Serialized fake ownership. |
| Queued command | Preserve stable command ID and admission state. | Loss or duplicate execution. |
| In-flight effect | Query or resume through effect receipt. | Blind replay after unknown outcome. |
| Runtime object | Reconstruct locally from configuration or reference. | Connection or client serialization. |
| Secret or credential | Issue scoped short-lived authority from a reference. | Secret copied into prompt or log. |
| Model-visible context | Transfer through typed, source-linked envelope. | Summary drift becoming authority. |
| Approval or guardrail | Preserve explicit pending or terminal state. | Wait state interpreted as approval. |

If an item fits more than one class, split its durable identity from its runtime handle rather than
choosing one transfer rule for the combined object.

## Snapshot, delta, and manifest

For every snapshot, record:

- source owner and epoch;
- snapshot revision or state version;
- inclusive or exclusive delta boundary;
- manifest identity and schema version;
- immutable chunk identities, sizes, and hashes;
- encryption and tenant boundary where applicable;
- creation completion marker;
- target import position;
- final caught-up version;
- source and target canonical state hashes;
- unsupported-schema rejection behavior.

Prove that the target cannot:

- accept a partial manifest;
- silently drop unknown required fields;
- mix chunks from different session or state versions;
- mark import complete before hash verification;
- skip deltas created during snapshot construction;
- validate against a stale replica and then commit a newer owner epoch.

Large state should use immutable chunks and a versioned manifest. Make the authority pointer or
accepted manifest identity the small atomic decision; do not rewrite a mutable monolithic blob in
place and infer completeness from object existence.

## Live commands and quiescence

Choose one explicit admission rule for commands arriving during transfer:

- source remains the only writer and durably records commands until cutoff;
- a durable inbox admits commands while execution pauses;
- routing rejects or redirects new commands with a retryable contract;
- another repository-specific single-writer rule with equivalent evidence.

For each command, preserve states equivalent to received, started, effect committed, and response
committed. Include queue offset or event position, owner epoch, input hash, effect identity, and
terminal receipt.

Define:

- cutoff sequence and which side owns each side of the boundary;
- treatment of commands already executing at cutoff;
- treatment of admitted but not started commands;
- treatment of effects committed without a recorded response;
- response replay or status lookup contract;
- ordering scope across commands;
- dedupe retention horizon;
- bounded buffer and backpressure policy;
- what happens when the source cannot finish drain before the deadline.

Dual writing on source and target is not continuity proof. It creates a later conflict-resolution
problem and allows both sides to perform irreversible effects before the conflict is visible.

## Target acceptance

Target acceptance must bind to the exact handoff and imported state. Check:

- target runtime and protocol version;
- imported snapshot and final delta position;
- canonical state hash;
- schema and migration compatibility;
- tenant, user, and authorization scope;
- tool and external dependency availability;
- artifact presence and hashes;
- memory, queue, storage, and concurrency capacity;
- required leases available for reacquisition;
- policy and guardrail version;
- pending approval and cancellation state;
- output-stream boundary;
- remaining absolute deadline and recovery reserve.

The target stays non-authoritative until acceptance is durable and the owner commit succeeds.
Health, process readiness, warm cache, successful import, or a network acknowledgment alone is not
acceptance.

## Commit and fencing

The owner commit predicate should bind at least:

- expected current owner;
- expected source epoch;
- expected source state version or cutoff;
- logical handoff identity;
- accepted target identity;
- accepted manifest or state hash;
- target protocol version;
- transition slot or decision sequence.

The commit must atomically select the new owner and monotonic epoch. If it also needs to notify
routers, consumers, or observers, persist an outbox record in the same authority transaction and
publish later.

Build a fence map for every effect sink:

| Sink | Fence field | Rejection evidence |
| --- | --- | --- |
| Session database writes | Session epoch or conditional owner version. | Stale update rejected. |
| Queue publication or acknowledgment | Producer or consumer generation. | Lower generation ignored. |
| File or artifact mutation | Manifest generation or conditional pointer. | Old pointer update rejected. |
| Tool execution | Session epoch plus stable tool-call identity. | Stale or duplicate call blocked. |
| External provider effect | Idempotency key and stored effect receipt. | Query or dedupe proves outcome. |

If a final sink cannot enforce the epoch, document the durable backstop that prevents stale effects.
Lease expiry, cancellation, disconnect, and source notification are not fences against a paused
process that later resumes.

## Timeout, retry, and recovery

Separate:

- caller wait timeout;
- total absolute handoff deadline;
- phase budget;
- lease or transition-slot expiry;
- status-query reserve;
- recovery reserve;
- reconciler escalation age;
- operator quarantine age.

Classify each phase result:

| Class | Required action |
| --- | --- |
| Safe to retry | Retry the same logical operation under the same stable identity. |
| Query required | Read authority, state, and effect receipts before acting. |
| Compensation required | Record a new inverse effect with its own identity and recovery. |
| Terminal | Persist terminal evidence and stop retrying. |

Assign retry ownership to one layer. Lower layers may absorb only explicitly bounded transport setup
failures that cannot duplicate the logical operation. Use jitter, retry budgets, and admission
backpressure; a retry count alone does not prevent a recovery storm.

Before owner commit, abort may release reversible preparation while the source remains authoritative.
After owner commit, recover forward under the target epoch. Never call restoration of the old owner
"rollback" after the target may have accepted commands or effects.

The reconciler must use its own lease or fence, examine authority and receipts, and choose one of:
resume, pre-commit abort, forward recovery, compensation, or quarantine. Missing evidence is a
reason to quarantine, not permission to guess.

## Cache, lock, and drain behavior

- Namespace or select caches by authoritative state version.
- Treat invalidation notifications as hints; do not make their delivery the correctness boundary.
- Reacquire locks in a deterministic order under the new epoch.
- Release partially acquired target locks in reverse order before acceptance fails.
- Use the coordination service's lease authority; do not let application wall clocks independently
  decide ownership.
- Keep the source as a bounded non-executing redirector when stale clients or routers are expected.
- Preserve the original command identity when forwarding is allowed.
- Reject or observe stale-epoch traffic after the redirect grace window.
- Delay destructive cleanup until stale-route, audit, recovery, and rollback observation windows
  no longer require the old immutable data.

## AI-agent context envelope

Keep runtime context and model-visible context separate.

A model-visible envelope should explicitly represent:

- goal and current task boundary;
- direct user constraints;
- inferred preferences with confidence;
- accepted decisions and rejected options;
- current plan, completed work, pending work, and blocker;
- conversation, user, agent, tool-result, and output cursors;
- evidence and original event references;
- artifact references and hashes;
- tool and effect ledger summary;
- open questions;
- approval and guardrail state;
- policy and schema versions;
- owner epoch and state version;
- deadline and cancellation state;
- fields intentionally omitted for privacy or capability reasons.

Original user, tool, approval, and state-transition events remain authoritative. Summaries are
derived indexes and must point back to source events for material decisions. Use a short execution
brief plus pinned facts and searchable references instead of either dumping all history or keeping
an arbitrary recent-message window.

Negotiate target support before acceptance:

- model and tool capabilities;
- schema and media types;
- file and artifact access;
- permission and tenant scope;
- context and output limits;
- policy and safety features;
- ability to query ambiguous effects;
- ability to preserve pending approvals without executing them.

## Tools, artifacts, output, and approvals

For every tool call, record:

- call identity and stable idempotency key;
- requested and started positions;
- parameters hash or bounded canonical request identity;
- status including unknown outcome;
- external resource or effect identity;
- effect hash or receipt;
- retry and query policy;
- approval identity and policy version when gated;
- owner epoch that initiated the call.

Do not infer tool failure from a missing response. Query by external resource identity or
idempotency key before replaying an irreversible action.

For every artifact, preserve immutable identity, content hash, media type, schema version, producing
event or tool call, authorization boundary, and storage reference. A mutable path or prose claim
that a file exists is not an artifact contract.

For streamed output, persist the last committed sequence and owning response identity. On handoff,
finish, terminate, or restart at an explicit protocol boundary. Do not concatenate output from two
owners into one stream unless the consumer protocol can validate owner and sequence changes.

For approvals and guardrails, preserve requested action, request identity, approver scope, current
state, expiry, policy version, and evidence. Target resumption must re-check current authority and
must not translate missing, pending, expired, or mismatched approval into permission.

Secrets move by reference and scoped reissuance. Keep credentials, cookies, raw tokens, private
prompts, and sensitive baggage out of handoff envelopes, logs, traces, and model-visible context.

## Observability and audit

Emit one structured event schema for protocol transitions, tests, and operations. Include bounded
fields such as:

- session, handoff, attempt, phase, command, and epoch identities;
- previous and next protocol states;
- owner and epoch before and after;
- source and target state versions and hashes;
- target acceptance identity;
- decision and retry classification;
- remaining deadline and recovery reserve;
- effect and receipt class without sensitive payloads;
- error class and terminal or recovery owner.

Keep owner and epoch changes in an append-only audit that survives source and target process loss.
The audit must reconstruct which conditional decision changed ownership and which handoff, accepted
state, actor, and protocol version justified it.

Trace the logical handoff end to end. Represent state-machine phases as spans where useful, and use
causal links for queued work, retries, fan-out, or independent recovery attempts. Do not force false
parent-child timing or place prompts, credentials, personal data, or large artifacts in propagated
context.

Prioritize invariant metrics over averages:

- simultaneous valid writer count;
- stale-epoch effects rejected;
- target execution before commit;
- committed handoff without target activation;
- duplicate effect detected;
- nonterminal handoff age;
- state or artifact hash mismatch;
- command success without durable terminal record;
- pending approval resumed without current authorization;
- manual recovery and quarantine rates.

## Fault matrix

Add deterministic failpoints on both sides of every durable boundary:

| Boundary | Faults to inject | Required observation |
| --- | --- | --- |
| Transition creation | Crash before and after persistence. | Zero or one recoverable handoff record. |
| Snapshot sealing | Partial write, stale read, hash mismatch. | No target acceptance from incomplete state. |
| Delta catch-up | Gap, duplicate, reorder, truncation. | Explicit repair or rejection. |
| Command cutoff | Arrival before, at, and after cutoff. | Every command has one owner and durable disposition. |
| Target acceptance | Crash before and after acceptance write. | Source remains owner until commit. |
| Owner commit | Request loss, response loss, crash around CAS. | Status query reveals one durable decision. |
| Commit publication | Outbox delay, duplicate delivery, reorder. | Authority remains correct and consumers converge. |
| Target activation | Accepted target pause or crash. | Forward recovery under committed epoch. |
| Source drain | Stale route, resumed paused source. | Redirect or stale-epoch rejection, never execution. |
| Tool effect | Provider succeeds, response or receipt write lost. | Query-required path prevents blind replay. |
| Approval resume | Expiry, policy change, duplicate event. | No execution without current matching approval. |
| Reconciler | Concurrent reconcilers and stale lease. | One fenced recovery decision. |

Combine faults rather than testing only one at a time:

- asymmetric partition where request arrives but response does not;
- process pause, lease expiry, target commit, then source resume;
- stale routing plus stale cache plus duplicate command delivery;
- target schema mismatch during source deadline pressure;
- owner commit plus delayed publication plus replica stale read;
- output interruption plus tool unknown outcome plus retry;
- policy change while approval and session are transferring;
- clock anomaly plus retry budget exhaustion and reconciler takeover.

Preserve the random seed and the actual fault decision sequence. Replaying only the seed is
insufficient when scheduler, environment, or generated decision counts can differ.

## History properties

Collect invocation, response, owner, epoch, state version, command, effect, receipt, and approval
events for the complete run. Check at least:

- no overlapping accepted writer intervals;
- no accepted effect from an epoch lower than the committed owner epoch;
- no target authoritative execution before owner commit;
- no successful command disappears from durable history;
- no command identity has more than one accepted external effect;
- snapshot plus applied deltas forms one continuous source-version range;
- every accepted target matches the committed state hash and protocol version;
- every nonterminal handoff is owned by a live bounded recovery path or quarantined;
- every pending or expired approval remains non-executable;
- every emitted output segment belongs to one response identity, owner epoch, and monotonic sequence;
- every cache read used for an authoritative decision matches the current state version;
- every old owner becomes redirect-only or fenced before target effects are accepted.

Final owner equality alone cannot reveal a temporary split brain, duplicate charge, lost response,
or approval bypass. Inspect the complete history and the final state.

## Operational evidence

Track bounded operating objectives for:

- handoff completion and nonterminal age;
- target acceptance failure;
- owner commit ambiguity;
- forward recovery and quarantine;
- stale-route and stale-epoch rejection;
- command replay and duplicate-effect prevention;
- state and artifact mismatch;
- approval-resume rejection;
- manual intervention;
- retry and recovery budget use.

Exercise low-risk handoffs regularly enough to detect drift in routing, schemas, permissions,
artifact access, tools, coordination, and recovery. Keep target validation non-authoritative and
abort before commit when shadow evidence disagrees.

## Skill handoffs

- Use `two-phase-transition-integrity-review` for the generic prepare, durable decision, epoch,
  fencing, and forward-recovery proof around the owner cutover.
- Use `idempotency-integrity-review` for command, tool, and effect identity retention and replay.
- Use `dual-write-consistency` for authority-record and event-publication convergence.
- Use `execution-ledger-integrity-review` for append-only command, effect, approval, and recovery
  truth.
- Use `race-condition-review` for concrete source-target-reconciler interleavings.
- Use `async-timing-boundary-review` for deadline, cancellation, wait, and lost-response behavior.
- Use `security-flow-review` for credential scope, authorization, artifact access, and sensitive
  context propagation.
- Use `cross-agent-session-reference` only when reading prior Codex or Hermes session artifacts.
- Use `restricted-handoff-resume` only when producing a bounded task restart report.
- Use `design-implementation-handoff` only for design-to-implementation workflow ownership.
