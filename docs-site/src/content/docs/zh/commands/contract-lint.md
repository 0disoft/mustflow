---
title: mf contract-lint
description: 对 commands.toml 中的命令契约进行只读检查。
---

`mf contract-lint` 只检查 `.mustflow/config/commands.toml`，不会运行任何已配置命令。

当你需要聚焦查看命令契约错误和警告时使用它。它比 `mf check` 范围更窄：格式错误的 `configured` 命令意图是错误，`unknown` 和 `manual_only` 命令意图会作为警告显示。

如果还要查看变更分类中的验证原因是否连接到 `required_after` 元数据，请添加 `--coverage`。覆盖发现默认是警告，不会让任何命令变成可运行。

当某个 intent 使用 `bun run <script>` 这类包脚本形式时，`mf contract-lint` 也会检查该 intent 的 `cwd` 中是否存在对应的 `package.json`。引用的脚本不存在时只会产生警告，不会推断命令执行权限，也不会自动修复。

添加 `--suggest` 后，它会读取根目录 `package.json`、Makefile 或 justfile 条目，并打印仅供审阅的 intent 片段。建议片段使用 `status = "unknown"`，并省略 `argv`、`lifecycle`、`run_policy` 等可运行字段，因此在用户编辑进 `.mustflow/config/commands.toml` 之前不会授予命令执行权限。

## 示例

```sh
npx mf contract-lint
npx mf contract-lint --coverage
npx mf contract-lint --suggest
npx mf contract-lint --json
npx mf contract-lint --coverage --json
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
- `report.suggestions` (`object[]`，可选)：仅在使用 `--suggest` 时存在。包含来源文件、来源条目、命令提示、建议的 intent 名称、`status = "unknown"`、原因和仅供审阅的 TOML 片段。
- `report.coverage` (`object`，可选)：仅在使用 `--coverage` 时存在。包含已知分类原因、已文档化的验证原因、已声明的 `required_after` 原因、可运行原因和覆盖发现。
- `report.coverage.findings` (`object[]`)：以警告为主的覆盖发现，包含稳定的 `code`、`reason`、`intent`、`intents` 和 `message` 字段。

## 帮助和退出码

```sh
npx mf contract-lint --help
```

- 退出码 `0`：未发现阻塞性的命令契约错误。
- 退出码 `1`：发现命令契约错误，或输入无效。
