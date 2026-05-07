---
title: mf status
description: 显示本地 mustflow 安装状态的只读命令。
---

`mf status` 会检查当前根目录是否已安装 mustflow 文档流，并通过 manifest lock 报告已变更或缺失文件。

它不会修改文件。自动化关卡应使用 `mf check`；当人类需要快速本地摘要时使用 `mf status`。
当自动化或代理需要读取结果时，请使用 `--json`。

## 输出

- `Installed`：`AGENTS.md` 与 `.mustflow/` 是否存在。
- `Manifest lock`：锁文件状态，取值为 `present`、`missing` 或 `invalid`。
- `Tracked files`：锁文件中记录的文件数量。
- `Changed files`：当前 content hash 与锁文件不同的文件数量。
- `Missing files`：锁文件记录但磁盘上缺失的文件数量。

## 示例

```sh
npx mf status
```

示例输出：

```text
mustflow status
Installed: yes
Manifest lock: present
Tracked files: 10
Changed files: 0
Missing files: 0
```

当文件被修改或消失时，它们的路径会打印在摘要下方。

## JSON 字段

```sh
npx mf status --json
```

机器可读输出使用这些字段：

- `installed` (`boolean`)：`AGENTS.md` 与 `.mustflow/` 是否存在。
- `manifestLock` (`string`)：锁文件状态。
- `trackedFiles` (`number`)：锁文件中记录的文件数量。
- `changedFiles` (`string[]`)：hash 已变化的路径。
- `missingFiles` (`string[]`)：已消失的路径。
- `issues` (`string[]`)：面向人的问题消息。
- `template` (`object | null`)：锁文件中记录的模板标识符与版本。

## 帮助与退出码

```sh
npx mf status --help
```

帮助输出顺序为 `Usage`、`Options`、`Examples` 和 `Exit codes`。

- 退出码 `0`：状态已检查并打印。文件变更不会让状态检查失败。
- 退出码 `1`：命令收到未知选项。

如果自动化需要让变更文件导致工作流失败，请读取 `mf status --json` 并根据字段自行判断，或使用 `mf check`。
