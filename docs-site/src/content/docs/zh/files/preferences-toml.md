---
title: preferences.toml
description: 声明 agent 语言、风格、Git 报告和文档的仓库级默认值。
---

`.mustflow/config/preferences.toml` 声明 agent 工作的仓库级默认值。

这个文件不是最高权威。用户的直接指令、更高层级指令、有作用域的 `AGENTS.md` 文件、现有本地风格和命令合同优先。

## 使用位置

- 定义回复语言、文档语言、代码注释、日志和用户可见文本的默认值。
- 定义压缩摘要和交接摘要等派生记忆的默认值。
- 区分项目 `profile`、mustflow 文档语言和 agent 报告语言。
- 仅在需要时在 `[product_i18n]` 中记录产品本地化行为。
- 为看不到现有约定的新仓库声明备用值。
- 默认禁用自动暂存、提交和推送。
- 将提交消息建议与实际提交权限分开。
- 为 `mf check` 提供可由机器检查的偏好文件。
- 为 `mf help preferences` 提供可概述的源文件。

## 基本结构

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

## 项目类型与语言

`project.profile` 是项目类型，不是国家或语言。默认值为 `minimal`，内置 profile 包括 `minimal`、`oss`、`team`、`product` 和 `library`。

`language.agent_response` 是 agent 最终报告的默认语言。

`language.docs` 是 mustflow 文档语言。

用户可见产品文本的源语言和目标语言放在 `[product_i18n]` 中。

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

agent 不得根据用户聊天语言推断产品文本语言。源语言变化时，应根据策略更新目标翻译，或报告它们需要审阅。

## 记忆摘要语言

`language.memory.summary` 控制压缩摘要、交接摘要和长期记忆候选等派生记忆的语言。

默认值是 `agent_response`，即跟随 agent 最终报告语言。项目也可以使用 `docs`、`preserve_existing`，或 `ko`、`en-US`、`zh-Hans` 等明确语言标签。

当 `summary` 指向其他偏好或现有约定，但无法解析出具体语言时，`fallback` 是备用语言。

无论摘要语言是什么，`preserve_code`、`preserve_paths` 和 `preserve_error_output` 都会保留代码、路径和错误输出的原始形式。中文摘要不应随意翻译函数名、文件路径或错误代码。

用户直接指令和当前作用域内的 `AGENTS.md` 优先于该偏好。

## 模式与备用值

`preserve_existing` 表示 agent 应检查现有文件并保留本地约定。

当看不到现有约定时，例如在新仓库中，agent 使用每个字段的 `fallback` 值。用户聊天语言不得自动决定代码注释、日志、错误消息或提交消息语言。

默认模板对代码注释、日志和提交消息使用英文备用值。这更利于公开协作、搜索、运维工具和外部贡献者。

## Git 与提交消息

`git.auto_stage`、`git.auto_commit` 和 `git.auto_push` 默认都是 `false`。

提交消息建议是最终报告的一部分，不代表获得运行 Git 的权限。如果文件已变更且 `reporting.commit_suggestion.enabled = true`，agent 可以建议提交消息。它不得暗示已经创建提交，也不得在没有用户明确请求的情况下提交。

当多个逻辑改动混在一起时，agent 可以建议最多 `max_suggestions` 个拆分提交，而不是强行把所有内容放进一个消息。

## 验证规则

当这个文件存在时，`mf check` 会验证：

- 主要偏好值是字符串。
- `mode`、`fallback` 和 `rule` 值是字符串。
- `[language.memory]` 的 `summary` 和 `fallback` 是字符串，而 `preserve_code`、`preserve_paths` 和 `preserve_error_output` 是布尔值。
- `auto_stage`、`auto_commit`、`auto_push`、`avoid_drive_by_refactors` 和 `include_sensitive_data` 是布尔值。
- `git.commit_message.max_suggestions` 是正整数。
- `reporting.commit_suggestion.enabled` 是布尔值。
- `docs.update_when` 是字符串数组。
- `project.profile` 是内置 profile 值之一。
- 当 `[product_i18n]` 存在时，语言字段、翻译策略和不可翻译列表使用有效的基本结构。
