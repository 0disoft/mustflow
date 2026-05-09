---
mustflow_doc: skill.failure-triage
locale: zh
canonical: false
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: failure-triage
description: 当已配置 command intent 或验证步骤失败时应用本 skill。
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.failure-triage
  command_intents:
    - mustflow_check
---

# 失败排查

<!-- mustflow-section: purpose -->
## 目标

在修改文件前识别失败命令或验证步骤最可能的根因。

<!-- mustflow-section: use-when -->
## 使用时机

- 已配置的 command intent 返回非零退出码。
- 验证、构建、测试或文档检查失败。
- 失败根因尚不明确。

<!-- mustflow-section: do-not-use-when -->
## 不适用时机

- 失败原因已完全明确，且已有针对性修复方案。
- 用户仅要求高层摘要。

<!-- mustflow-section: required-inputs -->
## 必要输入

- 原始 command intent
- 退出码
- 截断后的 stdout 与 stderr 输出
- 最近修改的文件
- 相关命令合同条目

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

1. 保留原始失败 intent 名称。
2. 分析第一条可执行错误。
3. 判断失败源自代码、测试、配置、文档还是环境。
4. 检查最相关文件。
5. 提出单一假设，并用最有针对性的已配置 intent 验证。

<!-- mustflow-section: postconditions -->
## 后置条件

- 可以用清晰证据、已执行的命令意图、跳过的检查和剩余风险产出预期输出。
- 任何缺失的命令意图、未知输入或权限冲突都会被报告，而不是被隐藏。

<!-- mustflow-section: verification -->
## 验证

尽可能重跑原始失败 intent。若范围过大，则运行能够隔离同一失败区域的最有针对性已配置 intent。

<!-- mustflow-section: failure-handling -->
## 失败处理

- 不要将无关修复打包在一起。
- 若失败由缺失工具导致，应报告缺失工具及触发问题的命令。
- 若输出中出现敏感数据，停止复制原始输出并进行安全摘要。

<!-- mustflow-section: output-format -->
## 输出格式

- 失败 intent
- 可能的根因
- 证据
- 已应用或建议的修复
- 已执行的验证
- 剩余风险
