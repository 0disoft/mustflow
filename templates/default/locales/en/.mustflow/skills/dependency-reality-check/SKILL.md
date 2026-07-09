---
mustflow_doc: skill.dependency-reality-check
locale: en
canonical: true
revision: 9
lifecycle: mustflow-owned
authority: procedure
name: dependency-reality-check
description: Apply this skill when a task assumes, adds, removes, imports, invokes, installs, audits, or documents a package, runtime, framework, tool, command, service, platform capability, workspace package contract, package.json dependency role, peer dependency contract, public type dependency, export/import boundary, TypeScript path alias, build/test/release package graph edge, supported-version policy, security patch path, ecosystem maturity claim, maintainer-risk assumption, runtime portability claim, edge or serverless compatibility claim, critical-path dependency choice, or experimental technology placement, especially for AI-suggested dependencies, monorepo package metadata, core backend stack choices, or supply-chain-sensitive changes.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.dependency-reality-check
  command_intents:
    - changes_status
    - changes_diff_summary
    - build
    - test_release
    - mustflow_check
---

# Dependency Reality Check

<!-- mustflow-section: purpose -->
## Purpose

Prevent code, docs, tests, and final reports from assuming unavailable packages, tools, commands, runtimes, services, or platform capabilities.

<!-- mustflow-section: use-when -->
## Use When

- A change adds, removes, renames, imports, invokes, or documents a dependency, tool, runtime, command, plugin, service, or platform feature.
- A JavaScript or TypeScript workspace package changes `package.json`, `exports`, `imports`,
  `dependencies`, `devDependencies`, `peerDependencies`, `peerDependenciesMeta`,
  `optionalDependencies`, workspace protocol ranges, public declaration types, package entrypoints,
  or package-boundary import rules.
- A JavaScript or TypeScript change relies on `tsconfig.paths`, bundler aliases, test resolver
  aliases, TypeScript project references, task graph selection, affected builds, package pruning,
  deploy output, or release tooling to prove that an import is valid.
- An AI-generated patch, assistant suggestion, copied snippet, or generated docs introduce a package name that could be hallucinated, misspelled, abandoned, lookalike, or unnecessary.
- A change adds package-manager scripts, package lifecycle hooks, build downloads, binary installers, lockfile changes, audit suppression, vulnerability scanner output, or CI dependency gates.
- A solution relies on a package manager, binary, environment variable, browser API, operating-system command, hosted service, or optional integration.
- A dependency or platform is proposed for authentication, payment, database, migrations, authorization, cryptography, deployment, queueing, file storage, email, or another survival path where failure can stop the product.
- A small, experimental, single-maintainer, fast-moving, or platform-specific dependency is proposed and the task needs to decide whether it belongs in a differentiating feature or a core operating path.
- A language runtime or web framework choice needs to prove supported or LTS version policy, end-of-life avoidance, security advisory response, dependency lock behavior, smoke-test coverage, deployment path, and rollback path.
- A JavaScript or TypeScript runtime claim treats Node, Bun, Deno, serverless functions, edge runtime, Web-standard adapters, or Node compatibility modes as interchangeable without checking which APIs, packages, native modules, filesystem access, connection reuse, or platform features the code actually uses.
- A framework feature such as server actions, route handlers, edge middleware, framework cache, ORM relation helpers, or hosted platform storage is proposed for core business logic rather than for delivery, persistence, or infrastructure glue.
- Documentation or design claims that a technology has enough ecosystem support, production use, migration path, failure examples, security response, or maintainer coverage.
- A generated instruction tells another agent or user to run a tool that may not be declared in the repository.
- External copied source material introduces dependency names, package snippets, install guidance, lifecycle scripts, binary downloads, or supply-chain claims that must be checked against repository declarations.
- A failure may be caused by a missing install, mismatched version, unsupported runtime, or unavailable command.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes repository-local prose and does not mention tools, runtime behavior, package metadata, or commands.
- The dependency is already proven by the current task context and no dependency-facing surface changes.
- The user explicitly asks for a speculative design that should not be implemented or verified yet.
- The task only decides whether external code, prose, assets, prompts, or examples may be copied into the repository; use `provenance-license-gate` for that part.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The dependency, tool, command, runtime, service, or platform capability being assumed.
- Package, lock, config, import, script, command-intent, or documentation files that declare or reference it.
- For JavaScript or TypeScript monorepos: package role (app, library, plugin, tooling package),
  package-manager workspace protocol, package boundary, package `exports` and `imports`, public
  declaration files, emitted JavaScript imports, peer host package, and whether the package is
  published, packed, bundled, deployed, or only used inside the repository.
- TypeScript, bundler, and test resolver evidence when aliases are involved: `baseUrl`, `paths`,
  package self-reference, project references, Vite/Jest/Vitest/Webpack aliases, and whether emitted
  JavaScript, declarations, package manager installs, task graphs, and release tools resolve the
  same package edge.
- The minimum version, capability, or availability claim if one is required.
- Registry name, package scope, lockfile entry, provenance or maintainer expectation, install script risk, and whether the dependency is runtime, development, fixture-only, transitive, or optional.
- Dependency role criticality: decorative utility, product-experience feature, operational support, or survival path such as identity, money, durable data, permissions, security, migrations, deployment, queues, or file ownership.
- Runtime and framework patchability: supported-version or LTS expectation, end-of-life status, security advisory channel, update cadence, dependency-lock behavior, deployment artifact, smoke-test surface, rollback route, and whether the choice is experimental, regulated, or core-path-facing.
- Runtime compatibility boundary: whether code imports Node-specific APIs, Bun or Deno globals, edge-only APIs, native modules, filesystem access, framework request objects, environment reads, ORM clients, or platform storage and queue objects outside delivery or infrastructure layers.
- Ecosystem and maintainer context when available from approved tooling or existing metadata: maintainer count, organization or foundation backing, release history, issue handling, security policy, migration docs, failure cases, license clarity, tests, alternatives, and hiring or support availability.
- Vulnerability, license, audit, lifecycle-script, binary-download, package-age, maintainer-change, and fork-or-replacement context when those details are available from approved repository tooling or existing metadata.
- Relevant command-intent contract entries for build, package, test, or documentation verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Align dependency declarations, imports, scripts, command metadata, tests, and docs that describe the same capability.
- Prefer existing repository dependencies and declared command intents before adding new packages or tools.
- Do not install packages, widen runtime requirements, or introduce new external services unless the user request and repository contract support it.
- Do not claim a dependency is available just because it exists on the internet or in another project.
- Do not add an AI-suggested dependency merely because its name sounds plausible. Treat plausible-but-undeclared packages as hallucination or slopsquatting risk until repository evidence or explicit user approval supports them.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the assumed dependency or capability and where the task relies on it.
2. Check the repository declarations first: package metadata, lockfiles, config files, imports, command intents, docs, and templates.
   - In monorepos, treat each package's `package.json` as that package's external contract, not as
     a convenience install list. Check the package that owns the import, not only the workspace root.
   - Classify the package before classifying its dependencies: final app, published library,
     framework/plugin package, internal package, tooling package, or test/fixture-only package.
   - For package-boundary changes, inspect emitted JS imports, generated declaration files,
     `exports`, `imports`, self-reference tests or examples, workspace ranges, and package manager
     behavior for pack/publish/deploy output.
   - Treat `tsconfig.paths` as a TypeScript resolver hint, not as a dependency declaration, package
     manager edge, runtime rewrite, or public boundary rule. If a path alias points at a sibling
     package's `src/`, the package graph may be lying even when typecheck is green.
3. Decide whether the dependency is present, absent, optional, transitive, host-provided, or external.
   - If emitted JavaScript imports a package, it is normally a runtime dependency of the emitting
     package unless it is bundled, externalized by a documented host contract, or intentionally peer.
   - If a public `.d.ts` type references an external package, consumers need that type dependency
     through `dependencies` or a documented `peerDependencies` contract. Do not hide public type
     requirements in `devDependencies`.
   - If the dependency is a host singleton such as React, Vue, ESLint, Vite, Webpack, Fastify,
     NestJS, Prisma, a bundler plugin host, or another framework/runtime host, prefer a
     `peerDependencies` contract plus local `devDependencies` for this package's tests and builds.
   - If the package supports optional host integrations, prefer optional peer metadata for
     consumer-provided hosts. Use `optionalDependencies` only for direct runtime dependencies that
     the code can safely conditionally load and survive without.
   - If a package imports a dependency only because another dependency currently brings it transitively,
     treat that as an undeclared dependency bug rather than a valid declaration.
4. For AI-suggested names, check for hallucination and lookalike risk before accepting the import: exact package name, namespace, known local precedent, lockfile presence, and whether an existing dependency already solves the need.
5. If present, verify that the requested capability and version expectation match the declared dependency.
6. If absent, prefer an existing local alternative. Add a new dependency only when it is necessary, within the task scope, and reflected in the package metadata and lockfile policy.
7. Treat package scripts and lifecycle hooks as executable code. Review `preinstall`, `install`, `postinstall`, `prepare`, build-time downloads, generated binaries, and shell-spawning scripts before accepting them.
8. Check supply-chain-sensitive metadata when available through approved tooling or existing files: package scope, maintainer or organization expectation, package age, maintainer changes, install scripts, binary downloads, transitive dependency impact, license constraints, and fixture-only versus runtime use.
9. Classify the dependency by product criticality.
   - Decorative or utility dependencies can be small when they are pure, replaceable, locked, and easy to remove.
   - Product-experience dependencies such as charts, editors, calendars, or drag-and-drop should be wrapped or localized when they can spread through the UI.
   - Operational dependencies such as logs, queues, caches, search, file processing, and email need maturity, observability, failure handling, and a replacement path.
   - Survival-path dependencies such as authentication, payment, database access, migrations, authorization, cryptography, deployment, and security should avoid fragile single-maintainer or experimental choices unless the project explicitly accepts the risk.
10. Place new or experimental technology intentionally. Prefer proven, boring dependencies for the survival path; reserve experimental technology for differentiating product areas such as UX, AI workflow, search experience, visualization, or internal tooling, and keep it isolated enough to replace.
    - For runtime and framework choices, judge the stack by whether security patches can be applied, tested, deployed, and rolled back quickly. Do not treat performance benchmarks or developer excitement as a substitute for a supported-version policy and a working patch circuit.
    - Keep experimental runtimes and fast-moving frameworks away from authentication, payment, authorization, database, migration, cryptography, and security-critical deployment paths unless the project explicitly accepts the risk and has a rollback plan.
11. For runtime portability claims, inspect dependency leakage by layer before accepting the claim.
    - Core and application code should not depend on Node-only APIs, Bun or Deno globals, edge-only globals, framework request objects, ORM clients, environment variables, or platform-specific queue and storage clients.
    - Delivery and infrastructure layers may use runtime or framework capabilities, but the choice should be visible as an adapter decision rather than scattered through use cases.
    - Treat Web-standard frameworks or adapters as a portability aid, not as proof that domain code is portable if provider SDKs, ORM clients, filesystem calls, or platform bindings still leak inward.
12. For monorepo package contracts, inspect import and export boundaries before accepting the
    dependency shape.
    - Outside a package, imports should use the package name and an explicitly exported entrypoint,
      not relative paths into sibling packages, `src/`, `dist/`, or internal folders.
    - `exports` should expose intentional public entrypoints. Broad globs such as `./*` need a
      package-level reason because they turn internal file layout into public API.
    - Internal package aliases should use package-private `imports` mappings when the runtime and
      toolchain support them. Do not make internal aliases look like public workspace packages.
    - Keep runtime exports and type exports aligned. A subpath that exists at runtime but not in
      declarations, or vice versa, is a consumer contract drift.
    - Treat `export *` barrels as possible public API leaks. Public exports should name the symbols
      the package commits to supporting.
   - Choose `workspace:*`, `workspace:^`, or another workspace range according to release policy:
      lockstep packages can use exact workspace coupling, while independently versioned public
      packages usually need a range that survives publish or pack output.
    - Root overrides and resolutions are emergency graph controls, not a substitute for correcting
      each package's own declarations.
13. Align package, build, test, deploy, and release graphs before accepting a monorepo import.
    - A compiling import is not proof that the consuming package declared the dependency. Check the
      consuming package's manifest and the package manager workspace graph.
    - Do not rely on root `node_modules`, root `dependencies`, broad `paths`, or transitive installs
      as proof that a package can survive production install, prune, deploy, pack, or publish output.
    - When a package imports another workspace package, prefer the real package name plus
      `workspace:` protocol where the package manager supports it. Plain semver for internal
      packages can hide registry fallback or stale publish behavior.
    - Check whether task selection, affected tests, build cache keys, Docker or package pruning, and
      release tooling can see the same dependency edge. If the edge exists only in TypeScript
      aliases, the graph is incomplete.
    - Keep root dependency declarations for repository tooling unless the root itself is the
      runtime package. Runtime imports belong to the package that emits or bundles them.
14. Evaluate ecosystem maturity when the task depends on it: production examples, searchable error solutions, migration notes, security-response history, version stability, plugin ecosystem, older issue answers, support availability, and whether the direction is likely to hold over the next release cycles.
15. For small libraries, accept them only when they are small in role as well as code: simple, understandable, peripheral, safe to fork or reimplement, and not directly touching secrets, personal data, money, permissions, migrations, durable state, or security.
16. For vulnerability or audit output, separate runtime dependencies from fixture-only or intentionally vulnerable samples. Do not weaken audit gates, delete lockfiles, or add broad suppressions without a repository-owned reason.
17. For new dependencies, prefer pinned or lockfile-backed versions according to project policy. Avoid widening ranges or removing lockfiles to satisfy generated code.
18. Do not introduce new package-manager wrappers, vulnerability scanners, registry queries, or install commands inside this skill. Use configured command intents or report the missing verification surface.
19. If external source material is copied or closely adapted, activate `provenance-license-gate` for source, license, attribution, and copy-extent decisions before preserving the material.
20. Keep all dependency-facing surfaces aligned: package metadata, lockfiles when intentionally updated, command contract, docs, tests, installation notes, package `exports`, public declaration files, self-reference examples, workspace constraints, boundary lint rules, task graph inputs, deploy/prune smoke surfaces, and release graph evidence.
21. Run the narrowest configured verification that proves the dependency path used by the change.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every dependency or tool claim is backed by a repository declaration, configured command, host boundary, or explicit unverified-risk note.
- Critical-path dependency choices identify role criticality, maintainer concentration, ecosystem maturity, replacement path, and whether the dependency belongs in a survival path or a differentiating feature.
- Runtime and framework choices identify supported-version policy, end-of-life exposure, security patch path, smoke-test surface, deployment and rollback route, and whether experimental choices are isolated from survival paths.
- Runtime portability claims identify which APIs are confined to delivery or infrastructure and which would force core or application code to change when moving between Node, Bun, Deno, serverless functions, or edge runtime.
- New dependency requirements are reflected in the appropriate metadata and public documentation.
- Workspace package contracts reflect real consumers: emitted runtime imports, public type imports,
  peer hosts, optional integrations, workspace ranges, `exports`, and boundary lint rules agree
  instead of relying on root hoisting or transitive dependencies.
- TypeScript path aliases, bundler aliases, test resolvers, package manager workspace edges, task
  graphs, deploy/prune artifacts, and release tooling agree or the remaining graph drift is named.
- The final report states whether the dependency was existing, added, optional, unavailable, or intentionally not verified.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `build`
- `test_release`
- `mustflow_check`

Use a narrower configured test, package, or docs intent when it better proves the dependency path.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the dependency is missing, report the missing declaration or command instead of silently adding a workaround.
- If a package name appears hallucinated, lookalike, unowned, or unrelated to the project, reject it or ask for explicit approval before adding it.
- If a package adds lifecycle scripts, binary downloads, audit suppressions, broad version ranges, or lockfile deletion, treat the change as supply-chain-sensitive and escalate to a security review before continuing.
- If the declared version lacks the needed capability, report the mismatch and avoid claiming support.
- If a dependency requires network, credentials, operating-system setup, or service access, stop at that boundary and name the unchecked requirement.
- If generated docs would instruct users to run undeclared tools, rewrite the docs to use declared commands or mark the tool as a manual prerequisite.

<!-- mustflow-section: output-format -->
## Output Format

- Dependency or capability checked
- Repository declaration or absence
- Role criticality, ecosystem maturity, maintainer-risk, and replacement-path boundary when relevant
- Supported-version, patchability, smoke-test, rollback, and experimental-placement boundary when relevant
- Runtime portability, framework feature leakage, and layer-containment boundary when relevant
- Surfaces synchronized
- Command intents run
- Skipped dependency checks and reasons
- Remaining dependency risk
