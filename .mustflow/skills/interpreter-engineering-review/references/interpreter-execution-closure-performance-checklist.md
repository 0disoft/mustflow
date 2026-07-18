# Interpreter Execution, Closures, and Performance Checklist

Use this checklist when choosing AST execution or bytecode, resolving bindings, implementing frames
and closures, caching executable code, debugging, profiling, or optimizing an interpreter.

## Contents

1. [Engine selection](#engine-selection)
2. [AST execution contract](#ast-execution-contract)
3. [Bytecode contract](#bytecode-contract)
4. [AST and bytecode differential](#ast-and-bytecode-differential)
5. [Name resolution](#name-resolution)
6. [Frame and slot layout](#frame-and-slot-layout)
7. [Closures and upvalues](#closures-and-upvalues)
8. [Initialization, recursion, and modules](#initialization-recursion-and-modules)
9. [Suspension and debugging](#suspension-and-debugging)
10. [Compiled-code caches](#compiled-code-caches)
11. [Performance measurement](#performance-measurement)
12. [Lookup, boxing, and allocation](#lookup-boxing-and-allocation)
13. [Dispatch and specialization](#dispatch-and-specialization)
14. [Native-boundary performance](#native-boundary-performance)
15. [Memory and GC retention](#memory-and-gc-retention)
16. [Failure matrix](#failure-matrix)
17. [Invariants](#invariants)
18. [Skill handoffs](#skill-handoffs)

## Engine selection

Choose from workload and semantic maturity rather than code size or fashion.

| Signal | AST execution tends to fit | Bytecode tends to fit |
| --- | --- | --- |
| Semantic change rate | Rules and syntax change frequently. | Semantics and lowering are stable enough to version. |
| Execution reuse | Program runs once or briefly. | Same code executes repeatedly or for a long time. |
| Startup budget | Compile cost dominates. | Cache or reuse amortizes compile cost. |
| Control complexity | Simple calls and structured flow. | Exceptions, cleanup, generators, coroutines, suspension. |
| Debugger needs | Source-shaped prototype inspection. | Stable instruction pointer and source map. |
| Resource accounting | Node charging is sufficiently precise. | Instruction and operand costs need finer control. |
| Code size and locality | Small executable trees. | Compact sequential code and constant pools matter. |
| Future optimization | Local evaluator cleanup. | Specialization or tiering has measured justification. |

Do not assume bytecode is faster. A VM with boxed instruction objects, hash-map locals, fragmented
storage, and a costly dispatch loop can be slower than a compact executable AST. Do not keep AST and
bytecode simultaneously unless debugging, deoptimization, tooling, or cache policy justifies the
memory.

## AST execution contract

An executable AST should differ from raw parser output when needed:

- names resolved to binding metadata;
- constants and literal values normalized;
- source ranges preserved;
- evaluation order explicit;
- control and cleanup targets annotated;
- free variables and captures computed;
- semantic rejection completed before hot execution;
- repetitive syntax sugar lowered to a smaller execution vocabulary;
- runtime node shapes compact and immutable where possible.

Avoid one heavyweight host object per trivial node when memory or traversal cost matters. Separate
rare metadata into side tables if measurement supports it, but keep source and debugger mapping
stable.

Do not use host recursion beyond the guest recursion contract. Deep guest expressions or calls need
an explicit bound or iterative execution path where host stack overflow would bypass guest errors.

## Bytecode contract

Specify:

- instruction set and semantic version;
- stack, register, accumulator, or hybrid execution model;
- opcode and operand widths;
- constant and symbol pools;
- local, upvalue, module, global, builtin, and dynamic access instructions;
- stack-height or register-liveness invariants;
- jump target and handler table encoding;
- return, throw, cleanup, yield, suspend, and resume representation;
- native call and capability operands;
- source map and debugger stepping boundaries;
- instruction and size verification;
- budget cost and variable-size surcharges;
- serialization format and cache compatibility;
- unknown opcode and corrupted artifact behavior.

Bytecode should eliminate repeated semantic work, not merely rename AST nodes. Compact contiguous
representation, resolved slots, explicit instruction pointer, stable frames, and verification are
the useful boundaries.

Test malformed bytecode independently from source compilation. Reject truncated operands, invalid
indices, stack underflow or mismatch, bad jumps, handler overlap, impossible completion state,
unknown opcode, schema mismatch, and unsupported native symbols before execution.

## AST and bytecode differential

Run one semantic corpus through both engines during migration or dual-engine support. Compare:

- guest value and identity relations;
- ordered mutation and host-effect trace;
- completion kind and payload;
- exception, cleanup, cancellation, and budget terminal point;
- source location and guest stack;
- final bindings and object observations;
- deterministic service consumption;
- native calls and capability decisions;
- debugger stops or coverage regions where promised.

Cover side-effecting operands, nested completion, closure mutation, module cycles, recursion,
exceptions in cleanup, suspension, async native completion, and budget exhaustion. A value-only
comparison can miss reordered effects, different cleanup, or source-location drift.

Use the semantic contract or independent model as authority. If both engines implement the same
wrong lowering, agreement is not proof.

## Name resolution

Resolver output should classify each binding:

- local slot;
- captured or upvalue cell;
- parameter;
- module or import cell;
- global slot;
- builtin or native symbol;
- explicitly dynamic binding if the language supports it;
- invalid, ambiguous, or uninitialized reference.

Record declaration source, scope depth, slot or cell identity, mutability, initialization rule,
capture status, export or import status, and debug name.

Resolve reads and writes through the same binding identity. A resolved assignment writes its slot or
cell; it must not restart a string-name search and accidentally select a nearer dynamic environment.

Test shadowing, declaration before use, declaration versus initialization, duplicate declarations,
recursive and mutually recursive definitions, imports, pattern bindings, catch bindings, loop
variables, class or object scopes, and explicitly dynamic features.

## Frame and slot layout

Define:

- parameter slots;
- local slots and lexical live ranges;
- temporary and operand slots;
- completion and handler state;
- return and receiver positions;
- captured-slot promotion;
- slot reuse and clearing;
- debugger-visible names and values;
- GC root map;
- suspended-frame storage;
- frame generation and stale callback protection.

Use array or compact indexed storage for statically resolved bindings. Keep strings for debugging
and reflection rather than hot access. Slot reuse must respect overlapping lexical lifetimes,
captured values, debugger inspection, exceptions, and suspension.

Clear dead references when the guest semantics and debugger contract permit it so frame slots do not
retain large object graphs.

## Closures and upvalues

Keep lexical and dynamic relationships separate. A closure captures the environment at definition,
not the frame that later calls it.

For each free binding, define:

- value or reference capture;
- mutable shared cell semantics;
- upvalue index and owning function;
- open state pointing to a live frame slot;
- closed state pointing to a heap cell;
- one-cell deduplication for multiple closures capturing the same binding;
- close order on return, throw, cancellation, or unwind;
- GC roots and weak or strong native references;
- serialization or non-serializability;
- debugger display and hot-reload behavior.

Do not capture the whole environment when only a few variables are free. Whole-environment capture
retains unrelated temporaries, native handles, buffers, and object graphs.

Test sibling closures sharing mutation, nested captures, capture after slot reuse, recursive closure,
closure returned after frame exit, exception during closure construction, cancellation while open,
generator suspension, and debugger retention.

## Initialization, recursion, and modules

Separate binding existence from initialized value. Use a dedicated uninitialized sentinel or state,
not the guest null-like value.

For recursion:

1. declare binding identity and slot or cell;
2. mark it uninitialized;
3. construct the function or module value with access to the binding;
4. publish the initialized value;
5. reject reads that occur before the permitted initialization point.

For mutually recursive declarations, define the declaration group and initialization order.

For loop captures, specify whether one binding is shared across iterations or a new binding is
created per iteration. Implement the declared rule at binding creation, not as a closure special case.

For modules, specify copied versus live bindings, initialization phases, cycles, partial namespace
visibility, failure caching, re-execution, unload, hot reload, and references retained by closures or
native code.

## Suspension and debugging

Generators, coroutines, async functions, and resumable exceptions require explicit execution state:

- instruction or node position;
- frame slots and operand state;
- open upvalues;
- handler and cleanup stack;
- pending completion;
- budget and cancellation state;
- execution generation;
- source map and debugger state;
- native await or callback identity.

Do not rely on an opaque host call stack when the guest computation must suspend, serialize, move,
inspect, or resume independently.

Debugger contracts should define:

- breakpoint binding and source generation;
- line, statement, expression, or instruction stop granularity;
- step into, over, and out behavior;
- hidden or synthetic instruction policy;
- guest stack and local or captured value inspection;
- optimized or dead binding display;
- native frame representation;
- hot-reload compatibility and stale breakpoint behavior.

Coverage and profiler sampling should use the same source provenance vocabulary while remaining
separate evidence products.

## Compiled-code caches

Cache identity should include all semantic inputs:

- source content or immutable source identity;
- language and semantic version;
- parser, resolver, compiler, and bytecode schema version;
- compile options and feature flags;
- native API and symbol version;
- module and import dependency identities;
- target runtime or value representation assumptions;
- deterministic service or policy version when compilation depends on it;
- source-map format;
- capability or sandbox mode when encoded into code.

Validate artifact header, size, checksums or hashes, indices, opcodes, stack or register invariants,
native symbol availability, and source-map consistency before execution.

On mismatch, recompile or return a typed incompatibility. Do not silently run stale code because
the path, module name, or cache key remained stable.

Separate memory cache, module cache, and persistent serialized cache. Define eviction, lifetime,
tenant isolation, concurrency, atomic promotion, partial write, rollback, and cache-poisoning behavior.

## Performance measurement

Measure representative workloads by phase:

- source load, parse, resolve, semantic validation, and compile;
- cache lookup, validation, deserialize, and relink;
- instruction or node dispatch;
- local, upvalue, module, global, and property access;
- dynamic operator resolution;
- function and native calls;
- allocation volume and live heap;
- GC count, pause, and total time;
- string and collection operations;
- source mapping, debugger, coverage, and profiling overhead;
- startup, steady state, and tail latency.

Record operation counts with time. A faster benchmark that executed less guest work, disabled
budgets, skipped source maps, or changed native effects is invalid.

Profile the actual service mix. A synthetic arithmetic loop does not represent a runtime dominated
by property access, JSON conversion, regex, templates, or host calls.

## Lookup, boxing, and allocation

Prioritize measured waste:

- replace repeated name hashing and parent-environment walks with resolved slots and cells;
- avoid allocating wrapper result objects for normal evaluation;
- keep common primitive values compact or unboxed where safe;
- bound small-value caches and interning to trusted finite domains;
- avoid retaining slices or tokens that pin large obsolete source buffers;
- use builders, ropes, or chunk lists for repeated string concatenation;
- reuse bounded temporary argument or operand storage when reentrancy and concurrency permit;
- capture only free variables;
- clear dead slots and caches that retain guest objects;
- batch host calls instead of crossing the native boundary per element.

Do not optimize allocation by reusing mutable objects across guest identities or concurrent sessions.

## Dispatch and specialization

Possible optimizations include:

- compact fixed or variable-width bytecode;
- direct or table-driven dispatch where the host permits it;
- superinstructions for measured opcode sequences;
- monomorphic or bounded polymorphic inline caches;
- specialized opcodes guarded by value tags or object shape;
- shape or hidden-class property offsets;
- quickening with reversible fallback;
- tail-call handling where the language specifies it;
- tiering or JIT only after simpler bottlenecks are measured.

Every cache or specialization needs:

- operation-site identity;
- observed semantic kinds, storage tags, shape, policy, or native symbol guard;
- every relevant class, prototype, metatable, protocol, operator table, or metaobject generation;
- miss and megamorphic fallback;
- mutation and invalidation rule;
- concurrency ownership;
- source and debugger behavior;
- budget accounting;
- deoptimization or generic recovery where applicable.

Do not specialize away guest overflow, coercion, exception, capability, or evaluation-order rules.
If metaobjects can change at runtime, a type-pair cache without a generation or dependency guard can
execute obsolete language semantics after a method is added, removed, or replaced.

## Native-boundary performance

Measure separately:

- guest-to-host argument conversion;
- host-to-guest result conversion;
- capability and policy checks;
- thread or event-loop marshaling;
- reflection or dynamic lookup;
- handle table access;
- callback and reentry setup;
- async continuation registration;
- error translation;
- budget and logging overhead;
- actual host operation.

Prefer coarse-grained bulk APIs, generated or cached call stubs, handles or proxies for large host
objects, and explicit ownership. Do not remove validation, capability, rooting, cancellation, or
thread checks to improve a microbenchmark.

If native calls dominate, changing AST dispatch to bytecode may not materially improve total time.

## Memory and GC retention

Map roots and retention paths through:

- active and suspended frames;
- open and closed upvalues;
- globals and module cells;
- native handles and callbacks;
- debugger snapshots and watch expressions;
- error objects and stack traces;
- compiled-code and constant pools;
- source maps and source buffers;
- intern and symbol tables;
- inline caches and object shapes;
- pending async continuations;
- profiler and coverage state.

Test closure release, module unload or replacement, callback deregistration, debugger detach, cache
eviction, canceled suspension, native-handle finalization, and cyclic guest-native graphs.

Reference counting alone cannot collect cycles unless the runtime adds cycle detection or another
ownership rule. Tracing GC still needs correct roots and barriers.

Use [Interpreter GC and Verification Checklist](interpreter-gc-verification-checklist.md) for root
APIs, allocating safepoints, staged construction, store barriers, moving handles, remembered sets,
ephemerons, finalizers, reference-count reentrancy, external resources, heap stress, and semantic
oracle design.

## Failure matrix

| Failure | Required behavior |
| --- | --- |
| AST and bytecode disagree. | Preserve first semantic divergence and follow the language contract. |
| Bytecode cache schema is old. | Reject and rebuild; never reinterpret. |
| Slot is reused while captured. | Resolver or frame verifier prevents aliasing. |
| Two closures capture one mutable local. | They share one cell. |
| Frame exits by throw. | Every open upvalue closes and cleanup remains ordered. |
| Loop closure sees wrong iteration. | Binding-creation fixture exposes the declared rule. |
| Module cycle reads before initialization. | Dedicated uninitialized state produces the specified result. |
| Suspended callback resumes old execution generation. | Stale completion is rejected. |
| Inline cache guard misses. | Generic path preserves semantics and updates within policy. |
| Untrusted strings fill intern table. | Interning policy stays bounded. |
| Debugger detaches. | Retained frames and objects return to baseline. |
| Native calls dominate profile. | Optimization targets the boundary, not dispatch folklore. |

## Invariants

- Engine selection follows measured workload and semantic maturity.
- Bytecode contains resolved execution information and passes verification before running.
- Resolved reads and writes use one binding identity.
- Lexical scope never follows caller frames accidentally.
- One captured mutable binding has one shared cell.
- Every frame exit closes owned upvalues exactly once.
- Uninitialized state is distinct from every guest value.
- Cached code binds every semantic and native dependency that can change execution.
- Optimization guards have a correct generic fallback and invalidation rule.
- Dynamic dispatch caches include every mutable semantic dependency and its generation.
- Performance evidence preserves guest work, budgets, source mapping, and native effects.
- GC roots and retention paths cover closures, modules, natives, debugger, caches, and suspension.

## Skill handoffs

- Use `interpreter-engineering-review` for engine selection, resolver, bytecode, closures, caches,
  debugger, profiling, and runtime performance.
- Use `compiler-engineering-review` when bytecode lowering becomes a compiler transform with
  stage-local verification or optimization.
- Use `parser-engineering-review` for lexer, grammar, CST, AST construction, and parser recovery.
- Use `fuzz-harness-review` for harness, instrumentation, corpus, campaign, sanitizer, and generic
  artifact lifecycle.
- Use `memory-lifetime-review` for GC, root, host-handle, callback, and retained-object defects.
- Use `cache-integrity-review` for persistent compiled-code cache truth, isolation, invalidation,
  and failure behavior.
- Use `performance-hot-path-review` or the repository's narrower performance skill when a measured
  production workload extends beyond interpreter internals.
