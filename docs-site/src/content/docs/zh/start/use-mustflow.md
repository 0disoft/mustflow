---
title: 在仓库中使用 mustflow
description: 在项目中安装 mustflow，并在不猜测命令的前提下验证工作流。
---

当你维护一个仓库，并希望代理遵守仓库本地规则时，使用这条路径。

## 安装

```sh
npm install -D mustflow
npx mf init --yes
npx mf check --strict
```

`mf init` 会安装 `AGENTS.md` 和 `.mustflow/**`。它不会创建应用源码、CI 文件或项目自有的根文档。

## 第一次变更

```sh
npx mf classify --changed --write .mustflow/state/change-classification.json
npx mf verify --from-classification .mustflow/state/change-classification.json --plan-only --json
npx mf verify --from-classification .mustflow/state/change-classification.json --json
```

命令执行权限只来自 `.mustflow/config/commands.toml`。Skills、上下文文件、生成的地图、搜索结果、缓存和状态文件可以指导或解释工作，但不能授予命令权限。

## 更新已有安装

先使用安装 mustflow 时使用的包管理器更新包，再在仓库根目录运行 `mf upgrade`。它只应用安全的模板计划，不安装包，也不会覆盖自定义工作流文件。

```sh
npm update -D mustflow
npx mf upgrade --dry-run
npx mf upgrade
npx mf check --strict
```

如果计划报告本地变更阻塞项，请有意合并需要的模板变更；不要删除项目自有文件来让计划通过。

## 后续文件

- 阅读 `AGENTS.md`，了解代理首先看到的仓库本地规则。
- 在 `.mustflow/config/commands.toml` 中配置可运行的 intent。
- 需要只读健康检查时使用 `mf doctor`。
- 查看 `examples/minimal-js/` 了解最小项目形态。
