---
mustflow_doc: skill.formal-verification-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: formal-verification-review
description: Apply this skill when formal specifications, Hoare-style contracts, weakest preconditions, loop or object invariants, termination variants, ghost state, frame conditions, refinement maps, state or trace invariants, inductive invariants, linearizability, concurrency or failure model checking, bounded model checking, state-space reduction, SMT encodings, solver outcomes, theorem-prover proofs, safety or liveness properties, fairness assumptions, counterexamples, proof trust boundaries, vacuity checks, assumption manifests, verification debt, or proof CI are created, changed, reviewed, debugged, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.formal-verification-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Formal Verification Review

<!-- mustflow-section: purpose -->
## Purpose

Review formal verification as a scoped claim about an explicit model, assumptions, and observation,
not as proof that an entire program or deployed system is universally correct.

Keep modeled state, implementation state, safety, progress, termination, fairness, bounds, external
assumptions, solver completeness, trusted tooling, counterexamples, refinement, runtime validation,
verification cost, and CI status as separate evidence layers.

<!-- mustflow-section: use-when -->
## Use When

- A precondition, postcondition, invariant, variant, frame condition, ghost variable, lemma, axiom,
  proof harness, model, theorem, or refinement relation changes.
- State-machine safety, liveness, fairness, concurrency, retry, ownership, memory, integer, array,
  pointer, ABI, or boundary properties are formally checked.
- Concurrent histories, linearization, weak-memory behavior, message loss or duplication, crash and
  recovery boundaries, idempotent effects, or adversarial schedules are modeled or checked.
- Abstraction direction, stuttering refinement, symmetry, partial-order reduction, context or failure
  bounds, lossy exploration, CEGAR, induction, or solver theory selection changes proof coverage.
- A model checker, bounded checker, SMT-backed verifier, proof assistant, symbolic executor, abstract
  interpreter, or translation validator produces a correctness or counterexample claim.
- Scope, bit width, unwind depth, state count, time horizon, solver timeout, unknown result,
  unsupported feature, trusted stub, external function, or generated-code boundary affects evidence.
- Formal artifacts are placed in change gates, periodic verification, canary, release, assumption,
  counterexample, baseline, resource-metric, or proof-debt workflows.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Only ordinary runtime tests or test organization change with no formal model, proof obligation, or
  bounded symbolic claim; use the matching test skill.
- Only compiler IR translation validation, miscompile localization, or compiler-stage refinement is
  in scope; use `compiler-engineering-review` as the owner and this skill only for proof boundaries.
- Only a concrete race, lock, atomic, schedule, or database interleaving is implemented or debugged
  without a formal model; use `race-condition-review`.
- Only application validation, schema checking, input sanitization, or static typing changes; use the
  matching validation, schema, or type skill.
- Only memory cleanup or retained-reference ownership changes without formal obligations; use
  `memory-lifetime-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Exact claim: state space, inputs, observations, preconditions, postconditions, safety, progress,
  liveness, termination, refinement, equivalence, or bounded counterexample property.
- Model-to-reality ledger: modeled state, transitions, atomic actions, omitted failures, environment,
  scheduler, clocks, resources, implementation fields, events, and external effects.
- Contract ledger: caller and callee obligations, success and every failure outcome, reads, writes,
  unchanged state, old or ghost state, alias and ownership assumptions, and exception or cancellation.
- Numeric and memory semantics: mathematical versus fixed-width values, overflow, casts, shifts,
  allocation identity, offset, bounds, alignment, initialization, provenance, aliasing, lifetime,
  deallocation, and external resource behavior.
- Progress ledger: loop or recursion variant, scheduler and fairness guarantees, timeout or retry
  model, deadlock, starvation, livelock, and total versus partial correctness decision.
- Bound ledger: instance scope, integer width, trace length, loop unwind, recursion depth, object or
  node count, context-switch and failure count, solver resource limit, abstraction,
  under-approximation, reduction mode, lossy search, and completeness signal.
- Trust ledger: verifier, solver, kernel, libraries, axioms, admitted facts, stubs, externals, model
  extraction or generation, code generator, compiler, runtime, FFI, operating system, and hardware.
- Result ledger: valid, invalid, counterexample, unknown, timeout, unsupported, incomplete bound,
  tool failure, flaky or unstable proof, and actual resource consumption.
- CI ledger: toolchain pins, assumption manifest, contract compatibility, proof-debt baseline,
  counterexample promotion, refinement map, owner, cadence, budget, and configured command intents.

Read [Formal Contracts and Modeling Checklist](references/formal-contracts-modeling-checklist.md) when
contracts, weakest preconditions, invariants, variants, ghost or old state, frame conditions, state
models, safety, liveness, fairness, tool selection, scope, or trusted bases are in scope.

Read [Formal Memory, Bounds, and CI Checklist](references/formal-memory-bounds-ci-checklist.md) when
machine integers, casts, indexing, pointers, allocation lifetime, bounded checking, unwinding,
external stubs, counterexample replay, assumption manifests, verification cost, proof brittleness,
refinement maps, or CI operation is in scope.

Read [Formal Concurrency, Model Checking, and SMT Checklist](references/formal-concurrency-model-checking-smt-checklist.md)
when state, action, or trace properties, inductive-invariant strengthening, linearizability,
stuttering refinement, adversarial scheduling, network or crash behavior, weak memory, state-space
reduction, model-based test derivation, SMT theories, SSA, quantifiers, unsat cores, or solver
evidence are in scope.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the exclusions.
- The property authority and modeled observation are identified, or the missing design decision is
  reported before proof success or failure is interpreted.
- The selected repository instructions and command contract have been checked.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update formal specifications, contracts, invariants, variants, ghost state, frame conditions,
  lemmas, proof harnesses, state models, refinement maps, trusted stubs, assumption manifests,
  counterexample fixtures, verification configuration, CI metadata, proof metrics, focused tests,
  and directly synchronized docs or templates.
- Add runtime guards at unverified external boundaries and promote reproducible counterexamples into
  deterministic regression or property fixtures when the repository owns those surfaces.
- Do not weaken a contract, add an assumption, reduce a bound, suppress an unknown result, or widen
  the trusted base merely to make verification green without explicit review evidence.
- Do not claim implementation, binary, deployment, hardware, or environmental correctness beyond
  the proven model and trust boundary.

<!-- mustflow-section: procedure -->
## Procedure

1. State the theorem or counterexample claim precisely. Name the quantified inputs, initial states,
   allowed transitions, observation, terminal conditions, and whether the claim is bounded,
   conditional, partial, total, probabilistic, or universal.
2. Map the model to reality. Record each model variable and action against implementation fields,
   events, storage, callbacks, failures, retries, scheduling, and external effects. Mark every omitted
   behavior and justify why the property does not depend on it.
3. Select a verification family by property. Use state exploration for bounded concurrent or
   relational counterexamples, contract and SMT verification for executable imperative obligations,
   and kernel-checked proof when a reusable theorem or certified construction is the product. Do not
   choose by syntax preference or tutorial convenience.
4. Separate state, action, and trace properties. Use state predicates for snapshots, action
   predicates for one-step deltas, and trace or history predicates for ordering, duplication,
   monotonicity, and linearizability. Do not erase a forbidden history because the final state looks
   acceptable.
5. Prove safety through a genuinely inductive strengthening. Check initialization, preservation,
   and implication to the desired property as separate obligations. Treat a preservation failure
   from an unreachable state as evidence that the induction hypothesis is too weak, not as a reason
   to increase a finite trace bound indefinitely.
6. Define the abstraction direction. For safety, prefer a justified over-approximation that permits
   at least the implementation behaviors relevant to the property. Mark under-approximations,
   lossy state storage, bounded schedules, and omitted identities as bug-finding evidence only unless
   a separate completeness or cutoff argument closes the gap.
7. Model nondeterminism as an adversarial choice over every permitted schedule, message outcome,
   failure boundary, retry, timeout race, callback, and external response. Constrain only behavior
   the real protocol or platform forbids, and record the evidence for each constraint.
8. Justify every atomic action and state-space reduction. Show that hidden intermediate states are
   unobservable to threads, callbacks, cancellation, recovery, and external systems. Validate
   symmetry, partial-order, transition coarsening, and other reductions against the property and
   keep lossy exploration modes out of universal claims.
9. Define preconditions as caller obligations. Keep hostile or ordinary invalid input inside the
   function's explicit failure domain unless it is genuinely outside the API definition. Require a
   satisfiable witness for each important precondition set.
10. Derive obligations backward from the postcondition. Use weakest-precondition reasoning to place
   assertions, branch conditions, and intermediate lemmas where the final guarantee actually needs
   them instead of adding plausible facts by intuition.
11. Build loop and recursion proofs with three separate duties: initialization, preservation, and
   postcondition derivation. State a well-founded variant for termination. Report partial correctness
   honestly when termination is not proved.
12. Express progress through processed prefixes, remaining work, or another inductive decomposition.
   A true but weak bound is not an invariant if it cannot connect loop exit to the final property.
13. Preserve old state with ghost values or snapshots before destructive updates. Prove content,
   permutation, ownership, or history properties separately from shape properties such as sorting or
   structural validity.
14. Write frame conditions. Name what may be read, what may be changed, and what must remain equal to
   its prior state on success, failure, exception, cancellation, timeout, retry, and partial work.
15. Model aliases and memory regions, not only pointer inequality. Use allocation identity plus
    half-open offset ranges where possible, and prove address arithmetic before using a range result.
16. Treat object invariants as shared obligations across constructors and every public transition.
    If callbacks or reentrancy can occur during a temporarily broken state, restore the invariant
    before exposure or make the transition atomic at the modeled boundary.
17. Separate normal and abnormal postconditions. Give success, typed failure, exception, cancellation,
    timeout, partial write, rollback, and retry paths explicit state guarantees.
18. Match actual machine semantics. Model fixed width, signedness, overflow, wrapping, traps, checked
    failures, casts, shifts, pointers, floating point, and debug or release differences rather than
    silently proving a mathematical-integer program.
19. Separate safety, progress, termination, and liveness. State scheduler and fairness assumptions
    only when the implementation or operating environment actually provides them. A fairness axiom
    is part of the claim, not proof that a real scheduler is fair.
20. Make boundedness visible. Record object scope, integer width, trace length, unwind depth,
    recursion, and resource limits. Require a completeness or unwinding assertion when claiming all
    permitted executions fit inside a bound; otherwise report only the explored domain.
21. Test reachability and vacuity. Require initial-state witnesses, branch or error-state cover
    properties, and periodic negative controls that invert a postcondition, remove behavior, or inject
    an invariant violation. A proof that survives a meaningful defect is not trusted evidence.
22. Encode SMT obligations with the executable semantics they claim to represent. Choose integer,
   bit-vector, floating-point, array, string, datatype, and uninterpreted-function theories
   deliberately; expose path conditions through SSA or an equivalent transition relation; and keep
   quantifier instantiation, loop unwinding, and memory-domain assumptions visible.
23. Classify every tool outcome. Keep valid, invalid, counterexample, unknown, timeout, unsupported,
    incomplete bound, tool failure, and unstable proof distinct. Never convert absence of a found
    counterexample into proof outside the tool's completeness contract.
24. Treat solver evidence as an artifact to validate. Replay satisfiable models against the original
   semantics, preserve the submitted formula and options for unsatisfiable outcomes, distinguish an
   unsat core from a proof certificate, and use an independent checker or solver diversity when the
   risk warrants it.
25. Record the trusted computing base. Include kernels, solvers, axioms, admitted facts, libraries,
    externals, stubs, extraction, generated code, compilers, runtimes, FFI, operating system, and
    hardware that the final claim depends on.
26. Isolate external boundaries. Treat file, network, clock, randomness, native library, allocator,
    database, and FFI contracts as assumptions unless separately verified. Validate their concrete
    inputs and outputs at runtime before entering the verified core.
27. Check memory and arithmetic obligations before operations. Prove overflow-safe additions and
    multiplications, cast and shift domains, index construction, allocation lifetime, initialization,
    alignment, valid representation, alias rules, and exactly-once release across failures.
28. Replay counterexamples against the real implementation when possible. Preserve the formal trace,
    input, bound, model version, implementation version, and translation step. Promote a confirmed
    case into an ordinary regression or property seed without deleting the original formal artifact.
29. Maintain an executable refinement map. Translate implementation events and state into model
    actions and variables, or generate implementation tests from model transitions. A prose-only map
    drifts as soon as fields, retries, or atomic boundaries change.
30. Derive model-based tests from the same transition and observation vocabulary. Use them to check
   the refinement adapter, concrete fault injection, short histories, and retained counterexamples;
   do not present generated tests as a substitute for exhaustive or deductive evidence.
31. Pin the verification environment. Version the verifier, solver, libraries, options, target,
    container or runtime identity, and proof dependencies. Upgrade them separately from feature work
    and compare result taxonomy, assumptions, proof cost, and counterexample changes.
32. Operate verification in bounded lanes. Keep changed obligations and fast bounded checks in change
    gates, broader scopes and repeated complexity checks in periodic lanes, and full models, larger
    bounds, supported targets, and extraction or binary evidence in canary or release lanes.
33. Track proof cost and brittleness. Store solver resource counts, states, obligations, scope,
    memory, time, and variance. Split large proof contexts, isolate lemmas, and control triggers or
    facts when small edits or repeated runs cause unstable resource use. Do not retry until green.
34. Keep one assumption manifest. Register axioms, admitted proofs, externals, stubs, fairness,
    scopes, bounds, numeric domains, environment models, and trusted generated artifacts. Treat a new
    assumption or enlarged trusted base as a reviewable risk change.
35. Check logical contract compatibility. A stronger precondition or weaker postcondition is a
    consumer-facing regression. Where supported, prove that the old precondition implies the new
    precondition and the new postcondition implies the old guarantee under the same observation.
36. Ratchet verification debt. Baseline admitted facts, unproved obligations, unsupported features,
    incomplete mappings, and unstable proofs. Prevent new debt in changed scope and retire existing
    debt incrementally rather than claiming complete coverage or abandoning verification.

<!-- mustflow-section: postconditions -->
## Postconditions

- The claim states its model, quantified domain, observation, assumptions, bounds, completeness,
  property class, and trusted base.
- Preconditions, success and failure postconditions, frames, invariants, variants, old state, machine
  semantics, aliases, memory, external boundaries, and reachability are explicit or reported missing.
- Tool results preserve valid, invalid, unknown, timeout, unsupported, incomplete, and unstable states
  without false-green normalization.
- Counterexamples, refinement mappings, assumption changes, contract compatibility, proof cost,
  verification debt, and CI cadence have observable ownership.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer narrow configured model, proof, contract, bounded-check, counterexample-replay, assumption,
refinement, proof-cost, and vacuity intents when the selected repository exposes them. Do not invent
raw verifier, solver, proof assistant, model checker, container, or unbounded exploration commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a claim omits a realistic failure, scheduler, numeric, memory, FFI, or environment behavior,
  narrow the claim or repair the model before treating a green result as evidence.
- If a precondition set has no witness, a branch is unreachable, or a negative control does not fail,
  classify the result as vacuous until reachability and sensitivity are restored.
- If a bounded checker lacks completeness or unwinding evidence, report the explored bound and stop
  short of an unbounded claim.
- If the tool returns unknown, timeout, unsupported, incomplete, or unstable, preserve that state;
  do not retry, suppress, or translate it into success.
- If a counterexample does not replay, inspect the model-to-implementation map, abstraction, runtime
  environment, bound, and tool semantics before discarding either side.
- If proof execution is unconfigured or too broad for the current lane, stop at specification review,
  static consistency, focused fixtures, and a manual verification plan.

<!-- mustflow-section: output-format -->
## Output Format

- Formal claim, property class, observation, and authority
- Model-to-implementation map and omitted behaviors
- Preconditions, postconditions, frames, invariants, variants, ghost or old state, and reachability
- Safety, progress, termination, liveness, fairness, scope, bound, and completeness decisions
- Numeric, memory, alias, lifetime, external, and failure-path obligations
- Tool family, result taxonomy, trusted base, assumptions, and proof-cost evidence
- Counterexample, replay, regression promotion, and refinement-map evidence
- Contract compatibility, verification debt, cadence, and owner decisions
- Files changed
- Configured command intents run
- Missing or skipped proof, solver, model, replay, refinement, vacuity, and release evidence
- Remaining model, assumption, bound, trust, drift, brittleness, or verification-debt risk
