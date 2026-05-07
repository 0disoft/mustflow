---
mustflow_doc: context.project
kind: mustflow-context
locale: zh
canonical: false
revision: 1
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
若某字段未知，请保持未设置，不要假设或编造细节。

## 当前目标

未设置。待项目负责人提供后，用当前项目目标替换此处内容。

## 非目标（Non-Goals）

未设置。请列出代理在无关任务中不应追求的范围或目标。

## 核心承诺

- 按 `AGENTS.md` 执行强制操作规则。
- 将 `.mustflow/config/commands.toml` 视为命令的唯一可信来源。
- 将 `.mustflow/config/mustflow.toml` 视为工作流与文档边界的唯一可信来源。
- 当需要更广的仓库视图时，将 `REPO_MAP.md` 用作浅层导航地图。

## 领域术语

未设置。仅添加会影响实现决策的术语。

## 重点关注区域

未设置。请列出需要特别注意的路径、公开 API、generated files、迁移、secrets 或兼容性表面。

## 下一步阅读

- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/mustflow.toml`
- `.mustflow/config/commands.toml`
- `.mustflow/skills/INDEX.md`

## 过期检查

- 若本文件与当前代码、测试、命令合同或用户指令冲突，应将其视为过期并报告冲突。
- 仅当项目方向、非目标或仓库范围承诺确实变化时，才更新本文件。
