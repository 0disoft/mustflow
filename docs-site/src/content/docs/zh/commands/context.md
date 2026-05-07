---
title: mf context
description: 为当前 mustflow 根目录打印 JSON 代理工作上下文。
---

`mf context --json` 会打印结构化上下文，供代理在当前根目录开始工作前检查。

此命令不会修改文件。它也不能替代直接阅读文档；它只是一个轻量索引，指向代理应优先检查的文件和 command intents。

## 包含数据

- 当前 mustflow 根目录。
- 安装状态。
- `manifest.lock.toml` 状态。
- `mustflow.toml` 中的权威文档路径。
- `mustflow.toml` 中的能力表面。
- 必读顺序与文件存在状态。
- 可选阅读顺序与文件存在状态。
- 通过 authority 与 optional reading 字段暴露的上下文索引和项目上下文路径。
- `commands.toml` 中的 command intent 状态摘要。
- 可运行的有限 command intent 名称。
- 最新 `mf run` 回执摘要。
- manifest lock 报告的问题。

## 运行回执摘要

`latest_run` 只暴露 `.mustflow/state/runs/latest.json` 中选定的元数据。

它不包含 standard output 或 standard error 尾部。如果代理需要命令输出，必须明确读取回执文件。

## 示例

```sh
npx mf context --json
```

## JSON 字段

机器可读输出使用这些字段：

- `schema_version` (`number`)：输出格式版本。
- `command` (`string`)：始终为 `context`。
- `mustflow_root` (`string`)：命令执行时所在的当前根目录。
- `installed` (`boolean`)：`AGENTS.md` 与 `.mustflow/` 是否存在。
- `manifest_lock` (`string`)：锁文件状态，取值为 `present`、`missing` 或 `invalid`。
- `template` (`object | null`)：锁文件中记录的模板标识符与版本。
- `authority` (`object`)：权威文档路径。
- `capabilities` (`object`)：当前根目录的代理能力表面。
- `read_order` (`object[]`)：必读文件与存在标记。
- `optional_read_order` (`object[]`)：可选阅读文件与存在标记。
- `command_contract` (`object`)：command intent 摘要与可运行 intent 名称。
- `latest_run` (`object`)：最新运行回执摘要。
- `issues` (`string[]`)：manifest lock 报告的问题。

重复与嵌套字段使用这些形状：

- `read_order[].path` (`string`)：要读取的相对路径。
- `read_order[].exists` (`boolean`)：该文件是否存在于当前根目录。
- `command_contract.intents[].name` (`string`)：command intent 名称。
- `command_contract.intents[].status` (`string`)：command intent 配置状态。
- `command_contract.intents[].lifecycle` (`string | null`)：命令是有限命令还是长时运行命令。
- `command_contract.intents[].run_policy` (`string | null`)：代理执行策略。
- `command_contract.runnable_intents` (`string[]`)：代理可通过 `mf run <intent>` 运行的 intent 名称。
- `latest_run.path` (`string`)：最新运行回执路径。
- `latest_run.exists` (`boolean`)：最新运行回执是否存在。
- `latest_run.valid` (`boolean | null`)：回执是否能解析为 JSON object。
- `latest_run.status` (`string | null`)：最近一次运行结果。
- `latest_run.exit_code` (`number | null`)：最近一次运行的进程退出码。

## 退出码

- `0`：上下文已检查并打印。
- `1`：命令收到未知选项。
