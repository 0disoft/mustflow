---
mustflow_doc: skill.version-freshness-check
locale: en
canonical: true
revision: 11
lifecycle: mustflow-owned
authority: procedure
name: version-freshness-check
description: Apply this skill when generated or edited code, configuration, CI workflows, package metadata, install instructions, examples, Docker images, framework setup, runtime declarations, toolchain declarations, Python standard-library/API references, TypeScript compiler-track references, Go release, toolchain, standard-library, runtime, experiment, framework, or dependency references such as Gin, Java or JDK release, GA, LTS, support, JEP, JVM flag, GC, virtual-thread, preview, incubator, or build-tool references, Rust release, toolchain, standard-library, Cargo, edition, MSRV, lint, or target references, HTTP standard or browser-support references, or migration-sensitive snippets introduce explicit external version references that may be stale.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.version-freshness-check
  command_intents:
    - changes_status
    - changes_diff_summary
    - build
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Version Freshness Check

<!-- mustflow-section: purpose -->
## Purpose

Prevent agents from writing stale external version references from memory, while avoiding blind upgrades that ignore repository policy, compatibility, or migration cost.

<!-- mustflow-section: use-when -->
## Use When

- Generated or edited files introduce explicit external version references, action refs, package ranges, runtime versions, framework majors, Docker image tags, toolchain versions, setup actions, scaffold commands, install commands, or migration examples.
- CI workflows, release workflows, Dockerfiles, package metadata, lockfiles, runtime files, framework configuration, README examples, docs, tests, fixtures, or templates mention external versions such as GitHub Actions refs, Node, Bun, Deno, Python, Rust, Tauri, Astro, Next, SvelteKit, Electron, Docker images, package managers, SDKs, plugins, or generators.
- Python wording mentions current/stable/support status, Python 3.14+ or 3.15+ syntax, standard-library APIs, runtime flags, changed default behavior, security defaults, or examples that depend on `requires-python`.
- TypeScript wording mentions current/stable/development/prerelease/native-preview status for TypeScript 6, TypeScript 7, `@typescript/typescript6`, `tsc6`, `typescript`, `typescript@next`, `typescript@rc`, `@typescript/native-preview`, `tsgo`, compiler API compatibility, or migration readiness.
- Go wording mentions current/stable/support status, Go release numbers, `go.mod` language version behavior, `toolchain` behavior, standard-library APIs, `GOEXPERIMENT`, runtime defaults, container behavior, JSON experiments, third-party Go framework releases such as Gin, framework minimum-Go requirements, or examples that depend on a specific Go or framework version.
- Java wording mentions current/stable/GA/LTS/support status, Java or JDK release numbers, Oracle/OpenJDK/vendor support tracks, JEP status, preview or incubator APIs, JVM flags, GC behavior, virtual-thread behavior, `ScopedValue`, structured concurrency, final-field reflection restrictions, applet removal, HTTP/3, AOT cache, Compact Object Headers, JFR, JMH, container memory or CPU behavior, Maven or Gradle toolchains, bytecode target, or examples that depend on a specific Java version.
- Rust wording mentions current/stable/support status, Rust release numbers, `rust-version`, edition behavior, `rust-toolchain`, Cargo resolver or workspace behavior, standard-library APIs, compiler lints, target behavior, release profiles, or examples that depend on a specific Rust version.
- HTTP delivery wording mentions current support, baseline status, default behavior, standard status, or compatibility for zstd content coding, compression dictionary transport, SSE/EventSource, WebTransport, WebSocket fallback, HTTP/2, HTTP/3, QUIC, CDN behavior, proxy buffering, or browser transport APIs.
- An agent proposes a versioned dependency, tool, framework, action, image, or runtime based on memory, copied snippets, older project examples, or user-provided text that may be stale.
- The task asks whether a newer stable, recommended, LTS, or security-patched version should replace a version the agent was about to write.
- A patch claims a version is latest, current, recommended, stable, LTS, supported, deprecated, end-of-life, or migration-safe.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The version reference is purely repository-local, such as an internal schema revision, fixture id, or package version already handled by `date-number-audit`.
- The task only preserves an existing pinned external version without touching code, docs, examples, package metadata, CI, Docker, runtime declarations, or compatibility claims.
- The task is a deliberate dependency upgrade, downgrade, lockfile refresh, or security advisory fix; use `dependency-upgrade-review` as the main skill and this skill only for freshness-specific claims if needed.
- The task only checks whether a dependency exists or whether a package name is real; use `dependency-reality-check` first.
- The user explicitly requests an offline-only draft and accepts that version freshness will be reported as unverified.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The versioned external reference being introduced, changed, preserved, or reported.
- Files that own or repeat the version: package metadata, lockfiles, workflow files, Dockerfiles, runtime files, framework config, docs, examples, templates, fixtures, and tests.
- Repository version policy if present: pinned ranges, lockfile expectations, LTS policy, security patch policy, supported runtime matrix, migration notes, downgrade constraints, or organization rules.
- Approved freshness evidence when available: official docs, upstream repository releases, package registry metadata, image registry metadata, official migration notes, security advisory ranges, or existing repository-maintained snapshots.
- Compatibility context: new project or existing project, patch/minor/major difference, framework adapter/plugin compatibility, runtime engine support, generated output, migration burden, rollback path, and whether the version touches a survival path.
- Relevant command-intent contract entries for build, tests, docs, packaging, or mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Freshness evidence can be gathered from allowed local files, configured tooling, approved connectors, official sources, package metadata, registry metadata, or the user-provided source text. If none is available, the check must be reported as unverified rather than guessed.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Align versioned references across package metadata, workflow files, runtime declarations, templates, docs, examples, and tests when the repository policy and compatibility classification support the change.
- Replace stale generated defaults with a verified stable, recommended, LTS, or repository-pinned value when the change is compatible and within scope.
- Add conservative wording when a version was not refreshed or when multiple legitimate version tracks exist.
- Do not force the newest major version, floating tag, or broad range when the repository pins a different supported track.
- Do not claim a version is current, latest, stable, recommended, LTS, deprecated, or secure unless the claim was refreshed or clearly marked as snapshot-only.
- Do not add package-manager, registry, browser, or network commands to the skill. Use configured command intents or report missing verification.

<!-- mustflow-section: procedure -->
## Procedure

1. Build a version ledger before editing: each external version reference, where it appears, whether it is new or existing, and whether it is code, config, CI, Docker, package metadata, docs, template, fixture, or test data.
2. Check repository policy before upstream freshness: package and lock metadata, runtime files, CI matrices, Docker tags, supported-version docs, migration notes, existing examples, and command contracts.
3. Identify the intended track for each reference: repository-pinned, lockfile-resolved, latest stable, recommended major, LTS, security-patched minimum, compatibility range, floating tag, digest-pinned image, or snapshot-only example.
4. Refresh stale-sensitive external facts with the highest-authority allowed source available. Prefer official docs, upstream releases, package registry metadata, official migration notes, official image metadata, or user-provided current evidence over secondary summaries.
5. If freshness cannot be checked with the available tools or permissions, keep the version conservative, avoid current-version claims, and report the unchecked source boundary.
6. Compare the proposed value, repository policy, and upstream evidence. Classify the difference as `same`, `patch`, `minor`, `major`, `migration-required`, `security-minimum`, `policy-pinned`, `floating`, or `unknown`.
7. Treat major, migration-required, pre-1.0, framework, runtime-engine, CI-action, Docker-image, generator, native, security-sensitive, and survival-path changes as higher risk even when the version number looks small.
8. For new projects or new examples, prefer the verified stable or officially recommended track unless the repository policy pins another track.
9. For existing projects, do not cross a major, migration-required, engine, framework, CI-image, or generated-output boundary without user approval or explicit repository policy.
10. For patch, security-minimum, and low-risk minor differences, update only when the declaration, examples, lockfile policy, and verification surface can stay aligned. Otherwise report the proposed change and leave the pinned value unchanged.
11. For GitHub Actions and CI tools, review the action source, major tag policy, runtime support, cache behavior, permissions, and organization pinning rule. Do not assume a newer major is safe only because it exists.
12. For framework and runtime majors such as Astro, Tauri, Electron, Next, SvelteKit, Node, Bun, Deno, Python, Go, Java, Rust, or JavaScript runtimes, check migration notes, config schema, plugin and adapter compatibility, generated files, security model, deployment target, and rollback path before recommending a major change.
13. For Python standard-library or runtime-behavior claims, refresh official Python documentation before writing durable wording. Check `requires-python`, CI/runtime matrices, and container images before using or recommending Python 3.14+ standard-library APIs or version-gated features such as template string literals, `annotationlib`, Python 3.14+ `map(strict=True)`, `functools.Placeholder`, `heapq` max-heap helpers, import-timing flag behavior, `finally` flow-control warnings, or changed security defaults.
14. For Python examples that use newer standard-library APIs, either keep the example behind an explicit runtime floor or provide a supported fallback. Do not call a Python 3.14-only API a general Python best practice when the repository declares lower support.
15. For Python 3.15+ claims, keep beta, release-candidate, and stable tracks separate. Refresh official docs before using explicit lazy imports, built-in `frozendict`, built-in `sentinel`, unpacking comprehensions, typed `TypedDict` extra items, startup configuration files, or changed encoding behavior in durable examples.
16. For TypeScript 6 and 7 claims, refresh official TypeScript and registry sources before writing
    durable wording. The snapshot checked on 2026-07-11 mapped TS7 stable to `typescript` and
    `tsc`, TS6 JavaScript API compatibility to `@typescript/typescript6` and `tsc6`,
    development builds to `typescript@next`, native preview to `@typescript/native-preview`
    and `tsgo`, and historical prerelease evidence to `typescript@rc`. Reclassify every tag
    from current evidence; do not call development, preview, or RC output "latest stable
    TypeScript" merely because it is newer or separately installable.
17. For TypeScript examples, make the selected track explicit: TS7 stable compiler adoption, TS6 API compatibility, `typescript@next` development comparison, native-preview comparison, historical prerelease reproduction, editor preview, or framework-owned verification. If the project has compiler API consumers, transformers, framework wrappers, or declaration snapshots, classify the reference as migration-sensitive and keep API consumers on the TS6 API compatibility track until support is explicit. Check exact support before relying on `rootDir` defaults, ambient `types` defaults, import attributes, subpath imports, `import defer`, `using`, or `await using`.
18. For Go release, toolchain, standard-library, runtime, or experiment claims, refresh official Go release notes or package documentation before writing durable wording. Check the repository's `go` directive, `toolchain` directive, CI/runtime matrix, and container target before using or recommending version-gated features such as expression operands to `new`, range-over-function iterators, generic type aliases, reflect iterator methods, `errors.AsType`, `sync.WaitGroup.Go`, `testing/synctest`, `testing.B.Loop`, `T.ArtifactDir`, `B.ArtifactDir`, `F.ArtifactDir`, `testing/cryptotest.SetGlobalRandom`, `os.Root`, `os.OpenInRoot`, `omitzero`, `go.mod` `tool`, `ReverseProxy.Rewrite`, container-aware `GOMAXPROCS`, goroutine leak profiles, `encoding/json/v2`, or `GOEXPERIMENT` APIs.
19. For Go framework and dependency release claims, refresh the source that owns the artifact before writing durable wording. For Gin, prefer official Gin release notes, pkg.go.dev module metadata, and the upstream repository release or source files for claims about latest stable version, minimum Go version, HTTP/3 support, BSON support, binding behavior, router options, logger options, trusted proxy behavior, or `Context` APIs. Keep framework upgrade advice separate from repository adoption, because a framework minor can still require a Go toolchain, CI image, Docker base, middleware, route, or binding migration.
20. For Go examples that use newer standard-library APIs, framework APIs, or runtime defaults, either keep the example behind an explicit Go or framework version floor or provide a supported fallback. Do not call an experimental `GOEXPERIMENT` feature, a newer `go` directive behavior, or a newly added framework method a general Go best practice when the repository declares lower support.
21. For Java or JDK release, support, JEP, standard-library, JVM flag, GC, virtual-thread, preview, incubator, or build-tool claims, refresh official Java, OpenJDK, vendor, Maven, or Gradle sources before writing durable wording. Check the repository's source and target release, Maven or Gradle toolchain, wrapper, CI runtime matrix, container image, JDK vendor policy, and bytecode compatibility before using or recommending version-gated features such as module import declarations, compact source files, instance main methods, flexible constructor bodies, `ScopedValue`, structured concurrency, primitive pattern matching, final-field reflection restrictions, applet API removal, `java.net.http.HttpClient` HTTP/3, AOT cache or method profiling, Compact Object Headers, Generational Shenandoah, JFR method timing, KDF APIs, PEM APIs, Lazy Constants, or Vector API.
22. For Java examples that use newer language, standard-library, JVM, or build-tool behavior, either keep the example behind an explicit Java and toolchain version floor or provide a supported fallback. Do not collapse latest GA, latest LTS, repository runtime, vendor support, delivered JEP, preview JEP, incubator API, product feature, and default-enabled behavior into one "latest Java" bucket. Treat JVM AOT cache as startup or warmup optimization, not Native Image, and treat Java HTTP/3 as client-side opt-in unless current official docs say otherwise.
23. For Java performance and JVM tuning claims, refresh official JVM, GC, JFR, JMH, and vendor documentation before writing durable wording. Keep G1 pause targets as goals rather than SLAs, ZGC and Shenandoah as CPU and headroom tradeoffs rather than free latency switches, Compact Object Headers and Generational Shenandoah as enablement-specific when applicable, and container memory claims separate across heap, direct buffers, metaspace, code cache, thread stacks, native memory, `MaxRAMPercentage`, `MaxDirectMemorySize`, and `ActiveProcessorCount`.
24. For Rust release, toolchain, standard-library, Cargo, edition, lint, target, or MSRV claims, refresh official Rust release notes, standard-library docs, the Cargo Book, Rust Reference, or rustc book before writing durable wording. Check `rust-version`, edition, `rust-toolchain.toml`, CI toolchain matrix, target triples, docs.rs metadata, and crate publish policy before using or recommending version-gated features such as let chains, match `if let` guards, `cfg_select!`, `assert_matches!`, `core::range`, `Vec::push_mut`, `HashMap::get_disjoint_mut`, `Option::take_if`, `LazyLock`, `OnceLock`, `workspace.lints`, `resolver = "2"`, Rust 2024 `unsafe extern`, unsafe attributes, Rust 2024 `unsafe_op_in_unsafe_fn`, temporary drop-scope changes, macro fragment behavior, or release-profile defaults.
25. For Rust examples that use newer language or standard-library APIs, either keep the example behind an explicit Rust version floor or provide a supported fallback. Use an API-by-API MSRV ledger for features such as `cfg_select!`, match `if let` guards, `core::range` items, `Vec::push_mut`, `assert_matches!`, and `debug_assert_matches!`; do not collapse them into a single "latest Rust" bucket, and do not treat nightly-only behavior or target-specific linker behavior as stable without explicit evidence.
26. For HTTP standards, browser APIs, proxy defaults, CDN defaults, and transport support claims, prefer official RFCs, standards bodies, MDN or browser vendor docs, and vendor-owned proxy/CDN documentation. Keep WebTransport, compression dictionary transport, zstd content coding, SSE/EventSource, HTTP/2, HTTP/3, QUIC, and proxy-buffering claims track-specific and dated when support is changing.
27. For HTTP delivery examples that depend on newer or unevenly supported behavior, require feature detection, fallback behavior, or explicit deployment constraints. Do not present WebTransport, dictionary compression, or zstd negotiation as a universal default when the project still needs browsers, proxies, CDNs, or networks that may not support it.
28. For Docker images, decide whether the project prefers semver tags, distro tags, LTS tags, date tags, or digests. Do not replace a digest or pinned base image with a floating tag unless the repository policy says so.
29. Synchronize every accepted version decision across package metadata, lockfiles when intentionally updated, CI, Docker, runtime files, docs, examples, templates, tests, and release notes.
30. Run the narrowest configured verification that covers the changed versioned surface. Use broader verification for major, migration-required, runtime, framework, generated-output, package-publish, Docker, CI, TypeScript compiler-track, Go toolchain or runtime support, Go framework runtime support, Java JDK/toolchain/bytecode/runtime support, JVM tuning, Rust toolchain or MSRV support, HTTP delivery compatibility, or security-sensitive changes.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every touched external version reference has a ledger entry with repository policy, freshness evidence, compatibility classification, and final decision.
- Stale model defaults are not silently written as if they were current.
- Repository-pinned versions are preserved unless the task, policy, and compatibility classification support changing them.
- Major or migration-required changes are either explicitly approved, deferred with a recommendation, or left unchanged with the risk reported.
- Python standard-library examples and runtime-default claims match the declared Python support matrix or name the required runtime floor.
- Python template strings, annotation inspection, explicit lazy imports, immutable mappings, sentinels, and advanced `TypedDict` shape claims are either official-source checked or omitted.
- TypeScript 7 stable compiler, TypeScript 6 JavaScript API compatibility, `typescript@next` development, native-preview, and RC prerelease tracks are not collapsed into one generic "latest TypeScript" claim.
- Go release, `go.mod` language version, standard-library API, framework dependency API such as Gin, runtime-default, and `GOEXPERIMENT` claims match the declared Go support matrix or name the required runtime or framework floor.
- Java release, JDK vendor, source or target release, bytecode target, JEP status, standard-library API, virtual-thread behavior, preview or incubator API, build-tool support, JVM flag, GC behavior, and container-runtime claims match the declared Java support matrix or name the required runtime, toolchain, and feature floor.
- Rust release, `rust-version`, edition, standard-library API, Cargo resolver, lint-default, target, and nightly/stable claims match the declared Rust support matrix or name the required API-specific runtime floor.
- HTTP standard, browser-support, proxy-default, CDN-default, and transport-support claims are not written from stale memory and keep feature detection or fallback boundaries explicit where support varies.
- Docs and examples do not make unverifiable current-version claims.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `build`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Choose the narrowest configured intent that proves the changed versioned surface. Report missing dependency, package, docs, Docker, CI, or release verification instead of inventing commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If repository policy and upstream evidence disagree, preserve the repository policy unless the user explicitly chooses a migration or the existing version is outside a required security or support range.
- If official sources conflict, prefer the source that owns the artifact being referenced and report the conflict.
- If a freshness check requires network, credentials, or a connector that is not available, report the boundary and avoid current-version claims.
- If a proposed major or migration-required version is better for greenfield work but risky for the existing project, present both choices and ask before changing the project.
- If TypeScript stable, development, native-preview, or RC freshness changes during the task, update wording to a dated or track-specific claim and keep repository adoption separate from comparison-only checks.
- If Go release, framework release, or experiment freshness changes during the task, update wording to a dated or track-specific claim and keep official release status, `go` directive adoption, framework adoption, CI support, and `GOEXPERIMENT` adoption separate.
- If Java release, JEP, JVM flag, GC, or toolchain freshness changes during the task, update wording to a dated or track-specific claim and keep latest GA, latest LTS, repository runtime, vendor support, preview or incubator status, product feature status, default-enabled behavior, build-tool support, and CI or container adoption separate.
- If Rust release or toolchain freshness changes during the task, update wording to a dated or track-specific claim and keep official release status, MSRV adoption, edition adoption, CI support, target support, and nightly or unstable features separate.
- If HTTP delivery support changes during the task, update wording to a dated or track-specific claim and keep standards, browser support, CDN behavior, proxy defaults, and repository adoption separate.
- If verification fails after a freshness update, do not weaken tests, lower type checks, delete lockfiles, or widen ranges to make the update pass. Revert or narrow the version decision unless the behavior change is intentional.

<!-- mustflow-section: output-format -->
## Output Format

- Versioned surfaces checked
- Repository version policy found or missing
- Freshness source checked or unavailable
- Proposed and selected version track
- Compatibility classification: `same`, `patch`, `minor`, `major`, `migration-required`, `security-minimum`, `policy-pinned`, `floating`, or `unknown`
- User approval needed or not, with reason
- Surfaces synchronized
- Command intents run
- Skipped freshness or verification checks and reasons
- Remaining version freshness risk
