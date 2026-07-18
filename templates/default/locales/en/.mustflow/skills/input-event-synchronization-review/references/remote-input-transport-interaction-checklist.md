# Remote Input Transport and Interaction Checklist

Use this checklist when normalized input crosses a process, host, network, injected-device, or
rendered-frame boundary. Keep transport facts version-scoped and derive application behavior from
the repository's semantic input contract rather than a protocol feature name.

## Contents

1. [Envelope and semantic delivery](#envelope-and-semantic-delivery)
2. [Deadlines, replacement, and recovery](#deadlines-replacement-and-recovery)
3. [Acknowledgment layers](#acknowledgment-layers)
4. [Latency, prediction, and queue debt](#latency-prediction-and-queue-debt)
5. [Origin lineage and loop prevention](#origin-lineage-and-loop-prevention)
6. [Ownership and arbitration](#ownership-and-arbitration)
7. [Reconnect and neutralization](#reconnect-and-neutralization)
8. [Interaction context](#interaction-context)
9. [Focus protocol](#focus-protocol)
10. [Composition and selection](#composition-and-selection)
11. [Clipboard protocol](#clipboard-protocol)
12. [Surface and coordinate generations](#surface-and-coordinate-generations)
13. [Causal diagnostics](#causal-diagnostics)
14. [Replay and fault injection](#replay-and-fault-injection)
15. [Invariants and repair](#invariants-and-repair)
16. [Skill handoffs](#skill-handoffs)

## Envelope and semantic delivery

Preserve at least the identities and authority tokens needed by the operation:

- protocol schema version;
- session, surface, path and focus epochs;
- source, device, pointer and press identity;
- event, root event, parent event and apply-context identity;
- source sequence and covered sequence range;
- capture monotonic time and component observation time;
- deadline and supersession key;
- state, transform, text, composition and clipboard versions;
- origin node, origin kind, hop path and propagation policy;
- semantic reliability class;
- frame identity when presentation evidence exists.

Classify by meaning, not by a transport's reliable or unreliable label:

| Semantic class | Preservation rule |
| --- | --- |
| absolute pointer or analog state | latest valid value supersedes older values |
| relative motion or wheel | preserve the covered-range sum |
| pen or touch path | preserve ordered shape, pressure and important turns |
| press or release boundary | idempotent admission and explicit application acknowledgment |
| focus, composition, clipboard or surface | ordered versioned interaction transaction |
| state snapshot | supersedes deltas only at a declared sequence boundary |

Do not place every class behind one ordered backlog. A stale high-rate movement stream must not
block a release or interaction-closing transaction.

## Deadlines, replacement, and recovery

Give every continuous input an explicit usefulness deadline and supersession relation. An expired
absolute position can be dropped when a newer position exists. An expired release cannot simply
vanish; reconcile it against current state and promote repair when necessary.

For delta ranges, carry the first and last source sequence plus the sum. Do not acknowledge a
covered range and later apply one of its original samples again.

Prefer current-state repair over replaying obsolete history:

- periodically or on anomaly, send a compact held-control and interaction digest;
- include pressed owners, modifiers, buttons, active pointers, relative accumulators, focus,
  capture, composition, clipboard and surface versions as applicable;
- on a gap, compare the digest at a named sequence boundary;
- repair or open a new epoch instead of waiting for old continuous input.

Reset estimators and prediction generations when the path changes. Reject late input from a retired
path epoch even if the connection object remains alive.

## Acknowledgment layers

Name the layer represented by every acknowledgment:

| Acknowledgment | Meaning |
| --- | --- |
| receive | envelope admitted through framing and validation |
| apply | reducer accepted or idempotently replayed the semantic operation |
| present | a named displayed frame first contains the result |
| repair | an invariant repair closed the discrepancy |

Transport delivery evidence is not application acceptance. Stop redundant boundary-event carriage
only after the intended application layer confirms the stable event identity.

Link an apply acknowledgment to state version or state digest. Link present acknowledgment to a
render, encode, decode and presentation frame chain when the product claims visible latency.

## Latency, prediction, and queue debt

Use local prediction only for reversible presentation such as cursor position, drag outline, ink
preview, hover or press animation. Never feed predicted samples back into the authoritative input
journal or use them to commit irreversible commands.

Invalidate a prediction when the next authoritative sample or generation arrives. Reconcile the
presentation layer without creating another input event.

Limit queues by time debt: oldest still-useful event age, deadline miss, reorder depth and render
queue depth. Under pressure:

- discard superseded absolute samples first;
- fold relative ranges without losing their sum;
- simplify paths while preserving semantic turns;
- retain boundary and interaction transactions;
- isolate clipboard bodies, diagnostics and bulk data from latency-sensitive input flow.

Measure capture-to-present tail latency by named stages. Average network delay alone cannot prove
input responsiveness.

## Origin lineage and loop prevention

Preserve origin and causal lineage across normalization, serialization, injection, application,
derived command and rendered feedback. Transforming an event does not create a new root user action.

Separate local capture from remote application:

- capture path produces outbound user intent;
- inbound path validates and reduces a remote command;
- effect execution does not automatically produce a new outbound user intent;
- derived semantic or compatibility events inherit root identity and a non-propagating policy unless
  an explicit rule permits another hop.

Prefer a dedicated injected device or exact platform marker and session token. Do not suppress
similar local input for a guessed time interval.

Replace a global `isApplyingRemote` boolean with an apply-context token propagated through async
continuations and task queues.

Stop propagation when the current node already appears in the path, the policy forbids forwarding,
or a bounded hop limit is exceeded. Record the rejection reason.

## Ownership and arbitration

Track held state by source owner and press identity. Aggregate physical state is the union of current
owners, not one shared boolean and not an opaque reference count.

Choose conflict policy per resource:

| Resource | Typical authority shape |
| --- | --- |
| independent modifier holders | owner-set union |
| text composition | one exclusive authority and generation |
| drag or pointer capture | one owner lease with fencing generation |
| absolute cursor | explicit local-first or current-controller policy |
| clipboard | version, origin and content-policy arbitration |
| surface control | one admitted controller for one surface epoch |

Local takeover increments the generation, cancels displaced ownership and rejects subsequent stale
owner input. Expiry alone is insufficient when an old owner can resume; the reducer must check the
generation.

## Reconnect and neutralization

Before admitting a new session or surface epoch:

1. pause new state-changing input;
2. cancel or reconcile old held controls, pointer capture, drag and composition;
3. retire old session, path, focus and surface generations;
4. exchange current state and interaction-context digests;
5. confirm neutral or explicitly transferred ownership;
6. confirm coordinate and target generations;
7. admit new-epoch input.

Reject late old-epoch releases, movement and composition updates. A new connection does not erase
the old connection's semantic tail.

## Interaction context

Keep one versioned snapshot containing applicable fields:

- operating-system activation;
- document visibility;
- active remote surface;
- focused logical target and focus generation;
- selection and text revision;
- composition ID, revision, range and status;
- clipboard version, origin and content metadata;
- viewport and transform generation;
- held-state and capture digest.

A command carries the context versions it assumes. Reject or reconcile it when those assumptions no
longer hold.

Do not collapse activation, visibility, surface selection and editing focus into one boolean.

## Focus protocol

Model focus as request, apply and confirmation:

1. sender requests a stable logical target and expected focus or surface generation;
2. authority validates target existence, ownership and policy;
3. authority applies actual focus or chooses an explicit safe fallback;
4. authority returns the new generation and actual target;
5. dependent composition or shortcut work starts only from that confirmed generation.

Coordinates and transient object paths are not stable target identity. A destroyed target must not
receive a late focus confirmation.

## Composition and selection

Choose one composition authority per editing session:

- local-authority mode sends versioned composition or text-edit operations, not both those results
  and the physical keys that would reproduce them remotely;
- remote-authority mode sends admitted physical or language-switch intent and does not resend local
  composition output.

Version composition with ID, revision, base text revision, target range, data classification and
open, committed or canceled status. Commit and cancel close it exactly once. Reject updates for a
closed composition or stale base text revision.

Close or transfer composition through a barrier before focus or surface changes.

Define one protocol text-index unit and convert at adapters. Do not exchange an unqualified numeric
selection range across runtimes that count text differently.

## Clipboard protocol

Treat clipboard state as a versioned multi-representation object:

- origin and change identity;
- content hash or equivalent stable identity;
- available representation types and sizes;
- sensitivity and automatic-transfer policy;
- expiry and user-approval requirements.

First advertise metadata. Transfer only a requested representation over a bounded lower-priority
path. Keep large images, files and rich data away from the input latency queue.

Reject an echo when a locally observed change is the version just written from remote. Synthetic
events alone are not proof that the system clipboard or target document changed.

Do not log or automatically synchronize secret fields, locked-session content, or disallowed
applications.

## Surface and coordinate generations

Treat a surface switch as an input barrier:

1. pause state-changing input;
2. close or cancel drag, capture, held buttons and composition;
3. increment the surface epoch;
4. publish size, scale, rotation, safe area and transform generation;
5. confirm target focus and first applicable frame;
6. resume input for the new epoch.

Carry transform generation on every coordinate-bearing event. Reject, reproject deliberately, or
request a new sample when it does not match current authority.

Split absolute baselines and relative accumulators across surface epochs.

## Causal diagnostics

Record the lifecycle stages relevant to the architecture:

`captured -> normalized -> queued -> serialized -> sent -> received -> validated -> deduplicated -> applied -> rendered -> presented -> acknowledged`

Also record `dropped` and `repaired` as decisions with machine-readable reason codes.

Preserve event, root, parent, trace, source, epoch, sequence, frame, thread or executor, queue age,
context versions and state hashes. Record state hash before and after reducer application and the
rule version that made the decision.

Keep source occurrence time and component observation time separate. Build order from source
sequence, process order and send/receive parent relationships. Clock offset estimates are latency
evidence with uncertainty, not causality.

Use a bounded low-overhead ring for high-rate data. Summarize paths and delta ranges; never sample
away boundary, generation, capture or invariant events. Redact text and clipboard content by
default.

## Replay and fault injection

Replay normalized envelopes against the production reducer with:

- a virtual monotonic clock;
- recorded receive order and causal parent links;
- path, session, surface and interaction epochs;
- network and application pause script;
- deterministic random seed;
- expected decision and state hash.

Inject burst delay, jitter, consecutive loss, reordering, duplication, path change, acknowledgment
delay, process or main-thread pause, hidden or suspend, reconnect, surface switch, capture theft,
composition focus loss and clipboard transfer pressure.

Compare a healthy and failing run by root event and find the first state-hash divergence rather than
the final visible symptom.

A reproducible bundle should version its schema and include build, feature flags, platform, layout,
scale, network fault plan, bounded event ring, state snapshots and seed. Keep sensitive content
redacted unless explicitly authorized.

## Invariants and repair

Choose applicable executable invariants:

- one stable event changes reducer state at most once;
- no old session, path, surface, focus, lease or composition generation changes current authority;
- every admitted press owner terminates by release, cancel or repair;
- one exclusive drag, capture or composition owner exists;
- apply acknowledgments match the recorded state version or digest;
- a closed composition cannot advance;
- clipboard echo does not create a new root action;
- an inbound applied effect cannot silently become outbound user intent;
- input applied to a frame uses the admitted surface and transform generation;
- queue debt cannot hide boundary events behind obsolete continuous input.

A watchdog creates an explicit non-propagating repair event with cause, prior state hash, action and
result. Repair is not fabricated user input.

## Skill handoffs

- Use `input-boundary-validation-review` for authentication, size, schema and hostile remote
  envelope validation.
- Use `performance-measurement-integrity-review` for latency units, clock domains, tail metrics and
  benchmark comparability.
- Use `adapter-boundary` for platform injection, capture and transport adapter isolation.
- Use `race-condition-review` for shared-memory interleavings inside capture, transport or reducer
  code.
- Use `two-phase-transition-integrity-review` when controller or surface handoff has durable
  admission and commit phases.
- Use `provenance-license-gate` before copying external protocol text, schemas or example code.

