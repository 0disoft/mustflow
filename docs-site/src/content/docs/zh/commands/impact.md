---
title: mf impact
description: 只读地报告变更路径的版本影响。
---

`mf impact --changed` 对变更路径进行分类、发现版本来源，并报告是否需要包或模板版本决策。它不会编辑版本文件、创建标签、提交或推送。

```sh
npx mf impact --changed --json
npx mf impact package.json schemas/impact-report.schema.json --json
```

报告包含版本偏好、严重度、建议 bump、原因、版本来源和受影响的公开表面。建议只是依据当前文件的判断；实际版本变更仍受仓库政策和用户指令约束。成功为 `0`，输入无效为 `1`。
