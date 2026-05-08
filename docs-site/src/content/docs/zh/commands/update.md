---
title: mf update
description: 预览或安全应用已安装 mustflow 文档流的更新。
---

`mf update` 会将已安装的 mustflow 文档流与当前打包模板进行比较。

`mf update --dry-run` 会读取 `manifest.lock.toml`，检查当前文件是否仍匹配安装时 hash，并打印更新计划。
`mf update --apply` 只会在没有 blocked local changes 或 manual-review 项时应用 `update` 与 `create` 项。
当自动化或代理需要解析计划时，也请使用 `--json`。

人类输出与 JSON 输出遵循同一策略。基线是锁文件中的 `content_hash`，
唯一可应用状态是 `update` 与 `create`。

## 代理命令意图

已安装的项目可以通过配置好的 `mf run` 意图开放更新操作，而不是让代理直接运行原始 `mf update`。

- `mustflow_update_dry_run`: 运行 `mf update --dry-run --json`，不写入文件。
- `mustflow_update_apply`: 运行 `mf update --apply --json`；仅在 dry-run 计划没有阻塞项或 manual-review 项，并且任务确实需要应用更新时使用。

## 为什么先 Dry Run

mustflow 文件包含代理规则与流程。自动覆盖用户编辑过的文件可能会删除仓库特定规则。

因此 update 命令必须区分：

- 当前文件是否仍匹配安装时 hash
- 当前文件是否不同于打包模板
- 本地用户变更是否阻止自动更新
- 是否需要人工复核

## 输出分类

- `Blocked local changes`：当前文件 hash 与安装时 hash 不同，因此阻止自动更新。
- `Manual review`：文件需要复核，而不是自动更新，例如 managed block。
- `Would update`：文件可由 `mf update --apply` 更新。
- `Would create`：文件存在于模板中，但当前 root 中缺失。

如果文件的锁条目有 `last_action = "customized"`，只要它仍匹配自定义基线，即使打包模板不同，也会被视为未变化。

## 示例

```sh
npx mf update --dry-run
```

当所有内容都是最新时，输出类似：

```text
mustflow update plan
Policy:
- Baseline: manifest_lock_content_hash
- Apply actions: update, create
- Blocking actions: blocked-local-change, manual-review
- Backup path: .mustflow/backups/<timestamp>/
Blocked local changes: 0
Manual review: 0
Would update: 0
Would create: 0
No template updates needed.
No files were written.
```

发现本地变更时，命令会以退出码 `1` 结束。用户应在未来任何会修改文件的 update 前检查这些变更。

## 应用更新

```sh
npx mf update --apply
```

只有全部条件满足时，`--apply` 才会写入文件：

- `Blocked local changes` 为 `0`。
- `Manual review` 为 `0`。
- 目标项处于 `Would update` 或 `Would create`。

更新已有文件前，mustflow 会在 `.mustflow/backups/<timestamp>/` 下写入备份。
应用变更后，它会用新的 hash 和 `last_action` 刷新 `.mustflow/config/manifest.lock.toml` 中受影响条目。

如果新增模板文件在用户仓库中已存在，但未记录在锁文件中且内容不同，mustflow 会将其视为本地变更并拒绝覆盖。

## JSON 字段

```sh
npx mf update --dry-run --json
npx mf update --apply --json
```

机器可读输出使用这些字段：

- `schema_version` (`number`)：输出格式版本。
- `command` (`string`)：始终为 `update`。
- `mode` (`string`)：执行模式，取值为 `dry-run`、`apply` 或 `unspecified`。
- `policy` (`object`)：更新安全策略。
- `ok` (`boolean`)：计划是否没有阻塞项。
- `wroteFiles` (`boolean`)：是否实际写入文件。对 `--dry-run` 始终为 `false`。
- `summary` (`object`)：按状态统计的更新计划数量。
- `items` (`object[]`)：逐文件计划条目。
- `error` (`string`)：失败原因，仅可能出现在失败输出中。

嵌套字段使用这些形状：

- `policy.baseline` (`string`)：更新决策基线。当前为 `manifest_lock_content_hash`。
- `policy.allowed_apply_actions` (`string[]`)：`--apply` 可写入的状态。当前为 `update` 与 `create`。
- `policy.blocking_actions` (`string[]`)：会阻止 `--apply` 写入任何文件的状态。
- `policy.dry_run_writes_files` (`boolean`)：`--dry-run` 是否写入文件。始终为 `false`。
- `policy.backup_path_pattern` (`string`)：替换已有文件前的备份路径模式。
- `policy.never_overwrite_local_changes` (`boolean`)：声明本地变更绝不会被自动覆盖。
- `policy.writes_only_template_manifest_paths` (`boolean`)：声明 update 只写入模板 manifest 列出的 mustflow 文件。
- `summary.blockedLocalChanges` (`number`)：被本地变更阻止的文件数。
- `summary.manualReview` (`number`)：需要人工复核的文件数。
- `summary.wouldUpdate` (`number`)：未来修改型 update 可变更的文件数。
- `summary.wouldCreate` (`number`)：未来修改型 update 可创建的文件数。
- `summary.unchanged` (`number`)：已匹配当前模板的文件数。
- `items[].relativePath` (`string`)：计划条目的目标路径。
- `items[].sourceKind` (`string`)：该项来自模板源的方式。
- `items[].action` (`string`)：计划动作状态。
- `items[].reason` (`string`)：该项被归入该状态的原因。

当打包模板已变化但用户未编辑已安装文件时，该文件会出现在 `Would update` 或 `summary.wouldUpdate` 中。

## 帮助与退出码

```sh
npx mf update --help
```

帮助输出顺序为 `Usage`、`Options`、`Examples` 和 `Exit codes`。

- 退出码 `0`：`--dry-run` 计划没有阻塞项，或 `--apply` 完成且没有阻塞项。
- 退出码 `1`：本地变更、manual-review 项、缺失锁文件、无效选项或缺少显式模式阻止成功。

单独运行 `mf update` 会失败且不修改文件。请先用 `mf update --dry-run` 复核，再仅在计划安全时使用 `mf update --apply`。
