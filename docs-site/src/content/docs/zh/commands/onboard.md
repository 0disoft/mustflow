---
title: mf onboard commands
description: 仅供审阅的命令 onboarding 建议。
---

`mf onboard commands` 会检查根目录中已有的命令文件，并输出仅供审阅的 command-intent 建议。

当仓库刚安装 mustflow，且还有许多 `unknown` 命令 intent 时使用它。该命令通过与 `mf contract-lint --suggest` 相同的建议模型读取 `package.json`、Makefile 和 justfile 条目。

这些建议不会授予命令执行权限。每个片段都使用 `status = "unknown"`，并省略 `argv`、`lifecycle`、`run_policy`、`stdin`、`timeout_seconds`、`writes`、`network`、`destructive` 等可执行字段。维护者必须先审阅命令行为，才能把片段复制或扩展到 `.mustflow/config/commands.toml`。

该命令不会写入文件。

## 示例

```sh
npx mf onboard commands
npx mf onboard commands --json
```

## JSON 字段

```sh
npx mf onboard commands --json
```

- `schema_version` (`string`)：输出格式版本。
- `command` (`string`)：始终为 `onboard commands`。
- `mustflow_root` (`string`)：当前 mustflow root。
- `command_contract_path` (`string`)：始终为 `.mustflow/config/commands.toml`。
- `policy` (`object`)：说明建议仅供审阅，不授予命令权限，也不会写入文件。
- `summary` (`object`)：intent 数量、建议数量、命令契约警告或错误数量。
- `suggestions` (`object[]`)：仅供审阅的候选片段，包含来源文件、来源条目、建议 intent 名称、原因和 TOML 片段。
- `next_steps` (`string[]`)：审阅和验证已接受片段的后续指引。

## 帮助和退出码

```sh
npx mf onboard --help
```

- 退出码 `0`：已检查并输出建议。
- 退出码 `1`：命令收到无效输入。
