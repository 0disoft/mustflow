---
mustflow_doc: skill.ui-state-resurrection-review
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: ui-state-resurrection-review
description: Apply this skill when frontend, desktop, mobile, chat, streaming, workspace, panel, tab, route, runtime, terminal, or session UI state that should be closed, completed, cleared, finalized, restarted, or deleted reappears after reload, restart, reconnect, route remount, SSR hydration, persisted-store rehydration, query-cache restore, service-worker cache restore, cloud sync, cross-tab broadcast, migration, crash recovery, or events such as message.complete, terminal-error, or old-generation stream replay; use it to prove whether the UI is rendering new state or resurrecting old persisted state.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.ui-state-resurrection-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# UI State Resurrection Review

<!-- mustflow-section: purpose -->
## Purpose

Debug resurrected UI state by tracing state provenance, persistence, hydration, and finalization before blaming rendering.

The core question is: "Is this panel, message, tab, route, task view, or draft newly created, or did an old stored record regain authority?" If restart, reload, reconnect, or hydration brings back the same ID, title, position, selected tab, message run, or collapsed state, treat it as a stored-state resurrection until evidence proves otherwise.

<!-- mustflow-section: use-when -->
## Use When

- A completed, closed, cleared, deleted, finalized, or dismissed UI surface reappears after app restart, browser reload, reconnect, route remount, tab focus, provider remount, workspace switch, user switch, tenant switch, schema migration, crash recovery, or cloud sync.
- A chat, copilot, streaming response, draft response, task panel, workspace panel, active tab, sidebar item, layout slot, notification, toast, inbox item, modal, drawer, form draft, selected item, or route state returns after `message.complete`, finish, submit, close, clear, delete, archive, or done.
- A streaming session mixes message lifecycle, runtime health, terminal health, restart state, hydration, persistence, or old-generation events through flat flags such as `isDone`, `isLoading`, `hasError`, or one handler that mutates both UI state and durable session storage.
- Local or remote state sources may include memory stores, React Query, SWR, Apollo, Redux Persist, Zustand persist, Pinia, router loaders, SSR bootstrap data, localStorage, sessionStorage, IndexedDB, CacheStorage, service worker cache, BroadcastChannel, desktop user-data SQLite, JSON, LevelDB, preferences, workspace-state files, mobile shared preferences, mobile SQLite, restore state, server workspace layout, user session state, or cloud sync.
- The symptom is being described as a render bug, component bug, memoization issue, or CSS issue, but the same identity or old timestamp survives a restart, reload, hydration, or sync boundary.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The UI is wrong only within one live render pass and no reload, restart, hydration, persistence, cache restore, replay, sync, or remount boundary is involved; use `frontend-state-ownership-review`, `frontend-render-stability`, or a framework-specific frontend skill first.
- The task only reviews cache key correctness outside UI restoration; use `cache-integrity-review`.
- The task only reviews generic async races without persisted or restored state; use `async-timing-boundary-review` or `race-condition-review`.
- The task only reviews deletion lifecycle for domain data, database rows, or server records rather than UI/session restore state; use `deletion-lifecycle-review` or the relevant database skill.
- The state is intentionally restored by an explicit product contract and the task is only to polish copy, layout, or accessibility.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Symptom timeline: before action, during action, completion or close moment, before shutdown or reload, after restart or reload, after reconnect or sync, and whether the same identity returns.
- Identity ledger: user ID, workspace or tenant ID, route params, conversation ID, message ID, logical ID, instance ID, run ID, submission ID, stream ID, panel ID, tab key, task ID, event ID, event sequence, cursor, server version, message version, schema version, pending command ID, idempotency key, tombstone version, and process start time where relevant.
- Source ledger: memory store, query cache, router state, URL state, persisted store, browser storage, service worker cache, desktop user-data files, mobile storage, server layout, cloud sync, crash recovery, migration, and cross-tab or cross-device channels.
- Finalize ledger: close, clear, complete, delete, submit, archive, done, `message.complete`, or equivalent action; memory clear, persisted clear, query-cache update, pending write cancellation, hydration abort, server invalidation, tombstone or watermark write, and sync conflict policy.
- Streaming ownership ledger: gateway or listener, envelope validator, event handler or processor, reducer or state machine, UI selector, persistence writer, hydration guard, cleanup owner, runtime generation owner, ack policy, and replay or resync policy.
- Runtime health ledger: message status, terminal status, session health, restart-required state, runtime ID, generation ID, old-generation event rejection, terminal error archive, transcript retention, and active-runtime cleanup.
- Read and write paths: store actions, reducers, selectors, query cache writes, persistence middleware, storage reads and writes, hydration callbacks, route loaders, app init effects, WebSocket or event replay handlers, HTTP refetch handlers, BroadcastChannel handlers, migrations, and save-last-session code.
- Test or reproduction surface: delayed persist write, delayed HTTP snapshot, reconnect replay, route remount, store recreation, app restart, clean profile, copied app-data folder, cross-tab broadcast, cross-device sync, and schema migration where relevant.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Existing local patterns for persistence, hydration, cache restore, session restore, crash recovery, cross-tab sync, and server-side layout storage have been searched before adding another cleanup effect.
- If the resurrected state affects auth, tenant isolation, privacy, payment, deletion, or server data correctness, also apply the narrower security, payment, deletion, database, or cache skill for that boundary.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add source labels, identity keys, timestamps, versions, event sequences, debug logs, and bounded instrumentation that prove which path wrote or read the resurrected value.
- Convert close, clear, complete, delete, archive, or done handlers into a single finalize action when state must be cleared across memory, persisted storage, query cache, inflight hydration, pending writes, server snapshots, and sync surfaces.
- Add tombstones, watermarks, generation IDs, abort tokens, schema migrations, identity guards, persisted-state partialization, merge filters, and stale-payload rejection for completed or cleared UI state.
- Split ephemeral in-progress state from committed history or durable layout state so a restored snapshot cannot recreate a completed run, closed panel, or cleared draft.
- Replace authoritative `active` and `finished` stores with selectors over one lifecycle truth when both lists can drift, duplicate, or resurrect the same item.
- Add lifecycle fields such as `logicalId`, `instanceId`, `status`, `version`, `eventCursor`, `pendingCommandId`, `idempotencyKey`, and `tombstone` when provenance shows projections are being stored as truth.
- Split streaming gateway, event handler, state store, persistence writer, hydration guard, and cleanup into explicit owners when one handler mutates UI state, session state, and durable storage.
- Add append-only event logs, snapshots, high-watermarks, durable-write acknowledgements, runtime or generation IDs, buffered hydration queues, and old-generation event rejection when streaming replay can cross restart or hydration boundaries.
- Add focused tests for delayed writes after finalize, stale HTTP snapshots, reconnect replay, route remount, cross-tab stale broadcasts, cross-device sync overwrite, crash recovery priority, migration defaulting, `message.complete` versus `terminal-error`, restart generation changes, and stale old-generation stream events.
- Do not fix resurrection by adding another render-time hide flag, CSS rule, duplicate cleanup effect, broad storage wipe, global cache clear, or product-state deletion unless provenance proves that scope is correct.

<!-- mustflow-section: procedure -->
## Procedure

1. Prove whether the UI is new or restored.
   - Compare IDs, route params, tab keys, titles, positions, collapsed state, selected tab, task IDs, message IDs, run IDs, timestamps, and schema versions before and after restart, reload, remount, reconnect, or sync.
   - If the same old identity returns after memory should be gone, prioritize persistence, hydration, replay, sync, migration, or crash recovery over rendering.
2. Snapshot every storage layer around the lifecycle.
   - Capture state before the user action, during in-progress work, immediately after completion or close, before shutdown or reload, and immediately after restart or hydration.
   - For web apps, inspect localStorage, sessionStorage, IndexedDB, CacheStorage, service worker cache, persisted query caches, and SSR bootstrap payloads.
   - For desktop apps, inspect user-data SQLite, JSON, LevelDB, preferences, workspace-state files, crash recovery files, and cloud sync files.
   - For mobile apps, inspect shared preferences, SQLite, key-value stores, sandbox restore state, and platform state restoration.
   - Look for names such as `openPanels`, `activeTaskPanel`, `workspaceLayout`, `restoredTabs`, `lastSession`, `pendingTasks`, `taskViews`, `streamingMessage`, `pendingEvents`, `draftResponse`, `activeRun`, `completedStreamIds`, `lastCompletedEventSeq`, `clearedAt`, and `runFinalizedAt`.
3. Add provenance to reads and writes.
   - Label each value with source, action name, previous value, next value, stack or caller, route, tab, user, workspace, message, run, event sequence, created time, written time, rehydrated time, and persist version when safe.
   - Instrument store actions, reducers, query cache `setQueryData`, persistence `setItem`, IndexedDB writes, server response application, hydration callbacks, route loaders, app init effects, replay handlers, and BroadcastChannel handlers.
   - Keep logs bounded and scrub secrets or personal data according to repository policy.
4. Reconstruct the timeline.
   - The common failure is: stale in-progress state is scheduled for persistence, completion clears memory, a delayed write flushes the old snapshot, hydration later reads it, and the UI honestly renders it.
   - Check whether `hydrate`, `restore`, `merge`, `sync`, `initialize`, `loadDraft`, `resumeSession`, `reconnect`, `onFocus`, `onMount`, or `saveLastSession` runs after finalize.
   - Compare process start time with stored `createdAt` or `rehydratedAt`; old timestamps in post-start state are strong resurrection evidence.
5. Inspect finalize semantics.
   - Treat `message.complete`, close, clear, delete, done, and archive as finalization events, not only render cleanup.
   - Finalize should clear memory, remove or update persisted state, remove ephemeral query-cache fields, cancel pending persisted writes, abort inflight hydration, invalidate or patch server snapshots, and record a tombstone or watermark when replay is possible.
   - Persisting only `null` may be weaker than persisting "this run or panel was finalized at this sequence/time" when old payloads can arrive later.
6. Review hydration merge policy.
   - Reject blind shallow merges such as persisted state overriding current state without identity, version, and tombstone checks.
   - Hydration should restore only if the persisted payload matches the current user, workspace, conversation, message, run, route, schema, and lifecycle, and is newer than the relevant clear or completion watermark.
   - Drop streaming, draft, panel, and task-view fields from persisted state unless they have an explicit restoration contract.
7. Review inbound event ordering.
   - `message.delta`, `message.complete`, reconnect replay, snapshot refresh, and history load may arrive through different paths.
   - Require event sequence, server version, message version, run ID, or generation ID checks so replayed or late payloads older than completion cannot rebuild ephemeral UI.
   - Delayed HTTP snapshots and background refetches must not recreate streaming or panel state after finalize.
8. Review streaming responsibility separation.
   - Treat the gateway as a connection and envelope owner only: open the stream, parse chunks, validate `sessionId`, `streamId`, `eventId`, `seq`, `createdAt`, `type`, and `payload`, then hand off the event.
   - Keep UI mutation and durable persistence out of the gateway. A listener that calls component setters and writes session storage in the same branch is a source-of-truth split.
   - Let the event handler validate, deduplicate, order, and translate external events into internal commands. It should not decide component display policy or directly edit durable storage.
   - Keep the state store as the only in-memory truth. Reducers or state machines should apply commands deterministically and update metadata such as `lastAppliedSeq`, `appliedEventIds`, `sessionStatus`, `messageIndex`, and `pendingToolCalls`.
   - Make the persistence writer own event log, snapshots, high-watermark, schema version, migration, compaction, blob references, dirty markers, and durable-write success. Send server acknowledgements only through the durable boundary when acknowledgement means recoverability.
   - Make the hydration guard buffer live events while snapshots or logs load, discard events older than the restored high-watermark, request replay or resync when a sequence gap appears, and reject late hydration from an obsolete runtime generation.
   - Make cleanup dispose the runtime generation: abort streams, cancel readers, remove heartbeat and retry timers, stop new persistence writes, finish or mark short idempotent writes, drop buffered events, and require async callbacks to check `runtimeId` or generation tokens.
9. Separate message lifecycle from runtime health.
   - `message.complete` ends the message lifecycle only. It should not clear terminal errors, mark runtime health as clean, erase restart-required state, or turn old terminal failures into success.
   - `terminal-error` changes terminal and session health. It should not rewrite already completed messages as failed messages, delete message content, or pretend a partial message completed successfully.
   - Model message status, terminal status, session health, and restart state separately instead of flattening them into `isDone`, `isLoading`, or `hasError`.
   - Allow states such as `completedWithTerminalError`: the user may have a complete assistant message and a broken terminal at the same time.
   - On restart, create a new runtime generation. Preserve transcript history when the product contract requires it, clear or archive active terminal errors, cancel pending streams, and reject old-generation `message.complete`, `terminal-error`, stdout, stderr, delta, and tool events.
10. Review identity boundaries.
   - Persist and query keys must include every dimension that changes ownership: user, tenant, workspace, route, conversation, message, run, tab, and feature or locale dimensions when relevant.
   - A key like `chat-state`, `workspace-layout`, or `activeMessage` is unsafe when more than one identity can share it.
   - On logout, tenant switch, workspace switch, conversation switch, or route identity change, clear or reject state from the previous identity.
11. Review active, finished, and pending as lifecycle projections.
   - Treat `active` and `finished` as selectors over one lifecycle model, not two independent authoritative stores.
   - Preserve user intent, externally confirmed facts, and unfinished retryable work; clear only UI posture such as selected tab, accordion open state, hover, scroll, temporary filters, or transient loading decorations without durable evidence.
   - Keep active until a terminal event such as finished, cancelled, deleted, archived, or tombstoned is confirmed with a version, cursor, or event ID and can be replayed after restart.
   - Keep finished as append-only or versioned history until a versioned delete, archive, purge, retention expiry, or tombstone event proves removal; do not let an old restored snapshot erase newer finished facts.
   - Keep pending finish, submit, close, delete, or archive commands with a command ID or idempotency key until success or failure ack decides whether to clear, retry, or restore active state.
   - If the same logical item can have a current attempt and past completed records, separate user-facing `logicalId` from lifecycle `instanceId`, `runId`, or `submissionId`.
   - Use one reducer for persisted snapshots, realtime events, and local commands so version, cursor, event ID, tombstone, and pending-command rules arbitrate every input consistently.
   - Snapshot restore is not truth. A restored active or finished value must lose to newer versions, later cursors, tombstones, and already-applied event IDs even when the snapshot came from local disk or server layout.
12. Review async generation and remounts.
   - Provider remount, StrictMode development double execution, HMR, route segment remount, auth context change, tab focus, and reconnect can run hydration more than once.
   - Async hydration needs request tokens, generation IDs, or AbortController-style cancellation so late loads cannot overwrite current finalized state.
13. Review local, server, and sync authority.
    - Test a clean browser profile or OS user; if the issue disappears, local persisted state is likely.
    - Test a clean device after login; if the issue returns, server layout, session state, or cloud sync is likely.
    - Delete only the suspect stored record; if the UI disappears after restart, the stored record had authority.
    - Inject the stored record into a clean environment; if it reproduces, the restore path is proven.
    - Check multi-device conflict policy: an old open state from device B must not overwrite a newer close or complete from device A.
14. Review migrations and crash recovery.
    - Migration defaults must not convert old `closed: true`, `completed`, `done`, or missing lifecycle fields into open or active state.
    - Crash recovery files must not outrank a normal session file that recorded a later finalize.
    - Save-last-session code must save the latest state, not a stale captured snapshot from before completion.
15. Add targeted regression evidence.
   - Prefer tests that model delayed persisted writes, persisted-store rehydration after finalize, stale HTTP snapshot after complete, reconnect replay after complete, route remount after complete, cross-tab stale broadcast, cross-device stale sync, and migration of old session records.
   - Assert that rendering follows store state honestly, and that the store refuses old restored state after finalization.
   - Add active, finished, and pending tests where a stale snapshot, replayed realtime event, duplicate event ID, command retry, or tombstone competes for the same logical ID or instance ID.
   - Add reducer tests for `message.delta` to `message.complete`, duplicate `message.complete`, `terminal-error` preserving message content, `terminal-error` then `message.complete`, `message.complete` then `terminal-error`, hydration idempotency, restart generation changes, and stale old-generation event rejection.
   - Add integration tests for normal streaming completion, terminal error before message completion, terminal error after message completion, refresh hydration of `completedWithTerminalError`, restart from a hydrated error session, and old-generation events arriving after restart.
   - Add transition-table tests for `ready`, `streaming`, `completed`, `terminalError`, `completedWithTerminalError`, `hydrating`, `restarting`, and `readyAfterRestart` when those states exist in the product model.

<!-- mustflow-section: postconditions -->
## Postconditions

- The resurrected UI is classified as newly created, restored from local persistence, restored from query or service-worker cache, restored from desktop or mobile app data, restored from server layout, restored from sync, restored by replay, restored by migration, restored by crash recovery, or not yet localized.
- Finalize actions clear or tombstone memory, persistence, query cache, inflight hydration, pending writes, server snapshots, and sync inputs where relevant.
- Hydration and replay paths reject stale, wrong-identity, wrong-schema, or older-than-watermark payloads.
- Streaming event handling has one mutation pipeline from gateway to event handler, state store, persistence writer, hydration guard, cleanup, and UI selectors; handlers do not directly mutate both UI and durable storage.
- `message.complete`, `terminal-error`, hydration, and restart are proven separate lifecycle concerns rather than competing flat flags.
- `active`, `finished`, and `pending` are either proven projections from one lifecycle truth or the remaining multi-source drift is reported.
- Tests or reproduction evidence cover the changed lifecycle boundary, or missing evidence is reported explicitly.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured frontend, unit, integration, docs, release, or mustflow intent that covers the persistence, hydration, replay, sync, migration, or finalize boundary. Do not infer raw browser, dev-server, storage-inspection, database, sync-service, or mobile commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If storage access, server layout, sync logs, or app-data files are unavailable, report which source remains unproven instead of claiming a render fix.
- If the state source cannot be named, add bounded provenance before changing cleanup logic.
- If a proposed fix only hides the component while the old record remains restorable, reject it as symptom masking.
- If clearing all storage would hide the bug but delete user data, narrow the stored record, identity, tombstone, or migration rule first.
- If tests need live browser, mobile, desktop, sync, or production telemetry not configured in `.mustflow/config/commands.toml`, run available local checks and report the manual evidence gap.

<!-- mustflow-section: output-format -->
## Output Format

- UI state resurrection surface reviewed
- New-versus-restored verdict and identity evidence
- Source ledger: memory, query cache, persisted store, browser storage, desktop or mobile storage, server layout, sync, replay, migration, and crash recovery where relevant
- Timeline: write, finalize, delayed write, read, hydrate, replay, remount, sync, and render order
- Streaming ownership: gateway, event handler, state store, persistence writer, hydration guard, cleanup, ack, and UI selector boundary
- Finalize, tombstone, watermark, merge, identity, lifecycle projection, runtime health, terminal health, pending command, generation, cache, and migration decisions
- Fixes made or recommended
- Tests or reproduction evidence
- Command intents run
- Skipped resurrection diagnostics and reasons
- Remaining UI state resurrection risk
