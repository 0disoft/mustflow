---
title: .mustflow/skills/INDEX.md
description: ऐसा index जो agents को बताता है कि किसी task के लिए कौन सा skill document पढ़ना है।
---

`.mustflow/skills/INDEX.md` agents को repeatable work शुरू करने से पहले सही skill document चुनने में मदद करता है।

## इसका उपयोग कहां होता है

Shared rules और command contract पढ़ने के बाद, agents इस index का उपयोग तब करते हैं जब मौजूदा task किसी repeatable procedure से मेल खाता है।

इस file को लंबे skill bodies copy नहीं करने चाहिए। यह situations, skill paths, और relevant command intents को जोड़ती है।

## भूमिका

- skill names और उन्हें कब उपयोग करना है, यह सूचीबद्ध करता है।
- code review, documentation updates, failure triage, और test maintenance जैसे recurring tasks को link करता है।
- हर skill को जिन command intent names की ज़रूरत हो सकती है, उन्हें सूचीबद्ध करता है।
- unused repository-specific skills को हटाने या inactive mark करने की अनुमति देता है।

## लिखने के नियम

index को छोटा और जल्दी scan करने योग्य रखें।

लंबी procedures हर `SKILL.md` में रखें। index में हर skill के लिए केवल name, purpose, trigger condition, और relevant command intents होने चाहिए।

## Table columns

- `Situation`: task condition जो skill trigger करे।
- `Document`: procedure रखने वाले `SKILL.md` का path।
- `Command intents`: `commands.toml` से intent names जिन्हें skill check कर सकती है।

Skill जोड़ते समय उसे यहां link करें और command intent names को skill frontmatter के साथ aligned रखें।
