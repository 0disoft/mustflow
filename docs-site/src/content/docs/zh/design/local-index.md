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
- 已索引文件指纹
- 短内容摘录
- 命令意图元数据
- Skill 引用

当前 `mf index` 命令使用 `metadata_and_snippets` 模式。它每个文档最多存储 2048 字节的摘录，默认不存储完整文档正文，并把命令意图名称和描述作为派生文档搜索词保存，使 `mf search` 仍能找到相关配置文件。

`indexed_files` 表会为每个已索引工作流文件和可选源码锚点文件保存派生指纹：路径、来源范围、大小、修改时间、内容哈希、索引时间、索引模式和解析器版本。`mf index --incremental` 只有在 schema、解析器版本、源码范围设置和文件指纹仍兼容时才会复用现有 SQLite 文件；否则会退回完整重建。

`indexed_source_candidates` 表会把源码候选成员关系与 `indexed_files.source_scope` 分开记录。因此，同一路径即使同时是工作流权威文档和源码候选，也不会被误判为过期。外键要求每个源码候选始终保留对应的 `indexed_files` 指纹，并阻止在候选仍存在时先删除或更改该指纹路径。索引文件路径必须是项目内规范化的相对路径；索引创建和新鲜度检查会拒绝路径穿越、绝对路径、Windows 驱动器或 UNC 路径以及符号链接，避免读取 mustflow 根目录之外的文件。

搜索元数据也会写入 `search_ngrams` 表。这些行是短的派生词片段，用于在空格或 SQLite 分词较弱时辅助多语言搜索。它们指向文档、技能、技能路由、命令意图和源码锚点；不会存储完整文档或完整源码，也不会改变权威排序。N-gram 生成使用硬性限制：每个词元只取前 64 个字符，每个索引目标最多写入 512 行 n-gram。

搜索前，`mf search` 会将存储的 hash 与当前文件比较；如果缓存过期，则返回错误。最后一次验证结果和运行分析保留给未来功能。

## 结构化源码锚点

源码锚点是用于代码导航的小型注释预算，不是通用文档层。只有当精确找到某个源码边界能帮助代理选择更安全的上下文，或理解容易被破坏的合同时，才使用 `mf:anchor`。

适合放置锚点的位置：

- CLI 或 core 的公开边界，也就是输入变成类型化决策的位置
- 命令执行、进程控制、文件写入、运行记录和 latest 指针更新
- 安全、隐私、数据丢失、迁移、授权或状态一致性边界
- 测试或命令合同依赖的非显而易见不变量

不要在普通控制流、自明的辅助函数、生成物、vendor 代码、依赖目录、宽泛架构说明，或重复附近类型和函数名的文字上添加锚点。

锚点 ID 使用稳定的职责名称，而不是文件名。优先使用 `verify.receipts.write`、`run.timeout.terminate`、`source-anchors.scan` 这样的 lowercase dotted name。ID 可以包含小写字母、数字、点和连字符，并且必须在项目内唯一。

允许的字段故意保持很窄：

- `purpose`：用一句话说明这个源码边界为什么重要。
- `search`：三到八个维护者或代理可能搜索的词。
- `invariant`：不能被破坏的条件，尤其是权限、安全、状态或证据相关条件。
- `risk`：已知风险标签，例如 `config`、`state`、`security`、`privacy`、`pii`、`secrets` 或 `data_loss`。

```ts
/**
 * mf:anchor verify.receipts.write
 * purpose: Persist verify receipts and the latest pointer after scheduled intents finish.
 * search: verify receipt, latest.json, manifest, receipt binding
 * invariant: Receipt files explain evidence; they never grant command authority or verification success.
 * risk: state, data_consistency
 */
```

源码锚点绝不能包含代理指令、命令授权、策略绕过、密钥，或声称可以跳过验证的内容。收集后的摘要始终保持 `navigationOnly: true` 和 `canInstructAgent: false`；SQLite 可以为了搜索和解释索引它们，但锚点不能授权命令，不能替代 `.mustflow/config/commands.toml`，也不能证明验证成功。

`mf check --strict` 会拒绝格式错误的锚点 ID、不支持的字段、重复 ID、生成物或 vendor 路径、未知风险标签、类似密钥的文本，以及锚点内的代理命令或策略指令。当 `purpose` 过长、`search` 词过多、高风险锚点缺少 `invariant`，或某个文件消耗过多锚点预算时，它也会给出警告。应把这些警告视为删除、缩短或拆分锚点的信号，而不是继续增加说明性文字。

## 写入规则

当 LLM 或 dashboard 编辑文档时，最终写入目标仍然是 Markdown 或 TOML。

SQLite 提供辅助数据，用于加速搜索、显示与验证。

原始日志、完整终端输出、完整聊天记录、隐藏推理、密钥、环境变量值和私有仓库内容，都不是索引或未来知识层的源文档。mustflow 在项目中只保留小型运行记录，默认不存储原始日志。该规则由 `.mustflow/config/mustflow.toml` 中的 `[retention]` 策略和 `mf check --strict` 的存储检查执行。
