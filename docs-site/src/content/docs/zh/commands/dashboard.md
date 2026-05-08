---
title: mf dashboard
description: 启动本地 mustflow dashboard。
---

`mf dashboard` 会启动一个本地浏览器 dashboard，用于查看和修改安全的 mustflow 偏好设置。

第一版 dashboard 只编辑 `.mustflow/config/preferences.toml`。它不会暂存文件、创建 commit、push、修改版本号或执行 command intent。

可编辑分组包括 Git 默认值、提交消息建议、报告、验证选择、测试编写、代码风格和版本影响偏好。

## 当前行为

```sh
npx mf dashboard
```

该命令默认在 `127.0.0.1` 启动本地 HTTP 服务器，打印 dashboard URL，并在默认浏览器中打开它。

Dashboard 页面提供语言选择器，可在英语、韩语、中文、西班牙语、法语和印地语之间切换。所选语言会保存在浏览器中。

使用 `--port` 指定端口。使用 `--no-open` 可保持浏览器关闭。其他工具需要读取 URL 时，使用 `--json`；JSON 模式不会打开浏览器。

```sh
npx mf dashboard --port 4173
npx mf dashboard --no-open
npx mf dashboard --json
```

## 结构化输出

使用 `--json` 时，命令会先打印 dashboard URL、mustflow 根目录和偏好设置文件路径，然后保持本地服务器运行。

Dashboard API 使用每次会话生成的 token，并且只接受页面上显示的有限偏好设置更新。`git.auto_push` 会显示为锁定设置。

偏好设置保存成功时，dashboard 会写入 `.mustflow/config/preferences.toml`；如果 `.mustflow/config/manifest.lock.toml` 存在，则把该文件条目刷新为 `last_action = "customized"`。这样 `mf check`、`mf status` 和 `mf update --dry-run` 会按已接受的本地偏好设置基线工作。

## 帮助与退出码

```sh
npx mf dashboard --help
```

- 退出码 `0`：dashboard 已启动或已打印帮助。
- 退出码 `1`：dashboard 无法启动或输入无效。
