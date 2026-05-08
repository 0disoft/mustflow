---
title: mf verify
description: 运行由 required_after 元数据选出的已配置验证意图。
---

`mf verify --reason <event>` 会读取 `.mustflow/config/commands.toml`，找出 `required_after` 列表包含指定原因的命令意图，并且只运行已配置、单次执行、允许代理运行、stdin 已关闭的意图。

## 选择规则

- 原因字符串必须与 `required_after` 精确匹配。
- 可运行意图使用与 `mf run <intent>` 相同的安全执行路径。
- 未知、仅手动、长时运行、被阻止或配置不完整的意图不会被猜测执行，而是报告为已跳过。
- 如果没有意图匹配该原因，结果为 `blocked`。

## 示例

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
```

## JSON 字段

```sh
npx mf verify --reason code_change --json
```

机器可读输出使用这些字段：

- `schema_version` (`string`)：验证报告格式版本。
- `command` (`string`)：始终为 `verify`。
- `mustflow_root` (`string`)：解析出的 mustflow 根目录。
- `reason` (`string`)：请求的 `required_after` 原因。
- `status` (`string`)：`passed`、`partial`、`failed` 或 `blocked`。
- `summary` (`object`)：匹配、运行、通过、失败和跳过的数量。
- `results` (`object[]`)：每个意图的运行或跳过结果。

## 退出码

- `0`：选中的可运行意图全部通过，且没有选中意图被跳过。
- `1`：验证失败、部分完成、被阻止，或输入无效。
