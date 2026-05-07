---
title: mf help
description: Shows help by reading the installed mustflow documents and configuration.
---

`mf help` does not serve as a separate, static manual. Instead, it reads the installed mustflow files from the current root and displays the relevant view.

## Topics

```sh
npx mf help workflow
npx mf help skills
npx mf help commands
npx mf help preferences
npx mf --lang en help
npx mf --lang ko help
npx mf --lang zh help
npx mf --lang es help
npx mf --lang fr help
npx mf --lang hi help
```

- `workflow`: Prints `.mustflow/docs/agent-workflow.md`.
- `skills`: Prints `.mustflow/skills/INDEX.md`.
- `commands`: Summarizes command intents and status from `.mustflow/config/commands.toml`.
- `preferences`: Summarizes preferences from `.mustflow/config/preferences.toml`.

## Principle

Help output does not introduce a separate source of truth. Each topic is derived from an installed mustflow file.



## CLI Output Language

`--lang` selects the language for fixed CLI text, such as help headings and error guidance.
Current values are `en`, `ko`, `zh`, `es`, `fr`, and `hi`. The `zh`, `es`, `fr`, and `hi` catalogs currently use English text until translations are provided.

```sh
npx mf --lang en help
npx mf --lang ko help
npx mf --lang zh help
npx mf --lang es help
npx mf --lang fr help
npx mf --lang hi help
```

This differs from `mf init --locale`. While `--lang` controls the terminal output, `--locale` determines the language of the installed mustflow documents.

When `mf help commands` or `mf help preferences` reads descriptions from installed project files, those values are not machine-translated. Only the surrounding CLI labels use the selected CLI language.

## Structured Output

`mf help` does not currently provide a JSON output format.

Agents and automation requiring structured command information should use `mf context --json` to retrieve runnable intent names, then refer to `.mustflow/config/commands.toml` for the full contract.

## Help and Exit Codes

```sh
npx mf help --help
```

English help output is ordered as `Usage`, `Topics`, `Options`, `Examples`, and `Exit codes`.
Korean help uses the same order with localized headings.

- Exit code `0`: The requested help topic was printed, or a missing installed topic file was reported.
- Exit code `1`: The command received an unknown topic or option.

The topic list is built into the CLI, but each topic body is read from `.mustflow/` files in the current root.
