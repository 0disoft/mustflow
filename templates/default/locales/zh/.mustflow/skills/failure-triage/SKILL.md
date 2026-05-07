---
mustflow_doc: skill.failure-triage
locale: zh
canonical: false
revision: 1
name: failure-triage
description: 当已配置 command intent 或验证步骤失败时应用本 skill。
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - mustflow_check
---

# 失败排查

## 目标

在修改文件前识别失败命令或验证步骤最可能的根因。

## 使用时机

- 已配置的 command intent 返回非零退出码。
- 验证、构建、测试或文档检查失败。
- 失败根因尚不明确。

## 不适用时机

- 失败原因已完全明确，且已有针对性修复方案。
- 用户仅要求高层摘要。

## 必要输入

- 原始 command intent
- 退出码
- 截断后的 stdout 与 stderr 输出
- 最近修改的文件
- 相关命令合同条目

## 流程

1. 保留原始失败 intent 名称。
2. 分析第一条可执行错误。
3. 判断失败源自代码、测试、配置、文档还是环境。
4. 检查最相关文件。
5. 提出单一假设，并用最有针对性的已配置 intent 验证。

## 验证

尽可能重跑原始失败 intent。若范围过大，则运行能够隔离同一失败区域的最有针对性已配置 intent。

## 失败处理

- 不要将无关修复打包在一起。
- 若失败由缺失工具导致，应报告缺失工具及触发问题的命令。
- 若输出中出现敏感数据，停止复制原始输出并进行安全摘要。

## 输出格式

- 失败 intent
- 可能的根因
- 证据
- 已应用或建议的修复
- 已执行的验证
- 剩余风险
