---
title: .mustflow/config/commands.toml
description: 测试、代码检查、构建和文档检查的命令意图合同。
---

`.mustflow/config/commands.toml` 是命令意图合同，用于防止 agent 猜测项目命令。

## 使用位置

- `AGENTS.md` 使用这个文件执行“不要猜测命令”规则。
- `agent-workflow.md` 将这个文件视为命令执行策略的事实来源。
- 每个 `SKILL.md` 引用 `test`、`lint`、`build` 等意图名称，而不是原始命令。
- `mf check` 等工具可以读取这个文件，验证可执行性和缺失字段。

## 结构

```toml
schema_version = "1"

[defaults]
missing_behavior = "do_not_guess"
allow_inferred_commands = false
default_cwd = "."
default_timeout_seconds = 600
stdin = "closed"
require_lifecycle = true
require_timeout_for_oneshot = true
deny_unmanaged_long_running = true
max_output_bytes = 1048576
on_timeout = "terminate_process_tree"
kill_after_seconds = 5

[intents.test]
status = "unknown"
description = "Run tests."
reason = "No test command has been declared for this repository."
agent_action = "do_not_guess_report_missing"
required_after = ["code_change", "behavior_change"]
```

## 默认字段

- `schema_version`: 该文件格式版本。
- `defaults.missing_behavior`: 意图缺失时 agent 应采取的行为。
- `defaults.allow_inferred_commands`: agent 是否可以推断命令。默认应为 `false`。
- `defaults.default_cwd`: 意图未指定工作目录时使用的默认工作目录。
- `defaults.default_timeout_seconds`: 用于新意图声明的脚手架和验证默认值。`mf run` 仍要求每个可运行的 `oneshot` 意图显式声明 `timeout_seconds`。
- `defaults.stdin`: 用于新意图声明的脚手架和验证默认值。agent 可运行的意图仍必须显式声明 `stdin = "closed"`。
- `defaults.require_lifecycle`: 可执行意图是否必须声明命令生命周期。
- `defaults.require_timeout_for_oneshot`: 有限命令是否必须声明超时时间。
- `defaults.deny_unmanaged_long_running`: 是否阻止未受管理的长时间运行命令。
- `defaults.max_output_bytes`: 运行器对每个标准输出或标准错误流接受的默认输出限制。超过 16 MiB（16,777,216 字节）的值会被拒绝。
- `defaults.on_timeout`: 超时处理策略。
- `defaults.kill_after_seconds`: 进程清理默认可使用的额外等待时间。意图可以用自己的
  `kill_after_seconds` 覆盖该值。

## 意图状态

- `configured`: 已声明可执行命令。
- `unknown`: 尚不存在命令合同。
- `not_applicable`: 该仓库不需要这种验证。
- `manual_only`: 必须由人工决定是否运行以及如何运行。新的人工作业命令声明应将它用作 status。
- `disabled`: 命令已知，但当前不得运行。

agent 只能运行 `status = "configured"` 的意图，但仅有 status 还不够。`mf run` 还要求 `oneshot` 生命周期、`run_policy = "agent_allowed"`、关闭的标准输入、显式超时、已声明命令，以及位于当前根目录内的工作目录。

## 意图字段

- `description`: 命令意图的目的。
- `reason`: 意图不可执行或尚未声明的原因。
- `agent_action`: agent 无法运行该意图时应采取的行动。
- `required_after`: 哪些变更类型之后应考虑该意图。
- `kind`: 分类，例如 mustflow 内置命令或仓库命令。
- `lifecycle`: 命令是有限命令还是长时间运行命令。
- `run_policy`: agent 是否可以运行该意图，或是否需要明确批准。新配置应使用 `agent_allowed` 或 `requires_explicit_user_request`；`run_policy = "manual_only"` 仅为兼容旧配置而接受。
- `argv`: 不经过 shell 解释而执行的命令和参数。明显长时运行的形式，例如 shell 包装器、解释器循环、
  包管理器开发脚本、监听命令和开发服务器，会在代理可执行的一次性意图中被拒绝。
- `mode`: 仅在需要 shell 语法时设置为 `shell`。
- `cmd`: 当 `mode = "shell"` 时使用的 shell 命令字符串。
- `cwd`: 命令工作目录。
- `timeout_seconds`: 命令超时时间。
- `kill_after_seconds`: 可选的意图级超时后进程清理额外等待时间。
- `stdin`: 标准输入行为。agent 可运行的意图必须使用 `closed`。
- `success_exit_codes`: 被视为成功的退出码。
- `manual_start_hint`: 可选的人类提示，用于在 agent 执行之外启动长时间运行命令。
- `health_check_url`: 可选 URL，用于检查人工启动的长时间运行进程。
- `stop_instruction`: 可选说明，用于停止人工启动的长时间运行进程。
- `related_oneshot_checks`: 可选的一次性意图名称，用于不启动长时间运行进程也能检查同一表面。
- `writes`: 命令可能修改的路径。
- `network`: 命令是否使用网络。
- `destructive`: 命令是否可能具有破坏性。

## 可执行意图

已配置意图应尽可能使用 `argv` 数组。

```toml
[intents.test]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run tests."
argv = ["pnpm", "test"]
cwd = "."
timeout_seconds = 900
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
```

如果需要 shell，请设置 `mode = "shell"` 和 `cmd`，然后声明命令影响和写入路径。

对于 `unknown`、`not_applicable`、`manual_only` 和 `disabled`，agent 不得推断替代命令。

## 测试相关意图

默认模板会区分完整测试、相关测试、审计检查、覆盖率和快照更新。

```toml
[intents.test_related]
status = "unknown"
reason = "No related-test command has been declared for this repository."
agent_action = "do_not_guess_report_missing"

[intents.test_audit]
status = "unknown"
reason = "No stale-test audit command has been declared."
agent_action = "do_not_guess_report_missing"

[intents.snapshot_update]
status = "manual_only"
reason = "Snapshot updates can hide unintended output changes."
agent_action = "do_not_update_snapshots_without_approval"
```

agent 维护测试时应使用这些意图名称，但仍必须通过 `commands.toml` 解析每一个意图。缺失的相关测试或审计命令应被报告，而不是被猜测。

## 命令生命周期

- `oneshot`: 必须退出的有限命令。
- `server`: 长时间运行的本地服务器。
- `watch`: 不会自行退出的文件监听命令。
- `interactive`: 等待用户输入的命令。
- `browser`: 浏览器或界面进程。
- `background`: 预期留在后台运行的进程。

默认情况下，agent 只能运行 `oneshot` 意图。`server`、`watch`、`interactive`、`browser` 和 `background` 不得使用 `run_policy = "agent_allowed"`。

长时间运行意图可以携带人工指导元数据，但这些元数据只用于说明，不会让该意图变成 agent 可运行。

```toml
[intents.dev_server]
status = "configured"
lifecycle = "server"
run_policy = "requires_explicit_user_request"
description = "启动用于人工检查的开发服务器。"
argv = ["pnpm", "dev"]
cwd = "."
timeout_seconds = 300
stdin = "closed"
writes = []
manual_start_hint = "请在由人控制的终端中启动。"
health_check_url = "http://127.0.0.1:3000/health"
stop_instruction = "用 Ctrl-C 停止终端进程。"
related_oneshot_checks = ["test_fast"]
```

`mf run <intent>` 只执行同时满足 `status = "configured"`、`lifecycle = "oneshot"`、`run_policy = "agent_allowed"`、`stdin = "closed"`、正整数 `timeout_seconds`、通过 `argv` 或 `mode = "shell"` 加 `cmd` 声明的命令，以及 `cwd` 位于当前 mustflow 根目录内的意图。
执行后，它会把最新运行 receipt 写入 `.mustflow/state/runs/latest.json`；使用 `--json` 时，也会把同一份 receipt 打印到标准输出。

## 内置意图

`mustflow_doctor` 会在不写入文件的情况下检查当前 mustflow 根目录安装状态、检查结果、可运行命令意图和下一步。

```toml
[intents.mustflow_doctor]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["mf", "doctor", "--json"]
cwd = "."
timeout_seconds = 300
stdin = "closed"
writes = []
```

`repo_map` 生成或更新 `REPO_MAP.md`。

```toml
[intents.repo_map]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["mf", "map", "--write"]
cwd = "."
timeout_seconds = 300
stdin = "closed"
writes = ["REPO_MAP.md"]
```

默认模板也通过内置意图暴露 `mf update`，这样代理可以留下运行记录，而不是绕过命令契约。
`mustflow_update_dry_run` 运行 `mf update --dry-run --json`，不写文件。
`mustflow_update_apply` 只应在计划没有阻塞项，并且任务确实需要应用模板更新时使用。

根目录 `config/` 可能属于用户项目，因此 mustflow 不使用它。

## Git 相关意图

默认模板包含只读 Git 意图，用于最终报告和提交消息建议。

```toml
[intents.changes_status]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "status", "--short"]
cwd = "."
timeout_seconds = 120
stdin = "closed"
writes = []
network = false
destructive = false

[intents.changes_diff_summary]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "diff", "--stat"]
cwd = "."
timeout_seconds = 120
stdin = "closed"
writes = []
network = false
destructive = false
```

这些意图会检查已变更文件和变更摘要，而不会修改 Git 状态。

实际提交默认只允许人工执行。

```toml
[intents.git_commit]
status = "manual_only"
reason = "Commits require explicit user approval."
agent_action = "do_not_commit_report_suggestion_only"
```

agent 可以建议提交消息，但没有用户明确请求时，不得暂存、提交或推送。
