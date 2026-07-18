# Formal Contracts and Modeling Checklist

Use this checklist when reviewing Hoare-style contracts, weakest preconditions, loop or object
invariants, termination, ghost state, frame conditions, state-machine models, liveness, fairness,
tool selection, bounded scope, or proof trust boundaries.

## Contents

1. [Claim envelope](#claim-envelope)
2. [Precondition ownership](#precondition-ownership)
3. [Weakest-precondition reasoning](#weakest-precondition-reasoning)
4. [Loop and recursion obligations](#loop-and-recursion-obligations)
5. [Processed-region invariants](#processed-region-invariants)
6. [Partial and total correctness](#partial-and-total-correctness)
7. [Ghost and old state](#ghost-and-old-state)
8. [Frame conditions](#frame-conditions)
9. [Aliasing and memory regions](#aliasing-and-memory-regions)
10. [Object invariants and reentrancy](#object-invariants-and-reentrancy)
11. [Abnormal outcomes](#abnormal-outcomes)
12. [Machine and mathematical values](#machine-and-mathematical-values)
13. [Vacuity and reachability](#vacuity-and-reachability)
14. [Verification-family selection](#verification-family-selection)
15. [State-machine abstraction](#state-machine-abstraction)
16. [Safety, progress, and liveness](#safety-progress-and-liveness)
17. [Fairness assumptions](#fairness-assumptions)
18. [Scope and bounded search](#scope-and-bounded-search)
19. [Result taxonomy](#result-taxonomy)
20. [Trusted computing base](#trusted-computing-base)
21. [Tool-family failure modes](#tool-family-failure-modes)
22. [Failure matrix](#failure-matrix)
23. [Invariants](#invariants)
24. [Skill handoffs](#skill-handoffs)

## Claim envelope

Write every formal result as a scoped envelope:

- model and specification revision;
- quantified input and initial-state domain;
- transition or command semantics;
- observed state, event, output, or trace;
- safety, progress, liveness, termination, refinement, equivalence, or reachability property;
- preconditions and environment guarantees;
- fairness, failure, timing, and resource assumptions;
- integer, memory, and target semantics;
- finite scope, trace, unwind, recursion, or other bounds;
- abstraction and omitted behavior;
- tool result and completeness category;
- trusted computing base;
- implementation mapping and replay evidence.

Avoid statements such as `the system is verified` or `the function is correct`. Prefer a claim that
names the exact property and its domain.

## Precondition ownership

A precondition transfers a proof obligation to the caller. Use it only for inputs genuinely outside
the operation's definition or for guarantees established by a stronger verified boundary.

For each precondition, record:

- which caller proves it;
- where that proof is checked or derived;
- whether untrusted external input can violate it;
- what runtime behavior occurs when it is not established;
- whether it narrows an existing public contract;
- one concrete satisfying witness;
- one boundary case that must remain in the function's failure domain.

Do not make ordinary invalid, hostile, or environmental input disappear with an assumption merely
to simplify the implementation proof. Model a typed failure, error code, exception, rejection, or
other explicit outcome when the API accepts that input domain.

## Weakest-precondition reasoning

Start from the desired postcondition and move backward through the command.

- For assignment, substitute the assigned expression into the postcondition.
- For a branch, derive obligations for both branch conditions and join them.
- For a call, use the callee's postcondition and prove its precondition.
- For mutation, include frames and old-state relations.
- For failure, cancellation, or exception, derive a separate outcome obligation.
- For a loop, find an invariant strong enough to imply the postcondition at exit.

Use the backward calculation to place assertions and lemmas. A convenient assertion that does not
contribute to a required postcondition can be useful documentation, but it is not proof progress.

## Loop and recursion obligations

For every loop invariant prove:

1. **initialization**: the invariant holds before the first iteration;
2. **preservation**: one body execution from the invariant and guard re-establishes it;
3. **exit usefulness**: the invariant plus the negated guard implies the postcondition.

For termination also prove:

4. a variant belongs to a well-founded order;
5. it decreases on every continuing iteration or recursive call;
6. exceptional, retry, and continue paths cannot bypass the decrease.

An invariant that remains true forever but cannot derive the final guarantee is too weak. A variant
that decreases only on the happy path does not prove termination.

## Processed-region invariants

Derive loop invariants by restricting the final property to completed work.

Examples:

- an aggregate equals the fold over the processed prefix;
- a searched prefix contains no matching value;
- a written region satisfies its output relation;
- an ordered prefix is sorted and related correctly to the remainder;
- processed graph nodes satisfy the visited invariant;
- committed log entries satisfy the durable prefix property;
- released resources are exactly the completed ownership set.

State the index, cursor, frontier, or processed set explicitly. Include the relationship between the
processed and unprocessed regions when the postcondition depends on both.

## Partial and total correctness

Partial correctness says the postcondition holds if execution terminates. Total correctness also
proves termination for the quantified domain.

Keep separate:

- finite loop termination;
- recursive well-founded descent;
- retry termination or explicit unbounded service semantics;
- scheduler progress;
- absence of deadlock and livelock;
- eventual external response;
- resource-bounded completion.

Do not report a maintained invariant as a termination proof. Do not turn an environmental liveness
assumption into an implementation guarantee.

## Ghost and old state

Capture logical history before destructive mutation when the final property compares old and new
state. Use ghost values, immutable snapshots, multisets, histories, or abstract ownership maps.

Separate properties such as:

- output is ordered;
- output contains exactly the original elements;
- no item was duplicated or lost;
- balance or ledger conservation holds;
- every emitted event corresponds to one prior state transition;
- ownership moved exactly once;
- data outside the changed region is preserved.

Ghost state must not change executable behavior. If proof code is extracted or compiled, confirm the
tool's erasure and trust boundary rather than assuming it.

## Frame conditions

Specify reads, writes, and unchanged state.

For every outcome, name:

- objects, fields, regions, files, records, capabilities, or ghost state that may be read;
- locations that may be mutated;
- locations that must remain equal to their old value;
- ownership transferred or retained;
- externally visible events permitted;
- resources acquired, released, or left open;
- cache or index state intentionally affected.

A correct returned value does not prove absence of unrelated damage. Failure frames are often
stronger than success frames because callers rely on no partial mutation.

## Aliasing and memory regions

Pointer or reference inequality does not prove non-overlap. Model a memory region with allocation
identity plus a half-open offset range when possible.

Prove:

- offset and length arithmetic before range construction;
- `0 <= start <= end <= allocationSize`;
- empty and adjacent ranges;
- non-overlap or the intended overlap semantics;
- alias permissions and exclusivity;
- reads and writes through every alias;
- ownership and lifetime across calls;
- provenance and target-specific pointer rules where relevant.

Use one interval convention consistently. Half-open ranges make empty regions and length arithmetic
explicit, but they do not eliminate overflow in endpoint calculation.

## Object invariants and reentrancy

An object invariant is shared by its constructor and every public transition. Record:

- construction point where the invariant first becomes true;
- methods that assume it;
- fields and related objects covered;
- temporary internal states that may break it;
- callbacks, virtual calls, observers, destructors, finalizers, and async yields that can reenter;
- atomic boundary or lock protecting broken intermediate state;
- failure cleanup that restores or retires the object.

Do not publish a half-updated object and rely on callers to invoke setters in the right order. Make
valid state transitions explicit and atomic at the public observation boundary.

## Abnormal outcomes

Write separate postconditions for:

- normal success;
- typed or enumerated failure;
- exception or panic where part of the contract;
- cancellation;
- timeout or deadline;
- partial read or write;
- retryable unknown result;
- rollback success or failure;
- resource exhaustion;
- process or external-component failure.

State which mutations, events, ownership transfers, reservations, and resources survive each path.
Do not prove the happy return while leaving half of the implementation outside the contract.

## Machine and mathematical values

Separate mathematical values from the target program's representations.

Record:

- width and signedness;
- overflow as wrap, trap, checked failure, saturation, undefined behavior, or another rule;
- cast truncation, extension, and reinterpretation;
- shift domain;
- division and remainder boundaries;
- floating-point rounding, exceptional values, signed zero, and contraction;
- pointer or reference representation;
- debug, release, target, or feature differences.

If a proof uses unbounded integers for convenience, add range lemmas connecting every executable
operation to the machine domain. Otherwise the proved program and executed program are different.

## Vacuity and reachability

Detect false-green proofs caused by inconsistent assumptions or unreachable states.

Require:

- a satisfying witness for important precondition sets;
- at least one valid initial state;
- reachability or cover properties for critical success and failure branches;
- nonempty transition domains;
- an example that reaches each fairness-dependent action where relevant;
- a negative control that inverts a key postcondition or violates the invariant;
- mutation or implementation removal that makes the proof fail;
- scope large enough to include the smallest plausible failure.

A false precondition, contradictory invariant, empty model, or unreachable action can prove almost
anything. Proof success without sensitivity evidence is weak.

## Verification-family selection

Choose by the property and desired evidence:

| Need | Useful family | Main limitation to report |
| --- | --- | --- |
| Concurrent state transitions and short traces | Explicit or symbolic model checking | State abstraction, fairness, scope, and trace bound |
| Relational structures and small counterexamples | Finite relational analysis | Instance scope and integer encoding |
| Executable imperative contracts | SMT-backed program verification | Automation stability, axioms, externals, and generated-code boundary |
| Memory or arithmetic bugs within explicit bounds | Bounded model checking or symbolic execution | Unwind, object, path, and environment bounds |
| Reusable mathematical or semantic theorem | Kernel-checked proof assistant | Formalization gap, axioms, extraction, libraries, and runtime boundary |
| Compiler transformation instance | Translation validation | Supported IR, memory, target, and solver model |

Layer families when their blind spots differ. Do not standardize one tool across every property merely
to simplify procurement or training.

## State-machine abstraction

Model behavior that affects the property:

- durable and volatile state;
- actions and enabled conditions;
- nondeterministic choices;
- failure, retry, duplication, delay, loss, cancellation, and recovery;
- ownership, epochs, versions, or fencing;
- observable outputs and invariants;
- environment actions and interference;
- atomicity boundaries.

Omit serialization, logging, field layout, and implementation steps only when they cannot change the
property. Refining several implementation steps into one atomic model action is a proof obligation,
not a modeling convenience.

## Safety, progress, and liveness

Keep property classes distinct:

- **safety**: no forbidden state or event occurs;
- **progress**: a measure advances or a pending operation can take a next step;
- **termination**: the computation finishes for the quantified domain;
- **liveness**: a desired event eventually occurs;
- **deadlock freedom**: the system does not reach a nonterminal state with no action;
- **starvation freedom**: an enabled actor is not postponed forever;
- **bounded response**: completion occurs within a modeled resource or step bound.

An invariant proves safety, not liveness. A found short trace disproves a property, while failure to
find one may be only bounded evidence.

## Fairness assumptions

Fairness constrains which infinite behaviors the model considers.

For each fairness assumption, name:

- action or actor covered;
- weak, strong, or another exact condition;
- implementation or platform mechanism that supports it;
- failure and overload modes where it stops holding;
- liveness properties that depend on it;
- whether timeout, retry, or scheduling is abstracted by the same assumption.

Do not grant eventual execution to every continuously or repeatedly enabled action unless the real
scheduler, queue, lease, or retry policy provides that guarantee. Overpowered fairness can delete the
very starvation behavior the model was meant to find.

## Scope and bounded search

Record all finite limits:

- actors, nodes, resources, messages, records, or objects;
- integer and bit-vector width;
- sequence, set, and relation size;
- trace or time steps;
- loop unwind and recursion;
- scheduler choices;
- allocation and memory;
- solver time and state count.

Build a scope ladder around known minimal counterexamples and structural thresholds. A bounded search
that finds no counterexample proves only the explored domain unless the tool supplies a completeness
argument. Unbounded time with finite object scope is still a finite-domain model.

## Result taxonomy

Preserve at least:

- `valid`: the property is established under the declared model and completeness contract;
- `invalid`: a checked proof obligation fails;
- `counterexample`: a concrete model trace or assignment violates the property;
- `unknown`: the solver cannot decide;
- `timeout`: the resource limit was reached;
- `unsupported`: the model or feature is outside the tool's semantics;
- `incomplete-bound`: exploration stopped without covering all permitted executions;
- `tool-failure`: parser, runtime, integration, or internal failure;
- `unstable`: repeated equivalent verification changes result or resource class.

Do not collapse every non-counterexample state into success. Preserve raw tool status and the adapter
mapping used by CI.

## Trusted computing base

Map which components must be correct for the final claim:

- logic and proof kernel;
- solver and proof-certificate checker;
- axioms, admitted facts, unsafe tactics, and reflection;
- standard and third-party proof libraries;
- model translator, front end, or verifier encoding;
- external stubs and environmental models;
- extraction and code generation;
- ordinary compiler and linker;
- runtime, garbage collector, FFI, operating system, and hardware;
- model-to-implementation and trace-replay adapters.

A small proof kernel narrows one part of trust. It does not automatically verify extracted code,
native libraries, deployment configuration, or hardware.

## Tool-family failure modes

Review family-specific gaps without hard-coding vendor behavior:

- explicit-state checking: state explosion, symmetry mistakes, missing failures, overpowered fairness;
- relational analysis: scope too small, integer encoding surprises, bounded temporal horizon;
- SMT-backed program proof: quantifier triggers, large contexts, solver version sensitivity,
  accidental axioms, unstable resource use;
- bounded checking: insufficient unwind, path explosion, environment stubs, unsupported operations;
- proof assistants: admitted theorems, inconsistent axioms, extraction gap, library trust, proof debt;
- translation validation: unsupported instructions, incomplete memory model, timeout, target mismatch.

Record the exact result and supported fragment. Do not generalize one proved instance into a proof of
an implementation family.

## Failure matrix

| Failure or proof smell | Required response |
| --- | --- |
| Strong postcondition with impossible precondition. | Produce a witness or classify the proof as vacuous. |
| Invariant holds but loop may run forever. | Report partial correctness and add a well-founded variant. |
| Correct result but unrelated memory changes. | Add frame and old-state obligations. |
| Two pointers differ but ranges overlap. | Model allocation identity and half-open ranges. |
| Object invariant is broken during a callback. | Restore before reentry or refine the atomic boundary. |
| Mathematical integer proof is applied to fixed-width code. | Add machine semantics and range obligations. |
| No bounded counterexample is found. | Report exact scope and completeness, not universal validity. |
| Liveness requires arbitrary strong fairness. | Justify the scheduler guarantee or weaken the claim. |
| Solver returns unknown or timeout. | Preserve the status and stop false-green mapping. |
| Extracted code calls unverified native functions. | Add runtime validation and include them in the trust ledger. |

## Invariants

- Every formal claim names its model, domain, observation, assumptions, bounds, and trust base.
- Every precondition has an owning caller and a satisfiable witness.
- Every loop proof covers initialization, preservation, exit usefulness, and stated termination.
- Every mutating contract includes frames and old-state relations.
- Every public outcome has an explicit post-state contract.
- Machine-level claims use machine-level numeric and memory semantics.
- Safety, progress, termination, liveness, and fairness remain separate properties.
- Bounded absence of a counterexample is never reported beyond the explored domain.
- Every tool result preserves unknown, timeout, unsupported, and incomplete states.
- Proof-kernel trust is not confused with generated binary or deployment trust.

## Skill handoffs

- Use `formal-verification-review` for model scope, proof obligations, boundedness, assumptions,
  result taxonomy, trust, refinement, and proof operation.
- Use `race-condition-review` for concrete interleavings, synchronization, memory ordering, schedule
  reproduction, and implementation fixes.
- Use `compiler-engineering-review` for compiler IR refinement, translation validation, miscompile
  localization, and code-generation evidence.
- Use `memory-lifetime-review` for concrete ownership, cleanup, retained references, and native
  resource defects.
- Use `test-maintenance` for deterministic regressions promoted from formal counterexamples.
- Use the matching language skill for executable integer, pointer, unsafe, FFI, and memory semantics.
