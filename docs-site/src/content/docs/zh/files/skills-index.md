---
title: .mustflow/skills/INDEX.md
description: 告诉 agent 针对任务应读取哪个 skill 文档的索引。
---

`.mustflow/skills/INDEX.md` 帮助 agent 在开始可重复工作前选择合适的 skill 文档。

## 使用位置

读取共享规则和命令合同之后，如果当前任务匹配某个可重复流程，agent 会使用这个索引。

这个文件不应复制冗长的 skill 正文。它只连接使用场景、skill 路径和相关命令意图。

## 作用

- 列出 skill 名称和使用时机。
- 连接代码审查、文档更新、失败排查和测试维护等重复任务。
- 列出每个 skill 可能需要的命令意图名称。
- 允许删除未使用的仓库专用 skill，或将其标记为停用。

## 编写规则

保持索引简短、便于扫读。

把较长流程放在各自的 `SKILL.md` 中。索引只应包含每个 skill 的名称、目的、触发条件和相关命令意图。

## 表格列

- `Situation`: 应触发该 skill 的任务条件。
- `Document`: 包含该流程的 `SKILL.md` 路径。
- `Command intents`: 该 skill 可能检查的 `commands.toml` 意图名称。

添加 skill 时，在这里链接它，并确保命令意图名称与 skill frontmatter 保持一致。
