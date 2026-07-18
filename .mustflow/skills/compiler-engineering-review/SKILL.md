---
mustflow_doc: skill.compiler-engineering-review
locale: en
canonical: true
revision: 6
lifecycle: mustflow-owned
authority: procedure
name: compiler-engineering-review
description: Apply this skill when compiler semantic analysis, AST/HIR/typed-HIR/MIR/LIR boundaries, IR semantic contracts, semantic/storage/ABI/machine type transitions, ownership capability tokens, borrow or lifetime flow, allocation identity and provenance, scoped or generation-tracked analysis facts, effect or capture models, progressive lowering, mixed-level legality, CFG and SSA construction or destruction, phi and edge semantics, canonical forms, pass ordering, staged verifiers, analysis preservation, optimization transforms, code generation, assembler, object format, symbol tables, archive extraction, section reachability, relocations, static or dynamic symbol resolution, visibility, export or import boundaries, name mangling, ABI, linker, plugin interfaces, dynamic loading, debug symbols, DWARF, PDB, dSYM, unwind metadata, stripping, dead-code elimination, identical-code folding, LTO, crash symbolication, symbol stores, diagnostics, source mapping, recovery, fix-its, compiler test strategy, well-defined program or IR generators, differential or metamorphic testing, transformation-activation coverage, determinism testing, miscompile reproduction, stage localization, reduction, or compiler-correctness claims are created, changed, reviewed, debugged, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.compiler-engineering-review
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

# Compiler Engineering Review

<!-- mustflow-section: purpose -->
## Purpose

Review compiler behavior through stage-local semantic contracts rather than compile success or
process survival. Identify the last stage whose output preserves the intended meaning, the first
stage whose output violates it, and the smallest reproducible universe that keeps that exact
divergence.

Keep source semantics, intermediate representation validity, optimization equivalence, analysis
preservation, machine-level contracts, diagnostic structure, source mapping, ABI, object metadata,
link resolution, runtime observations, and unspecified or undefined behavior as separate evidence
layers.

Design compiler tests by semantic distance and oracle cost, not file count or line coverage. Keep
acceptance, diagnostics, semantic execution, artifact structure, performance, determinism, and
transformation activation as distinct oracles with explicit owning stages.

<!-- mustflow-section: use-when -->
## Use When

- A compiler, transpiler, optimizer, static analyzer, borrow checker, verifier, assembler, linker,
  disassembler, formatter-adjacent diagnostic layer, or code generator changes.
- A program compiles but changes observable behavior across optimization levels, pass pipelines,
  compiler versions, targets, CPU features, backend paths, link modes, or runtime environments.
- IR, MIR, CFG, SSA, dominance, liveness, dataflow, alias, memory, poison, undefined-value,
  register, unwind, relocation, or symbol invariants need review.
- IR layer boundaries, semantic versus storage types, effect systems, progressive or partial
  lowering, legal mixed states, canonicalization windows, source identity, or replay formats change.
- Ownership or borrow tokens, object-lifetime state, allocation/view/address identity, pointer
  provenance, alias scope or epoch, capture behavior, fact provenance, or metadata transitions change.
- Stage-specific verifier ordering, builder validity, negative verifier mutation, independent ABI or
  ownership checks, conservative analysis invalidation, or semantic refinement checking changes.
- Phi placement or elimination, critical and exceptional edges, sealed blocks, LCSSA, irreducible
  control flow, analysis invalidation, pass prerequisites, cleanup cycles, or pipeline ordering change.
- Compiler diagnostics, recovery trees, source ranges, macro locations, Unicode display columns,
  fix-its, note relationships, rendering, or parallel determinism need verification.
- ABI layout, calling convention, exception handling, object metadata, assembler round trip, symbol
  tables, archive extraction, link order, relocation, section collection, static or dynamic binding,
  visibility, export or import policy, mangling, interposition, plugin ABI, or binary compatibility is
  in scope.
- Runtime, regular, public, debug, unwind, source, and link-provenance symbol assets; separated debug
  files; crash capture; offline symbolication; stripping; section collection; ICF; LTO; or symbol-store
  identity, retention, privacy, and canary behavior is in scope.
- A compiler fuzz target needs compiler-specific semantic or stage oracles, reduction axes, or
  regression artifact classification.
- Compiler tests, generated programs, feature-interaction coverage, differential lineages,
  metamorphic relations, property laws, transformation activation, corpus tiers, or PR, periodic,
  canary, and release validation lanes need design or review.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Only lexing, parsing, CST or AST construction, syntax recovery, incremental parsing, or parser
  resource limits change; use `parser-engineering-review`.
- Only fuzz harness reset, corpus, mutator, feedback, sanitizer, campaign, or CI lifecycle changes;
  use `fuzz-harness-review`.
- Only language application code changes under an existing compiler; use the matching language
  code-change skill.
- Only a build script, package, or command invocation changes without compiler semantic risk; use
  the narrower build, package, shell, or command-contract skill.
- Only a public error string changes without diagnostic structure or source-location impact; use
  `error-message-integrity-review`.
- Only ordinary application test organization, runner speed, sharding, retries, or fixture lifecycle
  changes without compiler-stage or semantic-oracle risk; use the matching test skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Compiler and driver identities, source revision, actual subordinate commands, target triple,
  architecture and features, sysroot, headers, runtime libraries, assembler and linker, environment,
  locale, working directory, and build-mode evidence.
- Source, preprocessed or otherwise closed input, runtime data, command arguments, environment,
  target features, profiles, link inputs, and every other factor required to reproduce the outcome.
- Pipeline graph from source through semantic analysis, source IR, optimization, lowering, machine
  IR, assembly, object, link, load, and execution, including persisted boundary artifacts.
- Expected semantics, reference implementation or interpreter, baseline and candidate results,
  exact normalized failure predicate, exit and resource policy, and nondeterminism evidence.
- Definedness contract: source-language undefined or unspecified behavior, IR poison or undefined
  values, overflow and alias promises, alignment, provenance, memory model, floating-point mode,
  target assumptions, and unsupported validation features.
- Pass trace, first-divergence boundary, before and after artifacts, verifier evidence, analysis-
  preservation declarations, translation-validation coverage, and unsupported cases.
- Reduction axes for source, IR or MIR, runtime input, flags, features, pipeline, modules, objects,
  archives, symbols, relocations, environment, schedule, and probability predicate.
- IR and machine invariants, CFG shapes, incremental versus full analysis results, borrow or dataflow
  facts, analysis invalidation, and canonicalization expectations.
- IR layer ledger: semantic contract, retained and destroyed information, types, effects, control
  paths, identity and source provenance, verifier, legal mixed states, consumers, lowering boundary,
  serialization stability, and target-data-layout entry point.
- Fact ledger: semantic, storage, ABI, and machine representation; fact origin, domain, scope,
  allocation identity, lifetime epoch, generation, status, consumer, invalidating mutations,
  preserve/recompute/weaken/drop transition, and runtime guard or reproof boundary.
- Ownership ledger: capability-token identity, pointer or view aliases, borrow interval, move and
  release transitions, function-boundary ownership ABI, exceptional and suspension paths, and
  concrete lowering or runtime representation.
- Pass pipeline ledger: pass prerequisites and postconditions, canonical-form ownership, preserved and
  invalidated analyses, fixed-point or iteration budget, code-size and compile-time budget,
  instrumentation position, target boundary, and interaction tests.
- Diagnostic IDs, severity, primary and related locations, fix-its, recovery nodes, render modes,
  source encodings, macro and include provenance, and determinism expectations.
- Link and ABI ledger: object format and platform contract, regular and dynamic symbol namespaces,
  binding, type, visibility, version, decorated name, undefined references, archive extraction rule,
  section roots and collection, relocation producer and consumer, dynamic dependencies, binding
  timing, export or import allowlist, interposition policy, language ABI options, and toolchain identity.
- Final-link evidence: actual driver-expanded input order, selected and discarded definitions, archive
  members, retained and collected sections, resolved relocation targets, direct dynamic dependencies,
  exported ABI surface, link map or selection trace, and loader-visible result.
- ABI, layout, calling convention, unwind, binary compatibility, target runner, emulator, or remote
  execution evidence, including a versioned boundary contract for plugins or long-lived consumers.
- Debug-artifact ledger: runtime exports, regular symbols, public names, line tables, full debug data,
  unwind information, source bundle, link provenance, final binary identity, architecture slice,
  load address, separated-debug association, artifact lineage, access policy, and retention window.
- Crash-symbolication ledger: capture format, precise versus return-address semantics, module identity
  and load range, inline-chain policy, symbolicator version, source mapping, unavailable-data policy,
  immutable store key, and external retrieval canary.
- Test architecture: semantic-distance and oracle-cost ladder, stage boundary contracts, oracle
  classes, feature-interaction grid, compile-only through cross-target execution lanes, corpus
  ownership, failure budgets, determinism perturbations, and PR, periodic, canary, or release cadence.
- Differential and property evidence: implementation lineage, shared components, option and tier
  lattice, canonical outcome, runtime input vectors, definedness exclusions, independent authority,
  meaning-preserving transforms with side conditions, relation graph, and exact divergence identity.
- Generator and coverage evidence: valid and invalid lanes, grammar and semantic environment,
  type and effect constraints, valid pass-transition graph, stage-specific shrinker, transformation
  activation and rejection reasons, property IDs, replay capsule, and corpus classification.
- Configured command intents for the selected repository.

Read [Miscompile Reduction and IR Checklist](references/miscompile-reduction-ir-checklist.md) when a
wrong-code result, optimization regression, verifier gap, analysis-preservation defect, CFG or SSA
bug, borrow or dataflow discrepancy, flaky compiler failure, or reduction task is in scope.

Read [IR Design, SSA, and Pass Pipeline Checklist](references/ir-design-ssa-pass-pipeline-checklist.md)
when an IR layer, semantic or storage type, effect model, progressive lowering, mixed-level legality,
ownership or borrow capability, lifetime or provenance model, scoped analysis fact, metadata
transition, verifier, canonical form, CFG or SSA construction, phi or edge semantics, analysis
transaction, pass prerequisite, pass ordering, instrumentation position, or pipeline interaction is
in scope.

Read [Diagnostics, ABI, Codegen, and Linker Checklist](references/compiler-diagnostics-abi-linker-checklist.md)
when diagnostics, source locations, recovery, fix-its, ABI, object metadata, machine lowering,
assembly, disassembly, unwind, symbol tables, archives, relocations, visibility, exports or imports,
static or dynamic linking, plugin boundaries, cross-target behavior, or binary compatibility is in
scope.

Read [Debug Symbols, Stripping, and Symbolication Checklist](references/debug-symbol-symbolication-checklist.md)
when runtime, regular, public, debug, unwind, or source symbol assets; separated DWARF, PDB, dSYM,
crash capture, symbol stores, stripping, section collection, ICF, LTO, optimized debug information,
or symbolication is in scope.

Read [Compiler Test Strategy and Differential Checklist](references/compiler-test-strategy-differential-checklist.md)
when test layering, feature interactions, corpus ownership, compile/link/execute lanes, differential
lineages, canonical outcomes, determinism perturbation, or PR, periodic, canary, and release cadence
is in scope.

Read [Compiler Generators and Properties Checklist](references/compiler-generators-properties-checklist.md)
when lexer, parser, type-system, IR, optimizer, or pass-sequence generation; round-trip, property, or
metamorphic relations; structure-aware shrinking; semantic coverage; or relation graphs are in scope.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the exclusions.
- The expected language and target semantics are named, or the missing specification decision is
  reported before a discrepancy is labeled a compiler defect.
- The selected repository instructions and command contract have been checked.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update compiler stages, semantic checks, IR or MIR passes, verifiers, analysis invalidation,
  backend lowering, diagnostics, source mapping, ABI handling, object writers or readers, linker
  logic, regression fixtures, reducer predicates, and directly synchronized docs or templates.
- Add focused source, IR, MIR, assembly, object, link-graph, diagnostic, cross-version, cross-target,
  differential, metamorphic, translation-validation, and fault fixtures.
- Add deterministic stage dumps or structured diagnostic outputs when they are bounded, redacted,
  and owned by existing repository test or debug surfaces.
- Add stage-local properties, semantic generators, feature-interaction fixtures, activation
  counters, canonical outcomes, metamorphic relation metadata, relation-aware reducers, corpus
  ownership metadata, and cadence-specific test selection when directly tied to compiler contracts.
- Do not preserve a reduced artifact that changed from the original wrong-code predicate into a
  crash, timeout, verifier rejection, compile error, or different undefined program.
- Do not claim a compiler bug from majority vote, output difference under unspecified semantics,
  unsupported validator behavior, or one final executable result without stage evidence.

<!-- mustflow-section: procedure -->
## Procedure

1. State the compiler claim and exact oracle, then place it on a semantic-distance and oracle-cost
   ladder. Keep local data-structure, stage regression, pipeline integration, whole-program
   execution, differential, generated, and real-project evidence separate so failure cost and
   localization distance remain visible.
   - Name the observable source-level or ABI contract, normalized baseline result, candidate result,
     and failure fingerprint.
   - Separate compile rejection, verifier rejection, crash, timeout, resource exhaustion,
     nondeterminism, wrong diagnostics, wrong object metadata, wrong code, and link failure.
2. Freeze the reproduction universe. Record compiler and tool revisions, actual driver-expanded
   commands, target and features, sysroot and libraries, source closure, link inputs, environment,
   locale, working directory, runtime input, and output normalization. Reproduce from a clean
   directory or equivalent isolated boundary before reducing.
3. Split the pipeline into persisted boundaries. Preserve source or closed frontend input,
   unoptimized IR, optimized IR, machine IR, assembly, object, executable, runtime input, and
   observed output where applicable. Give every boundary a structural verifier, semantic relation,
   normalized form, and stage-local regression contract where the implementation exposes them. Swap
   or rerun one stage at a time.
4. Prove the input has defined meaning for the disputed observation. Check source-language
   undefined and unspecified behavior, IR poison and undefined values, overflow and alias promises,
   alignment, provenance, data races, floating-point environment, target features, and validator
   limitations. A structural verifier pass is not definedness proof.
5. Build an interestingness predicate for the original defect. Separate acceptance, structured
   diagnostics, semantic result, artifact shape, performance, and determinism into distinct oracle
   classes; combine only the classes required by the claim. Require the necessary baseline and
   candidate stages to succeed, the expected reference observation to remain stable, and the exact
   candidate divergence to survive. Reject candidates that merely crash, hang, fail verification,
   fail compilation, or expose another discrepancy.
6. Find the first divergence by execution position, not pass-name guesswork. Bisect executed
   transformations or stage boundaries and preserve before and after artifacts plus the actual pass
   trace. A numbered step may be a sub-transform rather than a whole named pass.
7. Validate the isolated transformation when a suitable independent semantics checker exists.
   Record supported operations and memory or interprocedural limits. A validator counterexample is
   evidence for the covered model; validator silence or unsupported behavior is not proof.
8. Reduce one axis at a time, then alternate axes.
   - Shrink source and compiler-level IR separately.
   - Alternate program reduction with runtime data and argument reduction.
   - Reduce flags as dependency groups, target features, pipeline, modules, translation units,
     objects, archives, sections, symbols, relocations, and environment facts.
   - Remove temporary localization barriers before accepting the final reproducer.
9. Treat probabilistic failures as distributions. Fix and record compiler seeds, pass order,
   thread count, object hashes, runtime seeds, and actual schedule decisions. Use a repository-owned
   probability policy; do not invent a threshold that rewards unrelated crashes or timeouts.
10. Preserve two useful regression levels when the defect crosses them: a small user-facing source
    reproducer and a small direct-stage IR, MIR, object, or link fixture. Assign artifacts separately
    to specification or conformance, minimized historical regression, generated or fuzz discovery,
    and real-project compatibility corpora. Grow a bounded bug neighborhood around a minimized case
    by varying the proven trigger axes without merging those corpus purposes.
11. Generate input at the stage being tested. Keep raw malformed input for parsers and decoders,
    structurally valid IR for optimizers and analyses, valid machine IR for backend passes, and
    controlled invalid examples for verifiers. Separate valid and invalid generators; attach the
    grammar, scope, type, effect, CFG, SSA, target, and definedness facts needed to know which rule
    each input satisfies or intentionally violates. Structure-preserving mutation must not erase the
    raw rejection lane.
12. Verify immediately after every transform. Run the owning IR or machine verifier and recompute
    analyses the pass claims to preserve. Record transformation or rewrite identity, triggered and
    declined cases, operand and control shapes, and rejection reason so an executed pass is not
    mistaken for an exercised transform. Distinguish structural validity, semantic definedness,
    analysis consistency, execution equivalence, activation coverage, and mutation-detection evidence.
13. Exercise CFG and SSA shapes systematically: critical and duplicate edges, self-loops,
    unreachable cycles, irreducible regions, infinite loops, exceptional edges, edge splitting,
    block merging, tail duplication, phi changes, and unreachable elimination. Check dominance,
    post-dominance, loop membership, memory or liveness state, and phi predecessor agreement.
14. Compare incremental analysis updates with independent full recomputation. Preserve the mutation
    that first separates them and report whether the defect is in the updater, invalidation, full
    analysis, or comparison model.
15. Check canonicalization idempotence and preservation declarations separately from final output.
    If repeated application is intentionally non-idempotent, document the convergence or bounded
    opportunity contract. A stale preserved analysis can corrupt a later pass even when the current
    pass output looks correct.
16. Test poison, undefined, and deferred-choice semantics as propagation paths, not isolated
    operations. Vary control flow, memory address, stored value, vector lane, selected and
    unselected branches, duplication, and the operation that fixes a nondeterministic choice.
17. For borrow, ownership, or dataflow checking, compare underlying facts by loan, region, location,
    program point, move, drop, suspension, or lattice state. Use meaning-preserving source or IR
    transforms and independent implementations or full recomputation when available.
18. Treat diagnostics as structured outputs. Verify stable diagnostic identity, severity, primary
    and related spans, note graph, arguments, fix-it edits, and recovery provenance before rendered
    text snapshots.
19. Keep coordinate systems explicit. Test byte offsets, scalar indices, grapheme and display
    columns, tabs, combining marks, wide characters, line endings, BOM, absent final newline,
    token-end semantics, macro spelling and expansion, includes, generated paths, and remapping.
20. Verify recovery by surviving structure and bounded cascades. Mutate one token or rule at a time,
    require progress, retain later valid declarations where the language contract allows it, prevent
    recovery nodes from reaching unsafe semantic or codegen paths, and apply fix-its as edit
    transactions followed by re-analysis and an idempotence check.
21. Separate compile, assemble, link, load, and run. Preserve each artifact and classify which stage
    first violates its contract. For cross-target work, distinguish host-side object validation from
    emulator, remote runner, or real-target execution evidence.
22. Test ABI across independent producers and consumers. Reverse caller and callee compiler or
    version roles, use hand-authored boundary probes where appropriate, and compare runtime layout,
    compiler layout data, debug metadata, and binary-compatibility evidence without assuming one
    shared implementation is an oracle.
23. Inspect object contracts structurally. Check symbols, bindings, visibility, sections, groups,
    relocations, addends, unwind, debug types, thread-local storage, and target metadata. Whole-file
    byte equality and disassembly text alone are weak oracles.
24. Localize code generation through machine-stage artifacts. Verify after legalization,
    instruction selection, register allocation, frame and prologue or epilogue construction, and
    final emission where the backend exposes those boundaries.
25. Differentially execute defined inputs across independent compiler lineages, optimization and
    pass-option lattices, interpreter, baseline, optimizing, JIT or AOT tiers, compiler revisions,
    backend paths, and target modes only after normalizing legitimate differences. Compare a
    canonical outcome containing terminal class, value or state fingerprint, effects, diagnostics,
    and applicable object or ABI observations across several runtime input vectors. Record shared
    frontend, IR, optimizer, backend, assembler, linker, runtime, or numeric-library ancestry. Use an
    independent interpreter, specification model, translation validator, executable property, or
    reference implementation; do not use majority vote as semantic authority.
26. Model linker resolution as a small graph. Permute object and archive order where the contract
    permits, inspect selected definitions and map evidence, test strong, weak, hidden, versioned,
    grouped, and deduplicated symbols, and isolate whole-program optimization from native linking.
27. Test code-size and relocation boundaries around the exact threshold. Generate just-inside and
    just-outside cases for branch reach, alignment, thunking, relaxation, code models, section
    collection, and identical-code folding. Preserve the formula and target parameters that define
    the boundary.
28. Classify regressions by earliest failing stage and invariant, not only crash stack. Feed minimized
    artifacts back to the matching parser, optimizer, verifier, backend, assembler, object, linker,
    diagnostic, or ABI suite. Perturb hash seed, worker count, schedule, path shape, locale, timezone,
    file order, and cache state when testing determinism. Allocate fast stage checks and minimized
    regressions to change gates, broader feature and option matrices to periodic lanes, and real-
    project shadow compilation and target evidence to canary or release lanes under repository-owned
    budgets.
29. Define executable properties and metamorphic relations at each stage. Preserve round-trip,
    alpha-renaming, trivia, independent reorder, dead-code, extraction or inlining, algebraic,
    canonicalization, analysis-recomputation, reproducibility, and refinement laws only under named
    side conditions. Store transform identity, location, preconditions, expected relation, and
    compared observations as a relation graph, and shrink the minimal failing relation path without
    breaking its certificate.
30. Apply `fuzz-harness-review` when campaign determinism, coverage feedback, corpus, mutator,
    sanitizer, minimization infrastructure, or CI cadence is also in scope. Keep this skill as owner
    of compiler-specific semantics, stage boundaries, and oracles.
31. Define each IR layer as a semantic contract. Name the information and observations it preserves,
    the invariants its verifier enforces, the analyses and transforms it serves, the information its
    lowering destroys, and the source or symbol identity it must retain. Add a layer only when one
    representation cannot satisfy conflicting consumer invariants without mode flags or invalid
    states.
32. Review the pass pipeline as a contract graph. Place canonicalization before its consumers,
    preserve high-level meaning until its last consumer, order scalar, loop, target, instrumentation,
    and cleanup stages by their preconditions and information needs, invalidate stale analyses as
    part of each mutation transaction, and bound cleanup or fixed-point cycles by change and cost.
33. Track compiler facts as proof-carrying state with explicit lifetimes. Record where a type,
    ownership, alias, provenance, alignment, range, effect, capture, or dataflow fact came from; which
    scope, allocation epoch, and IR generation it covers; whether it is proven, assumed, unknown, or
    contradicted; which transforms preserve, recompute, weaken, or drop it; and which consumers may
    use it for deletion, motion, speculation, or lowering. Default stale or unsupported facts to
    unavailable rather than copying them onto a changed value.
34. Treat the final link as selection, reachability, relocation, and loader preparation rather than a
    bag of filenames. Reconstruct the actual ordered inputs after driver expansion; distinguish the
    full object symbol namespace from the loader-visible dynamic namespace; trace why each archive
    member and section was retained or discarded; bind every relocation to its selected definition;
    and compare the final exports and direct dependencies with explicit allowlists. Keep ELF,
    PE/COFF, and Mach-O symbol, archive, import, visibility, interposition, and loader rules as named
    platform contracts instead of pretending one format's vocabulary is portable.
35. Treat debug and crash artifacts as an immutable derivative graph of the exact final linked image.
    Separate loader-visible names, regular symbols, public names, line tables, full debug data, unwind,
    source bundles, and link provenance; bind every architecture slice to its platform-native binary
    identity; derive stripped and separated-debug artifacts from the same lineage; preserve precise-PC,
    return-address, load-address, and inline semantics in crash capture; and prove remote retrieval with
    a known-address canary. Track translation-unit DCE, LTO internalization, archive extraction,
    section collection, ICF, and stripping as distinct deletion or aliasing stages.

<!-- mustflow-section: postconditions -->
## Postconditions

- The reproduction universe, definedness boundary, exact defect class, and normalized oracle are
  explicit.
- The last known-good and first known-bad stage are identified or the missing isolation evidence is
  reported.
- Reduction preserves the original predicate across source, IR or MIR, input, flags, target,
  pipeline, link, environment, and probability axes that matter.
- Verifier, analysis, CFG, SSA, borrow, dataflow, diagnostics, source mapping, ABI, object, codegen,
  assembler, linker, and runtime claims are backed only by the evidence layers actually exercised.
- Regression artifacts are assigned to the earliest owning stage with stable invariants and
  directly synchronized tests, docs, or templates where applicable.
- Test lanes separate oracle classes, corpus purposes, feature interactions, transformation
  activation, definedness, implementation lineage, determinism, cadence, and evidence cost.
- Generated and metamorphic cases preserve their semantic environment, side conditions, stable
  property or divergence identity, relation graph, and structure-aware reduction contract.
- IR layers have explicit semantic, effect, identity, verifier, legality, serialization, lowering,
  canonical-form, and target-entry contracts.
- CFG and SSA mutations preserve edge-sensitive phi semantics, analysis currency, exceptional
  control flow, and a valid parallel-copy plan where SSA is destroyed.
- Pass order is justified by producer and consumer contracts, preserved information, analysis
  invalidation, profitability budgets, target constraints, instrumentation, and interaction evidence.
- Ownership, borrow, lifetime, alias, provenance, effect, capture, layout, and dataflow facts have
  explicit origin, scope, epoch, generation, status, transition, verifier, consumer, and reproof rules.
- Link evidence explains input order, archive extraction, section reachability, selected definitions,
  relocation targets, loader-visible symbols, direct dependencies, and exported ABI under the named
  object-format and platform contract.
- Debug evidence identifies each symbol asset, final binary and architecture key, artifact lineage,
  crash-address semantics, source bundle, access and retention policy, optimization limitations, and
  external symbolication canary without substituting a rebuild or filename match.

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

Prefer narrow configured compiler-stage, reducer-predicate, verifier, diagnostic, ABI, object,
cross-target, linker, debug-artifact, symbolication, property, generator, determinism, and regression intents when the selected
repository exposes them. Do not invent raw compiler, emulator, remote-runner, fuzzing, shadow-
compile, or reducer commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the source or IR meaning is undefined, unspecified, target-dependent, or disputed, retain the
  artifact as a specification discrepancy until the relevant contract is resolved.
- If reduction changes the defect class or first failing stage, reject that candidate and restore
  the last predicate-preserving artifact.
- If translation validation or an independent compiler disagrees outside its supported model, report
  the limitation instead of selecting a winner by vote.
- If stage artifacts cannot be produced, report the broadest proven boundary and the missing dump or
  configured intent rather than guessing the failing pass.
- If a cross-target executable cannot run, distinguish host-side IR, object, and link evidence from
  unverified target runtime behavior.
- If a diagnostic snapshot differs, inspect structured identity, spans, note graph, recovery, and
  normalization before accepting or replacing the snapshot.
- If a test passes only because its generator rarely reaches the target transform, separate
  generation validity from activation coverage and add a directly observable trigger oracle.
- If a metamorphic relation lacks proven side conditions or a differential set shares one semantic
  implementation, downgrade the result to a discrepancy signal until independent authority exists.
- If periodic, canary, real-project, or cross-target execution is unconfigured, report that evidence
  lane separately instead of moving its unbounded work into a change gate.
- If required compiler, reducer, sanitizer, emulator, remote, or linker execution is unconfigured,
  stop at source review, fixtures, and a manual evidence plan.

<!-- mustflow-section: output-format -->
## Output Format

- Compiler claim, expected semantics, defect class, and exact oracle
- Reproduction universe and definedness decision
- Pipeline boundaries, last good stage, first bad stage, and pass trace
- Source, IR or MIR, input, option, target, link, environment, and probability reduction result
- Verifier, analysis-preservation, CFG, SSA, borrow, dataflow, and translation-validation evidence
- IR layer, lowering, effect, identity, canonical-form, phi, edge, and pass-pipeline evidence
- Ownership-token, borrow-flow, lifetime, provenance, fact-generation, metadata-transition, staged-
  verifier, and semantic-refinement evidence
- Diagnostic structure, source mapping, recovery, fix-it, and determinism evidence
- ABI, layout, unwind, object, symbol-table, archive-selection, section-reachability, relocation,
  visibility, export/import, static/dynamic resolution, linker, binary-compatibility, and target evidence
- Runtime/public/debug/unwind/source symbol assets, binary identity, stripping, DCE, ICF, LTO,
  crash-capture, symbol-store, source-retrieval, and symbolication-canary evidence
- Regression artifacts and earliest-stage classification
- Test ladder, oracle classes, feature-interaction grid, corpus ownership, activation coverage,
  determinism perturbations, and change-gate, periodic, canary, or release lane decisions
- Differential lineage, option and tier lattice, canonical outcome, input-vector, property,
  metamorphic-relation, generator, shrinker, relation-graph, and replay evidence
- Files changed
- Configured command intents run
- Missing or skipped compiler, target, reducer, fuzz, and validation evidence
- Remaining semantic, stage-isolation, undefinedness, oracle, generator, corpus, determinism,
  diagnostic, ABI, or cross-target risk
