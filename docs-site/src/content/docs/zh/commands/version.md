---
title: mf version
description: 显示已安装的 mustflow 包版本，并可检查 npm。
---

`mf version` 会打印已安装的 mustflow CLI 包版本。

默认情况下它不会访问网络，因此脚本可以稳定读取当前版本。

## 检查 npm

```sh
npx mf version --check
```

`--check` 会访问 npm registry，将已安装版本与最新发布版本比较；如果有更新版本，就打印更新命令。

它不会安装包，也不会修改文件。

## 帮助和退出码

```sh
npx mf version --help
```

- 退出码 `0`：已打印版本信息。
- 退出码 `1`：命令收到未知选项，或无法检查 npm。
