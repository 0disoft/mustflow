---
title: REPO_MAP.md
description: मौजूदा mustflow root में navigation करने वाले agents के लिए anchor-file-based map।
---

`REPO_MAP.md` मौजूदा mustflow root पर optional generated file है।

यह पूरी file listing नहीं है। यह `AGENTS.md`, `README.md`, `DESIGN.md`, `package.json`, `SKILL.md`, `.mustflow/context/INDEX.md`, और language-specific configuration files जैसी महत्वपूर्ण anchor files खोजता है ताकि agents जान सकें कि मौजूदा root में पहले कहां देखना है।

root का अर्थ हमेशा ठीक एक Git repository नहीं होता। यदि मौजूदा mustflow root ऐसा workspace है जिसमें independent nested repositories हैं, तो वही `REPO_MAP.md` उन repositories के limited entrypoints शामिल कर सकता है।

## इसका उपयोग कहां होता है

Agents इसे केवल तब पढ़ते हैं जब उन्हें current mustflow root के लिए broad navigation चाहिए। हर छोटे बदलाव के लिए यह आवश्यक नहीं है।

Root navigation इस generated file में रहता है ताकि `AGENTS.md` और `.mustflow/docs/agent-workflow.md` छोटे रह सकें।

## भूमिका

- current root की प्रमुख files और directories क्यों मौजूद हैं, इसका सार देता है।
- agent को पहले inspect करनी पड़ने वाली जगहों को कम करता है।
- agents को safe change scope चुनने में मदद करता है।
- `AGENTS.md` को छोटा रखता है।
- repository navigation को complete file listing से अलग रखता है। हर file चाहिए हो तो `git ls-files` या editor उपयोग करें।
- यदि current root workspace है, तो nested independent repositories के internals बताने के बजाय केवल entrypoints सूचीबद्ध करता है।

## घटक

- Opening sentence: बताती है कि यह anchor-file-based navigation map है, पूरी file listing नहीं।
- How to use: पूरी सूची चाहिए होने पर agents को `git ls-files` की ओर भेजता है।
- Priority anchors: `AGENTS.md`, `.mustflow/config/*.toml`, `.mustflow/context/INDEX.md`, और `.mustflow/skills/INDEX.md` जैसी first-read files दिखाता है।
- Directory anchors: `README.md`, `AGENTS.md`, `package.json`, `SKILL.md`, और tool configuration files जैसी महत्वपूर्ण files को directory के अनुसार group करता है।
- Nested repositories: workspace roots के नीचे मिली independent repositories के लिए केवल `AGENTS.md`, `REPO_MAP.md`, context index files, और command-contract files जैसे entrypoints दिखाता है।
- Generated files: बताता है कि `REPO_MAP.md` generated है और इसे hand-edit नहीं करना चाहिए।
- Exclusion rules: dependencies, build outputs, caches, और बड़ी files को बाहर रखता है।

## Generate करने के नियम

- इसे `repo_map` command intent या `mf map` जैसी command से generate करें।
- संभव हो तो `git ls-files` और file-system anchor discovery दोनों उपयोग करें।
- default depth 3 है। इसका अर्थ full tree depth नहीं है; यह non-priority anchor files कितनी गहराई तक खोजी जाएं, उसे सीमित करता है।
- `node_modules`, `dist`, `build`, `.git`, caches, और large outputs को बाहर रखें।
- file contents का summary न बनाएं।
- generated time, hashes, या file counts जैसे volatile values को ऊपर न रखें।
- हर source file सूचीबद्ध न करें। केवल वे anchor files शामिल करें जो repository navigation में मदद करती हैं।
- agent behavior interpretation के लिए आवश्यक configuration files, जैसे `.mustflow/config/preferences.toml`, को priority anchors के रूप में शामिल करें।
- मौजूद होने पर `.mustflow/context/INDEX.md` और `.mustflow/context/PROJECT.md` शामिल करें, लेकिन हर future domain context file को डिफ़ॉल्ट रूप से expand न करें।
- मौजूद होने पर `DESIGN.md` को optional external visual-design anchor के रूप में शामिल करें। इसे `mf map` के हिस्से के रूप में create न करें।
- nested repositories सूचीबद्ध होने पर भी remote URLs, branch names, recent change state, command lists, या automatic summaries डिफ़ॉल्ट रूप से शामिल न करें।

## लिखने के नियम

पहली line में यह कहना चाहिए कि यह current mustflow root के लिए navigation map है, complete tree नहीं।

```md
# REPO_MAP.md

This file is an anchor-file-based navigation map for the current mustflow root, not a full file listing.
```

structure बदलने पर इसे लंबे hand-written document की तरह maintain करने के बजाय regenerate करें।
