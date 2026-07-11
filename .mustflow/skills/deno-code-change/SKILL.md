---
mustflow_doc: skill.deno-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: deno-code-change
description: Apply this skill when Deno runtime code, deno.json, permissions, deno.lock, JSR or npm imports, tasks, tests, Deno.serve, Workers, WebSockets, compile or desktop output, Node compatibility, Deno Deploy, or Deno-related CI and release behavior are created, changed, reviewed, migrated, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.deno-code-change
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

# Deno Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Deno runtime, permission, module graph, package, type-check, task, test, server, Worker,
compiled artifact, deployment, and release contracts while making focused changes. Do not treat
Web-standard APIs, Node compatibility, a successful local run, or a passing CI job as proof that
the same code has identical permissions, native dependencies, runtime versions, state, and
deployment behavior everywhere.

<!-- mustflow-section: use-when -->
## Use When

- Deno TypeScript or JavaScript, `deno.json`, `deno.jsonc`, `deno.lock`, import maps,
  workspaces, tasks, permissions, lint, formatting, tests, coverage, compile, bundle, desktop, or
  package metadata changes.
- `Deno.serve`, HTTP, WebSocket, Worker, subprocess, FFI, filesystem, environment, network,
  cancellation, async concurrency, KV, Cache API, or storage behavior changes.
- JSR, `npm:` imports, npm lifecycle scripts, Node compatibility, native addons, package-manager
  migration, lockfile import, or Deno-backed Node shims change.
- Deno Deploy, deployment config, build and runtime contexts, preview or production timelines,
  migrations, environment variables, regions, scaling, or CI/CD changes.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is ordinary TypeScript or JavaScript with no Deno runtime, package, permission, task,
  test, compile, or deployment boundary.
- Node, Bun, Cloudflare Workers, another edge runtime, or a framework-owned adapter is the only
  runtime changed; use its matching skill.
- The task asks only for the current Deno version; use source-freshness guidance unless code or
  durable documentation changes too.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Deno version sources, supported runtime range, `deno.json`, lockfile, import map, workspace,
  task definitions, package-manager files, environment policy, CI matrix, and deployment target.
- Module ledger: local, JSR, npm, URL, Node built-in, generated, vendored, and dynamic imports;
  lock and cache policy; lifecycle scripts; native dependencies; and runtime adapter paths.
- Permission ledger: read, write, net, env, run, ffi, import, system, prompt, permission sets,
  Worker inheritance, broker usage, audit evidence, OS isolation, and untrusted-code boundary.
- Execution ledger: run versus check, task graph, test selection, Worker ownership, server isolate
  count, cancellation, queue bounds, storage ownership, compile identity, and shutdown behavior.
- Deploy ledger when relevant: Classic versus current platform, builder and runtime versions,
  source versus dashboard configuration, contexts, timelines, persistent state, migrations,
  regions, secrets, preview/production smoke, and rollback.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read repository-pinned Deno and deployment evidence before using recent APIs, flags, task fields,
  permission behavior, Node compatibility, desktop features, or Deploy behavior.
- Refresh official Deno, JSR, and Deploy sources before preserving exact latest-version, runtime,
  region, support, deprecation, migration, or shutdown claims. Treat the 2026-07-11 source material
  as a snapshot, not a permanent current-state contract.
- Separate stable runtime status from feature status. Desktop packaging, Worker permission options,
  permission brokers, flags, and deployment behavior can have different stability and availability.
- Determine whether the target is a local CLI, server, library, compiled binary, desktop app,
  self-hosted service, or Deno Deploy app before changing configuration or permissions.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Make focused Deno source, config, lockfile, tests, docs, package, CI, compile, and Deploy changes
  required by the task.
- Add explicit permission, module, type-check, test, cancellation, storage, migration, and
  deployment verification when the changed behavior needs it.
- Preserve repository-pinned runtime, frozen install, lockfile, and compatibility paths unless the
  task explicitly accepts a migration.
- Do not add `-A`, broad `--allow-*`, unrestricted lifecycle scripts, floating runtime tags,
  implicit network imports, native execution, or dashboard-only production changes as shortcuts.

<!-- mustflow-section: procedure -->
## Procedure

1. **Classify runtime, feature, and deployment tracks.**
   - Record the repository-pinned Deno version, proposed target, feature stability, CI version,
     compile target, and deployment builder/runtime separately.
   - Recheck every dated status before use. In the 2026-07-11 snapshot, Deno 2.9 behavior and the
     announced 2026-07-20 Deploy Classic shutdown were current source facts; neither is an
     undated future guarantee.
   - Treat a Node compatibility version as a compatibility target, not proof that Deno is running
     a Node binary or implements every Node detail.
2. **Separate execution from type checking and output.**
   - Deno can execute TypeScript without proving the full type contract. Keep `deno check`, editor
     diagnostics, tests, declaration output, framework checks, and runtime execution as distinct
     evidence surfaces.
   - Check compiler options, JSX, imports, DOM/library types, npm package types, generated types,
     and package exports against the declared Deno track.
   - Do not infer runtime globals from successful Node ambient type checking. Import Node globals
     such as `Buffer` from their explicit `node:` modules when runtime availability matters.
   - For CommonJS interop, inspect extension, nearest package `type`, conditional exports, selected
     entry, and the entire ESM graph. A synchronous `require()` boundary cannot consume an ESM
     graph containing top-level await merely because Deno supports other ESM-from-CJS cases.
   - Do not infer command authority from `deno.json` tasks. Map project commands to configured
     mustflow intents.
3. **Own the module graph and dependency supply chain.**
   - Distinguish static and analyzable imports from runtime-computed imports and ordinary network
     access. Permission denial alone does not prove the initial module graph cannot load code.
   - Use lockfiles, frozen or cached-only policy, approved import hosts, vendoring, and exact
     package-manager ownership where the repository contract requires reproducibility.
   - Keep JSR, `npm:`, npm aliases, import maps, `.npmrc`, lockfiles, workspace catalogs, and
     runtime adapter subpaths synchronized. Do not mix independently pinned Hono core and Deno
     adapter versions.
   - Treat `nodeModulesDir` and the node-modules linker as installation architecture, not local
     convenience. Choose none, auto, or manual from real disk-layout, framework, lifecycle-script,
     package-manager, and native-addon needs; use hoisting only for a proven compatibility boundary.
   - Review npm lifecycle scripts and native addons explicitly. A package resolving successfully
     does not prove its install script ran. Native addons can require a local `node_modules`,
     narrowly approved install scripts, runtime FFI permission, public Node-API compatibility, and
     an artifact built for the target OS and architecture.
   - Inspect conditional `exports` and actual selected entries when Node and Deno differ. Prefer
     explicit `node:` built-in specifiers over bare names whose resolution can be shadowed by
     imports or package dependencies.
   - Treat ignored published `file:` or `link:` dependencies and undeclared hoisted dependencies
     as package defects. Do not hide them permanently by switching the whole workspace to hoisted layout.
   - Determine the configuration owner from the command working directory and explicit `--config`
     contract, not from the source entrypoint path. Keep local tooling, CI, IDE, and deployment on
     the same intended root.
   - Distinguish inline `imports` from standard external import maps, exact aliases from slash
     prefixes, and narrow migration scopes from global dependency policy. Do not use aliases to
     bypass workspace package `name` and `exports` boundaries.
   - Keep resolver policy such as lock, linker, node-modules mode, minimum dependency age, script
     approval, links, and vendoring at the workspace owner. Treat catalogs as npm version policy,
     not import aliases, and avoid competing catalog owners.
   - Review a Deno lockfile as additive resolution history. Presence does not prove current reachability;
     unexpected additions still require supply-chain review, and routine feature changes should
     not delete and recreate the lockfile merely to remove old entries.
4. **Review permissions as process-to-OS policy.**
   - Separate module import permission from runtime file, network, environment, subprocess, FFI,
     and system access. Record allow and deny scopes, host/port semantics, paths, and prompt policy.
   - Treat dependencies in one isolate as sharing the application's granted permissions. Deno
     permissions are not per-package isolation.
   - Treat Worker permissions as inherited unless the supported runtime and explicit Worker
     configuration prove they are reduced. A Worker thread alone is not a sandbox.
   - Treat `--allow-run`, FFI, native addons, writable executable paths, dynamic-loader variables,
     and permission brokers as escape or authority boundaries requiring OS-level isolation.
   - Use non-interactive explicit policy in CI and production. Permission prompts and runtime
     revocation are not durable deployment access control.
5. **Review tasks, tests, and caching.**
   - Keep task inputs, outputs, environment variables, dependencies, platform, and external-state
     assumptions explicit before enabling cached task results.
   - Do not cache work that depends on undeclared time, network, database, secret, or service state.
   - Use changed, related, retry, repeat, shard, snapshot, leak-trace, coverage, and concurrency
     features only when supported by the pinned runtime and repository test contract.
   - Preserve flaky-test reporting. A retry that later passes is evidence, not a clean first-pass run.
   - Decide whether type checking belongs to the complete `deno check` graph or the test run. Use a
     no-check test path only after every production, test, CLI, generated, and conditional entrypoint
     is covered by the separate check.
   - Treat changed, related, filtered, and sharded tests as fast feedback, not completeness proof.
     Dynamic imports, environment, databases, fixtures, shared schemas, and uneven large test files
     can escape static selection or produce unbalanced shards.
   - Isolate parallel tests by port, temporary directory, database or KV namespace, account, cache
     key, and coverage directory. Preserve shuffle seeds and report retries as flakiness evidence.
   - Refresh sanitizer defaults for the pinned Deno version. In the 2026-07-11 source snapshot,
     resource and operation sanitizers were no longer safe to assume enabled by default; enable
     explicit resource, operation, exit, timeout, or leak-trace checks where lifecycle correctness
     depends on them.
   - Per-test permission configuration can only narrow the CLI-granted ceiling; it cannot create
     authority the test process never received. Keep permission-free library tests separate from
     privileged adapters instead of granting the suite all permissions.
   - Keep raw coverage collection separate from report generation and shard outputs separate until
     merge. Review line, branch, and function gaps rather than optimizing one aggregate percentage.
6. **Review HTTP, WebSocket, Worker, and async behavior.**
   - Measure CPU-bound parsing, serialization, compression, regex, crypto, and transforms separately
     from async I/O. `async` does not move CPU work off the isolate.
   - Use bounded Worker pools and bounded queues for CPU work. Account for structured-clone cost,
     transferable ownership, Worker permission inheritance, graceful shutdown, and idempotent side effects.
   - Treat parallel server isolates as independent memory. Keep exact sessions, locks, rate limits,
     WebSocket rooms, and counters in an appropriate shared external store.
   - Propagate `AbortSignal` through supported operations. Promise timeout only stops waiting; it
     does not cancel the original work.
   - Bound `Promise.all`-style concurrency by connection pools, rate limits, memory, descriptors,
     and queue capacity.
   - Preserve stream backpressure end to end. Avoid unbounded buffering, unnecessary string/byte
     conversion, and per-request custom HTTP clients; reuse owned clients and close them at shutdown.
   - Cancel or consume unused response bodies, and combine client disconnect with internal deadline
     signals when downstream APIs support cancellation.
   - Batch Deno KV reads and atomic writes around real access patterns, and measure FFI dispatch
     overhead before marking short native calls nonblocking.
   - Verify automatic compression, HTTP/2, WebSocket upgrade, request-abort semantics, proxy
     buffering, backpressure, resource closure, and graceful shutdown on the pinned runtime and
     real deployment path.
7. **Review compile and desktop artifacts.**
   - Treat app name, storage directories, included files, permissions, target OS/architecture,
     WebView versus embedded browser engine, signing, installer format, update behavior, and
     persistent application identity as public contracts.
   - Do not assume cross-built desktop output renders identically across system WebViews. Keep
     renderer choice, asset paths, HMR/dev behavior, binary size, and target smoke tests explicit.
   - Ensure compiled local storage, caches, or KV identity cannot collide across unrelated apps.
8. **Review Deno Deploy as a separate platform contract.**
   - Identify Classic versus the current Deploy platform before applying any guidance. Do not
     assume projects, KV data, environment variables, domains, tokens, preview URLs, or rollback
     state migrate automatically.
   - Separate builder, development, preview, production, and runtime contexts. Verify exact runtime
     and command availability instead of assuming local or moving CI versions match Deploy.
   - Treat local filesystem and module memory as instance-local and replaceable. Keep durable
     correctness state, distributed locks, sessions, rooms, and migration coordination external.
   - Determine whether source configuration replaces dashboard configuration. Keep the owning
     source explicit and report dashboard-only fields that cannot be reproduced in source.
   - Make pre-deploy migrations idempotent and locked. A preview warmup does not prove production
     context, production data, or the production URL.
   - Verify production after revision activation and retain a tested rollback route.
9. **Review JSR publication and downstream consumers.**
   - Keep package manager and JSR/npm compatibility representation explicit. Test Deno source
     consumption and generated Node/npm JavaScript and declaration consumption separately.
   - Use explicit public return and property types where JSR slow-type rules or declaration
     generation require them.
   - Treat publication as immutable. Verify version, OIDC/provenance, exact registry visibility,
     bounded propagation retry, consumer installation, and tag order before completion.
10. **Verify the real contract.**
    - Cover type check, tests, permissions, frozen dependency resolution, server cancellation,
      repeated lifecycle, compiled output, target architecture, and deployment smoke according to
      the changed surface.
    - Report missing configured intents rather than running raw servers, deployment commands,
      installers, network fetches, or publishing commands.

<!-- mustflow-section: postconditions -->
## Postconditions

- Runtime, type-check, module graph, permissions, tests, tasks, Workers, storage, compile output,
  deployment, and publication each have an explicit owner and evidence boundary.
- Local Deno, Node compatibility, CI, builder, and Deploy runtime versions are not collapsed into
  one generic Deno environment.
- Permission grants do not masquerade as package isolation, hostile-code sandboxing, resource
  limits, or deployment authorization.
- State and migrations remain correct across isolates, instances, contexts, regions, retries, and rollback.

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

- If the Deno or Deploy track is unclear, preserve existing runtime and deployment behavior and
  report the missing version or platform evidence.
- If a dependency requires an npm lifecycle script, native addon, Node binary, or unsupported
  compatibility behavior, isolate and test that boundary instead of enabling all scripts globally.
- If permission reduction breaks startup, map the exact access from audit evidence; do not replace
  the policy with `-A`.
- If a Deploy migration lacks data, domain, secret, smoke, or rollback evidence, keep the old path
  active where still possible and report the migration as incomplete.

<!-- mustflow-section: output-format -->
## Output Format

- Deno runtime, feature, CI, compile, and Deploy tracks
- Module, package, permission, task, test, Worker, and state owners
- Compatibility, migration, deployment, and rollback decisions
- Verification evidence and configured intents run
- Skipped checks and remaining runtime, permission, package, native, or deployment risk
