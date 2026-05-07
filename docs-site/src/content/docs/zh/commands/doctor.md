---
title: mf doctor
description: 面向当前 mustflow 根目录的只读诊断命令。
---

`mf doctor` 会为当前 mustflow 根目录提供快速健康摘要。
它组合了 `mf check` 与 `mf context` 中最有用的部分，并打印代理可遵循的安全下一步。

此命令绝不会写入文件。当代理或人类在修改任何内容前需要初始方向时，请使用它。

## 检查内容

- 当前 mustflow 根目录。
- `AGENTS.md` 与 `.mustflow/` 是否存在。
- `mf check` 结果。
- `manifest.lock.toml` 状态。
- 当锁文件存在时，其中的模板标识符与版本。
- `.mustflow/config/commands.toml` 是否存在，并是否暴露可运行的有限 intents。
- `mustflow.toml` 中缺失的必读与可选阅读路径。
- `REPO_MAP.md` 是否已生成。
- 本地 `.mustflow/cache/mustflow.sqlite` 索引是否存在。
- 最新 `mf run` 回执是否存在。
- 诊断检查项与建议的下一步命令。

## 示例

```sh
npx mf doctor
```

示例输出：

```text
mustflow doctor
mustflow root: /path/to/project
Installed: yes
Strict: no
Check: passed
Issues: 0
Command contract: present
Runnable intents: 3

Health:
- [ok] Install: installed
- [ok] Validation: 0 issues
- [ok] Command contract: present, 3 runnable intents
- [ok] Read order: all required files present
- [info] REPO_MAP.md: not generated (run: mf map --write)
- [info] Local index: not generated (run: mf index)
- [info] Latest run: no run receipt yet (run: mf run <intent>)

Suggested commands:
- mf help workflow
- mf help commands
- mf context --json
- mf check --strict
- mf map --write
- mf index
- mf run <intent>

No files were written.
```

## JSON 字段

```sh
npx mf doctor --json
```

机器可读输出使用这些字段：

- `schema_version` (`number`)：输出格式版本。
- `command` (`string`)：始终为 `doctor`。
- `mustflow_root` (`string`)：当前 mustflow 根目录。
- `installed` (`boolean`)：`AGENTS.md` 与 `.mustflow/` 是否存在。
- `strict` (`boolean`)：是否启用 `--strict` 检查。
- `ok` (`boolean`)：安装是否存在且验证是否通过。
- `check` (`object`)：使用 `mf check` 规则得到的验证结果。
- `context` (`object`)：代理开始前需要的主要上下文状态。
- `diagnostics` (`object[]`)：安装、验证、命令合同、阅读顺序、仓库地图、本地索引和最新运行的逐项诊断。
- `next_steps` (`string[]`)：代理无需猜测即可继续运行的命令。

嵌套字段使用这些形状：

- `check.ok` (`boolean`)：验证是否通过。
- `check.issue_count` (`number`)：验证问题数量。
- `check.issues` (`string[]`)：验证问题消息。
- `context.manifest_lock` (`string`)：锁文件状态，取值为 `present`、`missing` 或 `invalid`。
- `context.template` (`object | null`)：已知时的模板标识符与版本。
- `context.command_contract_exists` (`boolean`)：`commands.toml` 是否存在。
- `context.runnable_intents` (`string[]`)：代理可运行的已配置有限 intents 名称。
- `context.missing_read_order` (`string[]`)：缺失的必读顺序文件。
- `context.missing_optional_read_order` (`string[]`)：缺失的可选阅读顺序文件。
- `context.latest_run_exists` (`boolean`)：最新运行回执是否存在。
- `diagnostics[].id` (`string`)：诊断区域名称。
- `diagnostics[].status` (`string`)：诊断状态，取值为 `ok`、`warn`、`fail` 或 `info`。
- `diagnostics[].summary` (`string`)：简短的人类可读状态。
- `diagnostics[].action` (`string | null`)：下一步要运行的命令。

## 严格模式

```sh
npx mf doctor --strict --json
```

严格模式使用与 `mf check --strict` 相同的附加检查。
修改 mustflow 文档、skills、命令合同、retention 设置或仓库地图行为后，请使用它。

## 退出码

- `0`：根目录已检查且未发现问题。
- `1`：验证发现问题、安装缺失，或命令收到未知选项。

代理和自动化应从 `--json` 输出读取 `ok`、`check.issues`、`diagnostics` 和 `next_steps`，而不是解析人类摘要。
