---
title: 合同规范
description: 定义 mustflow 可测试 workflow 规则的版本化根文档。
---

mustflow 将版本化合同规范保存在仓库的
[`docs/spec/`](https://github.com/0disoft/mustflow/tree/main/docs/spec) 中。

这些文档定义未来命令和 schema 应共享的规则。它们是简明参考文档，不是教程。

## JSON Schema

发布的 JSON Schema 位于
[`schemas/`](https://github.com/0disoft/mustflow/tree/main/schemas)，并随 npm 包提供。

- `doctor-report.schema.json`：`mf doctor --json`。
- `context-report.schema.json`：`mf context --json`。
- `run-receipt.schema.json`：`mf run <intent> --json` 和 `.mustflow/state/runs/latest.json`。
- `commands.schema.json`：解析后的 `.mustflow/config/commands.toml`。

`commands.schema.json` 也接受用于计划说明的 `preconditions` 元数据。它们可以在 dry-run、
verify-plan 和 explain 输出中报告缺失路径或过期产物，但 `satisfy_intent` 永远不会作为依赖被隐式执行。

## 当前规范

- `instruction-authority-v1.md`：解析用户指示、host 策略、仓库文件、命令合同和生成状态之间的有效规则。
- `command-contract-v1.md`：说明 command intent 何时可以通过 `mf run` 执行。
- `verification-receipt-v1.md`：说明 `mf run` 写入的最新运行 receipt。
- `state-retention-v1.md`：说明生成状态、缓存、receipt 和原始输出的边界。

## 与安装文件的关系

规范描述 `AGENTS.md`、`.mustflow/docs/agent-workflow.md`、
`.mustflow/config/mustflow.toml` 和 `.mustflow/config/commands.toml` 等安装文件的行为。

如果规范与当前行为不一致，应将其视为实现或文档 bug。不要用规范覆盖当前用户指示、
host 安全门槛，或最近的已安装 mustflow root。
