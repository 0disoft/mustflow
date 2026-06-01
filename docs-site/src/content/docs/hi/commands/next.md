---
title: mf next
description: Read-only next-action guidance for mustflow roots.
---

`mf next` current mustflow root inspect करता है और अगला safe action print करता है।

यह installation state, mustflow validation, changed files, verification requirements, runnable configured intents, और command-contract gaps check करता है। यह commands नहीं चलाता, files modify नहीं करता, और command authority नहीं देता।

जब changed files के लिए runnable configured verification नहीं है, `mf next` package-manager commands guess करने के बजाय `mf onboard commands` और verification-plan API दिखाता है।

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
- `command` (`string`): हमेशा `next`.
- `status` (`string`): `setup_required`, `blocked`, `idle`, `needs_verification`, या `unavailable`.
- `policy` (`object`): बताता है कि report read-only है और `.mustflow/config/commands.toml` command authority रहता है।
- `state` (`object`): Install, validation, changed-file, selected-intent, और gap summary.
- `decision` (`object`): Primary next action, safe होने पर command सहित.
- `recommended_commands` (`string[]`): Inspect, configure, या verify करने के supporting mustflow commands.
- `gaps` (`object[]`): Verification requirements जिनके लिए runnable configured command coverage नहीं है।

## Help and Exit Codes

```sh
npx mf next --help
```

- Exit code `0`: Next action inspect हुआ।
- Exit code `1`: Repository state unavailable होने के कारण next action inspect नहीं हो सका।
