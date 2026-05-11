---
mustflow_doc: context.project
kind: mustflow-context
locale: zh
canonical: false
revision: 1
lifecycle: user-editable
name: project
authority: contextual
stability: medium
review_status: needs_human_review
source_refs:
  - AGENTS.md
  - .mustflow/config/mustflow.toml
  - .mustflow/config/commands.toml
---

# 项目上下文

本文件用于记录面向编码代理的项目特定上下文。  
若某字段信息未知，请保持未设置，切勿臆测或填充无依据的内容。

## 权限边界

- 本文件可用于记录有据可依的上下文信息、未确定事项及冲突。  
- 本文件不得赋予命令执行权限、设定文件编辑禁令、覆盖 `AGENTS.md` 或  
  `.mustflow/config/*.toml` 文件，也不得承诺当前来源未支持的功能。  
- 持久的操作规则应集中管理于 `AGENTS.md`、`.mustflow/docs/agent-workflow.md` 或相应配置文件，而非存放于此。

## 当前目标

未设置。待项目负责人明确后，将用实际项目目标替换此处内容。

## 非目标（Non-Goals）

未设置。请明确代理在非相关任务中不应涉及的范围或目标。

## 核心承诺

- 严格遵守 `AGENTS.md` 中的强制操作规则。  
- 将 `.mustflow/config/commands.toml` 视为命令的唯一权威来源。  
- 将 `.mustflow/config/mustflow.toml` 视为工作流与文档边界的唯一权威来源。  
- 需要更广泛的仓库视图时，使用 `REPO_MAP.md` 作为浅层导航地图。

## 领域术语

未设置。仅添加对实现决策有影响的专用术语。

## 重点关注区域

未设置。请列出需特别关注的路径、公开 API、生成文件、迁移、密钥或兼容性相关部分。

## 下一步阅读

- `AGENTS.md`  
- `.mustflow/docs/agent-workflow.md`  
- `.mustflow/config/mustflow.toml`  
- `.mustflow/config/commands.toml`  
- `.mustflow/skills/INDEX.md`

## 过期检查

- 若本文件内容与当前代码、测试、命令合同或用户指令存在冲突，应视为过期并报告该冲突。  
- 仅当项目方向、非目标或仓库范围承诺发生实质性变化时，方可更新本文件。