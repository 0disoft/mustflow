---
title: i18n.toml
description: 用于跟踪权威文档和翻译状态的模板元数据。
---

`i18n.toml` 跟踪 mustflow 模板文档的权威语言和翻译状态。

`mf init` 不会把这个文件复制到用户仓库。它是包侧元数据，用于跟踪模板文档修订号和翻译状态。

## 为什么存在

当文档经常通过议题和拉取请求变更时，仅靠文件修改时间不足以判断哪种语言是最新的。

mustflow 会比较权威文档的 `revision` 与每个翻译的 `source_revision`。

## 结构

```toml
version = 1
source_locale = "en"

[documents."agents.root"]
source = "locales/en/AGENTS.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/AGENTS.md", source_revision = 1, status = "current" }

[documents."docs.agent-workflow"]
source = "locales/en/.mustflow/docs/agent-workflow.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/.mustflow/docs/agent-workflow.md", source_revision = 1, status = "current" }

[documents."skill.code-review"]
source = "locales/en/.mustflow/skills/code-review/SKILL.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/.mustflow/skills/code-review/SKILL.md", source_revision = 1, status = "current" }
```

## 字段

- `version`: 该元数据格式的版本。
- `source_locale`: 当前模板文档的权威语言。
- `status_values`: 允许的翻译状态值。
- `documents.<id>`: 被跟踪文档的稳定标识符。
- `source`: 权威文档在模板内部的路径。
- `source_locale`: 该文档的权威语言。
- `revision`: 权威文档修订号。
- `translations`: 用于把翻译文档映射到源修订号和状态的位置。

## 状态值

- `current`: 翻译与当前权威修订号一致。
- `stale`: 权威文档已变更，但翻译尚未更新。
- `needs_review`: 翻译存在，但需要审阅。
- `missing`: 翻译不存在。

新鲜度通过比较 `revision` 和每个翻译的 `source_revision` 决定，而不是通过文件修改时间决定。

## 验证

包发布前，测试套件会验证这些元数据：

- `source_locale` 必须与 `manifest.toml` 匹配。
- 源路径和翻译路径必须指向真实模板文件。
- `current` 翻译必须使用与源文档 `revision` 相同的 `source_revision`。
- Markdown frontmatter 必须匹配被跟踪的文档 ID 和语言。
- 权威 Markdown 文件必须使用 `canonical: true`；翻译后的 Markdown 文件必须使用 `canonical: false`。
