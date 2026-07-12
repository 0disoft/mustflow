---
title: mf classify
description: 对变更路径、公开表面和验证原因进行分类。
---

`mf classify --changed` 读取 Git 工作树变更，并报告受影响的公开表面与验证原因。没有匹配规则的路径仍会标记为 `unclassified_path` 和 `unknown_change`，避免产生空的验证计划。

```sh
npx mf classify --changed --json
npx mf classify README.md schemas/classify-report.schema.json --json
npx mf classify --changed --write .mustflow/state/change-classification.json
```

输出可以由 `mf verify` 使用来选择声明过的验证意图。`--write` 的目标必须位于当前 mustflow 根目录内。该命令不会执行验证命令；成功为 `0`，输入无效为 `1`。
