---
title: mf check
description: Validates the mustflow document flow in a user repository.
---

`mf check` verifies that the installed mustflow files are readable and usable by agents.
After modifying the document flow, use `--strict` to perform additional safety checks.
Use `--json` when automation or an agent needs to parse the results.

## Validation Criteria

- `AGENTS.md` exists at the repository root.
- `.mustflow/config/mustflow.toml` is valid and can be parsed.
- `.mustflow/config/commands.toml` is valid and can be parsed.
- `.mustflow/config/preferences.toml` is valid and can be parsed, if present.
- `[map]`, `[workspace]`, and `[context]` fields in `.mustflow/config/mustflow.toml` use valid types and safe relative paths.
- `.mustflow/config/preferences.toml`, if present, uses valid basic types for language, formatting, code style, git, docs, and logging preferences.
- `.mustflow/config/manifest.lock.toml`, if present, is validated against current file contents.
- `.mustflow/skills/router.toml` exists.
- `.mustflow/skills/routes.toml` exists.
- `.mustflow/skills/INDEX.md` exists.
- `.mustflow/skills/*/SKILL.md` files contain the required stable section identifiers.
- `.mustflow/context/*.md` files, if present, are correctly identified as mustflow context documents.
- `commands.toml` intents with `status = "configured"` include necessary command information, lifecycle, run policy, and timeout.
- Long-running lifecycles are not exposed with `run_policy = "agent_allowed"`.

## Strict Checks

```sh
npx mf check --strict
```

`--strict` enables additional checks focused on agent input stability and command safety.

- Managed mustflow Markdown files must keep the expected `mustflow_doc`, `locale`, `canonical`, `revision`, `authority`, and `lifecycle` frontmatter shape for their path. Related issues include both the logical document id and relative path.
- Context documents must not claim to override direct user instructions, current code, tests, or command contracts.
- Source anchors must stay structured navigation hints. Strict mode fails malformed anchor declarations, duplicate anchor IDs, agent command or policy instructions inside anchors, secret-like anchor text, anchors in generated or vendor paths, and unknown risk tags.
- Source anchor quality signals such as long `purpose` text, too many `search` terms, or high anchor density are emitted as warnings and do not fail the check.
- Source anchors tagged with high-risk classes such as authorization, personal data, payment, migration, data loss, secrets, or security use lower warning thresholds and are marked for review when the anchor lacks an `invariant`.
- `.mustflow/skills/INDEX.md` and `.mustflow/context/INDEX.md` must remain routing indexes rather than procedure documents.
- `.mustflow/skills/INDEX.md` routes must point to existing `SKILL.md` files, and every installed skill must be listed.
- Optional `.mustflow/skills/route-fixtures.json` cases must keep their expected main route, required candidates, required adjuncts, and forbidden candidates aligned with `mf skill route`.
- `SKILL.md` frontmatter must use `metadata.mustflow_schema: "1"`, `metadata.mustflow_kind: procedure`, and a `name` matching its `.mustflow/skills/<name>/` folder.
- `metadata.command_intents` entries in skill frontmatter must reference command intents declared in `.mustflow/config/commands.toml`.
- Command intents listed in `.mustflow/skills/INDEX.md` must be declared by the referenced skill frontmatter.
- Skill bodies must not claim permission to run commands directly; command permissions stay in `.mustflow/config/commands.toml`.
- Optional candidate path-classification files at `.mustflow/config/changes.toml` and `.mustflow/config/surfaces.toml`, when present, must stay narrow: `[[rules]]` entries may use only `exact`, `prefix`, or `glob` matches and may not define command authority. `.mustflow/config/policy.toml` remains deferred and fails strict validation if present.
- Prompt-cache stable-prefix entries must exist, stay out of the volatile source set, avoid expanded skill indexes, route metadata, and leaf skill files, and fit the configured `prompt_cache.max_stable_prefix_kb` hard budget after deterministic reference-bundle rendering.
- When version-impact preferences are enabled, a declared version source or detectable package/template version source must exist.


Strict mode is optional to ensure the normal workflow remains lightweight. It is recommended after modifying mustflow documents, skills, command contracts, or repository-map generation rules.

## Error and Warning Classification

`mf check` treats structural violations as blocking errors. Blocking issues exit with code `1`; warnings are reported separately and do not fail the command.

- Base errors come from required files, parse failures, unsafe configuration values, command-contract violations, missing skill section identifiers, invalid context document identity, and manifest-lock drift.
- Strict errors come from additional document identity, routing, skill metadata, prompt-cache budget, source-anchor, command-boundary, repository-map, retention, run-receipt, and context hygiene checks. They appear only when `--strict` is enabled.
- Non-blocking observations may appear as `warnings` in JSON output or as warning lines in human-readable output. Use `mf doctor` diagnostics when automation needs broader informational health signals.

## Configuration Rules

`mf check` treats `[map]`, `[workspace]`, and `[context]` as flexible, default-backed configurations, but fails if values are unsafe or ambiguous.
For older installations, a missing `manifest.lock.toml` does not cause the check to fail. However, if the lock file exists, any missing locked files or content-hash mismatches are reported as failures.

- `map.output`: Must be a non-empty relative path.
- `map.mode`: Currently, only `anchors_only` is supported.
- `map.privacy`: Currently, only `minimal` is supported.
- `map.include_nested`: Must be a boolean.
- `map.anchor_files`: Must be an array of non-empty relative paths.
- `workspace.roots`: Must be relative paths within the current root.
- `workspace.max_depth`, `workspace.max_repositories`: Must be positive integers.
- `workspace.follow_symlinks`, `workspace.stop_at_repository_root`: Must be booleans.
- `context.root`, `context.index`, `context.default_files`, and `context.external_anchors`: Must use non-empty relative paths.
- `context.read_policy`: Currently, only `task_relevant_only` is supported.
- `context.authority`: Currently, only `contextual` is supported.
- Main values in `preferences.toml` must be strings.
- Automatic commit, sensitive data, and drive-by refactor settings in `preferences.toml` must be booleans.
- `docs.update_when` in `preferences.toml` must be a string array.
- Executable intents in `commands.toml` must declare `lifecycle`, `run_policy`, `timeout_seconds`, and `stdin`.
- Intents with `lifecycle = "oneshot"` require `timeout_seconds` and `stdin = "closed"`.
- `server`, `watch`, `interactive`, `browser`, and `background` intents must not be exposed as default agent-runnable commands.
- Candidate path-classification rules in `changes.toml` or `surfaces.toml` may describe `id`, `match`, `change_kinds`, `surface_kind`, `category`, `is_public_surface`, `validation_reasons`, `affected_contracts`, `update_policy`, and `drift_checks`. They do not make any command runnable; command authority still comes only from configured intents in `commands.toml`.

## Standard Skill Section IDs

Skill documents must include these stable section identifiers before their localized section headings.

```text
<!-- mustflow-section: purpose -->
<!-- mustflow-section: use-when -->
<!-- mustflow-section: do-not-use-when -->
<!-- mustflow-section: required-inputs -->
<!-- mustflow-section: preconditions -->
<!-- mustflow-section: allowed-edits -->
<!-- mustflow-section: procedure -->
<!-- mustflow-section: postconditions -->
<!-- mustflow-section: verification -->
<!-- mustflow-section: failure-handling -->
<!-- mustflow-section: output-format -->
```


## Example

```sh
npx mf check
```

On success, it prints:

```text
mustflow check passed
```

On failure, it prints missing files or section identifiers to standard error and exits with code `1`.

## JSON Fields

```sh
npx mf check --json
```

Machine-readable output uses these fields:

- `ok` (`boolean`): Whether all checks passed.
- `strict` (`boolean`): Whether `--strict` checks were enabled.
- `issueCount` (`number`): Number of issues found.
- `issues` (`string[]`): Human-readable issue messages.
- `warningCount` (`number`): Number of non-blocking warnings found.
- `warnings` (`string[]`): Human-readable warning messages.
- `issueDetails` (`object[]`): Machine-readable issue and warning details. `id` is a stable identifier for command-boundary and related strict checks when one applies, `severity` is `error` or `warning`, `mode` is `base` or `strict`, and `message` mirrors the corresponding entry from `issues` or `warnings`.

When blocking issues are found, the JSON form also exits with code `1`. Warnings alone keep exit code `0`.

## Help and Exit Codes

```sh
npx mf check --help
```

Help output is ordered as `Usage`, `Options`, `Examples`, and `Exit codes`.

- Exit code `0`: All required files and settings are valid.
- Exit code `1`: Validation found issues, or the command received an unknown option.

Agents and automation should use the `ok`, `issues`, and `issueDetails` fields from the `--json` output instead of parsing human-readable success or failure text.
