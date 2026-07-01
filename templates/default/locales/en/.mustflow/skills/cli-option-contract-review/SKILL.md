---
mustflow_doc: skill.cli-option-contract-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: cli-option-contract-review
description: Apply this skill when CLI options, flags, positional arguments, aliases, defaults, parser behavior, prompt controls, config or environment precedence, or automation-facing argument contracts are created, changed, reviewed, or reported.
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

<!-- mustflow-section: procedure -->
## Procedure

1. Inventory the command syntax: subcommands, positional arguments, variadic arguments, options, inherited global flags, aliases, defaults, environment variables, config files, and generated completions.
2. Classify each option by role: safety and preview, confirmation and prompts, output and formatting, logging and diagnostics, config and environment, selection and filtering, file input and output, remote endpoint and auth, performance and cache, concurrency and locking, CI automation, destructive lifecycle, or AI-agent authority.
3. Decide whether the behavior belongs in a subcommand, positional argument, option, config key, environment variable, or separate command. Destructive lifecycle changes often deserve explicit verbs rather than a broad boolean flag.
4. Review naming collisions before adding names. Pay special attention to common conflicts such as verbose versus version, force versus file, dry-run versus debug or delete or directory, output format versus output path, interactive versus input, and shorthand reused differently across subcommands.
5. Separate near-neighbor semantics. `--yes` accepts prompts; `--force` bypasses a safety guard; `--dry-run` avoids writes; `--check` reports whether change is needed; `--diff` shows the proposed change; `--output` should mean a destination only if format uses another name such as `--format`.
6. Prefer explicit paired controls for risky workflows: dry-run, plan, diff, check, validate, no-input, confirm, yes, force, no-clobber, overwrite, backup, rollback, atomic, lock-timeout, fail-fast, and continue-on-error.
7. Check non-interactive behavior. Prompts should be TTY-only; `--no-input` should fail instead of waiting; CI-oriented paths should be compatible with quiet, JSON, no-color, no-progress, no-pager, timeout, wait, and detailed exit-code behavior when the repository supports those controls.
8. Check human and machine output interaction. If an option changes output format, route machine-readable results and diagnostics consistently, and use `cli-output-contract-review` or `public-json-contract-change` for the output contract details.
9. Define config and environment precedence. Document and test whether CLI flags override environment variables, profiles, config files, defaults, and inline `--set` style overrides.
10. Review parser edge cases: `--` option terminator, paths beginning with `-`, negative numbers, repeated flags, comma-separated lists versus repeated values, boolean negation with `--no-*`, optional values, duration and size units, shell quoting, globs, symlinks, hidden files, recursive flags, and stdin markers.
11. Check file and generation behavior. Separate input path, output path, output directory, create-dirs, overwrite, no-clobber, backup, atomic write, recursive traversal, hidden files, symlink following, ignore files, and validation-only modes.
12. Check remote and SaaS behavior when relevant. Separate endpoint URL, region, account, project, token source, token stdin, CA or proxy settings, connect timeout, read timeout, pagination, query filters, and retries.
13. Check infra or deploy behavior when relevant. Separate plan, apply, refresh, target, replace, prune, rollback, lock, lock-timeout, wait, parallelism, and detailed-exit-code semantics.
14. Check AI-agent behavior when relevant. Separate model, prompt source, context include or exclude, max files, max bytes, write permissions, command permissions, network permissions, approval policy, checkpoint, dry-run, diff, and apply.
15. Preserve compatibility. For renamed or split flags, consider aliases, deprecation warnings, migration help, and tests before removing old syntax. Treat breaking option removals, changed defaults, changed prompt behavior, and changed parser grammar as public API changes.
16. Synchronize every surface that teaches or consumes the syntax: parser code, help text, completions, docs, README, examples, tests, fixtures, schemas, templates, package metadata, and release notes when applicable.
17. Verify with the narrowest configured related tests first, then docs, release, template, and mustflow checks when syntax, docs, profiles, templates, or package metadata changed.

<!-- mustflow-section: postconditions -->
## Postconditions

- Option names, aliases, defaults, parser behavior, config precedence, prompt behavior, and non-interactive behavior are explicit and synchronized.
- Short flags have a documented reason or are omitted in favor of clear long flags.
- Destructive, write, preview, confirmation, force, and non-interactive controls are not conflated.
- Automation-facing use has stable output-mode, no-prompt, no-color, no-progress, no-pager, timeout, retry, and exit-code behavior when relevant.
- Parser edge cases are covered by tests or reported as remaining risk.

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

<!-- mustflow-section: output-format -->
## Output Format

- CLI command and options reviewed
- Option role classification and naming decision
- Short and long flag collision review
- Safety, preview, destructive, prompt, and non-interactive controls
- Parser edge cases checked or reported missing
- Config and environment precedence
- Human, machine, CI, color, pager, progress, timeout, retry, and exit-code interaction
- Docs, help, completions, tests, schemas, templates, and package metadata synchronized
- Command intents run
- Skipped checks and reasons
- Remaining CLI-option contract risk
