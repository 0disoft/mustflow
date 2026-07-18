# Diagnostics, ABI, Codegen, and Linker Checklist

Use this checklist for compiler diagnostics and recovery, source mapping, fix-its, ABI and layout,
machine lowering, assembly and object metadata, unwind, linker resolution, cross-target execution,
and binary compatibility.

## Contents

1. [Structured diagnostics](#structured-diagnostics)
2. [Source coordinates](#source-coordinates)
3. [Macro, include, and generated provenance](#macro-include-and-generated-provenance)
4. [Recovery and fix-its](#recovery-and-fix-its)
5. [Diagnostic determinism and rendering](#diagnostic-determinism-and-rendering)
6. [Stage separation](#stage-separation)
7. [ABI producer-consumer matrix](#abi-producer-consumer-matrix)
8. [Layout and calling-convention probes](#layout-and-calling-convention-probes)
9. [Exceptions and unwind](#exceptions-and-unwind)
10. [Object metadata](#object-metadata)
11. [Machine-code pipeline](#machine-code-pipeline)
12. [Assembler and disassembler](#assembler-and-disassembler)
13. [Differential execution](#differential-execution)
14. [Object-format and symbol-namespace matrix](#object-format-and-symbol-namespace-matrix)
15. [Link resolution graph](#link-resolution-graph)
16. [Archive extraction and section reachability](#archive-extraction-and-section-reachability)
17. [Relocation contract](#relocation-contract)
18. [Static and dynamic resolution](#static-and-dynamic-resolution)
19. [Visibility, export, and import boundaries](#visibility-export-and-import-boundaries)
20. [Language linkage and complete ABI identity](#language-linkage-and-complete-abi-identity)
21. [Stable C and plugin boundaries](#stable-c-and-plugin-boundaries)
22. [Dynamic loading and plugin lifecycle](#dynamic-loading-and-plugin-lifecycle)
23. [Relaxation and boundary generation](#relaxation-and-boundary-generation)
24. [Portable link reproduction](#portable-link-reproduction)
25. [Cross-target evidence](#cross-target-evidence)
26. [Failure matrix](#failure-matrix)
27. [Invariants](#invariants)
28. [Skill handoffs](#skill-handoffs)

## Structured diagnostics

Treat the diagnostic data model as the primary contract. Record:

- stable diagnostic identity or category;
- severity and whether policy can remap it;
- primary source location and range;
- related locations and ranges;
- parent error, child note, and causal graph;
- message arguments before localization;
- expected tokens, types, candidates, or recovery action;
- fix-it edits with applicability or confidence;
- originating compiler stage;
- recovery node or placeholder identity;
- rendered text, color, and layout as a secondary surface.

Use both inline expectations and complete rendering fixtures when the repository supports them.
Inline assertions tie a diagnostic to its source position and identity; full fixtures cover snippets,
underlines, notes, help text, ordering, truncation, and line wrapping.

Do not let broad text matching accept the right words at the wrong location. Do not let a complete
snapshot make harmless wording or ordering changes hide a structural span or note-ownership defect.

## Source coordinates

Name every coordinate unit:

- byte offset in the original source buffer;
- decoded scalar or code-point index;
- UTF-16 or host string offset;
- grapheme cluster boundary;
- line index and line-ending policy;
- terminal display column;
- token-start and token-end semantics;
- half-open character range or token range.

Test a matrix containing:

- ASCII;
- tabs at several tab stops;
- multi-byte encoded characters;
- combining marks;
- wide and emoji characters;
- mixed scripts and bidirectional text where supported;
- LF, CRLF, and other accepted line boundaries;
- byte-order mark;
- final newline present and absent;
- invalid or replacement-decoded input where the frontend accepts it;
- multi-character operators, escapes, raw strings, comments, and escaped newlines at range ends.

Internal source anchors and rendered columns may use different units. Convert explicitly and test
the mapping. A byte-based primary location does not permit a byte count to be drawn directly as a
terminal underline.

## Macro, include, and generated provenance

For macro-like expansion systems, preserve and test:

- spelling location;
- expansion or invocation location;
- argument-substitution origin;
- token-paste or generated-token origin;
- nested expansion stack;
- whether the user can fix the invocation or must fix the definition;
- primary versus note-location policy.

For includes, modules, precompiled state, generated files, virtual files, and remapping:

- distinguish physical path, logical source name, and user-visible remapped path;
- preserve include or import stack order;
- point notes for declarations back to their source artifact;
- prevent absolute workspace, cache, or temporary paths from leaking after remapping;
- test symlink and case behavior only under the repository's supported platform contract;
- ensure remapping is applied once and consistently to every related location.

## Recovery and fix-its

Measure recovery by preserved structure and bounded damage:

- delete, duplicate, or replace one token in a small valid program;
- require the parser or semantic stage to make progress;
- preserve later valid declarations or regions when the language contract permits it;
- cap related diagnostics and recovery work;
- preserve error or recovery nodes with source provenance;
- block recovery placeholders from unsafe optimization, lowering, code generation, or execution;
- distinguish one root repair from independent later errors.

Treat fix-its as edit transactions:

1. validate all edit ranges against the same source snapshot;
2. reject or resolve overlapping and conflicting edits explicitly;
3. apply edits in an offset-safe order;
4. rerun the relevant frontend and semantic stages;
5. require the intended diagnostic to disappear or change as specified;
6. check that no forbidden new diagnostic or semantic change appears;
7. apply the same fix-it again and require no additional change when idempotence is promised.

For warning fix-its that claim semantics preservation, compare observable behavior or the relevant
IR contract. For error recovery, compare the compiler's assumed repaired structure with the actual
structure after applying the edit.

## Diagnostic determinism and rendering

Repeat under:

- serial and supported parallel frontend modes;
- different worker counts and schedules;
- terminal widths from narrow to wide;
- color on and off;
- Unicode and ASCII fallback rendering;
- short and long paths;
- multiple supported language or edition modes;
- duplicate-suppression enabled and disabled when exposed;
- stable and randomized internal IDs where applicable.

Compare diagnostic identities, primary spans, related-span ownership, and note graph before line
order. Independent diagnostics may reorder; a note moving to another parent is not harmless.

Normalization may remove known platform paths, nondeterministic temporary names, or color escapes.
It must not erase line, column, range, diagnostic identity, argument, note relation, or mode-specific
behavior that the test intends to protect.

## Stage separation

Persist and test separately:

| Stage | Primary artifact | Stronger oracle |
| --- | --- | --- |
| Frontend | Semantic IR or module | Source semantics and structured diagnostics. |
| Optimizer | Transformed IR | Defined execution or translation validation. |
| Machine lowering | Machine IR | Machine verifier and target semantics. |
| Assembler | Object | Encoding, relocation, symbol, and section contracts. |
| Linker | Linked image and map | Resolution graph, relocations, layout, and loader contract. |
| Runtime | Process observation | ABI-aware independent reference or specified behavior. |

Do not wrap compile, assemble, link, load, and run into one Boolean result when diagnosing a
compiler defect. Preserve the artifact before and after the first failing stage.

For whole-program optimization, also separate summary generation, import or index selection,
per-module backend compilation, native object generation, and final native link.

## ABI producer-consumer matrix

Cross independent implementations and versions:

| Caller producer | Callee producer | Direction |
| --- | --- | --- |
| Compiler or version A | Compiler or version B | A calls B. |
| Compiler or version B | Compiler or version A | B calls A. |
| Current | Previous supported | Current calls previous and reverse. |
| Compiler generated | Hand-authored boundary probe | Both directions where valid. |

Cover ABI surfaces such as:

- scalar, aggregate, vector, and variadic arguments;
- return-in-register and hidden aggregate-return conventions;
- stack alignment and caller-reserved areas;
- callee-saved registers and flags;
- homogeneous or special aggregate classes;
- over-aligned and packed data;
- bit fields and flexible tails;
- empty base or zero-sized members where the ABI defines them;
- virtual dispatch and member pointers where applicable;
- name mangling and symbol versioning;
- exceptions, unwind, destructors, and cleanup;
- thread-local storage and visibility.

One compiler building both sides can make the same ABI mistake symmetrically and appear correct.

## Layout and calling-convention probes

Use independent evidence layers:

- source-level size, alignment, and offset observations;
- compiler layout or ABI classification output;
- debug type metadata;
- object symbols and relocations;
- hand-authored caller or callee probes;
- runtime register, stack, and memory capture;
- binary-compatibility comparison against a supported baseline.

A boundary probe may record, without perturbing the contract more than necessary:

- incoming argument registers and stack slots;
- stack pointer alignment;
- hidden result and context pointers;
- vector and floating-point register placement;
- preserved-register values before and after the call;
- aggregate bytes and padding where observation is defined;
- return registers and cleanup behavior.

Do not use debug metadata as proof of runtime layout or runtime values as proof that debug metadata
is correct. Compare them as separate products.

## Exceptions and unwind

Test cross-boundary throw and catch in both producer directions. Cover:

- normal call and tail-call adjacency;
- destructor and cleanup ordering;
- register pressure and callee-saved restoration;
- stack probing and dynamic allocation;
- inline assembly adjacency;
- inlining boundaries;
- foreign-function frames;
- signal, structured, table-driven, or platform-specific unwind modes in declared scope;
- backtrace and personality or language-runtime interaction.

Inspect unwind records structurally in the object and linked image, then test runtime unwinding on a
supported target. A function returning the right value does not exercise exception ABI.

## Object metadata

Inspect fields consumed by assemblers, linkers, loaders, debuggers, and runtimes:

- instruction encodings and data bytes;
- relocation type, offset, addend, symbol, and section;
- symbol value, size, type, binding, visibility, and version;
- section type, flags, alignment, order constraints, and grouping;
- deduplication or COMDAT-like groups;
- thread-local storage model;
- exception and unwind records;
- debug line and type information;
- target attributes and feature notes;
- build identity or reproducibility metadata where in scope.

Whole-object byte comparison is often too sensitive to timestamps, string tables, or harmless
ordering. Disassembly text is too weak for relocations, visibility, unwind, debug, and grouping.
Parse and compare the structural fields that own the contract.

## Object-format and symbol-namespace matrix

Name the concrete object and loader contract before interpreting a symbol listing. Similar-looking
rows do not have portable meaning across formats.

When the task names Linux ELF with GNU `ld`, use that as the explicit baseline rather than a vague
"Unix linker" model:

- `.symtab` is the regular link-time and tooling symbol table and may contain local symbols and
  entries that are not part of the runtime interface;
- `.dynsym` is the loader-facing dynamic namespace selected for dynamic linking and runtime lookup;
- symbol binding, type, visibility, section index, value, size, and optional version are separate
  fields and must not be collapsed into one "symbol exists" Boolean;
- undefined, absolute, common or tentative, and section-defined entries have different selection and
  allocation meaning;
- local, global or strong, and weak binding affect resolution independently of visibility;
- procedure linkage and global-offset indirection affect call and data binding without making the
  regular symbol table identical to the dynamic interface.

Do not project those ELF section names or GNU resolution rules onto PE/COFF or Mach-O. Use the
platform columns below to name the corresponding evidence surfaces and explicitly record when the
selected linker implements a different policy.

| Contract | ELF-family baseline | PE/COFF-family distinction | Mach-O-family distinction |
| --- | --- | --- | --- |
| Full link-time symbols | Regular object symbol table records local and global definitions, undefined references, binding, type, visibility, section, value, and size. | COFF object symbols and auxiliary records drive static linking, but are not the runtime export surface. | Object symbols and dynamic-symbol metadata participate in linking, while final exported-name structures are a separate loader surface. |
| Loader-visible interface | Dynamic symbol namespace plus dynamic dependency and relocation metadata. | Export directory, import directory, and import-library contract are distinct surfaces. | Exported-name data, indirect symbols, stubs, pointer sections, and load-command dependencies form the loader contract. |
| Deduplication | Weak, group, and link-once-like semantics are format and linker policy. | COMDAT selection carries explicit selection policy and associative relationships. | Weak and coalesced definitions use platform-specific selection and dead-strip rules. |
| Dynamic indirection | Procedure and data indirection structures may defer or localize binding. | Import address indirection and optional delayed loading follow the image contract. | Stubs and lazy or non-lazy symbol pointers mediate imports. |
| Namespace model | Visibility, version, preemption, and dependency scope affect selection. | Imported and exported names, decorated names, and module boundaries are explicit. | Two-level or flat namespace policy changes which image owns a definition. |

For every claim, record which namespace was inspected: input object, archive index, linked regular
symbol table, loader-visible export table, import table, dynamic dependency list, or runtime lookup.
Absence from one namespace is not evidence of absence from the others.

## Machine-code pipeline

Persist machine-stage input and output around:

- instruction legalization;
- register-bank or class selection;
- instruction selection;
- target combines and peepholes;
- scheduling;
- register allocation and spilling;
- frame layout;
- prologue and epilogue insertion;
- branch relaxation and thunk insertion;
- final instruction encoding.

Run the machine verifier or repository equivalent after each stage. Check operand classes, virtual
and physical register constraints, dominance and liveness, frame indices, call-preserved masks,
implicit operands, bundle or delay-slot rules, target feature requirements, and terminators.

The first invalid machine artifact is more useful than a later assembler crash or wrong executable.

## Assembler and disassembler

Use semantic round trips:

1. assemble source into object;
2. parse encodings, relocations, symbols, and sections;
3. disassemble to a canonical or accepted assembly form;
4. reassemble;
5. compare semantic encodings and metadata;
6. execute supported instructions through a reference model, emulator, or real target where useful.

Allow documented mnemonic aliases, implicit operands, canonical operand order, and formatting
changes. Reject changes in instruction semantics, target features, relocation meaning, or flags.

Keep malformed encoding and text rejection lanes separate from valid semantic round trips.

## Differential execution

Compare the same defined IR or source across:

- optimization levels;
- compiler revisions;
- backend selection paths;
- instruction-selection modes;
- target features;
- code models and relocation models;
- assemblers or linkers;
- reference interpreter or specification model.

Freeze or normalize legitimate dimensions: floating-point mode, denormal handling, exception masks,
address-space layout when irrelevant, environment, locale, runtime libraries, and target feature
availability.

Do not use majority vote. Select a specification, interpreter, translation validator, hand-written
reference, or other independent authority. If none exists, classify the result as a discrepancy.

## Link resolution graph

Represent a minimal graph of:

- strong and weak definitions;
- tentative or common definitions where supported;
- hidden, protected, and default visibility;
- versioned symbols;
- archive members and extraction rules;
- groups and cyclic archives;
- deduplicated or COMDAT-like sections;
- whole-archive or force-load behavior;
- link scripts and symbol aliases;
- whole-program optimization inputs and native objects;
- undefined-reference demand at each ordered input position;
- archive index entries and the members that satisfy that demand;
- section roots and reference edges used by section collection;
- relocations from consuming locations to selected definitions;
- loader-visible exports, imports, direct dependencies, and binding time.

Capture the actual final link inputs after compiler-driver expansion. Source declarations, build
configuration, and an intended library list do not prove what the linker consumed. Compare object
identity, order, archive membership, target mode, symbol decoration, whole-program optimization
artifacts, startup objects, and implicit libraries.

Permute object and archive order only where the format and command contract allow order variation.
Inspect selected definition, discarded alternatives, map or selection-trace evidence, relocation
target, retained section, final regular symbol table, loader-visible symbol table, and dependency
closure. Final program output can hide wrong resolution when two definitions happen to return the
same value.

## Archive extraction and section reachability

An archive is a searchable set of members, not one giant object. Model extraction as a stateful
process:

1. begin with the unresolved references and roots already established by earlier inputs;
2. inspect the archive under its declared scan and rescan rules;
3. extract only members selected by current demand unless the contract forces broader retention;
4. add each extracted member's definitions, undefined references, groups, and sections;
5. continue until the platform and option contract says the input is exhausted;
6. run section reachability and deduplication as separate decisions.

Test order-sensitive and cyclic cases with the smallest graph that exposes the rule. Grouping,
rescan, whole-archive, force-load, automatic-registration anchors, and undefined-symbol roots are
distinct retention mechanisms; do not treat one as a portable spelling for another.

For the ordinary GNU `ld` static-archive baseline, an archive is considered where it appears in the
ordered input stream and members are pulled to satisfy demand known at that point. A definition or
new undefined reference introduced only by a later input does not by itself prove that an earlier
archive will be searched again. Treat explicit group or rescan semantics as a different contract and
preserve the selection trace that proves the revisit.

For constructors, registries, plugins, and self-registering tests, prove both member extraction and
section survival. A member can be extracted and later have an unreferenced registration section
discarded, or never be extracted despite containing a constructor. Record the root that keeps the
registration path alive and test its absence as a negative case.

For every collected or discarded section, preserve:

- owning object and archive member;
- group or associative relationship;
- root reason or incoming reference edge;
- deduplication winner and discarded peers;
- collection decision and the policy phase that made it;
- any address-significant, unwind, initialization, or metadata coupling.

## Relocation contract

A relocation is a deferred calculation owned jointly by the producer, object format, linker, and
loader. Record:

- relocation kind and architecture;
- consuming section and offset;
- referenced symbol or section;
- explicit or implicit addend representation;
- place, symbol, base, and other terms used by the formula;
- width, signedness, alignment, range, and overflow behavior;
- static-link versus dynamic-load responsibility;
- indirection, thunk, or relaxation eligibility;
- final encoded value and selected definition.

Do not infer the relocation contract from disassembly text or a resolved address alone. Two object
files can produce identical bytes while carrying different future-link behavior, and a linked image
can run in one layout while retaining the wrong dynamic relocation or interposition semantics.

Pair every relocation regression with a producer-side structural assertion and a consumer-side
selection assertion. Generate boundary cases around displacement, code model, alignment, TLS model,
preemptibility, and section-placement transitions under the named target ABI.

## Static and dynamic resolution

Keep three decisions separate:

| Boundary | Question |
| --- | --- |
| Static object and archive selection | Which input definition and section satisfy each reference in the linked image? |
| Dynamic dependency construction | Which shared images and import records remain direct runtime dependencies? |
| Loader binding | Which runtime definition satisfies each loader-visible reference, and when is that choice made? |

Record local, hidden, protected, preemptible, interposable, weak, versioned, and undefined behavior
under the exact platform contract. Eager versus deferred binding, executable-defined overrides,
symbol interposition, two-level namespace ownership, import-address indirection, and direct binding
are not interchangeable mechanisms.

Dependency pruning policies can make input position and current unresolved demand observable. Prove
the final direct dependency list and the relocation or import that justifies each retained dependency.
Do not accept an indirect dependency merely because it happens to be present in the current process.
For shared-library closure, test the consumer against the declared direct dependencies instead of
letting ambient loader state complete the graph.

## Visibility, export, and import boundaries

Define the public binary surface with an allowlist, not with whatever names the linker happens to
expose. Use the platform's native export mechanism and verify the final image after link.

For a library header or generated interface, distinguish at least:

- producer of a shared library;
- consumer of that shared library;
- static-library build and consumer;
- internal implementation and test-only visibility;
- language linkage and calling convention;
- data import or export when unavoidable.

Prefer hidden or internal visibility for implementation symbols. Treat exported global data as a
high-risk ABI because storage ownership, initialization, thread-local rules, copy or import
relocations, and module unload all become observable. Prefer accessor functions or opaque handles.

Diff the final exported names, versions, ordinals where part of the contract, types, sizes where
available, and direct dependencies against a supported baseline. Check both unexpected additions and
missing required exports. Source annotations alone are not proof: template instantiation, inline
emission, linker scripts, export lists, definition files, whole-program optimization, and dead
stripping can change the final surface.

## Language linkage and complete ABI identity

Language linkage controls only part of the boundary. A C-linkage name can still disagree on calling
convention, parameter or return representation, alignment, packing, ownership, exception behavior,
thread-local model, or target ABI. Some name-mangling schemes omit facts such as return type, so two
incompatible declarations can resolve to the same symbol.

Treat a matching decorated or mangled name as a lookup result, not an ABI proof. Record the complete
boundary identity:

- target architecture, object format, and ABI family;
- compiler ABI mode and ABI-affecting options;
- source-language version and relevant runtime-library ABI;
- calling convention and function type including return classification;
- record layout, packing, alignment, bit-field, enum, and vector rules;
- exception, unwind, RTTI, and dynamic-cast identity;
- template, inline, virtual table, type-info, and key-definition ownership;
- allocator, deallocator, destructor, and module-unload ownership.

Default arguments and inline implementation live in consumers once compiled. Changing them without
changing a symbol can change behavior across old and new clients. COMDAT or weak deduplication can
also hide an ODR mismatch by selecting one copy nondeterministically or by link order. Test mixed
old/new consumers, reverse producer roles, and load order where the supported ABI permits it.

Avoid exposing standard-library containers, compiler-private exception types, or private class
layout across a long-lived binary boundary unless the toolchain, runtime, build options, and support
window are intentionally locked. Ensure allocation and release occur in the owning module when heaps
or runtimes may differ.

## Stable C and plugin boundaries

For a durable cross-toolchain boundary, prefer an explicitly versioned C-shaped facade with opaque
handles and fixed-width or otherwise contract-defined scalar representations. That reduces the
surface; it does not remove the ABI work.

For a versioned function-table interface, specify:

- structure size and ABI version before optional fields;
- required and optional capability bits;
- nullability and lifetime of every function pointer and context;
- calling convention and thread-safety contract;
- ownership of input buffers, returned buffers, handles, and callbacks;
- allocator and release functions paired by the same module;
- error transport that does not throw exceptions across the boundary;
- forward and backward compatibility rules for unknown fields and capabilities;
- initialization, shutdown, reentrancy, and module-unload behavior.

Negotiate the highest mutually supported contract and test smaller historical table sizes. Reject a
provider before calling through it when required fields, version, size, target ABI, or capabilities
do not match. Keep the export allowlist small: usually the boundary-discovery entry point and the
explicitly supported C facade, not every implementation symbol.

## Dynamic loading and plugin lifecycle

Treat plugin activation as a transaction with explicit discovery, validation, binding, publication,
quiescence, and retirement stages.

### Dependency retention and binding time

Record:

- direct shared dependencies retained in the final image and why each is needed;
- dependency pruning decision at the input position where the shared image appeared;
- symbols, constructors, registration side effects, or runtime lookups not visible as ordinary
  unresolved references;
- eager versus deferred function binding;
- data relocations and other references that remain eager under a lazy function policy;
- delayed-load or optional-load failure hook and fallback contract;
- capability and entry-point validation completed before publication.

A lazy policy moves some failures to first use; it does not prove the module can satisfy every
required reference. Validate required capabilities and entry points before accepting work. Treat
optional functionality as a negotiated capability, not as an unhandled missing symbol at call time.

Do not rely on a transitive shared dependency to complete the consumer's undeclared closure. Compare
the final direct-dependency list with an allowlist and test in an environment without ambient copies.

### Interposition and exported data

For every default-visible or otherwise preemptible symbol, record whether calls from the defining
image may bind to another definition. Local binding, protected semantics, symbolic binding, semantic-
interposition assumptions, and instrumentation interposition are different contracts.

Changing interposition policy can alter:

- internal call targets;
- optimizer inlining and constant propagation;
- preload-based instrumentation, sanitizers, profilers, and tests;
- allocator, logging, hook, and singleton identity;
- override behavior expected by existing consumers.

Treat exported writable data as a storage ABI. Record copy or import relocation behavior, address
identity, initialization owner, TLS model, mutation visibility, and unload lifetime. Prefer functions
and opaque contexts because an exported address is harder to version or interpose safely.

When static archives are bundled into a shared image, verify that their implementation symbols do
not leak into the final dynamic interface. Default visibility inside an archive is not private after
the member becomes part of a shared image.

### Loader scopes and namespaces

Record the platform-specific lookup domain:

- process-global, local, dependency, self-first, or isolated namespace;
- promotion rules that can make a local image globally visible;
- parent, host, or bundle-loader relationship;
- two-level image ownership versus flat name lookup;
- deep-binding or self-first policy and its effect on interposition;
- duplicate runtime, allocator, RTTI, exception, and singleton instances;
- namespace limit, shared process state, and security boundary.

A separate loader namespace can isolate symbol resolution without isolating memory corruption,
signals, file descriptors, credentials, or process privileges. Use process isolation when trust or
crash containment is required.

Do not use self-first binding as a universal collision fix. It can split runtime identity and defeat
instrumentation that depends on interposition.

### Runtime symbol lookup

Centralize runtime lookup behind a typed resolver that records:

- module or namespace identity;
- symbol spelling, optional version, and case policy;
- name versus ordinal lookup;
- lookup API error protocol, including valid null-valued definitions where supported;
- expected function type and calling convention;
- required versus optional classification;
- capability bit and ABI-table field associated with the result;
- stable diagnostic without exposing raw addresses or private paths.

Do not treat a pointer value alone as the complete success signal when the platform exposes a
separate error channel. Avoid sparse ordinal lookup as an optional API protocol unless the export
contract explicitly owns those ordinals.

### Activation and retirement

Activate in this order:

1. resolve an allowed absolute or manifest-bound artifact identity;
2. verify platform, architecture, ABI major, binary identity, and trust policy;
3. load into the intended namespace and binding mode;
4. resolve every required discovery entry point and negotiate the function table;
5. validate size, version, capabilities, ownership, threading, and error contracts;
6. publish the provider atomically to new callers;
7. on retirement, block new calls and unregister callbacks;
8. cancel work, join threads, drain calls, return handles, and wait for the ownership epoch to close;
9. unload only when no code, data, TLS destructor, callback, vtable, or function pointer can remain.

Loader close success does not prove physical unmapping, and physical unmapping does not prove safety.
For complex native plugins, a never-unload policy or process replacement can be safer than in-process
hot reload. State that lifecycle choice explicitly.

Do not use an ambient search path as version negotiation. Bind discovery to an allowed location and
manifest containing architecture, ABI, identity, and capability expectations, then verify the loaded
image rather than trusting its filename.

## Relaxation and boundary generation

Derive exact thresholds from target and object rules, then generate cases at:

- minimum minus one, minimum, and minimum plus one;
- maximum minus one, maximum, and maximum plus one;
- alignment boundary before and after one byte or unit of padding;
- branch displacement just within and just outside direct reach;
- small or medium code-model boundary;
- local versus global, preemptible, or interposable symbol boundary;
- relaxation eligible versus one-condition-ineligible;
- section collection root present versus absent;
- identical-code folding candidates differing by one relocation or semantic property.

Verify the expected direct form, relaxed form, thunk, veneer, long branch, relocation, retained
section, or non-folded identity. Store the formula and target parameters, not only a giant fixture.

## Portable link reproduction

A closed link reproducer should include:

- linker identity and target mode;
- response or argument file after driver expansion;
- all native objects, archives, scripts, startup objects, and required libraries;
- environment and working-directory assumptions;
- whole-program optimization outputs or a separate boundary proving they are not the failing stage;
- expected map, selected symbol, relocation, diagnostic, image hash, or runtime predicate;
- privacy and license review for embedded inputs.

Reduce in layers:

1. libraries and archive groups;
2. archive members and objects;
3. sections;
4. symbols;
5. relocations and data;
6. link options and scripts;
7. target features and layout facts.

Preserve the original link defect rather than accepting any link failure.

## Cross-target evidence

Separate evidence levels:

- host-side parsing and structural validation of target IR, machine IR, assembly, and object;
- successful cross-link with correct target metadata;
- emulator or simulator execution;
- remote runner execution;
- real hardware execution;
- cross-version or cross-compiler producer-consumer execution.

Report which level ran. A correct object header on the host does not prove target execution, and an
emulator result may not cover hardware errata, system ABI integration, or feature detection.

Preserve target runtime libraries, loader, kernel or operating environment, CPU features, and
execution arguments in the reproduction capsule.

## Failure matrix

| Fault or variation | Required evidence |
| --- | --- |
| Diagnostic text changes but structure is stable. | Structural contract passes; rendering fixture is reviewed separately. |
| Same text appears at wrong source span. | Inline identity and location assertion fails. |
| Macro expansion moves the caret. | Spelling and expansion policy selects the correct primary and note sites. |
| One token is removed. | Recovery progresses, later structure survives as specified, and cascades remain bounded. |
| Fix-its overlap. | Transaction rejects or resolves conflict explicitly. |
| Parallel diagnostics reorder. | Parent-note graph and diagnostic multiset remain stable. |
| Same compiler builds ABI caller and callee. | Cross-producer fixture prevents common-mode masking. |
| Runtime layout is right but debug layout is wrong. | Independent layout layers detect the metadata defect. |
| Machine IR becomes invalid after one stage. | Immediate verifier localizes the producing stage. |
| Disassembly spelling changes. | Semantic encoding and relocation comparison ignores harmless aliases. |
| Symbol order changes. | Resolution graph distinguishes permitted order dependence from defect. |
| A symbol exists in an object but not at runtime. | Namespace evidence distinguishes regular symbols, loader-visible exports, imports, and stripped metadata. |
| An archive contains the required definition but the link fails. | Ordered unresolved-demand and member-extraction trace proves whether the member was eligible. |
| A registrar or constructor silently disappears. | Archive extraction and section-root evidence independently prove member and section survival. |
| A definition is selected but a call reaches another implementation. | Static relocation choice, dynamic dependency, visibility, interposition, and loader binding are checked separately. |
| A C-linkage function resolves but corrupts its caller. | Full calling convention, return classification, layout, ownership, and toolchain ABI identity are compared. |
| A shared library gains accidental public symbols. | Final export allowlist diff rejects the expanded loader-visible surface. |
| A plugin table is shorter than the current provider expects. | Size, version, capability, required-field, and nullability gates reject it before indirect calls. |
| Application starts but fails on the first rare plugin call. | Eager capability and required-entry validation exposes deferred binding failure before publication. |
| Bundled dependency hijacks another plugin. | Final export allowlist, loader scope, interposition, dependency identity, and namespace evidence reveal the leak. |
| A writable global has two observed values. | Data export, copy or import relocation, address identity, TLS model, and storage owner are compared. |
| Runtime symbol lookup returns a null-like value. | Platform error-channel protocol distinguishes valid value from lookup failure. |
| Plugin unload succeeds and later callback crashes. | Retirement evidence covers call quiescence, callback removal, threads, TLS, handles, and pointer lifetime. |
| Development loads the right plugin but production loads another. | Allowed path, manifest identity, search policy, architecture, ABI, and post-load image identity are verified. |
| Branch crosses reach by one unit. | Generated boundary case selects required long form or thunk. |
| Link driver fails outside the original machine. | Closed input archive exposes missing ambient dependency. |
| Cross target cannot execute locally. | Host structural evidence is reported separately from missing runtime proof. |

## Invariants

- Every diagnostic assertion identifies structure and source, not text alone.
- Every rendered column derives from an explicit coordinate conversion.
- Every recovery path progresses or terminates within a declared bound.
- Every fix-it transaction applies to one source snapshot and has a post-apply oracle.
- Every ABI claim crosses an independent producer-consumer boundary or names the common-mode gap.
- Every object claim checks the metadata fields that own the behavior.
- Every symbol claim names the object, archive, linked, export, import, or runtime namespace observed.
- Every archive claim distinguishes member extraction from section retention.
- Every relocation claim records its formula inputs, range, selected target, and static or dynamic owner.
- Every public binary surface has a final-image export and direct-dependency allowlist.
- Every language-linkage claim is subordinate to a complete calling, layout, ownership, runtime, and
  toolchain ABI contract.
- Every versioned plugin table validates size, version, capabilities, and required fields before use.
- Every plugin activation resolves and validates required capabilities before publishing the provider.
- Every loader-scope claim names interposition, namespace, dependency, and runtime-identity effects.
- Every exported-data claim identifies storage, relocation, TLS, address, and lifecycle ownership.
- Every unload claim proves quiescence of calls, callbacks, threads, TLS, handles, and code pointers.
- Every backend first-failure claim preserves machine artifacts around the boundary.
- Every differential execution result has an independent semantic authority.
- Every linker reduction preserves the original resolution or relocation predicate.
- Every cross-target claim states the actual execution evidence level.

## Skill handoffs

- Use `compiler-engineering-review` for the full diagnostic, ABI, codegen, object, and linker
  contract.
- Use `parser-engineering-review` for tokenization, grammar, CST and AST recovery, and parser source
  units.
- Use `fuzz-harness-review` for harness, instrumentation, corpus, campaign, sanitizer, and generic
  reducer infrastructure.
- Use the matching C, C++, Rust, assembly, or other language skill for source and ABI semantics.
- Use `cross-platform-filesystem-safety` for path, case, symlink, and file identity issues that are
  not specific to compiler source mapping.
- Use `error-message-integrity-review` for public error mapping beyond compiler diagnostics.
- Use `test-maintenance` for regression fixtures and snapshot lifecycle.
