# Cross-Runtime Memory and Stream Reproduction Harness

Use this reference when a memory, external-buffer, stream-queue, socket, file-descriptor, handle,
or allocator symptom must be reproduced across Node-compatible runtimes such as Node.js and Bun.
Use the main skill first for ownership and diagnosis. Use this reference to design the controlled
process harness and comparison evidence.

## Contents

1. [Freeze the comparison boundary](#1-freeze-the-comparison-boundary)
2. [Separate observer and target processes](#2-separate-observer-and-target-processes)
3. [Run explicit lifecycle phases](#3-run-explicit-lifecycle-phases)
4. [Collect a non-overlapping metric ledger](#4-collect-a-non-overlapping-metric-ledger)
5. [Change one factor per comparator](#5-change-one-factor-per-comparator)
6. [Make result identity reproducible](#6-make-result-identity-reproducible)
7. [Compare slopes, floors, and conservation](#7-compare-slopes-floors-and-conservation)
8. [Separate runtime, adapter, and operating-system cells](#8-separate-runtime-adapter-and-operating-system-cells)
9. [Narrow application versus runtime ownership](#9-narrow-application-versus-runtime-ownership)
10. [Require causal fix evidence](#10-require-causal-fix-evidence)
11. [Keep commands and artifacts bounded](#11-keep-commands-and-artifacts-bounded)
12. [Acceptance gate](#12-acceptance-gate)

## 1. Freeze the comparison boundary

Start with one source program that uses only the compatibility surface shared by every target
runtime. For a Node-compatible HTTP stream symptom, keep the request, response, Buffer,
EventEmitter, chunk production, consumer delay, cancellation, and accounting logic identical.

Do not replace the application API and runtime in the same comparison. If a native server adapter
such as `Bun.serve` is suspected, first establish the shared `node:http` comparator. Change only the
server adapter in the next cell. Otherwise an API difference, application rewrite, and runtime
difference become one confounded observation.

Freeze before measuring:

- scenario and expected terminal outcome;
- payload, chunk size, burst size, production rate, consumer rate, and compression;
- concurrency, connection reuse, retries, cancellation schedule, and total offered work;
- observation interval, warmup, load duration, quiescence interval, and stop deadline;
- runtime flags, allocator settings, container limits, CPU quota, and cache state;
- measurement schema, thresholds, normalization, repetitions, and statistical rule.

Treat an exploratory threshold as a trigger for a narrower experiment, not as a portable proof.
Queue, retained-memory, and RSS thresholds depend on chunk size, concurrency, runtime, allocator,
host pressure, and instrumentation overhead.

## 2. Separate observer and target processes

Use a fixed observer process to launch and sample separate server and client target processes. Keep
the observer runtime and implementation unchanged while target runtimes or versions vary.

The process split should preserve evidence when either target exits, crashes, is cancelled, or is
forcibly terminated. Use loopback or an equivalently isolated local transport unless the production
network path is the variable under study. Start every measured run in fresh target processes so
allocator and runtime state from a previous case does not contaminate the next case.

Keep three ledgers distinct:

| Ledger | Owner | Examples |
|---|---|---|
| Observer | Fixed harness process | target identity, OS samples, deadlines, result writing |
| Server target | Runtime under test | response queues, accepted writes, sockets, request lifecycle |
| Client target | Runtime under test | readable queues, consumed bytes, cancellation, client sockets |

Do not count observer timers, pipes, handles, listeners, or output buffers as target resources. Do
not let a killed client destroy the only copy of the server or OS evidence.

## 3. Run explicit lifecycle phases

Use the same ordered phases for every measured run:

| Phase | Required action | Evidence |
|---|---|---|
| Baseline | Start targets, complete runtime initialization, perform only configured or manual GC, then sample | Memory floors, sockets, descriptors or handles, listeners, timers |
| Warmup | Exercise enough work to initialize JIT, pools, parsers, and caches without entering the measured interval | Warm state and any one-time growth |
| Load | Run exactly one fixed case and sample at a declared cadence | Slopes, peaks, throughput, queue and request maxima |
| Admission stop | Stop creating new work while keeping targets alive | Closed cohort and remaining in-flight work |
| Drain or cancellation | Consume, cancel, disconnect, or kill according to the case | Terminal outcomes and resource-release progress |
| Quiescence | Wait a bounded interval for close, abort, error, native release, and pool expiry | Post-quiescent floor and unresolved owners |
| Post-GC observations | When supported and authorized, take at least two separated observations | Reachable heap or external retention versus delayed reclamation |
| Shutdown | End targets through the case-specific path and preserve the observer result | Exit status, final resource counts, incomplete cleanup |

Mark GC support per runtime and run. Exclude unsupported or failed GC phases from GC-retention claims
instead of treating them as zero. A forced collection is a diagnostic separator, not an application
cleanup mechanism.

## 4. Collect a non-overlapping metric ledger

Record runtime-internal and independent OS observations together, but preserve their semantics.

| Metric | What it supports | What it does not prove |
|---|---|---|
| Runtime RSS | Process resident growth as reported by the runtime | JavaScript leak or allocator cause |
| OS resident or working set | Independent process-residency observation | Live ownership or reclaimability |
| `heapUsed` | Managed heap currently used according to the runtime | Buffer, kernel, or all native ownership |
| `heapTotal` | Managed heap capacity reserved by the runtime | Live heap or leak size |
| `external` | Runtime-defined memory associated with managed objects | Every native allocation |
| `arrayBuffers` | Runtime-defined ArrayBuffer and Buffer backing-store memory | Cross-runtime identical accounting |
| Active socket registry | Application-observed live sockets | Kernel `TIME_WAIT` or every handle |
| File descriptors | Open files, sockets, pipes, and other descriptors | Exact leaked resource type without classification |
| Windows handle count | Open process handles across Windows object types | Socket count or Unix-FD equivalence |
| Active resource types | Runtime resource-type summary that may keep the event loop alive | Concrete handle identity or full OS inventory |
| Listener and timer ledger | Harness-known registrations and pending scheduled work | Every runtime-internal callback |
| Readable and writable queue lengths | Visible stream-layer queued bytes or objects | Kernel, TLS, parser, or hidden native queues |
| Per-request queue maximum | A single request or stream dominating memory | Whole-process memory |
| Open and terminal event counts | Missing lifecycle settlement or close imbalance | Cause without owner and path evidence |

For Node.js, `arrayBuffers` is included in `external`; do not add them as disjoint totals. Confirm
equivalent fields against the target runtime version because a Node-compatible API name does not
guarantee identical engine accounting. In object mode, queue lengths may count objects rather than
bytes; record the unit.

Track at least produced, accepted, committed or consumed, cancelled, discarded, and released bytes.
Keep server and client totals separate. A produced-minus-consumed gap can reside in application,
stream, runtime, kernel, or discarded work, so localize it with per-edge queues and terminal events.

## 5. Change one factor per comparator

Use paired cases that isolate one causal question:

| Comparator | Only changed factor | Question |
|---|---|---|
| Paced producer / fast producer | Production interval | Does producer rate trigger the symptom? |
| Fast consumer / slow consumer | Consumer delay | Does sink speed expose backlog? |
| Obey backpressure / ignore backpressure | Production admission after backpressure | Is growth application-created buffering? |
| Finite stream / continuing stream | Terminal production bound | Does cleanup depend on natural completion? |
| Graceful completion / mid-stream cancel | Cancellation schedule | Does abort cleanup release every owner? |
| One cancel / repeated reconnect | Lifecycle repetition | Does each completed cycle leave residue? |
| Graceful peer exit / forced peer loss | Peer termination mode | Does abrupt loss break finalization? |
| Fixed low / medium / high concurrency | Concurrency | Is cost linear, bounded, or explosive? |

A concurrency ramp is useful for finding a threshold, but it changes load continuously. Use it only
for exploration. Re-run fixed cells on both sides of the discovered threshold before attributing
cause.

The ignore-backpressure case is an intentional positive control, not a healthy implementation. It
should demonstrate that the harness can detect a growing visible queue. The obey-backpressure case
should plateau within a predeclared envelope and resume after drain.

## 6. Make result identity reproducible

Write a versioned allowlisted result manifest with:

- scenario name and configuration hash;
- absolute target binary identity represented safely, binary digest, runtime version, and runtime
  revision or build identifier when available;
- observer build identity and result-schema version;
- operating-system release, architecture, CPU count, memory limit, container or cgroup boundary,
  allocator class, and relevant runtime flags;
- payload, chunk, burst, production, consumer, concurrency, cancellation, and duration settings;
- warmup count, measured repetitions, order block, sample cadence, and GC support;
- terminal outcomes, throughput, queue maxima, slopes, post-quiescent floors, and evidence gaps.

Do not emit unrestricted arguments, environment variables, paths, URLs, headers, payloads, or
credentials. Store logical path labels or allowlisted environment fields. Treat NDJSON, heap,
allocation, trace, packet, and native-profile artifacts as sensitive evidence.

Reject a same-case runtime comparison when configuration hashes differ. For an intentional paired
case, allow the declared factor and reject every undeclared difference. A multi-factor exploratory
run may guide the next test but cannot prove a cause.

## 7. Compare slopes, floors, and conservation

Compare server and client separately. Use raw samples and report at least:

- runtime and OS residency slopes during the fixed load phase;
- managed heap, external, and ArrayBuffer slopes and post-quiescent deltas;
- visible stream-queue slope, maximum total queue, and maximum per-request queue;
- active sockets, descriptors or handles, listeners, timers, and open-minus-terminal counts;
- produced, accepted, committed or consumed, cancelled, discarded, and released byte differences;
- throughput-normalized memory growth when runtimes complete materially different work;
- median, dispersion, practical threshold, uncertainty decision, and rejected outliers.

Do not call a faster runtime leakier merely because it processed more bytes in the same wall time.
Preserve absolute memory and memory per completed unit. Likewise, a slower candidate is not fixed if
it merely produces fewer bytes before the deadline.

Use interleaved or randomized comparison blocks on the same machine when feasible. Avoid running
every old-runtime sample before every new-runtime sample because temperature, CPU boost, file cache,
system load, and memory pressure drift with time. Never rerun until a favorable sample appears.

Require conservation within a declared snapshot tolerance. Examples include started equals terminal
plus in-flight, accepted writes equal settled writes plus pending writes, and reserved bytes equal
current plus released or terminally discarded bytes.

## 8. Separate runtime, adapter, and operating-system cells

Build the matrix in layers:

1. Compare the same compatibility-source case on the problem runtime and a control runtime.
2. Compare the problem runtime with the immediately relevant prior or candidate build.
3. Change only the server adapter, such as compatibility HTTP versus a native server surface.
4. Change only the protocol layer, such as HTTP versus a raw TCP stream.
5. Repeat the same bad and good pair on a second representative operating-system cell.

Keep Linux glibc, Linux musl, container or cgroup Linux, macOS architectures, Windows architectures,
and WSL as distinct environment cells. Compare absolute RSS only within compatible OS,
architecture, allocator, and resource-limit boundaries. WSL is a Linux kernel environment for this
purpose, not a Windows IOCP cell.

Record allocator and memory-limit evidence. A stable managed heap with elevated RSS can reflect
allocator residency or unmeasured native ownership, but this pattern alone does not distinguish the
two.

## 9. Narrow application versus runtime ownership

Use the smallest next single change supported by the result:

| Observation | Next boundary |
|---|---|
| Ignore-backpressure grows on all runtimes; obey case is bounded | Application admission and queue policy |
| Shared compatibility source fails on only one runtime | That runtime's compatibility HTTP, stream, or socket bridge |
| Compatibility and native server adapters both fail | Shared stream, socket, allocator, or engine layer |
| Only the native server adapter fails | Native response sink, abort, and backpressure path |
| Raw TCP also fails | HTTP parser is below the likely boundary; inspect TCP, buffer, poller, or event loop |
| Raw TCP is bounded | HTTP request, response, parser, or adapter lifecycle |
| Fresh Buffer allocation fails but reuse is bounded | Backing-store allocation and release path |
| Buffer reuse also fails | Request, stream, socket, or hidden queue ownership |
| Descriptors or handles remain after close | Socket, poll, watcher, file, or process-resource finalization |
| All owned resources return but RSS remains | Allocator or unmeasured native-memory diagnostics |

Classify the owner as application, library or adapter, runtime, dependency, allocator, operating
system, or unresolved. A green case at one layer only removes hypotheses that the comparator
actually held constant.

## 10. Require causal fix evidence

A symptom disappearing in a newer runtime is a candidate signal, not root-cause proof. Large runtime
or engine changes can alter allocator behavior, HTTP implementation, throughput, scheduling, and
object lifetime together.

For a permanent-resolution claim, require where feasible:

- exact last-bad and first-good build identities and binary digests;
- comparable completed work and the healthy control case remaining healthy;
- a narrowed runtime or dependency change interval;
- the candidate change applied to the bad base and the symptom removed;
- the candidate change removed from the good base and the symptom restored;
- upstream cause identity for vendored engine, allocator, parser, or event-loop changes;
- a regression guard on bounded queues, post-quiescent ownership, and resource return rather than
  an RSS-only literal threshold;
- repeated results and at least one second relevant environment cell.

If patch and revert builds are unavailable, report the result as version-localized or a fix
candidate. Do not upgrade the claim to causal resolution.

## 11. Keep commands and artifacts bounded

This reference does not authorize launching servers, load generators, child-process campaigns,
runtime downloads, profilers, packet tools, heap snapshots, dependency installs, network calls, or
long-running loops. Map execution to configured one-shot command intents. Mark unavailable runtime,
OS, profiler, or soak cells as manual-only or missing.

When authoring a durable repository harness, follow the repository's supported scripting runtime and
place it under the repository's declared test or tooling boundary. Give every run a hard deadline,
closed stdin, output cap, process-tree cleanup, isolated output directory, and maximum memory or
workload safety stop. Preserve the primary failure if cleanup also fails.

Do not claim an attachment-linked or external harness file exists in the repository unless its bytes
were supplied and admitted as a source artifact. A prose design can justify a reference contract,
not an executable harness implementation.

## 12. Acceptance gate

Accept the reproduction design only when:

- observer, server, client, and OS evidence owners are separated;
- shared-source runtime comparison changes no application behavior;
- lifecycle phases and closed-cohort termination are explicit;
- metric units do not overlap or silently change across runtimes;
- every paired comparator declares exactly one changed factor;
- result identity includes runtime build and configuration evidence;
- comparison uses repeated raw samples, dispersion, and completed-work normalization;
- environment cells are compared within compatible boundaries;
- application, adapter, runtime, allocator, and OS attribution remains no broader than the evidence;
- a newer green version is not called causal without last-bad, first-good, and forward or reverse
  change evidence;
- unconfigured runtime, load, GC, profiler, packet, and OS diagnostics remain manual-only or missing;
- sensitive result artifacts have a versioned allowlisted schema and bounded retention.

## Primary references

- Node.js process memory and active-resource documentation
- Node.js stream backpressure and queue introspection documentation
- Bun runtime and memory-profiling documentation for the exact target version
- Operating-system process-memory, descriptor, and handle documentation for the tested cell

Verify version-sensitive behavior against the exact runtime build under test. A compatibility API
name is not evidence that two engines report memory or resource state identically.
