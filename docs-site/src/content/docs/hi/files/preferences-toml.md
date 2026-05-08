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
- version impact checks को record करता है, लेकिन release या version bump की permission नहीं देता।
- कम जोखिम वाले बदलावों में full verification suite से बचना है या नहीं, यह बताता है।
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

[release.versioning]
impact_check = true
suggest_bump = true
auto_bump = false
require_user_confirmation = true
sync_template_version = true
sync_docs_examples = true
sync_tests = true

[verification.selection]
strategy = "risk_based"
prefer_related_tests = true
skip_docs_only_full_test = true
skip_low_risk_code_full_test = true
skip_translation_only_full_test = true
skip_copy_only_full_test = true
report_skipped = true
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

ये values repository preferences हैं, permissions नहीं। ये direct user instructions, `commands.toml` के command contracts, या `mustflow.toml` की approval policy से ऊपर नहीं हैं। `git.auto_commit = true` push permission नहीं देता, और `mf init --set` केवल `git.auto_push=false` set कर सकता है; यह `git.auto_push=true` enable नहीं कर सकता।

Commit message suggestion final report का हिस्सा है, Git चलाने की permission नहीं। यदि files बदली हैं और `reporting.commit_suggestion.enabled = true` है, तो agent commit message suggest कर सकता है। उसे यह imply नहीं करना चाहिए कि commit बनाया गया है, और explicit user request के बिना commit नहीं करना चाहिए।

`git.commit_message.style` में `conventional`, `descriptive`, या `gitmoji` दिया जा सकता है। `gitmoji` style message की शुरुआत में emoji जोड़ता है और उसे conventional-style suggestion की तरह readable रखता है, जैसे `✨ feat: add dashboard setting`।

`git.commit_message.language` में `preserve_existing`, `agent_response`, `docs`, या `ja`, `de`, `pt-BR` जैसा locale tag दिया जा सकता है।

जब कई logical changes मिले हुए हों, तो agent सब कुछ एक message में force करने के बजाय `max_suggestions` तक split commits suggest कर सकता है।

## Release versioning

`[release.versioning]` तय करता है कि code, templates, schemas, command behavior, package metadata, documentation examples, या installation output बदलने पर agent version impact check करके report करे या नहीं।

ये values preferences हैं, release permissions नहीं। `impact_check = true` agent से यह report करवाता है कि diff package या template version change मांगता है या नहीं। `suggest_bump = true` clear evidence होने पर patch, minor, या major suggestion की अनुमति देता है।

`auto_bump = false` package और template version files को untouched रखता है, जब तक user explicit version bump या release-preparation task न मांगे। `require_user_confirmation = true` का मतलब है कि normal code changes में agent चुपचाप versions edit नहीं करेगा।

Approved version change के समय `sync_template_version`, `sync_docs_examples`, और `sync_tests` agent को package metadata, template manifests, documentation examples, और tests को उसी change में aligned रखने को कहते हैं।

ये preferences यह नहीं बतातीं कि repository अपनी version कहां रखती है। Version suggest या edit करने से पहले agent को language- या framework-specific version source खोजना ही होगा।

## सत्यापन चयन

`[verification.selection]` agent को configured checks में से क्या चुनना है, यह guide करता है। यह command चलाने की permission नहीं देता; command execution अब भी `.mustflow/config/commands.toml` पर निर्भर करता है।

`strategy = "risk_based"` बदलाव के risk के अनुसार verification scope चुनने को कहता है। `prefer_related_tests = true` का मतलब है कि repository related-test command intent देती है तो सीधे संबंधित tests को प्राथमिकता दें।

`skip_docs_only_full_test`, `skip_translation_only_full_test`, और `skip_copy_only_full_test` non-code बदलावों के लिए हैं। `skip_low_risk_code_full_test` केवल तब लागू होता है जब code बदलाव public behavior, config, schemas, security, migrations या दूसरे high-risk surfaces को प्रभावित नहीं करता। ये settings केवल full suite छोड़ती हैं; इसका मतलब सारी verification छोड़ना नहीं है।

`report_skipped = true` होने पर final report में बताना चाहिए कि कौन-सी broad checks छोड़ी गईं और क्यों।

## सत्यापन नियम

जब यह file मौजूद हो, `mf check` सत्यापित करता है कि:

- main preference values strings हैं।
- `mode`, `fallback`, और `rule` values strings हैं।
- `[language.memory]` के `summary` और `fallback` strings हैं, जबकि `preserve_code`, `preserve_paths`, और `preserve_error_output` booleans हैं।
- `auto_stage`, `auto_commit`, `auto_push`, `avoid_drive_by_refactors`, और `include_sensitive_data` booleans हैं।
- `git.commit_message.style` `conventional`, `descriptive`, या `gitmoji` में से एक है।
- `git.commit_message.max_suggestions` positive integer है।
- `reporting.commit_suggestion.enabled` boolean है।
- `[release.versioning]` fields booleans हैं।
- `[verification.selection]` allowed strategy value और boolean skip/report flags उपयोग करता है।
- `docs.update_when` string array है।
- `project.profile` built-in profile values में से एक है।
- `[product_i18n]` मौजूद होने पर locale fields, translation policy, और do-not-translate lists valid basic shapes उपयोग करती हैं।
