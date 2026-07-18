# Module, Package, and Loader Resolution Checklist

Use this checklist when an import, package coordinate, module name, class name, build dependency, or
repository label resolves to a different artifact, variant, feature set, instance, or cache entry.

## Contents

1. [Resolution capsule](#resolution-capsule)
2. [Coordinate, artifact, and instance identity](#coordinate-artifact-and-instance-identity)
3. [Search roots and mappings](#search-roots-and-mappings)
4. [Conditions, variants, and features](#conditions-variants-and-features)
5. [Loader and cache identity](#loader-and-cache-identity)
6. [Node and package exports](#node-and-package-exports)
7. [Peer-context and strict-layout packages](#peer-context-and-strict-layout-packages)
8. [Python import paths and namespace packages](#python-import-paths-and-namespace-packages)
9. [JVM class loaders](#jvm-class-loaders)
10. [Go module ownership](#go-module-ownership)
11. [Cargo feature resolution](#cargo-feature-resolution)
12. [Maven conflict mediation](#maven-conflict-mediation)
13. [Gradle variant selection](#gradle-variant-selection)
14. [CMake package discovery](#cmake-package-discovery)
15. [Bazel repository mapping](#bazel-repository-mapping)
16. [Build, test, deploy, and release graph parity](#build-test-deploy-and-release-graph-parity)
17. [Evidence matrix](#evidence-matrix)
18. [Failure matrix](#failure-matrix)
19. [Invariants](#invariants)
20. [Skill handoffs](#skill-handoffs)

## Resolution capsule

Capture:

- requester file, package, target, class loader, build target, or plugin host;
- exact import, package coordinate, module path, label, or requested capability;
- working directory, workspace root, project root, and configuration generation;
- runtime, package manager, build tool, resolver mode, and supported version contract;
- active conditions, platform, architecture, language mode, feature set, attributes, and profiles;
- ordered search roots, repositories, aliases, replacements, mappings, and fallbacks;
- lockfile, workspace, cache, and install-layout identity;
- selected package version, artifact digest, physical path or realpath, variant, and runtime instance;
- rejected candidates and conflict, exclusion, compatibility, or precedence reasons.

Capture the failing environment before reinstalling, pruning, cleaning, regenerating, or deleting
build directories. A clean build that succeeds can prove stale state existed, but not which cache or
mapping was stale.

## Coordinate, artifact, and instance identity

Keep these layers separate:

| Layer | Example identity |
| --- | --- |
| Source coordinate | Import string, package name and range, module path, class name, repository label. |
| Resolved graph node | Selected version, replacement, capability provider, feature or variant context. |
| Physical artifact | Canonical path, archive, class directory, native binary, digest, or generated output. |
| Loader instance | Module cache entry, class loader plus class name, plugin realm, isolated context. |
| Behavioral instance | Singleton state, registry, constructor identity, enabled API, native dependency. |

A lockfile can pin a graph node while two peer contexts produce separate physical paths and runtime
instances. Equal source bytes do not make classes defined by separate loaders assignable, and equal
package versions do not guarantee equal feature or variant surfaces.

## Search roots and mappings

Record all roots and transformations:

- caller-relative ancestor search;
- workspace package links and virtual stores;
- source aliases and compiler paths;
- package export and import maps;
- runtime, bundler, test, editor, and type-checker aliases;
- environment-injected paths;
- module replacements and workspace overlays;
- repository mirrors, proxies, and local caches;
- generated package indexes and build-system repository mappings;
- canonical path, symlink, hard-link, and realpath behavior.

Do not treat a compile-time alias as a declared package dependency or assume the runtime, test runner,
deployer, and editor implement the same mapping. Preserve the resolver and origin at every consumer.

## Conditions, variants, and features

Many resolvers select more than a version. Record:

- import versus require or equivalent module mode;
- runtime, browser, development, production, platform, and custom export conditions;
- API versus runtime usage;
- language or bytecode target;
- operating system, architecture, native ABI, and linkage mode;
- requested and unified features;
- peer host version and optional peer presence;
- producer and consumer attributes;
- capability conflicts and disambiguation;
- default feature, fallback, and compatibility rules.

Assert the selected entry point or variant, not only the package coordinate. Different conditions can
load separate files and initialize state twice inside one process.

## Loader and cache identity

For every loaded module or class, capture:

- resolved canonical origin;
- loader, realm, isolate, or module graph identity;
- cache key and whether symlinks are canonicalized;
- package and peer context;
- initialization state and singleton registry identity;
- parent-first, child-first, delegated, or isolated lookup policy;
- hot reload, watch-mode, plugin unload, and stale-code behavior;
- native-library and allocator ownership where applicable.

Do not use a module's display name as its runtime identity. Test constructor, type, singleton, and
registry behavior across the suspected duplicate instances.

## Node and package exports

For Node-like resolution, distinguish:

- CommonJS caller-relative ancestor search;
- ESM URL and package resolution;
- package `exports` and `imports` maps;
- active condition order and selected target;
- import versus require entry points;
- deep import availability before and after an export map;
- symlink and realpath policy;
- cache identity for CommonJS and ESM graphs;
- dual-package state and constructor identity.

For each failing caller, record the resolved URL or canonical filename. Two callers can resolve the
same bare package spelling from different ancestor roots. A package can also expose different files
to import and require, producing two initialization and singleton domains.

Treat a new export map as a public boundary change: previously reachable internal paths may become
blocked even when package version and lockfile are unchanged.

## Peer-context and strict-layout packages

For content-addressed or strict package layouts, record:

- declaring package and whether the dependency is direct;
- selected version and integrity;
- peer dependency names and resolved peer versions;
- virtual-store or peer-context suffix;
- symlink chain and final realpath;
- hoisting or public-hoist policy;
- package-manager mode and workspace links;
- runtime module instance and singleton expectation.

Do not infer one instance from equal version text or shared content bytes. Different peer sets can
require distinct graph nodes and runtime instances. A dependency visible only through accidental
hoisting is undeclared even if one installation layout makes it importable.

## Python import paths and namespace packages

Record:

- interpreter executable and environment;
- entry mode and first path entry;
- working directory, script directory, environment-injected paths, and site initialization;
- ordered import path and importer hooks;
- module specification, origin, loader, cached path, and package search locations;
- local files shadowing standard or installed packages;
- namespace-package portions contributed by every path root;
- module cache identity and reload behavior.

A package without one file origin may be a valid namespace package composed from several locations.
Inspect its full search path and each submodule origin. Adding another distribution can add or shadow
a portion without replacing the parent package object.

Compare an isolated interpreter environment only as a controlled delta. It can reveal ambient path
injection without proving which original path entry selected the wrong module.

## JVM class loaders

Treat runtime type identity as:

`binary class name + defining class loader`

Capture:

- initiating and defining loader;
- parent and delegation order;
- thread context loader;
- module layer or plugin realm;
- code source, artifact digest, and protection domain;
- duplicate resources and service-provider configuration;
- class-path versus module-path placement;
- unload and reload generation.

For a cast or service-discovery failure, log both sides' defining loaders and origins. Equal class
names and bytecode are insufficient when loaders differ.

## Go module ownership

Record:

- import path including semantic import version suffix;
- owning module selected by longest matching module-path prefix;
- module version and graph selection;
- workspace modules;
- replacement and exclusion directives;
- vendor mode, proxy, checksum, and local-cache origin;
- package directory and build tags;
- test-only or tool dependency context.

Different major module paths are different import identities and can coexist. Do not describe module
selection as simply choosing the newest repository tag. Preserve the selected owner module and every
replacement or workspace overlay.

## Cargo feature resolution

For a crate instance, record:

- package name, source, and version;
- target triple and dependency kind;
- default and explicitly requested features;
- every reverse dependency enabling a feature;
- resolver policy and contexts where unification is reduced;
- optional dependencies activated by features;
- native links or build-script consequences;
- final enabled feature set and compiled artifact identity.

Features are not necessarily private switches for each edge. A transitive requester can change the
API, implementation, or native dependency set seen by another consumer through unification. Test the
minimal graph that proves which edge enabled the disputed feature.

## Maven conflict mediation

Record:

- complete dependency paths to each candidate version;
- path depth and declaration order at equal depth;
- dependency-management constraints;
- direct declarations, exclusions, scopes, optional edges, and imported management;
- selected artifact, omitted candidates, and mediation reason;
- plugin, test, and runtime class paths separately.

Do not assume the numerically highest version wins. A managed version controls an encountered
dependency but does not by itself add a dependency edge. Preserve the exact path and mediation reason.

## Gradle variant selection

Record:

- requested component and configuration;
- consumer attributes;
- producer variants and attributes;
- compatibility and disambiguation rules;
- selected variant and artifact set;
- capabilities and conflicting providers;
- component metadata rules, constraints, substitutions, and platforms;
- build-cache key and target environment.

Variant names are labels, not the selection proof. Compare the attribute set and reason each
candidate was compatible, rejected, or disambiguated.

## CMake package discovery

Record:

- module-search versus package-config mode;
- requested package name, version, components, and exactness;
- module path, prefixes, roots, registries, toolchain files, and environment hints;
- cached directory and previous failed or successful discoveries;
- selected finder or package-config file and version file;
- imported targets, configuration mapping, architecture, and transitive requirements;
- build-directory generation and platform.

A project-provided finder and a package-provided config file can expose different targets and
semantics for the same package name. Make the intended mode explicit when the contract requires one.
Capture cache state before using a new build directory as the control.

## Bazel repository mapping

Record:

- apparent repository name written by the current module;
- module or extension that owns the requester;
- repository mapping visible from that requester;
- canonical repository identity used internally;
- selected module version, override, extension output, and lock state;
- generated labels and whether they leaked an internal canonical name;
- target configuration, toolchain, and platform.

Repository names are contextual. Code and generated labels should use names intentionally visible to
their caller rather than persisting implementation-specific canonical names as public API.

## Build, test, deploy, and release graph parity

Compare resolver products across:

- editor and language server;
- compiler or type checker;
- bundler and test runner;
- development runtime;
- package, prune, or deployment builder;
- container or serverless image;
- release package and external consumer.

For each lane, record graph node, physical artifact, conditions or variant, cache key, and runtime
instance. A source build can pass while a pruned deploy omits an undeclared dependency, a test alias
bypasses package exports, or an external consumer selects another entry point.

## Evidence matrix

| Evidence | Proves | Does not prove |
| --- | --- | --- |
| Lockfile entry | A graph decision recorded for a package-manager state. | Physical path, active variant, loader instance, or deployed inclusion. |
| Dependency tree | Selected and omitted graph edges under one resolver context. | Runtime cache identity or another build lane. |
| Resolved canonical path | Physical artifact selected for one requester. | Equal feature set, loader identity, or singleton state. |
| Package metadata | Declared exports, peers, features, or variants. | Which conditions and consumer attributes were active. |
| Loader identity | Runtime namespace owning a class or module. | Correct package declaration or build graph. |
| Build-cache hit | A key matched cached output. | That every resolver input was included in the key. |
| Successful local import | One environment found an artifact. | Declared dependency, external consumer, prune, deploy, or release correctness. |

## Failure matrix

| Symptom | Evidence to require |
| --- | --- |
| Same package version creates two singletons. | Caller-specific origins, peer or condition contexts, realpaths, cache keys, and loader instances. |
| Import works in one directory only. | Requester-relative search roots, package declaration, hoisting, aliases, and selected origin. |
| Import and require disagree. | Active export conditions, selected entry points, graph and cache identities. |
| Local file masks an installed Python package. | Entry mode, ordered import path, module spec, origin, and isolated control. |
| Class cannot cast to the same named class. | Defining loaders, code sources, artifacts, and plugin generations. |
| A Cargo feature appears unexpectedly. | Reverse enabling edges, resolver context, final feature set, and artifact identity. |
| Build tool selects the wrong native artifact. | Consumer attributes, compatible variants, disambiguation, platform, and cache key. |
| Package discovery works only after a clean build. | Finder mode, search roots, cached package directory, old artifact, and configuration generation. |
| Generated Bazel label fails in another module. | Requester repository mapping, apparent name, leaked canonical name, and override state. |
| Tests pass but deployed artifact fails to import. | Test aliases, declared dependency, prune graph, packaged files, and runtime resolution. |

## Invariants

- Every coordinate claim names the requester and resolver context.
- Every selected dependency records version, variant or feature context, physical artifact, and origin.
- Every module or class identity includes its loader or cache domain.
- Every package-path claim distinguishes symlink path, canonical path, and package graph node.
- Every cache claim names inputs that form the cache key and the configuration generation.
- Every build-lane claim is bounded to the actual compiler, test, deploy, or release resolver used.
- Every duplicate-instance claim proves distinct runtime identities, not merely duplicate files.

## Skill handoffs

- Use `name-resolution-integrity-review` for coordinate-to-artifact-to-instance tracing.
- Use `dependency-reality-check` for dependency declaration, role, package exports, peer, deploy, and
  release contract changes after localization.
- Use `dependency-upgrade-review` when selected versions or tool behavior change through an upgrade.
- Use `module-boundary-review` for allowed import direction and public package boundaries.
- Use `compiler-engineering-review` or `interpreter-engineering-review` for language module semantics
  and compiled or cached resolver implementation.
- Use the matching language or build-system skill for source and configuration edits.
- Use `cache-integrity-review` when build or module cache keys and invalidation own the defect.
- Use `provenance-license-gate` and supply-chain skills when a different artifact source is selected.
