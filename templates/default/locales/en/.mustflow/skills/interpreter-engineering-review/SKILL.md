---
mustflow_doc: skill.interpreter-engineering-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: interpreter-engineering-review
description: Apply this skill when an AST interpreter, bytecode compiler or VM, evaluator, rule engine, scripting runtime, template expression engine, REPL, typed executable IR, runtime value or operator model, closure and scope resolver, nonlocal control flow, structured guest diagnostic, garbage collector or VM object lifetime, native-function boundary, deterministic execution service, semantic oracle, sandbox budget, bytecode cache, inline cache, interpreter performance path, or interpreter-semantics claim is created, changed, reviewed, debugged, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.interpreter-engineering-review
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

# Interpreter Engineering Review

<!-- mustflow-section: purpose -->
## Purpose

Review an interpreter as an explicit language-semantics and runtime system, not as a parser plus a
recursive visitor. Prevent host-language behavior, object representation, exception handling,
environment lookup, iteration order, time, randomness, native calls, or resource exhaustion from
silently becoming the guest-language specification.

Keep syntax, semantic types, runtime kinds, storage representations, name resolution, executable
representation, operator dispatch, runtime values, control completion, frames and closures, source
provenance, structured guest diagnostics, engine defects, object reachability, host capabilities,
deterministic services, budgets, test oracles, caching, and performance evidence as separate contracts.

<!-- mustflow-section: use-when -->
## Use When

- An AST evaluator, bytecode compiler, stack or register VM, rule engine, expression evaluator,
  embedded scripting language, REPL, template expression engine, or policy runtime changes.
- Guest-language value, equality, identity, coercion, hashing, iteration, numeric, overflow,
  evaluation-order, scope, closure, module, exception, or control-flow semantics are implemented.
- Name resolution, local or global slots, upvalues, environment chains, captured cells, module
  bindings, frame layout, generators, coroutines, suspension, or resumption is in scope.
- Source locations, stack traces, breakpoints, stepping, coverage, profiling, hot reload, diagnostic
  origin, or bytecode source maps need review.
- Native functions, host objects, reentrancy, threads, asynchronous completion, cancellation,
  capabilities, sandboxing, or guest-to-host value conversion cross the runtime boundary.
- Determinism, instruction or allocation budgets, recursion limits, output limits, runtime caches,
  dispatch, boxing, inline caches, superinstructions, specialization, GC pressure, or interpreter
  performance claims need evidence.
- Root discovery, allocation safepoints, write barriers, moving handles, remembered sets, weak
  containers, ephemerons, finalizers, reference-count reentrancy, heap verification, or GC stress is
  part of an interpreter runtime change.
- Structured runtime diagnostics, taint from recovered syntax, safe value rendering, logical guest
  stacks, fix-it validation, stable error codes, fingerprints, semantic properties, metamorphic
  relations, reference evaluators, or canonical differential outcomes are in scope.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Only tokenization, grammar, CST or AST construction, parser recovery, incremental parsing, or
  parser resource limits change; use `parser-engineering-review`.
- Only compiler optimization, IR or MIR passes, verifier, code generation, object format, ABI, or
  linker behavior changes; use `compiler-engineering-review`.
- Only fuzz campaign, corpus, mutator, instrumentation, sanitizer, or CI lifecycle changes; use
  `fuzz-harness-review`.
- Only general application, API, CLI, provider, queue, or validation error text changes without a
  guest-language diagnostic pipeline; use `error-message-integrity-review`.
- Only generic application resource cleanup, listener, stream, task, cache, or retained-reference
  lifetime changes without a VM heap or guest object model; use `memory-lifetime-review`.
- Only the host platform runtime, package runtime version, container, JVM, Python, or JavaScript
  deployment environment changes without guest-language semantics; use the matching runtime skill.
- Only one application function interprets an ordinary data field with no language or execution
  model; use the narrower domain skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Guest-language semantic contract: value domains, numeric and overflow rules, equality and
  identity, coercions, truthiness, hashing, collection and property order, missing-name behavior,
  evaluation order, module and exception rules, and specified nondeterminism.
- Pipeline from source through tokens and syntax, name resolution, semantic validation, executable
  AST or IR, bytecode compilation where applicable, execution, host calls, and observable results.
- Runtime `Value` representation, ownership and mutability, object identity, hashability, interning,
  boxing, host conversion, GC roots, handles, and lifetime rules.
- Separation between semantic types, runtime value kinds, and storage tags; purpose-specific
  conversion graph; operator evaluation and fallback algorithms; `Place` or assignment-target
  model; typed executable annotations; internal sentinel taxonomy; and FFI or serialization form.
- Resolver output: binding kind, slot or cell index, declaration and initialization state,
  shadowing, imports, free variables, captures, frame layout, upvalue reuse and closure lifetime.
- Completion model for normal value, return, break, continue, throw, yield, suspend, cancel, and
  resource-limit termination plus handler and cleanup behavior.
- Source provenance across tokens, syntax, lowered nodes, bytecode instructions, frames, stack
  traces, debugger locations, generated code, and cached artifacts.
- Guest exception, type or name failure, native failure, cancellation, policy denial, resource
  exhaustion, and engine-defect classifications plus their host and guest stack policies.
- Diagnostic contract: stable code, phase, primary and related source ranges, causes, suppression,
  notes, help, validated fixes, logical guest frames, safe value rendering, fingerprint, audience,
  redaction, and recovered-node provenance.
- Heap contract: roots, safepoints, allocation and publication phases, open and closed upvalues,
  write barriers, moving handles or pins, generations and remembered sets, weak or ephemeron
  semantics, finalization, resurrection, external resources, shutdown, and verifier or stress modes.
- Native boundary: capability set, value marshalling, host handles, reentrancy, thread ownership,
  async completion, cancellation, exception translation, lifetime, and accounting.
- Deterministic services for time, randomness, locale, paths, environment, iteration order, floating
  point, I/O, scheduling, and externally visible host state.
- Execution budgets for instructions or nodes, calls, recursion, allocation, containers, strings,
  output, regex or native work, wall time, cancellation, and cleanup reserve.
- Engine selection and performance evidence: semantic-change rate, execution frequency, startup and
  cache behavior, instruction representation, dispatch counts, lookup counts, allocation and GC,
  native-call cost, cache hit rates, profiles, and benchmark workload validity.
- Oracle contract: valid and invalid input lanes, semantic generator environment, canonical outcome,
  independent reference or model, definedness filter, metamorphic relations, executable properties,
  structure-aware reduction predicate, semantic coverage, replay capsule, and failure taxonomy.
- Configured command intents for the selected repository.

Read [Interpreter Semantics and Runtime Checklist](references/interpreter-semantics-runtime-checklist.md)
when guest values, evaluation, control flow, source provenance, failures, native calls, determinism,
or sandbox budgets are in scope.

Read [Interpreter Execution, Closures, and Performance Checklist](references/interpreter-execution-closure-performance-checklist.md)
when choosing AST execution or bytecode, compiling or caching bytecode, resolving bindings, laying
out frames, implementing upvalues or modules, debugging, profiling, or optimizing the runtime.

Read [Interpreter Diagnostics and Recovery Checklist](references/interpreter-diagnostics-recovery-checklist.md)
when structured guest diagnostics, recovered syntax provenance, safe value rendering, logical stack
traces, error codes, fingerprints, or fix-it behavior is in scope.

Read [Interpreter GC and Verification Checklist](references/interpreter-gc-verification-checklist.md)
when VM roots, safepoints, barriers, moving objects, weak containers, finalizers, external resources,
heap stress, semantic properties, differential or metamorphic oracles, or reduction is in scope.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the exclusions.
- The guest-language semantic authority is identified, or disputed cases are preserved as explicit
  language-design decisions rather than inherited from the host implementation.
- The selected repository instructions and command contract have been checked.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update semantic definitions, resolver and binding metadata, executable AST or IR, bytecode,
  runtime values, frames, closures, completion handling, source maps, structured guest diagnostics,
  VM root and barrier APIs, native adapters, deterministic services, budgets, semantic oracles,
  caches, debugger or profiler hooks, tests, and directly synchronized docs or templates.
- Add differential AST-versus-bytecode fixtures, meaning-preserving transformations, native-boundary
  denial cases, deterministic replay, budget exhaustion, closure lifetime, debugger, cache
  invalidation, and workload-based performance evidence.
- Do not make parser nodes mutate runtime environments directly, expose raw VM stacks or runtime
  internals to native code, or use host behavior as an undocumented fallback for guest semantics.
- Do not optimize by weakening source provenance, guest-versus-engine fault separation, capability
  checks, deterministic inputs, resource accounting, or observable evaluation order.

<!-- mustflow-section: procedure -->
## Procedure

1. Freeze semantics before implementation mechanics. Build an executable matrix for values,
   operators, evaluation order, calls, assignment targets, collections, property access, missing
   names, modules, exceptions, overflow, iteration, and host interaction. Mark unspecified behavior
   deliberately; do not let host defaults decide it accidentally.
2. Map the real execution pipeline. Separate parse output, resolver and semantic annotations,
   executable representation, optional bytecode lowering, runtime execution, native adapters,
   debugging and source maps, caches, and external observations. Do not execute a raw parser AST when
   downstream tools need a stable normalized representation.
3. Separate semantic type, runtime kind, and storage tag, then define one runtime value model.
   Centralize payloads, mutability, value equality, object identity, numeric distinctions, hashing,
   key eligibility, strings, functions, handles, sentinels, host conversion, and canonical
   serialization. Compact tagging, NaN boxing, pointer tagging, and unboxing are replaceable storage
   choices, not guest types or public ABI.
4. Resolve names before hot execution where the language permits it. Annotate each reference and
   assignment as local, captured, module, global, builtin, dynamic, or another explicit binding kind
   with a slot, cell, or symbol identity. Keep declaration, initialization, and access states
   separate.
5. Keep lexical scope distinct from the call stack. A closure captures the environment of
   definition, not the caller. Compute free variables, capture only required cells, deduplicate
   captures of one binding, and preserve shared mutation semantics.
6. Model frame and upvalue lifetime. Keep uncaptured locals in frame slots; when supported, let open
   upvalues reference live slots and close them into heap cells when the frame exits. Close every
   captured slot exactly once across return, throw, cancellation, generator suspension, and cleanup.
7. Unify nonlocal completion. Represent normal, return, break, continue, throw, yield, suspend,
   cancel, and budget termination through one explicit completion protocol. Lower it differently in
   bytecode if needed, but keep handler search, `finally` or cleanup, and propagation semantics equal
   across engines.
8. Make conversion, operator dispatch, assignment places, and evaluation order visible. Use
   purpose-specific directed conversions instead of one universal coercion. Define operator
   algorithms with `Handled`, `Declined`, and `Thrown`-equivalent outcomes so fallback cannot swallow
   user failures. Resolve compound assignment targets once as a `Place`, then load, operate, and
   store. Carry selected conversions, operator, effects, span, and proof identity into typed or
   executable IR instead of re-resolving semantics in each engine.
9. Preserve source provenance from input to execution. Carry source snapshot identity and half-open
   byte ranges through recovered or synthetic syntax, normalized nodes, typed IR, lowered
   instructions, cached code, frames, guest stacks, debugger stepping, coverage, profiling, and hot
   reload. Generated instructions need an explicit primary, related, synthetic, or origin-chain policy.
10. Build diagnostics as structured data and separate fault domains. Preserve stable codes, phases,
    primary and related spans, causes, suppression, help, validated fixes, logical frames, and safe
    fingerprints independently from CLI, IDE, log, or test rendering. Guest throw, guest semantic
    error, native failure, capability denial, cancellation, resource limit, and engine defect need
    distinct representations. Diagnostic rendering must not call guest conversion, getters,
    iterators, proxies, or representation hooks.
11. Harden the native boundary. Define conversion, ownership, rooting or handle policy, capability,
    reentrancy, thread affinity, asynchronous completion, cancellation, callback lifetime, error
    translation, and cost accounting. Native code receives the smallest capability surface, not the
    whole runtime or unrestricted host objects.
12. Inject deterministic host services. Route time, randomness, locale, paths, environment, I/O,
    map iteration, floating-point context, and scheduling through an execution context with a named
    deterministic or explicitly nondeterministic policy. Record inputs needed for replay.
13. Enforce multi-dimensional budgets. Charge instruction or node work, calls, recursion,
    allocations, container growth, string output, regex or pattern work, native calls, I/O, and
    diagnostics. Check before or during expensive work, preserve cleanup reserve, and distinguish
    guest limit termination from host timeout or engine crash.
14. Select AST execution or bytecode from workload and semantic maturity. Prefer AST execution for
    rapidly changing semantics and low-reuse short programs. Prefer bytecode when stable semantics,
    repeated execution, explicit suspension, debugger control, compact code, or predictable
    accounting justify the compile and maintenance cost. Do not treat either as a religion.
15. If both engines exist, keep one semantic test corpus and differentially execute them. Normalize
    representation-only differences, compare values, mutations, completion, errors, source
    locations, budgets, and host effects, and use the language contract rather than engine majority
    as authority.
16. Design bytecode as a runtime representation, not serialized AST objects. Resolve names to slots
    or cells, use compact instructions and constant pools, define operand widths and verification,
    keep source maps, and specify control, exception, suspension, and stack or register invariants.
17. Version compiled artifacts. Bind caches to source content, language and semantic version,
    compiler and bytecode schema, options, native API or symbol version, target/runtime assumptions,
    and source-map format. Verify before loading and fall back safely on mismatch; do not execute
    stale cached code because the path remained the same.
18. Treat modules as live or copied bindings by specification. Resolve import and export cells,
    initialization order, cycles, namespace identity, read-only rules, cache identity, unload or hot
    reload behavior, and closure or native references that retain module state.
19. Optimize from profiles, not folklore. Measure dispatch, binding lookup, property lookup,
    allocation, GC, native crossing, source mapping, cache load, parse and resolve, and actual
    workload time. Fix repeated name lookup, needless boxing and temporary allocation, poor data
    locality, and chatty native boundaries before speculative JIT work.
20. Add caches with explicit guards and invalidation. Inline caches bind operation sites to observed
    value or object shapes, relevant metaobject epochs, native symbol generations, and fallback.
    Compiled-code caches bind all semantic inputs. Intern only bounded domains such as identifiers or
    selected constants; untrusted strings must not become immortal by default.
21. Make object liveness and movement explicit. Expose roots and handle scopes as runtime APIs;
    enumerate every allocating safepoint; construct objects as allocate, initialize, track, then
    publish; and route every guest-reference store, bulk copy, resize, capture, native write, and
    deserialization path through the collector's barrier. Raw addresses must not survive a moving
    safepoint unless the object is correctly pinned.
22. Define weak, finalization, reference-count, and external-resource semantics. Ephemerons may need
    fixed-point marking; finalizers are adversarial callbacks that may throw or resurrect; releasing
    the last reference may reenter guest code; and files, sockets, buffers, or thread-affine handles
    need deterministic close independent of GC. Stage shutdown and make cleanup idempotent.
23. Preserve control and budget semantics while optimizing. Superinstructions, specialization,
    inline caches, unboxing, tail calls, or JIT tiers must not change evaluation order, guest stack
    traces, completion, exception handlers, source stepping, capability checks, or work accounting.
24. Build a semantic oracle matrix. Cover positive and negative values, numeric boundaries,
    conversions, operator decline versus throw, assignment places, equality and hash laws,
    structured diagnostics, shadowing, initialization,
    recursion, capture and mutation, loop capture, nested completion, throw and cleanup, native
    reentrancy, async resume, deterministic services, every budget dimension, cache invalidation,
    AST versus bytecode differential behavior, GC schedule invariance, heap stress, and adversarial
    resource shapes. Normalize outcomes before comparison, exclude unspecified semantics, prefer an
    independent reference or executable law, and preserve the exact failure fingerprint during
    structure-aware reduction.
25. Apply `fuzz-harness-review` when harness determinism, coverage feedback, corpus, mutator,
    sanitizer, minimization, or campaign lifecycle is in scope. Keep this skill as owner of guest
    semantics, runtime invariants, and oracle design.

<!-- mustflow-section: postconditions -->
## Postconditions

- Guest semantics, semantic types, runtime kinds, storage tags, conversions, operator dispatch,
  assignment places, unspecified behavior, evaluation order, value model, binding model, completion,
  source provenance, structured diagnostics, and fault classes are explicit.
- AST, resolver, executable representation, bytecode, runtime, native, cache, debugger, and host
  service boundaries are separated or their current coupling is reported.
- Closures capture the declared lexical bindings with observable lifetime and shared-mutation
  evidence; module and debugger retention is bounded or reported.
- Determinism and each resource budget have named injected inputs, charge points, terminal behavior,
  and replay or test evidence.
- Root, safepoint, barrier, weak-container, finalization, external-resource, heap-verifier, and
  semantic-oracle rules are explicit or their missing evidence is reported.
- Performance changes preserve semantics, security, source mapping, completion, and accounting and
  are tied to profiles that include the real workload and native boundary.

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

Prefer narrow configured semantic, resolver, bytecode-verifier, AST-versus-bytecode differential,
closure, native-boundary, deterministic replay, budget, cache, debugger, memory, and benchmark
intents when exposed by the selected repository. Do not invent raw runtime or long-running commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a semantic rule is unspecified, preserve it as an explicit design decision and avoid baking in
  the current host behavior until authority is chosen.
- If AST and bytecode engines disagree, inspect normalized representation and the first semantic
  divergence; do not select the majority or faster engine as correct.
- If guest and engine failures are conflated, restore fault classification before improving messages
  or adding recovery.
- If diagnostic rendering can execute guest code, replace it with a bounded non-reentrant renderer
  before trusting runtime error evidence.
- If a collector path lacks a root, handle, barrier, or weak-container invariant, stop at the first
  missing liveness rule instead of tuning GC thresholds or adding finalizers.
- If a differential failure uses unspecified behavior or a reducer changes its failure identity,
  reject that oracle result and repair the generator, normalization, or predicate.
- If native ownership, reentrancy, thread, cancellation, capability, or accounting is unknown, deny
  or isolate the call path rather than exposing the full runtime.
- If a budget can be checked only after expensive work completes, report the sandbox gap and move
  the charge or preflight boundary before claiming containment.
- If a performance change lacks a representative profile, preserve the simpler correct design and
  report the unproven optimization opportunity.
- If interpreter execution is unconfigured or long-running, stop at code review, bounded fixtures,
  and a manual evidence plan.

<!-- mustflow-section: output-format -->
## Output Format

- Guest semantics, semantic/runtime/storage separation, conversion and operator protocol, assignment
  places, sentinels, value model, and evaluation order
- Pipeline, resolver, binding, frame, closure, module, and completion decisions
- AST versus bytecode choice, differential evidence, bytecode invariants, and cache versioning
- Source mapping, guest stack, debugger, coverage, profiling, and hot-reload evidence
- Guest, native, cancellation, resource-limit, and engine fault classification
- Structured diagnostic, recovery provenance, safe rendering, logical stack, code, fingerprint, and
  fix-it evidence
- Native capability, conversion, lifetime, reentrancy, thread, async, cancellation, and accounting
- Deterministic services and multi-dimensional budgets
- Lookup, dispatch, allocation, GC, cache, native-boundary, and workload profile evidence
- Root, safepoint, barrier, moving handle, weak or ephemeron, finalizer, external-resource, heap
  stress, canonical outcome, property, metamorphic, differential, and reduction evidence
- Files changed
- Configured command intents run
- Missing or skipped runtime, differential, budget, fuzz, and performance evidence
- Remaining semantic, diagnostic, closure, native-boundary, sandbox, determinism, GC, oracle,
  memory, or performance risk
