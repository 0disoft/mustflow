---
title: mf index
description: mustflow दस्तावेज़ों के लिए स्थानीय SQLite index बनाता है।
---

`mf index` वर्तमान रूट में mustflow document flow से पुनर्निर्माण योग्य SQLite index बनाता है।

source of truth disk पर मौजूद files ही रहती हैं। index एक cache है जो `mf search` और भविष्य की map या dashboard features को mustflow documents तेज़ी से पढ़ने में मदद करता है।

Structured source-code anchors शामिल करने के लिए `--source` उपयोग करें। Source indexing opt-in है और केवल anchor metadata store करती है, पूरा source content नहीं।

## सूचकांकित इनपुट

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- Command intents from `.mustflow/config/commands.toml`
- Structured source-code anchors, सिर्फ जब `--source` दिया गया हो

Default command मनमानी project source files index नहीं करता। इसका scope mustflow workflow files तक सीमित है। `--source` के साथ यह structured `mf:anchor` comments खोजता है और सिर्फ id, path, line, purpose, search terms, invariant, और risk जैसे anchor fields लिखता है।

## आउटपुट फ़ाइल

```text
.mustflow/cache/mustflow.sqlite
```

यह file generated है। इसे हटाकर फिर से बनाया जा सकता है।
index indexed files के content hashes store करता है ताकि `mf search` पुराने cache data को पहचान सके।

## पूर्वाभ्यास

```sh
npx mf index --dry-run --json
```

पूर्वाभ्यास SQLite file लिखे बिना index targets calculate करता है और counts print करता है।

## Source Anchors

```sh
npx mf index --source --json
```

Source anchor indexing सिर्फ navigation के लिए है। बनी हुई `source_anchors`, `source_anchor_fingerprints`, और `source_anchor_status` tables workflow rules, command permission, या verification authority define नहीं कर सकतीं।
Fingerprint और status rows derived search metadata हैं, जिनसे बाद में यह समझाने में मदद मिलती है कि anchor अभी भी expected code की ओर इशारा कर रहा है या नहीं।
जब पास की function, class, method, या constant पहचानी जा सकती है, तो fingerprint table kind, name, signature hash, और body hash जैसे derived symbol metadata भी store करती है।

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
- `document_count` (`number`): indexed mustflow documents और config files की संख्या।
- `skill_count` (`number`): indexed skill documents की संख्या।
- `command_intent_count` (`number`): indexed command intents की संख्या।
- `source_index_enabled` (`boolean`): source-anchor indexing request किया गया था या नहीं।
- `source_anchor_count` (`number`): indexed structured source anchors की संख्या।
- `indexed_paths` (`string[]`): document index में शामिल paths।

## निकास कोड

- `0`: index targets calculate हुए और वैकल्पिक रूप से लिखे गए।
- `1`: command को unknown option मिला या indexing विफल हुई।
