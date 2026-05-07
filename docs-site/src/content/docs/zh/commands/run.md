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

## 排除的生命周期

`mf run` 不执行这些生命周期的 intents：

- `server`
- `watch`
- `interactive`
- `browser`
- `background`

开发服务器、watch 模式、浏览器 UI 与后台进程不是有限验证命令。

## 示例

```sh
npx mf run test
npx mf run lint
npx mf run mustflow_check
npx mf run test --json
```

## JSON 字段

每次执行都会将最新运行回执写入 `.mustflow/state/runs/latest.json`。

使用 `--json` 时，同一回执会打印到 standard output。自动化和代理应解析此结构化输出，而不是解析人类可读输出。

机器可读输出使用这些字段：

- `schema_version` (`number`)：运行回执格式版本。
- `command` (`string`)：始终为 `run`。
- `intent` (`string`)：command intent 名称。
- `status` (`string`)：运行结果，取值为 `passed`、`failed`、`timed_out` 或 `start_failed`。
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
- `max_output_bytes` (`number`)：保留输出的最大字节数。
- `success_exit_codes` (`number[]`)：被视为成功的退出码。
- `exit_code` (`number | null`)：进程退出码。
- `signal` (`string | null`)：进程因 signal 结束时的 signal 名称。
- `error` (`string | null`)：启动或运行时错误消息。
- `kill_method` (`string | null`)：超时后停止进程的方法。
- `stdout` (`object`)：标准输出摘要。
- `stderr` (`object`)：标准错误摘要。
- `receipt_path` (`string`)：已保存的运行回执路径。

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
