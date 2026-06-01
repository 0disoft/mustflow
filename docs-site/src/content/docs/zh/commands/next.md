---
title: mf next
description: mustflow root 的只读下一步操作指引。
---

`mf next` 会检查当前 mustflow root，并输出下一步安全操作。

它检查安装状态、mustflow 验证状态、已变更文件、验证需求、可运行的 configured intent，以及命令契约缺口。它不会运行命令、修改文件或授予命令权限。

当已变更文件没有可运行的 configured 验证时，`mf next` 会指向 `mf onboard commands` 和 verification-plan API，而不是猜测 package-manager 命令。

## 示例

```sh
npx mf next
npx mf next --json
```

## JSON 字段

```sh
npx mf next --json
```

- `schema_version` (`string`)：输出格式版本。
- `command` (`string`)：始终为 `next`。
- `status` (`string`)：`setup_required`、`blocked`、`idle`、`needs_verification` 或 `unavailable`。
- `policy` (`object`)：说明报告是只读的，且 `.mustflow/config/commands.toml` 仍是命令权限来源。
- `state` (`object`)：安装、验证、已变更文件、已选择 intent 和缺口摘要。
- `decision` (`object`)：主要下一步操作，在安全时包含建议命令。
- `recommended_commands` (`string[]`)：用于检查、配置或验证的辅助 mustflow 命令。
- `gaps` (`object[]`)：缺少可运行 configured 命令覆盖的验证需求。

## 帮助和退出码

```sh
npx mf next --help
```

- 退出码 `0`：已检查下一步操作。
- 退出码 `1`：仓库状态不可用，无法检查下一步操作。
