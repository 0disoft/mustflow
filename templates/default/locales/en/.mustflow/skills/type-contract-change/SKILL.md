---
mustflow_doc: skill.type-contract-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: type-contract-change
description: Apply this skill when public or shared types, interfaces, generic constraints, function parameters or returns, unions, DTOs, adapters, runtime schemas, serialization forms, generated declarations or clients, fixtures, examples, or independently built consumers are created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.type-contract-change
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

# Type Contract Change

<!-- mustflow-section: purpose -->
## Purpose

Treat a type change as a repository and consumer contract event rather than a declaration edit.
Close the path from the changed symbol through inference, implementations, test assets, runtime
data, serialization, generated artifacts, documentation, configuration, packaged output, and old or
independently deployed consumers.

<!-- mustflow-section: use-when -->
## Use When

- A public or shared interface, generic constraint, type parameter, overload, function parameter,
  return type, union, enum, DTO, callback, adapter contract, declaration, or exported inferred type
  changes.
- A type change may affect structural implementations, factories, plugins, mocks, fixtures, schemas,
  wire formats, generated clients, examples, package consumers, or rolling deployment compatibility.
- A report claims that a type change is complete, compatible, internal-only, or proven by a default
  compiler run.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task changes ordinary implementation code without changing a shared or boundary type contract.
- The primary change is an HTTP, GraphQL, RPC, protobuf, OpenAPI, or generated API operation. Use
  `api-contract-change` first and this skill only for additional type-graph closure.
- The primary change is a CLI option or configuration key. Use `cli-option-contract-review` or
  `config-env-change` first and this skill only when a shared type or consumer graph also changes.
- The task only needs language or compiler mechanics with no contract propagation. Use the matching
  language skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Changed symbols, declarations, package and export identities, intended semantic change, and
  compatibility policy.
- Compiler projects, build variants, language versions, package entrypoints, declaration outputs,
  source aliases, and independent consumer surfaces.
- Direct references, re-exports, aliases, inferred and derived types, generic instantiations,
  structural implementations, factories, registrations, adapters, and callers.
- Runtime validators, serializers, DTO mappers, stored data, event or queue schemas, generated code,
  fixtures, mocks, stubs, stories, seeds, snapshots, examples, README blocks, and sample apps.
- Newly reached services, libraries, configuration access, environment variables, and deployment
  provisioners introduced through the changed call or dependency graph.
- Configured command intents that can verify builds, type tests, package consumers, generated
  artifacts, docs, release surfaces, and mustflow contracts.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- The declaration or schema that owns the contract is identified before editing derived copies.
- The selected compiler invocation is treated as one observed project, not proof that every
  supported project, feature, platform, package, or external consumer was checked.
- Command execution remains governed by the repository command contract.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update owning type or schema definitions, explicit mappers, implementations, adapters, callers,
  fixtures, generated sources through their generator, docs examples, compatibility layers, tests,
  and package surfaces required by the same contract.
- Add exact positive and negative type tests, implementation registries, runtime fixtures, consumer
  projects, compatibility adapters, or deterministic drift checks when they close an observed gap.
- Do not silence propagation failures with `any`, unchecked casts, broad partial types, optional
  fields, default implementations, catch-all branches, fake fixture defaults, or hand-edited
  generated output.
- Do not execute old and new remote, billable, destructive, or state-changing behavior twice merely
  to compare type migration paths.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the semantic change before following files. Record input widening or narrowing, output
   widening or narrowing, nullability, unit, timezone, identifier kind, mutability, ownership,
   sync/async behavior, success/failure representation, order, duplicate policy, generic constraint,
   discriminant, or serialization meaning. A name-preserving unit or meaning change is still a
   compatibility change.
2. Separate contract layers: internal source type, public source API, binary or ABI surface when
   applicable, runtime validation, stored representation, wire representation, behavior, operations,
   and independently deployed consumer compatibility. Do not infer one layer from another.
3. Produce a compiler- or schema-derived public contract diff when the repository supports it.
   Include inferred exports, declarations, overload selection, conditional types, default type
   arguments, nullability, enum or union membership, requiredness, and generated entrypoints rather
   than reading only the edited declaration.
4. Compute reverse dependency closure from symbol identity. Follow direct references, aliases,
   re-exports, wrappers, return values, callbacks, derived types, source aliases, package exports,
   storage, events, schemas, docs links, and external consumers until no new node appears. Use text
   search for string identities and examples after semantic references, not as the sole proof.
5. Inventory generic instantiations and inference sites. Separate explicit type arguments from
   inferred calls, aliases, factory results, overloads, conditional branches, and downstream
   declarations. Compare inferred results before and after the change; compilation success alone does
   not prove the chosen overload or inferred type stayed compatible.
6. Find implicit implementations through constructors, factories, dependency injection, provider
   maps, plugin loaders, dynamic imports, object literals, mocks, and test builders. Keep executable
   implementation registries or compile-time conformance checks where they make future omissions
   fail. Do not rely only on `implements` or nominal type names.
7. Use temporary impossible members, branded values, removed members, or narrowed discriminants only
   as uncommitted discovery probes when configured verification permits them. Remove every probe from
   the final diff. A probe reveals compiler-visible consumers but does not cover JSON, generated,
   dynamic, disabled, or external consumers.
8. Trace changed values rather than only calls: producer -> normalization -> transformer -> store ->
   serializer -> transport -> decoder -> consumer -> user-visible or operational decision. Inspect
   units, precision, absence, failure meaning, control flow, retry, transaction, cache, and event
   behavior at each boundary.
9. Keep domain, storage, API, event, view, and provider objects distinct. Use explicit total mappers
   and exhaustive union conversion. Decide at the mapper whether an internal change affects the
   external contract; do not spread entities or cast one object language into another.
10. Validate runtime boundaries independently. Static constraints disappear at JSON, database,
    cache, queue, file, environment, plugin, JavaScript, reflection, FFI, or older-client boundaries.
    Parse historical and adversarial payloads with the maintained runtime schema and verify actual
    serialized trees or bytes, not only a round trip whose encoder and decoder can share the same bug.
11. Rebuild the test asset graph. Include unit and integration fixtures, fake implementations, stubs,
    mock handlers, recorded responses, Storybook stories, browser fixtures, seeds, snapshots, sample
    files, and test helpers outside the default compiler project. Replace casting black holes and
    indiscriminate defaults with exact builders and meaningful state variants.
12. Require positive and negative type evidence. Valid callers must compile, invalid states must stay
    rejected, inferred result types must remain exact where promised, and representative generic
    mines such as unions, readonly values, tuples, brands, optionals, `unknown`, and supported edge
    cases must exercise changed constraints. An expected error disappearing is a regression.
13. Treat executable examples as consumers. Link docs and README examples to package, export path,
    symbol, and contract version; compile and, when behavior matters, run designated examples against
    the packaged public entrypoint. Keep illustrative fragments explicitly distinct from executable
    examples so prose does not become fake test coverage.
14. Recreate schemas, declarations, SDKs, clients, docs tables, or samples from their canonical
    source with pinned generator version and settings. Verify clean deterministic regeneration and
    edit the generator or wrapper rather than generated output. Apply compatibility-aware schema
    diff rules, not text-only review.
15. Test the packaged consumer boundary in a clean environment when a public package changes. Use
    the actual packed artifact rather than workspace source aliases or hoisted dependencies, and
    cover supported compiler versions, strictness modes, module systems, entrypoints, and public
    declaration files as applicable.
16. Detect configuration dependencies introduced transitively by changed imports, constructors,
    factories, plugins, middleware, clients, and new libraries. Combine static config-access
    discovery with a redacted runtime key-access comparison where available. Exercise a minimal clean
    environment and feature paths that load settings lazily. Route actual key contract changes through
    `config-env-change`.
17. Reject silent configuration fallbacks that turn missing or malformed input into success. Keep
    raw and resolved config distinct, preserve zero, false, empty, and omitted states according to
    the contract, centralize defaults, and record source without values for secrets. A new required
    key without schema, example, deployment, and rendered-artifact evidence leaves the type change
    incomplete.
18. Classify compatibility across source, runtime, serialization, behavior, and operations. For
    breaking or independently deployed changes, expand with a new contract, normalize old and new
    forms at one boundary, migrate consumers, measure old-form use, then contract only after removal
    evidence. Give stored and queued formats explicit versions and stable discriminants.
19. Verify supported old/new producer-consumer, package, schema, data, and deployment combinations.
    Do not let default methods, catch-all branches, unknown-field dropping, empty adapter values, or
    optionalization hide an unsupported combination. Use capability or version negotiation across
    process and plugin boundaries when compilation cannot protect them.
20. Build a machine-readable impact manifest or equivalent deterministic ledger. Record the changed
    contract, semantic classification, direct and transitive consumers, generic instantiations,
    implementations, value path, runtime schemas, test assets, generated artifacts, docs examples,
    config dependencies, external consumers, compatibility phases, excluded surfaces, and evidence
    for each `changed`, `verified_no_change`, or `not_applicable` decision.
21. Recompute closure independently from the final diff and current artifacts. Compare the manifest
    with semantic references, public contract diff, schema diff, package contents, generated output,
    docs links, and configuration access evidence. Do not accept the implementing agent's completion
    statement as its own verifier.
22. Verify with the narrowest configured intents first, then broader build, consumer, docs, release,
    and mustflow checks required by the affected contract layers.

<!-- mustflow-section: postconditions -->
## Postconditions

- The semantic change and every affected contract layer are classified.
- Symbol, inference, implementation, value-flow, runtime, fixture, generated, documentation,
  configuration, package, and external-consumer closure is demonstrated or explicitly bounded.
- Compatibility adapters remain at boundaries, old-form removal has evidence, and unsupported
  combinations fail explicitly.
- The final impact manifest agrees with the current diff and deterministic verification artifacts.

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

Prefer narrower configured type-test, declaration-diff, schema-diff, fixture-validation, generator,
package-consumer, example, config-impact, or compatibility-matrix intents when exposed.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the source of truth is unclear, stop at the competing type, schema, or generator authorities
  instead of synchronizing whichever copy is convenient.
- If a consumer is outside the selected compiler project, generated, structural, dynamic, cached,
  disabled, or external, keep it in the impact manifest and require its own evidence.
- If a type change crosses API, config, database, event, ABI, or language boundaries, route that
  boundary through its narrower primary skill before editing it.
- If clean package or external-consumer verification is unavailable, report that the source build
  passed without claiming consumer compatibility.
- If old-contract use cannot be observed, do not claim removal is safe merely because a deprecation
  date or version number was reached.
- If closure computation finds an undeclared consumer or config key, reopen the impact manifest and
  verification selection rather than patching only the newly failing file.

<!-- mustflow-section: output-format -->
## Output Format

- Type contract and semantic change classification
- Contract layers and source of truth
- Symbol, generic inference, implementation, and value-flow closure
- Runtime schemas, serialization, fixtures, generated artifacts, docs, and package consumers
- New or changed configuration dependencies
- Compatibility phases, matrices, usage evidence, and removal decision
- Impact manifest reconciliation
- Command intents run
- Skipped checks and reasons
- Remaining type-contract risk
