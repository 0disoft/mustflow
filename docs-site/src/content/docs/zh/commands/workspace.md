---
title: mf workspace
description: 对已配置 workspace 根目录和嵌套仓库合同进行只读检查。
---

`mf workspace status` 检查已配置的 workspace 根目录和发现的嵌套仓库。
`mf workspace command-catalog` 汇总每个已发现仓库的命令 intent 可用性。
`mf workspace verify --changed --plan-only` 汇总每个已发现仓库的变更文件验证计划。

它不会运行命令、修改文件、暴露原始命令字符串，也不会让父仓库向子仓库授予命令权限。每个发现的仓库都保留自己的 `.mustflow/config/commands.toml` 作为唯一命令权限来源。

## 示例

```sh
npx mf workspace status
npx mf workspace status --json
npx mf workspace command-catalog --json
npx mf workspace verify --changed --plan-only --json
```

## JSON 字段

```sh
npx mf workspace status --json
```

- `schema_version` (`string`)：输出格式版本。
- `command` (`string`)：始终为 `workspace status`。
- `workspace` (`object`)：来自 `.mustflow/config/mustflow.toml` 的 workspace 扫描设置。
- `policy` (`object`)：说明报告是只读的，不授予命令权限。
- `repositories` (`object[]`)：发现的嵌套 git 仓库及其本地 mustflow 合同状态。
- `issues` (`string[]`)：只读发现或解析问题。

对于 `mf workspace command-catalog --json`，`command` 始终是 `workspace command-catalog`，每个仓库包含 intent 可用性、`mf run <intent>` 入口点，以及必须运行该命令的仓库路径。

对于 `mf workspace verify --changed --plan-only --json`，`command` 始终是 `workspace verify`，每个仓库包含变更文件、已选择的 intent、缺口，以及必须运行所选 `mf run <intent>` 命令的仓库路径。

## 帮助和退出码

```sh
npx mf workspace --help
```

- 退出码 `0`：已检查 workspace 状态。
- 退出码 `1`：命令收到无效输入。
