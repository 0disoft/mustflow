---
title: mf evidence
description: changed files और latest runs के लिए read-only verification evidence report.
---

`mf evidence` summarize करता है कि क्या verify होना चाहिए, कौन से configured intents उसे cover करते हैं, और latest evidence उस plan के बारे में क्या कहता है.

यह commands नहीं चलाता और command authority नहीं देता. Default में यह changed files पढ़ता है, mustflow verification वाला planning model बनाता है, और `.mustflow/state/runs/latest.json` मौजूद हो तो उससे compare करता है. `--export <path>` JSON report को सिर्फ mustflow root के अंदर लिखता है.

## Example

```sh
npx mf evidence --changed
npx mf evidence --changed --json
npx mf evidence --latest --json
npx mf evidence --plan .mustflow/state/verification-plan.json --json
```

## JSON Fields

- `schema_version` (`string`): Output format version.
- `command` (`string`): हमेशा `evidence`.
- `status` (`string`): evidence और coverage का summarized status.
- `policy` (`object`): read-only, no execution, और `.mustflow/config/commands.toml` authority बताता है.
- `plan` (`object | null`): requirements, selected intents, और gaps.
- `latest` (`object`): raw output के बिना bounded latest evidence.
- `coverage` (`object`): requirements, receipts, risks, और gaps counts.
- `recommended_commands` (`string[]`): next step के लिए safe mustflow commands.

## Help and Exit Codes

```sh
npx mf evidence --help
```

- Exit code `0`: Evidence inspect हो गया.
- Exit code `1`: Evidence inspect नहीं हो सका.
