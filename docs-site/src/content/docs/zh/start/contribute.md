---
title: 为 mustflow 做贡献
description: 在 mustflow 仓库中工作时，区分维护者命令和安装到用户项目的文件。
---

当你修改 mustflow 包、文档站点、模板、schema、测试或发布流程时，使用这条路径。

## 开始

- 阅读 `CONTRIBUTING.md`。
- 编辑前阅读本仓库的 `AGENTS.md`。
- 使用 `.mustflow/config/commands.toml` 中配置的 intent 进行验证。

## 常用检查

```sh
mf run docs_validate_fast
mf run mustflow_check
mf run test_related
```

选择覆盖变更表面的最窄配置 intent。发布敏感、跨模块、schema、包或模板变更需要更宽的检查。

## 边界

本仓库的开发环境使用 Bun，但用户项目运行 mustflow 不需要 Bun。`templates/default/` 下的文件定义安装后的工作流文件；`docs-site/`、`src/`、`tests/` 和 `schemas/` 属于这个包仓库。
