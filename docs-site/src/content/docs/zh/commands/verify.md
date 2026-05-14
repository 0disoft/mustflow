---
title: mf verify
description: 运行由 required_after 元数据选出的已配置验证意图。
---

`mf verify --reason <event>` 会读取 `.mustflow/config/commands.toml`，找出 `required_after` 列表包含指定原因的命令意图，并且只运行已配置、单次执行、允许代理运行、stdin 已关闭的意图。

`mf verify --from-plan <path>` 会从 mustflow 根目录内的 JSON 文件读取验证原因。它识别 `reason`、`reasons`、`validationReasons`、`summary.validationReasons` 和 `classification_summary.validationReasons`。

`mf verify --changed` 使用与 `mf classify --changed` 相同的语义分类当前 Git 工作树，然后把这些验证原因交给现有验证计划器。使用 `--write-plan <path>` 可以把分类报告保存到 mustflow 根目录内，同时当前运行仍使用内存中的计划。

`mf verify --plan-only --json` 只打印验证计划，不执行命令。输出包含 `decision_graph`，用于连接变更表面、分类原因、命令候选、可运行性检查、效果和剩余缺口。存在最新本地索引时，每个计划条目可以包含从 `.mustflow/cache/mustflow.sqlite` 读取的 `effectGraph`，用于说明写入锁和锁冲突。要求项也可以包含 `surfaceReadModels` 元数据，用于说明哪些索引路径-表面规则匹配了变更文件。索引缺失或过期时只显示重建提示，不改变命令选择或执行权限。

## 选择规则

- 原因字符串必须与 `required_after` 精确匹配。
- 计划文件必须位于 mustflow 根目录内，并且必须是 JSON。
- `--changed` 使用当前 Git 状态路径；它不会让任何命令变为可运行。
- `--write-plan` 只能与 `--changed` 一起使用，输出路径必须位于 mustflow 根目录内。
- 可运行意图使用与 `mf run <intent>` 相同的安全执行路径。
- 未知、仅手动、长时运行、被阻止或配置不完整的意图不会被猜测执行，而是报告为已跳过。
- 如果没有意图匹配该原因，结果为 `blocked`。

## 示例

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
npx mf verify --changed --plan-only --json
npx mf verify --changed --write-plan .mustflow/state/change-plan.json --json
npx mf verify --reason docs_change --plan-only --json
npx mf verify --from-plan verify-plan.json --json
```

## JSON 字段

```sh
npx mf verify --reason code_change --json
```

机器可读输出使用这些字段：

- `schema_version` (`string`)：验证报告格式版本。
- `command` (`string`)：始终为 `verify`。
- `mustflow_root` (`string`)：解析出的 mustflow 根目录。
- `reason` (`string`)：请求的 `required_after` 原因；使用计划文件时为逗号分隔的摘要。
- `reasons` (`string[]`)：用于选择命令意图的验证原因。
- `plan_source` (`string | null`)：使用 `--from-plan` 时的 JSON 计划路径，使用 `--changed` 时为 `changed`，只使用 `--reason` 时为 `null`。
- `status` (`string`)：`passed`、`partial`、`failed` 或 `blocked`。
- `summary` (`object`)：匹配、运行、通过、失败和跳过的数量。
- `results` (`object[]`)：每个意图的运行或跳过结果。

使用 `--plan-only --json` 时，输出采用变更验证报告 schema。`decision_graph` 字段是共享证据模型，用于说明变更表面、分类原因、命令候选、可运行性、效果和缺口。`schedule.entries[].effectGraph` 字段如果存在，就是只读本地索引元数据，用于说明锁和冲突。`requirements[].surfaceReadModels` 字段如果存在，就是只读本地索引元数据，用于说明验证原因背后的路径-表面规则。

## 退出码

- `0`：选中的可运行意图全部通过，且没有选中意图被跳过。
- `1`：验证失败、部分完成、被阻止，或输入无效。
