# Input Session State Checklist

Use this checklist for platform-specific input ingestion, reduction, recovery, and replay details.
The authoritative contract remains the repository's current source and platform integration.

## Contents

1. [Authority and envelope](#authority-and-envelope)
2. [Identity and order](#identity-and-order)
3. [Loss and lifecycle recovery](#loss-and-lifecycle-recovery)
4. [Keyboard state](#keyboard-state)
5. [Modifier and text composition](#modifier-and-text-composition)
6. [Immutable batches and consumers](#immutable-batches-and-consumers)
7. [Movement and coalescing](#movement-and-coalescing)
8. [Coordinates and mode changes](#coordinates-and-mode-changes)
9. [Drag and capture](#drag-and-capture)
10. [Wheel transactions](#wheel-transactions)
11. [Diagnostics and privacy](#diagnostics-and-privacy)
12. [Fault matrix](#fault-matrix)
13. [Invariants](#invariants)
14. [Skill handoffs](#skill-handoffs)

## Authority and envelope

Inventory each producer before changing handlers:

| Producer | Authority question |
| --- | --- |
| native keyboard or pointer | does it own physical state or only compatibility delivery? |
| framework event | is it synthesized from the native event already consumed elsewhere? |
| polled gamepad or device | which poll boundary creates one observation generation? |
| remote input | which sender epoch and sequence establish source order? |
| replay | can it be isolated from live input and preserve recorded identity? |
| accessibility or automation | is synthesis marked without being silently discarded? |

Freeze enough evidence at the earliest controlled ingress:

- source and device identity;
- control or pointer identity;
- source epoch and sequence;
- stable event ID;
- physical code and logical key or text meaning;
- press, repeat, release, cancel, or movement kind;
- modifier and button snapshots;
- absolute position, relative delta, coordinate space, and transform generation;
- native and ingress timestamps with named clock domains;
- composition, synthesis, coalescing, warp, replay, and recovery provenance;
- capture owner and generation when relevant.

Do not defer coordinate conversion, physical-key identification, or provenance capture until mutable
platform state has changed.

## Identity and order

Use `(source, epoch, sequence)` as an event identity when the source guarantees one sequence.
Otherwise assign identity at the earliest single ingress for that source and preserve the fact that
it is ingress order, not unknowable hardware chronology.

Independent sources usually form a partial order. Do not timestamp-sort keyboard, pointer, network,
and simulation streams into invented global causality.

For each source define:

- duplicate window and retention;
- bounded reorder window;
- behavior for an event older than the accepted window;
- behavior for a sequence gap;
- epoch creation and retirement;
- snapshot or reset recovery;
- late old-epoch rejection.

Payload equality is not duplicate identity. A user can intentionally produce identical input twice.

## Loss and lifecycle recovery

Treat these as state-changing control events:

- focus or visibility loss;
- app deactivation, suspend, shutdown, or remote-session loss;
- queue overrun or source reset;
- device disconnect or generation change;
- pointer cancel, capture loss, or pointer-lock loss;
- input mode change that invalidates baselines.

A control session ends with release or cancel. Release means the source observed a normal physical
end. Cancel means authority was lost and the application can no longer prove the physical state.

On a detected gap:

1. stop applying later deltas from that source;
2. mark the source state untrusted;
3. obtain a current snapshot when the platform provides an authoritative one;
4. otherwise emit ordered cancellation for active controls;
5. start a new epoch;
6. reject late events from the retired epoch.

Never keep the previous held state while merely logging the gap.

## Keyboard state

Represent continuous state and transitions separately:

| Current state | Event | Result |
| --- | --- | --- |
| up | press | down plus Press |
| down | repeated down | down plus Repeat or Duplicate diagnostic |
| down | release | up plus Release |
| up | release | up plus orphan-release diagnostic |
| down | lifecycle loss | canceled plus Cancel |
| canceled | old-epoch event | unchanged and rejected |
| suppressed held | release | up without synthetic command |
| suppressed held | new press before release | platform-specific reject or reset |

Use physical identity for state pairing. Logical meaning can change between press and release because
layout and modifiers change.

Define command repeat policy explicitly:

- hold state reads current down state;
- repeatable command accepts Repeat;
- one-shot command accepts only initial Press;
- text editing follows the platform text and composition contract.

## Modifier and text composition

Track left and right physical modifiers independently. Derive aggregate modifier state from the set
of holders; never let one release clear another held modifier.

Keep separate models for:

- momentary modifiers held physically;
- toggles whose logical state survives release;
- accessibility latches that survive release until consumed;
- event-local modifier snapshots;
- current reducer-derived physical modifier state.

Use the event-local snapshot for a shortcut tied to that event, while retaining provenance when the
snapshot was reconstructed rather than supplied.

Handle AltGraph before interpreting a Control-plus-Alt shortcut when the platform exposes AltGraph
or an equivalent physical path.

During composition, keep physical key state tracking alive but route committed text through the
composition or input channel. Do not execute ordinary character shortcuts on intermediate
composition data unless an explicit allowlist owns that behavior.

## Immutable batches and consumers

At a frame or simulation boundary:

1. cut the ingress journal at one sequence boundary;
2. reduce only that immutable slice;
3. publish one immutable current-state snapshot and transition batch;
4. let every consumer read the same batch through its own cursor or projection;
5. retain or acknowledge journal entries according to the replay contract.

Do not expose a destructive `wasPressed()` read that clears shared state. Do not let a mid-tick
arrival change input already observed by earlier systems.

Define slow-consumer behavior. A cursor that falls behind retention needs a resnapshot or explicit
loss signal, not silent skipping.

## Movement and coalescing

Choose one compaction rule per semantic consumer:

| Input use | Safe reduction candidate |
| --- | --- |
| relative camera | sum deltas within the tick |
| drawing or handwriting | preserve ordered samples and pressure data |
| hover | retain latest absolute position plus boundary transitions |
| wheel scrolling | accumulate precision in the declared unit |
| press, release, cancel | never coalesce or drop |
| focus, capture, device, epoch | never coalesce or drop |

When a platform exposes one representative event and its underlying coalesced samples, process one
representation for one path. Processing both duplicates movement.

Do not overwrite a frame's accumulated relative delta with the last sample.

## Coordinates and mode changes

Name screen, window, client, viewport, canvas, logical, device-pixel, and world spaces. Record which
space an envelope uses and the transform generation that produced it.

Compare drag anchors and current points in one coordinate space and transform generation or migrate
both deliberately.

On absolute-to-relative, relative-to-absolute, pointer-lock, DPI, viewport, zoom, or window changes:

- retire invalid baselines;
- start a new movement generation when needed;
- mark synthetic cursor warps;
- suppress warp-generated compatibility movement;
- do not reinterpret old coordinates with the new transform.

## Drag and capture

Use an explicit gesture state machine:

`Idle -> Armed -> Dragging -> Released | Clicked | Canceled`

Measure the drag threshold from the original press anchor. Once click or drag is committed, do not
oscillate between them because of later noise.

Treat capture as routing ownership with `pointer + generation + owner`. Observe actual acquisition
and loss. An old component or gesture generation cannot release a newer owner's capture.

Distinguish the changed button from the current button bitmask. Use the snapshot to detect a missed
release, but do not manufacture Press when the current gesture never admitted one.

Route capture loss, target removal, pointer cancel, focus loss, and competing capture through the
same idempotent cancel transition.

## Wheel transactions

Preserve horizontal and vertical deltas, fractional precision, and the declared unit. Normalize only
at the consumer boundary with an explicit scale.

Bind a burst to one owner for the platform transaction or a bounded idle interval. Re-evaluating the
hover target after every layout change can split one physical gesture across consumers.

Wheel ownership is separate from pointer capture unless the platform contract explicitly unifies
them.

## Diagnostics and privacy

Keep a bounded circular journal containing:

- source, device, epoch, sequence, event kind, and physical control;
- dedupe, reorder, gap, cancellation, and rejection decisions;
- capture owner and generation changes;
- reducer state transitions and invariant failures;
- batch boundary and consumer cursor lag.

Avoid recording text, composed content, credentials, or sensitive application fields. Prefer
physical identifiers, hashes where justified, counters, and lifecycle metadata.

A success log emitted before reduction or batch publication is not proof that a consumer observed
the input.

## Fault matrix

Cover the relevant rows:

| Fault | Required observation |
| --- | --- |
| duplicate press | held count does not grow twice |
| missing release | lifecycle cancel clears the session |
| sequence gap | later deltas stop until snapshot or new epoch |
| late old-epoch release | current state is unchanged |
| left and right modifier overlap | releasing one preserves the other |
| two devices hold one control | removing one preserves remaining holder |
| repeat storm | one-shot command executes once |
| composition plus shortcut keys | text and command paths do not double-apply |
| raw plus synthesized movement | one physical movement applies once |
| representative plus coalesced samples | one representation is consumed |
| focus loss during drag | one Cancel ends capture and gesture |
| stale capture owner release | newer capture remains owned |
| transform change during drag | historical points are not reinterpreted |
| mid-tick arrival | all consumers retain one batch view |
| slow consumer beyond retention | explicit loss or resnapshot occurs |

Prefer deterministic fixtures and explicit ingress gates over arbitrary sleeps. Preserve the failing
envelope stream, epochs, batch boundaries, and invariant result for replay.

## Invariants

At minimum, choose applicable invariants:

- every active control terminates by release or cancel;
- one device cannot hold the same physical control more than once;
- aggregate held state equals the non-empty holder set;
- a retired epoch cannot mutate current state;
- applied source sequence is monotonic within one epoch;
- a sequence gap cannot be hidden by later delta application;
- every frame or tick consumer sees one immutable batch;
- one physical movement source is applied once;
- capture has at most one current owner per pointer;
- every drag reaches released, clicked, or canceled;
- composition does not duplicate committed text or invoke unintended shortcuts;
- diagnostic retention is bounded and excludes sensitive text.

## Skill handoffs

- Use `race-condition-review` for schedule control, happens-before, atomics, locks, and data races
  inside ingress or reducers.
- Use `frontend-state-ownership-review` when normalized input is correct but UI state has multiple
  competing owners.
- Use `state-machine-pattern` when a domain gesture or command lifecycle needs a reusable state
  transition implementation.
- Use `frontend-accessibility-tree-review` for keyboard parity, focus behavior, semantic
  activation, and non-pointer alternatives.
- Use `frame-render-performance-review` when input delay comes from long tasks, rendering, layout,
  or main-thread scheduling rather than input-state correctness.
- Use `input-boundary-validation-review` for hostile remote-input payload validation before
  admitted envelopes reach this protocol.

