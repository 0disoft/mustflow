---
title: mf handoff
description: 对受限工作项和交接记录进行只读验证。
---

`mf handoff validate <path>` 验证 mustflow 根目录内的 JSON 记录。它不会创建工作项、写入交接文件、启动代理、运行命令，也不会把该记录视为命令权限来源。

该命令用于可选的 `.mustflow/work-items/` 文件或交接记录，使它们只作为重启工作时的指针。有效记录可以包含任务目标、范围、验收标准、来源引用、验证计划、覆盖状态、剩余风险和下一步重启点。它不得保存隐藏推理、聊天全文、原始终端日志、密钥、个人数据、宽泛记忆摘要、自主工作器状态，或绕过 `.mustflow/config/commands.toml` 的命令字段。

## Shape

Required fields:

- `schema_version`: Always `1`.
- `kind`: `work_item` or `handoff`.
- `task_id`: Stable task identifier.
- `goal`: Current goal.
- `scope`: Bounded work scope.
- `acceptance_criteria`: Completion checks.
- `source_refs`: Repository files, issue links, or other source references.
- `next_restart_point`: Short instruction for the next session.

Optional fields: `non_goals`, `changed_surfaces`, `verification_plan`, `coverage`, and `remaining_risks`.

`verification_plan` entries use `status: planned`, `run`, or `skipped`. Skipped entries must include `skip_reason`. Only `status: run` entries may include `receipt_path`.

## Example

```sh
npx mf handoff validate .mustflow/work-items/MF-0001.json
npx mf handoff validate .mustflow/work-items/MF-0001.json --json
```

## Exit Codes

- `0`: The record is valid.
- `1`: The record is invalid, outside the mustflow root, too large, unreadable, or not valid JSON.
