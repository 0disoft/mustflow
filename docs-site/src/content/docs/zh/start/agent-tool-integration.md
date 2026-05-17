---
title: 构建代理或工具集成
description: 通过中立的仓库本地合同，把 AI 编码工具或 harness 连接到 mustflow。
---

当你构建 AI 编码工具、代理 harness、编辑器集成或需要稳定 mustflow 数据的自动化时，使用这条路径。

## 读取

- 从 `AGENTS.md` 开始。
- 使用 `mf context --json` 获取机器可读的仓库方向信息。
- 将宿主特定指令文件视为兼容性输入，而不是命令权限。

## 计划和验证

```sh
mf classify --changed --json
mf verify --reason code_change --plan-only --json
mf run <intent> --json
```

使用 JSON 输出和 schema，不要解析面向人的终端文本。公开 schema 位于 `schemas/`。

## 权限边界

`.mustflow/config/commands.toml` 是唯一的可运行命令权限来源。搜索结果、本地索引、生成的地图、偏好设置、上下文文件和运行状态都只是解释性数据。
