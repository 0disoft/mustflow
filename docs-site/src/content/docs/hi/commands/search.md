---
title: mf search
description: mustflow दस्तावेज़ों के लिए स्थानीय SQLite index में खोज करता है।
---

`mf search` `mf index` द्वारा बनाए गए SQLite index को पढ़ता है।

यह files create या modify नहीं करता। यदि index missing है, तो पहले `mf index` चलाएं।
यदि कोई indexed mustflow file indexing के बाद बदल गई है, command रुकता है और index rebuild करने के लिए कहता है। इससे पुराने search results एजेंट को भ्रमित नहीं करते।

Search वही backend उपयोग करता है जिसे `mf index` ने record किया था। FTS5 available हो तो text-search tables उपयोग होती हैं; नहीं तो वही derived metadata bounded table scan से पढ़ा जाता है। दोनों paths derived n-gram rows भी उपयोग करते हैं, ताकि multilingual queries spaces या SQLite tokenization अलग होने पर भी indexed terms से match कर सकें।

## खोज का दायरा

डिफ़ॉल्ट रूप से command केवल mustflow workflow data search करता है:

- `AGENTS.md` और `.mustflow/docs/*.md` जैसे indexed documents
- `.mustflow/skills/*/SKILL.md` से skill entries
- `.mustflow/config/commands.toml` से command intents

यह arbitrary project source files search नहीं करता। यदि index `mf index --source` से बनाया गया था, तो `--scope source` से structured source anchors search किए जा सकते हैं।

Workflow results और source-anchor hints दोनों देखने के लिए `--scope all` इस्तेमाल करें। इस mode में mustflow workflow authority और command-contract results को source anchors से ऊपर रखता है। Source anchors केवल code navigation hints हैं; वे command rules, skills, workflow documents, या `AGENTS.md` को override नहीं कर सकते।

## उपयोग

```sh
npx mf index
npx mf index --source
npx mf search mustflow_check
npx mf search "code review" --json
npx mf search "role mapping" --scope source
npx mf search mustflow_check --scope all --json
npx mf search test --limit 5
```

## विकल्प

- `--json`: results को machine-readable JSON format में output करता है।
- `--limit <number>`: लौटाए गए results की संख्या set करता है। default `10` है; maximum `50` है।
- `--scope <workflow|source|all>`: indexed workflow data, source anchors, या दोनों चुनता है। default `workflow` है।

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
- `scope` (`string`): search scope। `workflow`, `source`, या `all` में से एक।
- `index_fresh` (`boolean`): क्या index current file contents से match करता है।
- `stale_paths` (`string[]`): indexing के बाद बदले हुए paths। index up to date हो तो empty।
- `search_backend` (`string`): इस query के लिए उपयोग किया गया search backend। `fts5` या `table_scan` में से एक।
- `search_fts5_available` (`boolean`): क्या index SQLite FTS5 available होने पर बनाया गया था।
- `result_count` (`number`): returned results की संख्या।
- `results` (`object[]`): matching workflow entries और, request होने पर, source anchors।

हर result में ये फ़ील्ड हो सकते हैं:

- `results[].kind` (`string`): result kind। `document`, `skill`, `skill_route`, `command_intent`, या `source_anchor` में से एक।
- `results[].path` (`string`): document या skill file path।
- `results[].name` (`string`): skill name, command intent name, या source-anchor ID।
- `results[].title` (`string`): document title।
- `results[].document_type` (`string`): document category।
- `results[].anchor_id` (`string`): source-anchor ID।
- `results[].line_start` (`number`): anchor शुरू होने वाली line।
- `results[].risk` (`string`): comma-separated source-anchor risk tags।
- `results[].authority_rank` (`number`): workflow और source results साथ दिखने पर authority order।
- `results[].authority_label` (`string`): authority category, जैसे `command_contract` या `source_navigation_hint`।
- `results[].source_scope` (`string`): result workflow data से आया है या source-anchor data से।
- `results[].navigation_only` (`boolean`): क्या result केवल code navigation hint है।
- `results[].can_instruct_agent` (`boolean`): क्या result workflow instructions दे सकता है।
- `results[].match` (`string`): matching context snippet।
- `results[].score` (`number`): result order के लिए उपयोग किया गया ranking score।

## निकास कोड

- `0`: search पूरा हुआ।
- `1`: input invalid था, `.mustflow/cache/mustflow.sqlite` missing था, या index stale था।
