---
title: 运行流程
description: 安装 mustflow 后推荐的 mf 命令顺序。
---

默认 mustflow 运行流程会验证当前 root 是否已准备好供代理读取，而不会创建不必要文件。

## 写入前预览

先预览安装计划。

```sh
npx mf init --dry-run
```

已有 `AGENTS.md` 文件或 `.mustflow/` 目录可能造成冲突，因此在应用变更前应先审查计划写入内容。

## 初始化

如果计划正确，初始化工作流。

```sh
npx mf init --yes
```

如果 `AGENTS.md` 已存在且只需要 mustflow-managed block，请使用 `--merge`。只有在已有文件应该被备份并覆盖时才使用 `--force`。

## 验证

初始化后，验证文档流与设置。

```sh
npx mf check
npx mf check --json
```

手动复核时使用默认人类可读输出。当代理或自动化需要决定下一步动作时，使用 JSON 输出。

## 检查状态

使用 status 命令检查已安装文件自初始化以来是否发生变化。

```sh
npx mf status
npx mf status --json
```

该命令会将当前文件与 `manifest.lock.toml` 中记录的安装时基线进行比较。

## 预览更新

写入任何变更前，先预览模板更新。

```sh
npx mf update --dry-run
npx mf update --dry-run --json
```

如果计划安全，请显式应用干净的模板更新。

```sh
npx mf update --apply
```

`mf update --apply` 只写入仍匹配安装基线的文件。
本地编辑文件和新文件冲突会被报告为阻塞项。

## 生成导航地图

当代理需要快速了解当前 root 中的重要文件时，生成导航地图。

```sh
npx mf map --write
```

只有在配置了 workspace roots 且需要这些子仓库入口点时，才使用嵌套仓库映射。

```sh
npx mf map --write --include-nested
```

`REPO_MAP.md` 是当前 mustflow root 的锚点文件地图，不是完整文件清单。
