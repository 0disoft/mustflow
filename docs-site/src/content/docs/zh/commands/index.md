---
title: mf index
description: 为 mustflow 文档构建本地 SQLite 索引。
---

`mf index` 会根据当前根目录中的 mustflow 文档流构建可再生成的 SQLite 索引。

事实来源仍然是磁盘上的文件。该索引是一个缓存，帮助 `mf search` 以及未来的 map 或 dashboard 功能快速读取 mustflow 文档。

## 索引输入

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- `.mustflow/config/commands.toml` 中的 command intents

该命令不会索引任意项目源文件。它只作用于 mustflow 工作流文件。

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
- `indexed_paths` (`string[]`)：包含在文档索引中的路径。

## 退出码

- `0`：索引目标已计算，并可选地写入。
- `1`：命令收到未知选项，或索引失败。
