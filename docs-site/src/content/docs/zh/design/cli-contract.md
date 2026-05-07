---
title: CLI 输出合同
description: 说明 mf 命令应如何格式化帮助、错误和退出码。
---

`mf` 命令应让代理和人类能从同一份输出中决定下一步动作。

因此，每个命令帮助页面都遵循统一顺序。

## 帮助形状

每个命令帮助输出在适用时应包含这些字段：

- `Usage`：命令形状。
- `Commands` 或 `Topics`：子命令或帮助主题。
- `Options`：支持的选项。
- `Examples`：可复制运行的命令。
- `Exit codes`：进程退出码含义。

例如，`mf check --help` 应展示 check 命令接受哪些选项，以及如何报告成功或失败。

## Mustflow Root 解析

`mf init` 会在当前目录安装新的 mustflow 文档流。

其他安装后命令会从当前目录向上查找，并使用最近的 `.mustflow/` 标记作为当前 mustflow root。
它们会相对于该 root 读取和写入文件。

该规则适用于：

- `mf check`
- `mf status`
- `mf context`
- `mf update`
- `mf map`
- `mf help`
- `mf run`

例如，当用户在 `src/feature/deep` 中运行 `mf check --strict` 时，该命令仍会验证包含 `.mustflow/config/mustflow.toml` 的上级 root。
`mf map --write` 与 `mf run <intent> --json` 也会在同一 root 中写入 `REPO_MAP.md` 和 `.mustflow/state/runs/latest.json`。

## CLI 输出语言

`--lang` 是选择固定 CLI 文本语言的全局选项。
当前值为 `en`、`ko`、`zh`、`es`、`fr` 和 `hi`。

```sh
mf --lang en help
mf --lang ko help
mf --lang zh help
mf --lang es help
mf --lang fr help
mf --lang hi help
```

`--lang` 不同于 `mf init --locale`。`--lang` 控制终端帮助与错误指引；`--locale` 控制安装的 mustflow 文档语言。

从已安装 `.mustflow/` 文件中读取的值不会被机器翻译。例如，`commands.toml` 中的 `description` 会按原文显示，而 `Commands`、`Preferences` 或 `Path` 等周围标签会跟随 CLI 语言。

## 错误形状

当用户传入未知命令或选项时，错误以标准消息开头。

```text
Error: Unknown option: --bad
Run `mf check --help` for usage.
```

中文输出保持相同形状，但固定文本会本地化。

```text
错误: Unknown option: --bad
请运行 `mf check --help` 查看用法。
```

原因会打印到 `stderr`，相关用法文本可能打印到 `stdout`。当自动化需要结构化输出时，请使用支持 `--json` 的命令。

## 退出码

- `0`：命令正常完成、打印请求信息、通过验证，或计算出未阻塞的计划。
- `1`：命令收到无效输入、发现验证问题、发现阻塞变更，或被要求执行尚不支持的操作。

当前 CLI 退出码保持宽泛。更细粒度的退出码应等待真实自动化用例证明其必要性。

## JSON 输出

`mf check`、`mf status` 和 `mf update --dry-run` 支持 `--json`。

JSON 输出是代理和脚本使用的接口。它们应读取 JSON 字段，而不是解析人类可读帮助文本。
