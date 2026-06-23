---
title: mf next
description: Read-only next-action guidance for mustflow roots.
---

`mf next` inspects the current mustflow root and prints the next safe action.

It checks installation state, mustflow validation, changed files, verification requirements, runnable configured intents, optional script-pack helpers, and command-contract gaps. It does not run commands, run script-pack helpers, modify files, or grant command authority.

When changed files have no runnable configured verification, `mf next` points to `mf onboard commands` and the verification-plan API instead of guessing package-manager commands.

## Example

```sh
npx mf next
npx mf next --json
```

## JSON Fields

```sh
npx mf next --json
```

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `next`.
- `status` (`string`): `setup_required`, `blocked`, `idle`, `needs_verification`, or `unavailable`.
- `policy` (`object`): States that the report is read-only and `.mustflow/config/commands.toml` remains command authority.
- `state` (`object`): Install, validation, changed-file, selected-intent, and gap summary.
- `decision` (`object`): The primary next action, including a command when one is safe to suggest.
- `recommended_commands` (`string[]`): Supporting mustflow commands to inspect, configure, or verify.
- `gaps` (`object[]`): Verification requirements that lack runnable configured command coverage.
- `script_pack_suggestions` (`object`): Optional read-only script-pack helper recommendations derived from changed-file paths. These suggestions do not run scripts or grant command authority.

## Help and Exit Codes

```sh
npx mf next --help
```

- Exit code `0`: The next action was inspected.
- Exit code `1`: The next action could not be inspected because repository state was unavailable.
