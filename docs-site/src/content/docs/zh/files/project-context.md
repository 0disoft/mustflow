---
title: .mustflow/context/PROJECT.md
description: 为 agent 记录项目目标、非目标、术语和仓库级承诺。
---

`.mustflow/context/PROJECT.md` 是 `mf init` 安装的默认项目上下文文件。

它应该保持简短。它不是完整架构文档、路线图、API 参考、会议记录，也不是生成摘要归档。

## 使用位置

- 当任务可能影响范围、行为或仓库级承诺时，为 agent 提供项目方向。
- 记录非目标，避免 agent 扩展无关工作。
- 列出会影响实现决策的领域术语和需要额外谨慎的区域。

## 权威性

默认权威级别是 `contextual`。

这表示该文件用于帮助 agent 定向，但它的权威性低于用户的直接指令、当前代码、测试、命令合同和已配置策略。

如果它与当前文件冲突，agent 应报告冲突，并把该上下文视为过期内容。

## 章节

- `Current Goal`: 当前项目目标。不要编造目标；没有时保持未设置。
- `Non-Goals`: agent 在无关任务中不应扩展的内容。
- `Core Promises`: agent 应保留的仓库级承诺。
- `Domain Terms`: 会影响实现决策的术语。
- `Extra Care Areas`: 需要谨慎处理的路径、API、生成文件、迁移、敏感信息或兼容性边界。
- `Read Next`: 读取该上下文之后应继续读取的文件。
- `Staleness Check`: 如何判断该文件已经过期。
