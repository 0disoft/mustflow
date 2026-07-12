---
title: mf quality
description: 不写入文件，检查变更文件中的质量投机模式。
---

`mf quality check` 查找为了通过可见指标而削弱真正工程目标的常见变通方式。默认检查 Git 的变更文本文件，不写入项目文件。

```sh
npx mf quality check --json
npx mf quality check --all --json
```

它检查把代码塞进超长行、单行多语句、新 suppression、类型逃逸、测试绕过、占位实现、吞掉错误的空 catch，以及生成物或 vendor 路径中看似可执行的逻辑。`--all` 还会审计全部跟踪文件，并报告过大的 helper、util、manager 等设计风险候选。无风险为 `0`；发现风险、Git/文件系统问题或输入无效为 `1`。
