---
title: mf verify
description: 运行由 required_after 元数据选出的已配置验证意图。
---

`mf verify --reason <event>` 会读取 `.mustflow/config/commands.toml`，找出 `required_after` 列表包含指定原因的命令意图，并且只运行已配置、单次执行、允许代理运行、stdin 已关闭的意图。

`mf verify --from-classification <path>` 会从 mustflow 根目录内的 `mf classify` JSON 报告读取验证原因。`--from-plan` 在命名过渡期间仍作为兼容别名可用。

`mf verify --changed` 使用与 `mf classify --changed` 相同的语义分类当前 Git 工作树，然后把这些验证原因交给验证选择模型。使用 `--write-plan <path>` 可以把分类报告保存到 mustflow 根目录内，同时当前运行仍使用内存中的选择模型。

`mf verify --plan-only --json` 只打印验证计划，不执行命令。输出包含稳定的 `verification_plan_id` 和 `decision_graph`，用于连接变更表面、分类原因、命令候选、可运行性检查、效果和剩余缺口。存在最新本地索引时，每个计划条目可以包含从 `.mustflow/cache/mustflow.sqlite` 读取的 `effectGraph`，用于说明写入锁和锁冲突。要求项也可以包含 `surfaceReadModels` 元数据，用于说明哪些索引路径-表面规则匹配了变更文件。索引缺失或过期时只显示重建提示，不改变命令选择或执行权限。

`mf verify` 实际执行命令时，会使用与 plan-only 输出相同的计划模型，并通过 `mf run` 收据串行执行 `schedule.entries`。verify 输出、验证包清单、latest 指针和各意图收据共享同一个 `verification_plan_id`。

JSON 中的 `execution_status` 是命令执行的汇总状态。为了兼容旧消费者，`status` 保留为同一执行汇总状态的旧别名。需要判断请求的工作是否已完整验证的自动化，应读取 `completion_verdict.status`；只有 `verified` 表示完整验证。

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
npx mf classify --changed --write .mustflow/state/change-classification.json
npx mf verify --reason docs_change --plan-only --json
npx mf verify --from-classification .mustflow/state/change-classification.json --json
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
- `plan_source` (`string | null`)：使用 `--from-classification` 或 `--from-plan` 时的 JSON 分类报告路径，使用 `--changed` 时为 `changed`，只使用 `--reason` 时为 `null`。
- `verification_plan_id` (`string`)：选择本次运行的验证计划的稳定 SHA-256 标识符。
- `execution_status` (`string`)：命令执行的汇总状态：`passed`、`partial`、`failed` 或 `blocked`。
- `status` (`string`)：为兼容保留的 `execution_status` 旧别名。
- `completion_verdict` (`object`)：基于证据的完成裁定。自动化做最终判断时应使用 `completion_verdict.status`；只有 `verified` 表示完整验证。
- `summary` (`object`)：匹配、运行、通过、失败和跳过的数量。
- `run_dir` (`string`)：包含清单和各意图收据的验证包目录。
- `manifest_path` (`string`)：验证包清单路径。
- `results` (`object[]`)：每个意图的运行或跳过结果。
- `results[].verification_plan_id` (`string | null`)：运行结果的计划标识符；跳过结果为 `null`。
- `results[].receipt_path` (`string | null`)：结果已运行并生成收据时的各意图收据路径。
- `results[].receipt_sha256` (`string | null`)：已写入各意图收据的 SHA-256 哈希。

使用 `--plan-only --json` 时，输出采用变更验证报告 schema。`verification_plan_id` 根据变更文件分类、选定的验证模型、相关命令契约条目、计划策略和测试选择报告计算。`decision_graph` 字段是共享证据模型，用于说明变更表面、分类原因、命令候选、可运行性、效果和缺口。`schedule.entries[].effectGraph` 字段如果存在，就是只读本地索引元数据，用于说明锁和冲突。`requirements[].surfaceReadModels` 字段如果存在，就是只读本地索引元数据，用于说明验证原因背后的路径-表面规则。

## 退出码

- `0`：`completion_verdict.status` 为 `verified`。
- `1`：完成裁定为部分验证、未验证、被阻止、相互矛盾，或输入无效。
