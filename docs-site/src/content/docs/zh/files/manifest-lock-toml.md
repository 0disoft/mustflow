---
title: .mustflow/config/manifest.lock.toml
description: 由 mf init 写入的生成安装状态文件。
---

`.mustflow/config/manifest.lock.toml` 会在 `mf init` 成功后生成或更新。

它不是从模板复制而来。它记录目标仓库中哪些文件被创建、合并、保持不变或覆盖。

## 写入时机

- `mf init` 成功后写入。
- `--merge` 将托管块插入现有 `AGENTS.md` 时写入。
- `--force` 备份冲突文件并覆盖它们时写入。
- 因冲突中止安装时不写入。
- `--dry-run` 仅打印安装计划时不写入。

## 作用

- 记录安装使用的模板标识符和版本。
- 记录每个已安装文件的基线哈希。
- 记录对每个文件执行的操作。
- 为 `mf check`、`mf status` 和 `mf update --dry-run` 等命令提供稳定的安装状态基线。

## 结构

```toml
schema_version = "1"
generated_by = "mustflow"

[template]
id = "default"
version = "1.0.1"
profile = "minimal"
locale = "ko"

[files."AGENTS.md"]
source = "template_locale"
last_action = "created"
content_hash = "sha256:..."
```

## 字段

- `schema_version`: 锁文件结构版本。
- `generated_by`: 生成该文件的工具。
- `template.id`: 安装时使用的模板标识符。
- `template.version`: 安装时使用的模板版本。
- `template.profile`: 安装时选择的项目类型。
- `template.locale`: 安装时选择的 mustflow 文档语言。
- `template.agent_lang`: 选择后使用的 agent 报告语言。
- `product_i18n`: 选择产品文本语言时写入的可选章节。
- `files."<path>"`: 每个文件的安装记录。
- `source`: 文件内容来源。使用 `template_locale`、`template_common` 或 `managed_block`。
- `last_action`: 上次安装期间执行的操作。值为 `created`、`unchanged`、`merged`、`overwritten` 或 `customized` 之一。
- `content_hash`: mustflow 上次安全安装或更新时记录的文件内容 SHA-256 基线哈希。

`last_action = "customized"` 表示记录的哈希是已接受的仓库特定基线。只要当前哈希仍匹配 `content_hash`，`mf update` 就会保留该文件。

## 哈希基线

目前，`content_hash` 是安装时基线。
它不是当前文件的实时哈希。

`mf check`、`mf status` 和 `mf update --dry-run` 会在运行时计算当前文件哈希，并将其与该基线比较。模板哈希也不会存储在锁文件中；它们会从已安装 mustflow 包内附带的模板中计算。

这样可以让锁文件保持为安装基线，而不是实时当前状态快照。

如果 mustflow 将来只更新文件内部的受管理块，锁文件结构必须先加入块级基线。v1 的文件级 `content_hash` 不足以证明受管理块本身没有变化。

## 编辑规则

这个文件不是手写源文档。

需要刷新安装状态时，应通过 `mf init` 或未来的专用更新命令重新生成它。手动编辑可能导致记录的哈希与实际文件内容不一致。

`mf update --dry-run` 使用 `content_hash` 作为安装时基线。如果当前文件哈希与该基线不同，该文件会被视为本地改动，并阻止自动更新。

设计理由见 [manifest.lock.toml Structure Decision](../../design/manifest-lock-decision/)。
