# Compiler Test Strategy and Differential Checklist

Use this checklist when a compiler test suite, feature-interaction plan, differential matrix,
determinism lane, corpus policy, or change-gate, periodic, canary, and release evidence plan is in
scope.

## Contents

1. [Semantic-distance and oracle-cost ladder](#semantic-distance-and-oracle-cost-ladder)
2. [Stage boundary contracts](#stage-boundary-contracts)
3. [Oracle separation](#oracle-separation)
4. [Feature-interaction grid](#feature-interaction-grid)
5. [Execution lanes](#execution-lanes)
6. [Verifier placement](#verifier-placement)
7. [Snapshot scope](#snapshot-scope)
8. [Corpus classes](#corpus-classes)
9. [Failure capsule, reduction, and deduplication](#failure-capsule-reduction-and-deduplication)
10. [Transformation activation coverage](#transformation-activation-coverage)
11. [Oracle sensitivity checks](#oracle-sensitivity-checks)
12. [Determinism perturbation](#determinism-perturbation)
13. [Cadence and failure budgets](#cadence-and-failure-budgets)
14. [Implementation lineage map](#implementation-lineage-map)
15. [Option and execution-tier lattice](#option-and-execution-tier-lattice)
16. [Cross-target differential](#cross-target-differential)
17. [Frontend differential](#frontend-differential)
18. [Canonical execution outcome](#canonical-execution-outcome)
19. [Runtime input vectors](#runtime-input-vectors)
20. [Definedness and permitted variation](#definedness-and-permitted-variation)
21. [Input-related differential relations](#input-related-differential-relations)
22. [First-divergence evidence](#first-divergence-evidence)
23. [Discrepancy classification](#discrepancy-classification)
24. [Failure matrix](#failure-matrix)
25. [Invariants](#invariants)
26. [Skill handoffs](#skill-handoffs)

## Semantic-distance and oracle-cost ladder

Do not copy a generic unit-to-end-to-end pyramid without mapping compiler semantics. Arrange test
lanes by distance from the violated contract and cost of deciding correctness.

| Lane | Typical scope | Primary oracle | Localization distance |
| --- | --- | --- | --- |
| Local algorithm | Arena, graph, bitset, solver primitive | Data-structure invariant or reference algorithm | Very short |
| Stage regression | One parser rule, type rule, transform, verifier, or lowering | Boundary contract and minimal fixture | Short |
| Pipeline integration | Several adjacent stages | Persisted artifacts and stage relations | Medium |
| Whole-program execution | Compile, link, load, run | Defined semantic outcome | Long |
| Differential or metamorphic | Several implementations, modes, or related inputs | Independent authority or relation | Variable |
| Generated campaign | Broad state exploration | Stable property or divergence identity | Variable |
| Real-project compatibility | Build graph, libraries, macros, LTO, runtime | Project tests, ABI, artifact, and behavior evidence | Very long |

Use the cheapest lane that can falsify the claim, but keep higher-distance evidence when the defect
requires cross-stage, ABI, target, or real-build interaction. A large count of cheap tests does not
replace a missing semantic execution or cross-producer oracle.

## Stage boundary contracts

For every exposed boundary from source through linked image, record:

- producer and consumer;
- serialized or in-memory artifact identity;
- structural verifier;
- semantic relation to the prior artifact;
- normalized representation for stable comparison;
- supported invalid-input lane;
- source and diagnostic mapping;
- target, feature, and data-layout assumptions;
- stage-local fixture ownership;
- evidence needed to replay without upstream stages.

Typical contracts include monotonic token ranges, well-formed syntax, typed expressions, resolved
bindings, valid CFG and SSA, dominance and use-def agreement, preserved analyses, legal machine
operands, correct object metadata, resolved symbols, and defined runtime observation.

Do not freeze a complete dump when a smaller invariant or semantic relation owns the behavior. Do
not skip boundary checks merely because the final executable happens to run correctly.

## Oracle separation

Keep these oracle classes independent:

- acceptance or rejection;
- stable diagnostic identity, source, cause, and recovery;
- semantic execution result and side effects;
- normalized IR, machine, object, or link structure;
- code size, compile time, runtime performance, or resource use;
- deterministic or reproducible output;
- transformation activation and rejection reason;
- ABI or binary compatibility.

A single fixture may participate in several lanes, but its assertions should not force unrelated
oracles to share one brittle snapshot. Diagnostic wording must not invalidate a code-generation
oracle. Register allocation churn must not invalidate a semantic execution oracle. A performance
threshold must not masquerade as correctness.

## Feature-interaction grid

Compiler failures cluster where features intersect. Build axes from the actual language and
pipeline, such as:

- semantic type and generic form;
- nullable, ownership, lifetime, or effect state;
- control-flow and exception shape;
- storage class, address space, alignment, and alias relation;
- call form, dispatch, inlining, and recursion;
- optimization level and pass family;
- integer width, vector width, and floating-point mode;
- ABI, target, CPU feature, code model, and relocation model;
- LTO, profile data, incremental cache, and module mode.

Use pairwise or another bounded covering design for ordinary changes. Add high-risk tuples from
the changed pass, previous defects, and unsupported boundaries. Keep the full product out of change
gates unless a repository-owned budget supports it.

Every selected combination needs an oracle. Counting combinations that merely compile or execute a
pass is not semantic coverage.

## Execution lanes

Separate at least the lanes that own different failure boundaries:

1. syntax and semantic check only;
2. compiler IR production;
3. optimized IR production;
4. machine or target IR production;
5. object emission;
6. link only;
7. native execution;
8. emulated, simulated, or remote execution;
9. whole-program or link-time optimization;
10. profile generation and profile-use recompilation;
11. binary-compatibility or cross-version loading.

Do not attach link and execution cost to a frontend rejection test. Do not claim optimizer, ABI, or
runtime correctness from compile-only evidence. Persist the artifact at the earliest lane whose
contract fails.

## Verifier placement

Run the owning verifier immediately after every mutation and transform in assertion-heavy,
generated, or deep validation lanes. Check structural IR, CFG, SSA, type, effect, analysis,
machine-operand, frame, object, and link invariants at their first observable boundary.

Separate:

- parseability;
- structural validity;
- defined semantics;
- refinement or equivalence;
- current analysis state;
- final execution behavior.

A later pass can accidentally repair malformed state or merely crash after the original corruption.
Immediate verification shortens the evidence path. Final-verifier-only success is not proof that
every intermediate artifact respected its contract.

## Snapshot scope

Use full snapshots only when complete textual or binary presentation is itself the contract, such
as selected user diagnostics, declared public IR syntax, ABI text, or stable debug rendering.

For other behavior prefer:

- parsed structural assertions;
- normalized IR relations;
- required and forbidden patterns;
- object metadata fields;
- selected link graph facts;
- canonical semantic outcomes;
- stable property identifiers.

Avoid full AST, IR, assembly, or object snapshots when harmless naming, scheduling, instruction
selection, register allocation, section ordering, or formatting changes are permitted. A snapshot
that detects every refactor teaches maintainers to update evidence blindly.

## Corpus classes

Keep corpus purposes physically or logically distinct:

| Class | Purpose | Retention rule |
| --- | --- | --- |
| Specification or conformance | Cover declared language and target rules | Stable, curated, traceable to contract |
| Minimized regression | Preserve one explained historical defect | Exact predicate and earliest owning stage |
| Generated discovery | Grow exploration and activation | Evolving, instrumentation or generator versioned |
| Real-project compatibility | Exercise build graph, ecosystem, ABI, and scale | Versioned project snapshot and license boundary |

Do not let coverage minimization delete a semantic regression it cannot observe. Do not treat an
untriaged generated artifact as a curated regression. Do not mix real customer or private source
into public corpora without provenance, privacy, and license authority.

For a fixed bug, build a bounded neighborhood by varying the proven trigger dimensions: type,
constant, loop shape, alias relation, option, target feature, or input vector. Keep the original
minimal predicate visible.

## Failure capsule, reduction, and deduplication

Capture:

- input and runtime data;
- compiler and subordinate tool revisions;
- complete option, target, feature, and link closure;
- environment and determinism variables;
- baseline and candidate canonical outcomes;
- pass trace and earliest divergent artifact;
- stable assertion, invariant, property, or divergence identity;
- timeout and resource policy;
- original and minimized forms.

The reducer predicate must preserve the original class. A wrong result that becomes a crash,
frontend rejection, timeout, verifier failure, or different stage divergence is not the same bug.

Deduplicate with earliest failing stage, invariant or property ID, pass instance, semantic outcome,
and minimized structural shape. Source hash or final crash stack alone is too weak: one corrupt state
can crash at several later sites, and one assertion site can receive several distinct corrupt states.

## Transformation activation coverage

Executed pass code is not proof that its transform fired. Record bounded semantic feedback such as:

- pass and rewrite identity;
- trigger matched, declined, or blocked;
- stable decline reason;
- source and target opcode or operation kinds;
- integer and vector widths;
- loop depth and control shape;
- alias, range, dominance, memory, or cost decision;
- target feature and code-model state;
- inlining, unrolling, vectorization, legalization, or instruction-selection outcome.

Keep activation feedback low-cardinality and versioned. A rewrite count without a result oracle still
cannot prove correctness, but it exposes dead zones where line coverage claims success while every
interesting pattern is rejected.

## Oracle sensitivity checks

Measure whether tests can detect plausible compiler defects, not only whether compiler code ran.
Use repository-owned negative controls or mutation operators where practical:

- invert a comparison condition;
- drop a side effect;
- change an alias or range result;
- skip invalidation;
- swap an operand or successor;
- corrupt a relocation or ABI classification;
- suppress one diagnostic relation.

The injected defect must be bounded, reviewable, and tied to the target oracle. Do not report a
global mutation score as proof of compiler correctness. Use surviving mutations to identify blind
oracles or unreachable generators.

## Determinism perturbation

Vary permitted environmental and scheduling inputs instead of repeating one frozen process:

- hash or map seed;
- worker and thread count;
- task and pass schedule;
- file discovery and object order;
- temporary root, path length, and remapped path;
- locale and timezone;
- source timestamp and build metadata policy;
- incremental and persistent cache state;
- profile record order;
- allocator or address layout when it should be unobservable.

Compare normalized IR, object metadata, diagnostics, link result, or executable outcome according to
the product contract. Normalize only declared noise such as timestamp, remapped path, address, or
build identity. Do not normalize symbol order, section facts, diagnostic ownership, serialization,
or semantic output when they are expected to be stable.

## Cadence and failure budgets

Assign lanes by cost, flakiness, and diagnostic distance:

- change gate: stage verifiers, affected feature combinations, minimized regressions, bounded
  generator or property replay;
- periodic lane: broader option and target matrices, generated exploration, assertion-heavy or
  sanitizer builds, determinism perturbation;
- canary lane: selected real projects, shadow compilation, backend or toolchain candidates;
- release lane: supported target, ABI, LTO, compatibility, project, size, and performance evidence.

Each lane needs a time, memory, artifact, retry, and ownership budget plus a stop or quarantine
policy. Do not move an unbounded campaign or real-project fleet into a change gate because a defect
felt important. Do not call an omitted high-cost lane passed.

## Implementation lineage map

For every compared implementation or mode, record shared ancestry:

- frontend and parser;
- semantic or type checker;
- source and target IR;
- optimizer and analysis libraries;
- code generator;
- assembler and linker;
- runtime, standard library, numeric helpers, and allocator;
- reference model or interpreter.

Several executables that share the same optimizer or backend are not independent votes. Group
results by lineage and seek a specification, independent model, translation validator, executable
property, or meaning-preserving relation before assigning fault.

## Option and execution-tier lattice

Compare more than named optimization levels. Build a bounded lattice from:

- no optimization through aggressive and size modes;
- individual pass or pipeline groups;
- vectorization, inlining, alias, math, overflow, and exception modes;
- profile generation and use;
- full and thin whole-program optimization;
- previous stable, current, and candidate revisions;
- alternative backend paths;
- interpreter, baseline, optimizing, JIT, and AOT tiers;
- warm-up count, tier transition, deoptimization, and inline-cache state.

Do not treat one low-optimization mode as absolute truth. It is a comparison signal unless the
language or a separate reference makes it authoritative. For tiered systems, repeat inputs across
transition points and compare the entire result vector.

## Cross-target differential

Cross-target execution can expose legalization, instruction selection, register allocation, object,
and ABI defects only after permitted target differences are controlled.

Start with a portable observation subset:

- fixed-width values;
- explicit byte order;
- specified alignment;
- stable floating-point mode;
- no address or target-width observation;
- controlled runtime and I/O;
- equivalent external libraries.

Then add target-specific relations for pointer width, endianness, aggregate layout, calling
convention, long floating formats, and implementation-defined source behavior. Distinguish host
structural validation, emulator or simulator execution, remote runner, and real hardware evidence.

## Frontend differential

Compare structured decisions rather than raw text:

- accepted or rejected;
- semantic or diagnostic category;
- primary and related source ranges;
- selected overload, type, effect, or constraint result;
- recovered structure and bounded cascade count;
- extension or language-mode capability;
- typed or semantic IR relation.

Use a capability table for intentional implementation extensions. Do not compare a standard mode
against an extension mode and call every difference a defect. If implementations accept the same
source but produce different typed meaning, preserve the first semantic boundary.

## Canonical execution outcome

Compare a stable semantic envelope rather than stdout alone:

- compilation, link, load, and execution terminal classes;
- return value and selected globals;
- logical heap or aggregate state;
- exception or signal category under the declared source contract;
- ordered external effects;
- volatile or otherwise protected checksums where valid;
- stable diagnostics for rejected inputs;
- ABI, object, or link observations when part of the claim.

Exclude raw addresses, allocator layout, permitted unordered state, host paths, timestamps, and
other representation facts unless the contract exposes them. Preserve raw results beside the
canonical envelope so normalization remains auditable.

## Runtime input vectors

One generated program with one runtime input explores too little. Generate or select a bounded
vector covering relevant branches and boundaries:

- zero, one, negative one;
- signed and unsigned extrema;
- bit-width, shift, and overflow boundaries;
- equal and unequal aliases;
- null and non-null where defined;
- empty, singleton, short, and longer arrays;
- true and false control paths;
- exception and non-exception paths;
- target-specific legal boundary values.

Compare the whole outcome vector. Preserve inputs that reach new semantic branches or change the
first divergent observation. Do not include values that make the source or IR meaning undefined.

## Definedness and permitted variation

Classify separately:

- undefined behavior;
- unspecified behavior;
- implementation-defined behavior;
- floating-point relation and tolerance;
- target ABI variation;
- nondeterministic language or runtime behavior;
- data races and scheduling;
- time, randomness, address, environment, or external I/O.

Generate defined inputs by construction where possible. Use dynamic checks as a filter for covered
paths, not as proof that no undefined behavior exists. Define floating-point comparison with exact
mode, NaN, infinity, signed zero, exception, and rounding rules rather than one arbitrary epsilon.

## Input-related differential relations

When no independent compiler exists, compare related inputs or configurations:

- a program and a meaning-preserving transformed program;
- a program and an equivalent form under one runtime input;
- optimized and unoptimized forms;
- cached and fresh compilation;
- serial and parallel compilation;
- different legal pass schedules;
- canonicalized once and twice;
- direct and round-tripped IR or object form.

Every edge needs named side conditions and observed fields. A dead-code transform must exclude
compile-time effects, destructors, reflection, macros, imports, and annotations that make the code
observable. An algebraic identity must exclude overflow, poison, NaN, signed zero, traps, and changed
evaluation count unless the relation explicitly models them.

## First-divergence evidence

On a discrepancy:

1. repeat the frozen binary and environment to classify flakiness;
2. preserve raw and canonical outcomes;
3. narrow option, tier, target, or compiler revision dimensions;
4. capture the executed pass trace;
5. persist the artifact before and after the first divergent stage;
6. run the immediate verifier and analysis comparison;
7. apply an independent translation or property check within its supported model;
8. reduce source, runtime input, flags, pipeline, target, and environment while preserving identity.

An `optimized only` report without the first divergent artifact and exact observation is still a
triage lead, not a localized compiler defect.

## Discrepancy classification

Classify the final evidence as:

- confirmed compiler defect under named semantics;
- implementation-specific but permitted difference;
- specification discrepancy;
- unsupported mode or validator gap;
- shared-lineage common-mode risk;
- harness, runtime, or environment defect;
- nondeterministic or probabilistic candidate;
- unreproduced artifact;
- duplicate of a stable stage and property identity.

Do not use majority vote to name the wrong implementation. Report the authority, lineage, definedness,
first divergence, minimized predicate, and remaining uncertainty.

## Failure matrix

| Failure or test smell | Required response |
| --- | --- |
| Many unit tests, no execution oracle. | Report the missing semantic lane rather than claiming broad correctness. |
| One fixture checks diagnostics, IR, execution, and size. | Split oracle classes or narrow the contract. |
| Pass line coverage is high but no rewrite fires. | Add activation and decline evidence. |
| Snapshot changes after harmless register allocation. | Replace whole dump with structural or semantic assertions. |
| Generated corpus is minimized by edge coverage. | Preserve semantic regressions and corpus class separately. |
| Same backend appears in three compared compilers. | Record one lineage cluster, not three independent votes. |
| Low optimization disagrees with high optimization. | Treat it as a signal until defined semantics or an independent authority selects one. |
| Cross-target outputs differ in pointer width. | Remove or model the permitted target observation. |
| Same source passes under one hash seed only. | Preserve determinism perturbation and first differing artifact. |
| Real-project shadow build is unavailable. | Report the missing canary or release lane without blocking bounded stage evidence. |

## Invariants

- Every test lane names a compiler contract and an oracle that can falsify it.
- Every boundary contract separates structural validity from semantic preservation.
- Oracle classes do not share one accidental snapshot.
- Feature coverage includes interactions and an observable result, not feature presence alone.
- Corpus classes have distinct ownership and retention rules.
- Transformation coverage proves activation or decline, not merely pass execution.
- Differential confidence reflects shared implementation lineage.
- Canonical outcomes preserve semantic state beyond stdout.
- Every discrepancy excludes or models permitted variation before defect classification.
- Determinism tests perturb hidden inputs and normalize only declared noise.
- Change-gate, periodic, canary, and release evidence stay within owned budgets.

## Skill handoffs

- Use `compiler-engineering-review` for compiler-stage semantics, test ladders, differential
  authority, feature grids, canonical outcomes, and earliest-stage regression ownership.
- Use `fuzz-harness-review` for persistent harness reset, instrumentation, feedback, corpus
  mutation, sanitizer campaigns, and CI artifact lifecycle.
- Use `test-suite-performance-review` for runner selection, sharding, caching, retries, and feedback
  latency once compiler semantic coverage is preserved.
- Use `test-design-guard` for selecting focused regression cases from a specific requirement or bug.
- Use `parser-engineering-review` for lexer and parser source-unit, recovery, and incremental
  equivalence contracts.
- Use `interpreter-engineering-review` when an interpreter or VM is an independent semantic oracle.
