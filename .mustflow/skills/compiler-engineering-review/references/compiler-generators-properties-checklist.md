# Compiler Generators and Properties Checklist

Use this checklist when compiler testing needs valid or invalid generators, stage-aware mutation,
property or metamorphic laws, structure-aware shrinking, semantic coverage, or relation-graph triage.

## Contents

1. [Generator contract](#generator-contract)
2. [Valid and invalid lanes](#valid-and-invalid-lanes)
3. [Stage-specific harness matrix](#stage-specific-harness-matrix)
4. [Lexer generation](#lexer-generation)
5. [Parser generation and edit sequences](#parser-generation-and-edit-sequences)
6. [Type and semantic generation](#type-and-semantic-generation)
7. [Constraint-solver properties](#constraint-solver-properties)
8. [Source-level optimizer generation](#source-level-optimizer-generation)
9. [IR generation and mutation](#ir-generation-and-mutation)
10. [Pass-transition graphs](#pass-transition-graphs)
11. [Stage-local property ledger](#stage-local-property-ledger)
12. [Round-trip laws](#round-trip-laws)
13. [Alpha-renaming and binding laws](#alpha-renaming-and-binding-laws)
14. [Trivia and surface-form relations](#trivia-and-surface-form-relations)
15. [Dead-code relations](#dead-code-relations)
16. [Independent reorder relations](#independent-reorder-relations)
17. [Extraction and inlining relations](#extraction-and-inlining-relations)
18. [Algebraic and refinement relations](#algebraic-and-refinement-relations)
19. [Idempotence and convergence](#idempotence-and-convergence)
20. [Relation graphs](#relation-graphs)
21. [Structure-aware shrinking](#structure-aware-shrinking)
22. [Semantic coverage](#semantic-coverage)
23. [Replay and triage capsule](#replay-and-triage-capsule)
24. [Failure matrix](#failure-matrix)
25. [Invariants](#invariants)
26. [Skill handoffs](#skill-handoffs)

## Generator contract

Treat a generator as a compiler-facing model, not a random syntax printer. Record:

- target stage and accepted representation;
- semantic or structural facts guaranteed by construction;
- facts intentionally violated and their stable identity;
- entropy source and deterministic replay;
- maximum bytes, nodes, depth, scopes, blocks, edges, types, constraints, and runtime work;
- feature and production distribution;
- target and data-layout assumptions;
- runtime input generation;
- expected property or oracle;
- shrink representation and repair policy;
- generator schema and semantic version.

Track generator branch and feature histograms. A generator that produces thousands of examples but
rarely reaches generics, exceptional control flow, alias boundaries, vector operations, or the target
rewrite has a reachability defect.

## Valid and invalid lanes

Keep valid and invalid generation separate.

The valid lane should preserve every prerequisite needed by the target stage: decoding, grammar,
scope, types, effects, CFG, SSA, memory, target, ABI, or definedness rules. It explores deep semantic
and transformation behavior.

The invalid lane should violate one named rule from a valid starting point. It explores rejection,
diagnostics, recovery, verifier behavior, progress, and resource bounds.

Do not rely on a mostly-invalid generator that occasionally stumbles into accepted input. Do not
repair every mutation into validity and thereby abandon malformed-boundary coverage. Attach the
violated invariant and intended stage to every invalid artifact.

## Stage-specific harness matrix

Prefer narrow entrypoints:

| Input | Target | Typical oracle |
| --- | --- | --- |
| Raw bytes | Decoder or lexer | Progress, span bounds, stable token or error result |
| Tokens or source | Parser | Tree validity, recovery, full-versus-incremental relation |
| Syntax plus environment | Resolver or type checker | Binding, type, effect, and diagnostic facts |
| Typed or semantic IR | Lowering | Preservation and destination verifier |
| Valid compiler IR | Optimizer or analysis | Refinement, verifier, recomputation, activation |
| Minimally invalid IR | Verifier | Stable bounded rejection of one invariant |
| Valid machine IR | Backend stage | Machine verifier and target relation |
| Assembly or encoding | Assembler or disassembler | Semantic round trip and metadata |
| Objects and link graph | Linker | Resolution, relocation, and image structure |
| Program plus runtime vector | Executable | Canonical defined outcome |

One driver-level target remains useful for integration, but it should not be the only path to deep
stages. Persistent harness reset, feedback, corpus, sanitizer, and campaign mechanics belong to
`fuzz-harness-review`.

## Lexer generation

Generate raw bytes as well as accepted source text. Include:

- malformed and valid encoding sequences;
- byte-order marks at permitted and forbidden positions;
- NUL and control bytes;
- LF, CRLF, mixed line endings, and absent final newline;
- combining characters and declared normalization forms;
- long identifiers and code-point sequences;
- token-prefix conflicts and maximal-match boundaries;
- numeric base, separator, point, exponent, suffix, and overflow boundaries;
- escape, raw delimiter, interpolation, continuation, and unterminated string states.

Useful properties include monotonic non-overlapping spans, bounded ranges, progress on an error byte,
deterministic tokenization, literal-value preservation, and canonical token-print then relex. Reward
lexical state and transition diversity when ordinary edge coverage cannot distinguish it.

## Parser generation and edit sequences

Use grammar-aware generation with explicit budgets for nonterminal depth, recursion, repetition, and
node count. Adjust production weights from feature reachability without removing a raw-byte lane.

For structure-preserving mutation:

- splice expression into expression, type into type, declaration into declaration, and pattern into
  pattern;
- preserve delimiter and nesting contracts when the target requires valid syntax;
- repair names and semantic environment only in lanes intended to reach later stages;
- keep near-miss mutations that insert, delete, duplicate, or replace one syntax element.

For incremental parsing, generate edit sequences rather than one final file. After each insertion,
deletion, or range replacement, compare the incremental result with a fresh parse of the exact same
snapshot after normalizing permitted identity differences. Check stale nodes, old-buffer ranges,
unbounded diagnostic growth, lost progress, and convergence after surrounding context stabilizes.

## Type and semantic generation

Carry a semantic environment containing:

- scopes, declarations, binding identities, and initialization state;
- semantic types, generic parameters, and constraints;
- mutability, ownership, lifetime, nullability, and variance where applicable;
- effects, exceptions, capabilities, and control context;
- function parameters, result types, and overload candidates;
- pattern exhaustiveness and refinement facts;
- module, visibility, and import state.

Generate the required result type first, then construct expressions and statements that inhabit it.
Choose call targets only from candidates whose argument, effect, lifetime, and visibility rules are
satisfied.

For near-miss generation, start from a valid program and break one relation: argument type, generic
arity, variance, nullability, borrow, effect, visibility, exhaustiveness, or initialization. Require
the intended rejection category and primary location, bounded cascades, no crash, and preservation of
unrelated semantic facts.

## Constraint-solver properties

Exercise recursive and mutually recursive constraints, overload sets, associated projections,
higher-ranked forms, subtyping cycles, ownership relations, and effect variables under explicit
budgets for steps, depth, candidates, and expanded goals.

Check metamorphic stability under:

- independent declaration order;
- candidate insertion order;
- hash seed and traversal order;
- alpha-renaming;
- equivalent explicit versus implicit constraints;
- old and new solver implementations where both are valid authorities.

Compare acceptance, selected candidate, inferred type, proof or obligation facts, and stable
diagnostic category. A timeout or budget exhaustion is its own outcome, not an arbitrary rejection.

## Source-level optimizer generation

Generate programs whose disputed observation is defined. Track ranges for:

- integer and shift operations;
- division and remainder;
- array and pointer indices;
- alignment, lifetime, provenance, and alias relations;
- initialization and valid object representation;
- floating-point mode and exceptional values;
- concurrency and data-race exclusion;
- target features and implementation-defined source rules.

Bias generation toward optimizer triggers: induction variables, reductions, repeated expressions,
branches, alias boundaries, vectorizable accesses, calls, aggregates, and control-flow shapes. A
generator can be perfectly defined yet useless if it never creates transformable structure.

Use dynamic undefined-behavior checks as one covered-path filter, not as a proof that the complete
program has one meaning.

## IR generation and mutation

Generate valid IR from stage invariants rather than relying only on frontend output. Track:

- operation, type, bit width, vector shape, and attributes;
- block, edge, terminator, and region structure;
- phi or block-argument predecessor agreement;
- dominance, use-def, liveness, and ownership;
- memory effects, alias classes, alignment, provenance, and atomics;
- poison, undefined, deferred choice, and fixing operations;
- calls, intrinsics, target features, data layout, and ABI facts.

After every valid mutation, run the structural verifier and compare any analysis claimed current.
Maintain a separate minimally invalid lane that violates one verifier rule and expects stable
rejection.

Frontend-generated IR covers realistic lowering. Direct IR generation covers valid states the
frontend rarely emits. Keep both.

## Pass-transition graphs

Do not generate arbitrary pass sequences that violate undocumented or declared prerequisites.
Represent pass sequencing as a state graph with:

- current IR dialect or form;
- required and preserved analyses;
- canonicalization state;
- target-lowering stage;
- whole-program or profile prerequisites;
- legal next transforms;
- verifier required after each edge.

Generate realistic variations: repeat canonicalization, omit an optional pass, reorder independent
passes, change inlining placement, vary whole-program mode, or alter profile input. If a pass is
declared idempotent, assert that a second application makes no semantic or normalized structural
change. Reduce the pass path together with the input so necessary predecessors remain.

## Stage-local property ledger

Give each property a stable identity, input domain, side conditions, observation, and shrink policy.

| Stage | Example property |
| --- | --- |
| Lexer | Spans progress and canonical token text relexes to equal token meaning. |
| Parser | Normalized parse-print-parse preserves structure. |
| Incremental parser | Edit result equals a fresh parse of the same snapshot. |
| Resolver | Every reference maps to one permitted binding identity. |
| Type checker | Typed nodes carry valid types and inserted conversions. |
| Lowering | Source or typed semantics are preserved in destination IR. |
| CFG or SSA transform | Verifier, dominance, use-def, and edge relations remain valid. |
| Analysis | Incremental update equals independent full recomputation. |
| Optimizer | Target refines source under the declared definedness model. |
| Backend | Machine verifier and target semantic relation hold. |
| Assembler | Accepted canonical round trip preserves encoding and relocation meaning. |
| Linker | Resolution graph selects the declared definitions and relocations. |
| Build | Permitted environment perturbations preserve normalized artifacts. |

An end-to-end result property remains useful, but it cannot replace stage-local laws when failure
localization matters.

## Round-trip laws

Apply round trips to every serialization boundary that claims semantic stability:

- token stream to canonical source and back;
- syntax to printer and parser;
- semantic, compiler, or machine IR serialize and deserialize;
- textual and binary IR forms;
- assembly, encoding, disassembly, and reassembly;
- object reader and writer where supported;
- profile, cache, or summary artifact encode and decode.

Compare normalized structure or semantics. Exclude temporary IDs, permitted block order, trivia,
non-contract metadata, and canonical spelling differences. Preserve source locations, debug facts,
relocations, or stable names when the relevant artifact contract includes them.

## Alpha-renaming and binding laws

Rename bound identifiers while preserving capture avoidance and declared name observability. Cover:

- local and module bindings;
- generic and type parameters;
- labels and pattern bindings;
- nested scopes and captures;
- macro hygiene identities;
- internal symbols and mangling relations;
- Unicode and long-name boundaries where the language permits them.

Compare binding graph, type or semantic facts, closure captures, executable outcome, and internal
mangling relation. Exclude exported, reflected, serialized, diagnostic, or otherwise name-observable
bindings from a relation that expects identical public output.

## Trivia and surface-form relations

Insert or remove permitted whitespace, comments, newlines, and redundant grouping while preserving
the language's token and grammar rules. Compare token meaning, syntax, semantic IR, diagnostics where
positions are intentionally related, and execution outcome.

Name exceptions:

- indentation or line-sensitive syntax;
- automatic statement termination;
- documentation comments;
- macro token trees;
- preprocessing directives;
- source-location or coverage contracts;
- identifier normalization rules.

Do not assume visually equivalent Unicode forms are semantically equal unless the language says so.

## Dead-code relations

Insert or modify code proven unobservable under the selected runtime input and language contract.
Candidate forms include unreachable blocks, unused functions, unread locals, or discarded pure
computations.

Side conditions must exclude or model:

- compile-time evaluation;
- macro expansion and annotation processing;
- imports and module initialization;
- destructors and cleanup;
- reflection and symbol enumeration;
- volatile, atomic, or I/O effects;
- diagnostics that are specified for dead code;
- code size, debug, or coverage observations when compared.

Dead-code relations can expose invalid speculative analysis, state leakage, register-pressure
effects, and optimizer interaction, but only when the supposedly dead region is truly unobservable.

## Independent reorder relations

Swap declarations, statements, instructions, blocks, or pass applications only when a dependence
certificate proves independence. Include:

- data and control dependence;
- alias and memory effects;
- exceptions and cleanup;
- volatile, atomic, and synchronization order;
- symbol-table and overload visibility;
- module initialization and link order;
- analysis prerequisites.

Compare semantic outcome and the relevant binding, analysis, or artifact facts. A difference can
expose unstable symbol insertion, traversal-order dependence, stale caches, or invalid alias facts.

## Extraction and inlining relations

Extract a pure or explicitly modeled region into a function, or inline a call back into its caller.
Record a certificate containing:

- free variables promoted to parameters;
- result and side-effect mapping;
- evaluation order;
- alias and lifetime relations;
- capture behavior;
- exception and cleanup edges;
- calling-convention and target facts;
- source and debug observation policy.

Exclude or model mutable aliases, nonlocal return, stack inspection, reflection, tail-call promises,
or target ABI observations. Compare runtime outcome plus the compiler boundary the relation intends
to stress.

## Algebraic and refinement relations

Algebraic transforms require semantic side conditions. Neutral operations, comparison inversion,
branch swapping, reassociation, strength reduction, and loop transformations can fail under:

- signed or unsigned overflow rules;
- floating-point NaN, infinity, signed zero, rounding, and exceptions;
- poison and undefined values;
- traps and side effects;
- changed evaluation count;
- memory aliasing and concurrency;
- target-specific arithmetic.

For IR with undefined or nondeterministic behavior, the correct relation may be refinement rather
than equality: the transformed program must not introduce an observation the source forbids. Record
the exact observation model and unsupported operations of any validator.

## Idempotence and convergence

Use idempotence only for passes that declare it. For canonicalizers, formatters, normalizers, and
analyses, compare the second application with the first after normalization.

If output changes again, classify:

- intentional discovery of a new opportunity;
- monotonic convergence with a declared bound;
- unstable temporary naming or order;
- oscillation;
- stale analysis or semantic corruption.

Also perturb hash seed, traversal order, worker count, and schedule for analyses expected to be
deterministic. Same facts in a different internal order may be permitted; different semantic facts
are not.

## Relation graphs

Represent related programs or artifacts as a graph. Each edge stores:

- transform identity and version;
- application location;
- side-condition certificate;
- expected equality, refinement, implication, rejection, or diagnostic relation;
- observations compared;
- source and target artifact hashes;
- stable property or divergence identity.

A graph can combine alpha-renaming, dead-code insertion, extraction, pass variation, cache round
trip, and target mode to expose interactions that one pair misses. When a failure appears, find the
smallest relation path whose final observations diverge.

Do not compose edges whose side conditions are invalidated by an earlier transform. Recheck or
transport certificates along the path.

## Structure-aware shrinking

Shrink at the stage of the defect while preserving the generator's semantic environment.

Possible units:

- source file, declaration, function, statement, expression, type, and token;
- scope, binding, generic constraint, effect, and runtime input;
- IR region, block, edge, instruction, operand, attribute, and metadata;
- machine block, register, frame object, and target feature;
- pass graph node and option dependency group;
- relation graph edge and side-condition certificate.

Repair only facts that the valid lane requires: binding identity, required type, dominance, use-def,
terminators, phi edges, or target constraints. Preserve the exact assertion, property, first
divergence, canonical outcome, and definedness class. Do not shrink original and transformed sides
independently when that destroys the relation.

## Semantic coverage

Track bounded domain features in addition to machine coverage:

- grammar production and parser state;
- semantic type, constraint, overload, and effect relation;
- CFG and SSA shape;
- opcode, width, vector lane, and poison path;
- transformation trigger and decline reason;
- alias, range, dominance, and cost result;
- pass-transition edge;
- backend legalization, selection, register, and frame state;
- diagnostic category and recovery action;
- object, relocation, symbol, and linker rule;
- property and metamorphic edge identity.

Use semantic feedback to diagnose generator starvation and corpus loss. Keep cardinality bounded and
versioned. Coverage remains a search signal, not a correctness oracle.

## Replay and triage capsule

Record enough to reproduce independently:

- raw and structured input;
- generator and shrinker versions;
- entropy seed and runtime input vector;
- semantic environment and definedness certificate;
- compiler and subordinate tool revisions;
- options, target, features, sysroot, libraries, and link closure;
- pass-transition and executed pass traces;
- relation graph and side conditions;
- expected and actual canonical outcomes;
- property, invariant, assertion, or divergence identity;
- environment, schedule, hash seed, locale, path, and cache state;
- first divergent artifact and reduction history.

Separate trigger, detection point, and suspected root cause. A verifier or sanitizer reports where it
noticed a defect, not necessarily where the first contract was violated.

## Failure matrix

| Failure or generator smell | Required response |
| --- | --- |
| Most generated programs fail name resolution. | Add or repair the semantic environment for the valid lane. |
| Invalid generator breaks several rules. | Start from valid input and tag one intended violation. |
| Optimizer generator never activates a rewrite. | Bias transformable structures and record activation coverage. |
| Dynamic check passes generated source. | Keep definedness certificate; the executed filter is not proof. |
| Random pass sequence crashes on missing prerequisite. | Generate from the valid pass-transition graph. |
| Alpha-renaming changes reflected names. | Exclude that observable binding or change the expected relation. |
| Dead-code insertion changes destructor behavior. | The relation side condition was false; reject the case. |
| Algebraic identity fails on signed zero. | Model floating semantics or restrict the input domain. |
| Shrinker turns wrong code into type rejection. | Reject the shrink because the failure identity changed. |
| Relation graph edge loses its certificate. | Stop composition or recompute the side condition. |
| Semantic coverage grows without an oracle failure path. | Treat it as exploration evidence only. |

## Invariants

- Every generator names the stage and facts it guarantees or violates.
- Valid and invalid lanes remain separate and reproducible.
- Generated programs carry the semantic environment needed to reach the target stage.
- Direct IR generation preserves verifier prerequisites for the valid lane.
- Pass sequences follow a declared transition graph.
- Every property has a stable identity, domain, side conditions, observation, and shrink policy.
- Metamorphic transforms carry certificates rather than relying on intuition.
- Structure-aware shrinking preserves the original defect and relation identity.
- Semantic coverage diagnoses reachability but never replaces an oracle.
- Replay capsules include generator, semantic, compiler, target, environment, and relation state.

## Skill handoffs

- Use `compiler-engineering-review` for compiler-stage generators, semantic properties, definedness,
  refinement, transformation relations, and earliest-stage failure identity.
- Use `fuzz-harness-review` for persistent target reset, instrumentation, feedback configuration,
  corpus operations, custom mutators, sanitizer lanes, and campaign lifecycle.
- Use `parser-engineering-review` for lexer and parser state-machine, source-unit, recovery, and
  incremental parsing implementation details.
- Use `interpreter-engineering-review` when a guest interpreter or VM supplies an independent
  semantic model or shares generated language programs.
- Use `test-maintenance` for promoting a minimized case into an ordinary deterministic regression.
- Use the matching language skill for source-language undefined, unspecified, implementation-
  defined, memory-model, floating-point, and ABI semantics.
