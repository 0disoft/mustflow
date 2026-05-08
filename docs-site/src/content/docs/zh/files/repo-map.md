---
title: REPO_MAP.md
description: 供 agent 导航当前 mustflow 根目录的锚点文件地图。
---

`REPO_MAP.md` 是当前 mustflow 根目录下的可选生成文件。

它不是完整文件清单。它会寻找 `AGENTS.md`、根 Markdown 文档、机器可读合同文件、`package.json`、`SKILL.md`、`.mustflow/context/INDEX.md` 以及特定语言配置文件等重要锚点文件，让 agent 知道在当前根目录中应先查看哪里。

这里的根目录不一定只对应一个 Git 仓库。如果当前 mustflow 根目录是包含独立嵌套仓库的工作区，同一个 `REPO_MAP.md` 可以包含这些仓库的有限入口点。

## 使用位置

只有当 agent 需要对当前 mustflow 根目录进行宽范围导航时，才读取它。每个小改动都不需要读取它。

根目录导航应放在这个生成文件中，这样 `AGENTS.md` 和 `.mustflow/docs/agent-workflow.md` 可以保持简短。

## 作用

- 概述当前根目录中主要文件和目录存在的原因。
- 缩小 agent 首先需要检查的位置范围。
- 帮助 agent 选择安全的改动范围。
- 保持 `AGENTS.md` 简短。
- 将仓库导航与完整文件清单分开。需要每个文件时，请使用 `git ls-files` 或编辑器。
- 如果当前根目录是工作区，只列出嵌套独立仓库的入口点，而不描述它们的内部结构。

## 组成部分

- 开头句：说明这是基于锚点文件的导航地图，不是完整文件清单。
- 使用方式：当 agent 需要完整清单时，指向 `git ls-files`。
- 优先锚点：显示 `AGENTS.md`、`.mustflow/config/*.toml`、`.mustflow/context/INDEX.md` 和 `.mustflow/skills/INDEX.md` 等优先读取文件。
- 目录锚点：按目录分组 `README.md`、`AGENTS.md`、`package.json`、`SKILL.md` 和工具配置文件等重要文件。
- 嵌套仓库：对工作区根目录下发现的独立仓库，只显示 `AGENTS.md`、`REPO_MAP.md`、上下文索引和命令合同文件等入口点。
- 生成文件：说明 `REPO_MAP.md` 是生成的，不应手动编辑。
- 排除规则：排除依赖、构建输出、缓存和大文件。

## 生成规则

- 使用 `repo_map` 命令意图或 `mf map` 等命令生成它。
- 尽可能同时使用 `git ls-files` 和文件系统锚点发现。
- 默认深度是 3。这不是完整目录树深度，而是限制非优先锚点文件的搜索深度。
- 排除 `node_modules`、`dist`、`build`、`.git`、缓存和大型输出。
- 不要概述文件内容。
- 不要把生成时间、哈希或文件数量等易变值放在顶部。
- 不要列出每个源文件。只包含有助于仓库导航的锚点文件。
- 将 `.mustflow/config/preferences.toml` 等解释 agent 行为所需的配置文件作为优先锚点。
- 如果存在 `.mustflow/context/INDEX.md` 和 `.mustflow/context/PROJECT.md`，则包含它们，但默认不要展开未来所有领域上下文文件。
- 如果存在 `README.md`、`PROJECT.md`、`ROADMAP.md`、`DESIGN.md`、`GOVERNANCE.md`、`TESTING.md`、`DEPLOYMENT.md`、`ARCHITECTURE.md`、`API.md` 等项目自有根 Markdown 文档，则把它们作为可选锚点包含进来。不要在 `mf map` 中创建它们。
- 如果存在 `project.contract.json`、`project.constants.json`、`design-tokens.json`、`openapi.yaml`、`asyncapi.yaml`、`schema.graphql`、`schema.prisma` 等用途明确的机器可读合同文件，也可以作为可选锚点。`SSOT.json` 这类泛用名称不是默认锚点。
- 即使列出嵌套仓库，默认也不要包含远程 URL、分支名、近期变更状态、命令列表或自动摘要。

## 编写规则

第一行应说明这是当前 mustflow 根目录的导航地图，不是完整目录树。

```md
# REPO_MAP.md

This file is an anchor-file-based navigation map for the current mustflow root, not a full file listing.
```

结构变化时，请重新生成它，而不是把它维护成冗长的手写文档。
