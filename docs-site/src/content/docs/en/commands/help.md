---
title: mf help
description: Shows help by reading the installed mustflow documents and configuration.
---

`mf help` is not a separate long manual. It reads the installed mustflow files from the current root and shows the relevant view.

## Topics

```sh
npx mf help workflow
npx mf help skills
npx mf help commands
npx mf help preferences
npx mf --lang ko help
npx mf --lang en help
```

- `workflow`: Prints `.mustflow/docs/agent-workflow.md`.
- `skills`: Prints `.mustflow/skills/INDEX.md`.
- `commands`: Summarizes command intents and status from `.mustflow/config/commands.toml`.
- `preferences`: Summarizes preferences from `.mustflow/config/preferences.toml`.

## Principle

Help output does not introduce another source of truth. Each topic is backed by an installed mustflow file.

This reduces drift between documentation, configuration, and CLI help.

## CLI Output Language

`--lang` selects the language for fixed CLI text such as help headings and error guidance.

```sh
npx mf --lang ko help
npx mf --lang en help
```

This is different from `mf init --locale`. `--lang` controls terminal output; `--locale` controls the installed mustflow document language.

When `mf help commands` or `mf help preferences` reads descriptions from installed project files, those values are not machine-translated. Only the surrounding CLI labels use the selected CLI language.

## Structured Output

`mf help` does not currently provide a JSON output format.

Agents and automation that need structured command information should use `mf context --json` for runnable intent names, then read `.mustflow/config/commands.toml` when they need the full contract.

## Help and Exit Codes

```sh
npx mf help --help
```

English help output is ordered as `Usage`, `Topics`, `Options`, `Examples`, and `Exit codes`.
Korean help uses the same order with localized headings.

- Exit code `0`: The requested help topic was printed, or a missing installed topic file was reported.
- Exit code `1`: The command received an unknown topic or option.

The topic list is built into the CLI, but each topic body is read from `.mustflow/` files in the current root.
