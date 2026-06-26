---
title: mf tech
description: Manages low-authority technology preferences for agents.
---

`mf tech` reads and updates `.mustflow/config/technology.toml`.

Technology preferences are hints, not command authority. They do not install dependencies, approve
migrations, override current source code, or let agents skip `.mustflow/config/commands.toml`.

## Actions

- `list`: Print recorded technology preferences.
- `suggest`: Print preferences and avoid-list guidance for a scope.
- `add`: Create or update a preference.
- `remove`: Remove a preference by id or unique name.

## Examples

```sh
mf tech list
mf tech list --json
mf tech suggest --scope frontend
mf tech add framework nextjs --scope frontend --ecosystem npm --package next --package react --verify --why "Preferred React app framework"
mf tech add language rust --scope backend --status preferred --why "Use for correctness-critical engines"
mf tech add library jquery --scope frontend --status avoid --why "Avoid new usage"
mf tech remove framework.frontend.nextjs
```

`--verify` currently verifies npm package names before writing the preference. It does not install
packages or modify `package.json`.

## Options

- `--json`: Print machine-readable output.
- `--scope <scope>`: Filter or tag a project area such as frontend, backend, UI, data, or CLI.
- `--kind <kind>`: Technology kind.
- `--status <status>`: Preference status.
- `--ecosystem <ecosystem>`: Package ecosystem or platform.
- `--package <package>`: Package name to associate with the preference. Repeatable.
- `--verify`: Verify listed npm packages before writing.
- `--why <text>`: Short rationale.
- `--constraint <text>`: Guardrail agents must keep in mind. Repeatable.

## Help and Exit Codes

```sh
mf tech --help
```

- Exit code `0`: Technology preferences were inspected or updated.
- Exit code `1`: The command received invalid input or verification failed.
