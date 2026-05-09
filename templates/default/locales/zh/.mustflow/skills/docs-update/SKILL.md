---
mustflow_doc: skill.docs-update
locale: zh
canonical: false
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: docs-update
description: 当需要更新 mustflow 或项目文档时应用本 skill。
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.docs-update
  command_intents:
    - docs_validate
    - mustflow_check
---

# 文档更新

<!-- mustflow-section: purpose -->
## 目标

确保文档准确反映当前工作流、命令与用户可见行为。

<!-- mustflow-section: use-when -->
## 使用时机

- 代理工作流文件被修改。
- 命令合同或配置字段被更新。
- 用户可见行为发生变化且需要更新文档。

<!-- mustflow-section: do-not-use-when -->
## 不适用时机

- 任务仅涉及私有实现细节。
- 用户明确要求不要修改文档。

<!-- mustflow-section: required-inputs -->
## 必要输入

- 已修改行为或配置字段
- 相关源文件或模板文件
- 当前文档页面或 Markdown 文件
- `.mustflow/config/commands.toml`

<!-- mustflow-section: preconditions -->
## 前置条件

- 任务符合使用时机，且不符合不适用时机中的排除条件。
- 所需输入已经可用，或可以报告缺失输入而不进行猜测。
- 已针对当前范围检查更高优先级的指令和 `.mustflow/config/commands.toml`。

<!-- mustflow-section: allowed-edits -->
## 允许编辑范围

- 编辑必须限制在此技能、用户请求以及 `.mustflow/skills/INDEX.md` 中匹配路由描述的范围内。
- 不要扩大命令权限、编造项目事实或更改无关的工作流文件。

<!-- mustflow-section: procedure -->
## 流程

1. 定位负责说明该行为的文档。
2. 只更新最相关的章节。
3. 确保命令名与路径准确无误。
4. 避免加入营销语言或教程填充内容。
5. 不要手动修改 generated files。

<!-- mustflow-section: postconditions -->
## 后置条件

- 可以用清晰证据、已执行的命令意图、跳过的检查和剩余风险产出预期输出。
- 任何缺失的命令意图、未知输入或权限冲突都会被报告，而不是被隐藏。

<!-- mustflow-section: verification -->
## 验证

若 `docs_validate` 与 `mustflow_check` 已配置且允许代理执行，则执行它们。
否则，需报告跳过原因。

<!-- mustflow-section: failure-handling -->
## 失败处理

- 若文档校验失败，先修复第一个相关的坏链或语法错误。
- 若命令合同变更，验证文档与 `.mustflow/config/commands.toml` 一致性。
- 若翻译状态不清晰，应标记为待复核，而不是猜测其是否最新。

<!-- mustflow-section: output-format -->
## 输出格式

- 已修改文档
- 已记录的行为或字段
- 已执行 command intents
- 已跳过检查及原因
- 需要后续处理的翻译项
