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
- 跟踪版本影响检查，但不授予发布或版本提升权限。
- 控制低风险变更是否可以避开完整验证集合。
- 指导 agent 在不削弱必要验证的前提下，应该多积极地编写新测试。
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

[testing.authoring]
new_test_policy = "evidence_required"
prefer_existing_tests = true
require_new_test_rationale = true
```

## 项目类型与语言

`project.profile` 是项目类型，不是国家或语言。默认值为 `minimal`，内置 profile 包括 `minimal`、`patterns`、`oss`、`team`、`product` 和 `library`。

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

这些值是仓库偏好设置，不是权限。它们不会覆盖用户的直接指示、`commands.toml` 中的命令合同，也不会覆盖 `mustflow.toml` 中的审批策略。`git.auto_commit = true` 不表示获得推送权限，且 `mf init --set` 只能设置 `git.auto_push=false`，不能启用 `git.auto_push=true`。

提交消息建议是最终报告的一部分，不代表获得运行 Git 的权限。如果文件已变更且 `reporting.commit_suggestion.enabled = true`，agent 可以建议提交消息。它不得暗示已经创建提交，也不得在没有用户明确请求的情况下提交。

`git.commit_message.style` 可以使用 `conventional`、`descriptive` 或 `gitmoji`。`gitmoji` 会在消息前添加 emoji，同时保留 conventional 风格的可读形式，例如 `✨ feat: add dashboard setting`。

`git.commit_message.language` 可以使用 `preserve_existing`、`agent_response`、`docs`，也可以直接指定 `ja`、`de`、`pt-BR` 等 locale tag。

当多个逻辑改动混在一起时，agent 可以建议最多 `max_suggestions` 个拆分提交，而不是强行把所有内容放进一个消息。

## 发布版本管理

`[release.versioning]` 控制当代码、模板、schema、命令行为、包元数据、文档示例或安装输出发生变化时，agent 是否应检查并报告版本影响。

这些值是指导版本影响报告和版本文件编辑的偏好设置。`impact_check = true` 要求 agent 报告当前差异是否看起来需要包版本或模板版本变更。`suggest_bump = true` 允许在证据清楚时建议 patch、minor 或 major。

`auto_bump = true` 允许 agent 在定位版本来源后应用合适的包版本或模板版本升级，除非用户直接指令、宿主安全规则或审批策略阻止。`auto_bump = false` 会保持包和模板版本文件不变，除非用户请求提升版本或准备发布。`require_user_confirmation = true` 表示 agent 在编辑版本前必须询问；`false` 表示自动升级开启时不再增加额外确认步骤。

版本发生变更时，`sync_template_version`、`sync_docs_examples` 和 `sync_tests` 要求 agent 在同一改动中同步包元数据、模板 manifest、文档示例和测试。

这些偏好不会说明仓库把版本存放在哪里。agent 在建议或编辑版本前，仍必须找到符合该语言或框架的实际版本来源。

## 验证选择

`[verification.selection]` 指导 agent 在已配置的检查中选择哪些检查。它不授予命令执行权限；命令执行仍由 `.mustflow/config/commands.toml` 决定。

`strategy = "risk_based"` 表示根据变更风险调整验证范围。`prefer_related_tests = true` 表示当仓库提供相关测试 command intent 时，优先使用直接相关的测试。

`skip_docs_only_full_test`、`skip_translation_only_full_test` 和 `skip_copy_only_full_test` 面向非代码变更。`skip_low_risk_code_full_test` 仅在代码变更不影响公开行为、配置、schema、安全、迁移或其他高风险表面时适用。这些设置只跳过完整验证集合，不表示跳过所有验证。

`report_skipped = true` 时，最终报告应说明跳过了哪些更广的检查以及原因。

## 测试编写

`[testing.authoring]` 指导 agent 是创建新测试，还是先处理现有覆盖。它与 `[verification.selection]` 分开：验证选择决定考虑哪些已配置检查，而测试编写偏好控制多容易添加新的测试文件或用例。

`new_test_policy = "evidence_required"` 是默认值。它表示新测试应有行为合同依据，例如公开行为变化、回归风险、配置或 schema 影响，或安全/数据路径风险。

`new_test_policy = "manual_approval"` 表示除非用户直接要求测试，否则添加新测试前需要确认。`new_test_policy = "broad"` 表示当测试能说明重要行为时，可以更主动地编写新测试。

`prefer_existing_tests = true` 表示创建新文件或用例前，应先更新附近的现有测试。`require_new_test_rationale = true` 表示最终报告应说明每个新测试为什么必要。

这些偏好不能用来跳过必要验证、删除有效测试或放宽断言。

## 验证规则

当这个文件存在时，`mf check` 会验证：

- 主要偏好值是字符串。
- `mode`、`fallback` 和 `rule` 值是字符串。
- `[language.memory]` 的 `summary` 和 `fallback` 是字符串，而 `preserve_code`、`preserve_paths` 和 `preserve_error_output` 是布尔值。
- `auto_stage`、`auto_commit`、`auto_push`、`avoid_drive_by_refactors` 和 `include_sensitive_data` 是布尔值。
- `git.commit_message.style` 必须是 `conventional`、`descriptive` 或 `gitmoji` 之一。
- `git.commit_message.max_suggestions` 是正整数。
- `reporting.commit_suggestion.enabled` 是布尔值。
- `[release.versioning]` 字段是布尔值。
- `[verification.selection]` 必须使用允许的策略值，以及布尔类型的跳过/报告标志。
- `[testing.authoring]` 必须使用允许的新测试策略和布尔类型的编写标志。
- `docs.update_when` 是字符串数组。
- `project.profile` 是内置 profile 值之一。
- 当 `[product_i18n]` 存在时，语言字段、翻译策略和不可翻译列表使用有效的基本结构。
