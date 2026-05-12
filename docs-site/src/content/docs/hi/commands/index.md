---
title: mf index
description: mustflow दस्तावेज़ों के लिए स्थानीय SQLite index बनाता है।
---

`mf index` वर्तमान रूट में mustflow document flow से पुनर्निर्माण योग्य SQLite index बनाता है।

source of truth disk पर मौजूद files ही रहती हैं। index एक cache है जो `mf search` और भविष्य की map या dashboard features को mustflow documents तेज़ी से पढ़ने में मदद करता है।

Structured source-code anchors शामिल करने के लिए `--source` उपयोग करें। Source indexing opt-in रहती है जब तक `.mustflow/config/index.toml` इसे साफ़ तौर पर enable न करे, और यह केवल anchor metadata store करती है, पूरा source content नहीं।

## सूचकांकित इनपुट

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- Command intents from `.mustflow/config/commands.toml`
- Structured source-code anchors, सिर्फ जब `--source` दिया गया हो या `.mustflow/config/index.toml` उन्हें enable करे

Default command मनमानी project source files index नहीं करता। इसका scope mustflow workflow files तक सीमित है। `--source` या साफ़ source-index setting के साथ यह structured `mf:anchor` comments खोजता है और सिर्फ id, path, line, purpose, search terms, invariant, और risk जैसे anchor fields लिखता है।

## आउटपुट फ़ाइल

```text
.mustflow/cache/mustflow.sqlite
```

यह file generated है। इसे हटाकर फिर से बनाया जा सकता है।
index indexed files के content hashes store करता है ताकि `mf search` पुराने cache data को पहचान सके।
यह `indexed_files` table में path, source scope, file size, modified time, content hash, indexed time, index mode, और parser version भी लिखता है, ताकि incremental run यह तय कर सके कि existing cache सुरक्षित रूप से reuse हो सकता है या नहीं।

Bundled SQLite runtime FTS5 support करे तो `mf index` तेज़ token matching के लिए derived text-search tables लिखता है। FTS5 unavailable हो तो वही base tables रहती हैं और `mf search` bounded table scan उपयोग करता है। दोनों paths searchable metadata से short n-gram rows भी store करते हैं, ताकि multilingual queries spaces या tokenization अलग होने पर भी indexed terms से match कर सकें।

## पूर्वाभ्यास

```sh
npx mf index --dry-run --json
```

पूर्वाभ्यास SQLite file लिखे बिना index targets calculate करता है और counts print करता है।

## Incremental Mode

```sh
npx mf index --incremental --json
```

Default रूप से `mf index` पूरा index rebuild करता है। Incremental mode पहले existing `.mustflow/cache/mustflow.sqlite` file जांचता है। Schema version, parser version, source-scope settings, और indexed file fingerprints compatible और fresh हों तो यह SQLite file rewrite किए बिना reuse करता है। कोई indexed workflow file बदली, हटाई, या जोड़ी गई हो, या source anchor scope बदला हो, तो mustflow full rebuild पर वापस जाता है।

## Source Anchors

```sh
npx mf index --source --json
```

Source anchor indexing सिर्फ navigation के लिए है। बनी हुई `source_anchors`, `source_anchor_fingerprints`, और `source_anchor_status` tables workflow rules, command permission, या verification authority define नहीं कर सकतीं।
Fingerprint और status rows derived search metadata हैं, जिनसे बाद में यह समझाने में मदद मिलती है कि anchor अभी भी expected code की ओर इशारा कर रहा है या नहीं।
जब पास की function, class, method, या constant पहचानी जा सकती है, तो fingerprint table kind, name, signature hash, और body hash जैसे derived symbol metadata भी store करती है।

## Source Scan Configuration

`.mustflow/config/index.toml` source-anchor scanning को सीमित कर सकता है, लेकिन workflow policy या command authority नहीं बदलता।

```toml
[source_index]
enabled_by_default = false
include = ["src/**/*.ts", "packages/*/src/**/*.ts"]
exclude = ["**/*.generated.ts", "**/__fixtures__/**"]
max_file_bytes = 262144
allowed_extensions = [".ts", ".tsx", ".js", ".py", ".rs", ".go"]
```

`enabled_by_default = true` से `mf index` बिना `--source` के भी source anchors शामिल करता है। Include और exclude patterns सिर्फ scan bound करते हैं। Generated, dependency, और vendor paths local source index से बाहर ही रहते हैं, भले वे include pattern से match करें।

## JSON फ़ील्ड

```sh
npx mf index --json
```

Machine-readable output ये फ़ील्ड उपयोग करता है:

- `schema_version` (`number`): output format version।
- `command` (`string`): हमेशा `index`।
- `ok` (`boolean`): क्या indexing सफल हुई।
- `mustflow_root` (`string`): वर्तमान mustflow root।
- `database_path` (`string`): target SQLite file path।
- `dry_run` (`boolean`): क्या file writing disabled था।
- `wrote_files` (`boolean`): क्या SQLite file लिखी गई।
- `index_mode` (`string`): default rebuild path के लिए `full`, या `--incremental` मांगे जाने पर `incremental`।
- `reused_existing` (`boolean`): क्या incremental mode ने existing SQLite file reuse की।
- `rebuild_reason` (`string | null`): incremental mode ने existing file reuse करने के बजाय rebuild क्यों किया।
- `document_count` (`number`): indexed mustflow documents और config files की संख्या।
- `skill_count` (`number`): indexed skill documents की संख्या।
- `skill_route_count` (`number`): `.mustflow/skills/INDEX.md` से indexed skill route rows की संख्या।
- `command_intent_count` (`number`): indexed command intents की संख्या।
- `command_effect_count` (`number`): `effects` या `writes` से derived indexed command effect rows की संख्या।
- `source_index_enabled` (`boolean`): source-anchor indexing `--source` या local index configuration से enabled थी या नहीं।
- `source_anchor_count` (`number`): indexed structured source anchors की संख्या।
- `search_backend` (`string`): इस index के लिए चुना गया search backend। `fts5` या `table_scan` में से एक।
- `search_fts5_available` (`boolean`): index बनाते समय SQLite runtime ने FTS5 support report किया या नहीं।
- `indexed_file_count` (`number`): `indexed_files` में दर्ज file fingerprints की संख्या।
- `indexed_paths` (`string[]`): document index में शामिल paths।

## निकास कोड

- `0`: index targets calculate हुए और वैकल्पिक रूप से लिखे गए।
- `1`: command को unknown option मिला या indexing विफल हुई।
