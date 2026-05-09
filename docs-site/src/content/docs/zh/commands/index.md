---
title: mf index
description: 为 mustflow 文档构建本地 SQLite 索引。
---

`mf index` 会根据当前根目录中的 mustflow 文档流构建可再生成的 SQLite 索引。

事实来源仍然是磁盘上的文件。该索引是一个缓存，帮助 `mf search` 以及未来的 map 或 dashboard 功能快速读取 mustflow 文档。

使用 `--source` 可以包含结构化源码锚点。源码索引是显式启用的，并且只存储锚点元数据，不存储完整源码内容。

## 索引输入

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- `.mustflow/config/commands.toml` 中的 command intents
- 仅在提供 `--source` 时包含结构化源码锚点

默认命令不会索引任意项目源文件。它只作用于 mustflow 工作流文件。使用 `--source` 时，它会查找结构化 `mf:anchor` 注释，并只写入 id、路径、行号、目的、搜索词、不变量和风险等锚点字段。

## 输出文件

```text
.mustflow/cache/mustflow.sqlite
```

该文件是生成产物，可以删除并重建。
索引会保存被索引文件的 content hash，使 `mf search` 能检测过期缓存数据。

## Dry Run

```sh
npx mf index --dry-run --json
```

Dry run 会计算索引目标并打印数量，但不会写入 SQLite 文件。

## 源码锚点

```sh
npx mf index --source --json
```

源码锚点索引仅用于导航。生成的 `source_anchors` 表不能定义工作流规则、命令权限或验证权威。

## JSON 字段

```sh
npx mf index --json
```

机器可读输出使用这些字段：

- `schema_version` (`number`)：输出格式版本。
- `command` (`string`)：始终为 `index`。
- `ok` (`boolean`)：索引是否成功。
- `mustflow_root` (`string`)：当前 mustflow 根目录。
- `database_path` (`string`)：目标 SQLite 文件路径。
- `dry_run` (`boolean`)：是否禁用文件写入。
- `wrote_files` (`boolean`)：是否写入了 SQLite 文件。
- `document_count` (`number`)：已索引 mustflow 文档与配置文件数量。
- `skill_count` (`number`)：已索引 skill 文档数量。
- `command_intent_count` (`number`)：已索引 command intents 数量。
- `source_index_enabled` (`boolean`)：是否请求了源码锚点索引。
- `source_anchor_count` (`number`)：已索引的结构化源码锚点数量。
- `indexed_paths` (`string[]`)：包含在文档索引中的路径。

## 退出码

- `0`：索引目标已计算，并可选地写入。
- `1`：命令收到未知选项，或索引失败。
