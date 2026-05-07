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
- छोटे content snippets
- Command intent metadata
- Skill references

मौजूदा `mf index` command `metadata_and_snippets` mode उपयोग करती है। यह हर document के लिए अधिकतम 2048 bytes का snippet रखती है, default रूप से पूरे document bodies store नहीं करती, और command intent names/descriptions को derived document terms की तरह रखती है ताकि `mf search` relevant config file ढूंढ सके।

Search से पहले `mf search` stored hashes की तुलना current files से करता है और cache stale होने पर error लौटाता है। Last verification results और run analysis future features के लिए reserved हैं।

## लिखने के नियम

जब कोई LLM या dashboard documents edit करे, final write target Markdown या TOML ही रहता है।

SQLite search, display, और validation को तेज़ करने के लिए auxiliary data देता है।

Raw logs, full terminal output, full chat transcripts, hidden reasoning, secrets, environment values, और private repository contents सूचकांक या future knowledge layer के source documents नहीं हैं। mustflow project में छोटे run receipts रखता है और default रूप से raw logs store नहीं करता। यह `.mustflow/config/mustflow.toml` की `[retention]` policy और `mf check --strict` के storage checks से लागू होता है।
