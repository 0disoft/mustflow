---
title: mf skill
description: 解析 skill 路由候选，并预览、安装或更新外部 SKILL.md。
---

`mf skill route` 是供代理和宿主集成使用的只读路由预处理。它根据任务文本、预期或变更路径以及验证原因，返回一个小型的排序 skill 候选集。它使用 route metadata 和 `SKILL.md` frontmatter，而不是默认加载展开的 skill index。

```sh
npx mf skill route --task "change TypeScript CLI output" --path src/cli/index.ts --reason code_change --json
npx mf skill import https://github.com/example/agent-skills/tree/main/review/security --dry-run --json
npx mf skill outdated --json
npx mf skill update concurrency-review --dry-run --json
```

`read_plan` 和 `route_card` 帮助宿主仅加载必要的 skill 文件；它们不取代编辑前必须读取所选 `SKILL.md` 的规则，也不授予命令权限。

外部 skill 安装在 `.mustflow/external-skills/`。`outdated` 比较保存的来源，`update <name>` 或 `update --all` 刷新该来源。`--trust-scripts` 可以生成受限的命令合同 fragment，但不会执行脚本；网络和破坏性批准仍由当前仓库和宿主政策决定。
