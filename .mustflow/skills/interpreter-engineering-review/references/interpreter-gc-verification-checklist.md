# Interpreter GC and Verification Checklist

Use this checklist when an interpreter owns guest-object reachability, moving or generational GC,
weak containers, finalization, native resources, heap verification, or semantic testing oracles.

## Contents

1. [Runtime root API](#runtime-root-api)
2. [Safepoints and temporary values](#safepoints-and-temporary-values)
3. [Object construction and publication](#object-construction-and-publication)
4. [Upvalue and suspended-frame tracing](#upvalue-and-suspended-frame-tracing)
5. [Write barriers](#write-barriers)
6. [Moving objects and handles](#moving-objects-and-handles)
7. [Generations and remembered sets](#generations-and-remembered-sets)
8. [Weak containers and ephemerons](#weak-containers-and-ephemerons)
9. [Finalization and resurrection](#finalization-and-resurrection)
10. [Reference-count reentrancy](#reference-count-reentrancy)
11. [External resources and shutdown](#external-resources-and-shutdown)
12. [Heap verifier and stress modes](#heap-verifier-and-stress-modes)
13. [Stage-specific harnesses](#stage-specific-harnesses)
14. [Generator lanes and semantic environment](#generator-lanes-and-semantic-environment)
15. [Canonical outcomes and independent oracles](#canonical-outcomes-and-independent-oracles)
16. [Definedness and metamorphic relations](#definedness-and-metamorphic-relations)
17. [Executable semantic properties](#executable-semantic-properties)
18. [Structure-aware reduction](#structure-aware-reduction)
19. [Semantic coverage and replay](#semantic-coverage-and-replay)
20. [Failure triage](#failure-triage)
21. [Failure matrix](#failure-matrix)
22. [Invariants](#invariants)
23. [Skill handoffs](#skill-handoffs)

## Runtime root API

Treat the root set as a named runtime contract. Enumerate roots from:

- active VM stacks and frames;
- suspended generators, coroutines, promises, and continuations;
- globals, modules, import or export cells, and builtin values;
- bytecode constants and executable-code metadata that owns guest values;
- current guest exceptions and pending completions;
- open and closed upvalues;
- native local and persistent handles;
- callbacks retained across guest calls;
- debugger, profiler, coverage, and snapshot state;
- caches, intern tables, symbol tables, and pending finalization queues.

Native or host code must use a root guard, handle scope, persistent handle, or another collector-aware
API. A host-language local variable containing a guest pointer is not root evidence by itself.

For each root family, name its owner, creation point, release point, tracing rule, concurrency
ownership, and stale-generation behavior.

## Safepoints and temporary values

Inventory every operation that can allocate, trigger collection, resize managed storage, enter a
native callback, or yield to another collector phase. Hidden allocation sites often include:

- string concatenation and interpolation;
- boxing or numeric promotion;
- error and stack-trace construction;
- property or symbol interning;
- hash-table growth and rehash;
- operand-stack or frame growth;
- iterator creation;
- native argument conversion;
- source-map or profiler materialization.

Before a safepoint, place every live temporary in collector-visible storage. After a moving
safepoint, reload through the updated handle or slot. Do not keep a raw pointer from before an
allocation and continue using it afterward.

## Object construction and publication

Use a staged construction protocol:

1. allocate storage in a collector-known but externally unreachable state;
2. initialize every reference field to a safe traced null or sentinel;
3. root the partial object and all constructor temporaries;
4. populate fields only through the declared store barrier;
5. attach collector metadata and tracing shape;
6. register finalization only after its invariants hold;
7. publish the object to guest-visible storage last.

Cleanup must be idempotent for every partial state. A collector must never interpret uninitialized
bits as references, and a finalizer must never release a resource that was not successfully acquired.

## Upvalue and suspended-frame tracing

An open upvalue traces its owning frame and live slot. A closed upvalue traces its heap cell. The
transition must be atomic with respect to frame reuse and collector observation.

Check:

- one mutable binding maps to one shared cell;
- all frame exits close owned upvalues exactly once;
- close order covers return, throw, cancellation, cleanup, and generator completion;
- suspended frames remain roots while resumable;
- canceled or completed frames release roots and native continuations;
- slot reuse cannot alias a still-open capture;
- debugger retention follows an explicit policy;
- serializer or migration paths reject unsupported open-frame state safely.

If coroutines heap-allocate whole frames, distinguish frame lifetime from ordinary call-stack
lifetime and include handler, completion, budget, and source state in tracing.

## Write barriers

Route every guest-reference mutation through one collector-aware store surface. Cover:

- object field writes;
- array and tuple element stores;
- bulk copy and move;
- hash insert, delete, rehash, and resize;
- closure capture and upvalue close;
- module or global binding updates;
- inline-cache and shape metadata that owns guest references;
- native extension writes;
- deserialization and cache loading;
- promotion and evacuation updates.

The barrier must preserve the collector's declared invariant, such as snapshot-at-the-beginning,
incremental update, tri-color, generational old-to-young, or another named model. Public mutable
fields that bypass the barrier are correctness defects, not encapsulation style issues.

## Moving objects and handles

Object identity must not depend on storage address when the collector can move objects. Across a
moving safepoint use:

- local handles for one dynamic call scope;
- persistent handles for retained native ownership;
- weak handles for non-owning observation;
- explicit pin scopes only when movement must be prevented;
- owner handle plus offset for interior locations;
- stable guest identity or handle identity for language-visible object identity.

Pinning needs a bounded scope, fragmentation policy, concurrency rule, and failure behavior. Do not
turn every FFI call into permanent pinning. Do not serialize raw addresses or storage tags.

## Generations and remembered sets

A minor collection is correct only if every old-to-young edge is discoverable. Review:

- card or remembered-set insertion on every store path;
- bulk operations and table resize;
- promotion with unscanned young children;
- native and deserialization writes;
- dirty-card clearing and rescanning;
- concurrent mutation ownership;
- remembered-set growth and stale entries;
- large-object or pinned-object generation policy.

Stress with a tiny nursery and frequent promotion. Compare results across collector schedules. A
minor collection that appears fast but loses a young object is a semantic failure.

## Weak containers and ephemerons

Define weak-key, weak-value, weak-both, and ephemeron behavior separately. For an ephemeron, a value
becomes strongly relevant only when its key is reachable through another strong path; a value that
points back to its key must not keep the pair alive by itself.

Marking may require repeated processing until reachability reaches a fixed point. Specify:

- table registration and processing phase;
- key and value tracing rule;
- fixed-point termination;
- mutation during marking;
- cleanup ordering;
- iterator behavior during collection;
- interaction with finalization and resurrection;
- cache invalidation and observable guest behavior.

Do not implement weak keys as merely skipping key marking while tracing every value strongly.

## Finalization and resurrection

Treat finalizers as adversarial callbacks with unpredictable timing. They may:

- reenter the VM;
- allocate and trigger another collection;
- throw or fail;
- publish the object again;
- observe partially shut down services;
- run in an order different from ordinary ownership order.

Define eligibility, queueing, at-most-once behavior, resurrection state, second-death behavior,
exception handling, collector reentrancy, thread ownership, and shutdown limits. Core external
resources still need deterministic close; finalization is only a bounded fallback.

## Reference-count reentrancy

Dropping the last strong reference may execute guest or native cleanup immediately. Before a
decrement that can reach zero:

- remove the object from containers or registries;
- repair length, links, indices, and invariants;
- clear externally visible slots;
- prevent duplicate release;
- preserve a strong reference for borrowed values that escape the current call;
- define cycle traversal and breaking where cycles are possible.

Assume release can reenter the current object, call arbitrary guest code, or inspect the container.
The data structure must already be coherent.

## External resources and shutdown

GC reachability does not guarantee timely release of files, sockets, native buffers, GPU objects,
thread-affine handles, or host subscriptions. Each resource needs:

- explicit open or acquire state;
- deterministic idempotent close;
- owner and thread or event-loop affinity;
- cancellation of retained callbacks;
- external-memory accounting;
- finalizer fallback policy;
- error behavior during partial construction;
- shutdown phase and deadline.

Stage runtime shutdown:

1. reject new guest and native work;
2. run bounded declared guest shutdown hooks where permitted;
3. cancel asynchronous and scheduled work;
4. detach callbacks and close external resources;
5. process only the permitted bounded finalization work;
6. release modules, caches, roots, and collector state;
7. report resources that could not be closed.

## Heap verifier and stress modes

Development and test configurations should be able to vary allocation and collection schedules:

- collect on every or pseudo-random allocation;
- use tiny nursery and heap thresholds;
- force movement and compaction;
- inject safepoints between evaluator substeps;
- poison freed slots and cleared frame entries;
- verify root maps and handle scopes;
- audit remembered-set and barrier coverage;
- validate object headers, trace shapes, and field kinds;
- randomize weak and finalizer processing within the allowed contract;
- compare live-object and external-resource baselines after repeated lifecycles.

Keep sanitizer, memory checker, fuzzing, and platform-specific diagnostics as separate configured or
manual evidence lanes. A normal test passing is not proof that a collector invariant was exercised.

## Stage-specific harnesses

Partition interpreter verification by stage so deep runtime paths are reachable directly:

- bytes to lexer;
- bytes or tokens to parser;
- syntax to resolver and semantic analysis;
- typed executable IR to bytecode;
- bytecode to verifier;
- verified bytecode to VM;
- runtime value to canonical serialization;
- guest program plus collector schedule to outcome;
- command sequence to REPL or module session.

Each persistent harness needs deterministic reset, bounded input, no process exit, no stale modules,
no pending finalizers, no retained RNG or clock state, and no cross-input background work.
`fuzz-harness-review` owns harness and campaign engineering; this checklist owns interpreter state
and oracle semantics.

## Generator lanes and semantic environment

Keep invalid and valid generation lanes distinct.

Invalid inputs target decoding, lexing, parsing, recovery, diagnostics, verifier rejection, and
resource limits. Valid programs target resolution, typed IR, operators, bytecode, execution,
closures, modules, natives, and GC.

A valid-program generator should track:

- lexical scopes and visible bindings;
- semantic types and permitted conversions;
- declaration and initialization state;
- function result type and effects;
- loop, handler, suspension, and completion context;
- operator and protocol availability;
- object graph and aliasing shape;
- collector and resource budget;
- specified versus unspecified semantic regions.

Prefer generating a semantic goal first, then constructing an expression or statement that satisfies
it. A grammar-only generator usually spends its budget rediscovering shallow rejection paths.

## Canonical outcomes and independent oracles

Normalize execution into a semantic envelope before comparison:

- terminal kind: normal, guest throw, cancellation, budget, engine defect, or other declared state;
- semantic result value and identity relations;
- ordered guest mutation and host-effect trace;
- stable guest error code, source relation, and logical stack;
- final globals, module state, and observable object graph;
- deterministic service consumption;
- budget charges and terminal point;
- external resource state;
- collector-independent liveness observations where promised.

Normalize paths, host addresses, randomized seeds, locale text, unordered observations, NaN payloads,
or signed-zero text only when the language contract says they are not observable.

Prefer independent oracles: a small specification evaluator, executable semantic table, property,
metamorphic relation, or independently implemented engine. Two engines sharing parser, type solver,
numeric helper, or lowering may share the same defect; agreement is evidence, not final authority.

## Definedness and metamorphic relations

Before treating divergence as a defect, prove the input has one permitted meaning for every compared
observation. Exclude or normalize intentionally unspecified evaluation, iteration, overflow,
floating-point, scheduling, time, or host behavior.

Possible meaning-preserving relations include:

- alpha-renaming with capture avoidance;
- adding an unused declaration with no observable initialization effect;
- inserting unreachable code under a proven condition;
- parse, canonical print, and reparse;
- surface syntax versus specified desugaring;
- optimized versus unoptimized executable form;
- cached versus freshly compiled code;
- changed GC frequency or movement schedule;
- serialize and deserialize canonical values;
- suspend and resume without intervening external effects.

Each relation needs explicit side-effect, numeric, NaN, reflection, capture, module, native, and
resource preconditions. A transformation is not semantic just because it looks harmless.

## Executable semantic properties

Useful interpreter properties include:

- equal map keys have equal hashes;
- serialization round trips preserve semantic value;
- resolved closed programs do not fail with a static name error at runtime;
- typed closed programs do not produce the forbidden class of dynamic type failure;
- compound assignment evaluates its place exactly once;
- operator decline follows the declared fallback order while throw stops it;
- AST and bytecode engines produce the same canonical outcome;
- collector schedule changes do not change guest results;
- open and closed upvalues preserve shared mutation;
- source mapping identifies the same semantic operation across engines;
- budget exhaustion occurs at the declared charge point;
- safe diagnostic rendering never executes guest code;
- repeated execution reset returns modules, roots, finalizers, and resources to baseline.

Give every property a stable identity and a counterexample representation suitable for reduction and
regression tests.

## Structure-aware reduction

Reduce the representation that preserves reachability to the failing stage. Text deletion is useful
for raw decoder or lexer failures; deep interpreter failures usually need syntax or typed-IR edits.

Possible structural operations include:

- remove statements, declarations, functions, modules, or object members;
- replace expressions with smaller type-correct values;
- shrink literals and collection shapes;
- inline a call or remove unused parameters;
- simplify scopes while repairing binding identities;
- shrink object graphs, alias sets, and collector schedules;
- reduce native effects while preserving the same capability path.

The interestingness predicate must preserve the original failure class and semantic fingerprint.
A wrong-result case reduced into any crash, parse rejection, timeout, or unrelated assertion is not
the same reproducer.

## Semantic coverage and replay

Machine-code coverage is not enough to distinguish semantic state combinations. Track bounded
domain feedback such as:

- opcode by operand-kind tuple;
- conversion graph edge;
- operator candidate and decline or throw path;
- completion and cleanup edge;
- binding and upvalue state transition;
- object-shape or metaobject generation transition;
- GC phase, barrier, weak, finalizer, and promotion transition;
- budget dimension and terminal point;
- source-map and diagnostic category;
- native capability and async completion path.

Store a reproduction capsule with input, stable property or divergence ID, generator seed, semantic
version, executable-engine mode, optimization and cache state, deterministic host inputs, hash seed,
locale and timezone policy, GC mode and schedule seed, budget values, target architecture assumptions,
and applicable diagnostic build lane.

## Failure triage

Classify failures before deduplication or reduction:

- guest-semantic wrong result;
- engine assertion or invariant;
- crash or invalid memory access;
- hang or progress failure;
- budget escape or wrong terminal point;
- leak or retained root;
- diagnostic corruption or unsafe renderer execution;
- source-map or logical-stack mismatch;
- nondeterministic replay;
- harness-state contamination.

Deduplicate with stable semantic fingerprints plus maintainer evidence. Preserve minimized failures
as ordinary regression tests when they encode a durable contract; keep corpus and regression assets
as separate lifecycle classes under `fuzz-harness-review`.

## Failure matrix

| Failure | Required behavior |
| --- | --- |
| Temporary guest object crosses an allocating helper. | Root it before the safepoint and reload through a handle. |
| Partial object triggers GC. | Safe fields and construction state keep tracing valid. |
| Bulk copy creates old-to-young edges. | Store path records every required remembered-set entry. |
| Weak value points back to weak key. | Ephemeron fixed-point semantics decide reachability. |
| Finalizer resurrects an object. | Declared resurrection and at-most-once policy applies. |
| Last reference release reenters its container. | Container invariants were repaired before release. |
| GC frequency changes guest output. | Preserve both outcomes and localize missing root, barrier, or finalizer rule. |
| AST and VM share one wrong numeric helper. | Independent property or reference model remains necessary. |
| Differential input uses unspecified iteration order. | Exclude or normalize only that permitted observation. |
| Reducer changes wrong result into crash. | Reject the candidate because the fingerprint changed. |
| Persistent harness retains a pending finalizer. | Reset fails and the input is not trusted for coverage. |

## Invariants

- Every guest reference live at a safepoint is collector-visible.
- Partial objects are traceable and cleanable in every construction state.
- Every guest-reference store follows the declared barrier.
- Guest identity survives object movement.
- Minor collection can discover every old-to-young edge.
- Weak-container reachability follows the declared fixed-point semantics.
- Finalizers are bounded fallbacks, not deterministic resource ownership.
- Reference release may reenter, so structures become coherent first.
- External resources have explicit close and staged shutdown independent of GC.
- Canonical outcomes compare semantics rather than renderer or storage details.
- Differential claims exclude unspecified behavior and prefer independent authority.
- Reduction preserves the original stable failure identity.
- Persistent harness reset covers modules, roots, handles, RNG, finalizers, and background work.

## Skill handoffs

- Use `interpreter-engineering-review` for VM root families, guest object identity, collector-visible
  frames and upvalues, interpreter state reset, canonical outcomes, and semantic oracle design.
- Use `memory-lifetime-review` for general retainer graphs, deterministic cleanup, host handles,
  repeated lifecycle, native memory diagnostics, and application resource leaks.
- Use `fuzz-harness-review` for target implementation, instrumentation, mutators, corpus lifecycle,
  sanitizer lanes, campaign operation, and artifact promotion.
- Use `compiler-engineering-review` for typed IR or bytecode lowering, verifier stages,
  optimization-definedness, and compiler wrong-code reduction.
- Use `parser-engineering-review` for invalid-input generation, parser recovery, syntax mutation, and
  source-unit invariants.
- Use `security-flow-review` for native capabilities, sandbox escape, filesystem, network, process,
  secrets, and tenant boundaries.
