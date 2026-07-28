---
mustflow_doc: skill.cli-option-contract-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: cli-option-contract-review
description: Apply this skill when CLI options, flags, positional arguments, aliases, defaults, parser behavior, raw-to-resolved option types, prompt controls, config or environment precedence, option renames, or automation-facing argument contracts are created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.cli-option-contract-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# CLI Option Contract Review

<!-- mustflow-section: purpose -->
## Purpose

Preserve the contract between CLI syntax and the humans, scripts, CI jobs, shells, terminals, config files, and docs that depend on it.

CLI options are public API. A convenient flag can still be unsafe if it collides with existing shorthand, hides destructive behavior behind a vague name, prompts in CI, writes to stdout when scripts expect JSON, or turns a path, format, selector, or environment into an ambiguous value.

<!-- mustflow-section: use-when -->
## Use When

- A command adds, removes, renames, aliases, deprecates, validates, or changes a flag, option, positional argument, variadic argument, default value, inherited global flag, or option parser rule.
- A task designs or reviews standard CLI controls such as dry-run, check, plan, diff, yes, force, confirm, no-input, interactive, verbose, quiet, debug, format, output, color, pager, progress, config, profile, env, timeout, retry, jobs, cache, stdin, token, endpoint, region, project, pagination, target, prune, rollback, or AI-agent permission flags.
- A command changes prompt behavior, TTY behavior, non-interactive behavior, CI behavior, option terminator support, repeated flags, boolean negation, duration or size parsing, path handling, glob handling, stdin handling, or list parsing.
- A CLI option or linked config key changes its type, unit, nullability, required state, source precedence, runtime representation, name, alias, deprecation state, or environment-specific availability.
- A final report claims that CLI options are safe, automatable, compatible, conventional, discoverable, or aligned with docs and tests.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task changes only stdout, stderr, JSON fields, JSONL packets, exit codes, color rendering, progress output, warning text, error text, or help wording without changing option or argument semantics. Use `cli-output-contract-review`.
- The task changes only public JSON, JSONL, schema-backed reports, or machine-readable stdout and stderr contracts. Use `public-json-contract-change`.
- The task changes only `.mustflow/config/commands.toml` command intents or command authority. Use `command-contract-authoring`.
- The task changes only environment variables, secrets, config keys, feature flags, or runtime/build-time exposure. Use `config-env-change`.
- The task changes only docs prose that mentions an unchanged command syntax. Use the matching docs skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The affected command, command tree, parser library or command router, inherited global flags, positional arguments, variadic arguments, current aliases, defaults, validation rules, and help metadata.
- Existing docs, README snippets, examples, tests, snapshots, fixtures, shell completions, schemas, template copies, package tests, and release notes that mention the syntax.
- The operation type: read-only, planning, validation, write, destructive write, remote write, deploy, migration, deletion, cleanup, generated-file write, or AI-agent action.
- The intended consumers: humans at a TTY, scripts, CI jobs, package tests, shell completion users, remote APIs, installed templates, release automation, or downstream wrappers.
- Current config and environment precedence, including config files, profiles, env vars, CLI flags, defaults, and explicit override rules.
- The option registry or other contract source, raw parser result, normalization and validation path,
  resolved execution type, and value provenance model.
- Symbol references, reverse dependencies, derived types, serializers, validators, generated clients,
  runtime schemas, adapters, fixtures, and external consumers affected by an option-linked type change.
- Config consumers and provisioners outside ordinary source imports, including CI variables, secret
  stores, container inputs, deployment templates, infrastructure definitions, wrappers, and supported
  old/new producer-consumer combinations.
- Current non-interactive, prompt, color, pager, progress, timeout, retry, cache, lock, and exit-code expectations when they exist.
- Relevant command-intent entries for related tests, docs validation, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Existing command syntax, aliases, docs examples, tests, and parser behavior have been inspected before changing or recommending a flag.
- Short flags are treated as scarce public API. Do not assign them from generic CLI advice without checking collisions, command frequency, and established project conventions.
- External articles, AI summaries, package defaults, and other CLIs are evidence only. The repository's current parser, command contract, compatibility policy, and user instructions remain authoritative.
- Command execution remains governed by `.mustflow/config/commands.toml`; this skill does not authorize raw command execution.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update CLI parser code, command metadata, help text, completions, docs examples, tests, fixtures, schemas, template copies, and release-sensitive package metadata that describe the same option contract.
- Add explicit long flags, validation errors, compatibility aliases, deprecation notices, negative tests, or parser edge-case tests when they reduce ambiguity.
- Prefer clear long options over clever short aliases. Add a short option only when it is frequent, unambiguous, and consistent with existing command conventions.
- Do not merge different safety meanings into one flag. For example, prompt acceptance, safety bypass, preview, destructive overwrite, and non-interactive failure should remain separable.
- Do not introduce unsafe defaults, vague automation flags, broad bypass flags, hidden prompts, or silent output-mode changes.
- Do not add parser behavior that breaks paths beginning with a dash, negative numbers, option terminators, repeated values, or non-interactive scripts unless that incompatibility is intentional and documented.
- Do not hide migration gaps with `any`, broad casts, optional fields, empty defaults, catch-all
  branches, or adapter values that silently discard unsupported meaning.
- Do not print secret values while recording config provenance, fingerprints, validation evidence,
  or deprecation usage.

<!-- mustflow-section: procedure -->
## Procedure

1. Inventory the command syntax: subcommands, positional arguments, variadic arguments, options, inherited global flags, aliases, defaults, environment variables, config files, and generated completions. Include every spelling of an option or linked setting across camel case, snake case, kebab case, screaming snake case, legacy aliases, provider prefixes, and templated secret paths.
2. Classify each option by role: safety and preview, confirmation and prompts, output and formatting, logging and diagnostics, config and environment, selection and filtering, file input and output, remote endpoint and auth, performance and cache, concurrency and locking, CI automation, destructive lifecycle, or AI-agent authority.
3. Decide whether the behavior belongs in a subcommand, positional argument, option, config key, environment variable, or separate command. Destructive lifecycle changes often deserve explicit verbs rather than a broad boolean flag.
4. Review naming collisions before adding names. Pay special attention to common conflicts such as verbose versus version, force versus file, dry-run versus debug or delete or directory, output format versus output path, interactive versus input, and shorthand reused differently across subcommands.
5. Separate near-neighbor semantics. `--yes` accepts prompts; `--force` bypasses a safety guard; `--dry-run` avoids writes; `--check` reports whether change is needed; `--diff` shows the proposed change; `--output` should mean a destination only if format uses another name such as `--format`.
6. Prefer explicit paired controls for risky workflows: dry-run, plan, diff, check, validate, no-input, confirm, yes, force, no-clobber, overwrite, backup, rollback, atomic, lock-timeout, fail-fast, and continue-on-error.
7. Check non-interactive behavior. Prompts should be TTY-only; `--no-input` should fail instead of waiting; CI-oriented paths should be compatible with quiet, JSON, no-color, no-progress, no-pager, timeout, wait, and detailed exit-code behavior when the repository supports those controls.
8. Check human and machine output interaction. If an option changes output format, route machine-readable results and diagnostics consistently, and use `cli-output-contract-review` or `public-json-contract-change` for the output contract details.
9. Establish one option contract registry when the repository can support it. Record the public and
   internal name, short alias, raw type, resolved type, unit, default, valid range, environment and
   config names, help metadata, visibility, compatibility state, and deprecation deadline. Generate
   parser, help, completion, schema, and example surfaces from it where practical; otherwise compare
   those surfaces against the registry in deterministic tests. Do not create another hand-maintained
   registry when an authoritative schema or command model already exists.
10. Trace every option through `input -> raw value -> normalization -> validation -> resolved
    config -> execution consumer`. Keep raw parser values untrusted. Map every field explicitly into
    the resolved immutable configuration so a parsed-but-unused ghost option or an execution-only
    hidden option fails a type or contract check.
11. Preserve absence semantics. Distinguish omitted, empty, whitespace-only, explicit `false`, zero,
    parser default, config default, and invalid placeholder values. For precedence-sensitive booleans
    and nullable values, preserve whether the user supplied the value rather than collapsing all
    states through truthiness.
12. Define config and environment precedence as a value plus provenance. Document and test whether
    CLI flags override inline settings, environment variables, secret providers, profiles, config
    files, and defaults. Retain a redacted source such as `cli(--timeout)`, `env`, `secret`, `file`, or
    `default`; expose only presence, source, schema version, or a safe fingerprint for secrets.
13. Validate the resolved configuration in layers: parse and normalize primitive values, enforce
    ranges and units, reject unknown or placeholder values, then enforce cross-option and
    feature-dependent rules. Parse every supported environment through the same loader and validator;
    express intentional environment-only differences with owner, reason, scope, and expiry instead of
    cloning unrelated schemas.
14. Fail before serving work when required configuration is invalid. Do not open readiness or enter
    an infinite transient retry path for a static configuration error. Keep temporary dependency
    unavailability distinct from missing credentials, invalid units, impossible combinations, or
    incompatible schema versions.
15. For an option or setting rename, build a consumer-and-provisioner ledger before replacement.
    Read old and new names during a bounded expansion period, prefer the new name only under an
    explicit rule, fail when both are present with different values, warn or count old-name use
    without leaking values, migrate every deployment surface, and remove the alias only after current
    evidence reaches the repository's removal threshold. Give compatibility exceptions an owner and
    expiry so the alias does not become permanent accidental API.
16. When an option-linked type changes, classify the semantic change: range widening or narrowing,
    nullability, unit, timezone, identifier kind, mutability, sync versus async, success/failure model,
    ordering, or duplicate policy. Follow symbol identity and reverse dependencies, then follow the
    value through converters, storage, JSON, schemas, events, caches, SDKs, generated code, fixtures,
    examples, and process boundaries where static types disappear. Text search alone is not closure.
17. Find structural and implicit consumers through factories, DI registration, provider maps, plugin
    loaders, object literals, mocks, re-exports, inferred and derived types, and generated declarations.
    Use temporary compiler perturbations only as uncommitted discovery probes under permitted
    verification; remove them before the final diff. Keep executable implementation registries and
    shared contract tests where they prevent adapters from escaping future changes.
18. Separate source, binary, and wire compatibility. For cross-process or independently deployed
    consumers, test the supported old/new producer-consumer matrix and negotiate contract version or
    capability when compilation cannot protect the boundary. Do not use default methods, catch-all
    branches, silent fallback values, or lossy adapter mappings to make a breaking contract look green.
19. Review parser edge cases: `--` option terminator, paths beginning with `-`, negative numbers, repeated flags, comma-separated lists versus repeated values, boolean negation with `--no-*`, optional values, duration and size units, shell quoting, globs, symlinks, hidden files, recursive flags, and stdin markers.
20. Check file and generation behavior. Separate input path, output path, output directory, create-dirs, overwrite, no-clobber, backup, atomic write, recursive traversal, hidden files, symlink following, ignore files, and validation-only modes.
21. Check remote and SaaS behavior when relevant. Separate endpoint URL, region, account, project, token source, token stdin, CA or proxy settings, connect timeout, read timeout, pagination, query filters, and retries.
22. Check infra or deploy behavior when relevant. Separate plan, apply, refresh, target, replace, prune, rollback, lock, lock-timeout, wait, parallelism, and detailed-exit-code semantics.
23. Check AI-agent behavior when relevant. Separate model, prompt source, context include or exclude, max files, max bytes, write permissions, command permissions, network permissions, approval policy, checkpoint, dry-run, diff, and apply.
24. Preserve compatibility. For renamed or split flags, consider aliases, deprecation warnings, migration help, usage evidence, and tests before removing old syntax. Treat breaking option removals, changed defaults, changed units, changed prompt behavior, and changed parser grammar as public API changes.
25. Test states and combinations, not one representative value. Cover omission, empty and whitespace
    values, explicit false and zero, minimum and maximum boundaries, out-of-range and unparsable
    values, duplicates, unknown names, mutually dependent and exclusive options, precedence conflicts,
    old/new-name conflicts, every supported environment profile, and behavior invariants such as TLS,
    resource namespace, or forbidden production-provider use.
26. Compare help structurally with the option contract instead of relying only on a prose snapshot.
    Every public option must appear with the correct default, unit, range, relationship, and
    deprecation state; hidden or internal exclusions must be explicit.
27. Synchronize every surface that teaches, provisions, or consumes the syntax: parser code, raw and
    resolved types, validators, help text, completions, config schemas, example files, CI variables,
    secret mappings, container definitions, rendered deployment templates, infrastructure inputs,
    docs, README, tests, fixtures, generated clients, package metadata, and release notes when applicable.
28. Build an impact manifest or equivalent deterministic evidence bundle from the contract diff.
    Record changed keys, direct and transitive consumers, provisioners, derived types, runtime
    contracts, generated artifacts, updated examples, rendered outputs, environment-matrix results,
    negative mutations, deprecated-name status, explicitly excluded surfaces, and their evidence.
    A completion statement without this closure evidence does not prove the option contract complete.
29. Verify generated surfaces from a clean deterministic input where configured checks support it.
    Regeneration must leave no unexplained diff, rendered templates must deliver required settings to
    the final workload, and environment-specific build values or secrets must not be baked into a
    supposedly reusable artifact.
30. For high-risk semantic changes, compare old and new resolution on the same representative inputs
    before removing the old path. Shadow only pure parsing or resolution; never execute destructive or
    remote effects twice merely to compare option behavior.
31. Verify with the narrowest configured related tests first, then docs, release, template, and mustflow checks when syntax, docs, profiles, templates, or package metadata changed.

<!-- mustflow-section: postconditions -->
## Postconditions

- Option names, aliases, defaults, parser behavior, config precedence, prompt behavior, and non-interactive behavior are explicit and synchronized.
- Short flags have a documented reason or are omitted in favor of clear long flags.
- Destructive, write, preview, confirmation, force, and non-interactive controls are not conflated.
- Automation-facing use has stable output-mode, no-prompt, no-color, no-progress, no-pager, timeout, retry, and exit-code behavior when relevant.
- Parser edge cases are covered by tests or reported as remaining risk.
- Parser registrations, raw values, normalized values, validated resolved config, execution
  consumers, help, schemas, examples, and provisioners are closed against one named contract source.
- Option and setting provenance is observable without exposing secrets, and supported environment
  profiles share one normalization and validation path.
- Renames and type changes have bounded compatibility, old/new conflict behavior, downstream and
  runtime-boundary coverage, and explicit removal evidence.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use broader configured tests when option parsing is cross-cutting or no narrower related test covers the syntax.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If an option name conflicts with existing syntax, keep the old contract and choose a clearer long option unless a breaking change is intentionally routed through compatibility and versioning.
- If a parser edge case cannot be verified directly, add focused coverage or report the missing coverage before claiming safety.
- If docs, help text, completions, or templates cannot be synchronized in the same change, avoid claiming the option contract is installed or documented.
- If non-interactive behavior is unclear, default to failing safely rather than prompting, writing, deleting, or assuming consent.
- If an external recommendation conflicts with repository conventions, document the rejected recommendation and the repository-specific reason.
- If a breaking option change is intentional, route the version impact through the repository versioning policy and report affected consumers.
- If the apparent source of truth is duplicated across parser metadata, schemas, types, or docs,
  resolve authority or add a deterministic drift comparison before claiming synchronization.
- If a type check passes only because a consumer is outside the selected build, structurally typed,
  generated, dynamically registered, or beyond a process boundary, keep that consumer in the impact
  manifest and require its own contract evidence.
- If old and new names are both supplied with different values, fail with a redacted conflict instead
  of silently choosing one. If deprecation usage cannot be observed, do not claim removal is safe.

<!-- mustflow-section: output-format -->
## Output Format

- CLI command and options reviewed
- Option role classification and naming decision
- Short and long flag collision review
- Safety, preview, destructive, prompt, and non-interactive controls
- Parser edge cases checked or reported missing
- Option registry or other contract source, raw-to-resolved value path, and execution consumer closure
- Config and environment precedence
- Environment profile matrix, provenance and redaction, rename compatibility, and removal evidence
- Type and value-flow impact manifest, implementation registry, runtime boundary, and old/new compatibility evidence
- Human, machine, CI, color, pager, progress, timeout, retry, and exit-code interaction
- Docs, help, completions, tests, schemas, templates, and package metadata synchronized
- Command intents run
- Skipped checks and reasons
- Remaining CLI-option contract risk
