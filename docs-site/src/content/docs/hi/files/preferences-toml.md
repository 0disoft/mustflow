---
title: preferences.toml
description: agent language, style, Git reporting, और documentation के लिए repository-level defaults घोषित करता है।
---

`.mustflow/config/preferences.toml` agent work के लिए repository-level defaults घोषित करता है।

यह file highest authority नहीं है। Direct user instructions, higher-level instructions, scoped `AGENTS.md` files, existing local style, और command contract इससे ऊपर रहते हैं।

## इसका उपयोग कहां होता है

- response language, documentation language, code comments, logs, और user-facing text के defaults परिभाषित करता है।
- compaction summaries और handoff summaries जैसी derived memory के defaults परिभाषित करता है।
- project `profile`, mustflow document locale, और agent report language को अलग रखता है।
- `[product_i18n]` में product localization behavior केवल ज़रूरत होने पर record करता है।
- नई repositories के लिए fallback values घोषित करता है जहां कोई existing convention दिखाई नहीं देती।
- automatic staging, committing, और pushing को डिफ़ॉल्ट रूप से disabled रखता है।
- commit message suggestions को वास्तविक commit की permission से अलग करता है।
- `mf check` को validate करने के लिए machine-checkable preference file देता है।
- `mf help preferences` को summarize करने के लिए source file देता है।

## मूल रूप

```toml
schema_version = "1"

[project]
convention_mode = "bootstrap"
profile = "minimal"

[language]
agent_response = "ko"
docs = "ko"

[language.code_comments]
mode = "preserve_existing"
fallback = "en"

[language.logs]
mode = "preserve_existing"
fallback = "en"

[language.memory]
summary = "agent_response"
fallback = "en"
preserve_code = true
preserve_paths = true
preserve_error_output = true

[git]
auto_stage = false
auto_commit = false
auto_push = false

[git.commit_message]
suggest = "when_changes_made"
style = "conventional"
language = "preserve_existing"
language_when_missing = "en"
max_suggestions = 2

[reporting.commit_suggestion]
enabled = true
when = "files_changed"
source = "git.commit_message"
```

## Profile और locale

`project.profile` project type है, country या language नहीं। default `minimal` है, और built-in profiles `minimal`, `oss`, `team`, `product`, और `library` हैं।

`language.agent_response` agent final reports की default language है।

`language.docs` mustflow document locale है।

user-facing product text की source language और target locales `[product_i18n]` में रहते हैं।

```toml
[product_i18n]
enabled = true
source_locale = "en"
target_locales = ["en-US", "ko-KR"]
fallback_locale = "en"
locale_tag_format = "bcp47"
user_facing_text_policy = "externalize"
hardcoded_user_facing_strings = "avoid"
translation_policy = "update_source_mark_targets_stale"
do_not_translate = ["identifiers", "log_keys", "error_codes", "metric_names", "api_field_names"]
```

Agents को user's chat language से product text language infer नहीं करनी चाहिए। source locale बदलने पर target translations को policy के अनुसार update करना या review-needed के रूप में report करना चाहिए।

## Memory summary language

`language.memory.summary` compaction summaries, handoff summaries, और long-term memory candidates जैसी derived memory की language नियंत्रित करता है।

default `agent_response` है, जो agent final report language का पालन करता है। Projects `docs`, `preserve_existing`, या `ko`, `en-US`, या `zh-Hans` जैसा explicit language tag भी उपयोग कर सकते हैं।

`fallback` backup language है जब `summary` किसी दूसरी preference या existing convention की ओर इशारा करता है लेकिन concrete language resolve नहीं हो पाती।

`preserve_code`, `preserve_paths`, और `preserve_error_output` summary language चाहे जो हो, code, paths, और error output को उनके original form में रखते हैं। Korean summary को function names, file paths, या error codes को मनमाने ढंग से translate नहीं करना चाहिए।

Direct user instructions और current scoped `AGENTS.md` इस preference से ऊपर रहते हैं।

## Mode और fallback

`preserve_existing` का अर्थ है कि agent existing files inspect करे और local convention सुरक्षित रखे।

जब कोई existing convention दिखाई नहीं देती, जैसे नई repository में, तो agent हर field का `fallback` value उपयोग करता है। user's chat language को code comment, log, error message, या commit message language अपने आप तय नहीं करनी चाहिए।

default template code comments, logs, और commit messages के लिए English fallbacks उपयोग करता है। इससे public collaboration, search, operations tooling, और external contributors को मदद मिलती है।

## Git और commit messages

`git.auto_stage`, `git.auto_commit`, और `git.auto_push` डिफ़ॉल्ट रूप से `false` हैं।

Commit message suggestion final report का हिस्सा है, Git चलाने की permission नहीं। यदि files बदली हैं और `reporting.commit_suggestion.enabled = true` है, तो agent commit message suggest कर सकता है। उसे यह imply नहीं करना चाहिए कि commit बनाया गया है, और explicit user request के बिना commit नहीं करना चाहिए।

जब कई logical changes मिले हुए हों, तो agent सब कुछ एक message में force करने के बजाय `max_suggestions` तक split commits suggest कर सकता है।

## सत्यापन नियम

जब यह file मौजूद हो, `mf check` सत्यापित करता है कि:

- main preference values strings हैं।
- `mode`, `fallback`, और `rule` values strings हैं।
- `[language.memory]` के `summary` और `fallback` strings हैं, जबकि `preserve_code`, `preserve_paths`, और `preserve_error_output` booleans हैं।
- `auto_stage`, `auto_commit`, `auto_push`, `avoid_drive_by_refactors`, और `include_sensitive_data` booleans हैं।
- `git.commit_message.max_suggestions` positive integer है।
- `reporting.commit_suggestion.enabled` boolean है।
- `docs.update_when` string array है।
- `project.profile` built-in profile values में से एक है।
- `[product_i18n]` मौजूद होने पर locale fields, translation policy, और do-not-translate lists valid basic shapes उपयोग करती हैं।
