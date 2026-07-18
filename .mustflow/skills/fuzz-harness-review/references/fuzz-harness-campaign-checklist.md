# Fuzz Harness and Campaign Checklist

Use this reference when `fuzz-harness-review` reaches target partitioning, input modeling,
instrumentation, feedback features, corpus maintenance, campaign diversity, stateful sequences,
failure injection, or artifact triage. Treat tool flags as examples to verify against the pinned
tool version, not as command authority.

## Contents

1. Target matrix and reachability
2. Iteration determinism and reset
3. Oracle matrix
4. Input models and mutation lanes
5. Instrumentation and feedback
6. Corpus, dictionary, and regression seeds
7. Streaming, stateful, and failure-injection inputs
8. Campaign diversity and plateau diagnosis
9. Artifact reproduction and bounded regression
10. Primary anchors

## 1. Target matrix and reachability

Build targets around the narrowest semantic boundary that can fail independently. Record for every
target:

- target name, owning module, entrypoint, and build identity;
- input representation and maximum bytes, nodes, depth, operations, or messages;
- expensive initialization outside the loop and mutable state reset inside it;
- stage reached: decode, parse, validate, normalize, serialize, execute, persist, or transmit;
- side effects and the fake, in-memory, transactional, or rollback boundary that contains them;
- oracle classes and resource counters;
- instrumented modules and excluded modules;
- seed, dictionary, mutator, and artifact-decoder versions; and
- configured smoke, corpus replay, sanitizer, coverage, or manual campaign owner.

For a parser or protocol family, consider this matrix:

| Target | Input model | Main purpose | Common starvation risk |
| --- | --- | --- | --- |
| Raw decoder or parser | arbitrary bytes | malformed framing, progress, recovery, memory safety | none; may remain shallow |
| Streaming parser | bytes plus chunk schedule | partial input, EOF, retry, state carry | chunk schedule not preserved |
| Parse and validate | raw bytes | syntax-to-semantic boundary | parser rejection dominates |
| Normalize or canonicalize | valid or near-valid object | idempotence and invariant preservation | raw malformed paths absent |
| Serializer | bounded structured object | size, writer, invalid object combinations | byte decoder rejects objects |
| Parse-serialize-parse | raw and structured lanes | semantic round trip and canonical stability | byte equality false positives |
| Inner payload | decoded structure | deep semantic or execution behavior | outer validation bypassed |
| Outer envelope | real wire framing | signature, checksum, compression, auth, integration | expensive and rejection-heavy |
| Stateful sequence | operation list plus payloads | transition, replay, transaction, session bugs | single-message mutation |
| Initialization | configuration or first input | setup and teardown failures | optimized hot-loop target skips it |

Do not hide one target behind a mode byte when the modes have unrelated corpora, state, speed, or
oracles. Split them unless sharing materially improves crossover without causing one path to starve
the others.

Measure stage reach rather than only executions per second. A fast target that exits at the first
magic check may have lower useful execution rate than a slower target that reaches semantic code.

## 2. Iteration determinism and reset

Write an iteration-state ledger:

- arenas, heaps, pools, caches, interners, registries, singletons, and lazy initialization;
- cursors, parser state, protocol session, authentication state, transaction state, and file offsets;
- clock, timezone, locale, randomness, hash seed, process environment, hostname, and DNS;
- temporary directories, files, sockets, pipes, shared memory, and database fixtures;
- threads, tasks, callbacks, timers, signals, child processes, and outstanding I/O;
- fault-injection counters and allocation, read, write, retry, or disconnect schedules; and
- logs, metrics, trace exporters, crash handlers, and global error status.

For each mutable item, name reset, recreation, snapshot restore, or process-isolation ownership.
Immutable initialization may stay outside the loop. Input-derived state may not.

Make environment branches deterministic without erasing them. Prefer an input-controlled adapter:
the artifact selects clock, locale, RNG seed, fixture, short-read point, or allocation failure.
A hard-coded environment is stable but cannot explore environment-dependent behavior.

Test replay from:

1. the same process after unrelated prior inputs;
2. a clean process;
3. a different worker with the same build identity; and
4. the minimized artifact.

Normalized outcome, oracle class, and meaningful coverage should agree. If only a prior input makes
the artifact fail, save the prefix sequence temporarily and classify the state leak before shrinking.

Persistent mode is a performance technique, not evidence that reset is correct. Watch stability or
equivalent repeated-input features and treat material instability as wasted search and unreliable
artifacts.

## 3. Oracle matrix

Coverage tells the fuzzer which input is interesting. The oracle decides whether behavior is wrong.
Keep the two ledgers separate.

### Memory and runtime oracles

- address, bounds, use-after-free, double-free, leak, undefined-behavior, race, uninitialized-read,
  assertion, panic, and language-runtime checks;
- debug-with-assertions and release-like optimized configurations when semantics can diverge;
- distinct sanitizer or detector campaigns when tools are incompatible or impose different costs;
- deterministic failure classification independent of renderer wording.

### Contract oracles

- success never consumes beyond input and repeated success does not consume zero indefinitely;
- failure leaves cursor, output, transaction, session, and side-effect state within contract;
- `encoded_size` equals actual bytes written for exact capacity;
- one-byte-short, exact, and one-byte-large buffers obey writer policy;
- parse and serialize preserve declared semantics, not incidental byte ordering or whitespace;
- canonical output stabilizes after one normalization or parse-serialize cycle;
- strict and compatibility modes respect their separate contracts;
- unknown field, duplicate field, invalid enum, NaN, negative zero, ordering, and normalization
  policies remain explicit;
- same initial state and input produce the same normalized result.

### Differential oracles

Normalize accepted status, semantic tree or object, field multiplicity, consumed length, trailing
bytes, numeric overflow, Unicode form, error location, and externally visible side effects. Compare
only fields the shared contract defines.

A disagreement is a triage candidate, not majority proof. Separate:

- specified disagreement that proves a defect;
- unspecified or implementation-defined behavior;
- compatibility-mode difference;
- diagnostic-rendering noise;
- versioned intentional change; and
- harness normalization bug.

### Resource oracles

Instrument work units, transitions, byte revisits, comparisons, backtracking, allocations, retained
bytes, output bytes, nodes, depth, operations, messages, retries, and elapsed CPU where available.
Use both absolute ceilings and input-relative growth limits.

Wall-clock timeout, RSS limit, and single-allocation limit remain useful final guards, but machine
load makes them weak primary regression oracles. Preserve timeout and OOM artifacts with their
counter evidence.

## 4. Input models and mutation lanes

Map every barrier to an input lane.

### Raw lane

Mutate bytes without repairing syntax. This owns malformed encoding, length, delimiter, checksum,
partial token, parser progress, error recovery, and boundary memory safety.

### Structured lane

Decode to a bounded object, AST, message, operation list, or purpose-built intermediate form. Mutate
fields, enum values, optional presence, repeated elements, subtrees, nesting, and sequence structure,
then serialize deterministically.

The structured decoder and serializer must be total for bounded input, reject impossible sizes
before allocation, and make progress. Shared production recognition logic can reproduce the same bug
in generator and target; keep critical test decoding simple or independently checked.

### Repair, mismatch, and overflow lanes

- Repair: update all dependent lengths, offsets, checksums, compression frames, or test signatures
  so inner code remains reachable.
- Mismatch: corrupt exactly one dependency while preserving the rest to exercise validation,
  rollback, and error mapping.
- Overflow: bias declared and actual sizes around zero, one, signed and unsigned boundaries,
  maximum minus one, maximum, maximum plus one, alignment, varint length, chunk size, and depth.

Do not always repair and do not always corrupt. Either extreme starves a distinct class of behavior.

### Wrapped payload lane

For compression, encryption, or signatures, retain:

- an outer raw lane that exercises envelope parsing and validation;
- a wrapper mutator that decodes, mutates, and regenerates with test-owned keys or configuration; and
- an inner payload target that starts after the expensive gate.

Never store production keys or claim the inner target covers the outer validation.

### Metamorphic and generated relations

Use relations with explicit preconditions: reorder an unordered map, alter chunk partitions without
altering bytes, add grammar-neutral trivia, normalize twice, or serialize a semantically equal
object. Reject transformations whose precondition the generator cannot prove.

## 5. Instrumentation and feedback

Confirm instrumentation by module and frontier, not by a rising global number.

- List target-owned static libraries, shared libraries, generated code, plugins, subprocesses, and
  child runtimes.
- Confirm new features or program counters originate in the intended module.
- Use allowlists or blocklists to reduce dependency, logging, allocator, or runtime noise without
  excluding owned parsing or execution paths.
- When context or n-gram coverage expands the feature space, size the map or feature storage and
  measure collision or corpus growth.
- Do not instrument only the parent when work happens in an unobserved subprocess.

Match feedback to a named barrier:

| Barrier | Candidate feedback or change |
| --- | --- |
| Fixed magic, string, integer, or switch | dictionary, compare tracing, value profile |
| Input transformed before compare | transformation-aware comparison or structured lane |
| Coupled length, offset, checksum | repair and mismatch lanes |
| Same edges, different semantic state | stable domain feature or state identifier |
| Correct multi-message prefix required | sequence seeds and state feedback |
| Rare frontier seed is starved | rare-path or directed campaign lane |
| Feature explosion or instability | normalize, reduce, or remove noisy feature |
| No target features | repair instrumentation boundary |

Edge coverage is a cheap proxy. Value, compare, data-flow, context, AST-shape, state, or semantic
features may improve guidance but can slow execution and inflate the corpus. Measure feature growth,
collision or cardinality risk, corpus cost, and net frontier progress before assigning them broadly.

## 6. Corpus, dictionary, and regression seeds

Maintain a minimal seed basis, not an archive.

Each seed should open a distinct grammar construct, semantic state, protocol transition, error path,
or feedback feature. Prefer the shortest and fastest seed that retains that role. Record roles when
plain edge coverage would merge semantically distinct seeds.

Include small valid and invalid seeds. Starting empty can work for simple byte formats, but complex
grammars and state machines usually waste time relearning reachable prefixes.

Build dictionaries from:

- grammar terminals and delimiters;
- magic bytes, versions, extension ids, and enum spellings;
- field and command names;
- escape forms and special literals;
- comparison constants observed in target-owned code; and
- tokens that intentionally open error families.

Every entry must use the selected engine's current dictionary syntax. Huge arbitrary word lists add
mutation choices without opening structure.

Production-derived inputs require sanitization, minimization, and provenance. Remove credentials,
personal data, customer content, internal hosts, and secrets before version control. Prefer synthetic
equivalents when they preserve the same feature.

Retain every fixed crash, timeout, OOM, discrepancy, and invariant artifact that adds a distinct
regression. Corpus minimization may remove coverage duplicates, but it must not delete a seed whose
semantic or state feature is outside the minimizer's observation model.

## 7. Streaming, stateful, and failure-injection inputs

Encode the full reproduction schedule into the artifact.

For streaming, store or derive:

- payload bytes;
- read or chunk sizes, including zero or short chunks;
- retryable-error insertion points;
- EOF position and finalization calls;
- partial-write capacities and flush points; and
- decoder or parser mode options.

Compare one-shot, every short split, biased boundary splits, and randomized chunk schedules. The
same bytes must have equivalent meaning unless the API contract intentionally exposes delivery
boundaries.

For stateful targets, represent each artifact as an operation or message sequence. Mutate payloads
and sequence shape separately:

- insert, delete, duplicate, reorder, and replay;
- reconnect, reset, retry, and stale-token reuse;
- begin, commit, rollback, abort, and partial failure;
- authentication success and failure using test-owned identities;
- transport fault, timeout, short write, and disconnect.

A response code alone may not identify protocol state. Prefer an explicit stable state enum and
important flags. If using response or memory-derived state, normalize addresses, timestamps,
uninitialized padding, transient buffers, random ids, and other high-cardinality noise before
feature generation.

For fault injection, let artifact bytes select the N-th allocation, read, write, flush, commit,
network, or callback failure. Assert cleanup, rollback, cursor, retry, idempotency, and resource
release. Do not use random failure timing that cannot be replayed.

## 8. Campaign diversity and plateau diagnosis

Assign worker or campaign roles by hypothesis:

- baseline raw mutation;
- structured or grammar-aware mutation;
- repaired-envelope mutation;
- compare or value barriers;
- rare-path or directed frontier;
- stateful sequence exploration;
- sanitizer or detector axis;
- release-like optimized replay; and
- differential implementation or version comparison.

Do not assume more identical workers equal more search diversity. Record which lane contributes new
features and unique defects. Merge useful artifacts through an owned bounded process; avoid turning
one shared directory into an I/O bottleneck or nondeterministic triage source.

When coverage plateaus, inspect the last meaningful frontier and classify the next condition:

1. early validation rejects almost everything;
2. multi-byte comparison blocks progress;
3. dependent fields are broken by mutation;
4. payload is hidden by compression, encryption, or signature;
5. operation or message order is required;
6. global state or environment makes feedback unstable;
7. initialization dominates iteration time;
8. mutation units do not match semantic units;
9. target code is not instrumented or features collide;
10. frontier seeds receive too little mutation energy;
11. semantic progress occurs without a new edge; or
12. the path is unreachable under supported input.

Change the harness, input lane, feedback, seed, or dead-code decision that owns the barrier. Do not
treat longer runtime or more cores as a universal correction.

## 9. Artifact reproduction and bounded regression

An artifact record should bind:

- target and entrypoint identity;
- exact source and build identity;
- sanitizer, detector, oracle, optimization, and architecture axis;
- raw bytes plus structured decoder version;
- chunk, operation, environment, and fault schedule;
- expected normalized failure class;
- input and resource limits;
- original and minimized hashes; and
- triage status and duplicate relationship.

Reproduce first in a clean process with the same build. If reproduction fails, inspect prior-input
state, unjoined work, time, RNG, locale, files, network, heap layout, undefined behavior, and tool
version before declaring the product fixed or the artifact flaky.

Shrink all causal dimensions: bytes, object fields, sequence length, chunk schedule, failure point,
options, environment, and implementation set. Preserve the failure class or normalized discrepancy,
not incidental log text.

CI or ordinary tests should build the target and replay bounded seed and regression corpora when the
repository configures those paths. A replay proves historical inputs remain safe; it does not prove
the current search campaign explored all relevant behavior.

Report separately:

- harness build and deterministic smoke;
- seed or regression corpus replay;
- sanitizer or detector replay;
- coverage and frontier evidence;
- bounded CI fuzz smoke;
- long-running local or external campaign state; and
- artifact triage and remediation state.

## 10. Primary anchors

Use these primary sources to refresh tool-specific facts:

- [LLVM libFuzzer](https://llvm.org/docs/LibFuzzer.html): narrow deterministic targets, corpus
  mutation and merge, dictionaries, value profiles, limits, artifact minimization, and sanitizer
  integration.
- [Clang SanitizerCoverage](https://clang.llvm.org/docs/SanitizerCoverage.html): edge and block
  instrumentation, compare and data-flow tracing, and instrumentation allowlists or blocklists.
- [OSS-Fuzz ideal integration](https://google.github.io/oss-fuzz/advanced-topics/ideal-integration/):
  source-owned targets, minimal seed corpora, dictionaries, sanitizer regression replay, coverage,
  and target performance.
- [Google structure-aware fuzzing](https://github.com/google/fuzzing/blob/master/docs/structure-aware-fuzzing.md):
  custom mutators, structured intermediate forms, compressed inputs, and stateful API sequences.
- [AFL++ fuzzing in depth](https://aflplus.plus/docs/fuzzing_in_depth/): instrumentation,
  persistent mode, compare barriers, corpus handling, campaign diversity, and triage.
- [AFL++ power schedules](https://aflplus.plus/docs/power_schedules/): seed energy and
  low-frequency path strategies.
- [libprotobuf-mutator](https://github.com/google/libprotobuf-mutator): protobuf-backed structured
  mutation and crossover for libFuzzer-compatible targets.
- [The HTTP Garden](https://arxiv.org/abs/2405.17737): coverage-guided differential fuzzing of
  request streams and normalized interpretation discrepancies.
- [StateAFL](https://arxiv.org/abs/2110.06253): multi-message stateful fuzzing and normalized
  long-lived state feedback.
