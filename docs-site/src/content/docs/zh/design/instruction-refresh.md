---
title: 指令刷新
description: 为什么 mustflow 使用刷新检查点，而不是项目文件中的会话计数器。
---

长时运行的代理会话可能偏离最初加载的指令。工具输出、大型 diff、上下文压缩和嵌套仓库变更，都可能让最初的 `AGENTS.md` 变得不够可见。

mustflow 通过刷新检查点处理这个问题。

## 解决的问题

- 代理可以在高风险动作前重新检查相关指令文件。
- 命令执行可以刷新 `commands.toml`，而不是依赖记忆。
- 根目录变化可以强制重读最近的 `AGENTS.md`。
- 最终报告可以在总结工作前确认报告规则。

## 避免的问题

mustflow 不会把 turn counters、message counts 或 session activity 写入项目文件。

这类状态跟踪会给 Git 引入不必要噪声，在多个代理之间发生冲突，并暴露活动元数据。如果宿主应用需要跟踪会话年龄，应将该状态存放在本地缓存或宿主管理存储中。

## 刷新级别

- `light`：重读 `AGENTS.md` 与 `agent-workflow.md`。
- `command`：重读 `AGENTS.md` 与 `commands.toml`。
- `skill`：重读 `AGENTS.md` 与 `skills/INDEX.md`。
- `full`：重读完整 mustflow 阅读顺序。

事实来源是 `.mustflow/config/mustflow.toml` 中的 `[refresh]`。

## CLI 方向

未来的 `mf orient` 与 `mf refresh` 等命令可以将该策略暴露为机器可读计划。当前模板先提供策略和文档，使宿主可以采用它，而不必假设每个工具都有相同的生命周期 hook。
