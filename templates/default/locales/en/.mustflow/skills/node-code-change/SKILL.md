---
mustflow_doc: skill.node-code-change
locale: en
canonical: true
revision: 5
lifecycle: mustflow-owned
authority: procedure
name: node-code-change
description: Apply this skill when Node.js runtime code, server performance behavior, event-loop blocking, libuv worker-pool use, package manager ownership, module format, package entry metadata, native dependencies, Node test runner behavior, TypeScript execution mode, or deployment runtime support is created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.node-code-change
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

# Node Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve the actual Node.js runtime, module, package manager, TypeScript execution, test runner, package entry, native dependency, deployment, event-loop, worker-pool, and server-performance boundaries.

<!-- mustflow-section: use-when -->
## Use When

- Node.js runtime code, `node:*` APIs, `process`, `Buffer`, streams, workers, child processes, native addons, Node permission flags, Node test runner behavior, package entry metadata, or deployment runtime support changes.
- Node server code, CLI code, workers, request handlers, stream handlers, serializers, parsers, regex validation, crypto, zlib, filesystem, DNS, child process, or CPU-heavy JavaScript changes can affect event-loop delay, event-loop utilization, libuv worker-pool pressure, CPU profiles, GC, or p95/p99 latency.
- `package.json` Node fields change, including `engines.node`, `devEngines`, `packageManager`, `type`, `main`, `exports`, `imports`, `types`, `typesVersions`, `files`, `bin`, `sideEffects`, or `workspaces`.
- Node version signals, CI Node setup, Docker Node base images, serverless Node runtime settings, Corepack usage, npm, pnpm, Yarn, or lockfile ownership changes.
- The task proposes native Node TypeScript execution, ESM/CJS conversion, conditional exports, package manager migration, or Node built-in test runner migration.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes TypeScript type modeling, validators, declarations, or `.ts` source without Node runtime or package entry impact; use `typescript-code-change`.
- The task only changes plain JavaScript without Node-specific runtime, package, or deployment behavior; use `javascript-code-change`.
- Bun owns the runtime, package manager, test runner, or bundler behavior being changed; use `bun-code-change`.
- A narrower framework skill owns the changed route or handler surface, unless Node runtime, package, or deployment behavior is also affected.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Node version signals: `.nvmrc`, `.node-version`, `.tool-versions`, Volta or mise/asdf config, `package.json#engines.node`, `package.json#devEngines`, CI Node matrix, Docker `FROM node:*`, and deployment runtime config.
- Package ownership signals: `package.json#packageManager`, npm, pnpm, Yarn, Bun, or vlt lockfiles, workspace config, `.npmrc`, `.yarnrc.yml`, Corepack usage, CI install commands, and Docker install commands.
- Module and package metadata: nearest `package.json#type`, file extensions, `main`, `module`, `exports`, `imports`, `types`, `typings`, `typesVersions`, `files`, `bin`, `sideEffects`, and documented import paths.
- TypeScript and loader signals: `tsconfig*.json`, `tsx`, `ts-node`, SWC, Babel, Vite, tsup, esbuild, Node native type stripping, path aliases, declaration output, and test or build transforms.
- Test, native, and deployment signals: package scripts, test runner config, `node:test` usage, native dependency indicators such as `.node`, `binding.gyp`, `node-gyp`, lifecycle scripts, optional dependencies, serverless or edge config, and command contract entries.
- Node performance signals: `perf_hooks` usage, event-loop utilization, event-loop delay histograms, CPU profile or flame graph setup, request-level I/O timings, `--trace-sync-io`, worker-thread pools, `UV_THREADPOOL_SIZE`, stream backpressure, large JSON handling, regex validation, GC or heap flags, and timeout or cancellation paths.

<!-- mustflow-section: preconditions -->
## Preconditions

- Determine the effective Node runtime before using newer syntax, APIs, or flags.
- Determine package manager ownership before editing dependencies or lockfiles.
- Determine Node's actual module loading path before changing imports, file extensions, or package entry metadata.
- Treat package entry, engine, and lockfile changes as public contract or release-sensitive changes unless proven internal.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep runtime-specific Node APIs in Node-owned files or adapters.
- Keep package manager changes aligned with the owner already used by CI, Docker, and lockfiles.
- Keep ESM, CJS, and dual package boundaries explicit and synchronized with declarations, tests, docs examples, and consumer entrypoints.
- Preserve existing TypeScript build, typecheck, declaration, and loader pipelines unless the task explicitly asks to replace them.
- Add or update focused tests only when they protect the changed runtime, package, module, native, or deployment contract.

<!-- mustflow-section: procedure -->
## Procedure

1. Read runtime version signals before editing. Treat deployment runtime as the hard constraint, CI runtime as the verified constraint, `engines.node` as the compatibility contract, and local version files as developer hints. If these conflict, report the conflict before introducing APIs or syntax that depend on one side.
2. Do not assume Node Current. Use Current-only APIs only when local tooling, CI, Docker, deployment, package metadata, and intended consumers all prove support for that Current major. For production applications, prefer Active LTS or Maintenance LTS when the project does not declare otherwise.
3. Determine package manager ownership from `packageManager`, lockfiles, workspace config, CI, and Docker. If `packageManager` and lockfiles disagree, or multiple lockfiles exist, do not rewrite dependencies until the owner and migration intent are clear.
4. Keep package manager semantics distinct:
   - npm dependency changes update `package.json` and npm lockfiles; clean CI installs use npm's clean-install mode.
   - pnpm workspaces and frozen lockfile behavior can affect every workspace even when one package changed.
   - Yarn PnP, Zero-Install, and immutable installs can make `node_modules` assumptions wrong.
   - Corepack availability depends on the Node/runtime environment; do not assume it exists in every Node version, image, or CI runner.
5. Determine Node module loading from Node rules, not preference or `tsconfig` alone. `.mjs` and `.mts` are ESM, `.cjs` and `.cts` are CommonJS, and `.js` or `.ts` follows the nearest package `type` after the project's loader/build path is considered.
6. For new Node applications, servers, and private CLIs, prefer an explicit ESM-only package with `"type": "module"` and ordinary `.js` source/output files when the supported runtime allows it. Do not rename every file to `.mjs` just to mean ESM; reserve `.mjs` and `.cjs` for exceptional per-file overrides or mixed-module boundaries.
7. In native Node ESM code, require fully specified relative and absolute import specifiers, including file extensions and directory indexes such as `./feature/index.js`. Do not carry CommonJS extensionless or directory-main assumptions into Node ESM unless a bundler or loader owns that resolution.
8. Treat `type`, `main`, `exports`, `imports`, file extensions, and conditional export changes as package entry contract changes. Adding `exports` can block deep imports and should be classified as compatibility-sensitive unless all previously supported paths remain exported or the release is intentionally breaking.
9. For conditional exports, keep condition order deliberate, include a `default` fallback when multi-runtime or bundler consumers are intended, and avoid splitting `import` and `require` into separate stateful implementations unless dual package hazards are tested.
10. For `imports`, use `#` aliases only for package-internal paths, and keep TypeScript paths, bundler aliases, test runner aliases, and declaration output aligned.
11. For JSON imports, `require(esm)`, top-level await, `.mts`, `.cts`, `.d.mts`, and `.d.cts`, verify the minimum Node version, TypeScript module resolution, generated output, and consumer path before changing code.
12. Do not replace an existing TypeScript pipeline with native Node TypeScript execution unless the task explicitly asks for that migration. Node native TypeScript execution is limited type stripping; it does not typecheck, read `tsconfig`, resolve path aliases, emit declarations, downlevel syntax, transform decorators or enums, or support TSX as a full build pipeline.
13. If native Node TypeScript execution is intentionally used, keep syntax erasable-only, use `import type` for type-only imports, avoid runtime TypeScript features that require transforms, and keep the configured typecheck/build pipeline for application and library code.
14. Detect the actual test runner from scripts, config files, dependencies, and CI. Do not migrate Jest, Vitest, Playwright, or another runner to `node:test` just because Node has a built-in runner. Watch, coverage, mock, snapshot, worker, and cleanup behavior are runner-specific.
15. Treat watch mode and snapshot update modes as development or review actions, not final verification. Use the configured oneshot intents and report when no configured runner-specific intent exists.
16. Before using Node APIs in deployment code, classify the target as Node server, Docker, serverless Node, edge runtime, static build, or multi-runtime package. Edge runtimes are not full Node.js runtimes.
17. Inspect native and install-sensitive dependencies when package metadata or runtime imports touch `.node`, `binding.gyp`, `node-gyp`, `preinstall`, `install`, `postinstall`, `prepare`, optional dependencies, peer dependencies, OS, CPU, libc, or Node ABI boundaries.
18. Treat optional dependencies and optional peers as absent until code handles absence. Do not require optional packages directly without fallback or error handling that matches the existing project pattern.
19. Treat the Node permission model as a trusted-code seatbelt, not a sandbox for untrusted code. Map filesystem paths, network access, child processes, worker threads, native addons, WASI, FFI, and inspector access explicitly. Treat temporary directories as filesystem grants, and use OS-level isolation when malicious code is in scope.
20. Separate Node performance bottlenecks before choosing a fix. Use available `perf_hooks` or configured evidence to distinguish JavaScript CPU, event-loop delay, external I/O wait, libuv worker-pool saturation, stream backpressure, and GC or allocation churn. Event-loop utilization is not CPU percent; high ELU with low CPU can still mean sync blocking.
21. Prefer CPU profiles or flame graphs over timing logs for CPU-heavy Node paths. Use profile or configured evidence for parsing, validation, rendering, hashing, compression, crypto, diffing, report generation, sorting, JSON work, formatter creation, or AST work; log timers alone rarely prove the hot stack.
22. Treat event-loop delay as a tail metric. Check p95 and p99 delay when evidence exists, not only averages. A rare 800ms block can dominate user-visible latency while average delay looks clean.
23. Keep server code off synchronous Node APIs after startup. `fs`, crypto, zlib, DNS, and child-process sync calls block the event loop; large `JSON.parse` or `JSON.stringify`, catastrophic regex, expensive sort comparators, repeated `Intl` or `Date` formatter construction, and eager logging serialization can do the same even without `Sync` in the name.
24. Use worker threads for CPU-bound JavaScript or native-bound work, not as a cure for slow DB, HTTP, Redis, or filesystem waits. Slow external I/O needs query, pool, timeout, cancellation, backpressure, batching, or provider-boundary fixes.
25. Treat the libuv worker pool as shared. Async `fs`, crypto, zlib, and `dns.lookup` can starve each other; `UV_THREADPOOL_SIZE` is a startup environment decision, not a runtime patch hidden inside application code.
26. Preserve stream backpressure. For large files, uploads, exports, compression, proxying, and generated responses, prefer pipeline-style boundaries with error handling over whole-buffer reads or unchecked writes.
27. Avoid `process.nextTick()` starvation. Recursive next-tick queues can prevent I/O polling; long work should be batched with event-loop yielding that lets I/O progress.
28. Include GC and allocation in Node CPU diagnosis. A profile dominated by V8, GC, allocation, string/Buffer copies, or JSON work usually needs allocation reduction, streaming, chunking, pagination, bounded caches, or worker offload before heap-size tuning.
29. Choose configured verification intents that cover lint, build, tests, package metadata, release-sensitive package output, docs examples, and mustflow contract checks when available. Report missing consumer fixture, ESM, CJS, TypeScript consumer, native dependency, deployment, permission, profiler, event-loop-delay, worker-pool, stream, or performance verification.

<!-- mustflow-section: postconditions -->
## Postconditions

- Effective Node runtime and package manager ownership are known or explicitly reported as conflicting.
- Module and package entry changes are synchronized with declarations, tests, docs examples, and consumer surfaces when relevant.
- Native TypeScript execution is not mistaken for typecheck, declaration emit, or a full build pipeline.
- Node-only APIs do not leak into browser, edge, Bun, or shared package surfaces unintentionally.
- Native dependency, lifecycle, optional dependency, and permission-model risks are handled or reported.
- Event-loop blocking, CPU profile, libuv worker-pool, stream backpressure, large JSON, regex REDOS, worker-thread fit, `process.nextTick()` starvation, and GC or allocation risks are handled or reported when touched.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Report missing ESM/CJS consumer, declaration output, package artifact, frozen install, native dependency, deployment runtime, permission-model, runner-specific, CPU-profile, event-loop-delay, worker-pool, stream-backpressure, or performance verification intents when those surfaces change.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If runtime signals conflict, do not resolve the conflict by assuming the newest Node version.
- If package manager ownership conflicts, do not add, remove, or migrate dependencies until the owner is clear.
- If a package entry change blocks a documented or previously supported import path, restore compatibility or report the breaking-change requirement.
- If native Node TypeScript execution fails, repair the build/loader boundary instead of weakening typecheck or deleting the TypeScript pipeline.
- If native dependency installation or optional dependency behavior is unclear, classify the change as release-sensitive and report the missing install or runtime evidence.
- If a Node performance claim lacks event-loop, CPU, I/O, worker-pool, stream, or GC evidence, label it as static risk or missing measurement instead of reporting a measured speedup.

<!-- mustflow-section: output-format -->
## Output Format

- Runtime and package manager decision
- Module and package entry notes
- TypeScript execution and test runner notes
- Native, lifecycle, deployment, or permission risks
- Event-loop, CPU, worker-pool, stream, JSON, regex, next-tick, or GC risks
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Node.js risk
