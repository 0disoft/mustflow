---
title: CLI Output Contract
description: Explains how mf commands should format help, errors, and exit codes.
---

`mf` commands should let agents and humans decide the next action from the same output.

Each command help page therefore follows a shared order.

## Help Shape

Every command help output should include these fields when applicable:

- `Usage`: The command shape.
- `Commands` or `Topics`: Subcommands or help topics.
- `Options`: Supported options.
- `Examples`: Commands that can be copied and run.
- `Exit codes`: Meaning of process exit codes.

For example, `mf check --help` should show which options the check command accepts and how it reports success or failure.

## Mustflow Root Resolution

`mf init` installs a new mustflow document flow in the current directory.

Other post-install commands walk upward from the current directory and use the nearest `.mustflow/` marker as the current mustflow root.
They read and write files relative to that root.

This rule applies to:

- `mf check`
- `mf status`
- `mf context`
- `mf update`
- `mf map`
- `mf flow`
- `mf help`
- `mf run`

For example, when a user runs `mf check --strict` from `src/feature/deep`, the command still validates the ancestor root that contains `.mustflow/config/mustflow.toml`.
`mf map --write` writes `REPO_MAP.md`, `mf flow --write` writes `REPO_FLOW.md`, and `mf run <intent>` writes `.mustflow/state/runs/latest.json` and rebuilds the retained run index `.mustflow/state/runs/latest.index.json` in that same root.

## Command Module Boundaries

Large command files should be split by responsibility, not by line count. A command needs a new
module boundary when one file starts mixing argument parsing, validation, planning, execution,
receipt writing, output rendering, and external-system adapters.

Use these responsibility names when splitting command code:

- Parser: turns CLI arguments, JSON files, and flags into typed input.
- Validator: checks that input follows the mustflow contract and returns user-facing errors.
- Planner: decides what work should happen without writing files or running commands.
- Executor: performs command execution, filesystem reads or writes, process control, or other side effects.
- Recorder: persists run receipts, manifests, latest pointers, and evidence references.
- Renderer: turns internal results into human text or JSON.

Dependency direction should stay simple:

- `src/cli/commands/<name>.ts` or `src/cli/commands/<name>/command.ts` owns CLI input and final output.
- `src/core/**` owns deterministic decisions, identifiers, summaries, status calculation, and contract checks.
- adapter or shell modules own process execution, filesystem writes, SQLite access, clocks, and platform behavior.

Core modules must not import CLI reporters, process handles, mutable global state, or filesystem
writers. CLI modules may call core modules and adapters, but they should not hide business decisions
inside rendering or receipt-writing code. When a refactor touches public JSON, exit codes, receipts,
or command scheduling, keep the old wrapper in place and extract the smallest behavior-preserving
slice first.

## CLI Output Language

`--lang` is a global option that selects the language for fixed CLI text.
Current values are `en`, `ko`, `zh`, `es`, `fr`, and `hi`. The `zh`, `es`, `fr`,
and `hi` catalogs use English text until translated.

```sh
mf --lang en help
mf --lang ko help
mf --lang zh help
mf --lang es help
mf --lang fr help
mf --lang hi help
```

`--lang` is different from `mf init --locale`. `--lang` controls terminal help and error guidance; `--locale` controls the installed mustflow document language.

Values read from installed `.mustflow/` files are not machine-translated. For example, a `description` in `commands.toml` is shown as written, while surrounding labels such as `Commands`, `Preferences`, or `Path` follow the CLI language.

## Error Shape

When a user passes an unknown command or option, errors start with a standard message.

```text
Error: Unknown option: --bad
Run `mf check --help` for usage.
```

Korean output keeps the same shape with localized fixed text.

```text
오류: Unknown option: --bad
사용법은 `mf check --help` 명령으로 확인하세요.
```

The reason is printed to `stderr`, and the related usage text may be printed to `stdout`. When automation needs structured output, use commands that support `--json`.

## Exit Codes

- `0`: The command completed normally, printed requested information, passed validation, or calculated a non-blocked plan.
- `1`: The command received invalid input, found validation issues, found blocked changes, or was asked to do something not supported yet.

The current CLI keeps exit codes broad. More granular codes should wait until real automation use cases justify them.

## JSON Output

`mf check`, `mf status`, and `mf update --dry-run` support `--json`.

JSON output is the surface for agents and scripts. They should read JSON fields instead of parsing human help text.
