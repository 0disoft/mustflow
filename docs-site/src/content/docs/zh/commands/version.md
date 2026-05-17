---
title: mf version
description: 显示已安装的 mustflow 包版本，并可检查 npm。
---

`mf version` 会打印已安装的 mustflow CLI 包版本。

默认情况下它不会访问网络，因此脚本可以稳定读取当前版本。

## 检查 npm

如果 mustflow 已全局安装，可以直接运行 `mf`。

```sh
mf version --check
```

如果是在项目本地安装，请通过包管理器运行。

```sh
npx mf version --check
bunx mf version --check
```

`--check` 会访问 npm registry，将已安装版本与最新发布版本比较；如果有更新版本，就打印 npm、Bun、pnpm、Yarn 和 Deno 的更新命令。

它不会安装包，也不会修改文件。

如果 shell 输出 `mf: command not found`，说明 `version` 命令还没有运行；shell 没有找到 `mf` 可执行文件。请全局安装 mustflow，或把包管理器的全局可执行文件目录加入 `PATH`。

```sh
npm install -g mustflow
bun add -g mustflow@latest
```

使用 Bun 时，请确认 Bun 的全局可执行文件目录，通常是 `~/.bun/bin`，已经加入 `PATH`。

## 帮助和退出码

```sh
npx mf version --help
```

- 退出码 `0`：已打印版本信息。
- 退出码 `1`：命令收到未知选项，或无法检查 npm。
