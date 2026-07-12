---
title: mf upgrade
description: 检查包版本并安全更新已安装的 mustflow 工作流文件。
---

`mf upgrade` 用于包更新后的项目工作流更新。它先检查 npm 上的版本；若当前包已是最新版本，就按与 `mf update --apply` 相同的安全策略更新项目文件。

```sh
bun update -g --latest
mf upgrade --dry-run
mf upgrade
mf check --strict
```

它不会安装包。若有新版本，会先打印对应包管理器的更新命令并停止。只有 `Blocked local changes` 与 `Manual review` 都为 `0` 时，才会写入模板 manifest 中允许的 `update` 与 `create` 项；替换前会备份到 `.mustflow/backups/<timestamp>/`。

自定义 `AGENTS.md`、命令合同、skill index 或 route 表可能被列为本地变更阻塞项。这是停止信号，不是删除文件或强制覆盖的提示。请审阅并合并需要的模板变更，通过仓库声明的 manifest-lock 流程记录基线，再运行 `mf check --strict`。
