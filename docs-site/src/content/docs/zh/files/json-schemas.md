---
title: schemas/
description: mustflow 稳定 JSON 输出的公开 JSON Schema 合同。
---

`schemas/` 保存 mustflow 面向机器读取的 JSON 输出以及已解析配置结构的公开
JSON Schema 合同。

## 是否由 mf init 安装

不会。`mf init` 不会把 `schemas/` 复制到用户仓库。

默认初始化模板有意保持轻量。它安装 `AGENTS.md`、`.mustflow/**`，以及
`.gitignore` 中由 mustflow 管理的区块；`REPO_MAP.md` 之后通过 `mf map`
生成。

## 是否随 npm 包分发

会。`schemas/` 包含在 npm 包中，这样工具可以依赖这些合同，而不需要解析面向
人的文本输出。

围绕 `--json` 输出构建自动化时，可以使用已安装包中的 schema，或使用 mustflow
仓库中的 schema。

## 当前 schema

- `doctor-report.schema.json`: `mf doctor --json`
- `context-report.schema.json`: `mf context --json`
- `contract-lint-report.schema.json`: `mf contract-lint --json`
- `onboard-commands-report.schema.json`: `mf onboard commands --json`
- `next-report.schema.json`: `mf next --json`, including optional script-pack helper suggestions
- `verification-plan.schema.json`: `mf api verification-plan --changed --json`, including optional
  read-only script-pack helper suggestions
- `evidence-report.schema.json`: `mf evidence --changed --json`
- `api-serve-response.schema.json`: `mf api serve --stdio` 的每一条按行分隔响应
- `workspace-status.schema.json`: `mf workspace status --json`
- `workspace-command-catalog.schema.json`: `mf workspace command-catalog --json`
- `workspace-verification-plan.schema.json`: `mf workspace verify --changed --plan-only --json`
- `version-sources-report.schema.json`: `mf version-sources --json`
- `docs-review-list.schema.json`: `mf docs review list --json`
- `skill-route-report.schema.json`: `mf skill route --json`, including optional read-only
  script-pack helper suggestions
- `latest-run-pointer.schema.json`: `mf verify` 写入最新 verify 运行包指针时的
  `.mustflow/state/runs/latest.json`
- `verify-report.schema.json`: `mf verify --reason <event> --json`，包含执行汇总状态和
  基于证据的完成裁定
- `verify-run-manifest.schema.json`: `.mustflow/state/runs/verify-*/manifest.json`，
  包含与 verify 报告相同的执行汇总状态和完成裁定
- `run-receipt.schema.json`: `mf run <intent> --json` 和 `.mustflow/state/runs/latest.json`
- `commands.schema.json`: 已解析的 `.mustflow/config/commands.toml`

面向人阅读的命令输出不属于这些 schema 的范围。
