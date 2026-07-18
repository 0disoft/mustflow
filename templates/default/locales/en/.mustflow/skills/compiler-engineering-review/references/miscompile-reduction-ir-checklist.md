# Miscompile Reduction and IR Checklist

Use this checklist for wrong-code reproduction, optimization localization, compiler-specific fuzz
oracles, IR or MIR validity, analysis preservation, CFG and SSA defects, borrow or dataflow
discrepancies, and predicate-preserving reduction.

## Contents

1. [Reproduction universe](#reproduction-universe)
2. [Defect classification](#defect-classification)
3. [Definedness gate](#definedness-gate)
4. [Stage map](#stage-map)
5. [Interestingness predicate](#interestingness-predicate)
6. [First-divergence localization](#first-divergence-localization)
7. [Translation validation](#translation-validation)
8. [Reduction matrix](#reduction-matrix)
9. [Probabilistic failures](#probabilistic-failures)
10. [IR generation and mutation](#ir-generation-and-mutation)
11. [Verifier and analysis checks](#verifier-and-analysis-checks)
12. [CFG and SSA matrix](#cfg-and-ssa-matrix)
13. [Incremental analysis differential](#incremental-analysis-differential)
14. [Idempotence and preservation](#idempotence-and-preservation)
15. [Poison and deferred choice](#poison-and-deferred-choice)
16. [Borrow and dataflow checking](#borrow-and-dataflow-checking)
17. [Artifact and corpus classification](#artifact-and-corpus-classification)
18. [Invariants](#invariants)
19. [Skill handoffs](#skill-handoffs)

## Reproduction universe

Capture enough information to reproduce outside the original checkout and process:

- compiler source revision, build identity, and executable hash;
- driver command and actual subordinate commands;
- target triple, architecture, CPU, and feature set;
- object format, code model, relocation model, and calling convention mode;
- sysroot, headers, modules, generated inputs, runtime libraries, and startup objects;
- assembler, archiver, linker, loader, emulator, remote runner, and relevant versions;
- source closure or preprocessed input;
- profiles, generated metadata, response files, link scripts, and archive members;
- runtime data, command arguments, standard input, file layout, environment, locale, working
  directory, rounding mode, exception mode, and thread count;
- compiler seed, runtime seed, pass trace, and actual schedule decisions where applicable;
- expected baseline result, observed candidate result, and normalization policy.

Reproduce from a clean directory or equivalent isolated fixture. A command that works only because
of ambient headers, libraries, caches, profiles, working-directory files, or environment variables
is not yet a portable reproducer.

## Defect classification

Classify the original event before reduction:

| Class | Required evidence |
| --- | --- |
| Frontend semantic defect | Closed source input and wrong unoptimized semantic IR or decision. |
| Optimization miscompile | Defined pre-pass IR, first divergent transform, and wrong observation. |
| Verifier defect | One explicit invariant accepted or rejected incorrectly. |
| Analysis preservation defect | Recomputed analysis differs after a pass claiming preservation. |
| Backend miscompile | Correct optimized IR but wrong machine-stage or runtime result. |
| Diagnostic defect | Wrong structured identity, span, note graph, recovery, or fix-it. |
| ABI defect | Independent producer and consumer disagree at a specified boundary. |
| Object or linker defect | Wrong structural metadata, resolution, relocation, or emitted image. |
| Crash or resource defect | Exact stage, input, failure class, and resource policy. |
| Nondeterminism defect | Same frozen universe produces incompatible artifacts or observations. |
| Specification discrepancy | Implementations differ but no authoritative semantics selects one. |

Do not let reduction silently move between classes. A smaller compiler crash is not a valid
reduction of an optimization wrong-code result.

## Definedness gate

Record which observations the language and IR actually define.

For source programs, inspect:

- signed and unsigned overflow rules;
- shift ranges and integer conversions;
- aliasing, lifetime, alignment, provenance, and object representation;
- uninitialized reads and invalid values;
- sequence and evaluation-order guarantees;
- data races and concurrency memory model;
- floating-point contraction, rounding, exceptions, NaNs, and fast modes;
- implementation-defined and unspecified behavior;
- foreign-function, inline assembly, and platform contracts.

For compiler IR, inspect:

- poison and undefined values;
- no-overflow, in-bounds, non-null, dereferenceable, alignment, range, and alias promises;
- control dependence and whether poison reaches a branch, address, call target, or other immediate
  undefined boundary;
- memory effects, atomics, ordering, and synchronization scope;
- target-specific intrinsics and feature requirements;
- the operation that chooses one stable value from otherwise nondeterministic possibilities.

A structural verifier proves only the structural rules it implements. A sanitizer proves only the
executed path and enabled check set. An alternate compiler disagreeing is a discrepancy signal, not
definedness proof.

## Stage map

Persist the narrowest available artifacts across:

1. source closure;
2. parsed and semantically analyzed representation;
3. unoptimized compiler IR;
4. each relevant optimization boundary;
5. lowered or target IR;
6. machine IR before and after relevant backend stages;
7. assembly;
8. object and object metadata;
9. linked image;
10. loaded runtime state and test input;
11. normalized observable result.

For each boundary, record:

- producer and consumer identities;
- serialization format and schema;
- verification performed;
- semantics or invariants promised;
- input and output hashes;
- target and feature context;
- whether the artifact is replayable without upstream stages.

Swap one stage at a time. If unoptimized IR already differs semantically from the source, do not
blame a later optimization because its output is where the symptom becomes visible.

## Interestingness predicate

A wrong-code reducer predicate should require all conditions needed to preserve the original event:

- candidate source or IR remains accepted by the intended stage;
- structural verification passes where it passed originally;
- baseline compilation or interpretation succeeds;
- candidate compilation succeeds through the disputed stage;
- baseline and candidate executions terminate under the same resource policy;
- baseline matches the declared reference observation;
- candidate alone matches the exact wrong-result fingerprint;
- no undefinedness or unsupported validator feature newly enters the observed path;
- first divergent stage remains the same when that identity is part of the bug;
- output normalization does not erase meaningful differences.

Reject candidates whose interesting event is only:

- any nonzero exit;
- any signal;
- any timeout or out-of-memory event;
- any verifier error;
- any compiler diagnostic;
- any output difference;
- any failure observed once in a flaky loop.

Fingerprint exact values, selected memory, file or object hashes, floating-point bit patterns,
diagnostic IDs and spans, invariant IDs, or other repository-owned observations.

## First-divergence localization

- Capture the executed pass or transform sequence rather than relying on a configured pipeline name.
- Bisect the execution position between last known good and first known bad artifacts.
- Persist the artifact on both sides of the narrowed transform.
- Record nested pass managers and sub-transform numbering when one named pass produces multiple
  execution positions.
- Verify that disabling the candidate transform restores the oracle without changing definedness or
  bypassing the required trigger.
- Use temporary no-inline, no-optimize, externalization, extraction, or stage barriers only for
  localization; remove them from the final reduced artifact unless they are part of the real defect.
- For whole-program optimization, separate frontend generation, summary or index construction,
  distributed or thin backend work, native object production, and final link.

The first pass that crashes is not necessarily the first pass that corrupted state. Run structural
and analysis checks immediately after each transform to move detection closer to the violation.

## Translation validation

When an independent validator covers the transformation:

- feed it the exact pre-transform and post-transform artifacts;
- preserve target data layout, features, memory model, and relevant attributes;
- record unsupported instructions, calls, intrinsics, memory behavior, interprocedural effects, and
  solver limits;
- separate counterexample, proven refinement, timeout, unsupported, and tool failure;
- replay a counterexample through the compiler pipeline when possible;
- do not treat validator timeout or silence as success;
- do not generalize one validated instance into a proof of the whole pass implementation.

If validator and execution disagree, inspect undefinedness, observation model, target semantics,
unsupported features, and artifact mismatch before selecting one as authority.

## Reduction matrix

Reduce these axes independently, then alternate them while preserving the exact predicate:

| Axis | Typical units |
| --- | --- |
| Source | File, declaration, function, statement, expression, type, token. |
| Compiler IR | Module, function, block, edge, instruction, operand, attribute, metadata. |
| Machine IR | Function, block, instruction, register class, frame object, target flag. |
| Runtime input | File, record, element, byte range, bit pattern, argument, iteration. |
| Flags | Optimization group, target feature, profile mode, alias or math mode, debug or sanitizer mode. |
| Pipeline | Stage, pass group, pass instance, sub-transform. |
| Program graph | Translation unit, module, object, archive member, function linkage. |
| Link graph | Section, symbol, relocation, library, script rule, order. |
| Environment | Locale, path, variable, file layout, rounding, thread count. |
| Nondeterminism | Seed, worker count, scheduling decision, repetition count. |

Rules:

- Reduce runtime data with code fixed, then code with data fixed, and repeat.
- Reduce dependent options as groups; a profile-use option without its profile or a target flag
  without the feature-enabling mode may produce a different pipeline.
- Preserve the target feature that triggers the first failing transform.
- Keep source and direct-stage regressions when both carry different value.
- Do not let source reduction change the generated IR shape so far that a different pass fails.
- Do not let IR reduction remove the source-level construct needed for a user-facing regression.
- Close all external inputs before calling the result minimized.

## Probabilistic failures

Separate compiler nondeterminism from program nondeterminism.

Record per attempt:

- compiler seed and actual pass or scheduler decisions;
- compilation worker count;
- object, IR, MIR, and executable hashes;
- runtime seed and runtime schedule;
- reference and candidate observations;
- crash, timeout, resource, or wrong-code class;
- environment and target identity.

Use a repository-owned statistical policy. A reducer predicate should preserve the original wrong
observation distribution, not accept any rare failure. Repeatedly generating different object hashes
with stable runtime behavior is a different defect from stable objects producing nondeterministic
runtime output.

## IR generation and mutation

Use separate lanes:

- raw bytes or text for parser, decoder, and rejection behavior;
- structurally valid generated IR for optimizer and verifier depth;
- minimally invalid IR that violates exactly one verifier rule;
- structure-preserving mutation for CFG, SSA, type, dominance, and analysis-sensitive paths;
- meaning-preserving metamorphic transforms for semantic comparisons;
- target-aware machine IR for backend stages.

Valid IR generation must preserve the minimum stage invariants: types, block terminators, edge and
phi agreement, dominance where required, calling convention, data layout, target features, and
machine operand constraints. Do not repair every mutation into validity; retain a separate invalid
lane for robust diagnostics and rejection.

Parse-print-parse should compare normalized structure and semantics, not raw text. Canonical names,
block ordering, attribute spelling, and harmless serialization choices may differ.

## Verifier and analysis checks

Place checks directly after each mutation or pass:

- structural IR verifier;
- machine verifier;
- dominance and post-dominance;
- loop and region structure;
- memory or alias analysis;
- liveness and register constraints;
- dataflow fixed-point invariants;
- analysis-preservation declaration;
- repository-specific ownership, effect, or type invariants.

Verifier negative fixtures should start from one valid input and violate one rule. Require stable
rejection, bounded diagnostics, no crash, and a location tied to the violated contract. Do not make
one fixture violate several rules and then snapshot whichever error happens to appear first.

Keep these claims separate:

- the artifact parses;
- the artifact is structurally valid;
- the execution meaning is defined;
- the pass preserves meaning;
- preserved analyses remain current;
- the final program matches the source contract.

## CFG and SSA matrix

Include:

- diamond and nested diamond;
- critical edge and duplicate edge to the same destination;
- self-loop and exitless loop;
- unreachable block and unreachable cycle;
- reducible and irreducible loop;
- duplicate predecessor and edge-sensitive phi input;
- exceptional, cleanup, suspend, and resume edges;
- block with multiple exits or target-specific terminators;
- edge split, block merge, tail duplication, and unreachable elimination;
- value rename, temporary copy, independent instruction reorder, and redundant diamond insertion.

After each transform, verify:

- every block terminates correctly;
- predecessor and successor multiplicity agrees;
- phi or block-argument inputs agree with incoming edges;
- dominance and post-dominance are correct;
- loop membership and nesting are correct;
- liveness, memory, and ownership facts agree;
- removed blocks and values have no stale references;
- observable execution remains equivalent for meaning-preserving transforms.

Do not hardcode temporary names or block numbering as semantic truth.

## Incremental analysis differential

For each CFG or instruction mutation:

1. update the maintained analysis through its incremental API;
2. independently recompute the analysis from the mutated IR;
3. normalize representation-only differences;
4. compare the complete semantic result;
5. reduce the first mutation that separates them;
6. repeat in different mutation orders.

Cover dominance, post-dominance, loop structure, memory SSA, alias summaries, liveness, reaching
definitions, borrow or ownership facts, and repository-specific caches. If both paths share code,
name that common-mode risk and seek a third invariant or execution oracle.

## Idempotence and preservation

For canonicalization or normalization passes, compare normalized `P(x)` with `P(P(x))`. If they
differ, classify:

- intentional bounded discovery of new opportunities;
- monotonic convergence with a declared bound;
- oscillation between forms;
- unstable naming or ordering only;
- semantic or analysis corruption.

For each declared preserved analysis:

- recompute from the output;
- compare semantic results;
- verify invalidation when the pass changes its dependency;
- test no-op, local mutation, CFG mutation, clone, deletion, and exceptional-control cases;
- check that a later consumer does not observe stale state.

Correct final output in one pipeline does not excuse a false preservation declaration.

## Poison and deferred choice

Build a propagation matrix across:

- scalar and vector lanes;
- selected and unselected branch arms;
- branch or switch conditions;
- memory addresses and stored values;
- call arguments and return values;
- duplicated or merged computations;
- speculative motion and dead-code elimination;
- value selection or freeze-like boundaries;
- overflow and in-bounds promises;
- phi or block arguments across control flow.

Distinguish a value that may independently vary per use from one arbitrary choice shared by all
uses. Optimizations that duplicate, sink, hoist, or turn data dependence into control dependence
must preserve the appropriate choice and poison semantics.

## Borrow and dataflow checking

Compare more than accept versus reject. Preserve facts such as:

- loan or borrow identity;
- region and program-point membership;
- move and initialization state;
- reborrow and two-phase activation state;
- partial move and projection path;
- drop and destructor order;
- closure or coroutine capture;
- suspension and resume points;
- lattice input, transfer, and fixed-point output.

Use meaning-preserving transformations: introduce a temporary, split one statement, add an unrelated
block, make an implicit operation explicit, rename or duplicate a harmless value, or restructure
equivalent control flow. Compare independent checkers or recomputed facts where available.

When a result changes, identify whether source semantics, lowered IR, fact generation, solver,
diagnostic mapping, or temporary lifetime rules changed first.

## Artifact and corpus classification

Fingerprint compiler regressions by:

- earliest failing stage or pass instance;
- violated semantic or verifier property;
- minimized CFG or machine shape;
- target and feature set;
- defect class;
- stable observation fingerprint.

Do not deduplicate only by crash stack. One early invariant violation can crash many later passes,
and one assertion site can receive several distinct corrupt states.

Keep:

- original reproduction universe;
- minimized user-facing source fixture;
- minimized direct-stage fixture;
- exact interestingness predicate;
- before and after stage artifacts;
- unsupported-validator notes;
- flaky distribution evidence where applicable;
- link to the regression suite and fuzz seed corpus that owns the case.

## Invariants

- Every wrong-code claim names a defined observation.
- Every reducer candidate preserves the original defect class and normalized fingerprint.
- Every first-bad-stage claim has a replayable artifact on both sides of the boundary.
- Every verifier claim states which invariant was checked.
- Every preserved-analysis claim is compared with recomputation or an independent invariant.
- Every differential result has an authority other than majority vote.
- Every probabilistic predicate preserves the original distribution class under a repository-owned policy.
- Every final regression is assigned to the earliest owning stage.

## Skill handoffs

- Use `compiler-engineering-review` as the owner of compiler semantics, stage localization, and
  compiler-specific oracles.
- Use `parser-engineering-review` for lexer, grammar, CST, AST construction, parser recovery, and
  source-unit contracts.
- Use `fuzz-harness-review` for harness reset, instrumentation, feedback, corpus, campaign,
  sanitizer, generic minimization infrastructure, and CI lifecycle.
- Use `race-condition-review` for compiler-internal nondeterministic schedules and shared analyses.
- Use `memory-lifetime-review` for compiler implementation lifetime, arena, and ownership defects.
- Use the matching language skill for source-language semantics and undefined behavior.
