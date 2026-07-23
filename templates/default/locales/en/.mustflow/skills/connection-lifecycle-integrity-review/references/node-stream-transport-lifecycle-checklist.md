# Node Stream and Transport Lifecycle Checklist

Use this reference for Node.js `net.Socket`, HTTP/1.1, HTTP/2, Web Streams, Undici, stream
adapters, connection pools, and process-shutdown reviews. Re-check version-sensitive details against
the current official documentation and repository tests before making durable compatibility claims.

## Contents

1. [Layered state model](#1-layered-state-model)
2. [Events, actions, and terminal causes](#2-events-actions-and-terminal-causes)
3. [Event path contracts](#3-event-path-contracts)
4. [Request, body, reader, and reuse rules](#4-request-body-reader-and-reuse-rules)
5. [Resource and conservation invariants](#5-resource-and-conservation-invariants)
6. [Backpressure and buffer budgets](#6-backpressure-and-buffer-budgets)
7. [Retainer and event-loop reference audit](#7-retainer-and-event-loop-reference-audit)
8. [Verification and fault injection](#8-verification-and-fault-injection)
9. [Server and client shutdown](#9-server-and-client-shutdown)
10. [Acceptance gate](#10-acceptance-gate)
11. [Official references](#11-official-references)

## 1. Layered state model

Do not model the whole lifecycle as `OPEN -> CLOSING -> CLOSED`. TCP read and write sides close
independently. HTTP request completion, response-body completion, pool return, and physical socket
close are different facts. HTTP/2 stream cancellation normally must not kill the session.

Use orthogonal dimensions when applicable:

```text
TransportState = CONNECTING | OPEN | ABORTING | CLOSED
ReadState      = OPEN | EOF_PENDING_CONSUME | ENDED | ERRORED
WriteState     = OPEN | END_REQUESTED | FINISHED | ERRORED
PoolState      = UNPOOLED | BUSY | IDLE | QUARANTINED

RequestState   = QUEUED | WRITING | WAITING_HEADERS | BODY_OPEN | SETTLING | SETTLED
BodyDisposition = NONE | CONSUMED | DISCARDED | CANCELLED | FAILED
ReaderState    = NONE | LOCKED | CANCEL_PENDING | CANCELLED | RELEASED
```

Interpret `ReadState=ENDED, WriteState=OPEN` as remote half-close and
`ReadState=OPEN, WriteState=FINISHED` as local half-close. Do not explode the cross-product into a
single enum unless a smaller protocol truly forbids independent progress.

## 2. Events, actions, and terminal causes

Keep Node stream events separate from local actions:

| Symbol | Meaning |
| --- | --- |
| `E` | socket `end`; readable EOF became observable after buffered data consumption |
| `F` | socket `finish`; writable `end()` completed flushing to the underlying system |
| `X` | socket `error` |
| `K` | socket `close`; the underlying resource closed |
| `D` | one state-machine-approved `destroy()` or `resetAndDestroy()` action |

`destroy()` is not an event. A graceful FIN path can complete with `D=0`. Require connection-record
finalization exactly once and abortive destroy admission at most once.

Normalize termination causes, for example:

```text
NORMAL_LOCAL_FIN | NORMAL_REMOTE_FIN | PEER_RESET | TIMEOUT | ABORT_SIGNAL
READER_CANCEL | WRITER_ERROR | CLIENT_FORCE | SERVER_FORCE | HALF_CLOSE_TIMEOUT
BODY_ABANDONED | PROTOCOL_ERROR | CONNECT_ERROR
```

Route all abortive entry points through one `tryTerminate(cause, mode)`-style boundary. Atomically
store the first cause as primary. Retain later timeout, abort, reset, or writer contenders as
secondary diagnostics only. Do not let them repeat destroy, callback settlement, registry removal,
or terminal metrics.

Finalize a physical connection from the physical close observer. Do not remove it from the active
registry immediately after `destroy()`, because the descriptor or handle can still be live. A
request may settle earlier after request-scoped cleanup.

## 3. Event path contracts

The table assumes `E` and `F` have not already happened. Preserve earlier events; after a transport
error, do not invent later successful `E` or `F` events.

| Path | Required relation | `(E,F,X,K,D)` | Reuse |
| --- | --- | ---: | --- |
| Graceful FIN, either side first | `E` and `F` once each, both before `K`; their mutual order can vary | `(1,1,0,1,0)` | no |
| Peer reset | normalize peer-reset error, then `X -> K` | `(0,0,1,1,0)` | no |
| Idle timeout with local abort | timeout notification, terminal admission, timer cleanup, `D -> X -> K` | `(0,0,1,1,1)` | no |
| AbortSignal after socket ownership | terminal admission, listener removal, `D -> X -> K` | `(0,0,1,1,1)` | no |
| Abort before socket allocation | request settles cancelled; no physical socket events | `(0,0,0,0,0)` | n/a |
| Safe body discard or HTTP/2 stream cancel | settle stream or body, release lock; keep physical connection | `(0,0,0,0,0)` | conditional |
| HTTP/1.1 body boundary unrecoverable | quarantine, `D -> K` or adapter-defined `D -> X -> K` | transport-dependent | no |
| Writer error | fail all accepted writes once, `D -> X -> K`; no new `F` | `(0,0,1,1,1)` | no |
| Local force close without error object | `D -> K` | `(0,0,0,1,1)` | no |
| Half-close deadline | prior `E`, then timeout `D -> X -> K`; no new `F` | `(1,0,1,1,1)` | no |
| Paused readable, bounded drain succeeds | consume remaining data, then graceful finish and close | `(1,1,0,1,0)` | no |
| Paused readable, drain deadline fails | abort before EOF is observable, then `X -> K` | `(0,0,1,1,1)` | no |
| Pending writes finish gracefully | stop new writes, settle accepted writes, `F`; consume peer EOF, then `K` | `(1,1,0,1,0)` | no |
| Pending writes aborted | stop new writes, fail accepted writes once, `D -> X -> K`; no `F` | `(0,0,1,1,1)` | no |
| Unconsumed body before lease deadline | keep request body open and connection busy | `(0,0,0,0,0)` | not yet |
| Lease discard succeeds | confirm message boundary, settle body, return connection idle | `(0,0,0,0,0)` | yes |
| Lease discard fails | quarantine and retire the stream or connection | transport-dependent | no |

Do not force a total order between `E` and `F` on graceful full close. Local and remote FIN progress
independently. Require their valid partial order relative to physical close.

For Node HTTP objects, do not confuse request or response completion with socket completion:

- A successful keep-alive response can emit response `end` and request `close` while the socket
  stays pooled.
- `ClientRequest` `finish` means request bytes were handed to the operating system, not accepted by
  the server.
- `ServerResponse` `finish` does not prove client receipt.
- Premature response close has its own response `aborted`, request `close`, response error, and
  response close surface; confirm exact supported ordering in the target Node version.

## 4. Request, body, reader, and reuse rules

Return an HTTP/1.1 connection to an idle pool only when all required facts are true:

```text
transportState == OPEN
poolState == BUSY
parserAtMessageBoundary == true
bodyDisposition in {CONSUMED, DISCARDED}
pendingWriteCount == 0
reservedBufferBytes == 0
primaryCause == null
readState == OPEN
writeState == OPEN
protocolCorruption == false
```

Quarantine a connection after premature close, framing or content-length mismatch, parser error,
reset, or unrecoverable body abandonment. Do not trust `writable`, `readable`, or destroyed flags as
proof that the next response starts at a clean boundary.

Apply HTTP/2 cancellation at stream scope. Escalate to session quarantine only for connection-level
GOAWAY policy, session error, flow-control corruption, or another session-wide violation.

Every response body needs a lease:

```text
BodyLease = {
  openedAt,
  deadline,
  maxDiscardBytes,
  discardTimeout,
  disposition,
  readerOwner,
  connectionId,
}
```

When a body is abandoned, attempt bounded discard only if framing and remaining size make it safe.
Apply byte and wall-clock limits together. Cancel or retire the narrowest safe protocol scope when
discard fails.

`reader.cancel()` completion and `reader.releaseLock()` are separate facts. Settle pending reads or
cancel, then release the lock in a finally-like boundary. Give cancel cleanup its own deadline when
the underlying source can stall.

Protocol defaults:

| Protocol | Cancellation policy |
| --- | --- |
| HTTP/1.1, known small remainder | bounded discard, then parser-boundary confirmation |
| HTTP/1.1, unknown or excessive remainder | quarantine and retire the socket |
| HTTP/2 | reset the stream; keep the session if session invariants remain valid |
| Raw TCP | retire the connection unless the application protocol defines cancel framing |
| WebSocket | use close handshake or protocol-error handling; do not map reader cancel blindly |

## 5. Resource and conservation invariants

Track and assert the following where the implementation owns the evidence:

| ID | Invariant |
| --- | --- |
| I1 | Every connection record reaches physical close and finalizes at most once. |
| I2 | `connections_created = connections_active + connections_closed`. |
| I3 | Graceful paths accept no destroy action; abortive paths accept at most one. |
| I4 | Each stream `end`, `finish`, `error`, and `close` event is counted at most once. |
| I5 | After terminal transport error, no new successful end or finish transition is accepted. |
| I6 | Closed connections remain in neither active registry nor pool indexes. |
| I7 | Every request has exactly one success, cancellation, or failure result. |
| I8 | Request settlement leaves no request timer, listener, retry token, or body lease. |
| I9 | Late callbacks cannot re-enter user code after request settlement or generation change. |
| I10 | Every accepted write settles once as success or failure; shutdown leaves none pending. |
| I11 | Application-owned reserved buffers remain within request, connection, and global budgets. |
| I12 | Every body reaches consumed, discarded, cancelled, or failed within its policy deadline. |
| I13 | Reader and writer locks do not outlive their operation or request. |
| I14 | Connections without a confirmed message boundary are never reused. |
| I15 | Retry queues are bounded by item count, bytes, age, and attempt; unsafe bodies are not replayed. |
| I16 | Intended shutdown leaves no unexpected refed timer, socket, or native handle. |
| I17 | Server shutdown progresses only through admission-stop, drain, force, and closed phases. |

Useful conservation equations:

```text
requests_started = requests_active + requests_succeeded + requests_failed + requests_cancelled
writes_accepted = writes_pending + writes_succeeded + writes_failed
body_leases_opened = body_leases_active + body_consumed + body_discarded
                     + body_cancelled + body_failed
buffer_bytes_reserved = buffer_bytes_current + buffer_bytes_released
```

Update registry state and related counters in the same transition boundary. Otherwise exceptions or
interleaving can leave durable metric divergence.

Use bounded metric dimensions such as reason, protocol, role, and mode. Put connection or request
identifiers in logs and traces, not metric labels.

## 6. Backpressure and buffer budgets

A stream high-water mark starts backpressure; it is not a whole-system hard limit. Account for every
application-owned queue:

```text
B_owned = B_node_readable + B_node_writable + B_web_readable + B_web_writable
        + B_http_parser + B_transform + B_application_queue + B_retry_body
        + B_discard_buffer + B_observability_capture
```

Reserve byte budget before enqueue or body replication. On reservation failure, pause the producer,
reject admission, or apply the declared drop policy. Discovering an overage from metrics after
enqueue is not enforcement.

Count logical reservations consistently when Buffer slices share backing stores. Observe RSS,
external memory, kernel socket buffers, and TLS native buffers separately; JavaScript accounting
cannot promise an absolute process RSS cap.

After `write()` reports backpressure, wait for drain or abort instead of continuing to allocate.
Track every accepted write by sequence or ownership token and settle its callback or promise once.

## 7. Retainer and event-loop reference audit

Build explicit `ConnectionScope` and `RequestScope` ledgers. Register cleanup at creation time.

Connection scope examples:

- core socket close and error observers;
- socket timeout and half-close timer;
- pool idle timer;
- native close waiter;
- connection buffer reservations.

Request scope examples:

- AbortSignal listener remover;
- request and response listeners;
- request deadline timer;
- retry token;
- body lease;
- reader and writer ownership;
- pending write records;
- operation buffer reservations.

Make disposal idempotent. Request cleanup must not remove connection-core observers needed to record
physical close.

Audit long-lived roots and their capture paths:

```text
global dispatcher -> origin pool -> client -> socket -> parser/listener -> response body -> reader
module singleton -> request map -> request scope -> timer/retry/body buffer
libuv timer -> callback closure -> retry queue -> request body stream -> descriptor
server -> connection registry -> socket -> listener closure -> request/response
long-lived AbortSignal -> listener -> request scope -> reader/writer/socket
AsyncLocalStorage -> store -> request/response -> body buffers
diagnostics subscriber -> correlation map -> request -> body/socket
unconsumed tee branch -> queued chunks -> backing buffer -> response
```

`once` listeners can still live forever if the event never arrives. `Promise.race` does not cancel
the losing I/O. `unref` permits process exit but does not remove the object, listener, or descriptor.
Finalization registries are leak canaries, not deterministic cleanup.

For stream completion helpers, check whether listeners are retained after completion and use the
runtime-supported cleanup option or returned cleanup function. Do not reuse failed pipeline streams
unless the implementation contract proves their listener and error state is clean.

Separate heap retention from event-loop liveness. An unresolved promise alone does not keep Node
alive, but a promise reachable from a native callback, registry, listener, timer, or retry job can
retain a large request graph.

## 8. Verification and fault injection

Use a pre/post active-resource baseline where configured. `process.getActiveResourcesInfo()` can
show active resource types but not ownership, so it supplements rather than replaces the ledger.
Normalize version-dependent resource type names into categories such as timeout, TCP, TLS, DNS,
pipe, and message port.

Run natural-exit scenarios in a child process without `process.exit()` when the repository has a
configured harness. Pair natural exit with open-handle or descriptor evidence so `unref` cannot hide
an open resource.

For heap proof, warm up, repeat a bounded workload, collect only configured snapshot or retention
evidence, and compare retained request, connection, body lease, reader, and buffer counts with active
ownership plus fixed instrumentation slack. Pair heap evidence with native handle or descriptor
evidence when the platform supports it.

Fault matrix axes:

| Axis | Cases |
| --- | --- |
| Time | before connect, after connect, before/after headers, before first body byte, before last byte, around finish |
| Cause | FIN, RST, timeout, abort, reader cancel, writer error, client kill, server kill |
| Read | flowing, paused, locked reader, pending read, unconsumed body |
| Write | none, pending, backpressured, before drain, immediately after end request |
| Protocol | raw TCP, HTTP/1.1 keep-alive, HTTP/2 multiplexing |
| Race | abort+timeout, RST+timeout, body end+cancel, shutdown+client reset |
| Load | one connection, pool limit, many slow consumers, full retry queue |

The oracle must include event trace and counts, primary cause, accepted destroy count, request
result, registry and pool sizes, pending writes, body disposition, lock state, and peak reserved
bytes. “An error happened” is not a sufficient oracle.

## 9. Server and client shutdown

Server sequence:

```text
ACCEPTING
  -> stop new accepts
  -> DRAINING
  -> retire idle HTTP/1.1 connections
  -> give active responses and pending writes a grace deadline
  -> send HTTP/2 GOAWAY and reject new streams when applicable
  -> FORCING
  -> retire remaining HTTP connections
  -> retire separately tracked WebSocket, CONNECT, HTTP/2, or upgraded transports
  -> wait for physical close observation
  -> CLOSED
```

Do not assume a generic HTTP close-all helper owns upgraded or HTTP/2 transports. Keep an explicit
registry for every transport class the application accepts.

Client sequence:

```text
OPEN
  -> stop new request admission and retry scheduling
  -> fail queued requests
  -> give active body consume or cancel a grace deadline
  -> close idle pool members
  -> force remaining active connections after deadline
  -> verify every request and physical connection finalized
  -> CLOSED
```

## 10. Acceptance gate

Require the applicable subset of these conditions before calling lifecycle handling complete:

```text
duplicate_finalize_total == 0
duplicate_destroy_attempt_total == 0
duplicate_stream_event_total == 0
post_error_event_total == 0
connection_conservation_error == 0
cleanup_residual_total == 0
late_callback_total == 0
writes_pending == 0 after shutdown
reuse_after_error_total == 0
stream_locks_active == 0 after request settlement
body_leases_active == 0 after request settlement
buffer_peak_bytes <= configured global buffer limit
open handles return to baseline plus intentional pool capacity
child process exits naturally without process.exit()
```

Do not require metrics or diagnostics that the implementation does not own. Report the missing
evidence and preserve the bounded invariant rather than fabricating proof.

## 11. Official references

- [Node.js Streams](https://nodejs.org/api/stream.html)
- [Node.js Net](https://nodejs.org/api/net.html)
- [Node.js HTTP](https://nodejs.org/api/http.html)
- [Node.js Web Streams](https://nodejs.org/api/webstreams.html)
- [Node.js Timers](https://nodejs.org/api/timers.html)
- [Node.js Process](https://nodejs.org/api/process.html)
- [Undici Diagnostics Channel](https://undici.nodejs.org/api/DiagnosticsChannel)
