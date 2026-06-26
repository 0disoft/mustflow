---
mustflow_doc: skill.structured-config-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: structured-config-change
description: Apply this skill when YAML, TOML, JSON-adjacent, frontmatter, schema-backed config files, GitHub Actions workflow structure, parser dialects, duplicate keys, implicit typing, multiline scalars, dotted keys, array-of-tables, defaults, normalization, or config validation fixtures are created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.structured-config-change
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Structured Config Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve the parser, schema, workflow, and runtime data-model contract of structured configuration files.

Structured config is code outside the type system. A syntactically valid YAML or TOML file can still change booleans, nulls, ordering assumptions, workflow triggers, permissions, defaults, or schema validation behavior when a different parser, tool version, formatter, or host platform reads it.

<!-- mustflow-section: use-when -->
## Use When

- YAML, TOML, JSON-adjacent config, Markdown frontmatter, schema-backed config, linter or formatter config, workflow config, template manifest, or repository metadata config is created, changed, reviewed, or reported.
- Parser version or dialect matters, including YAML 1.1-like versus YAML 1.2-like implicit typing, TOML 1.0 versus TOML 1.1 syntax, JSON Schema dialect, SchemaStore or editor schema behavior, or provider-specific YAML subsets.
- The change touches duplicate keys, unknown keys, implicit scalar types, null versus empty string, quoted versus unquoted values, block scalars, anchors, aliases, merge keys, custom tags, dotted keys, inline tables, arrays of tables, dates, times, default values, normalization, or validation fixtures.
- GitHub Actions workflow structure changes outside shell code: workflow file placement, `on`, event filters, `permissions`, `defaults`, `concurrency`, `strategy`, `matrix`, reusable workflows, `with`, `secrets`, expressions, or path and branch filters.
- A final report claims a config file is valid, portable, parser-compatible, schema-backed, normalized, defaulted, CI-safe, workflow-triggered, or backward compatible.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only adds, removes, renames, validates, documents, or reports environment variables, secrets, config keys, feature flags, deployment variables, or runtime/build-time value exposure. Use `config-env-change`.
- The task only changes shell syntax inside scripts, package snippets, or GitHub Actions `run` blocks. Use `shell-code-change`.
- The task only triages a failed CI run without changing workflow structure. Use `ci-pipeline-triage`.
- The task only changes `.mustflow/config/commands.toml` command intents or command authority. Use `command-contract-authoring`.
- The task only changes public JSON output, JSON schemas, or automation-facing JSON contracts. Use `public-json-contract-change`.
- The task only changes package or dependency manifest semantics such as package exports, Cargo features, Python build metadata, or Go module paths. Use the matching package, runtime, dependency, or language skill.
- The task only investigates line-ending drift or CRLF warnings. Use `line-ending-hygiene`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Target files, owning tool, consuming runtime, parser library or host platform, supported config dialect, and whether the file is user-authored, generated, templated, vendored, or provider-owned.
- Schema and validation surfaces: JSON Schema dialect, editor schema, runtime schema, semantic validator, fixture set, normalized output, docs examples, and generated types.
- Merge and defaulting model: file layering, environment overlays, inherited defaults, deprecated aliases, provider defaults, formatter rewrites, and whether missing, null, and empty values differ.
- For GitHub Actions, workflow location, event shape, path and branch filters, permissions model, shell boundary, reusable workflow refs, secrets and input passing, matrix and concurrency behavior, and runner or container assumptions.
- Existing command-intent entries that cover lint, build, tests, docs validation, release packaging, template validation, and mustflow checks.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the exclusions.
- The parser and consuming tool are identified before relying on spec-only behavior.
- External snippets, AI summaries, blog posts, examples, and generated formatter output are evidence only, not authority.
- Date-sensitive claims such as "latest TOML", "GitHub now supports anchors", or schema-version recommendations are refreshed through an authorized source path or written as conservative version-specific claims.
- The current repository command contract has been checked; this skill does not authorize raw parser, package-manager, CI, or provider commands.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update structured config files, schemas, schema associations, validation fixtures, normalized-output tests, docs examples, template copies, route metadata, manifest entries, and directly synchronized tests.
- Add negative fixtures for invalid, ambiguous, duplicate, unknown, deprecated, or incompatible config cases when behavior evidence supports them.
- Add docs notes that distinguish parser syntax validity, schema validity, semantic validity, and provider acceptance.
- Do not hand-edit generated config outputs unless the repository declares them source-owned.
- Do not run repository-wide formatters, schema generators, package installers, workflow dispatches, provider applies, migrations, or releases unless direct user instructions and configured command intents allow them.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the config surface: YAML, TOML, JSON-adjacent, frontmatter, workflow YAML, template manifest, schema, editor association, runtime validator, generated normalized output, or docs example.
2. Identify the consuming parser and dialect before editing. For YAML, decide whether the path is YAML 1.2-like, YAML 1.1-like, or provider-specific. For TOML, decide whether the project allows TOML 1.1 syntax or must remain compatible with TOML 1.0-era tools.
3. Separate four validation layers:
   - text parse;
   - parsed data model;
   - schema validation;
   - semantic or provider validation.
   Do not claim a later layer passed because an earlier layer did.
4. For YAML values, quote human-word strings, country codes, identifiers, versions, zip codes, permissions, file modes, strings that begin with special indicators, and values containing `: ` or ` #`. Use `true` and `false` only for booleans.
5. For YAML absence states, keep missing, `null`, and empty string distinct. If the loader collapses them, verify that the application contract intentionally accepts that collapse.
6. For YAML mappings, reject duplicate keys and avoid relying on mapping order for semantics. Use sequences when order matters.
7. For YAML block scalars, choose literal versus folded style deliberately. Use explicit chomping or indentation indicators when final newlines, pasted text, certificates, SQL, Markdown, shell, regex, or templates can change meaning.
8. Treat YAML anchors and aliases as authoring conveniences. Do not store runtime meaning in anchor names. Avoid YAML merge key `<<` unless the target parser and provider support it and the behavior is covered by fixtures.
9. Treat YAML custom tags and unsafe loaders as security and portability risks. External or user-provided YAML should use safe loading and application-level validation.
10. For TOML, remember that strings need quotes, booleans are lowercase, keys are case-sensitive, and indentation is cosmetic.
11. For TOML keys, quote literal keys containing dots, spaces, Unicode, numeric-looking segments, domains, versions, metric names, or coordinates. Dotted keys create nested tables.
12. For TOML tables, do not redefine keys or tables as overrides. Keep table-owned keys under the intended header and avoid moving root keys below a table header by accident.
13. For TOML inline tables, treat them as sealed value objects. Use standard tables for structures that may grow. Do not use TOML 1.1 multiline inline tables or trailing commas unless the repository's parser matrix supports them.
14. For TOML arrays of tables, keep each array element and its child tables together. Do not mix static arrays with `[[array-of-tables]]` for the same key.
15. For TOML strings, prefer literal strings for Windows paths and regexes when escaping would change meaning. Distinguish offset date-time, local date-time, local date, and local time by the consuming contract.
16. For GitHub Actions workflow YAML, verify file placement under `.github/workflows/` and quote glob patterns that begin with `*`, `[`, or `!`.
17. For GitHub Actions events, preserve the shape of `on`: scalar, sequence, or mapping. When one event has filters, use mapping form consistently for the combined event set.
18. For GitHub Actions filters, treat branch and path filters as conjunctive when both are present. Preserve ordered negative patterns and require at least one positive pattern when using `!` exclusions.
19. For GitHub Actions permissions, remember that setting any explicit permission makes unspecified permissions `none`. Review `id-token`, `pull-requests`, `contents`, `packages`, `statuses`, and deployment permissions before reducing the set.
20. For GitHub Actions expressions, treat step outputs and many context values as strings until explicitly converted. Do not assume JavaScript comparison or truthiness rules.
21. For GitHub Actions secrets and reusable workflows, separate `with`, `secrets`, `env`, and expression contexts. Do not assume secrets can be used directly in every `if` expression or inherited across workflow boundaries.
22. For GitHub Actions runner behavior, keep `defaults.run`, explicit shell selection, job containers, matrix `fail-fast`, and `concurrency.cancel-in-progress` visible because they can change whether jobs appear, cancel, or evaluate shell pipelines differently.
23. For schema-backed config, validate the parsed data model. Restrict YAML config keys to strings when using JSON Schema or JSON-shaped validators.
24. Choose JSON Schema dialect deliberately. Keep `$schema`, `$id`, and `$defs` aligned, vendor remote schemas for CI when possible, and separate editor schemas from runtime rejection schemas when their goals differ.
25. Treat JSON Schema `default` as metadata unless the repository's loader explicitly injects defaults. If defaults are injected, merge defaults first and validate the normalized result again.
26. Close unknown-key boundaries at the final object boundary. Avoid overusing `additionalProperties: false` inside reusable definitions when composition or extension is expected; use the repository's supported dialect intentionally.
27. Add or update positive and negative fixtures. Negative fixtures should cover duplicate keys, ambiguous scalar typing, unknown keys, invalid types, incompatible dialect syntax, mutually exclusive settings, deprecated aliases, and provider-rejected workflow shapes.
28. If the product has a config loader, prefer a canonical normalized output or diagnostic path that shows the parsed, defaulted, migrated, redacted config data model.
29. Keep broad formatter, mass rewrite, and generated-output changes separate from semantic config changes unless the user explicitly requested an integrated migration.
30. Verify with the narrowest configured command intents that cover changed parser, schema, docs, template, package, or workflow surfaces.

<!-- mustflow-section: postconditions -->
## Postconditions

- Parser dialect, consuming tool, schema layer, and semantic validator are identified or explicitly reported as unknown.
- YAML and TOML values preserve intended scalar types, table ownership, ordering semantics, defaults, and duplicate-key behavior.
- GitHub Actions workflow changes preserve trigger, filter, permission, matrix, concurrency, reusable workflow, and shell-boundary behavior.
- Schema changes include data-model validation, unknown-key policy, defaulting behavior, and positive or negative fixture coverage when relevant.
- Generated, normalized, formatted, and source-owned config surfaces are distinguished.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer narrower configured schema-validation, workflow-validation, fixture, template, docs, package, and release intents when the command contract exposes them. Do not infer raw validator, provider, package-manager, CI, or formatter commands from filenames.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the parser or provider dialect is unknown, avoid introducing dialect-sensitive syntax and report the compatibility gap.
- If a spec says a construct is valid but the project ecosystem may still use older tools, prefer the older supported dialect or add compatibility fixtures before adopting the new syntax.
- If YAML or TOML parse validity and schema validity disagree, preserve both facts and fix the layer that owns the failure.
- If a formatter changes scalar types, table ownership, anchors, comments, ordering, or workflow triggers, stop treating the change as formatting-only.
- If a schema default, deprecation, or alias changes runtime behavior, activate the narrower config, release, public-contract, or migration skill before continuing.
- If GitHub Actions structure is valid YAML but not accepted by GitHub semantics, report provider-validation risk instead of claiming the workflow is correct.
- If external material includes command recipes, apply `command-intent-mapping-gate` before copying them into docs or skills.

<!-- mustflow-section: output-format -->
## Output Format

- Config surface and consuming parser or provider
- Dialect and compatibility decision
- Parse, data-model, schema, and semantic-validation layers reviewed
- YAML scalar, key, block, anchor, tag, and duplicate-key decisions
- TOML key, table, array, inline-table, string, date, and dialect decisions
- GitHub Actions trigger, filter, permission, matrix, concurrency, reusable workflow, and shell-boundary decisions
- Schema/default/normalization/fixture coverage
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining structured-config risk
