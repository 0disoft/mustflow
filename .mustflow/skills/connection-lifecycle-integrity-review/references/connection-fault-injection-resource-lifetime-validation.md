# Connection Fault-Injection and Resource-Lifetime Validation

Use this reference when a connection-lifecycle review must design, execute, or judge repeated
fault injection, soak tests, resource-growth evidence, regression gates, or root-cause attribution.
The lifecycle model remains in `node-stream-transport-lifecycle-checklist.md`; this document owns
the validation campaign and the strength of the resulting claim.

The concrete API examples target Node.js HTTP/1.1 `http` and `net`, plus HTTP/2 `http2`. Preserve
the test structure and evidence model in other runtimes, but replace runtime-specific APIs and
thresholds only through a predeclared repository or release contract.

## Contents

1. [Evidence boundaries and common misdiagnoses](#1-evidence-boundaries-and-common-misdiagnoses)
2. [Harness isolation and request ledger](#2-harness-isolation-and-request-ledger)
3. [Common failure gates](#3-common-failure-gates)
4. [Repeated fault and soak matrix](#4-repeated-fault-and-soak-matrix)
5. [Termination-method side effects](#5-termination-method-side-effects)
6. [Compatibility and regression matrix](#6-compatibility-and-regression-matrix)
7. [Lifecycle implementation requirements](#7-lifecycle-implementation-requirements)
8. [Root-cause attribution](#8-root-cause-attribution)
9. [Mitigation and containment decisions](#9-mitigation-and-containment-decisions)
10. [Resolution claim gate](#10-resolution-claim-gate)

## 1. Evidence boundaries and common misdiagnoses

Do not equate RSS growth with retained application objects. RSS also contains allocator
fragmentation, native TLS buffers, runtime arenas, and pages that the allocator has not returned to
the operating system. Pair heap evidence with external memory, array buffers, native handles, file
descriptors, and protocol ownership.

Do not count `TIME_WAIT` as an open application socket. It represents a connection the kernel is
remembering after close. Sustained `CLOSE_WAIT`, by contrast, is strong evidence that the process
observed peer FIN but did not complete its local close path. Confirm the owning process and socket
before assigning cause.

Do not treat a `destroy()` call as cleanup completion. It is an abortive action that can discard
buffered data, fail or strand callbacks, and destroy sibling work on a shared HTTP/2 session.
Require terminal settlement, resource release, and physical close observation separately.

Keep these evidence classes distinct:

- configured repeated test;
- configured controlled benchmark;
- configured soak or chaos lane;
- heap or retained-object diagnostic;
- native handle, file-descriptor, or TCP-state diagnostic;
- packet or infrastructure-path evidence;
- static lifecycle review;
- manual-only evidence; and
- missing evidence.

Never promote a static review or one green reproducer into a soak, production, or root-cause claim.

## 2. Harness isolation and request ledger

Separate the system under test, clean-load generator, raw TCP or HTTP fault peer, and network-fault
injector into different processes or isolation units. Measure only the system under test. On Linux,
a dedicated cgroup and PID namespace can prevent harness descriptors and timers from contaminating
the process ledger. Treat namespaces, native RST helpers, packet capture, and network emulation as
configured or manual-only infrastructure; this reference does not authorize raw commands.

Generate FIN through a graceful peer write close. Generate RST with a runtime-supported reset API
or a narrowly scoped native helper whose behavior is proven. A proxy that disconnects a connection
tests disconnect handling; it does not prove packet loss, reordering, or blackhole behavior. Use a
kernel-level network emulator when the configured environment owns those profiles.

Assign every logical request:

- a monotonic request identifier;
- deterministic payload bytes and SHA-256;
- intended and observed byte counts;
- an idempotency key where side effects are possible;
- monotonic timestamps for creation, connect, headers, body, completion, cancel, timeout, error,
  and physical close; and
- exactly one terminal classification: succeeded, expected fault, or unexpected failure.

Require the closed-cohort conservation rule:

```text
started = succeeded + expected_faulted + unexpected_failed
outstanding = 0
```

Sample at a declared interval, normally one second for long-running Node campaigns:

- RSS, heap used, external memory, and array-buffer bytes;
- file descriptors or native handles and TCP state counts;
- active timers and runtime resource categories;
- HTTP/1 agent busy and free socket counts;
- HTTP/2 session and stream counts;
- pending promises and write callbacks; and
- event-loop delay and clean-request latency.

Use `process.getActiveResourcesInfo()` only as a resource-category observation. It does not prove
ownership. Private runtime APIs such as `process._getActiveHandles()` may support test diagnostics
when explicitly configured, but must not become production cleanup logic or the sole proof.

Establish clean offered load before injecting faults. A useful default is 70% of the maximum clean
throughput that still satisfies the p99 SLO. Mix faulted and clean requests so the campaign exposes
cross-request damage. Run fixed campaigns with at least three predeclared independent seeds; never
rerun until a favorable seed appears.

## 3. Common failure gates

Zero-tolerance correctness rules are not environment calibration points:

- no crash, OOM kill, assertion, uncaught exception, or unhandled rejection;
- no successful request with a byte-length or SHA-256 mismatch;
- no idempotency key committed twice and no cancelled request later committed as success;
- no duplicate terminal transition, common finalizer, or object `close` observation;
- every accepted write callback or promise settles exactly once; and
- every closed-cohort request reaches exactly one terminal outcome.

Use the following numeric defaults only when the repository has not declared a stricter gate and
the harness can measure the named quantity consistently. Record any override before the run.

| Surface | Default failure gate |
| --- | --- |
| Settlement | After load stops, any outstanding request, promise, or write callback remains after `max(2 * longest timeout, 30s)` |
| Write callback | Settlement exceeds the operation timeout plus 250ms |
| Fixed-run heap | After cooldown, heap exceeds clean baseline by 16MiB |
| Fixed-run RSS | After cooldown, RSS exceeds clean baseline by 64MiB |
| Fixed-run heap slope | The lower bound of the 95% confidence interval across 500-request quiescent snapshots exceeds 256 bytes per request |
| Fixed-run handles | After explicitly closing agents and HTTP/2 sessions, descriptors exceed baseline by 3 or active TCP exceeds baseline by 1 |
| `CLOSE_WAIT` | Any additional connection persists for at least 60 seconds |
| Soak heap slope | After the first hour, one-minute medians exceed 0.5MiB/hour in two consecutive 30-minute windows |
| Soak external slope | External plus array buffers exceed 1MiB/hour under the same rule |
| Soak RSS slope | RSS exceeds 2MiB/hour under the same rule |
| Soak hard cap | RSS grows by `max(128MiB, 25% of baseline)` or heap grows by 64MiB |
| Handle slope | FD, TCP connection, or HTTP/2 stream growth exceeds 0.2/hour; streams must return to zero and sessions to the configured pool size after faults stop |
| Clean-request isolation | Unexpected error rate exceeds 0.01% or p99 exceeds clean baseline by 25% |
| Post-fix performance | Throughput falls below 95%, p99 rises above 115%, or CPU per request rises above 110% of the pre-fix comparator |
| Owned buffer | Queued bytes exceed the declared limit plus one maximum chunk and 64KiB |
| Timeout accuracy | Fires over 50ms early or later than the deadline plus `max(250ms, 2 * event-loop p99)` |

Keep two different teardown modes. Leak campaigns explicitly close agents and sessions before the
final baseline. Pool-reuse campaigns intentionally leave the pool open and judge only its declared
steady state. Mixing them falsely labels healthy keep-alive sockets as leaks.

## 4. Repeated fault and soak matrix

Run each applicable fault for HTTP/1.1 cleartext, HTTP/1.1 TLS, and HTTP/2 TLS, in both client and
server roles when the product supports them. A release-level claim must include the production TLS
and proxy path or explicitly state that this evidence is missing.

| Fault | Repeated campaign | Soak campaign | Additional oracle |
| --- | --- | --- | --- |
| Slow peer | Headers at 1 byte/250ms, body at 1KiB/500ms, with some permanent stalls; 5,000 fault requests and 100 concurrent slow connections | Six hours with 50 slow connections and 5% slow arrivals | Header and body idle deadlines fire within tolerance; inbound queues stay bounded; clean p99 rises no more than 20%; no handles remain after slow peers close |
| Disconnect by phase | Disconnect after connect, at 50% headers, after headers, at 25/50/75/99% body, after response headers, and at 25/50/75/99% response body; 20,000 evenly distributed attempts | Six hours with 10% phased disconnects | Partial requests never succeed; files, transactions, locks, timers, and listeners release within five seconds of terminal observation |
| FIN | Complete message, truncated declared body, and mid-response FIN; 10,000 per position | Six hours with 5% random FIN | Complete framing may succeed; truncated framing must fail; `end` plus `close` never finalizes twice |
| RST | Same positions as FIN; separate TCP RST from HTTP/2 `RST_STREAM(CANCEL)`; 10,000 TCP cases and 20,000 stream resets | Six hours with 5% random resets | No unfinished work succeeds after TCP RST; stream reset does not fail sibling streams or close a healthy session |
| Reader stops | Never read, or stop after 64KiB and 1MiB, while peer streams 100MiB; 2,000 cases and 50 stuck readers | Six hours with 20 stuck readers | No enqueue after backpressure without drain; callbacks settle; owned buffers and external memory remain bounded |
| Writer stops | Declare a large body, send 0/1/50/99%, then leave the connection open; 5,000 cases and 100 stalled writers | Six hours with 50 stalled writers | Body idle timeout retires handler, parser, timer, and transport; partial body never becomes success |
| Timeout boundary | Connect, headers, body idle, response idle, total, keep-alive, HTTP/2 stream, and session timeouts at `T-100`, `T-10`, `T+10`, and `T+100ms`; 2,000 per timeout | Six hours with 1% of requests near each boundary | No early timeout and no stale timer kills the next request on a reused socket |
| Unconsumed response | No listener, resume, destroy, or cancel for 0-byte, 1KiB, 1MiB, and endless chunked bodies; 10,000 cases and 100 concurrent bodies | Six hours with 5% unconsumed responses | Lease expiry performs bounded discard or cancel; HTTP/1 busy pool does not stick at its maximum; HTTP/2 sibling p99 rises no more than 10% |
| Mid-stream cancel | Cancel uploads and downloads at chunk boundaries; 20,000 cases | Six hours with 10% random cancellation | Cancelled HTTP/1 sockets are not reused; HTTP/2 cancels only the stream; partial data never succeeds |
| Server restart | 200 graceful and 200 hard restarts with 200 in-flight requests; use GOAWAY for graceful HTTP/2 | Six hours, restarting every five minutes and alternating graceful and hard | No accepts after drain starts; grace-eligible work reaches 99.9% success; old process exits within grace plus five seconds; hard-restart client operations settle within their own deadlines |
| Delay and loss | Directional 200ms plus or minus 50ms, 1% random loss, periodic 5% burst loss, 0.1% reorder, 0.1% duplicate, then a mixed profile; 100,000 requests per profile | Six hours per profile and 24 hours mixed | Zero successful-body corruption and duplicate effects; idempotent success at least 99.9% after at most one allowed retry; retry amplification at most 1.2; no automatic retry for non-idempotent work without a safe key; throughput at least 70% of the same-RTT clean control |

TCP packet loss does not directly imply the same request failure rate because retransmission hides
many losses. Use reset, blackhole, and half-open profiles when the goal is request failure rather
than prolonged latency and resource ownership.

## 5. Termination-method side effects

| Change | Risk | Required contract |
| --- | --- | --- |
| `destroy()` | Discards writable buffers, can race callbacks, prevents HTTP/1 reuse, and can kill every stream in an HTTP/2 session | Admit abortive termination once; retire only an HTTP/1 connection whose message boundary is untrusted; destroy an HTTP/2 session only for connection-level transport or protocol failure |
| `cancel()` | A shared signal cancels unrelated requests; retry after partial delivery can duplicate non-idempotent effects; error reasons can be flattened | Use request-scoped cancellation, preserve the reason, forbid unsafe automatic replay, and cancel an HTTP/2 stream rather than its session |
| `pause()` | A paused stream can retain a socket forever and consume HTTP/2 flow-control credit; a peer-idle timer can contradict application-owned pause | Give pause an owner, high/low-water hysteresis, and a deadline that ends in resume or cancel; charge application pause to a total-processing deadline rather than peer-idle time |
| `resume()` | Automatic drain can silently discard a body, hold endless chunked responses, and hide trailers or body errors | Auto-drain only under an explicit body-discard contract; cap bytes and time; exclude `HEAD`, `204`, and `304` from body-discard logic |
| Buffer cap | Truncation can report corrupt data as success; compressed size misses expansion; per-layer high-water marks do not form one process cap | Count compressed and expanded bytes plus every application-owned queue; fail explicitly on overflow; bound overshoot by one chunk plus 64KiB |
| Timeout | Completion can race a stale timeout; socket-owned timers can kill a later pooled request; stream timeout can destroy an HTTP/2 session | Separate connect, headers, body idle, response idle, total, keep-alive, stream, and session timers; remove request timers before pool return |
| Forced callback settlement | Runtime callbacks and error events can both complete the same logical write, or neither may do so | Track write identity and settle through one once-only business completion gate; a watchdog diagnoses missing ownership but does not replace it |

`finish` proves only that the local writable handed bytes to a lower layer. It does not prove peer
receipt. Use peer-observed length and digest, or an application-level acknowledgement, for delivery
integrity.

## 6. Compatibility and regression matrix

Preserve documented public contracts and legitimate user behavior, not accidental nanosecond event
order, infinite sockets, or missing callbacks. Adding automatic cancellation, default timeouts, or
body-size limits is a compatibility change. Use opt-in behavior, a deprecation period, or a major
version boundary where the existing public contract permits late consumers or slow streams.

Minimum regression coverage:

- body sizes 0, 1, 63KiB, 64KiB, 65KiB, 1MiB, and 100MiB over HTTP/1 and HTTP/2, with exact length,
  SHA-256, headers, and trailers;
- success, peer FIN, peer RST, local cancel, and timeout event contracts, asserting partial order and
  counts rather than one exact event array;
- 100,000 writes around backpressure, destroy, and timeout, with issued callbacks equal to settled
  callbacks and no pending callback after the deadline;
- a 100MiB producer against a 1KiB/s consumer, with no enqueue after `write() === false` before drain;
- 10,000 healthy HTTP/1 requests, failing if socket reuse drops by more than five percentage points;
- 10,000 damaged HTTP/1 requests, proving zero reuse of parser-unsafe sockets and no response-byte
  contamination of the next request;
- HTTP/2 rounds with 100 concurrent streams and 10 cancellations, proving zero sibling errors,
  zero session closes, and no more than 10% sibling p99 degradation;
- no-body `HEAD`, `204`, `304`, and zero-length responses, proving no unnecessary body lease;
- 200 graceful restart rounds with correct GOAWAY retry and no duplicate side effect;
- preserved public error class, code, abort reason, and timeout reason; and
- post-suite quiescence at no more than baseline plus three descriptors, baseline plus one TCP
  connection, zero pending callback, and zero HTTP/2 streams.

## 7. Lifecycle implementation requirements

Route timeout, abort, stream error, socket close, and shutdown through one idempotent finalizer. The
first terminal reason wins; later contenders remain secondary diagnostics. Remove request timers and
listeners, settle callbacks, finalize body and stream disposition, perform the narrowest
protocol-appropriate close, and decide pool eligibility last.

Reuse HTTP/1 only after a complete message boundary with no parser or framing error. Cancel HTTP/2
at stream scope unless transport, TLS, protocol, GOAWAY, or connection-level flow-control evidence
invalidates the session. Give every pause and every body lease a named owner and bounded end state.

## 8. Root-cause attribution

Repeat the same deterministic fault schedule through four progressively smaller layers:

1. full application;
2. minimal program using the candidate library;
3. minimal program using only runtime core APIs; and
4. raw transport across both direct and production-like infrastructure paths.

Classify only from differential evidence:

| Class | Confirmation | Primary action |
| --- | --- | --- |
| Application | Full app reproduces, minimal library handler does not, and retainers point to app maps, listeners, timers, closures, bodies, or callbacks | Fix lifecycle ownership and body consumption; temporarily isolate or limit the suspect endpoint |
| Library | Minimal library program reproduces, core-only program does not, or a library-version bisect identifies the boundary | Upgrade to a fixed release, apply a bounded vendor fix, or exactly pin the last known good version |
| Runtime | Core-only program reproduces and runtime-version evidence identifies a fix or regression | Upgrade to the fixed runtime or exactly pin the last known good runtime after compatibility tests |
| Environment | Direct path is clean but a load balancer, mesh, NAT, firewall, kernel, container, or proxy path reproduces with packet or configuration evidence | Correct timeout, keep-alive, conntrack, descriptor, NAT, or proxy-buffering policy; do not hide it with indiscriminate destroy calls |

An unconsumed body is an application defect when the library contract requires consume or cancel
and the caller does neither. It becomes a library defect only when documented cancellation still
leaves the pool slot or HTTP/2 stream retained.

## 9. Mitigation and containment decisions

Treat these as default incident thresholds only when adopted by the owning operational policy:

- above 70% of the process resource budget, or under six hours to projected exhaustion, halve
  suspect concurrency and limit new-connection rate and request-body size;
- above 85%, or under 30 minutes to exhaustion, stop new admission, drain gracefully, then restart;
- isolate a request when it can retain over 5% of process memory, a paused HTTP/2 stream reduces
  sibling throughput by over 10%, or one tenant holds over 20% of pool capacity for a sustained
  period; and
- use separate workers, pools, tenant sessions, or bounded queues for the isolation boundary.

A restart, traffic limit, or exact-version pin can prevent exhaustion while root cause remains. Mark
it as mitigation, not permanent resolution. Never leave periodic restarts as the only long-term
design when retained ownership still grows monotonically.

## 10. Resolution claim gate

Call the issue permanently resolved only when all applicable evidence exists:

1. The deterministic reproducer fails 20 of 20 runs before the fix. For a probabilistic defect,
   run at least 30,000 pre-fix trials and require the lower bound of its 95% failure-rate confidence
   interval to exceed the declared failure threshold.
2. The same reproducer succeeds 20 of 20 runs after the fix. For a probabilistic lane, require zero
   failures in at least 30,000 post-fix trials. Run the full correctness suite three times with
   independent seeds and preserve throughput, p99, CPU, integrity, and callback gates.
3. Each applicable fault passes a six-hour soak and the mixed profile passes 24 hours. If the
   historical median time to failure exceeds eight hours, use the longer of 24 hours or three times
   that median. Accelerating event count does not waive the 24-hour wall-clock floor for this gate.
4. Retained objects, open handles, version bisect, or reproducible infrastructure mechanics identify
   the owner and causal path.

If only the reproducer is green, report a fix candidate. If soak passes without causal ownership,
report symptom suppression or partial evidence. If traffic limits or restart flatten the graph,
report mitigation. Never label unavailable long-running, packet, heap, native-handle, or
production-path evidence as passed; keep it manual-only or missing under the selected repository's
command contract.
