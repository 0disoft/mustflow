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
- `.mustflow/skills/INDEX.md` exists.
- `.mustflow/skills/*/SKILL.md` files contain the required standard sections.
- `.mustflow/context/*.md` files, if present, are correctly identified as mustflow context documents.
- `commands.toml` intents with `status = "configured"` include necessary command information, lifecycle, run policy, and timeout.
- Long-running lifecycles are not exposed with `run_policy = "agent_allowed"`.

## Strict Checks

```sh
npx mf check --strict
```

`--strict` enables additional checks focused on agent input stability and command safety.

- Managed mustflow Markdown files must keep the expected `mustflow_doc`, `locale`, `canonical`, and `revision` frontmatter shape for their path.
- Context documents must not claim to override direct user instructions, current code, tests, or command contracts.
- `.mustflow/skills/INDEX.md` and `.mustflow/context/INDEX.md` must remain routing indexes rather than procedure documents.
- `.mustflow/skills/INDEX.md` routes must point to existing `SKILL.md` files, and every installed skill must be listed.
- `SKILL.md` frontmatter must use `metadata.mustflow_schema: "1"`, `metadata.mustflow_kind: procedure`, and a `name` matching its `.mustflow/skills/<name>/` folder.
- `metadata.command_intents` entries in skill frontmatter must reference command intents declared in `.mustflow/config/commands.toml`.
- Command intents listed in `.mustflow/skills/INDEX.md` must be declared by the referenced skill frontmatter.
- Skill bodies must not claim permission to run commands directly; command permissions stay in `.mustflow/config/commands.toml`.
- When version-impact preferences are enabled, a declared version source or detectable package/template version source must exist.


Strict mode is optional to ensure the normal workflow remains lightweight. It is recommended after modifying mustflow documents, skills, command contracts, or repository-map generation rules.

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

## Standard Skill Sections

Skill documents must include these sections.

```text
## 목적
## 사용 조건
## 사용하지 않는 경우
## 필요한 입력
## 절차
## 검증
## 실패 대응
## 출력 형식
```

## Example

```sh
npx mf check
```

On success, it prints:

```text
mustflow check passed
```

On failure, it prints missing files or sections to standard error and exits with code `1`.

## JSON Fields

```sh
npx mf check --json
```

Machine-readable output uses these fields:

- `ok` (`boolean`): Whether all checks passed.
- `strict` (`boolean`): Whether `--strict` checks were enabled.
- `issueCount` (`number`): Number of issues found.
- `issues` (`string[]`): Human-readable issue messages.

When issues are found, the JSON form also exits with code `1`.

## Help and Exit Codes

```sh
npx mf check --help
```

Help output is ordered as `Usage`, `Options`, `Examples`, and `Exit codes`.

- Exit code `0`: All required files and settings are valid.
- Exit code `1`: Validation found issues, or the command received an unknown option.

Agents and automation should use the `ok` and `issues` fields from the `--json` output instead of parsing human-readable success or failure text.
