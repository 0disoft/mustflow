---
title: 工作项
description: 可选本地工作项如何扩展 mustflow，同时保留有边界的交接记录。
---

工作项是 mustflow 的可选表面，用于在仓库内记录延期 issue、proposal 和重启点。

默认模板用 `work_items = "disabled"` 和 `handoff.mode = "report_only"` 让该表面保持 inactive，直到项目选择有边界的生命周期。

## 默认值

```toml
[capabilities]
work_items = "disabled"

[handoff]
enabled = false
mode = "report_only"
```

这意味着代理应在最终 handoff 中报告未完成工作，而不是创建新的 backlog 文件。

## 为什么默认值是 inactive

- 默认安装应保持小而清晰，直到项目选择工作项生命周期。
- 本地 issue 文件可能变得过期，并可能与现有 issue tracker 重复。
- 失败日志、内部路径、客户名称和 secret 片段可能泄露到文档中。
- 如果代理可以自由创建和关闭 work items，人类决策边界会变得不清晰。

## 方向

启用工作项写入时，`.mustflow/work-items/` 比 `.mustflow/pr/` 更清晰。本地文件代表拟议工作和方案说明，而不是真正的 pull request。

```text
.mustflow/
└─ work-items/
   ├─ README.md
   ├─ issues/
   │  └─ MF-0001.md
   └─ proposals/
      └─ MF-0001-P001.md
```

`issues/` 包含延期的 bugs、tasks 和 feature requests。`proposals/` 包含针对某个 issue 的拟议变更。分支、diff、review 和 merge 仍由 Git 与协作平台负责。

## 代理权限

即使启用了可选 work items，权限仍应保持狭窄。

- 允许代理创建 issue candidates 并提出变更。
- 代理不得在无人类审批的情况下关闭 issues 或接受 proposals。
- 代理不得声称真实 pull request 已存在。
- 代理不得在 work items 中存储 secrets、客户数据或大量失败日志。

## 命令候选

```sh
mf work list
mf work show MF-0001
mf work propose MF-0001
mf work check
```

在 agent 可以自动创建或关闭记录之前，应以有边界的 schema、命令合同、敏感信息遮蔽和人工审批规则逐步添加写入与生命周期命令。
