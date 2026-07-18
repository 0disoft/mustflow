# Language and Symbol Resolution Checklist

Use this checklist when variables, functions, methods, types, macros, labels, imports, or generated
names resolve differently because of scope, namespace, phase, receiver, or candidate precedence.

## Contents

1. [Resolution contract](#resolution-contract)
2. [Binding and initialization](#binding-and-initialization)
3. [Namespaces and syntactic position](#namespaces-and-syntactic-position)
4. [Candidate collection and selection](#candidate-collection-and-selection)
5. [Delayed and multi-phase lookup](#delayed-and-multi-phase-lookup)
6. [Generated-code and macro hygiene](#generated-code-and-macro-hygiene)
7. [Language-specific traps](#language-specific-traps)
8. [Runtime identity after lookup](#runtime-identity-after-lookup)
9. [Resolution diagnostics](#resolution-diagnostics)
10. [Test matrix](#test-matrix)
11. [Failure matrix](#failure-matrix)
12. [Invariants](#invariants)
13. [Skill handoffs](#skill-handoffs)

## Resolution contract

For every reference, record:

- source spelling and source range;
- syntactic position and expected namespace;
- lexical and dynamic context;
- declaration candidates and their source origins;
- lookup phase and whether the name is dependent, deferred, or generated;
- qualification, receiver, imports, aliases, and implicit scopes;
- visibility, accessibility, and applicability filters;
- precedence or overload selection rule;
- selected declaration and stable symbol identity;
- initialization state, storage location, runtime value, and dispatch target.

Keep these outcomes separate:

- no binding exists;
- a binding exists but is not initialized;
- candidates exist but none are applicable or accessible;
- several candidates remain ambiguous;
- a different declaration wins;
- the intended declaration wins but produces another runtime object;
- compilation and runtime use different resolution or dispatch products.

## Binding and initialization

Binding selection can occur before execution reaches a declaration. Record:

- scope creation boundary;
- declarations that reserve or classify names for the whole scope;
- declaration, initialization, mutation, and destruction points;
- whether an inner declaration shadows an outer one before initialization;
- explicit nonlocal or global rebinding declarations;
- capture by value, reference, cell, slot, or upvalue;
- branch, exception-handler, loop, pattern, and comprehension scopes;
- class or type body namespace versus method lexical scope;
- import forms that also create local bindings.

Do not interpret a read before assignment as automatic fallback to an outer name. Some languages
classify the name as local for the whole function or block, while keeping it unavailable until its
initializer runs.

## Namespaces and syntactic position

One spelling may legally identify several entities when namespaces are separate. Model at least:

- values and variables;
- functions, methods, and overload sets;
- types, classes, traits, and interfaces;
- modules, packages, and namespaces;
- macros and generated syntax;
- lifetimes, labels, fields, properties, and members where the language separates them.

The syntactic position determines which namespace is queried. Record constructors or declarations
that bind more than one namespace and imports that introduce several related bindings. Diagnostics
should say which namespace was searched rather than only that a spelling was duplicated or absent.

## Candidate collection and selection

Separate candidate discovery from selection:

1. collect lexical, imported, inherited, receiver, associated, extension, or prelude candidates;
2. apply visibility and accessibility;
3. apply arity, type, generic, receiver, and contextual applicability;
4. rank specificity, conversion cost, scope distance, import strength, or language-defined priority;
5. report ambiguity or select one declaration;
6. preserve the complete candidate and rejection ledger for diagnostics.

Qualification can suppress associated or extension lookup, while unqualified syntax can add hidden
friends, implicit receivers, preludes, or imported candidates. A new library member can silently
out-rank a previously selected extension or make an old call ambiguous without changing the call
spelling.

## Delayed and multi-phase lookup

Record when each part of a name is resolved:

- parse or macro-expansion time;
- declaration or template-definition time;
- type checking or generic constraint solving;
- instantiation or monomorphization;
- module linking or class loading;
- runtime dynamic dispatch or reflection.

For dependent or deferred names, preserve the point of definition, point of instantiation, available
imports, associated namespaces, constraints, and generated substitutions. Do not assume an overload
declared later or included in another translation unit becomes visible at every instantiation point.

Store resolved symbol identity in typed IR or bytecode when the language contract requires it. An
evaluator and bytecode engine that independently re-run lookup can choose different candidates after
environment or module state changes.

## Generated-code and macro hygiene

Generated syntax needs an explicit name-origin contract:

- definition-site, call-site, mixed-site, or unhygienic lookup;
- syntax context or expansion mark;
- absolute versus relative paths generated by the macro;
- internal-name collision policy;
- import requirements imposed on the caller;
- namespace and phase of generated references;
- source provenance for diagnostic spans;
- deterministic expansion across file and declaration order.

Do not assume every macro system protects generated names. Use qualified standard or runtime paths
where the language supports them, generate collision-resistant internal bindings, and test callers
that shadow common prelude and library names.

Keep grammar ambiguity separate from name capture. A macro invocation can be rejected before name
resolution because several token interpretations remain locally valid.

## Language-specific traps

### Python-like binding

- Treat assignment, loop targets, imports, exception targets, and similar binders as scope-defining
  operations according to the language execution model.
- Distinguish function-local classification from the runtime point where a value is initialized.
- Treat class-body namespace population separately from method closure capture.
- Record comprehension and annotation-like scope rules from the supported language version instead
  of extrapolating ordinary block scope.
- Treat import as both module resolution and a binding operation whose alias form changes the local
  name introduced.

### JavaScript-like lexical bindings

- Record block start, binding creation, initialization point, and temporal unavailability.
- Do not treat a pre-initialization read as an outer-scope lookup or assume a type-query operator is
  harmless inside the temporal dead zone.
- Distinguish lexical bindings from function or legacy variable hoisting and from module live
  bindings.

### C++-like lookup

- Separate ordinary unqualified lookup from argument-dependent candidate addition.
- Preserve hidden-friend and associated namespace or class evidence.
- Separate non-dependent definition-time names from dependent instantiation-time names.
- Require explicit dependent-type, member, and template disambiguation where the grammar needs it.
- Test whether qualification intentionally disables argument-dependent lookup at a stable API
  boundary.

### Rust-like namespaces and macros

- Record type, value, macro, lifetime, and label namespaces independently.
- Remember that some declarations introduce both a type and a value-like constructor.
- Treat declarative macro hygiene and procedural macro output as different contracts.
- Test generated paths and common names against caller shadowing, imported preludes, and crate
  renaming under the supported contract.

### Go-like short declarations

- Record the exact block owning every name on the left side.
- Distinguish same-block redeclaration from a new inner binding.
- For mixed declaration and assignment, identify which names are new and which storage locations are
  updated.
- Add a fixture where a common error or result name is accidentally shadowed in a nested branch.

### Java-like names

- Classify the name as package, type, expression, method, or module before applying precedence.
- Keep shadowing, hiding, and obscuring as distinct relationships.
- Record single-name imports, on-demand imports, inherited members, local variables, and qualified
  forms separately.
- Generated code should qualify collision-prone public types and avoid relying on wildcard imports.

### Kotlin-like and C#-like extensions

- Treat extensions as statically selected helpers, not injected members of the runtime type.
- Record member candidates before extension candidates.
- Preserve implicit receiver stack, local and imported extension scope, package or namespace
  distance, aliases, and DSL receiver restrictions.
- Add a compatibility fixture where a library version introduces a real member with the same name as
  an existing extension.

## Runtime identity after lookup

Source-level symbol selection is not the end of the chain. Record:

- captured cell, slot, field, property, or module binding used at runtime;
- virtual, interface, extension, overload, or dynamic dispatch target;
- class loader or module instance owning the selected type;
- inline, generic, or compiled-code cache key;
- rebinding, hot reload, module replacement, or reflection that can change runtime identity;
- equality, type identity, and singleton expectations.

A compiler can select the intended declaration while a loader supplies another class or module
instance. Hand off to the module and loader checklist when physical or runtime identity diverges.

## Resolution diagnostics

Structured diagnostics should expose:

- stable diagnostic category;
- queried namespace and lookup phase;
- selected scope or receiver chain;
- candidate declarations with origin;
- visibility, applicability, and ranking rejection reasons;
- shadowing declaration and hidden outer declaration;
- required qualification, alias, or dependent-name marker;
- generated expansion provenance;
- selected declaration identity when behavior changed without an error.

Rendered candidate lists may be truncated, but machine-readable evidence should retain the owning
reason for every omitted or rejected candidate under a bounded policy.

## Test matrix

Vary one dimension at a time:

- outer, same-block, and nested shadowing;
- read before and after initialization;
- branch never taken but binder still present;
- explicit qualification versus unqualified lookup;
- import alias, wildcard or on-demand import, and fully qualified name;
- member versus extension or associated function;
- definition-time versus instantiation-time visibility;
- generated caller shadowing and absolute paths;
- separate namespace positions for the same spelling;
- evaluator, bytecode, optimized, and cached execution paths;
- file, declaration, import, and module order perturbation;
- library version adding a candidate without changing the call site.

Assert selected symbol identity and candidate rejection reasons, not only final value. Two candidates
can currently return the same value and hide a resolution regression.

## Failure matrix

| Symptom | Evidence to require |
| --- | --- |
| Outer value exists but read fails before an inner declaration. | Scope-wide binding classification and initialization state. |
| Unqualified call changes after adding a library overload. | Ordinary and associated candidate sets, applicability, ranking, and selected symbol. |
| Generic code fails only for one type. | Dependent classification, definition context, instantiation context, and substitutions. |
| Generated code cannot find a common library name. | Hygiene mode, call-site bindings, generated path, and expansion provenance. |
| Nested block returns success but outer result stays unchanged. | Block owner and storage identity for each same-spelled binding. |
| Extension call silently changes to a member. | Member-first candidate rule and compatibility fixture across library versions. |
| Interpreter and compiled path disagree. | Persisted resolved identity versus independent runtime re-resolution. |
| Same class name cannot be cast to itself. | Source symbol, physical class bytes, defining loader, and runtime type identity. |

## Invariants

- Every reference identifies a namespace, syntactic position, scope, phase, and source range.
- Every candidate set distinguishes collection, filtering, ranking, and final selection.
- Every shadowing claim names both bindings and their storage or symbol identities.
- Every deferred lookup claim preserves definition and instantiation contexts.
- Every generated name records hygiene and source provenance.
- Every resolution regression asserts selected symbol identity even when behavior currently matches.
- Every runtime claim distinguishes source declaration from loaded type or module identity.

## Skill handoffs

- Use `name-resolution-integrity-review` for the cross-language lookup trace and identity split.
- Use `compiler-engineering-review` for semantic analysis, typed IR, lowering, and compiler or linker
  correctness after lookup localization.
- Use `interpreter-engineering-review` for resolver, environment, frame, closure, bytecode, and
  runtime cache implementation.
- Use `parser-engineering-review` for syntax and macro grammar ambiguity before binding.
- Use the matching language code-change skill for source-language fixes.
- Use `module-boundary-review` for architecture import direction and package public API policy.
- Use the module, package, and loader checklist when runtime or physical module identity diverges.
