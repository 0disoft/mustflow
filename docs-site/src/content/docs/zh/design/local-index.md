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

## 预期位置

```text
.mustflow/cache/mustflow.sqlite
```

`mf init` 不会立即创建此文件。索引会在运行 `mf index` 时创建。
`mf search` 会读取该文件，但不会修改源文档。未来 `mf map` 与 `mf dashboard` 功能也可能复用它。

默认模板将该状态定义为：

```toml
[capabilities]
local_index = "generated_optional"
```

这意味着索引是可选生成数据，不是源文档。

## 索引可存储的数据

- 文档路径
- 标题与章节
- Frontmatter 元数据
- 文档修订
- 命令意图
- Skill 引用

当前 `mf index` 命令会索引 mustflow 文档、上下文文件、配置文件、skill 文档和 command intents。`mf search` 只查询这些已索引的 mustflow 工作流数据。
索引还会存储 content hashes。搜索前，`mf search` 会将这些 hash 与当前文件比较；如果缓存过期，则返回错误。
最近验证结果和运行分析保留给未来功能。

## 写入规则

当 LLM 或 dashboard 编辑文档时，最终写入目标仍然是 Markdown 或 TOML。

SQLite 提供辅助数据，用于加速搜索、显示与验证。

原始日志、完整终端输出和完整聊天转录不是索引或未来知识层的源文档。mustflow 在项目中保留小型运行回执和摘要文档，默认不存储原始日志。这通过 `.mustflow/config/mustflow.toml` 中的 `[retention]` 策略以及 `mf check --strict` 的存储检查强制执行。
