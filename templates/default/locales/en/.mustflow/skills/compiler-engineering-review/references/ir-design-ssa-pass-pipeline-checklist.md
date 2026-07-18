# IR Design, SSA, and Pass Pipeline Checklist

Use this checklist when designing or changing compiler intermediate-representation layers, semantic
and storage contracts, progressive lowering, CFG and SSA form, canonicalization, analysis
preservation, or optimization-pipeline ordering.

## Contents

1. [IR semantic contract](#ir-semantic-contract)
2. [Layer decision ledger](#layer-decision-ledger)
3. [Source AST HIR MIR and LIR boundaries](#source-ast-hir-mir-and-lir-boundaries)
4. [Lowering information budget](#lowering-information-budget)
5. [Mixed-level legality](#mixed-level-legality)
6. [Effects and speculation](#effects-and-speculation)
7. [Semantic storage ABI and machine types](#semantic-storage-abi-and-machine-types)
8. [Explicit conversion values](#explicit-conversion-values)
9. [Ownership capability tokens](#ownership-capability-tokens)
10. [Ownership ABI and borrow flow](#ownership-abi-and-borrow-flow)
11. [Lifetime allocation view and provenance](#lifetime-allocation-view-and-provenance)
12. [Fact provenance scope and generation](#fact-provenance-scope-and-generation)
13. [Effect capture and speculation axes](#effect-capture-and-speculation-axes)
14. [Memory model and SSA limits](#memory-model-and-ssa-limits)
15. [Exceptional suspension and deoptimization control](#exceptional-suspension-and-deoptimization-control)
16. [Value symbol and source identity](#value-symbol-and-source-identity)
17. [Verifier ownership](#verifier-ownership)
18. [IR mutation transaction](#ir-mutation-transaction)
19. [Canonical-form windows](#canonical-form-windows)
20. [Text form replay and version boundary](#text-form-replay-and-version-boundary)
21. [Phi edge semantics](#phi-edge-semantics)
22. [Phi placement and sealed construction](#phi-placement-and-sealed-construction)
23. [Phi select and speculation](#phi-select-and-speculation)
24. [Critical duplicate and exceptional edges](#critical-duplicate-and-exceptional-edges)
25. [CFG mutation and SSA repair](#cfg-mutation-and-ssa-repair)
26. [Loop closure and irreducible control](#loop-closure-and-irreducible-control)
27. [SSA destruction](#ssa-destruction)
28. [Pass contracts](#pass-contracts)
29. [Information-aware pass ordering](#information-aware-pass-ordering)
30. [Normalization and cleanup budgets](#normalization-and-cleanup-budgets)
31. [Inlining promotion and scalarization](#inlining-promotion-and-scalarization)
32. [Propagation CFG simplification and deletion](#propagation-cfg-simplification-and-deletion)
33. [Loop transformation pipeline](#loop-transformation-pipeline)
34. [Target-lowering boundary](#target-lowering-boundary)
35. [Instrumentation profile and debug placement](#instrumentation-profile-and-debug-placement)
36. [Pipeline interaction evidence](#pipeline-interaction-evidence)
37. [Failure matrix](#failure-matrix)
38. [Invariants](#invariants)
39. [Skill handoffs](#skill-handoffs)

## IR semantic contract

Define an IR by meaning, not by its node classes or textual grammar.

For every operation, specify:

- operand and result domains;
- fixed-width, mathematical, trapping, wrapping, saturating, poison, or undefined arithmetic;
- memory reads, writes, allocation, release, and ordering;
- exception, trap, cancellation, suspension, deoptimization, and non-return behavior;
- alias, provenance, lifetime, alignment, and synchronization promises;
- control successors and edge-defined values;
- externally observable effects and source-language refinement.

A parser accepting the operation proves syntax only. An optimizer needs enough semantic facts to
decide whether it may delete, duplicate, reorder, combine, speculate, or lower that operation.

## Layer decision ledger

Describe each IR layer with one reviewable ledger:

- information present and intentionally absent;
- invariants and legal states;
- semantic types and control-flow form;
- effects and exceptional paths;
- identity and source-provenance model;
- analyses and transforms that consume it;
- producer and next lowering stage;
- verifier and negative fixtures;
- serialization and replay status;
- target and data-layout dependencies;
- creation, retention, and disposal lifetime.

Do not define a layer by labels such as `HIR`, `MIR`, or `LIR`; those names have no portable level
contract. Add a layer when consumers require conflicting invariants or information lifetimes. Merge
two layers when they carry the same meaning, invariants, and consumers and only copy nodes between
them.

## Source AST HIR MIR and LIR boundaries

Use source-oriented representations to preserve syntax, recovery, macro or generated provenance,
and user intent. Do not force malformed or recovered source into a fake valid semantic tree.

Move into a high-level semantic IR after the source constructs needed for parsing and expansion are
resolved enough that semantic consumers no longer need every surface variant. Preserve resolved
declaration identity, types available at that point, user-facing origin, and any unlowered intent
needed by diagnostics or language analysis.

Introduce a typed high-level layer when overload resolution, implicit conversions, automatic
reference behavior, pattern typing, or destruction decisions require completed type information
before executable control flow can be made explicit.

Treat a mid-level executable IR as the boundary where evaluation order, temporaries, places, moves,
copies, calls, continuations, cleanup, and language-level failure paths become explicit. Enter a
low-level or machine layer only when target widths, legal register types, calling convention,
addressing modes, instruction constraints, or physical-resource choices become part of the state.

## Lowering information budget

Treat lowering as controlled information destruction.

Before lowering an operation or type, record:

- which consumers still need its high-level intent;
- which legality or profitability questions become harder afterward;
- which source and semantic identity must survive;
- which effects and control paths are expanded;
- which new invariants the lower layer requires;
- which equivalence or refinement relation checks the conversion;
- whether mixed high- and low-level forms may coexist.

Delay lowering until the last relevant high-level consumer has run. Do not expect later pointer,
loop, or branch patterns to reconstruct ownership, tensor shape, pattern intent, exception regions,
or domain-specific operations reliably.

## Mixed-level legality

Allow progressive lowering only with an explicit legality contract.

Classify operations, types, regions, or dialects as:

- legal in the current target state;
- illegal and required to be eliminated;
- dynamically legal under a named predicate;
- temporarily legal only inside a bounded conversion region;
- materialization or bridge operations with explicit direction and lifetime.

Define whether conversion is partial or complete and what proves completion. Verify every rewritten
region immediately. Do not permit high- and low-level variants to coexist merely because a generic
node container can hold both.

## Effects and speculation

Represent effects as first-class semantic information. Include more than generic memory reads and
writes:

- allocation and release;
- I/O and host interaction;
- traps, exceptions, panic, and non-return;
- atomics and synchronization;
- runtime or thread-local state;
- suspension, resume, yield, and cancellation;
- deoptimization and stack-map dependencies;
- volatile, ordered, or externally observed actions.

Give simple consumers a conservative question such as whether an operation is movable,
duplicable, eliminable, or speculatable. Preserve a more detailed effect summary for stronger
analyses. A missing effect must force conservatism, not permission.

## Semantic storage ABI and machine types

Separate what a value means from how a target stores, passes, and executes it.

Keep source and mid-level semantic types independent of:

- pointer width and endianness;
- physical alignment and padding;
- register classes and legal machine widths;
- ABI argument and return locations;
- vector splitting, widening, or lane padding;
- object-header and runtime-layout details.

Use an explicit progression such as semantic type, storage type, ABI type, and machine type when
those contracts differ. Introduce data layout and storage types at a named boundary, ABI types when
calling-convention placement and hidden parameters become relevant, and machine types when legal
register or instruction representations take over. Prove each representation mapping for size,
alignment, valid bit patterns, ownership, and conversion. Do not leave machine selection to guess
layout, and do not contaminate target-independent transforms with physical details before they can
use them correctly.

## Explicit conversion values

Represent a type or abstraction transition with a new value and an explicit boundary operation.
Keep the source and target values alive together until every source-level consumer is rewritten or
retired.

For each conversion, record:

- source and destination representation;
- data layout, address space, and ABI context;
- ownership and lifetime transferred, retained, split, or consumed;
- facts preserved, weakened, or destroyed;
- materialization or bridge operations inserted for old consumers;
- verifier proving that no source-typed use remains after completion.

Do not change an existing value's type in place and leave consumers to infer which contract now
applies. A string carrying the old type name is provenance for diagnostics at best; it does not
preserve the executable semantics of the old value.

## Ownership capability tokens

Model exclusive release authority as a non-forgeable, non-copyable capability rather than a Boolean
pointer attribute.

Track:

- allocation identity carried by the capability;
- creation, move, split-if-allowed, merge-if-allowed, return, and consume transitions;
- pointer and view values that may alias the allocation without owning release authority;
- exactly-once release on normal, failure, exceptional, cancellation, and suspension paths;
- invalid use of a consumed or stale token;
- concrete lowering into handles, flags, wrappers, or runtime ownership state.

Use a dedicated opaque or linear type whose ordinary value operations cannot synthesize a valid
owner. A copied integer or Boolean is not ownership simply because a later pass interprets it that
way.

## Ownership ABI and borrow flow

Define ownership separately at function and external boundaries.

For every parameter and result, classify whether it is borrowed, owned, shared, mutable, escaping,
consumed, returned as an alias of an input, or newly allocated. Include callbacks, tail calls,
exceptions, unwinding, suspension, and foreign wrappers.

Represent a borrow as a permission whose creation dominates every use and whose end covers every
path after the final use under the IR's control-flow contract. At joins, carry borrow state through
block arguments or another explicit dataflow value. At loops, distinguish a loop-carried borrow
from an iteration-local reborrow. Keep alias analysis, which asks whether addresses may overlap,
separate from permission checking, which asks whether simultaneous access is allowed.

## Lifetime allocation view and provenance

Model object lifetime as a state machine over an allocation identity and epoch, not as a destructor
location or raw address interval.

Separate:

- allocation identity and lifetime epoch;
- numeric address and address space;
- base, offset, shape, stride, and view bounds;
- live, uninitialized, initialized, moved, retired, and dead states as needed;
- storage reuse that starts a new lifetime at the same address;
- release authority and non-owning aliases;
- provenance exposure, address extraction, and pointer reconstruction.

A lifetime hint for stack optimization does not prove destructor execution or heap release. Equal
addresses across epochs do not imply one object. Non-overlapping views may still share one release
identity. Preserve these distinctions until the consumer that owns lifetime, alias, or release
correctness has discharged them.

## Fact provenance scope and generation

Treat every optimization fact as a scoped proof object with an expiry rule.

Record at least:

- proposition and subject identity;
- origin analysis, contract, assumption, or runtime guard;
- domain, region, function, loop, call, or alias scope;
- allocation identity and lifetime epoch when memory is involved;
- IR generation or mutation version;
- status such as proven, assumed, unknown, or contradicted;
- consumers permitted to use the fact;
- mutations that preserve, recompute, weaken, or drop it.

At control-flow joins, retain only facts justified on every incoming path unless the IR represents a
path-dependent disjunction explicitly. When values are merged, keep facts true of the merged value,
not the union of unrelated promises. When a mutation changes memory, identity, layout, or control,
advance the relevant generation and make older facts unavailable until revalidated.

## Effect capture and speculation axes

Model effects, pointer capture, and speculation as related but independent axes.

Distinguish:

- read, write, allocate, release, and synchronization;
- address capture, provenance capture, and escape;
- trap, exception, non-return, cancellation, and suspension;
- host, I/O, runtime, thread-local, volatile, and ordered effects;
- movable, duplicable, eliminable, and speculatable predicates.

An operation may capture a pointer without reading memory, or trap without writing memory. Absence
of an effect interface means unknown, not pure. Require each transformation to ask the exact
question it needs rather than treating `no memory write` as permission to move, duplicate, or erase.

## Memory model and SSA limits

Treat scalar SSA as a def-use representation for values, not as a solution to memory identity.

Model or analyze:

- alias sets and disjointness evidence;
- allocation identity and pointer provenance;
- object and subobject lifetime;
- load and store ordering;
- atomic mode and synchronization scope;
- volatile and externally visible access;
- calls and unknown effects;
- memory versions or reaching definitions under may-alias relationships.

Require memory transforms to cite the alias, lifetime, effect, and ordering facts that make them
legal. If the memory model is incomplete, stay conservative or narrow the optimization contract.

## Exceptional suspension and deoptimization control

Put every executable continuation in the control-flow model when it affects dominance, liveness,
cleanup, or value availability.

Represent normal return, exceptional unwind, trap, suspension, resume, yield, deoptimization,
cancellation, and non-return paths with explicit successors or an equally precise region contract.
State on which edge a call result becomes available. Keep cleanup and ownership transitions tied to
the actual path.

Do not store a possible unwind or suspension only as metadata next to an ordinary returning call.
Transforms must see paths that constrain motion, phi inputs, resource release, and stack maps.

## Value symbol and source identity

Separate these identities:

- SSA or temporary value identity;
- declaration and symbol identity;
- source construct and user-visible operation identity;
- allocation or storage identity;
- debug variable and scope identity;
- clone, inline, macro, specialization, or transform origin.

Equal values do not imply equal declarations or source objects. Cloned nodes do not automatically
represent new user operations. Preserve a stable origin chain across lowering, inlining, cloning,
folding, and code generation so diagnostics, incremental caches, profiles, and debug information can
relate optimized artifacts to the right source entity.

## Verifier ownership

Give every IR stage and transition an owning verifier. Define `required`, `forbidden`, and
`guaranteed` invariants for the stage instead of weakening one global verifier until it accepts every
temporary state.

Order verification so later checks may rely on earlier ones:

1. container, operand-count, result-count, terminator, and structural integrity;
2. local type, attribute, property, and operation constraints;
3. trait or interface contracts;
4. region, CFG, dominance, ownership, effect, and cross-operation semantics;
5. target layout, ABI, or machine constraints when their context exists.

Use a generic defensive printer for malformed artifacts. Do not invoke a custom printer whose own
preconditions are the broken invariants being diagnosed.

Check the relevant subset of:

- type and operation legality;
- block termination and successor shape;
- predecessor and edge multiplicity;
- dominance and edge-defined values;
- phi or block-argument agreement;
- region isolation and nesting;
- effect, ownership, and lifetime rules;
- target and calling-convention constraints;
- absence of operations forbidden after a lowering stage;
- analysis currency where it can be checked.

Place verifier calls after parsing, generation, lowering, canonicalization, mutation, and every
transform in debug or validation lanes. Build negative fixtures by violating one named invariant at
a time.

Make invalid IR difficult to construct. Derive typed builders, required properties, parsers,
printers, and local verification from one operation schema where the repository supports that
pattern. Restrict raw construction to parsers, deserializers, fuzzers, reducers, and other named
escape hatches.

Keep specialized verifiers independent where the evidence differs:

- SSA verifier for live definitions, use-list symmetry, edge arity, terminators, dominance, and
  stale references;
- ownership verifier for capability-token flow, borrows, moves, escape, and exactly-once release;
- effect and speculation verifier for motion, duplication, deletion, trap, and capture claims;
- layout and ABI verifier for size, alignment, address space, aggregate layout, hidden parameters,
  promotions, and caller-callee mapping;
- semantic refinement checker for whether a structurally valid transform preserves the permitted
  observable behaviors within its supported model.

Attack the verifier itself. Starting from valid IR, remove operands, change types, reorder block
arguments, remove terminators, duplicate owner capabilities, move lifetime ends, overstate
alignment, leak alias scope, or retain a stale generation. Require stable rejection with the stage,
operation, invariant identity, location, and related definition; an assertion or verifier crash is a
verifier defect.

## IR mutation transaction

Treat an IR mutation and all dependent analysis changes as one transaction.

For each mutation API, define:

- values, blocks, edges, regions, symbols, and effects changed;
- analyses updated incrementally;
- analyses invalidated and recomputed before reuse;
- worklists, caches, profile data, debug origins, and source maps updated;
- verifier point before the next consumer;
- rollback or failure behavior for multi-step rewrites.
- fact transitions for type, ownership, borrow, lifetime, alias, provenance, alignment, range,
  effect, capture, layout, profile, and target facts using preserve, recompute, weaken, or drop.

Do not publish a half-mutated CFG while old dominance, loop, memory, liveness, or call-graph results
remain queryable. Preserve only analyses whose dependency set the mutation demonstrably leaves
unchanged. Default unspecified preservation to invalidation. In audit lanes, recompute every analysis
a pass claims to preserve and compare the full semantic result rather than trusting cache identity.

## Canonical-form windows

Treat a canonical form as a consumer precondition with an ownership window, not as permanent
beautification.

For each form, name:

- the pass that establishes it;
- the verifier or predicate that recognizes it;
- the consumers that require it;
- transformations allowed to break it;
- the point where it is re-established or no longer required;
- compile-time and code-size cost of maintaining it.

Examples include loop preheaders, latches, dedicated exits, loop-closed SSA, normalized branches,
and legalized operation sets. Avoid global invariants that force unrelated passes to undo and redo
the same structure.

## Text form replay and version boundary

Provide a deterministic, parseable representation for stage-local debugging and tests.

Require:

- stable ordering or explicit normalization;
- parse-print-parse structural and semantic round trip;
- target, data-layout, feature, and schema context;
- bounded pass-before and pass-after dumps;
- minimal direct-stage reproduction;
- verifier diagnostics tied to stable invariant IDs;
- versioning and compatibility policy.

Keep an internal mutable representation separate from a long-lived exchange, plugin, cache, or file
format unless compatibility is an intentional product contract. Deterministic text is evidence and
replay infrastructure, not permission to freeze every internal implementation detail.

## Phi edge semantics

Model a phi or block argument as a value selected by the incoming edge, not as a sequential
assignment executed inside the destination block.

Verify:

- one input for every incoming edge, including duplicate edges when the IR distinguishes them;
- incoming values are available on their specific edges;
- exceptional or normal-only results are used only on valid successors;
- all phi decisions at a block entry are simultaneous;
- edge removal, retargeting, and insertion update every affected phi.

Do not key phi inputs only by predecessor block when one predecessor can contribute multiple edges
with different meanings.

## Phi placement and sealed construction

Place phi nodes from control and liveness facts, not visual guesses.

For batch construction, derive candidates from iterated dominance frontiers and prune values not
live at the join. For incremental direct SSA construction, keep incomplete phis in blocks whose
predecessor sets are still open, seal the block only when no more predecessors can arrive, then fill
and simplify its phis.

Exercise loop headers, backedges, unreachable predecessors, exception edges, and later edge
insertion. Sealing too early omits definitions; sealing too late grows redundant phis and lookup
cost. Require trivial-phi removal to preserve edge semantics and not rewrite a value to itself
through a cycle.

## Phi select and speculation

Do not replace a phi with a select solely because both choose between two values.

A phi chooses from the path already taken. A select evaluates a condition at its instruction point
and requires both candidate values to be available there. Before conversion, prove:

- both definitions dominate the select;
- moving or duplicating their computation is legal;
- traps, exceptions, poison, memory, and other effects are safe under speculation;
- control-dependent resource and lifetime behavior is preserved;
- the target cost model accepts the change when profitability matters.

An unexecuted division, load, allocation, or call cannot be hoisted merely to make a select-shaped
rewrite possible.

## Critical duplicate and exceptional edges

Split an edge when an edge-specific operation cannot be placed safely in either adjacent block.

Check:

- predecessors with multiple successors;
- destinations with multiple predecessors;
- duplicate edges to the same destination;
- switch or indirect-control multiplicity;
- exceptional, cleanup, suspend, and resume edges with insertion restrictions;
- branch weights, profile identity, source provenance, and loop membership after splitting.

Do not apply a generic critical-edge helper to an edge class whose region, exception, or target
contract forbids arbitrary blocks or instructions.

## CFG mutation and SSA repair

Combine branch retargeting, block cloning, jump threading, tail duplication, edge splitting, block
merging, and unreachable removal with SSA repair.

Update or recompute:

- phi inputs and edge multiplicity;
- dominance and post-dominance;
- loop and region membership;
- loop-closed SSA;
- memory SSA and alias summaries;
- liveness and reaching definitions;
- ownership or borrow facts;
- profile, debug, and source-origin data;
- worklists and cached handles.

Do not replace uses globally without proving the new definition dominates every rewritten use.

## Loop closure and irreducible control

Use loop-closed SSA or an equivalent boundary when loop transforms need local ownership of values
leaving the loop. Put exit values in exit-block phis so cloning, rotation, unswitching, and deletion
update a bounded interface.

Do not assume every cycle is a structured loop with one dominating header. Exercise irreducible
regions, exitless loops, unreachable cycles, exceptional exits, non-returning blocks, and multiple
latches. Keep cycle detection, loop-analysis semantics, and language-level structured control as
separate concepts.

## SSA destruction

Lower phi semantics to parallel copies on predecessor edges or equivalent split blocks.

Build the complete copy set before scheduling. Detect cycles such as simultaneous exchanges and use
temporary locations or a proven scheduling algorithm. Preserve register classes, subregisters,
widths, exceptional-edge restrictions, and liveness. Split critical edges where copies cannot be
placed without affecting another path.

Run coalescing only under interference and target constraints. Destroy SSA late enough to retain
sparse-analysis and optimization benefits, but before consumers require physical or two-address
machine constraints.

## Pass contracts

Give every pass a machine-checkable or reviewable contract:

- accepted IR layer and canonical forms;
- semantic and definedness preconditions;
- legal operation, type, effect, and target subset;
- transformations it may perform;
- structural and semantic postconditions;
- analyses preserved, updated, or invalidated;
- source, debug, profile, and identity obligations;
- termination, convergence, code-size, and compile-time budget;
- verifier and activation evidence.

An executed pass that declines every candidate does not exercise its transformation. Record trigger
and rejection reasons separately from pass invocation.

## Information-aware pass ordering

Build the pipeline from producer and consumer contracts.

For every adjacent pass pair, ask:

- did the producer establish the consumer's required form and analyses;
- did an earlier lowering destroy information a later transform needs;
- did a transform expose new cleanup or propagation opportunities;
- did code growth make a later analysis or transform unprofitable;
- did target information arrive early enough for legality and cost without infecting high-level
  semantics;
- did instrumentation or debug mapping observe the intended program version;
- did analysis invalidation occur before the next query.

Do not arrange passes by name familiarity or one benchmark result.

## Normalization and cleanup budgets

Run normalization and cleanup around transformations that create their opportunities, not blindly
to a global fixed point.

Record:

- which rewrite families can enable one another;
- a monotonic measure or bounded iteration count;
- per-iteration IR change, code-size, compile-time, and memory cost;
- oscillation fingerprints;
- canonical-form conflicts between passes;
- no-change termination.

If two passes prefer opposite forms, define a phase owner or one-way boundary. Do not hide an
oscillation behind a timeout or a large arbitrary iteration limit.

## Inlining promotion and scalarization

Stage inlining by obligation and profitability. Separate mandatory semantic inlining from
profile- or cost-driven inlining and retain cleanup afterward. Too-early broad inlining duplicates
cold or unoptimized paths; too-late inlining hides constant arguments, devirtualization,
specialization, and interprocedural simplification.

Promote memory temporaries when doing so clarifies value flow for later analyses. Do not confuse
promotion with destroying high-level aggregates, vectors, tensors, ownership groups, or layout
intent. Scalarize only after the last consumer of the wider semantic structure and under a target or
cost contract that justifies it.

## Propagation CFG simplification and deletion

Treat constant propagation, branch simplification, unreachable elimination, phi folding, and dead
code deletion as a bounded cooperating group.

After propagation changes a condition, simplify the CFG and remove newly dead definitions. After
deletion and block merging, revisit phis and newly exposed constants. Bound repetition by actual
change and cost. Preserve effects, traps, exceptional paths, source identities, and debug or profile
mapping while deleting apparently unused operations.

Do not use one final output comparison as evidence that every intermediate analysis remained valid.

## Loop transformation pipeline

Prepare loop transforms with the structures and analyses they require:

- canonical loop entry, latch, and exits;
- loop-closed values;
- induction and trip-count facts;
- alias, dependence, effect, and memory-order evidence;
- profile and target cost information;
- code-size and register-pressure budgets.

Run destructive code-growth transforms in an order that does not erase vectorization, fusion,
distribution, or target opportunities prematurely. Keep legality separate from profitability. Apply
late unrolling or cleanup to remaining loops only after earlier consumers have made their decisions.

## Target-lowering boundary

Introduce target details in stages:

1. retain target-independent semantics while consulting target cost where safe;
2. legalize types and operations under explicit representation mappings;
3. select instructions into target-aware virtual-register form;
4. perform machine-level optimization and scheduling;
5. destroy SSA and allocate physical resources;
6. finalize frames, prologues, epilogues, relaxation, and late cleanup.

Do not commit to physical registers and opcodes before target-independent transforms finish. Do not
delay target legality, address modes, immediate limits, calling convention, or register constraints
until after decisions that require them.

## Instrumentation profile and debug placement

Place sanitizers, coverage, profile collection, stack maps, tracing, and debug propagation according
to the source or optimized program they are intended to observe.

Record:

- source operations that must remain instrumented;
- optimization that may merge, clone, or remove them;
- counter and profile identity through CFG changes;
- runtime effects introduced by instrumentation;
- ordering constraints with lowering and code generation;
- origin-chain updates after cloning and inlining;
- effect on optimization legality, code size, and timing.

Do not insert instrumentation at a convenient pass-manager hook without defining its observation
contract.

## Pipeline interaction evidence

Test passes individually and as interacting sequences.

Require a bounded matrix containing:

- verifier-after-each-transform lanes;
- pass-before and pass-after direct-stage fixtures;
- analysis recomputation comparisons;
- known prerequisite and cleanup sequences;
- alternate valid pass sequences where supported;
- random or generated valid pass-transition paths;
- optimization-before and optimization-after execution comparison;
- translation validation for supported transforms;
- code size, compile time, peak memory, spills, and cold-path growth;
- source, debug, profile, and instrumentation mapping.

Reduce a failing sequence while preserving the first violated contract, not merely the final wrong
output.

## Failure matrix

| Failure or design smell | Required response |
| --- | --- |
| Operation grammar exists but overflow or effects are unspecified. | Define the semantic contract before adding transforms. |
| A new IR layer differs only by node names. | Merge it or identify the conflicting invariant that justifies the layer. |
| Lowering erases intent needed by a later pass. | Move lowering after the consumer or preserve an explicit abstraction. |
| High- and low-level operations mix without legality rules. | Define partial or complete conversion and a verifier. |
| A value changes representation in place. | Create an explicit conversion result and retire old uses through a checked boundary. |
| Ownership is a copyable flag on a pointer. | Use a non-forgeable capability flow tied to allocation identity. |
| Borrow and alias analysis are treated as one fact. | Separate address overlap from access permission and lifetime. |
| A reused address is treated as the same object. | Track allocation identity and lifetime epoch independently from address. |
| Facts survive a merge or clone by union. | Retain only jointly proven facts and apply an explicit fact-transition rule. |
| A stale fact has no generation or invalidation owner. | Make it unavailable until recomputed or re-established by a guard. |
| Missing effect metadata is interpreted as pure. | Treat missing information as unknown and stay conservative. |
| Scalar SSA is treated as alias proof. | Add memory, provenance, lifetime, and effect analysis. |
| Unwind or suspension exists only as metadata. | Put the continuation into the control-flow contract. |
| CFG changes but preserved analyses remain queryable. | Update or invalidate them in the same mutation transaction. |
| Canonical form is maintained globally without a consumer. | Restrict it to an ownership window. |
| Phi input is keyed only by predecessor block. | Preserve incoming-edge multiplicity and availability. |
| Phi is replaced by select with trapping operands. | Prove speculation safety or keep control dependence. |
| SSA copies are emitted sequentially and overwrite a cycle. | Schedule a parallel-copy set with temporaries. |
| Cleanup passes oscillate. | Add a phase direction, monotonic measure, and bounded budget. |
| Target information arrives after legality decisions. | Move the required target contract earlier without leaking physical form upward. |
| Each pass passes alone but the pipeline miscompiles. | Preserve and reduce the first failing pass interaction. |
| The verifier accepts only positive fixtures. | Mutate one invariant at a time and require stable rejection diagnostics. |
| Structural verification is called semantic preservation. | Add an independent refinement, execution, or differential oracle. |

## Invariants

- Every IR operation has defined value, control, effect, failure, and memory semantics.
- Every IR layer names its information, invariants, consumers, verifier, lowering, and lifetime.
- Lowering destroys information only after the last declared consumer or through a checked mapping.
- Mixed-level IR has explicit legality and completion rules.
- Semantic types remain distinct from target storage and ABI types until a named boundary.
- Representation changes create explicit values and declare every preserved or destroyed fact.
- Ownership release authority is non-forgeable and distinct from pointer or view aliasing.
- Borrow permission, alias possibility, object lifetime, allocation identity, address, and provenance
  remain separate facts.
- Every optimization fact names its origin, scope, epoch, generation, status, consumers, and
  invalidating transitions.
- Missing or stale effects and analyses default to unknown or unavailable, not optimistic reuse.
- Exceptional, suspended, deoptimized, and non-returning behavior participates in control flow.
- Value, symbol, source, storage, and debug identities are not conflated.
- Every IR mutation updates or invalidates dependent analyses before another consumer runs.
- Every IR stage has ordered structural, local, region, ownership, effect, and target verification
  appropriate to that stage.
- Every verifier rule has a focused negative or mutation fixture, and structural validity remains
  distinct from semantic refinement.
- Phi inputs correspond to incoming edges and SSA destruction preserves parallel-copy semantics.
- Canonical forms exist for named consumers and bounded ownership windows.
- Pass ordering follows prerequisites, preserved information, target needs, and cost budgets.
- Pipeline interaction evidence localizes the first violated stage contract.

## Skill handoffs

- Use `compiler-engineering-review` for IR semantics, layer boundaries, CFG and SSA, analysis
  preservation, pass pipelines, lowering, optimization, code generation, and compiler oracles.
- Use `parser-engineering-review` for lexer, CST, AST construction, syntax recovery, source ranges,
  and incremental parse structure before semantic lowering.
- Use `formal-verification-review` for deductive refinement, bounded model checking, solver evidence,
  or formal proof of an IR transform or pipeline relation.
- Use `fuzz-harness-review` for generic harness reset, mutation feedback, corpus, campaign,
  sanitizer, crash minimization, and long-running fuzz operation.
- Use `race-condition-review` for concrete compiler-internal schedules, shared analysis caches,
  concurrent mutation, and memory ordering.
- Use `test-maintenance` for deterministic stage and pipeline regression fixtures.
