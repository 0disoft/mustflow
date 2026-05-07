---
title: .mustflow/context/INDEX.md
description: 将 agent 路由到任务相关的项目上下文文件。
---

`.mustflow/context/INDEX.md` 告诉 agent 哪些项目上下文文件与当前任务相关。

## 使用位置

- 帮助 agent 避免默认读取所有上下文文件。
- 将项目方向与简短的 `AGENTS.md` 路由文件分开。
- 指向 `README.md` 和 `DESIGN.md` 等可选外部锚点，同时不把它们变成 mustflow 管理的文件。

## 字段

frontmatter 会把该文件标识为 mustflow 上下文文档：

- `kind: mustflow-context`
- `name: context-index`
- `authority: contextual`
- `stability`: 内容预期的稳定程度。
- `review_status`: 该上下文是否已经由人工审阅。

## 表格

主表会把每个上下文名称映射到使用条件和路径。

默认模板只列出 `.mustflow/context/PROJECT.md`。
前端、后端、API、数据、安全或运维等特定领域上下文文件默认不会创建。

## 外部锚点

`README.md` 是面向人的概览。agent 可以把它作为上下文使用，但不能把它当作策略。

`DESIGN.md` 不是由 mustflow 创建的。如果它存在，agent 可以在处理界面、视觉设计、布局、设计令牌或无障碍相关工作时读取它。
