---
title: AGENTS.md
description: एजेंटों द्वारा सबसे पहले पढ़ी जाने वाली छोटी root work-rule entrypoint फ़ाइल।
---

`AGENTS.md` वह root entry point है जिसे LLM agents किसी repository में प्रवेश करते समय सबसे पहले पढ़ते हैं।

## इसका उपयोग कहां होता है

`mf init` इस फ़ाइल को target repository root पर बनाता है, क्योंकि agents को repository में आते ही यह तुरंत मिलनी चाहिए।

यह mustflow document flow का प्रवेश बिंदु है। विस्तृत policy `.mustflow/docs/agent-workflow.md` में रहती है, executable commands `.mustflow/config/commands.toml` में, repository-level preferences `.mustflow/config/preferences.toml` में, task-specific project context `.mustflow/context/` में, और दोहराई जा सकने वाली procedures `.mustflow/skills/` में रहती हैं।

## भूमिका

- mustflow document flow शुरू करता है।
- पहला पढ़ने का क्रम परिभाषित करता है।
- केवल पूर्ण नियम रखता है, जैसे command guessing न करना, मौजूदा बदलाव सुरक्षित रखना, और secrets संभालना।
- विस्तृत workflow को `.mustflow/docs/agent-workflow.md` की ओर भेजता है।
- executability को `.mustflow/config/commands.toml` में command intent status पर निर्भर बनाता है।
- agent को `.mustflow/skills/INDEX.md` जांचने और affected scope edit करने से पहले matching
  `SKILL.md` पढ़ने के लिए कहता है।
- बताता है कि `mf doctor` ज़रूरत पड़ने पर edit से पहले चलाया जाने वाला read-only diagnostic command है।
- बताता है कि `mf context --json` read-only context index है, वास्तविक documents पढ़ने का replacement नहीं।
- लंबे या संवेदनशील tasks को `mustflow.toml` के `[budget]`, `[approval]`, और `[isolation]` की ओर भेजता है।

## पढ़ने का क्रम

```text
AGENTS.md
.mustflow/docs/agent-workflow.md
.mustflow/config/mustflow.toml
.mustflow/config/commands.toml
.mustflow/config/preferences.toml  # when present
.mustflow/skills/INDEX.md
.mustflow/context/INDEX.md  # only when task-specific context is needed
.mustflow/context/<name>.md  # only when selected by the context index
.mustflow/skills/<name>/SKILL.md
REPO_MAP.md  # only when broad navigation is needed
```

## Frontmatter metadata

```yaml
mustflow_doc: agents.root
locale: en
canonical: true
revision: 4
```

- `mustflow_doc`: mustflow के भीतर स्थिर document identifier।
- `locale`: document language।
- `canonical`: क्या यह document canonical source है।
- `revision`: canonical document revision।

English template `AGENTS.md` canonical source है। Localized template files अपना locale उपयोग करती हैं और `canonical: false` सेट करती हैं।

## लिखने के नियम

`AGENTS.md` repository root पर रहता है ताकि agents इसे जल्दी खोज सकें।

`AGENTS.md` में वास्तविक test या build commands, repository trees, recent changes, या generated timestamps hard-code न करें। ये details input स्थिरता घटाती हैं और `commands.toml`, `REPO_MAP.md`, या संबंधित source files में होनी चाहिए।

भाषा, comments, commit messages, documentation, logs, और formatting के defaults `.mustflow/config/preferences.toml` में रहते हैं, `AGENTS.md` में लंबे prose के रूप में नहीं।

`AGENTS.md` को केवल skill selection obligation बतानी चाहिए। Detailed selection rules
`.mustflow/skills/INDEX.md` और `.mustflow/docs/agent-workflow.md` में रहती हैं।

Autonomous loops, worker fleets, persona systems, और long-running harnesses को `AGENTS.md` से शुरू नहीं करना चाहिए। यदि कोई repository ऐसी surfaces चाहती है, तो उन्हें mustflow configuration और supporting documents में स्पष्ट रूप से घोषित करना चाहिए।
