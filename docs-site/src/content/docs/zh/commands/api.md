---
title: mf api
description: 为代理集成输出稳定的只读 JSON 报告。
---

`mf api` 提供工作流、命令目录、变更验证计划、最新证据、diff 风险、健康状态和活动 lock 的机器可读报告。

```sh
npx mf api workspace-summary --json
npx mf api command-catalog --json
npx mf api verification-plan --changed --json
npx mf api latest-evidence --json
npx mf api health --json
```

`serve --stdio` 以逐行 stdio 提供同一组报告。该 API 不会执行项目命令、修改文件、批准工作或授予权限。依赖变更文件的报告需要 `--changed`，仅 JSON 的报告需要 `--json`。成功为 `0`，无效输入或无法生成报告为 `1`。
