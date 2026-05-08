---
title: 可选根文档和合同文件
description: 项目自有的根文档和机器可读合同；存在时 mustflow 可以把它们作为导航锚点。
---

mustflow 不要求也不会创建这些文件，但当项目中已经存在这些文件时，可以把它们发现为
根级导航锚点。

## 常见 Markdown 文件

- `README.md`: 面向人的项目概览。它是上下文，不是 agent 策略。
- `PROJECT.md`: 项目自有简介。如果 `.mustflow/context/PROJECT.md` 也存在，mustflow 上下文文件在 agent 工作流中的角色更清晰。
- `ROADMAP.md`: 计划工作、优先级、里程碑和明确的非目标。
- `DESIGN.md`: UI 工作所需的视觉识别、布局、可访问性和设计 token 参考。
- `CONTRIBUTING.md`: 贡献流程、pull request 期望和本地开发说明。
- `SECURITY.md`: 漏洞报告方式和安全敏感变更指导。
- `CHANGELOG.md`: 发布历史和用户可见变更。
- `CODE_OF_CONDUCT.md`: 社区参与期望。
- `SUPPORT.md`: 支持渠道和维护期望。
- `GOVERNANCE.md`: 决策、权限和维护流程。
- `MAINTAINERS.md`: 维护者列表、评审所有权和升级路径。
- `RELEASING.md` 或 `RELEASE.md`: 发布流程和发布检查清单。
- `TESTING.md`: 测试策略、必需检查和验证标准。
- `DEPLOYMENT.md`: 部署环境、发布目标和 rollout 指南。
- `OPERATIONS.md` 或 `RUNBOOK.md`: 生产运维和重复操作流程。
- `CONFIGURATION.md`: 环境变量、功能开关和运行时配置指南。
- `DATA_MODEL.md` 或 `SCHEMA.md`: 领域数据模型或 schema 参考。
- `PRIVACY.md`: 隐私、数据处理和保留规则。
- `TROUBLESHOOTING.md`: 已知故障和恢复流程。
- `ARCHITECTURE.md`: 系统结构、模块边界和架构决策。
- `API.md`: 公开 API 范围和集成合同。

## 机器可读合同文件

优先使用能说明用途的名称，而不是泛泛的 `SSOT.json`。

- `project.contract.json`: 工具可以验证的仓库级合同。
- `project.constants.json`: 代码或工具可以读取的共享项目常量。
- `design-tokens.json`: 设计 token 合同。
- `openapi.json`、`openapi.yaml` 或 `openapi.yml`: OpenAPI 合同。
- `asyncapi.json`、`asyncapi.yaml` 或 `asyncapi.yml`: AsyncAPI 合同。
- `schema.graphql`: GraphQL schema 合同。
- `schema.prisma`: Prisma 数据 schema 合同。

## 与 mf init 的关系

`mf init` 不会复制这些文件。用户仓库通常已经拥有这些文档，mustflow 不应覆盖项目
文档。

## 与 REPO_MAP.md 的关系

`mf map` 会在这些文件存在时把它们包含进地图，让 agent 能找到有用上下文，而不把
每个 Markdown 文件都当成必读文档。这些文件不会覆盖 `AGENTS.md`、
`.mustflow/config/*.toml` 或命令合同。
