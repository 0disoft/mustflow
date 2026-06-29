---
mustflow_doc: skill.bun-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: bun-code-change
description: Apply this skill when Bun runtime code, Bun.serve or Elysia-on-Bun server behavior, Bun package manager behavior, bun.lock, bunfig.toml, Bun test runner behavior, Bun bundling, Bun compile, Bun TypeScript execution, Bun-specific APIs, Docker deployment, or Bun runtime compatibility is created, changed, reviewed, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.bun-code-change
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

# Bun Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Bun's separate roles as runtime, package manager, script runner, test runner, bundler, transpiler, compiler, server runtime, and Node-compatible environment without mistaking one successful role for another.

<!-- mustflow-section: use-when -->
## Use When

- `bun.lock`, `bun.lockb`, `bunfig.toml`, `packageManager: "bun@..."`, Bun install settings, `trustedDependencies`, Bun workspace behavior, or Bun lockfile migration changes.
- Bun runtime code or config changes, including `Bun.*`, `Bun.serve`, Elysia-on-Bun `serve` settings, `Bun.file`, `Bun.write`, `Bun.spawn`, `Bun.$`, `bun:sqlite`, `#!/usr/bin/env bun`, Bun preload, Bun `.env` behavior, or `bun run --bun`.
- Bun test runner behavior changes, including `bun test`, `bun:test`, `[test]` in `bunfig.toml`, snapshots, mocks, preload, isolation, coverage, sharding, or parallelism.
- Bun bundling, compile, transpiler, build target, JSX settings, path aliases, TypeScript runtime execution, single executable output, Docker images, PORT binding, observability instrumentation, or library packaging with Bun changes.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Bun appears only as the local command used by mustflow's configured command intents, and the changed project surface is not Bun-specific.
- The task changes generic TypeScript type modeling or declaration surfaces without Bun runtime, bundler, package manager, or test runner behavior; use `typescript-code-change`.
- The task changes generic JavaScript without Bun ownership; use `javascript-code-change`.
- Elysia route, schema, plugin, OpenAPI, or Eden behavior is the main surface; use `elysia-code-change` first and this skill only for Bun runtime or tooling risks.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- `package.json` fields: `packageManager`, `scripts`, `workspaces`, `trustedDependencies`, `overrides`, `resolutions`, `patchedDependencies`, `dependencies`, `devDependencies`, `optionalDependencies`, and package entry metadata.
- Bun ownership files: `bun.lock`, `bun.lockb`, `bunfig.toml`, npm, pnpm, or Yarn lockfiles that coexist with Bun, CI install commands, Docker install and runtime commands, and `oven-sh/setup-bun` usage.
- Bun config sections: `[install]`, `[test]`, top-level preload, env, define, loader, JSX, and run settings.
- Runtime and compatibility surfaces: `Bun.*`, `bun:test`, `node:*`, `.node`, `node-gyp`, lifecycle scripts, Prisma, sharp, Playwright, esbuild, native binary packages, streams, workers, child processes, crypto, filesystem watch, and shebangs.
- Server and deployment surfaces: `Bun.serve`, Elysia `serve` config, idle timeout, WebSocket config, backpressure limits, `SO_REUSEPORT`, clustering, compile target, CPU and libc assumptions, Docker base image, build context, distroless output, `PORT` env handling, OpenTelemetry or instrumentation, and reverse proxy config.
- TypeScript and package surfaces: `tsconfig*.json`, `@types/bun`, `types: ["bun"]`, module resolution, path aliases, JSX runtime, declaration output, build targets, package exports, and command contract entries.

<!-- mustflow-section: preconditions -->
## Preconditions

- Classify Bun's role before editing. Bun may be only the package manager, only the script runner, only the test runner, only the bundler, the runtime, or several of these at once.
- Do not treat Bun package installation as proof that Bun runtime behavior works.
- Do not treat Bun runtime execution, Bun transpilation, Bun tests, or Bun bundling as TypeScript typechecking or declaration generation.
- Treat lockfile, trusted dependency, build target, and package entry changes as release-sensitive unless proven internal.
- Treat Elysia-on-Bun deployment settings as runtime contracts, not local development conveniences.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep Bun-specific APIs in Bun-owned runtime files, adapters, tests, or package entrypoints.
- Keep Bun package manager changes aligned with `bun.lock`, `bunfig.toml`, CI, Docker, and workspace ownership.
- Preserve existing Node, browser, edge, Jest, Vitest, TypeScript, and package-consumer contracts unless the task explicitly asks to migrate them.
- Isolate Bun-only APIs behind runtime-owned adapters when Node, browser, edge, or test portability remains a project contract.
- Keep server runtime settings explicit when long-lived requests, streaming, WebSockets, uploaded files, generated exports, or reverse proxies are involved.
- Add focused tests or package checks only when they protect changed Bun runtime, package manager, test runner, build, or public package behavior.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify every Bun signal by role before editing:
   - `bun install`, `bun add`, `bun remove`, `bun update`, `bun.lock`, `trustedDependencies`, and `[install]` are package manager signals.
   - `bun <file>`, `bun --watch`, `bun run --bun`, `#!/usr/bin/env bun`, `Bun.serve`, `Bun.file`, `Bun.write`, `Bun.spawn`, `Bun.$`, and preload settings are runtime signals.
   - `bun test`, `bun:test`, and `[test]` are test runner signals.
   - `bun build`, `Bun.build`, `--compile`, and build target settings are bundler or compiler signals.
   - `bun run <script>` is script execution until the script body proves a more specific role.
2. Determine package manager ownership from `packageManager`, Bun lockfiles, other lockfiles, CI, Docker, workspace config, and `bunfig.toml`. If `bun.lock` exists, treat Bun as the dependency owner unless current project evidence says otherwise.
3. Do not delete `bun.lockb`, create `bun.lock`, or switch between npm, pnpm, Yarn, and Bun lockfiles as a side effect. If multiple lockfiles exist, identify whether the state is migration, legacy compatibility, or intentional parallel ownership before editing dependencies.
4. For Bun installs, check frozen lockfile behavior, workspace filters, linker mode, global virtual store, cache settings, registry settings, overrides, resolutions, patched dependencies, peer dependency behavior, optional dependency behavior, OS, CPU, and libc-sensitive packages when relevant.
5. Treat `trustedDependencies` as install-time code execution policy. Omitted, explicit array, and empty array each have different trust semantics. Do not broaden trust with a generic trust-all action. If a native package or binary install fails, inspect blocked lifecycle scripts, trust only the required package, and verify with a fresh install and real import or CLI use when a configured intent exists.
6. Do not claim Bun runs TypeScript as typecheck. Bun runtime execution and `Bun.Transpiler` strip or transform syntax for execution; they do not run the TypeScript checker, emit declarations, or prove generic, JSX, path alias, or public type correctness.
7. Do not claim Bun bundling replaces TypeScript build output. Bun build output proves bundling for the selected target and format, not `tsc --noEmit`, declaration emit, or downstream TypeScript consumer compatibility.
8. For TypeScript changes in a Bun project, keep the existing typecheck intent and declaration pipeline. For libraries, inspect declaration output when package exports, path aliases, public types, or build output change. Source-only aliases must not leak into public declarations unless consumers can resolve them.
9. Align Bun and TypeScript JSX settings when JSX runtime, factory, fragment, or import source changes. TypeScript seeing one JSX runtime while Bun transpiles another is a runtime contract bug.
10. For Bun bundling and package output, distinguish `bun run build` from direct Bun bundler usage. Confirm script bodies before treating a build as Bun bundling. Choose target and format according to actual consumers; Bun-targeted output is not automatically Node-compatible.
11. If Node consumers are supported, do not emit package entrypoints that rely on Bun-only APIs, Bun-only wrappers, or Bun-only module resolution unless the package clearly exposes a Bun-specific entry.
12. Treat Bun runtime as Node-compatible, not Node itself. JavaScriptCore, Node API compatibility gaps, native addons, Node internals, worker options, child process IPC, stream/backpressure, crypto/FIPS, watch behavior, Prisma CLI, sharp, Playwright, and esbuild all need targeted evidence when touched.
13. For Bun server changes, check idle timeout and long-lived request behavior. Plain `Bun.serve`, Elysia `serve.idleTimeout`, SSE, streaming AI responses, long uploads, downloads, exports, and quiet proxy connections may need explicit timeout policy.
14. For WebSocket changes, review `idleTimeout`, `maxPayloadLength`, `backpressureLimit`, `closeOnBackpressureLimit`, compression, and slow-client behavior. A connection opening successfully does not prove memory-safe backpressure behavior.
15. For multi-core deployment, distinguish single-process Bun behavior from clustered or multi-worker deployment. Treat `SO_REUSEPORT` and same-port multi-process assumptions as platform-sensitive, especially across Linux, macOS, Windows, containers, and hosting platforms.
16. For `Bun.serve({ routes })`, Elysia mounts, native routes, and framework interop, benchmark or test the actual route structure instead of assuming every request uses the same optimized path.
17. For `bun build --compile` or single executable output, check target OS, architecture, libc, executable permission, CPU requirements, dynamic files, `.d.ts` or source files used by runtime generators, native addons, and externalized packages.
18. Do not assume bundling eliminates `node_modules`. Instrumentation, monkey-patching, native modules, dynamic loading, OpenTelemetry, database drivers, and generated clients may require explicit externals and deployed runtime dependencies.
19. Treat minification as an observability decision. Full minify can damage function-name-based tracing, stack readability, and instrumentation. Prefer smaller minification scopes when tracing or production diagnostics depend on names.
20. For Docker and platform deploys, verify build context, workspace package copying, final base image, runtime user, executable path, `PORT` environment binding, health checks, signal handling, and reverse proxy expectations.
21. Treat benchmarks as workload evidence, not framework marketing. Use a load generator and scenario that are fast enough to drive Bun, and include real handler, serialization, database, TLS, proxy, streaming, or WebSocket paths when those paths changed.
22. Check shebang and runner behavior. A CLI with `#!/usr/bin/env node` may execute under Node even when launched through Bun. Do not call a path Bun-runtime-verified unless the entrypoint actually ran under Bun.
23. Use Bun's test runner only when the project intentionally uses it or the task targets Bun. Do not silently migrate Jest or Vitest tests to `bun:test`. Treat mocks, snapshots, preloads, globals, path aliases, coverage, isolation, and parallelism as migration-risk areas.
24. Do not update Bun snapshots as a generic fix. Snapshot updates require intended output change, diff inspection, and a follow-up run without update mode through configured intents.
25. Choose configured verification intents that cover typecheck, build, tests, package metadata, package artifact risk, docs examples, Bun runtime behavior, Bun test behavior, server timeout behavior, WebSocket backpressure, compile artifact behavior, Docker runtime, and mustflow contract checks when available. Report missing frozen install, Bun runtime, Bun test, declaration, package artifact, native dependency, Node compatibility, Docker, or CI verification.

<!-- mustflow-section: postconditions -->
## Postconditions

- Bun's role is explicit: package manager, runtime, script runner, test runner, bundler, transpiler, or mixed.
- Bun lockfile, install, workspace, trust, and lifecycle behavior is aligned with project ownership.
- Bun runtime, test, bundler, TypeScript, and declaration claims are not conflated.
- Bun-only APIs do not leak into Node, browser, edge, or shared package surfaces unintentionally.
- Bun server timeout, WebSocket backpressure, clustering, compile target, Docker, PORT, observability, native dependency, shebang, Node compatibility, and package consumer risks are handled or reported.

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

Report missing frozen install, Bun runtime, Bun server, WebSocket, compile artifact, Docker, Bun test, declaration output, package artifact, Node compatibility, native dependency, CI, observability, benchmark, or snapshot review verification intents when those surfaces change.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If Bun's role is unclear, stop changing runtime or dependency behavior and inspect scripts, lockfiles, `bunfig.toml`, CI, Docker, and entrypoints.
- If lockfile ownership conflicts, do not run dependency migration or generate a new lockfile unless the task explicitly asks for migration.
- If Bun runtime execution succeeds but typecheck or declarations are unverified, report that gap instead of claiming TypeScript correctness.
- If a package works under Bun but claims Node support, repair the Node-compatible entry or report the compatibility risk.
- If a server works locally but has no timeout, backpressure, port, signal, or Docker evidence, report the deployment risk instead of claiming production readiness.
- If a single executable works on the build machine only, report target CPU, OS, libc, dynamic dependency, and instrumentation gaps.
- If a native dependency, lifecycle script, or trusted dependency change cannot be verified, keep the change scoped and report release-sensitive risk.

<!-- mustflow-section: output-format -->
## Output Format

- Bun role classification
- Package manager, lockfile, and trust notes
- Runtime, TypeScript, bundler, and test runner notes
- Server timeout, WebSocket, cluster, compile, Docker, observability, benchmark, native, shebang, Node compatibility, or package consumer risks
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Bun risk
