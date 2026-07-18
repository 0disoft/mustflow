# Interpreter Semantics and Runtime Checklist

Use this checklist when guest-language values, evaluation order, completion, source provenance,
guest failures, native calls, determinism, or sandbox budgets are in scope.

## Contents

1. [Semantic matrix](#semantic-matrix)
2. [Executable representation](#executable-representation)
3. [Runtime value model](#runtime-value-model)
4. [Conversion and operator dispatch](#conversion-and-operator-dispatch)
5. [Equality, hashing, and ordering](#equality-hashing-and-ordering)
6. [Evaluation order](#evaluation-order)
7. [Completion and cleanup](#completion-and-cleanup)
8. [Source provenance](#source-provenance)
9. [Fault domains](#fault-domains)
10. [Native boundary](#native-boundary)
11. [Deterministic services](#deterministic-services)
12. [Resource budgets](#resource-budgets)
13. [Semantic differential tests](#semantic-differential-tests)
14. [Failure matrix](#failure-matrix)
15. [Invariants](#invariants)
16. [Skill handoffs](#skill-handoffs)

## Semantic matrix

Define these before implementation details choose them accidentally:

- evaluation order for operands, arguments, receivers, keys, values, literals, defaults, and
  destructuring;
- truthiness and short-circuit result values;
- numeric domains, precision, division, remainder, overflow, shift, conversion, and negative zero;
- value equality, object identity, ordering, and comparison failure;
- implicit and explicit coercions;
- missing name, missing property, missing key, null-like value, and uninitialized binding behavior;
- string encoding, indexing, slicing, normalization, and comparison;
- collection mutation, iteration order, concurrent modification, and key eligibility;
- function arity, defaults, variadics, receiver binding, and tail behavior;
- assignment target evaluation and compound assignment;
- module initialization, import binding, cycle, and cache behavior;
- exception, cleanup, cancellation, and resource-limit semantics;
- time, randomness, locale, path, environment, floating-point, and I/O visibility;
- specified nondeterminism and what evidence permits replay.

For each rule, keep representative positive, boundary, failure, side-effect-order, and host-
difference examples. A host implementation matching one example does not make its broader behavior
the guest specification.

## Executable representation

Separate:

1. lossless or source-shaped syntax;
2. resolved and semantically annotated nodes;
3. normalized executable AST or IR;
4. optional bytecode and constant pools;
5. runtime frames and values;
6. host adapters and observations.

The executable representation should carry:

- normalized operation kind;
- resolved binding identity;
- source and related-origin identity;
- constant and literal semantics;
- evaluation-order edges;
- control and cleanup targets;
- type or dynamic-operation metadata where applicable;
- capability and budget category for host operations;
- debugger and coverage mapping.

Do not make raw parser nodes execute themselves while also owning name resolution, mutation,
diagnostics, and host effects. That coupling makes syntax changes alter runtime semantics and blocks
independent analysis or bytecode lowering.

## Runtime value model

Centralize the guest runtime's value contract.

Keep three axes distinct:

- **semantic type**: what the guest program and type system observe;
- **runtime kind**: which evaluator or VM behavior applies now;
- **storage tag**: how this value is encoded in a slot, word, heap object, handle, or cache.

One semantic integer may use an immediate small-integer kind or a heap big-integer kind. One guest
string type may use interned, flat, rope, or slice storage. Changing storage must not silently change
type checking, operator selection, FFI, equality, or serialization.

| Concern | Decision |
| --- | --- |
| Type tag | Which values are distinct guest types? |
| Payload | Primitive bits, heap identity, handle, cell, or another representation. |
| Mutability | Is the value immutable, mutable, or a reference to mutable state? |
| Equality | Value equality, identity equality, both, or neither. |
| Hashability | Which stable equality relation backs keys? |
| Numeric relation | Are integer and floating forms equal, ordered, or distinct as keys? |
| String relation | Value, object, interned symbol, rope, slice, or several explicit kinds. |
| Callable relation | Function identity, closure environment, native handle, bound receiver. |
| Sentinel | Uninitialized, missing, deleted, suspended, or internal-only states. |
| Host conversion | Copy, validated conversion, opaque handle, proxy, or denial. |

Do not use the guest null-like value for uninitialized or missing internal states. Do not leak raw
host objects whose equality, mutation, prototype, thread, lifetime, or serialization differs from
the guest contract.

Keep `Null`, `Missing`, `Uninitialized`, `Unit`, dispatch decline, deleted-slot tombstone, suspended
state, and engine poison distinct. Internal sentinels must be unforgeable by guest code and excluded
from guest printing, equality, hashing, and canonical serialization unless explicitly specified.

If compact tagging, NaN boxing, pointer tagging, small-integer immediates, or unboxed slots are used,
test every tag boundary, pointer width, alignment, address rule, floating-point payload, moving-GC
interaction, sanitizer mode, host conversion, serialization, debugger display, and portable fallback.

## Conversion and operator dispatch

Model conversion as a directed, context-sensitive graph. Give every edge a purpose, source and
target type, loss policy, guest-code-call policy, failure class, and budget cost. Separate Boolean,
primitive, numeric, index, exact-integer, lossy-float, interpolation, key, and FFI conversions when
their rules differ. A universal symmetric `coerce(left, right)` hides ordering and failure semantics.

Define every operator as an observable algorithm:

1. evaluate operands in the specified order;
2. perform the specified directed conversions;
3. enumerate user or protocol candidates in the specified order;
4. distinguish `Handled(value)`, `Declined`, and `Thrown(error)`-equivalent outcomes;
5. apply reflected, subtype-priority, or default fallback only after decline;
6. preserve the first real guest failure;
7. return through the declared completion protocol.

Represent an assignable location as a `Place` or equivalent resolved target. Compound assignment
must evaluate receiver, computed key, proxy, or index exactly once, then load, operate, and store.
Short-circuiting and conditional expressions lower to control flow, not eager ordinary calls.

When semantic analysis selects conversions or operator candidates, carry the result into typed or
executable IR with inferred type, inserted conversions, selected operation, effects, span, and a
stable proof or decision identity. Do not make the AST evaluator and bytecode compiler independently
repeat overload resolution.

## Equality, hashing, and ordering

Require consistency:

- equal keys produce the same stable hash under one runtime seed policy;
- object identity does not change when storage moves or GC compacts;
- mutable objects are either unhashable or their key relation cannot change while indexed;
- numeric equality and hash agree across permitted numeric representations;
- comparison failure is not silently coerced to an order;
- map or object iteration order is specified, injected, or explicitly unspecified;
- randomized hash state is part of the replay capsule when observable;
- native handles do not inherit host pointer or object equality by accident.

Test self-comparison, distinct equal values, aliased objects, NaNs or unordered values, signed zero,
numeric-width boundaries, mutable keys, interned and non-interned strings, and cross-engine results.
Freeze integer overflow, integer-to-float precision loss, division and remainder signs, shift bounds,
infinity, signed zero, NaN, and mixed numeric key normalization in executable tables before using
host arithmetic.

## Evaluation order

Write the order explicitly for:

- binary and unary operators;
- call target, receiver, and each argument;
- computed property receiver, key, and assigned value;
- compound assignment read, operation, and write;
- array, tuple, map, object, record, and set members;
- spread, splat, default, destructuring, and pattern guards;
- conditional and short-circuit expressions;
- interpolated strings and comprehensions;
- iterator acquisition, next, body, and cleanup;
- exception handler filters, cleanup, and rethrow;
- native callbacks and async continuation delivery.

Use side-effect traces with stable event identities. Test both success and failure at every position.
Changing a helper call, host collection literal, or evaluation abstraction must not reorder guest
effects.

## Completion and cleanup

Use one semantic completion algebra or equivalent protocol:

- normal value;
- return value;
- break with optional target or value;
- continue with target;
- guest throw;
- yield or suspend with resumable state;
- cancellation;
- resource-limit termination;
- engine defect outside guest completion.

For every completion kind, define:

- which constructs catch or transform it;
- which cleanup scopes run and in what order;
- whether a cleanup completion replaces the incoming completion;
- how nested loops and labeled targets resolve;
- how generators or coroutines store and resume it;
- how guest stack and source location are preserved;
- whether native code may observe or produce it;
- whether budget and cancellation remain active during cleanup.

Do not represent return with a host exception, break with a Boolean, throw with a different ad hoc
path, and cancellation with an unchecked flag. Performance lowering may differ while semantics stay
unified.

## Source provenance

Carry source identity through:

- token and syntax range;
- normalized or desugared node;
- resolver and semantic diagnostic;
- executable AST or IR;
- bytecode instruction and operand;
- frame and instruction pointer;
- guest stack trace;
- debugger breakpoint and stepping;
- coverage and profiler sample;
- cached compiled artifact;
- hot-reload generation.

Use stable file identity and declared half-open source ranges. For generated or desugared operations,
record primary, related, or synthetic origin rather than inventing a misleading token location.

Test multi-byte text, tabs, line endings, macros or generated forms where supported, repeated source
lines, cached code, nested calls, native-to-guest callbacks, suspended frames, and hot reload.

Source metadata compression may use shared tables or ranges, but it must preserve the debugger and
diagnostic contract actually promised.

## Fault domains

Classify at least:

| Domain | Payload and stack |
| --- | --- |
| Guest throw | Guest value, guest frames, guest source. |
| Guest type, name, or operation failure | Stable guest error identity and source. |
| Native-declared guest failure | Validated guest error plus native boundary note where safe. |
| Native infrastructure failure | Bounded host cause, translated policy, no raw secret leakage. |
| Capability denial | Capability, action, and bounded guest source. |
| Cancellation | Owner, reason, and resumability or terminal rule. |
| Resource limit | Budget kind, observed or charged amount, limit, and guest source. |
| Engine defect | Host stack and invariant evidence; never disguised as guest code. |

Do not catch every host exception and turn it into a guest throw. Catch only the declared native or
guest boundary. Preserve engine defects for maintainers while redacting sensitive host state from
user-facing surfaces.

## Native boundary

Define one adapter contract for every native function or host object:

- exported name and capability;
- guest argument and return schema;
- conversion, copy, handle, or proxy semantics;
- object ownership and GC rooting;
- thread and event-loop ownership;
- reentrancy and nested guest calls;
- synchronous versus asynchronous completion;
- cancellation and deadline propagation;
- guest and host exception translation;
- instruction, allocation, I/O, or weighted cost;
- lifetime of callbacks and retained guest values;
- authorization and tenant scope;
- deterministic replay or explicit nondeterminism;
- logging and secret-redaction boundary.

Do not hand native code the full VM, raw environment, raw stack, unrestricted filesystem, network,
process, clock, randomness, or credential objects merely for convenience.

For asynchronous natives, bind completion to an execution generation. Late completion after
cancellation, reset, or hot reload must be rejected or routed through an explicit stale-result
policy.

## Deterministic services

Route observable host inputs through an execution context:

- clock and timezone;
- random generator and seed;
- locale and collation;
- path root and separator policy;
- environment variables;
- filesystem and network adapters;
- map or hash iteration policy;
- floating-point environment;
- scheduler and async completion order;
- native function versions and results where replayed.

Choose deterministic, recorded, injected-nondeterministic, or forbidden policy for each service.
The policy must say what enters cache keys, replay capsules, tests, and user-visible diagnostics.

Do not use one global mutable fake clock or random source across concurrent sessions without
session-scoped ownership.

## Resource budgets

Track independent dimensions:

- evaluated nodes or bytecode instructions;
- function calls and recursion depth;
- frames and suspended computations;
- allocations and live heap;
- object, collection, and string size;
- output and diagnostic volume;
- regex, pattern, sort, hash, or other weighted operations;
- native call count and declared cost;
- I/O requests and bytes;
- wall-clock deadline and cancellation;
- cleanup reserve.

Charge before allocation or expensive work where possible. For size-dependent work, charge base plus
input and output growth. Native code must either consume the same budget or run behind a bounded
adapter; an instruction meter around an unbounded native call is not a sandbox.

Define terminal behavior for every exhausted dimension. Prevent catchable guest exceptions from
resetting or bypassing a hard sandbox budget unless the language explicitly permits a separately
bounded recovery region.

## Semantic differential tests

Compare:

- executable AST versus bytecode VM;
- interpreter versus specification model;
- optimized versus unoptimized bytecode;
- cached versus freshly compiled code;
- direct host adapter versus recorded or fake adapter;
- equivalent source transformations;
- serialize-deserialize or suspend-resume boundaries.

Normalize only representation details. Compare:

- result value and identity relations;
- ordered mutation and host-effect trace;
- completion kind and payload;
- guest error identity, source, and stack;
- final bindings and object graph observations;
- budget charges and terminal point;
- deterministic service consumption;
- source stepping and coverage where promised.

When engines disagree, use the semantic authority, not performance, implementation age, or majority.

## Failure matrix

| Fault or boundary | Required behavior |
| --- | --- |
| Host and guest numeric rules differ. | Guest value and operator contract wins. |
| Assignment key evaluation throws. | Later value evaluation and write follow declared ordering. |
| Return crosses nested cleanup. | Completion and cleanup order remains explicit. |
| Engine invariant throws a host exception. | It remains an engine defect, not a guest error. |
| Native retains a guest object. | Handle and GC root lifetime are visible and bounded. |
| Async native completes after cancellation. | Generation check rejects or handles stale completion. |
| Hash iteration changes across runs. | Specified order is preserved or seed is recorded as allowed nondeterminism. |
| String growth exceeds budget mid-operation. | Work stops before unbounded allocation and reports the correct budget. |
| Cleanup runs after budget exhaustion. | Cleanup uses a bounded reserve and cannot restart normal execution. |
| Cached bytecode uses old native symbols. | Cache validation rejects and recompiles or reports incompatibility. |

## Invariants

- Guest semantics never depend on an undocumented host default.
- Runtime values have one authoritative equality, identity, hash, and conversion contract.
- Semantic type, runtime kind, and storage tag remain independently replaceable.
- Operator decline is never confused with a thrown guest failure.
- A compound assignment resolves and evaluates its place exactly once.
- Evaluation order is observable and tested at every side-effecting boundary.
- Every nonlocal control result uses the declared completion protocol.
- Guest failures and engine defects remain distinguishable.
- Native code receives bounded capabilities and participates in lifetime, cancellation, and budget rules.
- Deterministic runs obtain every observable host input from the declared execution context.
- Every hard budget has an in-operation charge point and terminal rule.
- Differential tests compare semantic envelopes, not only printed values.

## Skill handoffs

- Use `interpreter-engineering-review` for guest semantics, runtime values, completion, native
  boundaries, determinism, and budgets.
- Use `parser-engineering-review` for token, grammar, CST, AST construction, parser recovery, and
  source-unit contracts.
- Use `compiler-engineering-review` for bytecode compiler transforms, IR verification, optimization,
  code generation, or stage-local wrong-code localization.
- Use `fuzz-harness-review` for harness, instrumentation, corpus, mutator, sanitizer, campaign, and
  generic artifact lifecycle.
- Use `security-flow-review` for host capability, authorization, filesystem, network, and secret
  exposure paths.
- Use `memory-lifetime-review` for GC, host handles, callbacks, arenas, and retained-object defects.
