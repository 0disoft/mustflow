---
title: mf contract-lint
description: commands.toml के command contract की read-only जाँच।
---

`mf contract-lint` किसी configured command को चलाए बिना `.mustflow/config/commands.toml` inspect करता है।

इसे command-contract errors और warnings की focused view के लिए उपयोग करें। यह `mf check` से संकरा है: गलत `configured` intents errors हैं, जबकि `unknown` और `manual_only` intents warnings के रूप में दिखते हैं।

जब change-classification validation reasons का `required_after` metadata से जुड़ना भी देखना हो, तो `--coverage` जोड़ें। Coverage findings warnings हैं; वे किसी command को runnable नहीं बनाते।

जब कोई intent `bun run <script>` जैसे package script form का उपयोग करता है, तो `mf contract-lint` उस intent के `cwd` में मौजूद `package.json` भी जांचता है। Referenced script न मिले तो यह केवल warning है; इससे command authority infer नहीं होती और automatic fix नहीं लगाया जाता।

Root `package.json`, Makefile, या justfile entries पढ़कर review-only intent snippets प्रिंट करने के लिए `--suggest` जोड़ें। Suggested snippets `status = "unknown"` इस्तेमाल करते हैं और `argv`, `lifecycle`, `run_policy` जैसे runnable fields छोड़ते हैं, इसलिए user द्वारा `.mustflow/config/commands.toml` में edit किए बिना वे command execution authorize नहीं करते।

## Example

```sh
npx mf contract-lint
npx mf contract-lint --coverage
npx mf contract-lint --suggest
npx mf contract-lint --json
npx mf contract-lint --coverage --json
```

## JSON Fields

```sh
npx mf contract-lint --json
```

- `schema_version` (`string`): output format version.
- `command` (`string`): हमेशा `contract-lint`.
- `mustflow_root` (`string`): मौजूदा mustflow root.
- `report.status` (`string`): `passed`, `warning`, या `failed`.
- `report.summary` (`object`): intent counts, runnable count, error count, और warning count.
- `report.issues` (`object[]`): `severity`, `code`, `intent`, और `message` वाले issues.
- `report.sourceFiles` (`string[]`): command-contract rules बताने वाली files.
- `report.suggestions` (`object[]`, optional): सिर्फ `--suggest` के साथ मौजूद होता है। इसमें source file, source entry, command hint, suggested intent name, `status = "unknown"`, reason, और review-only TOML snippet होता है.
- `report.coverage` (`object`, optional): सिर्फ `--coverage` के साथ मौजूद होता है। इसमें known classification reasons, documented verification reasons, declared `required_after` reasons, runnable reasons, और coverage findings होते हैं.
- `report.coverage.findings` (`object[]`): stable `code`, `reason`, `intent`, `intents`, और `message` fields वाले warning-first coverage findings.

## Help and Exit Codes

```sh
npx mf contract-lint --help
```

- Exit code `0`: कोई blocking command-contract error नहीं मिला.
- Exit code `1`: command-contract errors मिले या input invalid था.
