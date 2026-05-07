---
title: mf search
description: mustflow दस्तावेज़ों के लिए स्थानीय SQLite index में खोज करता है।
---

`mf search` `mf index` द्वारा बनाए गए SQLite index को पढ़ता है।

यह files create या modify नहीं करता। यदि index missing है, तो पहले `mf index` चलाएं।
यदि कोई indexed mustflow file indexing के बाद बदल गई है, command रुकता है और index rebuild करने के लिए कहता है। इससे पुराने search results एजेंट को भ्रमित नहीं करते।

## खोज का दायरा

command केवल mustflow workflow data search करता है:

- `AGENTS.md` और `.mustflow/docs/*.md` जैसे indexed documents
- `.mustflow/skills/*/SKILL.md` से skill entries
- `.mustflow/config/commands.toml` से command intents

यह arbitrary project source files search नहीं करता।

## उपयोग

```sh
npx mf index
npx mf search mustflow_check
npx mf search "code review" --json
npx mf search test --limit 5
```

## विकल्प

- `--json`: results को machine-readable JSON format में output करता है।
- `--limit <number>`: लौटाए गए results की संख्या set करता है। default `10` है; maximum `50` है।

## JSON फ़ील्ड

```sh
npx mf search mustflow_check --json
```

Machine-readable output ये फ़ील्ड उपयोग करता है:

- `schema_version` (`number`): output format version।
- `command` (`string`): हमेशा `search`।
- `ok` (`boolean`): क्या search सफल हुआ।
- `mustflow_root` (`string`): वर्तमान mustflow root।
- `database_path` (`string`): query के लिए उपयोग की गई SQLite file।
- `query` (`string`): normalized search query।
- `limit` (`number`): result limit।
- `index_fresh` (`boolean`): क्या index current file contents से match करता है।
- `stale_paths` (`string[]`): indexing के बाद बदले हुए paths। index up to date हो तो empty।
- `result_count` (`number`): returned results की संख्या।
- `results` (`object[]`): matching documents, skills और command intents।

हर result में ये फ़ील्ड हो सकते हैं:

- `results[].kind` (`string`): result kind। `document`, `skill` या `command_intent` में से एक।
- `results[].path` (`string`): document या skill file path।
- `results[].name` (`string`): skill name या command intent name।
- `results[].title` (`string`): document title।
- `results[].document_type` (`string`): document category।
- `results[].match` (`string`): matching context snippet।
- `results[].score` (`number`): result order के लिए उपयोग किया गया ranking score।

## निकास कोड

- `0`: search पूरा हुआ।
- `1`: input invalid था, `.mustflow/cache/mustflow.sqlite` missing था, या index stale था।
