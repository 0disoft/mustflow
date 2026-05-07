---
title: 工作项
description: 为什么本地工作项默认不安装，以及 mustflow 未来可能如何支持它们。
---

默认情况下，mustflow 不创建本地 issue 或 proposal 文件夹。

基于文件的 work items 可能有用，但默认安装它们会让 mustflow 从代理文档流扩展成本地 issue tracker。目前 `.mustflow/config/mustflow.toml` 只声明 `work_items = "disabled"` 和 `handoff.mode = "report_only"`。

## 默认值

```toml
[capabilities]
work_items = "disabled"

[handoff]
enabled = false
mode = "report_only"
```

这意味着代理应在最终 handoff 中报告未完成工作，而不是创建新的 backlog 文件。

## 为什么不是默认功能

- `mf init` 的主要目的，是设置仅面向 LLM 的工作流文件。
- 本地 issue 文件可能变得过期，并可能与现有 issue tracker 重复。
- 失败日志、内部路径、客户名称和 secret 片段可能泄露到文档中。
- 如果代理可以自由创建和关闭 work items，人类决策边界会变得不清晰。

## 可选方向

如果未来将其作为可选功能，`.mustflow/work-items/` 比 `.mustflow/pr/` 更清晰。本地文件代表拟议工作和方案说明，而不是真正的 pull request。

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

## 未来命令候选

```sh
mf work list
mf work show MF-0001
mf work propose MF-0001
mf work check
```

这些命令不在当前实现范围内。mustflow 应先稳定基于文件的工作流、命令合同和验证流程，再添加这个可选表面。
