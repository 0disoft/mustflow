---
mustflow_doc: skill.input-event-synchronization-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: input-event-synchronization-review
description: Apply this skill when keyboard, mouse, pointer, touch, pen, wheel, gamepad, raw-input, remote desktop, cloud gaming, remote KVM, focus, capture, IME, clipboard, surface switching, frame or tick input, coalesced events, or input replay code is created, changed, reviewed, debugged, or reported and event loss, duplication, reordering, delay, feedback loops, cancellation, multi-owner state, or stale-session delivery can leave controls stuck or apply input inconsistently.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.input-event-synchronization-review
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

# Input Event Synchronization Review

<!-- mustflow-section: purpose -->
## Purpose

Review input as a lossy, session-scoped state-reconstruction protocol rather than a complete ledger
of hardware actions.

The review question is not "did every down receive an up?" It is "when delivery is coalesced,
duplicated, reordered, dropped, routed elsewhere, or terminated by lifecycle change, can one
authoritative reducer produce a bounded current state in which every active control ends by release
or cancel?"

<!-- mustflow-section: use-when -->
## Use When

- Code handles keyboard, mouse, pointer, touch, pen, wheel, gamepad, raw device, remote desktop,
  browser, desktop shell, game engine, canvas, drawing, drag, shortcut, text input, or replay events.
- Focus, visibility, suspend, resume, device connection, pointer capture, pointer lock, coordinate
  transforms, frame or simulation ticks, event queues, source sequence, event dedupe, coalescing,
  modifier state, key repeat, IME composition, or multi-device ownership changes.
- A bug reports stuck keys, stuck buttons, ghost drags, duplicate clicks, doubled movement, missing
  movement, wrong shortcuts, input after focus return, capture theft, wheel target changes, or
  nondeterministic input replay.
- Code or docs claim that timestamps preserve input order, down and up are paired, FIFO prevents
  loss, polling repairs every gap, cancellation equals release, or one boolean represents current
  modifier or button state.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task validates hostile bytes, text, paths, uploads, fields, or decoded payloads; use
  `input-boundary-validation-review`.
- The task is ordinary form, query, URL, cache, optimistic, persisted, or server-state ownership
  without device-event lifecycle; use `frontend-state-ownership-review`.
- The task is keyboard accessibility, focus order, semantic activation, drag alternatives, or ARIA
  behavior; use `frontend-accessibility-tree-review`.
- The main problem is a general shared-memory, lock, atomic, database, or distributed race rather
  than input-session reconstruction; use `race-condition-review` or
  `concurrency-invariant-review`.
- The task is only motion design, animation interruption, or visual gesture feedback; use
  `motion-system-contract-review`.
- The code consumes an already normalized immutable input snapshot and does not own ingress,
  lifecycle, reduction, cursor, capture, or replay semantics.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Source ledger: platform APIs, event producers, polling sources, synthesized or compatibility
  events, source clock domains, threading boundaries, and the one source authoritative for each
  control or movement mode.
- Envelope contract: source, device, control, pointer, session epoch, source sequence, event ID,
  physical identity, logical meaning, repeat, composition and synthesis flags, modifier snapshot,
  button bitmask, coordinates, deltas, transform generation, native time, and ingress time.
- Lifecycle ledger: focus, visibility, suspend, resume, device add or remove, source reset, queue
  overrun, capture gain or loss, pointer cancel or lock change, and session-generation changes.
- State model: per-device held controls, derived aggregate modifiers, `Up`, `Down`, `Canceled`,
  `Press`, `Repeat`, `Release`, `Cancel`, drag phases, wheel ownership, and suppressed
  recovery state.
- Delivery model: dedupe identity, source-order rule, reorder window, sequence-gap behavior,
  snapshot or reset recovery, immutable batch boundary, journal retention, and consumer cursors.
- Pointer and text evidence: absolute or relative mode, coordinate spaces, transform generation,
  coalesced-sample choice, capture owner, button semantics, wheel units, AltGraph, layout, IME, and
  composition paths.
- Test and observability evidence: invariants, fault cases, bounded input journal, redaction,
  deterministic fixtures, replay contract, and configured command intents.
- Remote interaction ledger: session, surface, path and focus epochs; root and parent event lineage;
  semantic reliability class; deadline and supersession; receive, apply and present acknowledgments;
  prediction authority; local and remote owners; injection provenance; focus, composition, selection,
  clipboard and transform versions; state digests; repair ownership; and capture-to-present stages.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked.
- Platform and source semantics are identified from current code or authoritative documentation, or
  unknown behavior is reported instead of guessed.
- Existing ingress, device identity, reducer, frame batch, capture, IME, replay, and diagnostics
  patterns have been searched before adding new shapes.
- External specification text is reference evidence only; repository-native contracts own the
  implementation.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten a single normalization ingress, immutable event envelopes, per-source epochs and
  sequence, stable event IDs, bounded reorder and dedupe windows, gap recovery, cancel events,
  per-device control sets, pure reducers, immutable tick batches, consumer cursors, capture tokens,
  coordinate generations, diagnostics, and focused input fixtures.
- Separate physical control identity from logical key or text meaning, held state from edge
  transitions, release from cancel, momentary modifiers from toggles and latches, and raw movement
  from framework-synthesized compatibility events.
- Add source-specific compaction rules that preserve non-droppable transitions.
- Add semantic transport classes, state snapshots, application acknowledgments, lineage-preserving
  loop guards, owner leases, reconnect neutralization barriers, versioned interaction contexts,
  bounded causal telemetry, virtual-clock replay, and repair events for remote-input paths.
- Do not invent a global event order across independent clock or source domains.
- Do not use timestamps, sleeps, focus polling, process-local booleans, or input queue names as
  correctness proof.

<!-- mustflow-section: procedure -->
## Procedure

1. Map every producer and choose one authoritative ingress for each input mode.
   - Event handlers normalize and enqueue; they do not directly mutate gameplay, command, drag, or
     business state.
   - When raw and synthesized paths describe the same action, name one state-producing source and
     keep the other diagnostic or compatibility-only.
2. Freeze an immutable envelope at ingress.
   - Preserve source, device, epoch, source sequence or earliest-ingress sequence, event identity,
     physical and logical control data, snapshots, coordinates, transform generation, and
     provenance flags.
   - Use timestamps for latency and diagnostics, not causal order across clock domains.
3. Treat events as deltas, not current-state proof.
   - Detect duplicate identity, old epoch, out-of-window order, and sequence gaps before reduction.
   - On a gap, stop applying untrusted deltas. Requery an authoritative device snapshot when the
     platform supports it; otherwise cancel active state for that source and start a new epoch.
4. Make lifecycle loss a terminal input event.
   - Focus loss, visibility loss, suspend, device removal, queue overrun, capture loss, pointer
     cancel, and source reset flow through one ordered `CancelAll(reason, oldEpoch)` path.
   - Reject late events from the old epoch. Do not wait forever for a release routed elsewhere.
5. Reduce physical state per source and device.
   - Pair press and release by physical control identity, not translated text.
   - Track holders as a set of devices or pointers. Derive aggregate Shift, Control, Alt, Meta, or
     button state instead of overwriting one boolean.
6. Separate persistent state from edge records.
   - Held state is reducer output. Press, repeat, release, and cancel are immutable transition
     records.
   - Duplicate down while already down becomes repeat or diagnostic duplicate; release while up is
     harmless and observable rather than a negative counter.
7. Classify keyboard semantics.
   - Use physical identity for held controls and gameplay bindings; use logical meaning and text
     composition for text.
   - Treat auto-repeat as policy input, not another press. Define hold, repeat, and one-shot commands
     separately.
   - Derive left and right modifiers independently. Distinguish momentary, toggle, and latch state.
   - Give AltGraph and composition paths precedence over ordinary character shortcuts when the
     platform reports them. Keep command handling separate from IME text commitment.
8. Recover focus without synthesizing commands.
   - If current device state can be queried, represent controls already held at return as
     suppressed held state until a real release and new press occur.
   - Use polling only as a bounded recovery snapshot. Do not use ambiguous edge bits or sampled
     state to manufacture missed presses.
9. Cut one immutable batch per frame or simulation tick.
   - Do not let mid-tick arrivals mutate the snapshot already visible to earlier systems.
   - Keep the journal immutable and give UI, gameplay, shortcuts, replay, and diagnostics separate
     cursors or projections. One consumer must not destructively steal another's edge.
10. Apply compaction by semantic class.
    - Never drop or merge press, release, cancel, focus, capture, epoch, device, or mode transitions.
    - Sum relative camera deltas, retain ordered drawing samples, keep the latest absolute hover
      position, and accumulate wheel precision according to the consumer contract.
    - Choose either the representative coalesced event or its original samples for one path, never
      both.
11. Keep coordinate and movement modes explicit.
    - Do not derive relative movement from clamped absolute coordinates.
    - Invalidate old absolute baselines on mode changes and mark warp-generated samples.
    - Freeze the coordinate space and transform generation used at ingress so a later window, DPI,
      viewport, zoom, or canvas change cannot reinterpret history.
12. Model gestures and capture as state machines.
    - Use explicit idle, armed, dragging, clicked or released, and canceled states. Measure drag
      thresholds from the original anchor.
    - Bind capture to pointer, generation, and owner. Confirm acquisition and loss events; only the
      current owner token can release current capture.
    - Reconcile current button bitmasks with internal state without inventing a new press when the
      gesture never observed one.
13. Model wheel delivery as a gesture transaction.
    - Preserve unit or mode and fractional precision.
    - Hold one wheel owner for the platform transaction or bounded idle phase. Do not assume pointer
      capture owns wheel routing.
14. For remote input, classify preservation semantics before choosing transport behavior.
    - Treat absolute state as supersedable, relative movement as range-summed, pen or touch as a
      path, press and release as idempotent boundaries, and focus, composition, clipboard, or
      surface changes as ordered interaction transactions.
    - Carry session, surface and path epochs, source and root identity, sequence, deadline, state
      version, and reliability class. Transport receipt is not application acceptance.
    - Separate receive, reducer-apply, and displayed-frame acknowledgments. Bound queues by oldest
      still-useful input age and preserve boundary events under pressure.
15. Prevent local-to-remote feedback loops by provenance, not timing guesses.
    - Preserve origin, root event, parent event, apply context, hop path, and propagation policy
      through adapters and derived commands.
    - Keep capture and remote-apply paths separate. Exclude a dedicated injected source or exact
      session marker at ingress; do not suppress similar local input inside a time window.
    - Track held controls by owner and press identity. Use resource-specific arbitration for shared
      modifiers, exclusive drags or composition, cursor control, clipboard, and local takeover.
16. Version the remote interaction context.
    - Separate operating-system activation, document visibility, active remote surface, and editing
      focus. Make focus a request, application, and confirmed-generation protocol.
    - Choose exactly one IME authority. Version composition, text, selection and target ranges;
      close composition before focus or surface generation changes.
    - Treat clipboard as a versioned multi-representation object with origin and content policy.
      Advertise metadata before transferring selected content on a lower-priority path.
    - Neutralize held state, capture, drag and composition before admitting a reconnect or new
      surface epoch. Resume only after state and transform acknowledgment.
17. Make remote-input failures replayable without logging user content.
    - Link capture, normalize, queue, send, receive, validate, dedupe, apply, render, present, drop,
      acknowledge and repair stages by event, root, frame, epoch and state hashes.
    - Preserve source occurrence and component observation times separately. Use sequence and parent
      relationships for causality; use clock estimates only for latency.
    - Record high-frequency summaries in a bounded low-overhead ring, snapshot at semantic
      boundaries, replay normalized events under a virtual monotonic clock, and compare the first
      state-hash divergence.
18. Read [Input Session State Checklist](references/input-session-state-checklist.md) for the
    detailed envelope, transition, compaction, recovery, and fault matrices.
19. Read [Remote Input Transport and Interaction Checklist](references/remote-input-transport-interaction-checklist.md) when input crosses a process, host, network, injected-device, or rendered-frame boundary.
20. Require adversarial evidence.
    - Inject duplicate, gap, reordering, coalescing, focus loss, device removal, capture theft,
      suspend, mode change, multi-device holds, repeat, AltGraph, composition, and tick-boundary
      arrival.
    - Assert that every active control terminates by release or cancel, aggregate state equals its
      holders, old epochs cannot mutate current state, one source action is not applied twice, and
      every consumer sees one immutable batch.
    - If configured proof is unavailable, report the static invariant gap instead of approving the
      path.

<!-- mustflow-section: postconditions -->
## Postconditions

- Source authority, envelope, identity, epoch, ordering, gap recovery, lifecycle cancellation,
  physical and logical key model, device ownership, reducer, immutable batch, consumer cursors,
  compaction, coordinates, capture, wheel, IME, diagnostics, and test evidence are explicit.
- Missing release, duplicate down, old-session delivery, queue loss, timestamp sorting, global-order
  invention, destructive edge reads, raw-plus-synthesized duplication, modifier collapse, repeat
  commands, composition leakage, stale capture release, doubled coalesced movement, transform drift,
  and unowned wheel gestures are fixed or reported.
- Input synchronization claims are backed by configured tests, replayable fixtures, platform
  evidence matched to current code, or labeled as static review risk.
- Remote-input claims also expose semantic delivery class, loop prevention, ownership arbitration,
  interaction-context versions, acknowledgment layer, causal trace, repair path, and
  capture-to-present evidence.

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

Prefer the narrowest configured intent that covers the changed input boundary and synchronized
template surfaces. Do not infer raw device tools, live input recorders, browser sessions, game
loops, watchers, accessibility tools, or platform diagnostics outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the authoritative source, device identity, epoch, or gap recovery rule cannot be named, report
  that current input state is not reconstructable.
- If safe recovery requires platform state queries, native integration, device fixtures, or a replay
  harness outside scope, keep cancel-and-new-epoch behavior fail-safe and report the missing proof.
- If privacy-sensitive key or text content would enter diagnostics, keep physical identities,
  lifecycle, sequence, and invariant counters while redacting text and user content.
- If a configured command fails, preserve the failing input invariant and fixture before editing
  again.
- If deterministic input proof is not configured, report the missing manual or integration evidence
  and defer rather than inventing a raw command.

<!-- mustflow-section: output-format -->
## Output Format

- Input synchronization boundary reviewed
- Source authority and envelope
- Epoch, sequence, dedupe, gap, lifecycle, reducer, physical/logical key, modifier, repeat, IME,
  batch, cursor, compaction, coordinate, gesture, capture, wheel, remote transport, lineage, loop,
  arbitration, focus, clipboard, surface, acknowledgment, observability, replay, and test findings
- Input synchronization fixes made or recommended
- Evidence level: configured-test evidence, platform evidence, replay fixture, static review risk,
  manual-only, missing, or not applicable
- Command intents run
- Skipped input diagnostics and reasons
- Remaining input-event synchronization risk
