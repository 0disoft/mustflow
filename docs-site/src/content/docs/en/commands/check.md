---
title: mf check
description: Validates the mustflow document flow in a user repository.
---

`mf check` verifies that the installed mustflow files are readable and usable by agents.
After changing the document flow itself, use `--strict` for additional safety checks.
Use `--json` when automation or an agent needs to parse the result.

## What It Checks

- `AGENTS.md` exists at the repository root.
- `.mustflow/config/mustflow.toml` can be parsed.
- `.mustflow/config/commands.toml` can be parsed.
- `.mustflow/config/preferences.toml` can be parsed when present.
- `[map]`, `[workspace]`, and `[context]` fields in `.mustflow/config/mustflow.toml` use valid types and safe relative paths.
- `.mustflow/config/preferences.toml` uses valid basic types for language, formatting, code style, git, docs, and logging preferences when present.
- `.mustflow/config/manifest.lock.toml` is checked against current file contents when present.
- `.mustflow/skills/INDEX.md` exists.
- `.mustflow/skills/*/SKILL.md` files contain the standard sections.
- `.mustflow/context/*.md` files, when present, identify themselves as mustflow context documents.
- `commands.toml` intents with `status = "configured"` include command information, lifecycle, run policy, and timeout.
- Long-running lifecycles are not exposed with `run_policy = "agent_allowed"`.

## Strict Checks

```sh
npx mf check --strict
```

`--strict` adds checks that are closer to agent input stability and command safety.

- Skill documents must not contain raw shell fenced blocks such as `sh`, `bash`, or `powershell`.
- Skill folders under `.mustflow/skills/<name>/` must not contain supporting files without `SKILL.md`.
- When a skill has `resources.toml`, registered resources must exist and live under `references/`, `assets/`, or `scripts/`.
- `.mustflow/skills/<name>/scripts/` must not contain unregistered helper files.
- Script resources must declare `run_policy = "requires_command_contract"` and `command_intent`, and that intent must be configured in `commands.toml`.
- Script resources must not enable network access, destructive behavior, or writes outside the skill folder by default.
- `REPO_MAP.md` must not contain volatile metadata such as generated times, update times, file counts, or changed-file counts.
- `REPO_MAP.md` must not contain remote URLs or branch metadata that can leak context or mislead agents outside the current root.
- `commands.toml` must define `[defaults].max_output_bytes` and `[defaults].on_timeout`.
- `mustflow.toml` must define a `[retention]` policy.
- `REPO_MAP.md` and `.mustflow/state/runs/latest.json` must stay within the retention size limits.
- `.mustflow/context/*.md` files must stay within `[retention.context].max_file_kb`.
- `.mustflow/context/*.md` files must not contain local absolute paths, secret-like key/value text, or design-token definitions duplicated from `DESIGN.md`.
- `.mustflow/knowledge/**`, when present, must stay within the retention size limit.
- Raw JSONL logs must not appear under `.mustflow/**`.
- `.mustflow/state/runs/latest.json`, when present, must parse as a JSON object.

Strict mode is optional so the normal workflow stays small. It is recommended after changing
mustflow documents, skills, command contracts, or repository-map generation rules.

## Configuration Rules

`mf check` treats `[map]`, `[workspace]`, and `[context]` as flexible default-backed configuration, but fails values that are unsafe or hard to interpret.
For older installs, a missing `manifest.lock.toml` does not fail the check. When the lock file exists, missing locked files or content-hash mismatches are reported as failures.

- `map.output`: Must be a non-empty relative path.
- `map.mode`: Currently only `anchors_only` is allowed.
- `map.privacy`: Currently only `minimal` is allowed.
- `map.include_nested`: Must be a boolean.
- `map.anchor_files`: Must be an array of non-empty relative paths.
- `workspace.roots`: Must be relative paths inside the current root.
- `workspace.max_depth`, `workspace.max_repositories`: Must be positive integers.
- `workspace.follow_symlinks`, `workspace.stop_at_repository_root`: Must be booleans.
- `context.root`, `context.index`, `context.default_files`, and `context.external_anchors`: Must use non-empty relative paths.
- `context.read_policy`: Currently only `task_relevant_only` is allowed.
- `context.authority`: Currently only `contextual` is allowed.
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

Agents and automation should read `ok` and `issues` from `--json` output instead of parsing human success or failure text.
