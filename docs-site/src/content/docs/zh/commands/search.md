---
title: mf search
description: 在本地 SQLite 索引中搜索 mustflow 文档。
---

`mf search` 会读取由 `mf index` 创建的 SQLite 索引。

它不会创建或修改文件。如果索引缺失，请先运行 `mf index`。
如果任何已索引的 mustflow 文件在索引后发生变化，命令会停止并要求重建索引。
这可以避免过期搜索结果误导代理。

## 搜索范围

默认情况下，该命令只搜索 mustflow 工作流数据：

- 已索引文档，例如 `AGENTS.md` 与 `.mustflow/docs/*.md`
- `.mustflow/skills/*/SKILL.md` 中的 skill 条目
- `.mustflow/config/commands.toml` 中的 command intents

它不会搜索任意项目源文件。如果索引通过 `mf index --source` 创建，可以用 `--scope source` 搜索结构化的源码 anchors。

使用 `--scope all` 可以同时包含工作流结果和源码 anchor 提示。在此模式下，mustflow 会把工作流权威结果和命令契约结果排在源码 anchors 之上。源码 anchors 只是代码导航提示，不能覆盖命令规则、skills、工作流文档或 `AGENTS.md`。

## 用法

```sh
npx mf index
npx mf index --source
npx mf search mustflow_check
npx mf search "code review" --json
npx mf search "role mapping" --scope source
npx mf search mustflow_check --scope all --json
npx mf search test --limit 5
```

## 选项

- `--json`：以机器可读 JSON 格式输出结果。
- `--limit <number>`：设置返回结果数量。默认值为 `10`；最大值为 `50`。
- `--scope <workflow|source|all>`：选择已索引的工作流数据、源码 anchors，或两者。默认值为 `workflow`。

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
- `scope` (`string`)：搜索范围，取值为 `workflow`、`source` 或 `all`。
- `index_fresh` (`boolean`)：索引是否匹配当前文件内容。
- `stale_paths` (`string[]`)：索引后发生变化的路径。若索引是最新的，则为空。
- `result_count` (`number`)：返回结果数量。
- `results` (`object[]`)：匹配的工作流条目，以及按需返回的源码 anchors。

每个结果可包含这些字段：

- `results[].kind` (`string`)：结果类型，取值为 `document`、`skill`、`command_intent` 或 `source_anchor`。
- `results[].path` (`string`)：文档或 skill 文件路径。
- `results[].name` (`string`)：skill 名称、command intent 名称或源码 anchor ID。
- `results[].title` (`string`)：文档标题。
- `results[].document_type` (`string`)：文档类别。
- `results[].anchor_id` (`string`)：源码 anchor ID。
- `results[].line_start` (`number`)：anchor 起始行。
- `results[].risk` (`string`)：以逗号分隔的源码 anchor 风险标签。
- `results[].authority_rank` (`number`)：工作流和源码结果一起显示时使用的权威顺序。
- `results[].authority_label` (`string`)：权威类别，例如 `command_contract` 或 `source_navigation_hint`。
- `results[].source_scope` (`string`)：结果来自工作流数据还是源码 anchor 数据。
- `results[].navigation_only` (`boolean`)：结果是否只是代码导航提示。
- `results[].can_instruct_agent` (`boolean`)：结果是否可以承载工作流指令。
- `results[].match` (`string`)：匹配上下文片段。
- `results[].score` (`number`)：用于结果排序的排名分数。

## 退出码

- `0`：搜索完成。
- `1`：输入无效、`.mustflow/cache/mustflow.sqlite` 缺失，或索引已过期。
