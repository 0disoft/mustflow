---
title: mf workspace
description: configured workspace roots और nested repository contracts के लिए read-only inspection.
---

`mf workspace status` configured workspace roots और discovered nested repositories inspect करता है।
`mf workspace command-catalog` हर discovered repository की command intent availability aggregate करता है।
`mf workspace verify --changed --plan-only` हर discovered repository का changed-file verification plan aggregate करता है।

यह commands नहीं चलाता, files modify नहीं करता, raw command strings expose नहीं करता, और parent repository को child repository के लिए command authority नहीं देता। हर discovered repository अपना `.mustflow/config/commands.toml` ही command-authority source रखती है।

## Example

```sh
npx mf workspace status
npx mf workspace status --json
npx mf workspace command-catalog --json
npx mf workspace verify --changed --plan-only --json
```

## JSON Fields

```sh
npx mf workspace status --json
```

- `schema_version` (`string`): output format version.
- `command` (`string`): हमेशा `workspace status`.
- `workspace` (`object`): `.mustflow/config/mustflow.toml` से workspace scan settings.
- `policy` (`object`): report read-only है और command authority नहीं देती.
- `repositories` (`object[]`): discovered nested git repositories और उनका local mustflow contract status.
- `issues` (`string[]`): read-only discovery या parsing issues.

`mf workspace command-catalog --json` के लिए `command` हमेशा `workspace command-catalog` होता है, और हर repository में intent availability, `mf run <intent>` entrypoints, और वह repository path होता है जहाँ command चलनी चाहिए।

`mf workspace verify --changed --plan-only --json` के लिए `command` हमेशा `workspace verify` होता है, और हर repository में changed files, selected intents, gaps, और वह repository path होता है जहाँ selected `mf run <intent>` commands चलनी चाहिए।

## Help and Exit Codes

```sh
npx mf workspace --help
```

- Exit code `0`: Workspace status inspect हुआ.
- Exit code `1`: command को invalid input मिला.
