---
title: mf adapters
description: 不生成适配器文件，只检查宿主指令文件的兼容性。
---

`mf adapters status` 以只读方式检查当前 mustflow 根目录中的宿主专用指令文件兼容性。

它报告已有的代理指令文件、可选适配器表面、兼容性说明、需要的更改以及命令权限边界；不会生成适配器文件或修改宿主配置。

```sh
npx mf adapters status
npx mf adapters status --json
```

`required_changes` 是清除兼容性问题前必须处理的项目，`compatibility_notes` 是说明性信息。任何结果都不会授予 `.mustflow/config/commands.toml` 之外的命令执行权限。成功退出为 `0`，输入无效为 `1`。
