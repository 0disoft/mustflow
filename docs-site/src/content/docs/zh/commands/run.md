---
title: mf run
description: 运行 commands.toml 中声明的有限 command intent。
---

`mf run <intent>` 只执行 `.mustflow/config/commands.toml` 中声明的有限 command intents。

## 执行条件

该 intent 必须满足所有条件：

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- `timeout_seconds` 是正整数

如果任一条件不满足，命令不会运行，并会报告原因。

执行前，`mf run` 还要求 `.mustflow/config/manifest.lock.toml` 可读取。这个文件用于确认当前
根目录已经通过 mustflow 安装或更新，然后才允许运行由仓库控制的命令。没有该锁文件时，
`--dry-run` 和 `--plan-only` 仍可用于检查手动创建或较旧的根目录，而且不会启动进程。如果仍要从该
根目录执行，请先检查 `AGENTS.md` 和 `.mustflow/config/commands.toml`，再传入
`--allow-untrusted-root`；这不会放宽上面的命令意图要求。

对于被阻止或未知的意图，`mf run` 会打印可复制的 `status = "manual_only"` 意图片段。该片段只是写入 `.mustflow/config/commands.toml` 的建议；在人为审阅并启用之前，它不会授予命令执行权限。`--dry-run` 和 `--plan-only` 的 JSON 会在 `suggested_intent_snippet` 中包含同一建议。

## 排除的生命周期

`mf run` 不执行这些生命周期的 intents：

- `server`
- `watch`
- `interactive`
- `browser`
- `background`

开发服务器、watch 模式、浏览器 UI 与后台进程不是有限验证命令。

即使意图声明了 `lifecycle = "oneshot"`，只要 `argv` 中出现明显的长时运行形态，`mf run` 也会拒绝执行，例如 shell 包装器载荷、解释器循环、`npm run dev`、`vite --host`、`next dev` 或 `webpack --watch`。

## 示例

```sh
npx mf run test
npx mf run lint
npx mf run mustflow_check
npx mf run test --json
```

## JSON 字段

每次执行都会把回执写入唯一的 `.mustflow/state/runs/run-*` 目录，并用同一份最新回执原子更新 `.mustflow/state/runs/latest.json`。

使用 `--json` 时，同一回执会打印到 standard output。自动化和代理应解析此结构化输出，而不是解析人类可读输出。

机器可读输出使用这些字段：

- `schema_version` (`number`)：运行回执格式版本。
- `command` (`string`)：始终为 `run`。
- `intent` (`string`)：command intent 名称。
- `status` (`string`)：运行结果，取值为 `passed`、`failed`、`timed_out`、`start_failed` 或 `output_limit_exceeded`。
- `timed_out` (`boolean`)：是否达到超时。
- `started_at` (`string`)：运行开始时间。
- `finished_at` (`string`)：运行结束时间。
- `duration_ms` (`number`)：运行时长。
- `cwd` (`string`)：实际执行目录。
- `lifecycle` (`string`)：intent 生命周期。
- `run_policy` (`string`)：应用的执行策略。
- `mode` (`string`)：执行模式。
- `argv` (`string[]`)：未使用 shell 模式时的命令与参数。
- `cmd` (`string`)：使用 shell 模式时的 shell 命令字符串。
- `timeout_seconds` (`number`)：应用的超时时间。
- `kill_after_seconds` (`number`)：超时后用于进程清理的额外等待时间。
- `max_output_bytes` (`number`)：每个标准输出或标准错误流的最大保留输出字节数。超过 16 MiB（16,777,216 字节）的值会在执行前被拒绝。
- `max_output_bytes_scope` (`string`)：始终为 `per_stream`；`max_output_bytes` 不是标准输出与标准错误合计后的总预算。
- `success_exit_codes` (`number[]`)：被视为成功的退出码。
- `exit_code` (`number | null`)：进程退出码。
- `signal` (`string | null`)：进程因 signal 结束时的 signal 名称。
- `error` (`string | null`)：启动或运行时错误消息。
- `kill_method` (`string | null`)：超时后停止进程的方法。
- `termination` (`object`，可选)：超时清理证据，记录停止方法、普通与强制信号、是否尝试强制终止、是否确认进程已结束，以及清理是否可能仍未完成。
- `stdout` (`object`)：标准输出摘要。
- `stderr` (`object`)：标准错误摘要。
- `receipt_path` (`string`)：唯一运行目录中的已保存回执路径。

输出摘要对象使用这些字段：

- `stdout.bytes` (`number`)：standard output 总字节数。
- `stdout.truncated` (`boolean`)：输出是否被截断到 retention 限制。
- `stdout.tail` (`string`)：standard output 尾部。
- `stderr.bytes` (`number`)：standard error 总字节数。
- `stderr.truncated` (`boolean`)：输出是否被截断到 retention 限制。
- `stderr.tail` (`string`)：standard error 尾部。

该回执记录一次执行。命令合同的事实来源仍然是 `.mustflow/config/commands.toml`。

## 退出码

- `0`：command intent 以允许的退出码结束。
- `1`：intent 缺失、被拒绝、超时或失败。
