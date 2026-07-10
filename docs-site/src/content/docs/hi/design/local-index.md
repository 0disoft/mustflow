---
title: स्थानीय सूचकांक
description: बताता है कि mustflow SQLite को अपने स्थानीय सूचकांक के रूप में कैसे उपयोग करता है।
---

mustflow SQLite को अपने डिफ़ॉल्ट स्थानीय सूचकांक भंडार के रूप में उपयोग करता है।

## सिद्धांत

फ़ाइलें हमेशा source of truth रहती हैं।

- `AGENTS.md`
- `.mustflow/config/*.toml`
- `.mustflow/context/*.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/*/SKILL.md`

SQLite तेज़ खोज और विश्लेषण के लिए द्वितीयक स्थानीय सूचकांक की तरह काम करता है। इसे मिटाना और फिर से बनाना सुरक्षित होना चाहिए।

स्थानीय SQLite database दोबारा बनाया जा सकने वाला cache है। इसे source of truth, memory storage, audit log, या transcript storage की तरह नहीं मानना चाहिए।

## अपेक्षित स्थान

```text
.mustflow/cache/mustflow.sqlite
```

`mf init` यह फ़ाइल तुरंत नहीं बनाता। सूचकांक `mf index` चलने पर बनता है।
`mf search` इस फ़ाइल को पढ़ता है, लेकिन source documents को modify नहीं करता। भविष्य में `mf map` और `mf dashboard` इसे reuse कर सकते हैं।

डिफ़ॉल्ट template इस state को ऐसे define करता है:

```toml
[capabilities]
local_index = "generated_optional"
```

इसका अर्थ है कि सूचकांक वैकल्पिक generated data है, source document नहीं।

## सूचकांक कौन सा data रख सकता है

- Document paths
- Titles और section headings
- Frontmatter metadata
- Document revisions और hashes
- Indexed file fingerprints
- छोटे content snippets
- Command intent metadata
- Skill references

मौजूदा `mf index` command `metadata_and_snippets` mode उपयोग करती है। यह हर document के लिए अधिकतम 2048 bytes का snippet रखती है, default रूप से पूरे document bodies store नहीं करती, और command intent names/descriptions को derived document terms की तरह रखती है ताकि `mf search` relevant config file ढूंढ सके।

`indexed_files` table हर indexed workflow file और optional source-anchor file के लिए derived fingerprints रखती है: path, source scope, size, modified time, content hash, indexed time, index mode, और parser version। `mf index --incremental` existing SQLite file सिर्फ तब reuse कर सकता है जब schema, parser version, source-scope settings, और file fingerprints compatible रहें; नहीं तो यह full rebuild करता है।

`indexed_source_candidates` table source-candidate membership को `indexed_files.source_scope` से अलग रखती है। इसलिए एक ही path workflow authority document और source candidate दोनों हो सकता है, बिना उसे गलती से stale माने। Foreign key हर source candidate के लिए `indexed_files` fingerprint मौजूद रखना अनिवार्य करती है और candidate रहते हुए उस fingerprint path को पहले delete या rename होने से रोकती है। Indexed paths project के भीतर canonical relative paths होने चाहिए; index creation और freshness check traversal, absolute paths, Windows drive या UNC forms, और symbolic links को reject करते हैं ताकि mustflow root के बाहर की file न पढ़ी जाए।

Search metadata `search_ngrams` table में भी लिखी जाती है। ये rows छोटे derived term fragments हैं, जो spaces या SQLite tokenization कमजोर होने पर multilingual search को सहारा देते हैं। वे documents, skills, skill routes, command intents, और source anchors की ओर point करते हैं; full documents या full source content store नहीं करते और authority ordering नहीं बदलते। N-gram generation hard limits use करता है: हर token के पहले 64 characters और हर indexed target पर अधिकतम 512 n-gram rows।

Search से पहले `mf search` stored hashes की तुलना current files से करता है और cache stale होने पर error लौटाता है। Last verification results और run analysis future features के लिए reserved हैं।

## Structured source anchors

Source anchors code navigation के लिए छोटा comment budget हैं, सामान्य documentation layer नहीं। `mf:anchor` केवल वहाँ उपयोग करें जहाँ exact source boundary मिलना agent को safer context चुनने या आसानी से टूटने वाले contract को समझने में मदद करे।

अच्छे anchor locations:

- exported CLI या core boundaries जहाँ input typed decision बनता है
- command execution, process control, file writes, receipts, और latest pointer updates
- security, privacy, data loss, migration, authorization, या state consistency boundaries
- non-obvious invariants जिन पर tests या command contracts निर्भर हैं

Ordinary control flow, obvious helpers, generated output, vendor code, dependency folders, broad architecture notes, और nearby types या function names दोहराने वाले prose पर anchors न लगाएँ।

Anchor IDs filenames के बजाय stable responsibility names उपयोग करते हैं। `verify.receipts.write`, `run.timeout.terminate`, या `source-anchors.scan` जैसे lowercase dotted names पसंद करें। IDs में lowercase letters, numbers, dots, और hyphens हो सकते हैं, और वे project में unique होने चाहिए।

Allowed fields जानबूझकर सीमित हैं:

- `purpose`: एक sentence जो बताता है कि यह source boundary क्यों महत्वपूर्ण है।
- `search`: तीन से आठ terms जिन्हें maintainer या agent search कर सकता है।
- `invariant`: वह condition जो टूटनी नहीं चाहिए, खासकर authority, safety, state, या evidence के लिए।
- `risk`: known tags जैसे `config`, `state`, `security`, `privacy`, `pii`, `secrets`, या `data_loss`।

```ts
/**
 * mf:anchor verify.receipts.write
 * purpose: Persist verify receipts and the latest pointer after scheduled intents finish.
 * search: verify receipt, latest.json, manifest, receipt binding
 * invariant: Receipt files explain evidence; they never grant command authority or verification success.
 * risk: state, data_consistency
 */
```

Source anchors में agent instructions, command authorization, policy overrides, secrets, या validation skip करने के claims नहीं होने चाहिए। उनके collected summaries हमेशा `navigationOnly: true` और `canInstructAgent: false` रखते हैं; SQLite उन्हें search और explanation के लिए index कर सकता है, लेकिन anchors commands authorize नहीं कर सकते, `.mustflow/config/commands.toml` को replace नहीं कर सकते, और verification success prove नहीं कर सकते।

`mf check --strict` malformed anchor IDs, unsupported fields, duplicate IDs, generated या vendor paths, unknown risk tags, secret-like text, और anchors में command या policy instructions reject करता है। यह तब warning भी देता है जब `purpose` बहुत लंबा हो, `search` में बहुत terms हों, high-risk anchor में `invariant` missing हो, या कोई file anchor budget बहुत अधिक खर्च करे। इन warnings को और prose जोड़ने की जगह anchors हटाने, छोटा करने, या split करने का संकेत मानें।

## लिखने के नियम

जब कोई LLM या dashboard documents edit करे, final write target Markdown या TOML ही रहता है।

SQLite search, display, और validation को तेज़ करने के लिए auxiliary data देता है।

Raw logs, full terminal output, full chat transcripts, hidden reasoning, secrets, environment values, और private repository contents सूचकांक या future knowledge layer के source documents नहीं हैं। mustflow project में छोटे run receipts रखता है और default रूप से raw logs store नहीं करता। यह `.mustflow/config/mustflow.toml` की `[retention]` policy और `mf check --strict` के storage checks से लागू होता है।
