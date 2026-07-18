# Debug Symbols, Stripping, and Symbolication Checklist

Use this checklist for debug-information generation, separated symbol artifacts, stripping,
symbolication, crash capture, unwind evidence, dead-code elimination, identical-code folding, LTO,
and symbol-store retention.

## Contents

1. [Symbol asset taxonomy](#symbol-asset-taxonomy)
2. [Binary identity and matching keys](#binary-identity-and-matching-keys)
3. [Artifact lineage](#artifact-lineage)
4. [ELF separated debug information](#elf-separated-debug-information)
5. [PE and PDB artifacts](#pe-and-pdb-artifacts)
6. [Mach-O and dSYM artifacts](#mach-o-and-dsym-artifacts)
7. [Public private and source assets](#public-private-and-source-assets)
8. [Crash capture boundary](#crash-capture-boundary)
9. [Address and frame semantics](#address-and-frame-semantics)
10. [Immutable symbol store](#immutable-symbol-store)
11. [Stripping policy](#stripping-policy)
12. [Elimination pipeline](#elimination-pipeline)
13. [Reachability roots](#reachability-roots)
14. [Identical-code folding](#identical-code-folding)
15. [LTO identity and ABI](#lto-identity-and-abi)
16. [Optimized debug limits](#optimized-debug-limits)
17. [Cross-platform artifact matrix](#cross-platform-artifact-matrix)
18. [Symbolication canary](#symbolication-canary)
19. [Failure matrix](#failure-matrix)
20. [Invariants](#invariants)
21. [Skill handoffs](#skill-handoffs)

## Symbol asset taxonomy

Do not model symbols as one Boolean. Track separate assets and consumers:

| Asset | Primary consumer | Contract |
| --- | --- | --- |
| Loader-visible exports and imports | Dynamic loader | Runtime binding names, versions, ordinals, dependencies, and relocations. |
| Regular link-time symbols | Static linker and binary tools | Local and global definitions, undefined references, archive indexes, values, sizes, and sections. |
| Public names | External debugger or profiler | Intentionally shareable function and data identities without private implementation details. |
| Line tables | Symbolicator | Address-to-file-and-line mapping with inline provenance where available. |
| Full debug information | Debugger and dump analyzer | Types, variables, lexical scopes, call-site data, and source provenance. |
| Unwind information | Runtime unwinder and stack walker | Frame recovery, saved registers, personality, and exception cleanup metadata. |
| Source bundle or source index | Debugger and responder | Exact source, generated source, patched dependency source, and path mapping for the compiled inputs. |
| Link provenance | Build and release diagnostics | Link map, selected members, collected sections, ICF or LTO decisions, and final layout. |

Removing one asset does not imply the others disappeared. A stripped image can retain loader-visible
names and unwind records, while a private debug file can exist without usable source or complete
unwind coverage.

Define retention, access control, privacy, and support lifetime independently for each asset class.

## Binary identity and matching keys

Match symbol artifacts to the exact final binary identity, not to a commit, package version, filename,
job number, or rebuild claim. Record:

- platform-native binary identity for every image and architecture slice;
- image architecture, object format, and loadable module identity;
- debug-artifact identity and any age, revision, or checksum component;
- final linked-image digest;
- load address or relocation slide from the crash;
- symbolicator and parser version;
- source-bundle tree digest;
- build, link, strip, and packaging lineage.

The same source revision can produce different layouts after toolchain, link order, LTO, ICF, feature,
timestamp, or environment changes. Never reconstruct release symbols by rebuilding and assuming the
addresses stayed equal.

Universal or multi-architecture artifacts require identity per slice. A matching container filename
does not prove that the crash architecture and debug slice match.

## Artifact lineage

Build the debug package from the exact final-link lineage:

1. preserve the final unstripped linked image or an equivalent immutable source artifact;
2. derive separated debug information from that image under the platform contract;
3. derive the distributable stripped image from the same lineage;
4. attach or record the debug association and matching key;
5. validate image, debug artifact, architecture, source bundle, and association metadata together;
6. publish the immutable set before deleting intermediate artifacts;
7. verify retrieval and symbolication from outside the build workspace.

Record each artifact's digest and parent. A build log saying upload succeeded does not prove that the
uploaded file contains usable debug information or belongs to the distributed image.

## ELF separated debug information

For ELF-family artifacts, keep these surfaces distinct:

- regular and dynamic symbol tables;
- line, type, range, location, call-site, and string debug sections;
- unwind and exception-frame sections;
- build identity and separated-debug association;
- skeleton units and external split-debug units;
- packaged split-debug indexes;
- source paths and compilation-directory remapping.

When split debug information is enabled, external units are release assets rather than disposable
build cache. Package every unit required by the final image, preserve the index used to find them,
and bind that package to the final binary identity.

Validate the separated-debug association and its checksum or equivalent integrity mechanism. Do not
accept a debug file merely because a debugger finds one at a conventional path.

## PE and PDB artifacts

For PE and PDB-family artifacts, preserve:

- executable or library image identity;
- PDB name, unique signature, and age or revision component;
- image debug-directory reference;
- architecture and linker mode;
- complete versus partial or build-workspace-dependent debug information;
- public versus private symbol content;
- object and library dependencies required by any non-self-contained debug mode;
- source indexing or source-link metadata;
- runtime and compiler library identity relevant to dump analysis.

A PDB that depends on build-machine objects and libraries is not a durable release symbol artifact
unless those inputs are retained and retrievable under the same lifetime policy. Prefer a
self-contained release artifact for remote crash analysis.

Do not reuse one PDB across binaries built with different optimization, folding, link, or debug
options. The identity must reject the mismatch even if the source revision and output filename agree.

## Mach-O and dSYM artifacts

For Mach-O-family artifacts, preserve:

- UUID for every architecture slice;
- dSYM bundle and matching debug slice;
- linked image and distribution transformations;
- load address and slide for each image;
- bitcode or provider-side rebuild boundary when applicable to the supported release path;
- source mapping and generated-source bundle;
- symbol upload receipt tied to UUID, not only application version.

Collect and publish the dSYM from the archived release lineage rather than recovering a similarly
named artifact from an unrelated temporary build directory. Retain symbols for at least the lifetime
of supported and still-reporting deployed binaries.

## Public private and source assets

Separate audiences:

- public names sufficient for customer-visible stack labels;
- line-level symbols for internal symbolication;
- full private types and variables for controlled dump analysis;
- source bundles and generated inputs for responders;
- raw crash data and memory dumps with their own privacy boundary.

A public symbol artifact can intentionally omit local names, types, variables, and source lines. Do
not use it as the only internal crash-analysis artifact.

Debug information usually records source paths and metadata rather than the complete source body.
Preserve exact generated sources, patched dependencies, code-generation outputs, and source tree
digest. Normalize build paths to prevent usernames, workspace roots, and cache locations from leaking,
while retaining a reversible mapping for authorized responders.

Apply separate access controls and retention to private symbols, source, and dumps. A public symbol
server must not become a side channel for proprietary names, paths, types, or customer data.

## Crash capture boundary

Keep the in-process crash path minimal. At the fault boundary, prefer recording:

- raw program counter and register state;
- stack memory or platform dump artifact;
- exception, signal, or fault metadata;
- module list with binary identity, architecture, load address, and mapped range;
- thread identities and minimal scheduling context;
- whether each address is a precise faulting instruction, return address, sampled instruction, or
  uncertain frame candidate;
- capture-format version and truncation status.

Do not depend on general allocation, loader traversal, demangling, filesystem discovery, networking,
or full symbolication inside a corrupted or reentrant process unless the platform contract proves a
safe bounded path. Perform symbol lookup and source expansion in another process or service.

If dynamic modules change during normal execution, maintain a separately synchronized module ledger
before crashes rather than discovering the entire set after memory or loader state is damaged.

## Address and frame semantics

Symbolication must know what each address represents:

- precise faulting program counter;
- return address after a call;
- sampled instruction pointer;
- asynchronous unwind candidate;
- architecture-tagged or signed pointer representation;
- relocated image-relative or absolute virtual address;
- inlined call-site chain;
- folded or aliased function address.

Do not apply one unconditional subtraction or adjustment to every address. Return-address adjustment
is architecture- and unwinder-aware and must not corrupt the precise faulting PC.

Preserve every inline frame and mark approximate, unavailable, or ambiguous mappings. One machine
address can represent several semantic functions after inlining or folding.

## Immutable symbol store

Treat the symbol store as an immutable identity-indexed database. Store:

- platform-native lookup key and architecture;
- stripped and unstripped image identities where retained;
- public and private debug artifacts in separate access domains;
- unwind and source bundles;
- link map, discarded-section, LTO, and folding provenance;
- artifact digests and lineage manifest;
- upload and validation receipts;
- symbolicator version and normalized canary result;
- retention and deletion policy tied to deployed-support lifetime.

Reject overwrites for an existing binary identity. A corrected upload must create an auditable new
record or repair transaction without silently replacing evidence used for earlier crash reports.

Preserve raw crash addresses so improved symbol parsers and source mappings can reprocess historical
reports.

## Stripping policy

Define artifact classes before selecting a stripping operation:

- relocatable object or archive that may be linked again;
- final unstripped linked image;
- final distributable image;
- separated private debug file;
- public symbol artifact;
- unwind-only or minimal-symbol runtime artifact.

Different strip modes remove debug sections, local symbols, relocation-unneeded symbols, or broader
metadata. A policy safe for the final distributable image can destroy a relocatable input needed for
later links, partial links, plugin packaging, or post-link analysis.

Verify the post-strip runtime export/import surface, unwind coverage, binary identity, separated-debug
association, and symbolication canary. Do not infer the effect from the option name.

## Elimination pipeline

Separate deletion stages:

| Stage | Primary visibility | Typical decision evidence |
| --- | --- | --- |
| Translation-unit optimization | One compilation unit or language module | IR pass trace and per-unit output. |
| Whole-program or link-time optimization | Cross-module IR and linker-provided liveness | Import index, internalization, preserved-symbol set, and backend output. |
| Archive extraction | Ordered unresolved demand | Member-selection trace and archive index. |
| Section collection | Final section reference graph and roots | Collected and discarded section report. |
| Identical-code folding | Eligible semantic or byte-identical sections | Fold groups, safe or aggressive mode, and address aliases. |
| Stripping | Final artifact metadata policy | Before/after structural field inventory. |

Small function or data sections enable finer collection but do not themselves delete content. An
unextracted archive member never enters the section graph, so a retain marker inside that member
cannot prove extraction.

Persist stage evidence for release-size and missing-registration investigations. Looking only at the
final binary discards the reason a definition vanished.

## Reachability roots

String-based lookup, reflection, plugin conventions, external assembly, JIT callbacks, registration
tables, and provider-required entry points may have no ordinary relocation edge. Declare them through
the platform's actual preservation contract:

- final export allowlist;
- explicit undefined or required-symbol root;
- retained section or link-script root;
- registration anchor referenced by a live object;
- whole-archive or force-load scope limited to the required library;
- linker or LTO preserved-symbol list;
- runtime manifest verified against the final image.

Compiler-level "used" evidence does not necessarily create a linker root, and a linker-retain marker
does not necessarily extract its archive member. Assert both extraction and section survival.

Treat whole-archive as a semantic change, not only a size change. It can activate constructors,
registrars, test hooks, duplicate definitions, and initialization-order behavior.

## Identical-code folding

Identical-code folding can make distinct semantic functions share one address. Review:

- safe versus aggressive eligibility;
- relocation and section properties included in equivalence;
- address-significance rules;
- function-pointer equality assumptions;
- profiler, debugger, sanitizer, and coverage attribution;
- exported, registration, or type-identity functions;
- fold-group evidence and symbolication ambiguity.

Do not use function address as a durable type, registration, or protocol identifier when folding is
permitted. Provide explicit stable IDs.

Keep a diagnostic configuration that can disable or narrow folding when address-distinct evidence is
required, without claiming that diagnostic binaries reproduce the exact release layout.

## LTO identity and ABI

Whole-program optimization can internalize, eliminate, inline, clone, merge, and change internal
calling conventions based on its visibility model. Record:

- LTO mode and toolchain identities;
- module summaries and import decisions;
- export and preserved-symbol inputs from the linker;
- external assembly, JIT, reflection, and runtime lookup roots;
- internalization and dead-definition decisions;
- generated native objects and final link inputs;
- cache inputs, policy, hits, and invalidation;
- ABI shims excluded from internal calling-convention freedom.

An FFI or plugin entry point should use an explicit stable ABI shim and final-image export contract.
Source-level visibility or a string lookup convention alone does not prove LTO preservation.

Treat ThinLTO or equivalent caches as disposable acceleration, not binary or symbol identity. The
final linked image produces the symbol-store key.

## Optimized debug limits

Debug information describes an optimized program, not an idealized source execution history.
Optimization may:

- inline or clone functions;
- remove or constant-fold variables;
- split variable locations across ranges;
- tail-call away physical frames;
- merge functions or basic blocks;
- reorder instructions across source lines;
- produce approximate, missing, or zero line locations;
- retain a semantic inline chain without a physical call frame.

Symbolicators must preserve inline chains and availability state. Do not fabricate a variable value,
frame, or exact line when metadata says optimized out, unavailable, or ambiguous.

Debug-generation options can also change linker optimization defaults on some toolchains. Record the
complete optimization, folding, dead-code, and debug option set; do not call a binary "the same
release plus symbols" without structural evidence.

## Cross-platform artifact matrix

| Contract | ELF family | PE/PDB family | Mach-O family |
| --- | --- | --- | --- |
| Runtime names | Dynamic symbol and relocation metadata. | Export, import, and image metadata. | Exported-name, indirect-symbol, stub, and load-command metadata. |
| Full link-time names | Regular symbols and object/archive indexes. | COFF object and library symbols. | Object symbol and link metadata. |
| Debug identity | Build identity plus separated-debug association. | Image reference plus PDB signature and age. | UUID per architecture slice. |
| Detailed debug | Embedded or separated DWARF, including split units. | Private or public PDB with completeness policy. | dSYM debug bundle for matching slice. |
| Unwind | Platform frame and exception metadata, independent of ordinary debug sections. | Architecture-specific image unwind metadata. | Compact or DWARF unwind and exception metadata. |
| Load layout | Module base, mapped segments, and relocation slide. | Image base and loaded module range. | Image load address and slide per UUID. |

Keep the platform vocabulary explicit. A similarly named artifact on another platform is not evidence
that identity, public/private content, or unwind semantics match.

## Symbolication canary

For each release lineage, retain a small known-address fixture or reproducible crash artifact that
exercises:

- top precise program counter;
- lower return address;
- at least one inline chain;
- one public and one private symbol under the intended access policy;
- source file and line;
- module identity and load-address normalization;
- architecture slice;
- stripped-image to debug-artifact association;
- source retrieval and path remapping;
- expected unavailable data in an optimized region.

Resolve the canary through the same external symbol-store path used for production analysis. Upload
success, file existence, or a function-name-only result is insufficient.

## Failure matrix

| Symptom | Required evidence |
| --- | --- |
| Stripped binary still shows function names. | Identify whether names come from loader exports, public names, unwind, regular symbols, or debug data. |
| PDB or dSYM exists but lines are missing. | Match binary identity and architecture, then inspect public/private content, line tables, source, and optimized availability. |
| Rebuilt symbols produce plausible wrong lines. | Reject by final binary identity and artifact lineage before symbolication. |
| Split-debug build loses types after cleanup. | Verify every external unit and packaged index is retained under the binary identity. |
| Stack top is right but lower frames are shifted. | Distinguish precise PC from return addresses and apply architecture-aware normalization. |
| Registrar disappears only in release. | Prove archive extraction, section root, LTO preservation, collection, and strip stage separately. |
| Two functions have one address. | Inspect ICF or optimization fold group and remove address-identity assumptions. |
| Adding debug output changes binary behavior. | Compare complete optimization, dead-code, folding, and link option sets, not only source. |
| Symbol upload succeeded but production stacks remain raw. | Run external retrieval and known-address symbolication canary using crash module identities. |
| Crash handler deadlocks while formatting a stack. | Move loader traversal, allocation, demangling, I/O, and symbol lookup outside the damaged process. |

## Invariants

- Every symbol claim names the asset class and consumer.
- Every symbolication lookup uses the exact final binary identity and architecture.
- Every separated-debug artifact is derived from and verified against one immutable final-link lineage.
- Every crash module records identity, load range, and address semantics before offline lookup.
- Every source-line claim has matching debug data and retrievable exact source.
- Every retention root is proven at archive extraction, LTO, section collection, and final export stages
  that apply.
- Every strip policy is scoped to an artifact class and checks runtime names, unwind, and debug linkage.
- Every symbol-store upload is followed by an external retrieval and symbolication canary.
- Every optimized result reports unavailable and ambiguous state instead of inventing source history.

## Skill handoffs

- Use `compiler-engineering-review` for the compiler, object, link, debug, and symbolication contract.
- Use [Diagnostics, ABI, Codegen, and Linker Checklist](compiler-diagnostics-abi-linker-checklist.md)
  for linker resolution, plugin ABI, relocations, visibility, exports, and loader binding.
- Use `release-publish-change` for actual symbol upload, retention, publication, or release workflow
  changes after the artifact contract is defined.
- Use `privacy-security-review` or the matching security skill for private symbols, dumps, source,
  paths, and customer-data access control.
- Use `observability-debuggability-review` for production crash telemetry and responder workflows.
- Use `test-maintenance` for symbolication fixtures and release canaries.
