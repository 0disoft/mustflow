---
title: स्थानीय सूचकांक
description: बताता है कि mustflow SQLite को अपने स्थानीय सूचकांक के रूप में कैसे उपयोग करता है।
---

mustflow SQLite को अपने डिफ़ॉल्ट स्थानीय सूचकांक भंडार के रूप में उपयोग करता है।

## सिद्धांत

फ़ाइलें हमेशा सत्य का स्रोत हैं।

- `AGENTS.md`
- `.mustflow/config/*.toml`
- `.mustflow/context/*.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/*/SKILL.md`

SQLite तेज़ खोज और विश्लेषण के लिए द्वितीयक स्थानीय सूचकांक की तरह काम करता है। इसे मिटाना और फिर से बनाना सुरक्षित होना चाहिए।

## अपेक्षित स्थान

```text
.mustflow/cache/mustflow.sqlite
```

`mf init` यह फ़ाइल तुरंत नहीं बनाता। सूचकांक तब बनता है जब `mf index` चलता है।
`mf search` स्रोत दस्तावेज़ों को बदले बिना इस फ़ाइल को पढ़ता है। भविष्य की `mf map` और `mf dashboard` सुविधाएं इसे फिर से उपयोग कर सकती हैं।

डिफ़ॉल्ट टेम्पलेट इस state को ऐसे परिभाषित करता है:

```toml
[capabilities]
local_index = "generated_optional"
```

इसका अर्थ है कि सूचकांक वैकल्पिक generated data है, स्रोत दस्तावेज़ नहीं।

## वह data जिसे सूचकांक रख सकता है

- दस्तावेज़ पथ
- शीर्षक और अनुभाग
- Frontmatter metadata
- दस्तावेज़ revisions
- Command intents
- Skill references

मौजूदा `mf index` कमांड mustflow दस्तावेज़ों, context files, config files, skill documents, और command intents को सूचकांकित करती है। `mf search` केवल उसी सूचकांकित mustflow workflow data पर query चलाता है।
सूचकांक content hashes भी रखता है। खोज से पहले `mf search` उन hashes की तुलना वर्तमान फ़ाइलों से करता है और cache पुराना होने पर त्रुटि लौटाता है।
अंतिम verification results और run analysis भविष्य की सुविधाओं के लिए आरक्षित हैं।

## लिखने के नियम

जब कोई LLM या dashboard दस्तावेज़ संपादित करता है, अंतिम write target अब भी Markdown या TOML ही रहता है।

SQLite खोज, प्रदर्शन और सत्यापन तेज़ करने के लिए सहायक data देता है।

कच्चे logs, पूरा terminal output, और पूरे chat transcripts सूचकांक या भविष्य की knowledge layer के लिए स्रोत दस्तावेज़ नहीं हैं। mustflow परियोजना में छोटे run receipts और summary documents रखता है और डिफ़ॉल्ट रूप से raw logs संग्रहित नहीं करता। यह `.mustflow/config/mustflow.toml` की `[retention]` policy और `mf check --strict` के storage checks से लागू होता है।
