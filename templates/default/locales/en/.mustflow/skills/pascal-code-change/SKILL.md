---
mustflow_doc: skill.pascal-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: pascal-code-change
description: Apply this skill when Pascal or Object Pascal source, Delphi or Free Pascal compiler behavior, RAD Studio or Lazarus projects, RTL, VCL, FireMonkey, LCL, generics, managed records, packages, DLLs, threading, synchronization, async I/O, C or C++ interop, tests, or deployment behavior are created, changed, reviewed, migrated, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.pascal-code-change
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

# Pascal Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Pascal language-mode, compiler, RTL, type, range-check, managed-value, UI-thread,
concurrency, ABI, package, platform, and deployment contracts. Keep Delphi and Free Pascal or
Lazarus behavior separate unless current evidence proves a portable shared contract.

<!-- mustflow-section: use-when -->
## Use When

- Pascal or Object Pascal units, programs, libraries, packages, forms, generics, records, classes,
  interfaces, exceptions, tests, or compiler directives change.
- Delphi, RAD Studio, RTL, VCL, FireMonkey, WebBroker, or platform target behavior changes.
- Free Pascal, Lazarus, LCL, RTL, compiler mode, target, package, threading, or pas2js behavior changes.
- Threads, synchronization, callbacks, async I/O, COM, DLLs, C or C++ interop, layout, strings,
  memory ownership, or release packaging changes.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The changed surface is only C or C++ and no Pascal-owned binding or package contract changes.
- The task asks only for the latest Delphi, Lazarus, or Free Pascal version; use source-freshness
  guidance unless durable code or documentation changes too.
- A Delphi-only feature is proposed for an FPC target, or an FPC development feature for a stable
  release, without an explicit migration or conditional compilation plan.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Compiler family and version, language mode, RTL, IDE, target OS and architecture, build profile,
  project and package metadata, search paths, conditional symbols, directives, and CI image.
- Application model: console, service, VCL, FireMonkey, LCL, WebBroker, library, package, mobile,
  embedded, pas2js, WebAssembly, or another target.
- Public units, package and DLL surfaces, managed types, generics, record and class ownership,
  range and overflow policy, enum and set serialization, strings, arrays, pointers, exceptions,
  RTTI, initialization and finalization, BPL or DLL lifetime, and form resources.
- Concurrency ledger: UI or main thread, workers, thread pool, queues, synchronization, cancellation,
  captured values, callbacks, COM apartments, async I/O, shutdown, and exception observation.
- ABI ledger: calling conventions, scalar widths and signedness, record size and offsets, packing,
  strings and encoding, pointer-length units, allocation owner, opaque handles, errors, and callbacks.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read current project files, compiler directives, target matrix, package dependencies, RTL or
  framework code, tests, and deployment evidence before changing language or runtime assumptions.
- Refresh official Embarcadero, Free Pascal, Lazarus, platform, and library sources before preserving
  exact version, default, feature, ABI, deprecation, or support claims.
- Treat version research as dated evidence. The source snapshot reviewed on 2026-07-11 identified
  Delphi or RAD Studio 13.1, Lazarus 4.8, and Free Pascal 3.2.2 as separate stable baselines while
  later Delphi beta and FPC development tracks were prerelease; recheck each track before reuse.
- Identify which compiler and RTL owns every changed behavior. Similar syntax does not establish
  equivalent threading, memory-manager, exception, ABI, package, or managed-type semantics.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Make focused Pascal, project, package, binding, form-resource, runtime, test, and docs changes
  required by the task.
- Add explicit domain records, conversion tables, lifetime owners, cancellation state, C wrappers,
  ABI probes, and regression tests where they protect changed behavior.
- Preserve supported compilers, targets, public unit APIs, package boundaries, form resources,
  calling conventions, and wire or storage formats unless migration is explicit.
- Do not disable range or overflow checks, widen conditional compilation, share a memory manager,
  swallow worker exceptions, or change packing merely to make one target pass.

<!-- mustflow-section: procedure -->
## Procedure

1. **Split the compiler, RTL, IDE, and target tracks.**
   - Record Delphi or FPC compiler version, language mode, RTL, Lazarus or RAD Studio version,
     architecture, widget or UI framework, package format, backend, linker, and deployment target.
   - Treat Lazarus and FPC as independent release trains. Keep stable, release-candidate,
     development, pas2js, WebAssembly, LLVM, and platform-preview behavior separately gated.
   - Scope compiler directives with local push and pop mechanisms where supported. Do not let an
     include or unit silently change range, overflow, enum, packing, alignment, or syntax policy.
   - Verify design-time package architecture separately from runtime application architecture.
2. **Model domain identity beyond decorative aliases.**
   - Distinguish aliases from new ordinal types, but do not assume a new numeric type is fully opaque;
     verify assignment compatibility under the selected compiler and mode.
   - Wrap values that must never mix in records with private storage, explicit validation, no broad
     implicit conversion, and a deliberate valid or invalid default-record state.
   - Receive external input in a wider raw type, validate it explicitly, then convert to a range type.
     Keep range and overflow checks explicitly enabled for the intended builds and tested boundaries.
   - Use enums for one closed choice, subranges for contiguous ordinal subsets, and sets for bounded
     combinations. Keep reusable enums scoped where supported.
   - Keep internal enums dense and map wire names, database codes, HTTP values, and display text
     explicitly. Never persist `Ord`, raw set bytes, RTTI layout, or compiler-dependent enum storage.
   - Use enum-indexed arrays and set operations for complete mappings and structural transition
     tables, while keeping authorization and business conditions in explicit policy functions.
3. **Design managed values and records with copy semantics in mind.**
   - Managed strings, interfaces, dynamic arrays, anonymous methods, variants, and compiler-managed
     records carry runtime-specific lifetime behavior, not thread-safe shared-state semantics.
   - A custom managed record is not automatic unique ownership. Define initialization, assignment,
     copying, moving where supported, finalization, self-assignment, exception, and container behavior.
   - Keep `unmanaged`-style generic constraints separate from stable binary representation claims;
     unmanaged values may still have padding, alignment, endian, and ABI differences.
   - Keep helpers limited to representation and convenience. Core validity, permission, transition,
     and money rules must not depend on which helper is visible through unit order.
   - Do not use raw move, fill, or byte comparison on records containing strings, interfaces,
     dynamic arrays, variants, managed records, or other finalized fields. Use typed assignment,
     initialization, finalization, equality, and serialization.
   - Choose one ownership model for an object exposed as both class and interface. Account for
     Delphi reference counting, FPC COM versus CORBA interfaces, temporary interface lifetime,
     interface cycles, weak references, and explicit owner-backed non-owning contracts.
   - Require derived destructors to override the virtual destructor and tolerate partial construction.
     Keep constructor constraints, class references, and default constructors separate from a real
     factory contract with dependencies and validity rules.
   - Keep dictionary keys immutable and provide equality and hash rules as one policy. Make owning
     collection removal distinct from ownership transfer, and do not infer serialization schema from RTTI.
4. **Preserve string, array, and pointer lifetime explicitly.**
   - Treat a pointer derived from a temporary string or array as valid only for the bounded call that
     owns the temporary. If native code retains it, allocate or pin an owned buffer with an explicit
     release path and a lifetime longer than every callback or asynchronous operation.
   - Do not mutate shared copy-on-write strings through raw pointers. Establish uniqueness, capacity,
     write bounds, and final logical length, or write into a separate character buffer and construct
     the string afterward.
   - Distinguish UTF-16 code units, Unicode scalar values, grapheme clusters, encoded byte length,
     and NUL-terminated length. Keep binary data in byte containers rather than `RawByteString`.
   - Dynamic-array assignment aliases one backing store and element writes do not trigger string-like
     copy-on-write. Copy explicitly for snapshots, use `const` for read-only access, and use `var` only
     when replacement or resize is part of the contract.
   - Invalidate every saved element pointer after resize. Represent contiguous foreign or SIMD
     matrices as one buffer plus dimensions and stride rather than nested dynamic arrays.
   - Treat an open array as a call-scoped zero-based view whose source lower bound is lost. Avoid
     temporary array constructors and non-const large open-array parameters in hot or stack-bounded paths.
   - Use pointer arithmetic only with an explicit element type and bounds. Use pointer-sized integer
     types only when integer representation is unavoidable; do not truncate addresses through `Integer`.
   - Use managed `out` only for a genuinely fresh result because the prior value may be finalized
     before entry. Produce into a local temporary and commit by assignment when failure must preserve input.
5. **Own unit, package, and process lifecycle explicitly.**
   - Treat interface `uses` as public dependency and initialization-graph change. Keep implementation
     dependencies private and move service startup out of cyclic unit initialization into one bootstrap owner.
   - Make initialization publish only fully built state and make finalization tolerate partial startup.
     Finalization must be idempotent, nonthrowing, and independent of UI, newly created loggers, or
     services that may already be finalized.
   - Do not use compiler-specific `Halt`, class-constructor timing, or unit order as a portable shutdown
     or service-start contract. Generic specializations may create more than one class-level initializer.
   - Treat package loading as immediate code execution. Validate a separate manifest first and roll
     back registration if initialization fails.
   - Before unloading a package, stop new calls, drain active calls and callbacks, unregister factories,
     destroy interfaces and objects, and remove RTTI or class references into its code pages.
   - Keep stateful shared units in one required runtime package. Separate design-time and runtime
     packages, compiler, platform, and configuration output directories, and deploy DCP, DCU, and BPL
     according to their distinct compile-time and runtime roles.
6. **Make UI and worker lifetimes nonblocking and observable.**
   - Do not block the UI thread waiting for work that needs synchronization, queued callbacks,
     termination events, or UI message processing. Model completion as success, failure, or cancellation.
   - Treat queue APIs as potentially immediate when called from the main thread unless the selected
     RTL guarantees forced deferral. Make state reentrant-safe before scheduling a callback.
   - Capture immutable result values rather than `Self`, raw pointers, or mutable interfaces. Remove
     pending callbacks during shutdown and still account for callbacks already executing.
   - Treat `FreeOnTerminate` as a no-external-reference policy, not automatic ownership. With an owner,
     request cancellation, await termination without UI dependency, observe the result, then destroy.
   - Treat `Terminate` and OS cancellation calls as requests. Give blocking I/O finite interruption
     paths and retain buffers, overlapped state, and context until a completion result is observed.
   - On FPC Unix targets, establish the selected thread manager before any unit can create threads.
     Ensure console main loops service synchronization callbacks when that RTL requires it.
7. **Protect compound state, not just individual variables.**
   - Reference counting and one interlocked counter do not make a compound invariant atomic. Use one
     owned lock or a proved single-word state transition; account for publication, ABA, and reclamation.
   - Use semaphores for counts and queues for data. A pulse, condition, or event is not durable work;
     update state under the lock, signal afterward, and recheck wait predicates in a loop.
   - Lock on a dedicated stable object whose identity cannot change and whose lifetime outlives all
     users. Define one global lock order across normal, error, cancellation, and shutdown paths.
   - Copy state and callback lists under the lock, then release it before logging, callbacks, UI
     queueing, COM, interface release, destructors, allocator calls, or other reentrant code.
   - Observe every worker exception exactly once and map it into the owner-visible completion state.
     A worker stack does not propagate an exception to the thread creator's `try..except` block.
8. **Keep native boundaries intentionally narrow.**
   - Put C++ classes, STL, templates, overloads, virtual layout, and exceptions behind an `extern "C"`
     facade. Expose fixed scalars, POD records, pointer-length buffers, opaque handles, and status codes.
   - Match function and callback calling conventions, parameter count, width, signedness, return mode,
     and variadic behavior exactly. Prefer platform and compiler C-type units over `Integer` or `Boolean`.
   - Verify every shared record with C-side size, alignment, and offset probes on each target. Do not
     add `packed` unless the foreign declaration itself requires that exact packing.
   - Define string pointer, length unit, encoding, embedded-NUL rule, ownership, retention, and release.
     Copy borrowed return buffers before their documented validity ends.
   - Allocate and free in the same module or documented allocator family. Do not expose managed Pascal
     strings, arrays, interfaces, variants, classes, open arrays, or anonymous methods through a C ABI.
   - Register callbacks as function, context, calling convention, thread, lifetime, and drain contracts.
     Block new callbacks and wait for in-flight callbacks before destroying context or unloading code.
   - Catch Pascal and C++ exceptions inside their wrappers. Read `GetLastError` or `errno` immediately
     after a documented failing return, before logging or other calls can overwrite it.
   - Initialize COM per thread with the required apartment and marshal interfaces across apartments.
     Shut down by lifetime dependency: stop work, drain callbacks and I/O, destroy handles, then unload.
9. **Measure hidden managed and dispatch cost before tuning switches.**
   - Measure representative wall time, allocations, reference-count traffic, copies, stack use,
     generated assembly, and code size. Debug symbols do not add runtime checks; retain symbols and
     map files while treating range, overflow, and assertion policy separately.
   - Use ordinary `const` as an optimization opportunity, not a guaranteed by-reference ABI. Apply
     Delphi forced-reference or FPC `constref` only where the selected compiler, structure size, and
     calling boundary justify it; pass small scalars by value.
   - Reuse output buffers with `var` and an explicit logical count. Grow arrays geometrically or
     allocate once, avoid repeated string concatenation and encoding conversion, and perform encoding
     conversion once at an owned boundary.
   - Keep managed fields out of hot numeric records where practical. Batch virtual and interface
     dispatch so concrete loops remain visible to the optimizer.
   - Resolve RTTI metadata once per type and cache immutable descriptors or generated delegates.
     Do not rediscover schema or wrap every element in a reflective value on a hot path.
   - Convert packed external records into naturally aligned internal records before computation.
     Verify actual inlining and optimization in generated output; `inline`, a higher optimization
     number, WPO, or smart linking is not proof of a faster or equivalent program.
   - For FPC generics, keep type-independent heavy logic in a non-generic core to control repeated
     specialization, compile time, and binary size. Measure the Delphi result too rather than assuming sharing.
10. **Gate modern features by the actual release track.**
   - Use Delphi conditional expressions only where both branch type and evaluation remain clear;
     parenthesize them inside larger expressions. Use `NameOf` for refactoring-coupled diagnostics,
     never for stable wire, database, event, or storage names.
   - Verify generic constraint and managed-record support under every supported compiler. Do not
     silently translate Delphi-only semantics into FPC mode switches or vice versa.
   - Audit pointer width, inline assembly, atomics, SIMD, packing, DLLs, COM, and third-party packages
     before claiming a new CPU target such as Windows on Arm is supported.
   - For FireMonkey, separate display timing and GPU residency from Pascal CPU micro-optimization.
     For web or AI components, separate transport support from protocol, auth, session, provider,
     privacy, and deployment contracts.
11. **Verify every supported compiler and target boundary.**
   - Cover type mixing, default records, invalid ranges, overflow, enum and set mappings, managed-record
     copies, temporary pointer lifetime, array aliasing and resize, partial construction, unit startup
     failure, package unload, UI reentrancy, cancellation, worker failure, queue and lock behavior,
     shutdown, callback drain, ABI layout, allocator pairing, error capture, COM apartment use, and
     DLL version negotiation.
   - Run configured build, test, package, ABI, and target intents for each changed supported track.
     Report a missing compiler, target, design-time package, device, or ABI probe instead of claiming
     portability from one successful host build.

<!-- mustflow-section: postconditions -->
## Postconditions

- Compiler, RTL, IDE, language mode, target, directive, package, and deployment identity are explicit.
- Domain type, range, enum, set, managed-record, ownership, threading, cancellation, ABI, callback,
  string, array, pointer, initialization, package, performance, error, and shutdown contracts are observable.
- Delphi, FPC, Lazarus, stable, prerelease, development, design-time, and runtime evidence are not conflated.
- Portability and compatibility claims are limited to the compilers, architectures, packages, and
  ABI probes actually verified.

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

- If compiler, RTL, mode, target, package, or directive identity is unclear, preserve existing
  behavior and report the missing evidence.
- If range or overflow policy is unknown, validate external values explicitly and do not claim the
  range type alone enforces the boundary.
- If worker cancellation, callback drain, or shutdown ownership is unclear, keep the lifetime change
  out and report the missing state machine.
- If ABI layout, calling convention, allocation owner, or string lifetime cannot be verified, keep
  the foreign representation raw and stop before exposing it as a Pascal domain value.
- If only one compiler or host target is available, report that limitation and do not claim cross-
  compiler, architecture, package, UI-framework, or deployment compatibility.

<!-- mustflow-section: output-format -->
## Output Format

- Compiler, RTL, IDE, language mode, target, package, and deployment tracks
- Type, range, enum, set, managed-value, ownership, threading, cancellation, ABI, and shutdown decisions
- Delphi versus FPC or Lazarus compatibility and version-gate decisions
- Configured intents run and target or ABI evidence obtained
- Skipped checks and remaining Pascal, package, platform, threading, ABI, or deployment risk
