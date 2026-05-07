---
title: 指令刷新
description: 为什么 mustflow 使用刷新检查点，而不是项目文件中的会话计数器。
---

长时间运行的 agent 会话可能会偏离开始时读取的指令。工具输出、大型 diff、上下文压缩和嵌套仓库变更，都可能让最初的 `AGENTS.md` 变得不够显眼。

mustflow 使用刷新检查点处理这个问题。

## 解决的问题

- Agent 可以在高风险操作前重新检查相关指令文件。
- 命令执行可以刷新 `commands.toml`，而不是依赖记忆。
- 根目录变更可以强制重读最近的 `AGENTS.md`。
- 最终报告可以在总结工作前确认报告规则。

## 避免的问题

mustflow 不会把轮次计数、消息数量或会话活动写入项目文件。

这类状态跟踪会给 Git 引入不必要的噪声，在多个 agent 之间冲突，并暴露活动元数据。如果宿主应用需要跟踪会话时长，应把状态存放在本地缓存或宿主管理的存储中。

## 刷新级别

- `light`：重读 `AGENTS.md` 与 `agent-workflow.md`。
- `command`：重读 `AGENTS.md` 与 `commands.toml`。
- `edit`：敏感编辑前重读 `AGENTS.md`、`mustflow.toml` 与 `agent-workflow.md`。
- `report`：最终报告前重读 `AGENTS.md`、`mustflow.toml` 与 `preferences.toml`。
- `skill`：重读 `AGENTS.md` 与 `skills/INDEX.md`。
- `full`：重读完整 mustflow 阅读顺序。

`before_command_run` 表示在命令执行前按需刷新命令合同。它不是要求每次执行命令前都重读整套 mustflow 文档。

默认阈值是 8 个对话轮次、16 次工具调用或 100000 字节累计输出。事实来源是 `.mustflow/config/mustflow.toml` 的 `[refresh]`。

## CLI 方向

未来的 `mf orient` 与 `mf refresh` 等命令可以将该策略暴露为机器可读计划。当前模板先提供策略和文档，使宿主可以采用它，而不必假设每个工具都有相同的生命周期 hook。
