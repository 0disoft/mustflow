---
mustflow_doc: skill.machine-code-performance-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: machine-code-performance-review
description: Apply this skill when performance-sensitive native code, generated machine code, hot loops, disassembly, compiler optimization remarks, vectorization, aliasing, cache layout, branch behavior, instruction throughput, PGO, LTO, or cross-compiler code-generation differences are optimized, reviewed, benchmarked, or diagnosed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.machine-code-performance-review
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

# Machine Code Performance Review

<!-- mustflow-section: purpose -->
## Purpose

Optimize native execution from representative workload evidence and a causal microarchitectural
model. Treat shorter assembly, higher IPC, vector instructions, fewer branches, or smaller source as
hypotheses rather than performance proof.

<!-- mustflow-section: use-when -->
## Use When

- A native hot path or generated machine-code region is slow or changes performance.
- Disassembly, compiler optimization remarks, PMU counters, cache behavior, branch prediction,
  instruction scheduling, register pressure, or vectorization must explain a measured hotspot.
- Data layout, loop order, tiling, unrolling, inlining, specialization, PGO, LTO, or target features
  are changed for native performance.
- GCC, Clang, MSVC, or another compiler generates materially different code for the same workload.
- The compiler needs stronger alias, alignment, range, purity, lifetime, or target facts before it can
  legally perform an intended optimization.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The compiler, optimizer, IR, backend, assembler, or linker implementation itself changes; use
  `compiler-engineering-review` first.
- Only metric semantics, benchmark schema, profiler privacy, counter normalization, or statistical
  comparison changes; use `performance-measurement-integrity-review` first.
- No measured hotspot or representative workload exists and the task is speculative cleanup.
- The code is managed, interpreted, browser-rendered, database, network, or GPU bound without a
  proven native machine-code bottleneck; use the owning performance skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User-visible outcome, representative workload distribution, baseline and candidate builds, and
  correctness oracle.
- Exact compiler, version, target triple, CPU model and core type, ISA and tuning features,
  optimization and floating-point modes, LTO or PGO state, libraries, link mode, and binary identity.
- Hot address, call stack, loop boundaries, source and disassembly mapping, optimization remarks,
  and relevant PMU or profiler evidence.
- Data layout and access ledger: hot and cold fields, object size, stride, alignment, working set,
  cache-line ownership, aliasing, provenance, concurrency, NUMA placement, and reuse distance.
- Transformation contract: legality assumptions, expected causal effect, code-size and compile-time
  budget, fallback behavior, supported targets, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the exclusions.
- Correctness is independently testable under the proposed language, aliasing, overflow,
  floating-point, exception, memory-model, and target assumptions.
- The hotspot is identified from representative execution rather than assembly appearance alone.
- Apply `performance-measurement-integrity-review` when benchmark or PMU evidence is material.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Edit the bounded native hot path, data layout, compiler-visible contracts, build profile, focused
  benchmarks, correctness tests, and directly synchronized documentation.
- Add runtime dispatch or guarded fast paths when targets differ and fallback correctness remains
  explicit and tested.
- Do not weaken defined behavior, portability, precision, error handling, or security merely to
  obtain favorable assembly or one benchmark result.
- Do not add raw profiler, compiler, disassembler, benchmark, or tuning commands outside the selected
  repository command contract.

<!-- mustflow-section: procedure -->
## Procedure

1. Define success in end-result units: latency, throughput, CPU time, energy, memory traffic, tail
   behavior, or capacity under a representative distribution. Preserve output, error, precision,
   determinism, and resource semantics as independent acceptance gates.
2. Freeze the comparison universe. Record source and binary identities, compiler and linker inputs,
   target CPU and enabled ISA, optimization and FP rules, PGO profile provenance, LTO boundary,
   affinity, core type, NUMA placement, frequency or thermal state, workload, warmup, repetitions,
   and cache state. Do not compare optimization-level labels as though their pass sets were equal.
3. Locate the hot instruction addresses with sampling or equivalent runtime evidence, then map them
   to the call path, basic block, loop back edge, loads, stores, branches, and loop-carried values.
   Read only relevant disassembly after locating runtime heat.
4. Classify the bottleneck as frontend supply, bad speculation, backend execution or dependency,
   or memory latency and bandwidth. Use static scheduling analysis to form hypotheses and PMU or
   runtime evidence to test them. Instruction count, IPC, cache hit rate, or one counter alone cannot
   establish the cause or the user-visible improvement.
5. Review data movement before arithmetic cleverness. Measure cache-line useful density, hot and
   cold field separation, AoS, SoA, or AoSoA fit to the hot loop, loop interchange, tiling, padding,
   pathological strides, working-set transitions, pointer chasing, memory-level parallelism,
   prefetch usefulness, store-forwarding hazards, false sharing, and write ownership transfer.
6. Review control flow by predictability and cost. Separate predictable loop branches from
   data-dependent entropy and indirect targets. Prefer grouping, partitioning, hot and cold
   separation, devirtualization, and representative PGO before branchless arithmetic. Accept a
   branchless form only when it reduces measured critical work without executing expensive or
   unsafe inactive paths.
7. Review the execution dependency graph. Identify critical paths, loop-carried dependencies,
   reciprocal throughput, execution-port pressure, address-generation pressure, spills, reloads,
   and register-file limits for the actual CPU. Use independent accumulators, reassociation,
   unrolling, or wider vectors only while their latency hiding exceeds code-size, remainder,
   alignment, guard, and spill costs.
8. Verify the complete vector path, not the presence of a vector instruction. Account for runtime
   alias and alignment guards, peel and scalar remainder loops, gather or scatter, masked tails,
   input sizes, vector-width frequency effects, target coverage, dispatch, and fallback. Read the
   compiler's success and missed-optimization remarks before reverse-engineering its decision.
9. Give the compiler facts it can legally use. Trace ambiguity across pointer aliasing and overlap,
   alignment, bounds, provenance, side effects, exceptions, calls, escape, lifetime, concurrency,
   overflow, FP reassociation, and translation-unit visibility. Prefer types, ownership, scoped
   qualifiers, loop versioning, runtime overlap checks, pure or noalias contracts, and LTO-visible
   structure that make true facts explicit. Never assert a stronger fact than every permitted call
   satisfies; a false optimization promise creates undefined behavior or wrong code.
10. Keep hot code compact. Inline or specialize when it enables measured constant propagation,
    devirtualization, vectorization, or branch removal; otherwise account for instruction-cache,
    decode, uop-cache, compile-time, and binary-size cost. Move rare error, logging, allocation, and
    fallback paths out of the hot layout without changing their observable behavior.
11. Compare compilers and builds by semantic and target equivalence. Align language standard,
    definedness, alias, overflow, exception, RTTI, FP, ISA, tuning, library, LTO, PGO, link, and
    runtime conditions. Inspect enabled transformations, remarks, IR or machine output, and final
    linked code; do not crown a compiler from one source shape or one favorable input.
12. Train and validate PGO on versioned representative distributions. Detect profile staleness,
    missing functions, changed control flow, and overfitting to training data. Keep unprofiled and
    materially different workloads in the acceptance matrix, and preserve a safe non-PGO path when
    the release contract requires one.
13. Apply one causal transformation at a time where feasible. Rebuild, rerun correctness and
    sanitizer or undefined-behavior evidence when configured, compare the same workload, inspect the
    new hot addresses and code-size effects, and retain the change only when the end result improves
    beyond the decision threshold without shifting unacceptable cost elsewhere.
14. Record rejected variants and generalization limits. Separate compiler-specific source shaping
    from portable algorithm or layout improvements; retain target-specific code only when dispatch,
    fallback, maintenance, and regression evidence justify it.

<!-- mustflow-section: postconditions -->
## Postconditions

- The hotspot, bottleneck class, causal hypothesis, legality assumptions, transformation, and
  end-result evidence are explicit.
- Machine-code observations agree with runtime evidence or remain labeled as static hypotheses.
- Target, compiler, workload, correctness, portability, code-size, and fallback boundaries are
  preserved or reported.
- No alias, alignment, overflow, FP, provenance, lifetime, side-effect, or concurrency promise is
  strengthened beyond the actual call contract.

<!-- mustflow-section: verification -->
## Verification

Use the narrowest configured oneshot intents that cover the change:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer configured correctness, sanitizer, benchmark, profiling, disassembly, code-size, and target
matrix intents. Dedicated PMU hardware, cross-compiler labs, remote targets, and production PGO are
manual-only unless explicitly configured.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the hotspot moves or disappears, reprofile before continuing to tune the old address.
- If counters and timing disagree, validate event meaning, multiplexing, normalization, workload
  phase, and instrumentation overhead before changing code.
- If optimization requires an untrue alias, alignment, range, or FP assumption, reject it or add a
  checked fast path with a correct fallback.
- If a candidate improves a microbenchmark but regresses representative end-to-end behavior,
  reject or narrow it to the workload where dispatch can select it safely.
- If target or compiler evidence is unavailable, report the static hypothesis and missing configured
  evidence rather than claiming a machine-code win.

<!-- mustflow-section: output-format -->
## Output Format

- Outcome, workload, compiler, target, CPU, and binary identity
- Hot address, loop, and bottleneck classification
- Data movement, branch, dependency, vector, register, frontend, and code-size findings
- Compiler-proof boundary and legality assumptions
- PGO, LTO, compiler-comparison, dispatch, and fallback result
- Transformation and rejected alternatives
- Correctness and performance evidence
- Command intents run or skipped
- Remaining workload, target, portability, precision, or measurement risk
