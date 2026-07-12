---
title: mf tech
description: 管理供代理使用的低权限技术偏好。
---

`mf tech` 读取和更新 `.mustflow/config/technology.toml`。技术偏好只是提示，不会安装依赖、批准迁移、覆盖当前源码或跳过命令合同。

```sh
npx mf tech list --json
npx mf tech suggest --scope frontend
npx mf tech add framework nextjs --scope frontend --ecosystem npm --package next --package react --verify --why "Preferred React app framework"
npx mf tech remove framework.frontend.nextjs
```

支持 `list`、`suggest`、`add` 和 `remove`。`--verify` 仅在写入前验证 npm 包名，不会安装包或修改 `package.json`。成功为 `0`；输入或验证失败为 `1`。
