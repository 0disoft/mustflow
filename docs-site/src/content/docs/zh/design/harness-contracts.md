---
title: Harness 合同
description: mustflow 如何支持长时运行的代理 harness，同时不把自身变成 harness。
---

mustflow 不托管自治长时运行代理。它为代理 harness 提供可读取、可验证的仓库本地合同。

## 边界

- mustflow 不创建 workers、personas、fleets 或 cloud sandboxes。
- mustflow 不存储无界原始会话日志。
- mustflow 不是托管代理平台或 IDE 代理的替代品。
- mustflow 定义规则、命令合同、刷新检查点、压缩策略、回执、预算、审批和交接边界。

## Brain、Hands、Session 分层

- Brain：`AGENTS.md`、`agent-workflow.md` 与 `skills/*/SKILL.md`。
- Hands：`commands.toml`、有限命令生命周期与 `mf run`。
- Session：有界运行回执、可选检查点、带来源链接的摘要、紧凑交接与可再生成索引。
- Judge：原始验收标准、变更文件、命令合同与回执。

这种划分确保 mustflow 保持工具中立。宿主可以运行单个聊天会话、后台云代理或外部编排循环，而仓库合同仍保持可读。

## 当前采用

- `.mustflow/config/mustflow.toml` 中的策略字段：`[harness]`、`[budget]`、`[approval]` 和 `[isolation]`。
- `agent-workflow.md` 中的验证收紧规则。
- 刷新检查点、分层压缩策略与有界保留。

压缩摘要是优先级较低的辅助记忆。当前用户指令、当前文件、命令合同和运行回执优先于它们。mustflow 不在项目中存储隐藏思维链或完整聊天转录。

## 暂缓

`completion-judge`、work items、handoff 写入命令、checkpoint 命令和自治循环仍属于可选未来能力。在它们依赖的合同稳定前，不应出现在默认模板中。
