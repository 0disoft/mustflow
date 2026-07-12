---
title: mf script-pack
description: 列出、建议并在受合同约束的路径中运行内置 mustflow 工具脚本。
---

`mf script-pack` 将小型检查器置于一个命名空间中。列表和建议均为只读；建议不是执行权限，只是当前路径可考虑的 helper。

```sh
npx mf script-pack list --json
npx mf script-pack suggest --path src/cli/index.ts --phase before_change
npx mf script-pack run core/text-budget check README.md --max 5000
```

内置 helper 包括 source outline、相对 import graph、change impact、symbol read、route outline、export diff、文档 reference drift、text budget、config chain、generated boundary 和 related files。即使显示 `run_hint`，也必须由仓库命令合同和 helper 的副作用元数据单独允许。

`script-pack run` 还限制 helper 的子进程。包管理器、shell wrapper、Git 写入、发布等未配置的进程执行会被拒绝。
