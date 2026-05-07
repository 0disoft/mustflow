---
title: mf help
description: 通过读取已安装的 mustflow 文档和配置显示帮助。
---

`mf help` 不是一份独立的长篇手册。它会读取当前根目录中已安装的 mustflow 文件，并显示相关视图。

## 主题

```sh
npx mf help workflow
npx mf help skills
npx mf help commands
npx mf help preferences
npx mf --lang en help
npx mf --lang ko help
npx mf --lang zh help
npx mf --lang es help
npx mf --lang fr help
npx mf --lang hi help
```

- `workflow`：打印 `.mustflow/docs/agent-workflow.md`。
- `skills`：打印 `.mustflow/skills/INDEX.md`。
- `commands`：汇总 `.mustflow/config/commands.toml` 中的 command intents 与状态。
- `preferences`：汇总 `.mustflow/config/preferences.toml` 中的偏好设置。

## 原则

帮助输出不会引入新的事实来源。每个主题都由已安装的 mustflow 文件支撑。

这可以减少文档、配置和 CLI 帮助之间的漂移。

## CLI 输出语言

`--lang` 用于选择固定 CLI 文本的语言，例如帮助标题和错误指引。
当前可用值为 `en`、`ko`、`zh`、`es`、`fr` 和 `hi`。

```sh
npx mf --lang en help
npx mf --lang ko help
npx mf --lang zh help
npx mf --lang es help
npx mf --lang fr help
npx mf --lang hi help
```

这与 `mf init --locale` 不同。`--lang` 控制终端输出；`--locale` 控制安装到项目中的 mustflow 文档语言。

当 `mf help commands` 或 `mf help preferences` 从已安装的项目文件读取描述时，这些值不会被机器翻译。只有周围的 CLI 标签会使用所选 CLI 语言。

## 结构化输出

`mf help` 目前不提供 JSON 输出格式。

需要结构化命令信息的代理和自动化流程，应使用 `mf context --json` 获取可运行 intent 名称；需要完整合同时，再读取 `.mustflow/config/commands.toml`。

## 帮助与退出码

```sh
npx mf help --help
```

英文帮助输出顺序为 `Usage`、`Topics`、`Options`、`Examples` 和 `Exit codes`。
中文帮助使用相同顺序，并显示本地化标题。

- 退出码 `0`：已打印请求的帮助主题，或已报告缺失的已安装主题文件。
- 退出码 `1`：命令收到未知主题或选项。

主题列表内置于 CLI，但每个主题正文都从当前根目录的 `.mustflow/` 文件读取。
