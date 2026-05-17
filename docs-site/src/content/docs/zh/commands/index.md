---
title: mf index
description: 为 mustflow 文档构建本地 SQLite 索引。
---

`mf index` 会根据当前根目录中的 mustflow 文档流构建可再生成的 SQLite 索引。

事实来源仍然是磁盘上的文件。该索引是一个缓存，帮助 `mf search` 以及未来的 map 或 dashboard 功能快速读取 mustflow 文档。

使用 `--source` 可以包含结构化源码锚点。除非 `.mustflow/config/index.toml` 明确启用，源码索引仍是可选的，并且只存储锚点元数据，不存储完整源码内容。

## 索引输入

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- `.mustflow/config/commands.toml` 中的 command intents
- 仅在提供 `--source` 或 `.mustflow/config/index.toml` 启用时包含结构化源码锚点

默认命令不会索引任意项目源文件。它只作用于 mustflow 工作流文件。使用 `--source` 或显式源码索引设置时，它会查找结构化 `mf:anchor` 注释，并只写入 id、路径、行号、目的、搜索词、不变量和风险等锚点字段。

## 输出文件

```text
.mustflow/cache/mustflow.sqlite
```

该文件是生成产物，可以删除并重建。
索引会保存被索引文件的 content hash，使 `mf search` 能检测过期缓存数据。
它还会写入 `indexed_files` 表，记录路径、来源范围、文件大小、修改时间、内容哈希、索引时间、索引模式和解析器版本，用于判断增量运行是否可以安全复用现有缓存。

当内置 SQLite 运行时支持 FTS5 时，`mf index` 会写入派生文本搜索表，以加快词元匹配。FTS5 不可用时，索引仍保留相同基础表，`mf search` 会执行有界表扫描。两条路径还会为可搜索元数据保存短 n-gram 行，让多语言查询在空格或分词方式不完全一致时也能匹配已索引术语。

## Dry Run

```sh
npx mf index --dry-run --json
```

Dry run 会计算索引目标并打印数量，但不会写入 SQLite 文件。

## 增量模式

```sh
npx mf index --incremental --json
```

默认情况下，`mf index` 会完整重建索引。增量模式会先检查现有 `.mustflow/cache/mustflow.sqlite` 文件。如果 schema 版本、解析器版本、源码范围设置和已索引文件指纹仍然兼容且新鲜，它会复用现有 SQLite 文件而不重写。如果任何已索引工作流文件被修改、删除或新增，或者源码锚点范围发生变化，mustflow 会退回完整重建。

## 源码锚点

```sh
npx mf index --source --json
```

源码锚点索引仅用于导航。生成的 `source_anchors`、`source_anchor_fingerprints` 和 `source_anchor_status` 表不能定义工作流规则、命令权限或验证权威。
指纹和状态行是派生的搜索元数据，用于之后解释某个锚点是否仍指向预期代码。
如果可以检测到附近的函数、类、方法或常量，指纹表还会保存派生的符号元数据，例如类型、名称、签名哈希和正文哈希。

## 源码扫描配置

`.mustflow/config/index.toml` 可以缩小源码锚点扫描范围，但不会改变工作流策略或命令权限。

```toml
[source_index]
enabled_by_default = false
include = ["src/**/*.ts", "packages/*/src/**/*.ts"]
exclude = ["**/*.generated.ts", "**/__fixtures__/**"]
max_file_bytes = 262144
allowed_extensions = [".ts", ".tsx", ".js", ".py", ".rs", ".go"]
```

`enabled_by_default = true` 会让 `mf index` 在没有 `--source` 时也包含源码锚点。include 和 exclude 模式只限制扫描范围。生成文件、依赖和 vendor 路径即使匹配 include 模式，也仍会从本地源码索引中排除。

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
- `index_mode` (`string`)：默认重建路径为 `full`，请求 `--incremental` 时为 `incremental`。
- `reused_existing` (`boolean`)：增量模式是否复用了现有 SQLite 文件。
- `rebuild_reason` (`string | null`)：增量模式未复用现有文件而选择重建的原因。
- `document_count` (`number`)：已索引 mustflow 文档与配置文件数量。
- `skill_count` (`number`)：已索引 skill 文档数量。
- `skill_route_count` (`number`)：从 `.mustflow/skills/INDEX.md` 索引的 skill route 行数。
- `command_intent_count` (`number`)：已索引 command intents 数量。
- `command_effect_count` (`number`)：从 `effects` 或 `writes` 派生并索引的 command effect 行数。
- `source_index_enabled` (`boolean`)：源码锚点索引是否由 `--source` 或本地索引配置启用。
- `source_anchor_count` (`number`)：已索引的结构化源码锚点数量。
- `search_backend` (`string`)：此索引选择的搜索后端，取值为 `fts5` 或 `table_scan`。
- `search_fts5_available` (`boolean`)：构建索引时 SQLite 运行时是否报告支持 FTS5。
- `content_mode` (`string`)：存储内容策略。当前为 `metadata_and_snippets`。
- `store_full_content` (`boolean`)：本地索引读取模型中始终为 `false`。
- `max_snippet_bytes_per_document` (`number`)：每个文档可存储的最大摘录字节数。
- `excluded_raw_data_kinds` (`string[]`)：SQLite 索引不得存储的原始数据类别。
- `indexed_file_count` (`number`)：记录在 `indexed_files` 中的文件指纹数量。
- `indexed_paths` (`string[]`)：包含在文档索引中的路径。

## 退出码

- `0`：索引目标已计算，并可选地写入。
- `1`：命令收到未知选项，或索引失败。
