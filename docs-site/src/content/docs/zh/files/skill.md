---
title: .mustflow/skills/*/SKILL.md
description: 面向可重复 agent 任务的流程文档。
---

`.mustflow/skills/*/SKILL.md` 帮助 agent 在不猜测的情况下执行可重复任务。

## 使用位置

agent 会先从 `.mustflow/skills/INDEX.md` 选择相关 skill，然后在执行可重复工作前读取该 skill。

skill 文档覆盖代码审查、测试维护、失败排查和文档更新等流程。它们引用 `.mustflow/docs/agent-workflow.md`，而不是复制共享策略。

## 前置元数据

```yaml
mustflow_doc: skill.code-review
locale: en
canonical: true
revision: 1
name: code-review
description: Use when reviewing code changes, scope, risks, or missing verification.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - test
    - lint
```

- `mustflow_doc`: mustflow 内部的稳定 skill 标识符。
- `locale`: 文档语言。
- `canonical`: 该文档是否为权威源文档。
- `revision`: 权威文档修订号。
- `name`: skill 名称。它应与文件夹名称一致。
- `description`: agent 应何时读取该 skill。
- `metadata.mustflow_schema`: skill 元数据结构版本。
- `metadata.mustflow_kind`: 文档类型。默认 skill 使用 `procedure`。
- `metadata.command_intents`: 该 skill 可能引用的命令意图名称。

英文 skill 模板是权威源。本地化 skill 模板使用自己的语言，并设置 `canonical: false`。

## 标准章节

每个 skill 文档应包含：

- `Purpose`: 该 skill 处理的任务。
- `Use when`: 应触发该 skill 的场景。
- `Do not use when`: 防止过度使用的排除条件。
- `Required inputs`: agent 行动前必须收集的信息。
- `Procedure`: 工作顺序。
- `Validation`: 相关命令意图和检查。
- `Failure handling`: 命令失败或信息缺失时的处理方式。
- `Output contract`: 最终报告应包含的项目。

## 编写规则

每个 skill 应只覆盖一种任务类型。

不要在 skill 文档中写原始 shell 命令。在验证章节中引用 `.mustflow/docs/agent-workflow.md#command-execution-policy`，并只列出相关命令意图名称。

每个意图都必须通过 `.mustflow/config/commands.toml` 解析。如果没有 `status = "configured"`，不要运行它；报告状态和跳过原因。

示例：

```md
## Validation

Relevant command intents:

- `test`
- `lint`

Resolve each intent through `.mustflow/config/commands.toml`.
```

## 支持资源

默认 skill 只从 `SKILL.md` 开始。不要提前创建空的 `references/`、`assets/` 或 `scripts/` 文件夹。

当某个 skill 变长或需要独立支持材料时，添加可选的 `resources.toml`，并在其中登记引用、模板或脚本。脚本不应通过猜测路径调用；应把它们连接到 `.mustflow/config/commands.toml` 中的命令意图。

详细规则见 [Skill Resources](/design/skill-resources/)。
