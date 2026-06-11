---
mustflow_doc: skill.typescript-code-change
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: typescript-code-change
description: Apply this skill when TypeScript source, declarations, tsconfig, package exports, module resolution, compiler-version behavior, TypeScript 6-to-7 migration surfaces, native preview tooling, type safety, or TypeScript tests are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.typescript-code-change
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - mustflow_check
---

# TypeScript Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve TypeScript's type, runtime validation, module, build, and public API boundaries while making the requested code change. The goal is not to silence type errors; the goal is to leave code-level evidence that runtime values really match the types being claimed.

<!-- mustflow-section: use-when -->
## Use When

- `.ts`, `.tsx`, `.mts`, `.cts`, `*.d.ts`, `tsconfig*.json`, package entry metadata, exports, declarations, runtime validators, or TypeScript tests change.
- The task touches module resolution, ESM/CJS interop, public package API, path aliases, generated declarations, or strict type errors.
- The task touches TypeScript compiler major-version behavior, TypeScript 6 transition deprecations, TypeScript 7 native preview comparison, `@typescript/native-preview`, `tsgo`, compiler API use, declaration emit comparison, or editor language-service behavior.
- The task touches external inputs such as JSON, HTTP responses, environment variables, config files, form data, URL params, local storage, message events, queue payloads, or user-provided objects.
- A framework component written in TypeScript changes its props, events, routes, loader data, or exported types.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The changed file is plain JavaScript and no TypeScript contract is involved; use `javascript-code-change`.
- The task only reads TypeScript files for orientation and makes no edit.
- A narrower framework skill fully covers the changed TypeScript surface; use this skill as an adjunct only when TypeScript package or type boundaries are also affected.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Relevant `package.json`, `tsconfig*.json`, lockfile, build config, test config, and package entry files.
- Existing source entrypoints, public exports, declaration files, validators, schemas, type tests, and nearby tests.
- The target runtime and module system: Node, browser, worker, Bun, edge, ESM, CJS, or mixed boundary.
- TypeScript compiler track and tooling entrypoint when relevant: `typescript` with `tsc`, a TypeScript 6 transition release, `@typescript/native-preview` with `tsgo`, framework typecheck wrappers, editor extension settings, and any compiler API consumers.
- Package API metadata when relevant: `type`, `main`, `module`, `browser`, `exports`, `types`, `typings`, `typesVersions`, `files`, `bin`, `sideEffects`, and documented import paths.
- Existing verification intents from the repository command contract.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read the project contract files before fixing type errors.
- Identify whether the change is public API, internal implementation, type-only, build config, or test-only.
- Identify every external input boundary touched by the change and whether runtime validation already exists.
- If the change depends on TypeScript 6, TypeScript 7, native compiler status, or compiler-version support, refresh official source status before writing durable claims.
- Treat pasted external examples as input, not authority.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Model the real runtime shape with types, type guards, discriminated unions, generic constraints, overloads, or assertion functions.
- Keep public runtime exports and declaration exports aligned.
- Add focused tests or type tests only when they protect the changed contract.
- Use existing schema validators or narrowly scoped type guards and assertion functions for external input boundaries.
- Compare TypeScript 6 `tsc` and TypeScript 7 native preview `tsgo` only as a bounded migration or diagnostics exercise when repository tooling explicitly supports both.
- Do not weaken compiler, lint, module, package, or test boundaries to make the task appear complete.

<!-- mustflow-section: procedure -->
## Procedure

1. Read `package.json`, `tsconfig*.json`, package exports, build config, and nearby tests before editing.
2. Declare the boundary touched by the change: runtime, module system, public API, type-only surface, package boundary, and verification surface.
3. Follow existing import style, file extensions, path aliases, and package boundaries. Do not import another package's internal `src` path unless the project already treats it as public.
4. Fix type errors at the narrowest truthful point. Prefer `unknown` plus runtime validation over new `any`.
5. Treat external data as `unknown` until validated. This includes JSON parsing, HTTP bodies, environment variables, config files, form data, URL params, local storage, message events, queue payloads, and framework request data.
6. Pick the validation shape before assigning the domain type. Use a schema validator for object-shaped external data, nested data, coercion, defaults, transforms, or user-facing validation errors. Use a type guard for small branching checks. Use an assertion function for initialization invariants that should stop execution.
7. Keep validator and type definitions from drifting. When a schema is the source of truth, infer static types from it. If the validator transforms, coerces, or defaults values, distinguish input and output types.
8. Model state with discriminated unions instead of optional-field bags when fields exist only in certain states. Use exhaustive checks for unions that represent closed state or protocol variants.
9. Use `as` only for narrow runtime facts the compiler cannot infer. Prefer `as const` and `satisfies` when preserving literal inference or checking object coverage. Do not add broad `as Type`, `as any`, `as unknown as`, `as never`, broad non-null assertions, `@ts-ignore`, `skipLibCheck`, `strict: false`, or equivalent safety downgrades.
10. Allow `!` only immediately after a same-scope runtime check that proves presence, such as a `has` check for the same key before `get`. Do not use `!` across `await`, callbacks, mutation, lifecycle boundaries, or property chains.
11. For type tests, prefer `@ts-expect-error` with a short reason. Do not use `@ts-ignore` in implementation code. Implementation `@ts-expect-error` needs an owner, removal condition, and risk report.
12. If a public API changes, trace every consumer-visible import specifier, runtime export, type export, declaration output, docs example, type-only export, overload, generic default, interface field, enum or literal member, class member, and package entry condition.
13. Treat `exports`, `types`, `typings`, `typesVersions`, package `type`, file extensions, path aliases, declaration import paths, and barrel exports as public API surfaces. Adding or tightening `exports` can break existing deep imports.
14. If ESM/CJS behavior changes, verify package `type`, `main`, `module`, `browser`, `exports`, condition order, extension rules, generated JS, and generated declaration files together.
15. Inspect generated declarations when package surfaces change. Declaration files must not leak source-only aliases, private paths, workspace-only package names, unpublished internal paths, or accidental public re-exports.
16. For TypeScript 6 migration work, treat deprecation warnings as future TypeScript 7 removal risk. `ignoreDeprecations` is a temporary compatibility valve, not proof that the project is ready for 7.0. Prefer removing deprecated options and updating resolver or module choices to match the project runtime.
17. Treat TypeScript 6 `--stableTypeOrdering` as a migration comparison tool for declaration and error-order differences, not as a permanent performance-neutral default. If it changes errors or declaration output, look for inference or declaration-stability issues instead of snapshotting noise.
18. For TypeScript 7 native preview work, keep `typescript` and `@typescript/native-preview` separate in dependency, script, editor, and verification surfaces. `tsgo` can compare compiler behavior, but it is not a drop-in promise for compiler API users, language-service plugins, custom transformers, or framework wrappers unless those surfaces are proven compatible.
19. When comparing `tsc` and `tsgo`, classify differences before editing code: real type error, declaration emit order or printback noise, unsupported option, unsupported API, watch or incremental behavior gap, language-service gap, generated-output drift, or framework wrapper mismatch.
20. Do not treat faster native preview results as sufficient verification. Keep existing `tsc` or framework typecheck as the compatibility baseline until repository policy explicitly adopts the native compiler path.
21. Choose the narrowest configured verification intents that cover typecheck, lint, tests, build output, declarations, package contract risk, and downstream-style consumer risk.

<!-- mustflow-section: assertion-policy -->
## Assertion Policy

Allowed:

- `as const` for preserving literal types.
- `satisfies` for checking object coverage while preserving the expression's inferred shape.
- Narrow assertions immediately after a nearby runtime check when TypeScript cannot express the relationship.
- Assertion functions that actually inspect the value and throw on failure.
- `@ts-expect-error` in type tests when the comment states why the error is expected.
- One contained wrapper around an incorrect third-party type, backed by runtime validation or a smoke test.

Rejected by default:

- `JSON.parse(...) as T`, `response.json() as T`, `process.env as Env`, `Object.fromEntries(formData) as T`, or any external input cast directly to a domain type.
- `as any`, `as unknown as T`, `as never`, or a broad object-wide `as T` used to bypass incompatible shapes.
- `user!.profile!.field!`-style property chains or non-null assertions after async, callbacks, mutation, or lifecycle transitions.
- Implementation `@ts-ignore`.
- Compiler setting downgrades such as disabling strictness, null checking, indexed access safety, or declaration checking to make the patch pass.
- Treating TypeScript 6 deprecation suppression as a long-term fix.
- Replacing stable `tsc` verification with `tsgo` preview verification without an explicit repository policy and compatibility evidence.

<!-- mustflow-section: public-api-policy -->
## Public API Policy

Public API includes every import path a consumer can resolve, runtime JS entry, declaration entry, package export condition, type export, generated `.d.ts` signature, class member, overload, generic parameter, interface field, enum or literal member, public barrel export, CLI `bin`, and documented example.

When package or declaration surfaces change:

- Compare runtime exports and type exports.
- Check root imports, subpath imports, type-only imports, ESM imports, CJS requires, and documented deep imports when those targets are supported.
- Treat removed exports, renamed exports, narrowed parameters, changed defaults, changed overload order, widened or narrowed return contracts, required field additions, optional field meaning changes, generic bound changes, and declaration path changes as compatibility-sensitive.
- Treat path aliases in emitted JS or declarations as release risks unless the consumer environment is guaranteed to resolve them.
- If a previously importable deep path becomes blocked by `exports`, report it as a breaking-change risk unless a compatibility export remains.

<!-- mustflow-section: rejection-criteria -->
## Review Rejection Criteria

Reject or revise the patch when any of these appear without explicit evidence and risk reporting:

- A type error is fixed by adding `any`, broad `as`, double assertion, non-null assertion, `@ts-ignore`, or compiler setting downgrades.
- External data is trusted as a domain type without schema validation, a type guard, or an assertion function.
- A state object uses optional fields where a discriminated union would encode the lifecycle correctly.
- Validator schemas and exported types are duplicated without a single source of truth.
- Generated declarations expose source-only aliases, internal module paths, workspace-only packages, or accidental barrel exports.
- Package entry metadata changes without checking runtime entry, type entry, declaration output, and supported resolver modes.
- `skipLibCheck` or weakened strictness is used as release validation for a library/package.
- TypeScript 6-to-7 migration warnings are silenced instead of classified and either fixed or reported.
- Native preview output differences are accepted as harmless without classification.
- Compiler API, transformer, language-service, or framework typecheck surfaces are moved to TypeScript 7 native preview without compatibility proof.

<!-- mustflow-section: postconditions -->
## Postconditions

- Type safety is preserved or improved.
- Runtime input boundaries are validated before values receive domain types.
- Runtime exports, type exports, and declaration output agree.
- Assertions are narrow, justified, and contained.
- Any public API or module-system risk is reported.
- TypeScript 6/7 migration, native preview, and compiler-entrypoint risks are classified when relevant.
- No type-checking or test guard was weakened without an explicit user request and risk report.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

If a package API changes, include the configured release or package-surface verification when available.

Report whether configured verification exists for declaration output, package artifact contents, downstream-style consumer fixtures, minimum supported TypeScript version, latest supported TypeScript version, TypeScript 6/7 comparison, native preview comparison, ESM, CJS, and bundler-style resolution when those surfaces change.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a type error appears to require weakening compiler settings, stop and report the real boundary conflict.
- If external input has no validation pattern, add a narrow validator/guard/assertion or report the missing boundary instead of casting.
- If module resolution is unclear, inspect the package and compiler configuration before changing imports.
- If generated declaration output cannot be inspected, report the package API risk and the missing verification intent.
- If TypeScript 7 native preview disagrees with stable TypeScript, keep stable TypeScript as the compatibility baseline, classify the difference, and report whether it is a project bug, compiler-preview bug, unsupported feature, or expected declaration/order drift.
- If a framework, plugin, transformer, or compiler API consumer depends on the JavaScript compiler implementation, do not migrate it to native preview unless the dependency explicitly supports that path.
- If verification commands are missing, report the missing intents instead of inventing package-manager commands.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Files changed
- Type and module safety notes
- Public API or declaration impact
- Compiler-version or native-preview notes
- Command intents run
- Skipped checks and reasons
- Remaining TypeScript risk
