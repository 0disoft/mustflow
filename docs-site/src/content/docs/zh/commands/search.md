---
title: mf search
description: 在本地 SQLite 索引中搜索 mustflow 文档。
---

`mf search` 会读取由 `mf index` 创建的 SQLite 索引。

它不会创建或修改文件。如果索引缺失，请先运行 `mf index`。
如果任何已索引的 mustflow 文件在索引后发生变化，命令会停止并要求重建索引。
这可以避免过期搜索结果误导代理。

## 搜索范围

该命令只搜索 mustflow 工作流数据：

- 已索引文档，例如 `AGENTS.md` 与 `.mustflow/docs/*.md`
- `.mustflow/skills/*/SKILL.md` 中的 skill 条目
- `.mustflow/config/commands.toml` 中的 command intents

它不会搜索任意项目源文件。

## 用法

```sh
npx mf index
npx mf search mustflow_check
npx mf search "code review" --json
npx mf search test --limit 5
```

## 选项

- `--json`：以机器可读 JSON 格式输出结果。
- `--limit <number>`：设置返回结果数量。默认值为 `10`；最大值为 `50`。

## JSON 字段

```sh
npx mf search mustflow_check --json
```

机器可读输出使用这些字段：

- `schema_version` (`number`)：输出格式版本。
- `command` (`string`)：始终为 `search`。
- `ok` (`boolean`)：搜索是否成功。
- `mustflow_root` (`string`)：当前 mustflow 根目录。
- `database_path` (`string`)：查询使用的 SQLite 文件。
- `query` (`string`)：标准化后的搜索查询。
- `limit` (`number`)：结果数量限制。
- `index_fresh` (`boolean`)：索引是否匹配当前文件内容。
- `stale_paths` (`string[]`)：索引后发生变化的路径。若索引是最新的，则为空。
- `result_count` (`number`)：返回结果数量。
- `results` (`object[]`)：匹配的文档、skills 和 command intents。

每个结果可包含这些字段：

- `results[].kind` (`string`)：结果类型，取值为 `document`、`skill` 或 `command_intent`。
- `results[].path` (`string`)：文档或 skill 文件路径。
- `results[].name` (`string`)：skill 名称或 command intent 名称。
- `results[].title` (`string`)：文档标题。
- `results[].document_type` (`string`)：文档类别。
- `results[].match` (`string`)：匹配上下文片段。
- `results[].score` (`number`)：用于结果排序的排名分数。

## 退出码

- `0`：搜索完成。
- `1`：输入无效、`.mustflow/cache/mustflow.sqlite` 缺失，或索引已过期。
