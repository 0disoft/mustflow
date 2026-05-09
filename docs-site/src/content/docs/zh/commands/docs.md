---
title: mf docs
description: 跟踪 LLM 修改后需要文字审阅的文档。
---

`mf docs review` 管理一个仓库本地的审阅队列，用于记录由代理创建或修改的文档。

队列存储在 `.mustflow/review/docs.toml`。`mf init` 不会创建该文件；只有添加文档审阅项时才会出现。

## 审阅模型

队列跟踪文档状态，而不是固定的审阅产品列表。

- `pending`：需要审阅。
- `in_review`：审阅已开始。
- `changes_made`：审阅者修改了文档。
- `approved`：审阅完成，默认列表会隐藏该文档。
- `needs_human`：审阅者无法有把握地批准该文档。
- `ignored`：该文档被明确排除在审阅之外。

审阅者只使用宽泛类型：`human`、`llm`、`tool` 或 `external`。具体名称、提供方、模型和命令意图都是自由格式元数据。

## 列出文档

```sh
npx mf docs review list
npx mf docs review list --json
npx mf docs review list --all
```

默认列表只显示活跃项目。使用 `--all` 可包含已批准和已忽略的条目。

## 添加文档

```sh
npx mf docs review add docs/guide.md --reason llm_modified --actor-kind llm --actor-id codex
```

添加文档会创建或更新队列条目，并将状态设为 `pending`。

## 批准文档

```sh
npx mf docs review approve docs/guide.md --reviewer-kind llm --reviewer-id opencode --reviewer-provider deepseek --reviewer-model deepseek-reasoner --summary "Rewritten for natural tone."
```

批准会让文档从默认列表中隐藏，但保留审阅记录。审阅者无法安全批准时使用 `needs-human`；仓库明确跳过该文件时使用 `ignore`。

## 帮助与退出码

```sh
npx mf docs --help
```

- 退出码 `0`：队列已检查或更新。
- 退出码 `1`：输入无效或队列无法更新。
