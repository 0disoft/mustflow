# Formal Memory, Bounds, and CI Checklist

Use this checklist when proving machine arithmetic, indexing, pointers, allocation lifetime,
bounded exploration, external stubs, counterexample replay, assumption governance, refinement maps,
verification cost, proof brittleness, or continuous verification behavior.

## Contents

1. [Target arithmetic semantics](#target-arithmetic-semantics)
2. [Pre-operation overflow obligations](#pre-operation-overflow-obligations)
3. [Casts and shifts](#casts-and-shifts)
4. [Index construction](#index-construction)
5. [Pointer validity](#pointer-validity)
6. [Range overlap](#range-overlap)
7. [Allocation lifetime state machine](#allocation-lifetime-state-machine)
8. [Boundary partitions](#boundary-partitions)
9. [Bounded-check completeness](#bounded-check-completeness)
10. [Nondeterministic unsafe and FFI harnesses](#nondeterministic-unsafe-and-ffi-harnesses)
11. [Counterexample replay](#counterexample-replay)
12. [Verification lanes](#verification-lanes)
13. [Toolchain and solver pinning](#toolchain-and-solver-pinning)
14. [Specification ownership](#specification-ownership)
15. [CI result mapping](#ci-result-mapping)
16. [Proof cost telemetry](#proof-cost-telemetry)
17. [Vacuity and sensitivity jobs](#vacuity-and-sensitivity-jobs)
18. [Assumption manifest](#assumption-manifest)
19. [Contract compatibility](#contract-compatibility)
20. [Verification-debt ratchet](#verification-debt-ratchet)
21. [Counterexample assets](#counterexample-assets)
22. [Executable refinement map](#executable-refinement-map)
23. [Proof brittleness](#proof-brittleness)
24. [Failure matrix](#failure-matrix)
25. [Invariants](#invariants)
26. [Skill handoffs](#skill-handoffs)

## Target arithmetic semantics

Pin the executable value model before proving arithmetic:

- integer width and signedness;
- overflow behavior for each operation and build mode;
- checked, wrapping, saturating, trapping, or undefined operations;
- cast truncation, sign extension, zero extension, and reinterpretation;
- shift amount domain;
- division and remainder edge behavior;
- floating-point format, rounding, contraction, exceptions, NaN, infinity, and signed zero;
- pointer width and address-space rules;
- target, compiler, feature, and runtime assumptions.

If the specification uses mathematical integers or reals, create explicit refinement lemmas from
the mathematical domain to the target representation. A proof over a larger ideal domain does not
automatically hold for fixed-width execution.

## Pre-operation overflow obligations

Prove safety before evaluating an operation that can overflow or become undefined.

For unsigned-style arithmetic, useful shapes include:

- addition: `a <= MAX - b`;
- subtraction: `b <= a` when underflow is forbidden;
- multiplication: `a == 0 || b <= MAX / a`;
- endpoint: `start <= limit && length <= limit - start`;
- midpoint: derive from a nonnegative difference instead of adding endpoints first.

Signed domains need lower and upper obligations, including minimum negation, absolute value of the
minimum, and minimum divided by negative one where relevant.

Do not compute the dangerous value and assert afterward. The proof and implementation must avoid the
invalid intermediate operation itself.

## Casts and shifts

Treat each cast and shift as a separate proof obligation.

Check:

- narrowing removes only proven-zero or otherwise allowed high bits;
- signed-to-unsigned conversion excludes or specifies negatives;
- unsigned-to-signed conversion stays in the target range;
- extension preserves the intended value;
- floating and integer conversion handles range, precision, NaN, and exceptional cases;
- shift amount is nonnegative and below the bit width;
- left-shift value constraints match the language semantics;
- pointer and integer conversion preserves only the guarantees the target memory model allows;
- reconstructed pointers retain required provenance and alignment.

A bit-pattern equality does not prove a valid typed value or usable pointer.

## Index construction

Prove every arithmetic step that constructs an index.

For a range, prefer conditions that avoid overflowing an endpoint:

- `start <= total`;
- `length <= total - start`;
- access offset is below `length`;
- final index derives from already-proved differences.

For multidimensional layout, separate row multiplication, column addition, stride, padding, and final
allocation bounds. Include zero dimensions, empty slices, last valid element, one-past-end pointers,
and maximum representable sizes.

Do not infer safe intermediate arithmetic from a small final result; overflow can wrap back into the
accepted range.

## Pointer validity

Non-null is only one obligation. A dereference may also require:

- allocation exists and has not been freed;
- offset and access width stay inside the allocation;
- alignment satisfies the accessed type;
- bytes are initialized where required;
- the bit pattern is valid for the target type;
- provenance permits the access;
- alias, exclusivity, and mutation rules hold;
- thread and synchronization rules permit the access;
- object lifetime covers the full operation;
- pinning or movement rules preserve the location.

Model unsafe code as a place where these obligations become explicit, not a region where undefined
behavior is permitted.

## Range overlap

Represent a region as allocation identity plus `[start, end)` offsets. Before comparing regions,
prove endpoint arithmetic and allocation membership.

For two ranges, classify:

- distinct allocations;
- empty ranges;
- adjacent ranges;
- exact alias;
- partial overlap;
- containment;
- one-past-end values that are not dereferenceable;
- operation semantics that permit or forbid overlap.

Pointer inequality is insufficient. If overlap is allowed, prove the copy or move semantics under
the chosen direction and observation. If forbidden, make non-overlap a caller obligation with an
actual witness and runtime guard where untrusted callers exist.

## Allocation lifetime state machine

Model allocation and resource lifetime as states and transitions, for example:

- absent;
- allocated but uninitialized;
- initialized and owned;
- borrowed or shared under a declared permission;
- moved or transferred;
- closing or partially released;
- freed or retired.

For each transition, prove:

- allowed source state;
- new owner and aliases;
- initialized fields and valid representations;
- access permissions;
- exactly-once release;
- failure cleanup;
- invalidation of stale aliases;
- callback, concurrency, and reentrancy behavior;
- external resource correspondence.

Integer timestamps or generation counters can support the model, but lifetime itself is a state and
ownership relation, not a numeric comparison.

## Boundary partitions

Treat zero, one, minimum, maximum, and threshold-adjacent values as separate control-flow classes.

Cover:

- empty and singleton collections;
- `length - 1`, modulo by length, and last-element loops;
- minimum and maximum fixed-width values;
- exact capacity and capacity plus one;
- midpoint and binary-search arithmetic;
- zero-size allocation and one-past-end values;
- exact alignment and one unit of misalignment;
- recursion or loop bound minus one, equal, and plus one;
- scope or actor count around the smallest plausible counterexample.

Do not remove boundaries with assumptions merely because they complicate the proof. If the API truly
forbids them, prove the caller boundary and contract compatibility.

## Bounded-check completeness

Record every bound used by symbolic or bounded exploration:

- loop unwind;
- recursion depth;
- allocation count and size;
- object, pointer, and thread count;
- array and input length;
- scheduler steps;
- trace length;
- integer bit width;
- external-call and retry count;
- solver time, memory, and path limits.

Require the tool's completeness, unwinding, or coverage assertion for all executions permitted by
the public input contract before making an unbounded claim. Otherwise state that the property holds
or no counterexample was found within the explicit domain.

Increasing a bound can change feasibility dramatically. Use a measured bound ladder and preserve the
largest completed domain plus all incomplete statuses.

## Nondeterministic unsafe and FFI harnesses

For an unsafe wrapper or FFI adapter, generate every input allowed by the public precondition rather
than a few examples.

The harness should model or assume only:

- documented caller obligations;
- allocation and lifetime state;
- pointer range, alignment, initialization, and alias rules;
- machine arithmetic and target facts;
- permitted external return, failure, cancellation, and callback behavior;
- bounded resource and concurrency behavior.

Assert internal safety, returned state, frames, ownership, and cleanup. Keep external library stubs
in the assumption manifest and validate their concrete boundary at runtime. A stub is a modeled
promise, not a verified external implementation.

## Counterexample replay

Convert a formal counterexample into a reproducible implementation experiment.

Preserve:

- model and property revision;
- exact bound and solver configuration;
- initial state and nondeterministic choices;
- transition trace;
- translated implementation input and event schedule;
- expected forbidden observation;
- implementation, compiler, runtime, and target identity;
- replay result and mismatch classification.

Replay can fail because the model is too abstract, the mapping drifted, the implementation differs,
the environment is missing, or the tool semantics do not match the target. Investigate the boundary
before dismissing the trace or declaring a product bug.

## Verification lanes

Use bounded lanes with different purposes:

| Lane | Typical evidence |
| --- | --- |
| Change gate | Changed contracts, fast proofs, small bounded checks, assumption and debt delta |
| Main or merge | Broader module closure, counterexample replay, contract compatibility |
| Periodic | Larger scope, unwind, state exploration, repeated complexity and stability checks |
| Canary | Toolchain candidate, extraction or generated-code path, selected implementation traces |
| Release | Supported models, larger bounds, trusted-base review, binary or target evidence |

Each lane needs a declared time, memory, state, artifact, retry, and ownership budget. Do not move an
unbounded model exploration into a change gate. Do not report a skipped deeper lane as green.

## Toolchain and solver pinning

Version every input that can change proof search or semantics:

- verifier or proof assistant;
- solver and proof-certificate checker;
- standard and third-party libraries;
- tactics, plugins, and code generators;
- compiler, linker, runtime, and target;
- command options, triggers, seeds, and resource settings;
- container or environment digest;
- package and toolchain lockfiles.

Upgrade verification infrastructure separately from feature changes. Compare valid, invalid,
unknown, timeout, unsupported, incomplete, resource count, counterexample, and generated artifact
changes before promotion.

## Specification ownership

Treat specifications, models, assumptions, mappings, and proof code as production sources.

Require:

- named owners and reviewers;
- implementation and contract diffs shown together;
- stronger review for weakened postconditions, stronger preconditions, new axioms, or reduced bounds;
- source control and release history;
- direct links from implementation boundaries to owning formal artifacts;
- generated versus source-owned classification;
- migration plan when model schema or proof libraries change.

Changing a specification until the implementation verifies can be more dangerous than changing the
implementation. Make logical weakening visible.

## CI result mapping

The CI adapter must preserve raw tool outcomes. Map at least:

- valid;
- invalid or failed obligation;
- concrete counterexample;
- unknown;
- timeout or resource exhausted;
- unsupported construct;
- incomplete unwind or scope;
- integration or tool failure;
- unstable result across repeats.

Treat every non-valid state according to repository policy, but never translate it to valid merely
because no counterexample was printed. Store raw logs and structured result metadata within privacy
and retention policy.

## Proof cost telemetry

Track more than wall time:

- obligation and assertion count;
- solver resource count;
- explored and distinct states;
- scope, bit width, unwind, and trace bound;
- memory and generated artifact size;
- cache hit or proof reuse;
- retries and repeated-run variance;
- slowest lemma, method, property, or transition family.

Use resource and state counts to find growth before a hard timeout. Compare equivalent hardware or
normalized metrics where possible. A proof that remains valid but grows from seconds to minutes is
an operational regression.

## Vacuity and sensitivity jobs

Run explicit proof-health checks:

- satisfiable precondition witness;
- reachable initial state;
- cover each critical success, failure, retry, cancellation, and cleanup branch;
- invert or negate a key postcondition;
- delete or bypass a required implementation step;
- inject a known invariant or frame violation;
- lower and raise bounds around a known counterexample;
- remove one assumption expected to be necessary;
- replay a retained negative control.

The goal is not a universal mutation score. It is proof that the current obligations are sensitive to
the defects they claim to exclude.

## Assumption manifest

Maintain one machine-readable or reviewable inventory of:

- axioms and admitted or incomplete proofs;
- external, native, and FFI stubs;
- environment and scheduler models;
- fairness assumptions;
- integer and memory domains;
- object scopes, trace bounds, and unwind limits;
- unsupported features;
- generated-code, extraction, compiler, runtime, and hardware trust;
- privacy, security, and availability assumptions;
- owner, rationale, review date, and planned discharge.

Fail static policy when code introduces an undeclared assumption. Treat new assumptions, weaker
models, smaller bounds, and broader trusted components as reviewable risk deltas.

## Contract compatibility

Compare old and new contracts logically.

For caller compatibility, the old accepted domain should remain inside the new accepted domain. A
typical obligation is that the old precondition implies the new precondition.

For guarantee compatibility, every new permitted result should still satisfy the old guarantee. A
typical obligation is that the new postcondition implies the old postcondition under a shared
observation and outcome.

Also compare:

- frames and allowed mutations;
- exceptional and failure postconditions;
- termination and liveness guarantees;
- fairness and environment assumptions;
- numeric and memory domains;
- bounds and trusted-base changes.

Textual diff does not reveal logical strengthening or weakening.

## Verification-debt ratchet

Baseline debt categories:

- admitted, skipped, or placeholder proofs;
- unproved obligations;
- unknown, unsupported, or incomplete results;
- external assumptions and stubs;
- missing refinement mappings;
- low scope or unwind bounds;
- unstable or flaky proof obligations;
- absent counterexample replay;
- unowned specification or generated artifact.

Prevent changed scope from adding debt without explicit approval and rationale. Retire existing debt
incrementally, prioritizing security, concurrency, money, unsafe memory, external ownership, and
high-change boundaries. Do not demand instant total coverage if that would cause the verification
system to be bypassed or removed.

## Counterexample assets

Keep counterexamples as durable evidence:

- original formal trace or assignment;
- minimized model trace when supported;
- implementation replay input and schedule;
- ordinary regression or property seed;
- model and implementation revisions;
- exact property identity and result taxonomy;
- bound, assumption, and environment capsule;
- resolution and root-cause notes;
- privacy and license classification.

Do not bury the only counterexample in transient CI logs. Do not discard the formal artifact after
promoting an ordinary test; the two assets prove different boundaries.

## Executable refinement map

Connect model and implementation using an executable or mechanically checked map where feasible.

Map:

- model variables to implementation fields or derived facts;
- model actions to methods, events, storage transitions, or trace records;
- atomic model actions to one or more implementation steps;
- implementation-only states to abstraction classes;
- failures, retries, timeouts, and duplicates;
- identifiers, epochs, versions, and ownership;
- external observations and nondeterminism.

Use implementation logs to generate model action traces, model transitions to generate integration
inputs, or shared schemas to generate both sides. Validate map version and reject stale traces. A
prose table alone will drift.

## Proof brittleness

Treat a proof as unstable when equivalent reruns or small unrelated edits cause large result or cost
changes.

Diagnose:

- oversized solver context;
- quantifier trigger sensitivity;
- hidden tactic or search ordering;
- shared global facts;
- monolithic methods or theorems;
- solver or library version drift;
- unstable generated names or order;
- proof cache contamination;
- resource limit cliffs.

Split lemmas and obligations, minimize imported facts, stabilize intermediate interfaces, and track
resource variance. Do not hide brittleness with retry-until-one-run-passes.

## Failure matrix

| Failure or CI smell | Required response |
| --- | --- |
| Mathematical addition is proved but machine addition wraps. | Add target-width and pre-operation obligations. |
| `base + length` is checked only afterward. | Rewrite the guard to avoid invalid intermediate arithmetic. |
| Non-null pointer is outside its allocation. | Add allocation, offset, lifetime, alignment, and validity facts. |
| Bound is too small to cover an allowed loop. | Increase it or narrow the public domain; preserve incomplete status. |
| FFI stub promises successful output only. | Model declared failure and record the stub as an assumption. |
| Formal trace does not replay. | Inspect refinement, abstraction, environment, and version mapping. |
| Solver timeout is mapped to green. | Fix the CI adapter and preserve the raw result taxonomy. |
| Proof time triples while still valid. | Treat proof cost as an operational regression. |
| New axiom appears outside the manifest. | Reject or register it with owner and risk review. |
| Stronger precondition passes all implementation proofs. | Evaluate caller compatibility before accepting it. |
| Retry makes a flaky proof green. | Measure variance and repair brittleness instead of retrying. |

## Invariants

- Arithmetic safety is established before the potentially invalid operation.
- Every index proof covers the arithmetic that creates the index.
- Pointer validity includes allocation, bounds, alignment, initialization, representation, alias,
  provenance, and lifetime where the target requires them.
- Every bounded result reports its complete bound ledger and completeness status.
- External stubs remain assumptions and are validated at concrete runtime boundaries.
- Counterexamples retain both formal and implementation replay artifacts.
- CI preserves the verifier's complete result taxonomy.
- Toolchain, solver, libraries, options, and environment are versioned.
- Assumption and verification-debt growth is visible and owned.
- Contract compatibility is logical, not textual.
- Refinement maps are executable, versioned, and tested for drift.
- Flaky proof search is repaired, not hidden with retry.

## Skill handoffs

- Use `formal-verification-review` for arithmetic and memory proof obligations, boundedness,
  assumptions, counterexample replay, refinement, proof CI, and verification debt.
- Use `rust-code-change`, C or C++ skills, or another matching language skill for the executable
  unsafe, integer, pointer, FFI, and target semantics.
- Use `memory-lifetime-review` for concrete cleanup, ownership, retained references, and resource
  lifecycle outside the proof model.
- Use `race-condition-review` for actual schedules, synchronization, atomics, memory ordering, and
  concurrency regression evidence.
- Use `test-maintenance` for ordinary tests promoted from counterexamples.
- Use `ci-pipeline-triage` when the proof workflow itself is failing, skipped, queued, or false green.
