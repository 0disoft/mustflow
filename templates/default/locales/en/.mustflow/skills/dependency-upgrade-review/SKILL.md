---
mustflow_doc: skill.dependency-upgrade-review
locale: en
canonical: true
revision: 5
lifecycle: mustflow-owned
authority: procedure
name: dependency-upgrade-review
description: Apply this skill when dependency versions, lockfiles, package manager metadata, security advisory fixes, generated dependency outputs, runtime engine constraints, Python runtime support, peer dependency contracts, framework plugins, TypeScript compiler tracks, CI actions, Docker base images, or toolchain versions are upgraded, downgraded, pinned, widened, regenerated, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.dependency-upgrade-review
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

# Dependency Upgrade Review

<!-- mustflow-section: purpose -->
## Purpose

Review dependency upgrades as runtime, build, security, package, and generated-output contract changes rather than as version-number edits.

<!-- mustflow-section: use-when -->
## Use When

- A dependency version is upgraded, downgraded, pinned, unpinned, widened, narrowed, replaced, or removed.
- A lockfile, package manager metadata, workspace constraint, runtime engine, peer dependency, optional dependency, feature flag, or generated dependency output changes.
- A security advisory, vulnerability scanner, Dependabot, Renovate, package audit, language audit, CI action update, Docker base image update, framework plugin update, formatter/linter/bundler update, ORM update, code generator update, protobuf/OpenAPI generator update, or toolchain update is reviewed or applied.
- A task claims a dependency change is "only patch", "only devDependency", "safe minor", "security-only", "transitive only", "lockfile only", or "no runtime change".
- A dependency update touches installation, publish output, generated clients, SDKs, native binaries, browser bundles, serverless or edge runtime, ESM/CJS/module format, Python markers, Go module graph, Cargo features, JVM dependency mediation, .NET target frameworks, Ruby/PHP/Swift lockfiles, Docker images, or CI actions.
- A Python runtime support floor, CI matrix, container image, `requires-python`, standard-library feature expectation, or security-default expectation changes as part of an upgrade.
- A TypeScript upgrade touches TypeScript 6 transition deprecations, TS6 stable API compatibility, TypeScript 7 RC compiler verification, TypeScript 7 nightly comparison, `@typescript/typescript6`, `tsc6`, `typescript@rc`, `@typescript/native-preview`, `tsgo`, compiler API consumers, declaration emit, framework typecheck wrappers, or editor language-service behavior.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- A brand-new dependency is proposed without upgrading an existing declaration; use `dependency-reality-check` first.
- Code imports or invokes an existing dependency but no dependency metadata, lockfile, runtime version, generated output, or package-manager contract changes.
- The task only updates prose that mentions a dependency and does not assert supported versions, install commands, runtime behavior, security status, or package metadata.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The dependency or tool being changed, old version or range, new version or range, direct or transitive status, and reason for the change.
- Ecosystem and package manager: JavaScript or TypeScript, Python, Go, Rust, JVM, .NET, Ruby, PHP, Swift, Docker, CI actions, or another declared system.
- Package declarations, lockfiles, workspace files, runtime-version files, package-manager config, toolchain files, CI/Docker files, generated outputs, and command contract entries.
- Release notes, migration notes, changelog, advisory range, fixed range, compatibility notes, or local issue evidence when available from approved context.
- Impacted runtime paths, build paths, test paths, generated clients, mocks, fixtures, docs examples, deployment images, and package publish output.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The upgrade is classified before editing as patch, minor, major, pre-1.0, security fix, transitive-only, toolchain-only, generated-output, runtime-engine, CI-image, or broad refresh.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Align dependency declarations, lockfiles, generated outputs, compatibility code, tests, docs, and package metadata that are directly required by the upgrade.
- Prefer the minimum version change that satisfies the feature or advisory.
- Keep unrelated modernization, formatting churn, dependency family refreshes, and broad package-manager rewrites out of a narrow upgrade.
- Do not delete and recreate lockfiles to hide the dependency graph change.
- Do not weaken tests, scanners, coverage gates, type checks, peer warnings, engine checks, or generated-output assertions to make an upgrade pass.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the upgrade and classify it: direct or transitive, runtime or development, patch/minor/major/pre-1.0/security/toolchain/generated/CI-image, and narrow or broad.
2. Identify the ecosystem and read the matching declaration surfaces.
   - JavaScript and TypeScript: package metadata, lockfile, workspace files, package-manager config, runtime version, TypeScript config, bundler/framework/test config, generated clients, and publish files.
   - Python: project metadata, dependency groups, constraints, lockfiles, requirements files, Python version files, test matrix, build backend, and packaging output.
   - Go: module files, workspace file, checksum file, vendored module metadata, generated code hooks, tool dependencies, and toolchain expectations.
   - Rust: manifest, lockfile, toolchain file, cargo config, features, default features, target-specific dependencies, build scripts, generated bindings, and crate publish surface.
   - JVM, .NET, Ruby, PHP, Swift: manifests, lockfiles, package-manager wrappers, toolchain files, dependency mediation rules, generated artifacts, and publish metadata.
   - Docker and CI: base image tags or digests, action versions, setup-tool versions, cache keys, matrix versions, deployment image metadata, and runtime smoke surfaces.
3. Build a dependency ledger before editing: old version, new version, direct or transitive path, source registry or image source, lockfile entry, integrity or checksum, engine or platform requirement, peer or feature changes, optional or platform-specific packages, and generated-output changes.
4. For patch upgrades, verify that the patch does not change runtime defaults, parser strictness, security behavior, peer requirements, engine support, native binaries, module format, generated output, or install scripts.
5. For minor upgrades, read release notes or migration notes when available. Check new defaults, deprecations, peer and engine changes, plugin compatibility, generated output, bundle size, runtime adapter behavior, and framework integration behavior.
6. For major upgrades, treat the change as a migration. Require migration notes, public API change classification, config schema review, CLI flag review, plugin API review, codemod or manual migration notes, full caller review, rollback plan, and broad verification.
7. For pre-1.0 or calendar-versioned packages, do not trust SemVer labels. Classify risk by actual contract changes and release notes.
8. For security upgrades, keep the patch narrow. Identify advisory id, affected range, fixed range, direct or transitive path, exploit-relevant code path, minimum patched version, scanner recheck, and whether stricter validation, escaping, TLS, redirect, auth, or parser behavior can break callers.
   - For lockfile-only or transitive vulnerability alerts, do not treat the lockfile line as the root cause. Trace the vulnerable package back to the direct dependency or framework plugin that resolves it, then update the narrowest parent version, override, or package-manager resolution that satisfies the fixed range.
   - After regenerating the lockfile, confirm the old vulnerable version is absent from the resolved graph and that any override is recorded in the manifest rather than hidden as unexplained lockfile churn.
9. Review the lockfile as a graph, not a blob. Check direct and transitive replacements, newly introduced packages, removed packages, optional/platform packages, source URLs, integrity or checksum changes, peer resolution, engine requirements, native prebuilds, and postinstall or lifecycle scripts.
10. Review runtime boundaries that dependency upgrades commonly break: ESM/CJS and package `type`, `exports` and conditional exports, browser/node/edge conditions, Node engine support, Python dependency markers and extras, Go module path changes, Cargo feature unification, native builds, SSR/client split, WebView/native split, and generated client or SDK types.
11. Treat framework, plugin, code generator, formatter, linter, bundler, ORM, protobuf, OpenAPI, GraphQL, database driver, and test-runner upgrades as behavior changes when their output, config schema, plugin API, CLI flags, or generated code can change.
12. For Python runtime upgrades, treat `requires-python`, CI matrices, base images, dependency markers, wheels, packaging output, standard-library API availability, and security-default changes as one compatibility contract. Review version-gated standard-library usage and changed defaults before assuming the upgrade is only a dependency resolution change.
13. For Python upgrades that adopt newer standard-library behavior, call out affected paths such as archive extraction, subprocess handling, async lifecycle, import/resource loading, typing surfaces, data-class shapes, and diagnostic flags. Keep fallbacks or compatibility wording when the repository still supports older interpreters.
14. For TypeScript upgrades, classify the compiler track explicitly: TS6 stable API track through `@typescript/typescript6` and `tsc6`, TS7 RC compiler track through `typescript@rc` and `tsc`, TS7 nightly track through `@typescript/native-preview` and `tsgo`, future TS7 stable track through the stable `typescript` package, editor extension preview, or framework-owned wrapper. Do not treat a nightly package as a stable replacement for the `typescript` package unless the repository policy says so.
15. For TypeScript 6, review deprecations as future TypeScript 7 removals. For TS7 RC, review compiler parity, declaration emit, watch/incremental, generated-output, and framework wrapper risks. For TS7 nightly, use `tsgo` only as an optional comparison path. Keep compiler API, transformer, ESLint, language-service plugin, and framework wrapper consumers on the TS6 API track until their owners explicitly support the TS7 API surface.
16. For new dependencies introduced by the upgrade, invoke the `dependency-reality-check` decision path: license, maintainer risk, provenance, lifecycle scripts, binary downloads, package age, transitive size, supply-chain risk, and replacement path.
17. For Docker base images and CI actions, review them as dependencies. Check image/action source, version pinning policy, digest use when required, runtime version changes, security patch reason, cache impact, and deployment smoke coverage.
18. Synchronize dependent surfaces: generated code, snapshots, mocks, fixtures, examples, SDK clients, OpenAPI or GraphQL artifacts, README install guidance, migration docs, changelog, Docker/CI docs, and package publish metadata.
19. Select verification from the command contract based on risk. Patch and narrow transitive changes can use focused checks when they cover the touched path; major, framework, runtime-engine, generated-output, security-sensitive, Docker, CI-action, Python runtime, or TypeScript compiler-track updates need broader checks.
20. Report skipped checks explicitly. If the command contract lacks a dependency graph, package verification, Python runtime matrix, TypeScript declaration, or compiler-comparison intent, do not invent raw package-manager commands; report the missing configured intent.

<!-- mustflow-section: postconditions -->
## Postconditions

- The final state shows exactly which dependency contract changed and why.
- The lockfile and declaration files agree.
- Direct and transitive changes are understood, not hidden behind lockfile volume.
- Runtime engine, peer dependency, optional/platform package, feature, module-format, generated-output, and publish-surface risks are classified.
- Python runtime upgrades classify standard-library availability, changed defaults, packaging output, and security-behavior impact.
- TypeScript compiler-track changes distinguish TS6 stable API compatibility, TS7 RC compiler verification, TS7 nightly comparison work, and future TS7 stable adoption.
- Security fixes are narrow unless the user explicitly accepted a broader modernization.
- Tests and scanners were not weakened to pass the upgrade.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured intent that proves the actual upgraded dependency path. Use broader verification for major upgrades, runtime or framework upgrades, security-sensitive dependencies, generated-output changes, publish-surface changes, Docker image changes, CI action changes, and package-manager behavior changes.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If release notes, advisory range, fixed range, or migration guidance are missing, mark the upgrade as higher risk instead of calling it safe.
- If a lockfile diff introduces unrelated dependency churn, split the change or explain why the graph update is necessary.
- If peer dependency, engine, optional dependency, native build, or platform warnings appear, resolve or report them. Do not dismiss them because the local machine passed.
- If tests fail after an upgrade, do not delete tests, skip tests, loosen assertions, lower coverage, disable scanners, or widen permissions unless the behavior contract intentionally changed and the report says so.
- If a security upgrade requires broad modernization, split the minimum patch from the modernization when possible.
- If generated output changes, regenerate from the official generator path and explain the generated diff. Do not hand-edit generated dependency output.
- If TS7 RC or nightly verification is introduced, keep the repository's stable, TS6 API, or framework verification unless the repository explicitly adopts the new track and all compiler API, framework wrapper, declaration, and generated-output risks are covered.
- If configured verification is missing, report the missing command intent instead of inferring a package-manager command.

<!-- mustflow-section: output-format -->
## Output Format

- Dependency upgraded and reason
- Ecosystem and package manager surface inspected
- Direct and transitive graph changes
- Compatibility classification: patch, minor, major, pre-1.0, security, toolchain, generated-output, Docker, or CI action
- Runtime, peer, engine, module, feature, platform, generated-output, and publish-surface risks
- Python runtime, standard-library, packaging, and changed-default risks when relevant
- TypeScript compiler-track, RC, nightly, and API compatibility risks when relevant
- Security advisory and fixed-range notes when relevant
- Surfaces synchronized
- Command intents run
- Skipped dependency checks and reasons
- Remaining dependency upgrade risk
