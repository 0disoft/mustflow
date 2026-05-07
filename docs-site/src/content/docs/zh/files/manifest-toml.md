---
title: templates/default/manifest.toml
description: 告诉 mf init 要复制哪些文件以及如何处理冲突的模板元数据。
---

`templates/default/manifest.toml` 是 `mf init` 安装模板时使用的元数据。

这个文件不会复制到用户仓库。它是 mustflow 如何安装模板的包侧事实来源。

## 作用

- 声明模板标识符和描述。
- 声明安装范围是否限制为仅供 LLM 使用的文件。
- 列出模板会创建的文件。
- 定义现有文件冲突时是中止、合并托管块，还是备份并覆盖。
- 列出安装后人工应执行的后续检查。

## 字段

- `id`: 稳定的模板标识符。
- `name`: 便于人阅读的模板名称。
- `version`: 模板版本。
- `description`: 模板用途。
- `common_root`: 包含待复制语言无关文件的基础文件夹。
- `locales_root`: 包含由 `--locale` 选择的特定语言文件的基础文件夹。
- `profiles.default`: 未选择项目类型时，`mf init` 使用的项目类型。
- `profiles.available`: 默认模板允许的项目类型。
- `locales.default`: 未选择语言时，`mf init` 使用的 mustflow 文档语言。
- `locales.available`: 模板实际提供的文档语言。
- `locales.source`: 本地化模板文档的权威源语言。
- `install_policy.scope`: 安装范围。默认模板使用 `llm_only`。
- `install_policy.copied_targets`: 直接复制的目标。
- `install_policy.generated_targets`: 安装后可生成的目标。
- `install_policy.forbidden_targets`: 默认模板不允许添加的目标。
- `creates`: 模板可能创建的文件。
- `after_install`: 给用户的后续检查。
- `i18n.metadata`: 用于翻译跟踪的元数据文件。
- `i18n.source_locale`: `i18n.toml` 预期的源语言。
- `conflict_policy`: 默认现有文件冲突行为。默认是在写入前中止。
- `conflict_policy.files`: 每个文件的冲突行为。
- `conflict_policy.generated`: 生成文件的冲突行为。

## 安装范围

```toml
[install_policy]
scope = "llm_only"
copied_targets = [
  "AGENTS.md",
  ".mustflow/**",
]
generated_targets = [
  "REPO_MAP.md",
  ".mustflow/config/manifest.lock.toml",
  ".mustflow/state/**",
]
```

- `scope`: 表示该模板只安装 LLM agent 工作流文件。
- `copied_targets`: 直接从模板复制的路径。
- `generated_targets`: 读取仓库结构后生成的路径。
- `forbidden_targets`: 绝不能添加到默认模板的路径。

默认模板不会创建 `README.md`、`.github/`、根目录 `docs/`、根目录 `skills/`、源代码或包管理器配置。
它可以创建 `.mustflow/context/**`，因为这些文件是 LLM agent 工作流上下文，不是通用项目文档。
`REPO_MAP.md`、`.mustflow/config/manifest.lock.toml` 和 `.mustflow/state/**` 是生成的，不是复制的。
`.mustflow/state/**` 包含使用期间创建的本地状态，例如 `mf run` receipt。

## 项目类型与语言

profile 描述项目类型，不描述国家或语言。

```toml
[profiles]
default = "minimal"
available = ["minimal", "oss", "team", "product", "library"]

[locales]
default = "en"
available = ["en", "ko", "zh", "es", "fr", "hi"]
source = "en"
```

`common_root` 提供所有语言共享的 TOML 配置。`locales_root` 提供本地化 Markdown 文档和 skill 文件。
`locales.available` 只包含实际可安装的文档语言。`locales.source` 是用于翻译跟踪的权威源语言。

## 编写规则

`manifest.toml` 不是安装到目标项目中的文档。它管理 mustflow 模板本身。

向模板添加新文件时，应同时更新本文件中的 `creates`、`install_policy` 和冲突策略。
还要确认新文件的主要读者是 LLM agent。
添加生成文件时，应同时更新 `generated_targets` 和 `conflict_policy.generated`。

`AGENTS.md` 可以通过 `--merge` 接收 mustflow 托管块，但配置文件冲突不会自动合并。
`manifest.lock.toml` 在成功安装后可以复现，因此它的生成文件策略是 `regenerate`。
`.mustflow/state/**` 是使用期间创建的本地执行状态，因此更新和移除流程默认应保留它。
