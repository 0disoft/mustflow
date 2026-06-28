---
title: mustflow
description: 面向使用者的文档，说明 mustflow 安装的代理可读工作流。
---

mustflow 文档说明 `mf init` 会在用户仓库中创建哪些只面向 LLM 的文件和字段。

## 本站说明内容

- 每个文件会放在目标仓库的哪个位置。
- 代理应优先读取哪些文件。
- 每个配置字段和文档章节的含义。
- 哪些文件会被复制、哪些会被生成、哪些有意不创建。
- 命令合同如何防止代理猜测命令。
- 代理可以通过 `mf context --json` 检查哪些上下文。

## 默认结构

```text
AGENTS.md
REPO_MAP.md  # 可选生成文件
.mustflow/
├─ config/
│  ├─ commands.toml
│  ├─ mustflow.toml
│  ├─ preferences.toml
│  └─ manifest.lock.toml  # init 成功后生成
├─ context/
│  ├─ INDEX.md
│  └─ PROJECT.md
├─ docs/
│  └─ agent-workflow.md
├─ skills/
│  ├─ INDEX.md
│  └─ */SKILL.md
└─ state/  # 使用过程中生成
   └─ runs/
      ├─ run-*/receipt.json
      └─ latest.json
```

`mf init` 不会创建 `README.md`、`.github/`、根目录 `docs/`、根目录 `skills/`、源代码或包管理器配置。
`REPO_MAP.md` 会根据仓库结构生成，而不是从模板复制。
`manifest.lock.toml` 由 `mf init` 生成，用于记录实际安装结果。
`.mustflow/state/runs/latest.json` 是最新运行指针；每个 `run-*` 目录保留对应执行的已保存回执，`latest.index.json` 汇总最近保留的 `run-*` 和 `verify-*` 目录。

## 阅读顺序

1. 阅读 `AGENTS.md`，了解简短的强制规则。
2. 阅读 `.mustflow/docs/agent-workflow.md`，了解共享工作策略。
3. 阅读 `.mustflow/config/mustflow.toml`，了解权威文档和受保护路径。
4. 阅读 `.mustflow/config/commands.toml`，了解可执行的命令意图。
5. 当 `.mustflow/config/preferences.toml` 存在时，阅读仓库级默认值。
6. 阅读 `.mustflow/skills/INDEX.md`，选择相关技能。
7. 只有在需要任务特定项目上下文时，才阅读 `.mustflow/context/INDEX.md`。

本站是参考文档，不会复制到用户项目中。
