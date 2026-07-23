# Node Memory, Resource, and Backpressure Diagnostics

Use this reference when a Node.js process shows growing RSS, heap, external memory, buffers,
descriptors, sockets, native handles, cache residency, or streaming queues, especially when slow
consumers, retries, clones, transforms, HTTP/2, or HTTP/3 can blur ownership.

Do not force one exclusive root-cause label onto evidence that describes different dimensions. A
single incident can combine unbounded buffering, external-memory growth, allocator fragmentation,
and a missed transport close.

## Contents

1. [Classify three independent axes](#1-classify-three-independent-axes)
2. [Build one synchronized measurement ledger](#2-build-one-synchronized-measurement-ledger)
3. [Control the reproduction and compare floors](#3-control-the-reproduction-and-compare-floors)
4. [Distinguish common growth classes](#4-distinguish-common-growth-classes)
5. [Model request ownership as a DAG](#5-model-request-ownership-as-a-dag)
6. [Enforce terminal resource invariants](#6-enforce-terminal-resource-invariants)
7. [Trace backpressure from the final sink](#7-trace-backpressure-from-the-final-sink)
8. [Check each pipeline boundary](#8-check-each-pipeline-boundary)
9. [Run stop, plateau, and resume experiments](#9-run-stop-plateau-and-resume-experiments)
10. [Calculate the memory envelope](#10-calculate-the-memory-envelope)
11. [Infer the broken boundary](#11-infer-the-broken-boundary)
12. [Diagnostic acceptance gate](#12-diagnostic-acceptance-gate)
13. [Primary references](#13-primary-references)

## 1. Classify three independent axes

Classify every observation on all three axes:

| Axis | Question |
| --- | --- |
| Storage location | Are the bytes in the V8 heap, ArrayBuffer or Buffer backing stores, other native allocations, memory mappings, allocator residency, or kernel buffers? |
| Retention cause | Does a request, pending task, stream queue, cache, pool, native operation, retry, branch, or telemetry queue still own the bytes? |
| Terminal status | Is the owner still performing valid work, stuck in unbounded backlog, terminal but retained, or released while RSS remains resident? |

Call growth a leak only when the expected terminal condition has occurred, an owner or native
allocation remains live, and retained count or bytes grow with completed lifecycle repetitions under
comparable load. A queue that drains completely after a live request is not a strict leak, but an
unbounded queue is still an OOM defect and must not be reported as safe.

One common mixed sequence is:

```text
slow consumer
  -> ignored writable backpressure
  -> unbounded Buffer queue
  -> external and array-buffer growth
  -> queue release
  -> allocator pages remain resident
  -> external falls while RSS stays high
```

Do not infer native memory as `rss - heapTotal - external`. The measurements use different
inclusion, reservation, and residency semantics. In Node, `arrayBuffers` is part of `external`, not
an independent addend.

## 2. Build one synchronized measurement ledger

Collect comparable samples from the same process and clock domain:

| Layer | Required evidence | Useful expansion |
| --- | --- | --- |
| V8 heap | `heapUsed`, `heapTotal`, post-major-GC floor | old space, large-object space, native and detached contexts, global handles |
| External memory | `external`, `arrayBuffers` | Buffer count, backing-store bytes, parser, codec, crypto, and TLS buffers |
| Process memory | RSS plus private or committed memory | anonymous, file-backed, shared mappings, PSS, thread stacks, code pages |
| Resources | descriptor, socket, or Windows handle counts by type | socket state, pool busy/idle/queued, TLS session cache, active resource categories |
| Application | started, completed, aborted, failed, retried, in-flight | logical request, attempt, branch, and owner counts |
| Data flow | admitted, accepted, committed, released, cancelled, and discarded bytes per edge | peak queue bytes, chunk size, transform expansion, sink durability boundary |
| Protocol | TCP queues, HTTP/2 windows and outbound queue, QUIC credit | reset, window update, blocked-frame, cancel, and session or stream counts |

Use V8 heap-space statistics to distinguish live-space growth from reserved capacity. A growing
native or detached context count is a retention lead, not a complete diagnosis.

On Linux, mapping summaries can separate anonymous, file-backed, and shared residency. On Windows,
pair Working Set with Private Bytes or Commit and handle counts by type. Treat mapping inspection,
native heap profilers, heap snapshots, packet capture, and platform handle tools as configured or
manual-only diagnostics; this reference does not authorize raw commands.

`process.getActiveResourcesInfo()` reports resource types keeping the event loop alive. It is not an
enumeration of every reference, descriptor, allocation, or leak. Pair it with ownership and
platform evidence.

## 3. Control the reproduction and compare floors

Fix more than request rate. Record concurrency, body and chunk sizes, compression, protocol,
retries, cache state, branch count, consumer rate, origin cardinality, runtime build, and allocator.

Run phases in this order:

1. idle baseline;
2. bounded warmup with fixed origins, keys, and connections;
3. normal consumer faster than producer;
4. slow consumer below producer rate;
5. fully stopped consumer;
6. admission stop followed by complete drain;
7. idle wait beyond pool and keep-alive deadlines; and
8. optional forced GC only in an isolated staging or canary process.

Do not take a production heap snapshot casually. Snapshot generation can block the event loop and
require substantial extra memory. Use an isolated process or removed-from-traffic instance and
record the diagnostic impact.

Compare floors and slopes rather than one peak:

```text
post_gc_slope
  = change(post-major-GC heapUsed) / change(completed lifecycles)

post_quiescent_slope
  = change(resource amount after admission stop, drain, and idle expiry)
    / change(completed lifecycles)

Q_edge(t)
  = admitted_bytes_edge(t) - released_bytes_edge(t)
```

Define release as the moment that edge no longer owns the bytes, not the moment it hands them to
another queue. Keep compressed, decompressed, transformed, and committed byte domains separate.
Use a predeclared statistical tolerance rather than demanding literal zero from noisy process
measurements.

## 4. Distinguish common growth classes

| Class | Decisive evidence | Common false conclusion |
| --- | --- | --- |
| JavaScript heap retention | Post-GC and post-quiescent live heap grows with completed work; repeated dominator paths lead to a long-lived map, cache, listener, promise continuation, closure, or context | Treating `heapTotal`, warmup, or a bounded cache as live-object growth |
| Native leak | JavaScript heap, external memory, queues, and handles are stable while still-live native allocation stacks grow | Calling JIT code, mappings, thread stacks, pools, or fragmentation a native leak |
| External buffer retention | Small wrappers or views retain large backing stores and `arrayBuffers` moves with owned queue bytes | Treating all `external` as Buffer memory or continuing to call it a Buffer leak after external falls |
| Unbounded buffering | Growth appears under a slow or stopped consumer near producer-minus-consumer rate and drains after consumption resumes | Calling it safe because it eventually drains, or calling it a terminal leak before the request ends |
| Descriptor, socket, or handle leak | After admission stop, terminal settlement, and pool idle expiry, owned resources fail to return to baseline, often one per abort or error | Counting a bounded warm pool or kernel `TIME_WAIT` as a process-owned leak |
| Cache growth | A named cache root owns the bytes and growth follows key, origin, tenant, or SNI cardinality; eviction or flush releases them | Assuming TTL alone is a byte bound or limiting entries while values remain unbounded |
| Allocator fragmentation or residency | Live heap, external memory, queues, and live native allocations stabilize or fall while allocator active-to-resident gap remains high | Declaring fragmentation merely because RSS did not fall immediately after release |

Persistent `CLOSE_WAIT` plus an owned descriptor is a stronger local-close signal than `TIME_WAIT`.
Confirm the owning process and lifecycle before assigning cause.

## 5. Model request ownership as a DAG

A strict tree is wrong when pools and multiplexed sessions are shared, retries or hedges create
multiple attempts, and `clone()` or `tee()` creates multiple body branches.

```text
process
  -> process caches and telemetry queues
  -> pool
       -> connection or session
            -> protocol stream leased by request attempt
  -> logical request
       -> root cancellation and context
       -> attempt 1
       -> attempt 2 or hedge
       -> output branch A
       -> output branch B
```

Track at least:

```text
resource_id
resource_type
scope: process | pool | connection | request | attempt | branch | stream
owner_id
parent_id
leased_by_request_ids
created_at
created_stack_hash
state: CREATED | ACTIVE | CLOSING | CLOSED | FAILED
current_bytes
close_action
terminal_reason
closed_at
```

Separate logical request, attempt, branch, protocol stream, shared connection, and process cache
ownership. A request normally returns a lease instead of closing a healthy shared connection.
Cancelling one HTTP/2 or HTTP/3 request normally resets its stream, not the whole session or
connection.

Track terminal reasons such as success, client abort, deadline, DNS, connect, TLS, upstream
headers, upstream body, transform, downstream, retry-superseded, and shutdown. Do not let the
success path be the only path with balanced counters.

## 6. Enforce terminal resource invariants

For every supported terminal reason, require the applicable invariants:

| Scope | Terminal invariant |
| --- | --- |
| Request | Registry, async context, listeners, timers, and request references from cancellation state are zero |
| Attempt | Fetch or provider task, retry or hedge task, body, parser, and timeout are terminal |
| Branch | Every clone or tee branch is consumed, cancelled, or errored |
| Stream | Reader and writer locks are released, pipe tasks settle, and both transform sides reach a terminal state |
| File | File handle, stream, temporary file, and quota reservation are released |
| Protocol | HTTP/1 exchange or HTTP/2/3 request stream is terminal |
| Shared resource | Request lease and reference count decrement exactly once; a healthy shared socket or session need not close |
| Memory | Request-owned queue bytes reach zero; shared pools and caches remain within declared byte and cardinality limits |
| Observation | Terminal reason records once and close actions are idempotent |

A useful cleanup order is: atomically select terminal state, abort the root scope, stop producers and
retries, cancel or abort sources and sinks, await task settlement, release locks, remove timers and
listeners, close files, return shared leases, and remove the registry entry. A finalizer or GC hook
is a safety net, not the normal protocol.

Promises require separate treatment from their work. A settled promise does not prove the socket,
file, fetch, codec, or native operation ended. A pending promise is not automatically a leak unless
a longer-lived owner retains it or its underlying operation past the intended boundary.

## 7. Trace backpressure from the final sink

Backpressure is a chain of local capacity translations, not one signal travelling unchanged through
the stack:

```text
final sink capacity falls
  -> Web writer readiness blocks or Node write returns false
  -> transform readable queue fills
  -> transform writable pressure rises
  -> body pull or read stops
  -> parser and body ingress slow
  -> HTTP/1 socket reading slows
     or HTTP/2 flow-control credit stops increasing
     or QUIC stream and connection credit stops increasing
  -> remote producer rate falls
```

Instrument each request, attempt, and branch with compatible byte domains:

```text
wire_encoded_received
fetch_ingress_encoded
body_decoded_enqueued
body_delivered
transform_input
transform_output_enqueued
sink_accepted
sink_committed
sink_released
cancelled_bytes
discarded_bytes
```

Keep accepted, committed, and released distinct. A sink that resolves `write()` after copying into
an internal array has accepted bytes but has not necessarily committed or released them. Compression
and expansion require separate encoded and decoded ledgers.

## 8. Check each pipeline boundary

| Boundary | Healthy pressure evidence | Failure pattern |
| --- | --- | --- |
| Final writable | Web writer readiness remains pending or Node `write()` returns false until drain; local queue plateaus | Adapter resolves before real capacity, ignores false, or grows a background queue |
| Transform | Transform invocation and output enqueue stop when readable capacity is exhausted; async transform returns its work promise | Background work or side arrays bypass the stream queues; count-based HWM hides huge chunks |
| Response body and manual pump | New reads stop when the sink blocks; early exit cancels; every write is awaited | Read loop accumulates promises or chunks, releases only a lock, or leaves a clone branch unread |
| Fetch or client bridge | Body ingress stops after bounded overshoot when delivery stops | Parser, decoder, or bridge continues consuming into user-space storage |
| HTTP/1 | Application delivery and socket reads stop after bounded transport and parser overshoot | User-space keeps draining the kernel while application Buffers grow; low kernel Recv-Q is misread as health |
| HTTP/2 | Stream credit stops increasing while connection control frames and healthy sibling streams still progress | Credit is returned when bytes enter an unbounded application queue, or the entire TCP socket is paused and siblings deadlock |
| HTTP/3 and QUIC | Stream and connection credit stop increasing; blocked telemetry appears; cancellation closes the narrow stream directions | QUIC returns credit before application consumption or one-direction cancellation leaves reassembly state retained |
| Transport | TCP receive window or QUIC flow control eventually stalls the sender after bounded in-flight bytes | Continued application reads keep transport open while downstream storage grows |

Treat high-water marks as pressure thresholds, not hard byte caps. Use a byte-length queuing strategy
for byte payloads and include maximum chunk, in-flight operations, protocol windows, and hidden side
queues in the budget.

Do not pause an entire HTTP/2 transport merely to slow one stream. Continue processing connection
control frames and healthy siblings; express pressure through stream and connection flow-control
accounting. Verify runtime-specific behavior against the target version and client implementation.

## 9. Run stop, plateau, and resume experiments

Start with HTTP/1, no compression, no retry or hedge, no cache, no clone or tee, concurrency one,
fixed incompressible chunks, and an origin faster than the sink. Add one variable at a time only
after the base experiment passes.

During normal consumption, queues should oscillate within a low bounded range. During slow
consumption, buffers may fill, but upstream rate should converge toward sink rate. During a full
stop, require the applicable observations after bounded overshoot:

- writer readiness blocks or Node write returns false;
- local writable and transform queues plateau;
- transform invocations and response reads stop;
- client body ingress stops;
- HTTP/2 window updates or QUIC credit increases stop for the affected stream; and
- remote sender throughput stops after in-flight transport data is exhausted.

On resume, require queue drain, writer readiness or drain, transform and body reads, protocol credit,
and remote sending to resume. A pipeline that stops but never resumes is deadlocked or cancelled,
not backpressure-correct.

Then add, one at a time: concurrency, HTTP/2, HTTP/3, gzip or Brotli expansion, output-expanding
transforms, retries, hedges, clones, tees, slow and fast branches, downstream abort, upstream reset,
transform failure, and graceful shutdown.

## 10. Calculate the memory envelope

Use an explicit envelope such as:

```text
pipeline_memory_bound
  ~= concurrency
     * sum(
         queue_high_water_mark_bytes
         + maximum_chunk_bytes
         + in_flight_operation_bytes
         + bounded_side_queue_bytes
       )
     + protocol_receive_windows
     + protocol_send_windows
     + kernel_and_userspace_transport_buffers
     + clone_branch_multiplier
     + retry_or_hedge_multiplier
     + codec_expansion_working_set
```

The equation is a budgeting model, not proof of allocator RSS. Validate each term from current
implementation and workload evidence. A count HWM of one permits one arbitrarily large chunk; it is
not a one-byte budget.

## 11. Infer the broken boundary

| Observation | Likely broken boundary |
| --- | --- |
| `sinkCommitted` stops while `sinkAccepted` grows | Sink adapter resolves before durable or capacity-limited commit |
| `sinkAccepted` stops while transform output grows | Transform ignores readable pressure or uses a side queue |
| Transform input stops while body delivery grows | Manual pump is not serializing read and write |
| Body delivery stops while client ingress grows | Parser, decoder, or response bridge is over-reading |
| Application delivery stops while HTTP/2 DATA and credit continue | Credit is returned at intermediate copy instead of final consumption |
| Application delivery stops while QUIC credit continues | QUIC integration returns credit before application consumption |
| Application body stops while socket bytes rise and kernel receive queue stays low | HTTP/1 or client bridge continues draining into user-space buffers |
| Queues and array buffers fall while RSS remains high | Allocator residency, slabs, pools, or fragmentation, after excluding live native allocation |
| Bytes stabilize while descriptors or handles rise | Independent lifecycle leak |
| Descriptors stabilize while live native allocation stacks rise | Native memory leak |
| Live memory stabilizes while cache bytes rise | Cache policy or cardinality failure |
| Post-GC heap rises even with normal consumers | JavaScript retention unrelated to backpressure |

## 12. Diagnostic acceptance gate

Call the diagnosis complete only to the evidence level actually established:

- locate growth in at least one measurable storage class;
- identify the owner or bounded queue responsible for retaining it;
- prove request, attempt, branch, stream, file, and protocol terminal invariants for every supported
  success, abort, timeout, retry, error, and shutdown path;
- show stopped-consumer queues plateau within a precomputed envelope and upstream rate eventually
  stops;
- show resume restores drain, protocol credit, and upstream progress;
- show request-owned descriptors and handles return within predeclared tolerance after pool idle
  expiry while shared pools remain within their limits;
- show post-GC or post-quiescent slopes remain within predeclared statistical tolerance; and
- distinguish fragmentation only after live heap, external, cache, queue, handle, mapping, and native
  allocation evidence no longer explains resident growth.

If snapshots, native profilers, platform handle inspection, packet capture, qlog, or long-running
load are not configured, report them as manual-only or missing. RSS growth alone is an observation,
not a completed diagnosis.

## 13. Primary references

- [Node.js process memory and active resource APIs](https://nodejs.org/api/process.html)
- [Node.js V8 heap statistics and heap snapshots](https://nodejs.org/api/v8.html)
- [Node.js Buffer ownership and views](https://nodejs.org/api/buffer.html)
- [Node.js stream backpressure and high-water marks](https://nodejs.org/api/stream.html)
- [Node.js HTTP/2 state and flow control](https://nodejs.org/api/http2.html)
- [WHATWG Streams Standard](https://streams.spec.whatwg.org/)
- [RFC 9113: HTTP/2](https://www.rfc-editor.org/rfc/rfc9113.html)
- [RFC 9000: QUIC](https://www.rfc-editor.org/rfc/rfc9000.html)

Use documentation for the target runtime and client version. The current Node documentation and
standards establish API and protocol semantics; they do not prove a particular library build,
allocator, kernel, proxy, or application implements the lifecycle correctly.
