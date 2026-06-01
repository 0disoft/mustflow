---
title: mf onboard commands
description: Review-only command onboarding suggestions.
---

`mf onboard commands` existing root command files inspect करता है और review-only command-intent suggestions print करता है।

इसे तब उपयोग करें जब repository ने अभी mustflow install किया हो और अभी भी कई `unknown` command intents हों। Command `package.json`, Makefile, और justfile entries को `mf contract-lint --suggest` वाले suggestion model से पढ़ता है।

Suggestions command authority नहीं देते। हर snippet `status = "unknown"` उपयोग करता है और `argv`, `lifecycle`, `run_policy`, `stdin`, `timeout_seconds`, `writes`, `network`, और `destructive` जैसे runnable fields छोड़ देता है। Maintainer को `.mustflow/config/commands.toml` में कोई snippet copy या expand करने से पहले command behavior review करना चाहिए।

यह command files नहीं लिखता।

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
- `command` (`string`): हमेशा `onboard commands`.
- `mustflow_root` (`string`): Current mustflow root.
- `command_contract_path` (`string`): हमेशा `.mustflow/config/commands.toml`.
- `policy` (`object`): बताता है कि suggestions review-only हैं, command authority नहीं देते, और files नहीं लिखते।
- `summary` (`object`): Intent counts, suggestion counts, और command-contract warning या error counts.
- `suggestions` (`object[]`): Source file, source entry, suggested intent name, reason, और TOML snippet वाले review-only candidates.
- `next_steps` (`string[]`): Accepted snippets review और validate करने की follow-up guidance.

## Help and Exit Codes

```sh
npx mf onboard --help
```

- Exit code `0`: Suggestions inspect और print हुए।
- Exit code `1`: Command को invalid input मिला।
