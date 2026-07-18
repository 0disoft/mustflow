# Formal Concurrency, Model Checking, and SMT Checklist

Use this checklist when formal evidence depends on concurrent histories, adversarial schedules,
failure and recovery behavior, state-space reduction, refinement, model-based testing, or an SMT
encoding of executable semantics.

## Contents

1. [Property layers](#property-layers)
2. [Inductive safety obligations](#inductive-safety-obligations)
3. [Trace histories and linearizability](#trace-histories-and-linearizability)
4. [Refinement and stuttering](#refinement-and-stuttering)
5. [Abstraction direction](#abstraction-direction)
6. [Adversarial nondeterminism](#adversarial-nondeterminism)
7. [Atomicity claims](#atomicity-claims)
8. [Deadlock livelock and starvation](#deadlock-livelock-and-starvation)
9. [Weak-memory boundary](#weak-memory-boundary)
10. [Network and epoch behavior](#network-and-epoch-behavior)
11. [Crash and recovery state](#crash-and-recovery-state)
12. [Duplicate effects and result replay](#duplicate-effects-and-result-replay)
13. [Property-directed slicing](#property-directed-slicing)
14. [Identity symmetry and role abstraction](#identity-symmetry-and-role-abstraction)
15. [Partial-order and stateless exploration](#partial-order-and-stateless-exploration)
16. [Reduction soundness](#reduction-soundness)
17. [Bound ladders and lossy search](#bound-ladders-and-lossy-search)
18. [Abstraction refinement and inductive strengthening](#abstraction-refinement-and-inductive-strengthening)
19. [Compositional proof and cutoff claims](#compositional-proof-and-cutoff-claims)
20. [Model-based test bridge](#model-based-test-bridge)
21. [SMT result question](#smt-result-question)
22. [Theory and representation selection](#theory-and-representation-selection)
23. [SSA paths loops and memory](#ssa-paths-loops-and-memory)
24. [Datatypes and uninterpreted functions](#datatypes-and-uninterpreted-functions)
25. [Quantifiers triggers and incremental contexts](#quantifiers-triggers-and-incremental-contexts)
26. [Unsat evidence and replay](#unsat-evidence-and-replay)
27. [Failure matrix](#failure-matrix)
28. [Invariants](#invariants)
29. [Skill handoffs](#skill-handoffs)

## Property layers

Separate the property by what it observes:

- a state property constrains one snapshot;
- an action property constrains one transition and its before-and-after values;
- a trace property constrains an event sequence or history;
- a relational property compares two executions, implementations, or versions;
- a hyperproperty constrains a set of traces rather than one trace in isolation.

Use a state invariant for conservation or exclusivity. Use an action invariant for matched deltas,
monotonic versions, or permitted mutations. Use a trace property for call-before-return ordering,
duplicate effects, revocation history, or information flow. Do not accept a safe final snapshot when
the path to that snapshot emitted a forbidden effect.

## Inductive safety obligations

Prove a safety property through an inductive strengthening with three independent obligations:

1. every permitted initial state satisfies the inductive invariant;
2. every permitted transition preserves it;
3. the inductive invariant implies the desired safety property.

The desired property may be true on reachable states without being inductive by itself. When the
preservation obligation produces an unreachable predecessor, identify the missing relationship among
owners, epochs, queues, logs, counters, or control states and strengthen the invariant. Do not hide
the gap by checking longer finite traces and calling the result unbounded.

## Trace histories and linearizability

Record operation invocation, response, argument, result, actor, and real-time precedence in a
history when concurrent-object correctness is in scope.

For linearizability, require a legal sequential history that:

- contains the same completed operations and permitted treatment of pending operations;
- preserves the sequential specification;
- preserves real-time order for non-overlapping operations;
- explains return values and externally visible effects together.

Do not declare an internal compare-and-swap, commit, or enqueue instruction to be the linearization
point before the complete history is shown to refine the sequential specification. Use history or
prophecy state when the abstract effect depends on a later racing outcome, but prove that auxiliary
state does not restrict executable choices.

## Refinement and stuttering

Define a map from concrete implementation state and events to abstract model state and actions.
Permit a concrete step to map to:

- one abstract action;
- an abstract stuttering step with no observable abstract change;
- a justified batch of abstract actions when the observation allows it.

Show how retries, failed compare-and-swap attempts, allocation, caches, buffering, background work,
and partial persistence map. Preserve externally visible order and effects. A many-step
implementation does not need to resemble the model structurally, but every permitted concrete trace
must have an allowed abstract explanation under the declared observation.

## Abstraction direction

Classify each abstraction as over-approximating, under-approximating, or property-preserving.

For a safety proof, prefer an over-approximation that admits at least the relevant real behaviors.
A counterexample may then be spurious, but a complete proof over the wider behavior set covers the
concrete subset. Use an under-approximation for bug finding only unless a completeness argument
closes the missing behavior gap.

Record which distinctions were removed: identity, order, payload, time, failure count, resource
limit, arithmetic width, or memory behavior. Preserve every observation the property uses. If a
counterexample cannot be concretized, restore only the distinction needed to rule it out rather than
copying the entire implementation into the model.

## Adversarial nondeterminism

Treat nondeterministic choice as an adversary over every behavior the contract permits, not as a
random sample.

Include relevant choices for:

- actor scheduling and preemption;
- message delay, loss, duplication, reordering, and stale delivery;
- crash placement and restart count;
- timeout races and late responses;
- retry, cancellation, callback, and reentrancy timing;
- external success, failure, ambiguity, and partial response;
- allocation reuse and identity generation.

Constrain a choice only when repository or platform evidence proves the behavior impossible. Put
each constraint in the assumption ledger so a deployment change cannot silently invalidate the
proof.

## Atomicity claims

Treat every modeled atomic action as a theorem about observation boundaries.

Before merging implementation steps, check whether an intermediate state can be observed by:

- another thread or process;
- a callback, signal, cancellation, or destructor;
- crash recovery or journal replay;
- an external service or durable store;
- a monitoring, audit, or authorization decision.

Start with a fine-grained small model. Coarsen only after showing that intermediate states are
unobservable or refine to stuttering. A source line, function call, transaction wrapper, or lock
name is not automatic evidence of atomicity.

## Deadlock livelock and starvation

Model every waitable resource, not only mutexes. Include row locks, channels, queues, futures,
callbacks, permits, leases, and bounded buffers in the wait relation.

Check separately:

- nonterminal states with no enabled transition;
- infinite cycles that change state without completing work;
- executions where the system progresses but one actor never does;
- timeout and cancellation paths that can themselves block;
- fairness assumptions used to exclude a non-progress trace.

Do not call a moving system live. Do not add global fairness merely to delete starvation. Attach
fairness only to the scheduler, queue, retry, or delivery mechanism that provides it.

## Weak-memory boundary

Distinguish an algorithm proof under sequential consistency from an implementation proof under the
target language and hardware memory model.

Record:

- atomic and non-atomic accesses;
- read, write, and read-modify-write ordering;
- acquire, release, relaxed, sequentially consistent, or target-specific modes;
- data-race and undefined-behavior conditions;
- compiler and architecture targets;
- reclamation and allocation-reuse behavior.

If the design model omits weak-memory observations, label it as a design-level proof and add a
separate implementation-level check or argument. Do not promote success on one architecture to a
portable memory-order claim.

## Network and epoch behavior

Avoid a single reliable FIFO channel unless the protocol contract truly provides it.

Model stale, delayed, duplicated, reordered, and lost messages together with current owner,
generation, term, epoch, or fencing state. Check that:

- stale generations cannot mutate current authority;
- duplicate requests cannot duplicate the protected effect;
- acknowledgments do not create authority before the durable decision;
- committed indices, epochs, or versions do not move backward;
- retry and status lookup return a stable result for one operation identity.

Bound message multiplicity for tractability, but preserve at least one representative duplicate and
reordering path whenever the protocol permits them.

## Crash and recovery state

Split volatile and durable state. Permit a crash at every persistence and external-effect boundary
that the implementation can expose.

Check recovery for:

- pre-operation or fully committed post-operation state;
- idempotence across repeated recovery attempts;
- partial journal or metadata updates;
- external success before local record and local record before acknowledgment;
- stale recovery workers and fencing;
- durability, flush, atomic-write, and ordering assumptions.

Do not test only the recovery function with example files. The property covers the cross-product of
execution prefix, durable prefix, crash point, restart, and replay observation.

## Duplicate effects and result replay

Replace an `exactly once` slogan with explicit invariants:

- one operation identity causes at most one protected external or economic effect;
- every successful retry returns the stored result of that operation;
- deduplication state and the protected effect cannot commit in contradictory orders;
- an ambiguous external outcome is reconciled before another effect attempt;
- compensation has its own identity, precondition, and idempotency rule.

Model effect execution and acknowledgment as different transitions. Preserve unknown outcome as a
real state; do not convert transport failure into business failure or permission to retry blindly.

## Property-directed slicing

Build one model slice per property. Keep variables and transitions that can influence:

- the property expression;
- enabledness and fairness of relevant actions;
- observations used by refinement;
- the smallest plausible counterexample.

Remove UI, logging, payload, and unrelated service state only after showing they cannot alter those
dependencies. When a counterexample is spurious, expand the slice with the minimal missing relation.
Do not start with a full-system product model and call state explosion inevitable.

## Identity symmetry and role abstraction

Merge states that differ only by renaming when initial states, transitions, and properties are
invariant under that renaming.

Normalize identity by first-seen order when only equality matters. Preserve role distinctions such
as current owner, stale owner, duplicate request, conflicting key, quorum member, or failed node.
Do not apply symmetry when numeric identity, ordering, hashing, locality, leader preference, or
partition placement affects behavior.

Record the symmetry group or normalization rule and one counterexample that would break it. Treat a
small instance as a bounded model unless a separate cutoff or induction argument generalizes it.

## Partial-order and stateless exploration

Use partial-order reduction only for transitions proven independent under the property observation.
Transitions conflict when they touch the same state, channel, lock, external object, enabledness, or
observable event, even if their source code lives in different modules.

For implementation-level schedule exploration, use dependency and happens-before information to
enumerate schedule alternatives within explicit task, loop, and context bounds. Record whether the
method models weak memory or only sequentially consistent executions.

Compare a shallow unreduced model with the reduced model. A reduction that removes a known witness
or changes property truth is unsound for that configuration.

## Reduction soundness

Classify every state-space optimization:

- representation compression that preserves states;
- symmetry or partial-order quotient justified by an equivalence;
- transition coarsening justified by stuttering or observation;
- hashing or lossy storage that may omit states;
- bounded omission of actors, values, failures, or schedules.

Keep proof-preserving reductions separate from bug-hunting shortcuts in configuration and reports.
Record whether liveness and fairness remain valid under the selected reduction; a reduction sound
for safety may not preserve an infinite-trace property.

## Bound ladders and lossy search

Increase one structural risk axis at a time:

- actor or node count;
- context switches;
- crash and restart count;
- duplicate or reordered message count;
- retry count;
- value or identity roles;
- trace and loop depth.

Prefer short counterexamples and thresholds around known failures. Record the largest completed
domain, every incomplete run, and whether state storage was lossy. Multiple seeds in a lossy search
improve bug-finding coverage but never turn it into exhaustive evidence.

## Abstraction refinement and inductive strengthening

Use a spurious counterexample to identify one missing predicate, state relation, or environment
guarantee. Add only the fact needed to distinguish the impossible behavior and rerun concretization.

For inductive proof failures, distinguish:

- a reachable safety violation;
- an unreachable predecessor allowed by a weak invariant;
- a modeling or translation error;
- a solver or resource limitation.

Strengthen with ownership, epoch monotonicity, log consistency, type range, or message-state lemmas.
Do not keep increasing induction depth without explaining what excludes the reported predecessor.

## Compositional proof and cutoff claims

Verify components under explicit assume-guarantee contracts, then prove that connected components
discharge one another's assumptions. Include shared resources, scheduler behavior, overload,
recovery, and external effects that cross component boundaries.

Use a finite cutoff to claim arbitrary-size behavior only when a theorem applies to the protocol and
property class. Record the cutoff premise and proof. An experiment where three actors pass is not a
cutoff theorem and does not establish one hundred actors.

## Model-based test bridge

Generate concrete tests from model states, transitions, histories, and counterexamples to validate
the model-to-implementation adapter.

Preserve:

- model and property revision;
- abstract state and chosen transition;
- concrete fixture and event schedule;
- fault injection point;
- expected abstract and concrete observations;
- refinement result and mismatch classification.

Use generated tests to catch mapping drift and exercise implementation boundaries. They sample or
enumerate a configured domain; they do not replace model completeness, induction, or deductive
proof.

## SMT result question

Ask for the existence of a counterexample by combining assumptions, executable semantics, and the
negated property.

Preserve three primary outcomes:

- satisfiable: extract a candidate counterexample assignment or trace;
- unsatisfiable: the encoded assumptions imply the property in the supported logic;
- unknown or resource failure: no correctness conclusion.

Keep parser, unsupported feature, timeout, memory exhaustion, and integration failure distinct.
Do not map absence of a printed model to unsatisfiable or valid.

## Theory and representation selection

Match each executable domain to the solver representation:

- mathematical integer only for truly unbounded arithmetic or an explicit refinement layer;
- fixed-width bit-vector for wrapping, masks, signedness, and machine overflow;
- floating-point theory for rounding, exceptional values, and signed zero;
- arrays for total maps plus explicit bounds and allocation facts;
- strings and regular languages for their supported semantic fragment;
- algebraic datatypes for mutually exclusive state variants.

Make every conversion between theories explicit. A convenient theory choice changes the program
being proved if it erases overflow, out-of-bounds access, rounding, or invalid representations.

## SSA paths loops and memory

Translate mutation into versioned state or an equivalent transition relation. Attach branch guards
to each path and join values explicitly. Summarize calls only with proved preconditions,
postconditions, frames, and failure outcomes.

For loops, distinguish finite unfolding from induction. Require an unwinding or completeness
assertion before claiming the public domain fits the bound. Treat a failed induction step as a
prompt for stronger invariants, not automatically as a reachable program trace.

For memory, model allocation identity, offset, size, initialization, lifetime, alignment,
provenance, and alias permission. A total solver array does not reject an out-of-range index unless
the encoding does.

## Datatypes and uninterpreted functions

Use algebraic datatypes to eliminate impossible Boolean combinations and retain payloads attached to
valid states. Keep success, typed failure, unknown, and absent values distinct.

Use an uninterpreted function only when its omitted implementation is irrelevant to the property.
Assume no property beyond functional congruence unless separately justified. Record every added
axiom such as injectivity, collision resistance, order preservation, or range restriction in the
assumption manifest. Prefer a wider nondeterministic result to an unrealistically perfect external
function for safety checks.

## Quantifiers triggers and incremental contexts

Prefer finite expansion, structural induction, or specialized decision procedures before general
quantification. When quantifiers remain, record patterns, ground terms, instantiation counts,
matching loops, and solver-version sensitivity.

Reuse common constraints with scoped incremental contexts only through an adapter that guarantees
push and pop balance. Name assumptions so feature and path combinations can be checked without
leaking constraints between obligations. Preserve per-obligation timeout, result, model, and core
metadata.

## Unsat evidence and replay

Treat an unsat core as a set of constraints sufficient for inconsistency, not as a proof explanation
or a necessarily minimal root cause. Check satisfiability of environment assumptions independently
and remove expected assumptions to confirm sensitivity.

For satisfiable outcomes, replay the model under the original program or transition semantics. For
high-risk unsatisfiable outcomes, preserve the exact input formula, options, solver identity, and
proof artifact when available; validate with an independent checker or another encoding or solver
when justified. Do not call a log line or core a proof certificate.

## Failure matrix

| Failure or proof smell | Required response |
| --- | --- |
| Final state is safe after a forbidden duplicate effect. | Add an action or trace property over the effect history. |
| Desired safety property is not inductive. | Strengthen the invariant and check initialization, preservation, and implication separately. |
| Concrete retry has no abstract step. | Add a stuttering or explicit retry mapping and validate the observation. |
| An under-approximation passes. | Report bounded bug-finding evidence or add a completeness argument. |
| Atomic action hides a crash or callback boundary. | Split the transition or prove the intermediate state unobservable. |
| Fairness removes a starving execution. | Tie fairness to a real scheduling guarantee or weaken the claim. |
| Reduced search misses a known witness. | Disable or repair the reduction before interpreting results. |
| Small actor count passes without a cutoff theorem. | Report the finite scope and stop the arbitrary-size claim. |
| Mathematical integers hide machine overflow. | Select fixed-width semantics or prove a range refinement. |
| Solver array accepts an invalid index. | Add allocation and bounds obligations to the memory model. |
| Quantifier result changes with a trigger. | Treat the proof as brittle and inspect instantiation evidence. |
| Unsat core is presented as a certificate. | Preserve the formula and use proof-checking or independent evidence. |

## Invariants

- State, action, trace, relational, and liveness properties remain distinct.
- Every safety proof identifies an inductive invariant or reports only bounded exploration.
- Every abstraction names its direction and the observations it preserves.
- Every atomicity and state-space reduction has a soundness argument for the selected property.
- Lossy search and bounded omission remain bug-finding evidence unless completeness is proved.
- Concurrent histories preserve invocation, response, real-time order, and visible effects.
- Weak-memory implementation claims use the target language and architecture semantics.
- Network and crash models include the permitted stale, duplicate, ambiguous, and recovery paths.
- SMT theories match executable numeric, memory, string, and state semantics.
- Satisfiable, unsatisfiable, unknown, timeout, unsupported, and tool failure remain distinct.
- Model-based tests validate refinement but do not replace formal completeness.

## Skill handoffs

- Use `formal-verification-review` for property layers, abstractions, reductions, model checking,
  solver encodings, result evidence, refinement, and model-based test derivation.
- Use `race-condition-review` for concrete interleavings, synchronization, atomics, memory ordering,
  schedule reproduction, and implementation fixes.
- Use `two-phase-transition-integrity-review` for the real admission, durable decision, fencing,
  recovery, compensation, and authority protocol being modeled.
- Use `idempotency-integrity-review` for concrete operation identity, duplicate suppression, stale
  write rejection, and result-replay implementation.
- Use `fuzz-harness-review` for coverage-guided or randomized harnesses, corpus operation, mutation,
  campaign reliability, and crash triage.
- Use `test-maintenance` for deterministic implementation regressions derived from model traces.
