---
title: .mustflow/skills/INDEX.md
description: किसी task के लिए agent को सही skill document तक ले जाने वाला index.
---

`.mustflow/skills/INDEX.md` agents को repeatable tasks शुरू करने से पहले सही skill document चुनने में मदद करता है।

## उपयोग

Shared rules और command contract पढ़ने के बाद, agents इस index को तब देखते हैं जब task किसी predefined procedure से match करता है।

इस file में पूरी procedure details नहीं होनी चाहिए। यह compact route fields को skill paths से जोड़ता है: trigger, required input, edit scope, risk, verification intents और expected output।
`mf check --strict` इन routes की referenced `SKILL.md` files से तुलना करता है ताकि missing skill documents, unlisted skills, unknown command intents, command-intent drift और route-table shape drift दिख सके।

## Selection behavior

Agents इस index को task start और पहली edit से पहले use करते हैं। वे user request और expected changed files को listed triggers से compare करते हैं, फिर matching `SKILL.md` पढ़कर उसी scope में edit करते हैं।

Skill use हो, या कोई plausible skill जानबूझकर skip की जाए, तो agents को अगले user update या final report में छोटी selection note देनी चाहिए। यह note conversation report में रहे, versioned worklog file में नहीं।

अगर task के दौरान command failure, test contract change या documentation change जैसी नई condition आए, तो agents को रुककर नई matching skill पढ़नी चाहिए।

अगर कोई trigger लागू नहीं होता, तो agents skill invent नहीं करते। वे `AGENTS.md`, `.mustflow/docs/agent-workflow.md` और `.mustflow/config/commands.toml` के साथ continue करते हैं।

## Role and responsibilities

- Available skills list करता है और precise triggers define करता है।
- हर route के लिए required input, edit scope, risk और expected output बताता है।
- हर skill द्वारा referenced command intents बताता है।
- Routes compact रखता है ताकि procedure details हर `SKILL.md` में रहें।

## Authoring guidelines

Index concise और scannable रहना चाहिए।

Procedure details individual `SKILL.md` files में रहनी चाहिए। Index में केवल वे route fields होने चाहिए जो agent को skill पढ़ने और evidence report करने का निर्णय लेने में मदद करें।

## Table structure

- **Trigger**: task condition जिसके कारण skill पढ़नी चाहिए।
- **Skill Document**: corresponding `SKILL.md` का path।
- **Required Input**: skill apply करने से पहले needed evidence या request data।
- **Edit Scope**: files या surface जिसे skill guide कर सकती है।
- **Risk**: मुख्य failure mode जिसे route control करता है।
- **Verification Intents**: `commands.toml` intent names जो relevant हो सकते हैं।
- **Expected Output**: skill use करने के बाद expected report shape।

नई skill add करते समय, उसकी route यहां add करें और verification intent names को skill frontmatter के साथ synchronized रखें।

## उदाहरण: performance measurement integrity

`performance-measurement-integrity-review` counters, timers, histograms, cache ratios, benchmark gates, CPU PMU evidence, communication IPC outcomes और cross-process latency के लिए adjunct route है। यह event, denominator, clock domain, concurrent snapshot, comparable workload और telemetry safety boundary को स्पष्ट रखता है।

यह `performance-budget-check` को complement करता है: budget skill optimization की उपयोगिता देखती है, measurement skill निष्कर्ष के लिए उपयोग किए गए numbers की विश्वसनीयता देखती है। दोनों profiler, benchmark या production query को command authority नहीं बनाते।
