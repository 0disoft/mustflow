---
title: .mustflow/docs/agent-workflow.md
description: बताता है कि agent repository में काम कैसे शुरू करता है, edit करता है, verify करता है, और wrap up करता है।
---

`.mustflow/docs/agent-workflow.md` agents के लिए repository-specific workflow का वर्णन करता है।

## इसका उपयोग कहां होता है

यदि `AGENTS.md` छोटी first-read rule file है, तो यह file उन rules को shared work policy में विस्तार देती है।

Agents इसे `AGENTS.md` के बाद पढ़ते हैं ताकि command चलाने, input स्थिरता, context compaction, edit scope, verification, failure handling, और secret handling की policy समझ सकें।

## घटक

- `Document role`: यह file किन बातों की owner है, परिभाषित करता है।
- `Authoritative documents and reading flow`: agents सबसे पहले कौन सी files पढ़ते हैं, सूचीबद्ध करता है।
- `Project context`: `.mustflow/context/INDEX.md` और task-specific context files कब पढ़नी हैं, समझाता है।
- `Pre-work checks`: agents को changes, protected paths, command intents, और relevant skills inspect करने को कहता है।
- `Input stability policy`: volatile data को required reading files के ऊपर वाले हिस्से से दूर रखता है।
- `Instruction refresh policy`: लंबी sessions में mustflow instructions कब फिर से पढ़ने हैं, परिभाषित करता है।
- `Context compaction policy`: derived recent context, mid summaries, और long summaries के boundaries और authority order समझाता है।
- `Harness contract boundary`: repository contracts को agent runtimes से अलग करता है।
- `Long-running task phases`: plan, work, verify, judge, और handoff परिभाषित करता है।
- `Verification ratchet`: agents को complete दिखने के लिए checks कमजोर करने से रोकता है।
- `Test relevance policy`: tests को current behavior contract के साथ aligned रखता है।
- `Preference interpretation policy`: `preferences.toml` से language, formatting, commit, और logging defaults कैसे लागू करने हैं, समझाता है।
- `Git behavior policy`: automatic staging, committing, और pushing disable करता है, और commit message suggestions को report content मानता है।
- `Command execution policy`: `commands.toml` में declared finite command intents ही अनुमति देता है।
- `Edit policy`: changes को directly related files तक सीमित रखता है।
- `Verification policy`: changes के बाद कौन से command intents check करने हैं, समझाता है।
- `Failure handling policy`: failed intent, working directory, exit code, और key error record करता है।
- `Security and secret handling policy`: tokens, private keys, और real environment values expose होने से रोकता है।
- `Document flow maintenance`: rules, commands, skills, या protected paths बदलने पर maintainers को कौन सी mustflow file update करनी है, बताता है।

## Command execution नीति

Executable commands के लिए source of truth `.mustflow/config/commands.toml` है।

Agents केवल ऐसे command intents चला सकते हैं जिनमें `status = "configured"`, `lifecycle = "oneshot"`, `run_policy = "agent_allowed"`, और `stdin = "closed"` हो। यदि कोई intent missing, `unknown`, `not_applicable`, `manual_only`, या `disabled` है, तो agents replacement command infer नहीं कर सकते और skipped reason report करना होगा।

Configured intents को संभव हो तो `argv` array उपयोग करना चाहिए। `mode = "shell"` और `cmd` केवल तब उपयोग करें जब shell syntax सच में चाहिए।

`server`, `watch`, `interactive`, `browser`, या `background` lifecycle वाली commands सीधे न चलाएं। Development servers, watch mode, browser UI, और background processes finite validation commands नहीं हैं।

जब `mf run <intent>` उपलब्ध हो, तो finite commands के लिए इसे प्राथमिकता दें।

`mf run` latest execution result को run receipt के रूप में `.mustflow/state/runs/latest.json` में लिखता है।
जब automation या final reports को structured evidence चाहिए, तो `mf run <intent> --json` उपयोग करें।
receipt एक execution का record है; command definition का source of truth फिर भी `commands.toml` रहता है।

`mf context --json` read-only index है जो current root के लिए पढ़ने का क्रम, command intents, capabilities, और latest run summary जल्दी दिखाता है। यह वास्तविक documents और configuration files पढ़ने का replacement नहीं है, और project test या build commands अब भी `commands.toml` के intent contract का पालन करती हैं।

`mf doctor` या `mf doctor --json` read-only diagnostic command है जो edits से पहले install state, check result, runnable command intents, और next steps को जोड़कर दिखाती है। यह files नहीं लिखती, इसलिए agents इसे first orientation के लिए उपयोग कर सकते हैं।

mustflow documents, skills, command contracts, या repository-map बनाने के नियम बदलने के बाद संभव हो तो `mf check --strict` चलाएं। यह skill documents में raw shell command blocks, `REPO_MAP.md` में volatile metadata, command output limits, retention policy, generated file sizes, raw JSONL log traces, और latest run receipt format की अतिरिक्त जांच करता है।

## इनपुट स्थिरता नीति

Shared policy इस document में और executable commands `commands.toml` में रखें।

Repeatable procedures को `.mustflow/skills/` में रखें, और हर skill document में पूरी shared policy copy न करें।

Project direction और domain promises `.mustflow/context/` में रखें। Agents को `.mustflow/context/INDEX.md` केवल task-specific context चाहिए होने पर पढ़ना चाहिए, फिर केवल selected context files पढ़नी चाहिए।

Context files direct user instructions, current code, tests, command contracts, और configured policies से कम authority रखती हैं। यदि `DESIGN.md` मौजूद है, तो UI work के लिए design tokens को `.mustflow/context/` में duplicate करने के बजाय इसे optional external visual design anchor के रूप में उपयोग करें।

Repository navigation map को इस document को बढ़ाने के बजाय generated `REPO_MAP.md` में रखें। `REPO_MAP.md` पूरी file list के बजाय anchor-file map है; यह required पढ़ने के क्रम का हिस्सा नहीं है और केवल broad navigation चाहिए होने पर पढ़ा जाना चाहिए।

Generated times, hashes, file counts, recent-change summaries, या long logs जैसे volatile values को इस file के ऊपर वाले हिस्से में न रखें।

`.mustflow/` के नीचे full chat transcripts, full terminal output, या raw JSONL event logs जोड़ते न रहें। Execution results को छोटे run receipts के रूप में रखें, और knowledge files को raw logs के बजाय sources वाली summaries के रूप में रखें।

## निर्देश refresh

Long sessions task start पर loaded instructions को कमजोर कर सकती हैं। `agent-workflow.md` इसे checkpoint problem मानता है, repository में turn counters लिखने का कारण नहीं।

Agents को first edit से पहले, command execution से पहले जब current command intent के पास fresh command refresh न हो, context compaction के बाद, `AGENTS.md` या `.mustflow/**` edit करने के बाद, roots switch करने के बाद, और final report से पहले mustflow instructions refresh करनी चाहिए।

सटीक file set `.mustflow/config/mustflow.toml` के `[refresh.levels]` से आता है।

## Context compaction नीति

Long sessions के दौरान बनी compacted summaries derived helper memory हैं। `agent-workflow.md` के अनुसार वे current user instructions, current code और config, command contracts, और run receipts से कम authority रखती हैं।

Project में hidden chain of thought, secrets, या unbounded full chat transcripts store न करें। Shared project knowledge को केवल source-linked decisions, investigations, या handoff summaries के रूप में promote करना चाहिए।

## Harness contract सीमा

mustflow autonomous agent runtime नहीं है। यह repository-local contracts देता है जिन्हें agent harnesses पढ़ सकते हैं।

- Brain contract: `AGENTS.md`, `agent-workflow.md`, और skill documents।
- Hands contract: `commands.toml`, `mf run`, और finite command lifecycles।
- Session contract: bounded run receipts, source-linked summaries, और compact handoff records।
- Judge contract: original goals, acceptance criteria, changed files, command contracts, और receipts।

## लंबे task phases

Long-running work को planning, work, verification, judging, और handoff अलग-अलग रखने चाहिए। Judge phase को worker के completion claim को अपने आप accept नहीं करना चाहिए। यह original criteria, changed files, और run receipts check करता है।

## सत्यापन ratchet

Workflow task को complete दिखाने के लिए validation कमजोर करने से मना करता है। Agents failing tests delete नहीं कर सकते, explanation के बिना assertions loosen नहीं कर सकते, relevant command intents skip नहीं कर सकते, failure से बचने के लिए command intent status नहीं बदल सकते, और implementation के बाद acceptance criteria rewrite नहीं कर सकते।

Tests तब बदल सकते हैं जब intended behavior बदल गया हो या existing tests गलत हों, लेकिन final report में कारण समझाना होगा।

## Test relevance नीति

Tests current behavior contract validate करते हैं। Agents केवल इसलिए removed behavior reintroduce नहीं कर सकते कि old tests उसे expect करते हैं, और intentionally removed features के tests preserve नहीं करने चाहिए।

जब tests remove हों या assertions कमजोर हों, तो current-contract cleanup और validation avoidance में अंतर रखें। Relevance अनिश्चित हो तो उसे delete करने के बजाय stale candidate report करें।

## Preference interpretation नीति

`.mustflow/config/preferences.toml` direct user instructions और existing local style से कम authority वाले repository-level defaults रखता है।

Agents इस file को whole files reformat करने, unrelated files बदलने, या task reason के बिना existing log strings translate करने का कारण नहीं बना सकते।

`preserve_existing` का अर्थ है कि agent visible existing convention का पालन करता है। नई repository में जहां कोई convention दिखाई नहीं देती, agent हर field का `fallback` value उपयोग करता है।

User की chat language को code comment, log, error message, या commit message language अपने आप तय नहीं करनी चाहिए।

## Git behavior नीति

`git.auto_stage`, `git.auto_commit`, और `git.auto_push` डिफ़ॉल्ट रूप से `false` हैं।

Explicit user request के बिना agents stage, commit, amend, rebase, reset, push, या किसी भी तरह Git state या history change नहीं कर सकते।

Commit message suggestion final report का हिस्सा है, Git execution permission नहीं। जब files changed हों और commit suggestions enabled हों, agents commit message suggest कर सकते हैं, लेकिन यह imply नहीं कर सकते कि commit बनाया गया है।
