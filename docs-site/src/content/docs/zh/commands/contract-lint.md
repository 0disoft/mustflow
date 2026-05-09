---
title: mf contract-lint
description: 对 commands.toml 中的命令契约进行只读检查。
---

`mf contract-lint` 只检查 `.mustflow/config/commands.toml`，不会运行任何已配置命令。

当你需要聚焦查看命令契约错误和警告时使用它。它比 `mf check` 范围更窄：格式错误的 `configured` 命令意图是错误，`unknown` 和 `manual_only` 命令意图会作为警告显示。

## 示例

```sh
npx mf contract-lint
npx mf contract-lint --json
```

## JSON 字段

```sh
npx mf contract-lint --json
```

- `schema_version` (`string`)：输出格式版本。
- `command` (`string`)：始终为 `contract-lint`。
- `mustflow_root` (`string`)：当前 mustflow 根目录。
- `report.status` (`string`)：`passed`、`warning` 或 `failed`。
- `report.summary` (`object`)：命令意图数、可运行数、错误数和警告数。
- `report.issues` (`object[]`)：包含 `severity`、`code`、`intent` 和 `message` 的问题。
- `report.sourceFiles` (`string[]`)：定义命令契约规则的文件。

## 帮助和退出码

```sh
npx mf contract-lint --help
```

- 退出码 `0`：未发现阻塞性的命令契约错误。
- 退出码 `1`：发现命令契约错误，或输入无效。
