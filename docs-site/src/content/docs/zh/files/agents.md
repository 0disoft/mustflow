---
title: AGENTS.md
description: Agent 首先读取的根级简短工作规则入口。
---

`AGENTS.md` 是 LLM agent 进入仓库后首先读取的根级入口。

## 使用位置

`mf init` 会在目标仓库根目录创建这个文件，因为 agent 进入仓库后需要立刻找到它。

它是 mustflow 文档流程的入口。详细策略放在 `.mustflow/docs/agent-workflow.md`，可执行命令放在 `.mustflow/config/commands.toml`，仓库级偏好放在 `.mustflow/config/preferences.toml`，任务相关项目上下文放在 `.mustflow/context/`，可重复执行的流程放在 `.mustflow/skills/`。

## 作用

- 启动 mustflow 文档流程。
- 定义第一批读取顺序。
- 只保留绝对规则，例如不能猜测命令、保留既有改动、处理敏感信息。
- 将详细工作流程指向 `.mustflow/docs/agent-workflow.md`。
- 让命令是否可执行取决于 `.mustflow/config/commands.toml` 中的命令意图状态。
- 要求 agent 检查 `.mustflow/skills/INDEX.md`，并在编辑相关范围前读取匹配的 `SKILL.md`。
- 说明 `mf doctor` 是只读诊断命令，必要时应在编辑前运行。
- 说明 `mf context --json` 是只读上下文索引，不能替代实际文档读取。
- 将长时间运行或敏感任务指向 `mustflow.toml` 中的 `[budget]`、`[approval]` 和 `[isolation]`。

## 读取顺序

```text
AGENTS.md
.mustflow/docs/agent-workflow.md
.mustflow/config/mustflow.toml
.mustflow/config/commands.toml
.mustflow/config/preferences.toml  # when present
.mustflow/skills/INDEX.md
.mustflow/context/INDEX.md  # only when task-specific context is needed
.mustflow/context/<name>.md  # only when selected by the context index
.mustflow/skills/<name>/SKILL.md
REPO_MAP.md  # only when broad navigation is needed
```

## 前置元数据

```yaml
mustflow_doc: agents.root
locale: en
canonical: true
revision: 4
```

- `mustflow_doc`: mustflow 内部的稳定文档标识符。
- `locale`: 文档语言。
- `canonical`: 该文档是否为权威源文档。
- `revision`: 权威文档修订号。

英文模板 `AGENTS.md` 是权威源文档。本地化模板文件使用自己的语言，并设置 `canonical: false`。

## 编写规则

`AGENTS.md` 保留在仓库根目录，方便 agent 快速发现。

不要在 `AGENTS.md` 中硬编码实际测试命令、构建命令、仓库树、近期变更或生成时间戳。这些细节会降低输入稳定性，应放在 `commands.toml`、`REPO_MAP.md` 或相关源文件中。

语言、注释、提交消息、文档、日志和格式化的默认值应放在 `.mustflow/config/preferences.toml`，不要在 `AGENTS.md` 中写成长篇说明。

`AGENTS.md` 只应简短声明 skill 选择义务。详细选择规则应放在
`.mustflow/skills/INDEX.md` 和 `.mustflow/docs/agent-workflow.md`。

不应从 `AGENTS.md` 启动自主循环、worker 队列、角色系统或长时间运行的 harness。如果仓库需要这些能力，应在 mustflow 配置和配套文档中显式声明。
