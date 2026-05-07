---
title: mf update 策略
description: 说明 mf update 如何区分计划与安全应用。
---

`mf update` 会将已安装的 mustflow 代理文档流更新到匹配较新的模板。

由于这些文件包含仓库特定代理规则，自动更新必须保守。
`mf update --dry-run` 先预览计划；只有在没有阻塞项时，`mf update --apply` 才写入。

## 基线

更新基线是 `.mustflow/config/manifest.lock.toml` 中的 `content_hash`。

`content_hash` 是最近一次由 `mf init` 或 `mf update --apply` 记录的文件内容 hash。如果当前文件 hash 与该值不同，mustflow 会将该文件视为本地编辑。

该策略也包含在 `mf update --json` 的 `policy` object 中。
文档、人类可读输出和自动化输出必须保持一致。

当前策略值：

```text
baseline: manifest_lock_content_hash
allowed_apply_actions: update, create
blocking_actions: blocked-local-change, manual-review
dry_run_writes_files: false
backup_path_pattern: .mustflow/backups/<timestamp>/
never_overwrite_local_changes: true
writes_only_template_manifest_paths: true
```

## 状态

`mf update --dry-run` 将文件分类为以下状态：

- `unchanged`：当前文件同时匹配锁基线和打包模板。
- `update`：当前文件匹配锁基线，但不同于打包模板。
- `create`：文件存在于模板中，但用户仓库中缺失。
- `blocked-local-change`：当前文件不同于锁基线。
- `manual-review`：文件需要人工复核，而不是自动更新。

## 应用规则

`mf update --apply` 遵循这些规则：

- 不自动修改 `blocked-local-change` 文件。
- 不自动修改 `manual-review` 文件。
- 创建备份后，用模板内容替换 `update` 文件。
- 创建必要父目录后，写入 `create` 文件。
- 如果新的模板文件与未出现在锁文件中的已有文件冲突，该文件会被视为本地变更且不会被覆盖。
- 成功更新后，刷新受影响的 `manifest.lock.toml` 条目。
- `mf update` 只写入模板 manifest 和锁文件声明的 mustflow 文件。
- 如果任何写入失败，报告已写入文件和备份路径。

## AGENTS.md 处理

`AGENTS.md` 是 root 入口点，需要额外谨慎。

当已有 `AGENTS.md` 被跟踪为 mustflow-managed block 时，不得用模板覆盖整个文件。该情况应保持 `manual-review`，或使用专用逻辑只安全替换 managed block。

## 备份位置

在 `update` 项修改已有文件前，备份会写入：

```text
.mustflow/backups/<timestamp>/
```

备份是最后一层保护。备份存在并不意味着可以自动覆盖 `blocked-local-change` 文件。

## 退出码

- Exit `0`：计划没有阻塞项。
- Exit `1`：存在 `blocked-local-change` 或 `manual-review` 项，包括 `--apply` 期间。
- Exit `1`：锁文件缺失或无效。
- Exit `1`：运行 `mf update` 时未选择 `--dry-run` 或 `--apply`。
