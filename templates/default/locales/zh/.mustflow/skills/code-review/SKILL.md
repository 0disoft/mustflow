---
mustflow_doc: skill.code-review
locale: zh
canonical: false
revision: 3
name: code-review
description: 当需要审查代码变更、范围、风险或验证缺口时应用本 skill。
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.code-review
  command_intents:
    - test
    - test_related
    - test_audit
    - lint
---

# 代码审查

## 目标

验证改动是否与请求一致，并确保不存在行为风险或验证缺口。

## 使用时机

- 代码变更、diff、pull request 或潜在回归风险需要审查时。
- 主要目标是风险评估，而非实现新行为。

## 不适用时机

- 任务仅涉及措辞、翻译或格式调整。
- 没有可供审查的变更文件或 diff。

## 必要输入

- 修改文件或 diff
- 用户指定的审查标准
- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/commands.toml`

## 前置条件

- 任务符合使用时机，且不符合不适用时机中的排除条件。
- 所需输入已经可用，或可以报告缺失输入而不进行猜测。
- 已针对当前范围检查更高优先级的指令和 `.mustflow/config/commands.toml`。

## 允许编辑范围

- 编辑必须限制在此技能、用户请求以及 `.mustflow/skills/INDEX.md` 中匹配路由描述的范围内。
- 不要扩大命令权限、编造项目事实或更改无关的工作流文件。

## 流程

1. 审查已修改文件列表。
2. 识别无关或多余编辑。
3. 评估对行为、配置、命令和文档的影响。
4. 审查测试相关性：
   - 新功能缺失测试
   - 已移除功能仍保留的过时测试
   - 无法覆盖新风险的冗余测试
   - 过弱或不足的断言
   - 缺乏明确理由的 snapshot 更新
   - 无意中重新引入已移除行为的测试
5. 验证相关 command intents 是否存在。
6. 按严重级别记录发现项。

## 后置条件

- 可以用清晰证据、已执行的命令意图、跳过的检查和剩余风险产出预期输出。
- 任何缺失的命令意图、未知输入或权限冲突都会被报告，而不是被隐藏。

## 验证

遵循 `.mustflow/docs/agent-workflow.md#command-execution-policy`。

相关 command intents：

- `test`
- `test_related`
- `test_audit`
- `lint`

不要引入原始 shell 命令；应引用 `.mustflow/config/commands.toml` 中定义的 command intent 名称。

## 失败处理

- 若 command intent 缺失、仅允许手动执行、已禁用或未知，应报告状态，不要猜测。
- 记录所有跳过的验证及其对应剩余风险。
- 若发现敏感数据或破坏性命令风险，应立即停止并上报。

## 输出格式

- 摘要
- 按严重级别分类的发现项
- 已审查文件列表
- 已执行的 command intents
- 跳过的 command intents 及理由
- 测试相关性说明
- 已识别的剩余风险
