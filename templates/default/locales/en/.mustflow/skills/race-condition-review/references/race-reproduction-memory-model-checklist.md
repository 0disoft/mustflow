# Race Reproduction and Memory-Model Checklist

Use this reference for intermittent races, native-thread incidents, synchronization primitive
selection, lock-free structures, or linearizability claims. Keep tool execution inside the selected
repository's configured command contract.

## Contents

1. [Defect classification](#defect-classification)
2. [Forbidden outcome and incident capsule](#forbidden-outcome-and-incident-capsule)
3. [Ownership and backing-storage map](#ownership-and-backing-storage-map)
4. [Deterministic actor harness](#deterministic-actor-harness)
5. [Schedule exploration and replay](#schedule-exploration-and-replay)
6. [Schedule-aware observability](#schedule-aware-observability)
7. [Primitive selection](#primitive-selection)
8. [Publication and memory ordering](#publication-and-memory-ordering)
9. [CAS, ABA, and reclamation](#cas-aba-and-reclamation)
10. [Linearizability](#linearizability)
11. [Environment and optimization matrix](#environment-and-optimization-matrix)
12. [Failure and evidence matrix](#failure-and-evidence-matrix)
13. [Skill handoffs](#skill-handoffs)

## Defect classification

Do not use one word for every timing failure:

| Class | Mechanical oracle | Evidence boundary |
| --- | --- | --- |
| logical race condition | a forbidden business, lifecycle, or ordering outcome | may exist without conflicting unsynchronized memory access |
| data race | runtime-specific conflicting memory access without the required synchronization | a clean dynamic run covers only the executed path and schedule |
| lifetime violation | access after release, reuse, close, or reclamation | atomic pointer updates do not prove object lifetime |
| deadlock | a reachable wait-for cycle with no permitted progress | a hang can instead be starvation, lost notification, or blocked I/O |
| starvation or livelock | bounded work repeatedly fails to make required progress | final state alone may not show the failure |
| ordering failure | an event, callback, message, or state transition violates its declared order | timestamps do not establish cross-actor visibility |

A detector can confirm the class it observes. It cannot prove all logical invariants or every
downstream impact, and passing one detector does not validate unexecuted schedules.

## Forbidden outcome and incident capsule

Turn the symptom into a stable predicate before debugging:

- name the invariant and one result that must not occur;
- include operation results, not only final counters;
- distinguish timeout, crash, detector report, invalid history, and assertion failure;
- preserve the original input before minimizing it;
- require minimization to retain the same failure key and earliest meaningful checkpoint.

Capture a reproduction capsule:

| Surface | Fields |
| --- | --- |
| source and binary | source revision, executable hash, symbols hash, linked-library identity |
| build | compiler, linker, flags, optimization, assertions, sanitizer or detector configuration |
| runtime | OS, runtime version, architecture, CPU count, scheduler mode, allocator |
| test | target, actor count, input, timeout, iteration, oracle version |
| schedule | deterministic gate sequence, scheduler seed, actual decision trace, forced yields |
| environment | relevant variables, locale, timezone, affinity, container or VM shape |
| observation | failure key, earliest checkpoint, actor-local trace, synchronization edges |

Store exact replay evidence through the repository's existing artifact policy. Do not introduce raw
logs, binaries, or private data into version control merely because the capsule calls for them.

## Ownership and backing-storage map

Map ownership before reading mutex code:

| Object or invariant | Created by | Read by | Written by | Transferred to | Retired by | Protection |
| --- | --- | --- | --- | --- | --- | --- |
| one concrete surface | actor or component | actors | actors | handoff rule | lifecycle owner | lock, transaction, message, atomic, or undefined |

Follow actual backing storage rather than variable names:

- aliases, views, slices, iterators, shared buffers, mapped regions, pooled objects, and shallow
  copies can name the same mutable bytes;
- `const`, `final`, and read-only interfaces may protect a reference while reachable state changes;
- getters, caches, counters, lazy fields, hashing, logging, and reference tracking can write;
- file offsets, sockets, process environment, working directory, signal state, database rows,
  distributed leases, and provider resources are shared state even outside process memory;
- lifecycle transitions such as initialize, publish, cancel, close, detach, destroy, and reclaim
  deserve separate owners and synchronization rules.

Protect the invariant, not each field. Several individually atomic fields can still expose a
combination that the specification forbids.

## Deterministic actor harness

Prefer the smallest harness that can decide the forbidden outcome:

- keep two or the minimum required actors;
- keep one shared object or durable record;
- use an arbiter that observes all actor results and asserts the invariant;
- start actors from a barrier so setup order does not masquerade as concurrency;
- place named gates at the meaningful race window;
- reset every shared surface between schedules;
- join or cancel every actor before the next case.

Example schedule shape, expressed as evidence rather than executable code:

1. actor A reads generation 7 and pauses;
2. actor B replaces the object with generation 8 and completes;
3. actor A resumes its conditional action;
4. the arbiter rejects any accepted generation-7 effect.

Delay after the shared read, validation, removal, cancellation check, publication flag, or
compare-and-swap load. A delay at an unrelated function entry burns time without widening the
critical window.

## Schedule exploration and replay

Use a hierarchy of evidence:

1. force the suspected order with explicit gates;
2. explore bounded schedules systematically when a model scheduler exists;
3. perturb synchronization boundaries with recorded randomized decisions;
4. replay a captured real failure when platform support and policy permit it;
5. use repeated stress only as supplementary search evidence.

Preserve the actual decision trace in addition to the seed. A seed can produce a different schedule
when actor counts, timer events, random-call counts, or runtime versions change.

Minimize two dimensions independently:

- input minimization removes unrelated objects, commands, requests, and state transitions;
- schedule minimization removes actors, context switches, yields, gates, and delay decisions.

Reject a reduction that changes a data race into a timeout, a lifetime failure into an assertion,
or the earliest violated invariant into a different one.

## Schedule-aware observability

A contended global logger can create synchronization and hide the race it is meant to observe.
Prefer a bounded per-actor ring buffer with compact events such as:

- actor-local monotonic sequence;
- actor or task identity;
- object identity and generation;
- operation and checkpoint;
- observed value or result class;
- synchronization object identity;
- request, transaction, message, or transition identity.

After failure, construct a happens-before graph from:

- actor-local program order;
- mutex unlock to the next successful lock;
- release operation to the acquire that observes it;
- channel send to the corresponding receive under that channel's contract;
- task creation, completion, join, and cancellation acknowledgement;
- queue publication to delivery claim;
- durable transaction commit to the version read that observes it.

Wall-clock order is supporting metadata. It is not proof that another actor was allowed to observe a
write.

## Primitive selection

| Need | Suitable direction | Frequent mistake |
| --- | --- | --- |
| exclusive ownership of a critical invariant | mutex or single owner | binary semaphore used despite missing owner-bound release |
| capacity limit | semaphore | assuming permits also protect pool membership or slot identity |
| wait until a predicate changes | condition plus predicate under one mutex | treating a signal as durable state or waiting outside a loop |
| deliver a value or transfer ownership | immutable message, deep copy, or enforced move | sending a pointer while the sender keeps mutating it |
| confirm receiver processing | explicit acknowledgement or result future | treating buffered send completion as processing completion |
| publish one immutable snapshot | atomic pointer plus valid memory ordering and lifetime | assuming pointer atomicity protects reachable mutation or reclamation |
| update one scalar | atomic read-modify-write | splitting a multi-field invariant across unrelated atomics |
| serialize one business key | per-key owner, transaction, or conditional update | one global lock or process-local lock for multi-instance truth |

Give channel close authority to one coordinator when several producers exist. Collect producer
completion separately, then close once. Explain every shared state's synchronization path as one
continuous edge; mixing mutex, atomic, and channel access does not connect them automatically.

Keep external effects out of retryable compare-and-swap loops. A failed compare-and-swap may repeat
the calculation, and its failure ordering still governs any value read on the failed path.

## Publication and memory ordering

For payload publication, identify:

1. ordinary writes that initialize the payload;
2. the release operation that publishes readiness;
3. the acquire operation that observes the published value;
4. the exact value-transfer relationship connecting them;
5. the lifetime rule keeping the payload valid through the reader's use.

A relaxed atomic is atomic for that object but does not order unrelated payload accesses. Several
atomics do not combine into one transaction. Check success and failure memory ordering separately
for compare-and-swap loops, especially when the failed value is dereferenced.

Use small memory-model tests with a few actors and a table of allowed and forbidden outcomes. Do not
bury publication validation inside a large queue or application integration test.

## CAS, ABA, and reclamation

Audit equality and lifetime separately:

- a pointer address can be reused for a different object;
- a version or stamp distinguishes reuse only until it wraps;
- calculate whether the chosen tag width can wrap within the supported update rate and lifetime;
- force rapid address reuse with a bounded test allocator or pool;
- keep a reader paused while another actor removes, retires, and attempts to reclaim the object;
- measure memory backpressure when a slow reader delays reclamation.

For hazard-style protection, require the reader to publish protection and then re-read the source.
If the source changed, retry before dereference. For epoch or grace-period schemes, prove that no
retired object is reused before all earlier readers exit, and bound retained memory when a reader
stalls.

Route general allocation, ownership, and use-after-free analysis through `memory-lifetime-review`.
Keep this skill focused on the interleaving and synchronization that make reclamation unsafe.

## Linearizability

Final size or final checksum can pass even when intermediate operation results are impossible.
Capture each operation's invocation, response, input, output, and real-time precedence. Name the
single instruction, transaction, or durable conditional write where the operation takes effect.

Validate whether the completed history can be ordered against a sequential reference model while
preserving non-overlapping real-time precedence. If no valid ordering exists, the history is not
linearizable. If the state space is too large, shrink operations and actors before weakening the
oracle.

## Environment and optimization matrix

Treat environment as part of the reproduction contract:

- one core versus multiple cores;
- under-subscription and over-subscription;
- architecture and memory model;
- debug, release, assertions, and supported optimization levels;
- supported compilers and runtime versions;
- allocator and object-pool configuration;
- timer source, scheduler, affinity, container, VM, and NUMA shape when material.

One environment passing does not prove other supported environments. Use only configured build,
test, sanitizer, scheduler, or replay intents; otherwise report the missing lane as manual evidence.

## Failure and evidence matrix

| Scenario | Required observation |
| --- | --- |
| two actors read the same precondition | the arbiter rejects double success or proves one atomic winner |
| close overlaps callback or send | no post-close effect, use, or duplicate close escapes |
| publication flag is observed | initialized payload visibility follows a valid ordering edge |
| compare-and-swap retries | external effect occurs only for the winning logical operation |
| address is removed and reused | stale actor cannot treat the new object as the old identity |
| slow reader blocks reclamation | object stays live and retained memory remains bounded or alerted |
| condition notification arrives early | persistent predicate still lets the waiter progress |
| buffered message send completes | code does not claim receiver processing without acknowledgement |
| detector run is clean | report only executed-path detector evidence, not universal race safety |
| random schedule fails | seed plus decision trace replays the same forbidden outcome |
| minimized schedule passes | reject the reduction and restore the last failure-preserving schedule |
| final state looks correct | operation history still satisfies the declared sequential model |

## Skill handoffs

- Use `concurrency-invariant-review` for broad ownership, primitive discipline, deadlock, starvation,
  and multi-resource invariant design.
- Use `async-timing-boundary-review` when fixed delays, readiness, event-loop turns, rendering, or
  eventual consistency are the primary problem.
- Use `structured-concurrency-supervision-review` for parent-child task ownership, join,
  cancellation propagation, and orphan prevention.
- Use `memory-lifetime-review` for general use-after-free, retention, native resource, and allocator
  lifetime analysis.
- Use `two-phase-transition-integrity-review` for prepare-and-commit authority handoffs with epochs
  and fencing.
- Use the relevant database, queue, idempotency, security, or filesystem skill when the race crosses
  that durable boundary.
