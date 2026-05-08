---
mustflow_doc: skills.index
locale: zh
canonical: false
revision: 9
lifecycle: mustflow-owned
authority: router
---

# 技能索引

只阅读当前任务相关的技能文档。如果没有适用的技能，请依据 `AGENTS.md` 和 `.mustflow/config/commands.toml` 执行最小且安全的更改。

## 选择规则

- 在任务开始和首次编辑前，将用户请求和预计更改的文件与下方触发条件对照。
- 如果命中一个或多个触发条件，请在编辑该范围前阅读对应的 `SKILL.md`。
- 如果任务中出现新的条件，例如命令失败、测试契约变化或文档变化，请暂停并阅读新匹配的技能后再继续。
- 如果没有触发条件适用，不要臆造技能。继续依据 `AGENTS.md`、`.mustflow/docs/agent-workflow.md` 和 `.mustflow/config/commands.toml` 工作。
- 技能文档只提供流程指导，不授权执行声明的命令意图之外的命令。
- 路由表应保持紧凑：每一行都说明触发条件、所需输入、编辑范围、风险、验证意图和预期输出。

| 触发条件 | 技能文档 | 所需输入 | 编辑范围 | 风险 | 验证意图 | 预期输出 |
| --- | --- | --- | --- | --- | --- | --- |
| 报告前需要审查代码更改 | `.mustflow/skills/code-review/SKILL.md` | 差异和任务目标 | 已更改文件 | 行为和回归 | `test`, `test_related`, `test_audit`, `lint` | 问题列表或无问题说明 |
| 已更改文件需要风险分类和验证选择 | `.mustflow/skills/diff-risk-review/SKILL.md` | 更改文件列表、差异摘要和任务目标 | 已更改表面和验证报告 | 验证不足或过度验证 | `changes_status`, `changes_diff_summary`, `test`, `test_related`, `test_audit`, `lint`, `build`, `docs_validate`, `mustflow_check` | 风险级别、验证选择和回滚说明 |
| 添加、更新、删除或审计测试 | `.mustflow/skills/test-maintenance/SKILL.md` | 行为变化或过期测试证据 | 测试文件和相关源码 | 契约漂移 | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` | 测试依据和验证结果 |
| 安全敏感行为变更需要滥用场景回归测试 | `.mustflow/skills/security-regression-tests/SKILL.md` | 已变更的边界、参与者和预期拒绝行为 | 测试文件和相关安全边界源码 | 虚假安全感和不安全覆盖 | `test`, `test_related`, `test_audit`, `lint`, `build` | 安全边界、滥用场景、测试和剩余风险 |
| 已配置的命令意图或验证步骤失败 | `.mustflow/skills/failure-triage/SKILL.md` | 失败意图和输出尾部 | 仅失败原因 | 误诊 | `mustflow_check`; 原失败意图 | 根因、修复和重跑结果 |
| `.mustflow/context/PROJECT.md` 需要谨慎的项目上下文 | `.mustflow/skills/project-context-authoring/SKILL.md` | 有依据的项目事实 | `.mustflow/context/PROJECT.md` | 权限漂移 | `mustflow_check` | 已更新的谨慎上下文 |
| 创建或维护技能流程或路由 | `.mustflow/skills/skill-authoring/SKILL.md` | 可重复任务证据 | `.mustflow/skills/**` | 重叠和命令漂移 | `mustflow_check`, `docs_validate` | 技能路由和流程更改 |
| 添加、转换、调整或替换网页图片资源 | `.mustflow/skills/web-asset-optimization/SKILL.md` | 图片资源请求和目标路径 | 网页图片资源 | 资源质量和大小 | `asset_optimize`, `build` | 优化资源说明 |
| 文档更改影响公开文档或工作流文档 | `.mustflow/skills/docs-update/SKILL.md` | 已变化的行为或字段 | 仅相关文档 | 公开文档过期 | `docs_validate`, `mustflow_check` | 文档更改和跳过的检查 |

引入新技能时，请在此处链接，并定义具体触发条件和路由字段。
避免在技能文档中写入原始 shell 命令；请引用 `.mustflow/config/commands.toml` 中定义的命令意图名称。
