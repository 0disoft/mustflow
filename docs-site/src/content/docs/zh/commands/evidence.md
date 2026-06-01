---
title: mf evidence
description: 面向变更文件和最新运行的只读验证证据报告。
---

`mf evidence` 汇总需要验证的内容、哪些已配置 intent 覆盖这些内容，以及最新证据对该计划的判断。

它不执行命令，也不授予命令权限。默认情况下，它读取 changed files，构建 mustflow verification 使用的同一验证计划模型，并在存在 `.mustflow/state/runs/latest.json` 时进行比较。`--export <path>` 只会把 JSON report 写到 mustflow root 内部路径。

## Example

```sh
npx mf evidence --changed
npx mf evidence --changed --json
npx mf evidence --latest --json
npx mf evidence --plan .mustflow/state/verification-plan.json --json
```

## JSON Fields

- `schema_version` (`string`): 输出格式版本。
- `command` (`string`): 始终为 `evidence`。
- `status` (`string`): 证据和覆盖情况的汇总状态。
- `policy` (`object`): 声明只读、不执行命令，并以 `.mustflow/config/commands.toml` 作为权限来源。
- `plan` (`object | null`): 验证需求、已选择的 intent 和缺口。
- `latest` (`object`): 不含 raw output 的有界最新证据。
- `coverage` (`object`): 需求、receipt、风险和缺口计数。
- `recommended_commands` (`string[]`): 下一步安全的 mustflow 命令。

## Help and Exit Codes

```sh
npx mf evidence --help
```

- Exit code `0`: Evidence 已检查。
- Exit code `1`: 无法检查 evidence。
