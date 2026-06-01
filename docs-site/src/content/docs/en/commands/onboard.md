---
title: mf onboard commands
description: Review-only command onboarding suggestions.
---

`mf onboard commands` inspects existing root command files and prints review-only command-intent suggestions.

Use it when a repository has just installed mustflow and still has many `unknown` command intents. The command reads `package.json`, Makefile, and justfile entries through the same suggestion model as `mf contract-lint --suggest`.

The suggestions do not grant command authority. Each snippet uses `status = "unknown"` and omits runnable fields such as `argv`, `lifecycle`, `run_policy`, `stdin`, `timeout_seconds`, `writes`, `network`, and `destructive`. A maintainer must review the command behavior before copying or expanding a snippet in `.mustflow/config/commands.toml`.

The command does not write files.

## Example

```sh
npx mf onboard commands
npx mf onboard commands --json
```

## JSON Fields

```sh
npx mf onboard commands --json
```

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `onboard commands`.
- `mustflow_root` (`string`): Current mustflow root.
- `command_contract_path` (`string`): Always `.mustflow/config/commands.toml`.
- `policy` (`object`): States that suggestions are review-only, do not grant command authority, and do not write files.
- `summary` (`object`): Intent counts, suggestion counts, and command-contract warning or error counts.
- `suggestions` (`object[]`): Review-only candidate snippets with source file, source entry, suggested intent name, reason, and TOML snippet.
- `next_steps` (`string[]`): Follow-up guidance for reviewing and validating accepted snippets.

## Help and Exit Codes

```sh
npx mf onboard --help
```

- Exit code `0`: Suggestions were inspected and printed.
- Exit code `1`: The command received invalid input.
