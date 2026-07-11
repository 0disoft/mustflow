---
mustflow_doc: skill.ada-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: ada-code-change
description: Apply this skill when Ada or SPARK source, GNAT project metadata, Alire packages, strong domain types, subtypes, predicates, contracts, representation clauses, unchecked or foreign boundaries, tasking, protected objects, rendezvous, Ravenscar or Jorvik profiles, GNATprove evidence, tests, or Ada deployment behavior are created, changed, reviewed, migrated, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.ada-code-change
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Ada Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Ada language-version, type, range, contract, representation, ownership, concurrency,
real-time, proof, foreign-interface, build, and deployment contracts. Keep Ada compile-time checks,
runtime checks, GNAT implementation features, and SPARK flow analysis or proof as distinct claims.

<!-- mustflow-section: use-when -->
## Use When

- Ada or SPARK source, package specifications or bodies, generics, tasking, protected objects,
  contracts, representation clauses, FFI, tests, or generated bindings change.
- GNAT project files, compiler modes, runtime profiles, Alire metadata, binder or linker behavior,
  assertion policy, check suppression, GNATprove configuration, or target deployment changes.
- Ada 2022 migration, Ravenscar or Jorvik adoption, parallel constructs, real-time scheduling,
  storage pools, interrupt handling, or certification evidence is reviewed or changed.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The changed surface is only C or C++ and no Ada-owned contract or binding changes.
- The task asks only for the latest Ada, GNAT, SPARK, or Alire version; use source-freshness
  guidance unless durable source or documentation changes too.
- A formal certification, WCET, schedulability, or hardware-layout claim is requested without the
  project evidence and qualified toolchain needed to establish that claim.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Language mode, compiler and runtime identity, target, GNAT project files, Alire metadata,
  assertion and runtime-check policies, build profiles, binder or linker inputs, and CI image.
- Public package specifications, private representations, domain types and subtypes, array bounds,
  predicates, contracts, generics, elaboration order, exceptions, and compatibility surface.
- SPARK boundary, GNATprove mode and level, proof assumptions, justified checks, unproved checks,
  flow dependencies, loop invariants, ownership model, and retained runtime checks.
- Representation and unsafe ledger: `Size`, alignment, component size, bit order, endianness,
  overlays, address clauses, unchecked conversion, imported C types, raw bytes, and validity checks.
- Concurrency ledger: tasks, masters, activation, entries, barriers, queues, rendezvous, requeue,
  protected objects, priorities, ceilings, interrupts, shutdown, deadlines, and blocking operations.
- Resource ledger: stack, heap, storage pools, allocation bounds, big-number use, finalization,
  primary and secondary stacks, implicit allocation, elaboration, timing, WCET, blocking, worker
  mapping, memory layout, MMIO, interrupt behavior, and observability.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read current source, project files, compiler diagnostics, proof configuration, tests, target
  runtime, and deployment evidence before changing a language, proof, or runtime contract.
- Refresh official Ada Reference Manual, Ada Issue, GNAT, SPARK, Alire, and target-runtime sources
  before preserving exact feature, default, restriction, support, or tool-option claims.
- Treat version research as dated evidence. The official-source snapshot reviewed on 2026-07-11
  identified Ada 2022, published as ISO/IEC 8652:2023, as the latest issued standard and Amendment 1
  as draft work; recheck before reuse. A GNAT Ada 2022 mode and GNAT extension mode are not equivalent.
- Do not infer absence of runtime errors from Ada compilation alone. Dynamic overflow, range,
  index, length, division, discriminant, null, predicate, and contract failures remain runtime
  checks unless the selected SPARK proof or other evidence discharges them.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Make focused Ada, SPARK, project, package, binding, representation, runtime, test, proof, and docs
  changes required by the task.
- Add domain types, subtypes, private constructors, contracts, flow dependencies, loop invariants,
  bounded storage, protected operations, adapters, or tests where they protect changed behavior.
- Preserve target, language mode, runtime profile, public package contracts, proof boundary, and
  certification constraints unless migration is explicit.
- Do not silence diagnostics, add assumptions, suppress checks, weaken proof levels, or enable GNAT
  extensions merely to make a build or proof report pass.

<!-- mustflow-section: procedure -->
## Procedure

1. **Establish the compilation and evidence identity.**
   - Record the Ada language mode, compiler and version, target, runtime library, build profile,
     project closure, Alire solution, assertion policy, check policy, SPARK boundary, and proof mode.
   - Separate standard Ada, implementation-defined behavior, GNAT extensions, SPARK annotations,
     and target-specific runtime behavior. Do not treat an extension switch as Ada 2022 conformance.
   - Classify each safety statement as compile-time rejection, enabled runtime check, flow-analysis
     result, proved verification condition, test evidence, or external assumption.
2. **Make illegal domain combinations hard to express.**
   - Use a new `type` when values have different meaning or must not mix implicitly. Use a `subtype`
     for a constrained view of the same meaning; subtypes cannot distinguish overloads.
   - Give indexes, counts, capacities, offsets, identifiers, units, and protocol fields distinct
     types when accidental interchange is invalid. Keep the domain base type wide enough for valid
     intermediate calculations and narrow values deliberately at boundaries.
   - Seal stateful records behind private discriminated types, constructors, and state transitions.
     Use complete case analysis and prove discriminant checks where dynamic access remains.
   - Use static or dynamic predicates for their actual check points. A predicate is not a continuous
     watcher, and a dynamic predicate on a mutable public record is not a lifetime invariant.
3. **Handle arithmetic, arrays, and representation explicitly.**
   - Distinguish subtype range from base range and intermediate-expression range. Widen operands
     before arithmetic when needed, then narrow once; a range does not provide saturating arithmetic.
   - Use modular types only where wraparound is the domain rule. Keep money, counts, lengths, and
     physical values on checked integer or fixed-point types unless wraparound is explicit.
   - Iterate arrays with their actual ranges and account for arbitrary lower bounds and null ranges.
     A constrained target may preserve length while rebasing bounds, so validate source bounds when
     the index origin is part of a protocol.
   - Do not infer object storage, wire layout, register layout, alignment, bit order, or endianness
     from a scalar range. Specify and verify representation at boundaries.
4. **Turn contracts into checked or proved obligations.**
   - Use preconditions, postconditions, type invariants, contract cases, default initialization,
     `Global`, `Depends`, `Initializes`, and `Initial_Condition` according to the owned boundary.
   - Keep contract expressions free of their own overflow or invalid access. Use wider mathematical
     models or short-circuit formulations when the expression being checked could fail first.
   - Add loop invariants that preserve index, capacity, ordering, and initialized-region facts, plus
     loop variants when termination is part of the claim. Split loops whose proof state becomes
     wider than the algorithm responsibility.
   - Make unresolved verification conditions fail the configured proof gate unless a bounded,
     reviewed external assumption or proof justification explicitly owns the gap.
5. **Keep ownership, allocation, and unsafe boundaries visible.**
   - An access type carries reachability and accessibility rules, not ownership. Treat `not null` as
     only a nullability contract; design owner, move, borrow, observe, lifetime, deallocation,
     aliasing, and storage-pool policy separately. Do not store a borrowed access parameter.
   - Pair allocation and destruction by origin. `Unchecked_Deallocation` is valid only for an object
     created through the matching Ada allocator and pool; nulling one access value does not revoke
     aliases, callbacks, containers, or foreign handles.
   - Prefer `Limited_Controlled` for unique resources. A copyable `Controlled` owner must define
     adjustment semantics, and finalization must not depend on arbitrary collection or component
     order. Use explicit dependency-ordered shutdown before finalization fallback.
   - Fully initialize allocated domain objects. `new T` does not imply zero-filled scalar fields,
     and validity checks at an external boundary do not excuse ordinary uninitialized state.
   - Bound allocation structurally when memory exhaustion is in scope; absence-of-runtime-error
     proof does not by itself exclude `Storage_Error`.
   - A custom storage pool controls only allocators attached to it. Verify size, alignment,
     synchronization, failure policy, allocation provenance, task creation, runtime allocation,
     secondary-stack use, and the selected target runtime. `Storage_Size` is not automatically an
     exact process-wide quota.
   - Isolate unchecked conversion, overlays, address clauses, imported objects, raw streams, and FFI
     in narrow packages. Parse bytes and endianness explicitly, validate scalar representations with
     validity checks, then construct private domain values.
   - Never treat suppressed failed checks as safe execution. Remove checks only for a bounded region
     whose relevant obligations have been proved and whose deployment policy permits removal.
6. **Design tasking around atomic business operations.**
   - Put read-decide-write rules inside one protected operation or entry. Atomic variables and
     separate protected calls do not make a multi-step invariant atomic.
   - Keep protected operations short, bounded, and nonblocking, including indirect calls. Keep entry
     barriers dependent on protected state rather than external globals or side effects.
   - Define queue ordering explicitly. FIFO within one entry queue does not establish total order
     across entries, and a queuing policy is not an implicit business-priority specification.
   - Keep rendezvous accept bodies small because caller and server remain coupled until completion.
     Treat timed entry calls as admission deadlines, not end-to-end completion deadlines.
   - Model task activation before executable statements, task exceptions, termination observation,
     master dependencies, explicit shutdown, queue draining, cancellation, and requeue semantics.
   - Derive ceiling priorities and lock order from the actual task and interrupt graph. Do not choose
     one arbitrarily high ceiling or assume race freedom proves deadlock freedom or schedulability.
7. **Engineer real-time predictability as a bounded-resource contract.**
   - Select and declare the runtime profile early. Ravenscar or Jorvik restricts available behavior;
     neither profile proves WCET, schedulability, bounded queues, memory use, or deadline success.
   - Drive periodic work from absolute releases and define what happens after a missed release:
     drop, coalesce, skip to a future period, catch up within a bound, or enter a safe state.
   - Base priorities and ceilings on period, deadline, WCET, and blocking analysis. Bound entry queue
     lengths, keep interrupt handlers to acknowledgement and bounded transfer, and move parsing,
     allocation, recovery, and long computation into budgeted tasks.
   - Enforce applicable allocation, recursion, elaboration, tasking, finalization, and secondary-stack
     restrictions. Analyze each task stack on deployment-optimized objects; dynamic calls, recursion,
     unknown external frames, and measured watermarks are not static upper bounds.
   - Include package elaboration in startup timing and make device initialization order and failure
     explicit. Partition multicore work to reduce interference, then account for shared cache, memory
     bus, DMA, and interrupt-controller contention on the real target.
   - For MMIO, separate address, import, volatility, atomicity, access width, read-modify-write,
     endianness, and initialization effects. Inspect generated access sequences when the device
     contract requires a specific bus transaction.
   - Compare optimization profiles by maximum execution time, deadline lateness, blocking, stack,
     code size, and target behavior. Higher optimization and disabled checks are not automatic wins.
8. **Keep the C and C++ boundary intentionally boring.**
   - Bind exact `Interfaces.C` ABI types, signedness, calling conventions, layout, and pass-by-copy
     rules. Treat generated bindings as a draft and compare size, alignment, offsets, bits, and enum
     values with a C-side probe built under the production ABI.
   - Pass arrays and strings as pointer plus explicit element or byte length. Define lower-bound
     rebasing, empty buffers, NUL termination, encoding, embedded NUL policy, and retention lifetime.
   - Receive foreign output into raw ABI types, validate representation and range, then construct Ada
     domain values. Do not let C write directly into constrained, discriminated, or narrow objects.
   - Keep allocation and deallocation in the same owning module. Represent owned and borrowed handles
     separately; unregister callbacks and drain in-flight calls before destroying their context.
   - Catch Ada and C++ exceptions inside their language wrappers and cross a stable C ABI with status,
     opaque handles, fixed scalars, and explicit error storage. Wrap C++ classes behind `extern "C"`.
   - If foreign code owns `main`, initialize the Ada runtime before any Ada entry and finalize it only
     after callbacks, handles, tasks, and foreign calls are stopped. Treat this as a one-way process
     lifecycle unless the selected GNAT runtime explicitly proves a different supported contract.
   - Avoid pointer type-punning through unchecked conversion. A successful unoptimized run does not
     establish alias validity under optimization; prefer field conversion or a C shim.
9. **Adopt Ada 2022 features by semantics, not novelty.**
   - For parallel loops and blocks, prove independent global effects and nonblocking execution;
     worker mapping, speedup, SIMD, and physical threads remain implementation and measurement issues.
   - Require associative reducers for parallel reduction. Floating-point addition is not associative;
     choose a deterministic tree, compensated method, fixed point, or exact model when reproducibility matters.
   - Treat delta aggregates as new-value construction and account for copying, adjustment, and
     finalization. Treat composite `'Image` as diagnostics, not a stable protocol or storage format.
   - Keep literal conversion functions deterministic, procedural iterators bounded, stable views
     distinct from thread safety, and big-number operations outside constant-time or bounded-time
     claims unless separately established.
   - Choose Ravenscar as a narrow analyzable tasking base when it meets requirements and widen to
     Jorvik or full tasking only for named semantics. A profile restriction is not a schedulability,
     WCET, race-freedom, or certification proof.
10. **Manage SPARK assurance and trust boundaries explicitly.**
   - Choose an assurance level per partition: language subset and flow analysis broadly, absence of
     runtime errors where justified, and stronger integrity or functional proofs for the critical core.
     Do not call a partially analyzed project fully proved.
   - Use public contracts as proof boundaries and keep implementation representation in private
     refinements. Validate raw external input explicitly before converting it into a subtype consumed
     by a core whose preconditions assume validated callers.
   - Model global state through abstract and refined state plus dependency contracts. Include loop
     frame conditions and progress, and use ghost models simpler than the production representation.
   - Treat every assumption and `SPARK_Mode => Off` path as trust debt with owner, target, rationale,
     validation, and change detection. Prefer proved cut assertions over unchecked assumptions.
   - Classify an unproved check as code defect, contract defect, missing invariant, model mismatch,
     prover limitation, or actual timeout before increasing resource limits.
   - Preserve proof completeness evidence: every intended unit analyzed, no unexplained checks,
     assumption delta reviewed, toolchain and prover identity fixed, and non-SPARK, compiler backend,
     runtime, stack, unchecked, and foreign-library boundaries reported separately.
11. **Verify the real target and failure paths.**
   - Cover compile failures for illegal type combinations, enabled runtime checks, boundary parsing,
     null and non-unit array bounds, arithmetic edges, representation fixtures, exception paths,
     allocation provenance, finalization and shutdown order, storage-pool exhaustion, secondary-stack
     use, task activation and shutdown, barrier and queue behavior, deadline-miss policy, and FFI rejection.
   - Run configured build, test, analysis, proof, target, and release intents that match the changed
     surface. Report a missing GNATprove, target runtime, schedulability, WCET, or hardware-layout
     gate instead of replacing it with host-only compilation or a broader claim.

<!-- mustflow-section: postconditions -->
## Postconditions

- Language mode, compiler, runtime, target, assertion policy, check policy, and proof boundary are explicit.
- Domain type, range, array, representation, ownership, unsafe, tasking, and shutdown contracts are observable.
- Compile-time, runtime-check, flow-analysis, proof, test, and external-assumption evidence are not conflated.
- Any claim of runtime-error absence, race freedom, bounded memory, WCET, schedulability, layout, or
  certification is limited to the exact evidence and target that established it.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot intents that cover the changed scope:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If language, compiler, runtime, target, assertion, check, or proof identity is unclear, preserve
  existing behavior and report the missing evidence.
- If proof fails, retain runtime checks and report the unresolved verification conditions; do not
  add assumptions, suppress checks, or downgrade the proof gate without explicit ownership.
- If representation or FFI validity cannot be established, keep raw data outside domain code and
  stop before claiming a safe conversion.
- If task ordering, blocking, ceiling, shutdown, or deadline semantics are unclear, keep the
  concurrency change out and report the missing state-machine or scheduling evidence.
- If only host compilation is available for a target-specific change, report that limitation and
  do not claim target layout, timing, runtime, or certification success.

<!-- mustflow-section: output-format -->
## Output Format

- Ada language, compiler, runtime, target, package, and build identity
- Type, range, array, contract, proof, ownership, representation, FFI, and tasking decisions
- Evidence classification: compile-time, runtime check, flow analysis, proof, test, or assumption
- Configured intents run and target or proof evidence obtained
- Skipped checks and remaining Ada, SPARK, target, timing, layout, concurrency, or certification risk
