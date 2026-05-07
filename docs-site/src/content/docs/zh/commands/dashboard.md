---
title: mf dashboard
description: 为本地 mustflow dashboard 预留的命令。
---

`mf dashboard` 是为未来本地 dashboard 预留的命令。该 dashboard 可用于可视化检查和编辑 mustflow 文档流。

此功能尚未实现。运行该命令只会打印 not-implemented 消息，并以退出码 `1` 退出。

## 当前行为

```sh
npx mf dashboard
```

此命令不会启动服务器，也不会修改文件。

## 结构化输出

`mf dashboard` 目前不提供 JSON 输出格式。

自动化和代理不应将此命令视为可用的工作流命令。

## 帮助与退出码

```sh
npx mf dashboard --help
```

- 退出码 `0`：已打印帮助。
- 退出码 `1`：Dashboard 尚未实现。
