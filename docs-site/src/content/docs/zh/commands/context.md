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
- 命令执行、Git 自动化和状态权威的有效策略摘要。
- 本地缓存和本地状态策略。
- 默认仓库契约阻止的动作。
- 最新 `mf run` 回执摘要。
- manifest lock 报告的问题。

## 运行回执摘要

`latest_run` 只暴露 `.mustflow/state/runs/latest.json` 中选定的元数据。

它不包含 standard output 或 standard error 尾部。如果代理需要命令输出，必须明确读取回执文件。

## Prompt Cache Profiles

当宿主需要适合缓存的 prompt layers，而不是完整 context report 时，可将 `--cache-profile stable|task|volatile|all` 与 `--json` 一起使用。

`task` profile 包含 `task_context.local_index`，这是 local index 的只读状态。`status` 为 `fresh`、`missing`、`stale` 或 `unreadable`；当索引不能复用时，`refresh_hint` 会提示运行 `mf index`。

## 示例

```sh
npx mf context --json
npx mf context --json --cache-profile task
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
- `effective_policy` (`object`)：命令执行、Git 自动化和状态权威的实际仓库策略。
- `state_policy` (`object`)：本地缓存和本地状态存储策略。
- `blocked_actions` (`string[]`)：仓库契约阻止的动作类别。
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
- `effective_policy.project_commands_require_mf_run` (`boolean`)：项目验证命令是否应使用 `mf run`。
- `effective_policy.allow_inferred_commands` (`boolean`)：是否允许代理推断 `commands.toml` 之外的命令。
- `effective_policy.auto_stage`、`effective_policy.auto_commit`、`effective_policy.auto_push` (`boolean`)：Git 自动化偏好。
- `state_policy.cache_path` (`string`)：本地缓存路径。
- `state_policy.state_path` (`string`)：本地状态路径。
- `state_policy.versioned` (`boolean`)：mustflow 本地状态是否应纳入版本管理。
- `state_policy.safe_to_delete` (`boolean`)：本地缓存和状态是否可重新生成。
- `state_policy.stores_raw_conversation`、`state_policy.stores_full_terminal_output`、`state_policy.stores_hidden_chain_of_thought` (`boolean`)：原始数据存储边界。
- `latest_run.path` (`string`)：最新运行回执路径。
- `latest_run.exists` (`boolean`)：最新运行回执是否存在。
- `latest_run.valid` (`boolean | null`)：回执是否能解析为 JSON object。
- `latest_run.status` (`string | null`)：最近一次运行结果。
- `latest_run.exit_code` (`number | null`)：最近一次运行的进程退出码。

## 退出码

- `0`：上下文已检查并打印。
- `1`：命令收到未知选项。
