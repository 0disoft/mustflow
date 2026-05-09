---
title: mf contract-lint
description: Read-only command-contract lint for commands.toml.
---

`mf contract-lint` inspects `.mustflow/config/commands.toml` without running any configured command.

Use it when you need a focused view of command-contract errors and warnings. It is narrower than `mf check`: malformed configured intents are errors, while `unknown` and `manual_only` intents are reported as warnings so planned but unavailable commands stay visible.

## Example

```sh
npx mf contract-lint
npx mf contract-lint --json
```

## JSON Fields

```sh
npx mf contract-lint --json
```

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `contract-lint`.
- `mustflow_root` (`string`): Current mustflow root.
- `report.status` (`string`): `passed`, `warning`, or `failed`.
- `report.summary` (`object`): Intent counts, runnable count, error count, and warning count.
- `report.issues` (`object[]`): Command-contract issues with `severity`, `code`, `intent`, and `message`.
- `report.sourceFiles` (`string[]`): Files that define the command-contract rules.

## Help and Exit Codes

```sh
npx mf contract-lint --help
```

- Exit code `0`: No blocking command-contract errors were found.
- Exit code `1`: Command-contract errors were found, or the command received invalid input.
