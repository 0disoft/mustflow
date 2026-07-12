---
title: mf flow
description: 为当前 mustflow 根目录生成设计流程图 REPO_FLOW.md。
---

`mf flow` 生成从任务接收、阅读、编辑、验证到报告的仓库工作流程。`REPO_MAP.md` 说明重要文件在哪里，`REPO_FLOW.md` 说明代理应如何推进工作。

```sh
npx mf flow --stdout
npx mf flow --write
npx mf flow --check
```

生成内容包含稳定 frontmatter、工作/命令/生成物/receipt 流程、需要同步的公开合同表面，以及常见变更类型的首个编辑位置。它不包含时间戳、分支、远程 URL、绝对路径或近期变更摘要。该地图只用于导航，不授予命令权限。成功为 `0`；选项错误或检查到缺失、过期地图为 `1`。
