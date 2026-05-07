---
mustflow_doc: skill.test-maintenance
locale: zh
canonical: false
revision: 1
name: test-maintenance
description: 当因行为、API、snapshot、兼容性或缺陷修复而需要新增、更新、删除或审计测试时应用本 skill。
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - test
    - test_related
    - test_audit
    - snapshot_update
    - lint
    - build
---

# 测试维护

## 目标

使测试与当前行为合同保持一致。

## 使用时机

- 行为被新增、修改、移除或废弃。
- 缺陷修复需要回归测试。
- 现有测试可能过时、重复、范围过宽，或依赖已移除的实现细节。
- snapshot 输出发生变化。

## 不适用时机

- 任务仅修改文案或注释。
- 仓库缺少已配置测试 intent，且用户已要求不新增测试。

## 必要输入

- 用户请求
- 当前行为合同
- 已修改或移除的代码路径
- 现有测试风格
- `.mustflow/config/commands.toml`
- `.mustflow/config/mustflow.toml` 中的 `[testing]`

## 流程

1. 定义期望的当前行为。
2. 在新增测试前先查找现有测试。
3. 对受影响测试分类：
   - `active`：仍能验证当前行为
   - `update_needed`：行为已变更
   - `obsolete_candidate`：可能验证了已移除或无关行为
   - `legacy_contract`：旧行为被有意保留
   - `flaky_or_environmental`：失败可能依赖环境
4. 按分类新增、更新、删除或上报测试。
5. 不要仅因旧测试期望而重新引入已移除行为。
6. 除非 `snapshot_update` 明确获批并已配置，否则将 snapshot 更新视为手动操作。
7. 保持测试可复现，并紧贴行为合同。

## 验证

在可用时使用已配置 oneshot command intents：

- `test`
- `test_related`
- `test_audit`
- `snapshot_update`（仅在明确批准时）
- `lint`
- `build`

不要推断缺失的测试命令。

## 失败处理

- 若测试失败，先检查第一条相关失败信息。
- 不要仅为通过验证而删除或弱化测试。
- 若无法确定测试是否过时，报告它而不是直接删除。
- 若测试命令不可用，报告缺失 intent。

## 输出格式

- 被测试的行为合同
- 新增测试
- 更新测试
- 删除测试及原因
- 过时测试候选项
- 已执行 command intents
- 跳过 command intents 及原因
- 剩余测试风险
