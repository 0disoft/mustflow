---
title: 本地索引
description: 说明 mustflow 如何将 SQLite 用作本地索引。
---

mustflow 默认使用 SQLite 作为本地索引存储。

## 原则

文件始终是事实来源。

- `AGENTS.md`
- `.mustflow/config/*.toml`
- `.mustflow/context/*.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/*/SKILL.md`

SQLite 作为二级本地索引，用于加速搜索与分析。它必须可以安全删除并重建。

本地 SQLite 数据库是可重建缓存。它不应被视为事实来源、记忆存储、审计日志或转录存储。

## 预期位置

```text
.mustflow/cache/mustflow.sqlite
```

`mf init` 不会立即创建此文件。索引会在运行 `mf index` 时创建。
`mf search` 会读取此文件，但不会修改源文档。未来的 `mf map` 和 `mf dashboard` 功能可能会复用它。

默认模板将该状态定义为：

```toml
[capabilities]
local_index = "generated_optional"
```

这表示索引是可选生成数据，而不是源文档。

## 索引可以存储的数据

- 文档路径
- 标题和章节标题
- Frontmatter 元数据
- 文档 revision 和 hash
- 短内容摘录
- 命令意图元数据
- Skill 引用

当前 `mf index` 命令使用 `metadata_and_snippets` 模式。它每个文档最多存储 2048 字节的摘录，默认不存储完整文档正文，并把命令意图名称和描述作为派生文档搜索词保存，使 `mf search` 仍能找到相关配置文件。

搜索前，`mf search` 会将存储的 hash 与当前文件比较；如果缓存过期，则返回错误。最后一次验证结果和运行分析保留给未来功能。

## 写入规则

当 LLM 或 dashboard 编辑文档时，最终写入目标仍然是 Markdown 或 TOML。

SQLite 提供辅助数据，用于加速搜索、显示与验证。

原始日志、完整终端输出、完整聊天记录、隐藏推理、密钥、环境变量值和私有仓库内容，都不是索引或未来知识层的源文档。mustflow 在项目中只保留小型运行记录，默认不存储原始日志。该规则由 `.mustflow/config/mustflow.toml` 中的 `[retention]` 策略和 `mf check --strict` 的存储检查执行。
