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
- `version-sources-report.schema.json`: `mf version-sources --json`
- `verify-report.schema.json`: `mf verify --reason <event> --json`
- `run-receipt.schema.json`: `mf run <intent> --json` 和 `.mustflow/state/runs/latest.json`
- `commands.schema.json`: 已解析的 `.mustflow/config/commands.toml`

面向人阅读的命令输出不属于这些 schema 的范围。
