---
mustflow_doc: skill.runtime-target-selection
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: runtime-target-selection
description: Apply this skill when choosing, migrating, rewriting, or justifying a primary language, runtime, framework, compile target, or execution environment for a feature, service, backend, engine, CLI, desktop app, or large codebase slice.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.runtime-target-selection
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_related
    - test_release
    - mustflow_check
---

# Runtime Target Selection

<!-- mustflow-section: purpose -->
## Purpose

Choose or review a language and runtime target from repository evidence, feedback-loop cost,
deployment constraints, verification needs, ecosystem maturity, and operational ownership.

This skill prevents "rewrite it in the language the agent likes" decisions. Strong compiler
feedback can make AI-assisted implementation safer, but that benefit is only real when the build
loop, smoke targets, cache policy, host toolchain, package artifacts, and deployment path are
designed for it.

<!-- mustflow-section: use-when -->
## Use When

- A task proposes choosing, replacing, migrating, or rewriting the main language, runtime,
  framework, backend, engine, CLI, worker, desktop shell, or compile target.
- A codebase slice is moved between JavaScript, TypeScript, Python, Go, Rust, C++, Zig, Dart,
  Tauri, Node, Bun, browser, edge, serverless, native, or embedded environments.
- The argument for a target depends on AI coding ease, compiler feedback, performance, reliability,
  binary distribution, developer machine constraints, remote build machines, VM performance, or
  package ecosystem maturity.
- A migration plan needs smoke-target selection, build-cache expectations, artifact size, command
  intents, or CI/deployment coverage before implementation.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The language and runtime are already fixed and the task only changes files inside that language;
  use the language-specific skill such as `rust-code-change`, `go-code-change`,
  `typescript-code-change`, `node-code-change`, or `python-code-change`.
- The task only changes a database schema, API contract, UI, or deployment config without a runtime
  target decision.
- The user explicitly asks for a short opinion without repository-backed implementation or
  migration work.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Current language and runtime surfaces: package manifests, lockfiles, workspace files, toolchain
  files, CI config, Docker or deployment config, build scripts, command-contract entries, tests, and
  generated artifact rules.
- Target options being compared, including the reason for considering each target.
- Product or system need: MVP speed, iteration loop, backend reliability, engine correctness,
  desktop shell, embedded constraints, data workload, public package compatibility, or operations.
- Developer and CI environment constraints: OS, shell, VM, remote builder, cache location, disk
  budget, native toolchain prerequisites, and available one-shot verification.
- Migration boundary: strangler slice, bridge adapter, generated bindings, dual runtime period,
  rollback path, smoke targets, and compatibility fixtures.
- Performance, correctness, or reliability claims and the representative workload needed to prove
  them.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- External advice, AI output, forum posts, benchmarks, or anecdotes have been treated as hypotheses,
  not repository facts.
- A language-specific skill will still be applied after the target is selected and files in that
  language are edited.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update decision records, skill procedures, route metadata, migration plans, command-contract
  proposals, tests, fixtures, or docs that directly support the selected runtime target.
- Add only the smallest migration scaffold needed to prove the selected boundary when the user asks
  for implementation.
- Do not run unconfigured installers, toolchain repair commands, package installs, remote builds,
  long-running watchers, or cleanup commands.
- Do not rewrite a large codebase solely because one language has a better reputation with AI.
- Do not present toy benchmarks, empty databases, local-only machine results, or compile success as
  production performance proof.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the decision and boundary.
   - Is this a new feature target, service rewrite, backend migration, engine rewrite, CLI target,
     desktop shell, embedded target, or build/deployment target?
   - Identify the smallest slice that can prove the choice without committing the whole codebase.
2. Compare targets by feedback loop, not developer taste.
   - Python or TypeScript can be appropriate for fast MVPs, scripts, UI-heavy products, and broad
     ecosystem integration.
   - Go can be appropriate for many services where simple deployment, fast builds, concurrency, and
     maintainability matter more than maximum type-level guarantees.
   - Rust can be appropriate for correctness-sensitive backends, engines, native shells, high-load
     services, FFI, local-first performance, and memory-safety-critical code, but it raises build
     cache, compile-time, native toolchain, and profile-management costs.
   - C++ or Zig choices need ecosystem, toolchain, ABI, packaging, and team fluency evidence rather
     than novelty claims.
3. Inspect environment reality.
   - Check OS, shell, native toolchain prerequisites, VM or container constraints, CI images,
     remote builders, deployment runtime, and package artifact expectations.
   - On Windows native Rust or C++ targets, distinguish ordinary shells from developer toolchain
     shells when MSVC or SDK environment variables are required.
4. Model the build loop.
   - Estimate whether the normal edit-check-test loop is seconds, minutes, or hours for the
     changed slice.
   - Identify build-cache directories, target or artifact growth, and whether cleanup is a manual
     maintenance action rather than a routine fix during active development.
   - Treat expensive settings such as full release optimization, fat LTO, whole-workspace builds,
     sanitizer runs, and cross-compiles as release or focused verification unless the command
     contract explicitly declares them as normal checks.
5. Define smoke targets before migration.
   - Choose a small set of representative smoke targets: CLI command, API route, worker path,
     database operation, desktop shell action, FFI boundary, public package import, or engine
     invariant.
   - Keep smoke targets stable and bounded so an AI agent can verify progress without compiling or
     testing the whole world every loop.
   - Report missing smoke or install verification intents instead of inventing raw commands.
6. Plan migration boundaries.
   - Prefer strangler slices, adapters, compatibility fixtures, and dual-run comparison where a
     large rewrite would otherwise hide regressions.
   - Identify data formats, public APIs, package entries, generated bindings, config, logs,
     metrics, and operational handoff surfaces that must stay compatible.
7. Calibrate performance and correctness claims.
   - Compiler success proves type and build constraints, not product correctness.
   - Microbenchmarks, empty databases, local-only measurements, and warm-cache runs are not enough
     for production claims.
   - Require representative workload, cold/warm distinction, data size, concurrency, target
     hardware, build profile, and measurement method before reporting speed superiority.
8. Select the target or report the blocked decision.
   - Pick the target only when the runtime fit, feedback loop, verification, deployment, and
     migration boundary are known enough.
   - If one of those is missing, report the missing evidence and the safest reversible next slice.

<!-- mustflow-section: postconditions -->
## Postconditions

- Runtime choice is tied to the project boundary, not generic language preference.
- Build-loop cost, cache and artifact impact, smoke targets, and verification coverage are explicit.
- Migration boundary, rollback or compatibility strategy, and unverified claims are named.
- Language-specific follow-up skills are selected before code in that language changes.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_related`
- `test_release`
- `mustflow_check`

Use language-specific configured intents after files in a selected language change. Report missing
smoke, install, package, cross-target, native toolchain, benchmark, or deployment verification
instead of inventing raw commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the target decision rests on external anecdotes, treat them as hypotheses and require current
  repository evidence before editing broad surfaces.
- If the build loop is too expensive for normal agent iteration, reduce the migration slice, add a
  configured smoke intent proposal, or report the missing command contract.
- If native toolchain setup is missing, report the prerequisite instead of running global repair or
  installer commands.
- If a performance claim cannot be measured on a representative workload, remove or qualify the
  claim.
- If a language-specific skill exposes a stronger risk after selection, follow the narrower skill
  and revisit the target decision if necessary.

<!-- mustflow-section: output-format -->
## Output Format

- Decision boundary
- Candidate targets and chosen target
- Environment and build-loop evidence
- Smoke targets and verification coverage
- Migration boundary and compatibility surfaces
- Performance or correctness claims accepted, downgraded, or deferred
- Command intents run
- Skipped checks and reasons
- Remaining runtime-target risk
