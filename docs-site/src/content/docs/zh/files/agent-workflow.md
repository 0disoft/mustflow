---
title: .mustflow/docs/agent-workflow.md
description: 说明 agent 如何在仓库中开始、编辑、验证并收尾工作。
---

`.mustflow/docs/agent-workflow.md` 描述 agent 在当前仓库中的专用工作流程。

## 使用位置

如果说 `AGENTS.md` 是首先读取的简短规则文件，那么这个文件会把这些规则展开为共享工作策略。

agent 在读取 `AGENTS.md` 后读取它，以理解命令执行、输入稳定性、上下文压缩、编辑范围、验证、失败处理和敏感信息处理。

## 组成部分

- `Document role`: 定义该文件负责的内容。
- `Authoritative documents and reading flow`: 列出 agent 首先读取的文件。
- `Project context`: 说明何时读取 `.mustflow/context/INDEX.md` 和任务相关上下文文件。
- `Pre-work checks`: 要求 agent 检查变更、受保护路径、命令意图和相关 skill。
- `Input stability policy`: 避免把易变数据放在必读文件顶部。
- `Instruction refresh policy`: 定义长会话何时应重新读取 mustflow 指令。
- `Context compaction policy`: 说明近期派生上下文、中层摘要和长期摘要的边界与权威顺序。
- `Harness contract boundary`: 将仓库合同与 agent 运行时分开。
- `Long-running task phases`: 定义计划、工作、验证、判断和交接阶段。
- `Verification ratchet`: 防止 agent 为了显得完成而弱化检查。
- `Test relevance policy`: 让测试与当前行为合同保持一致。
- `Preference interpretation policy`: 说明如何应用 `preferences.toml` 中的语言、格式、提交和日志默认值。
- `Git behavior policy`: 禁用自动暂存、提交和推送，并把提交消息建议视为报告内容。
- `Command execution policy`: 只允许 `commands.toml` 中声明的有限命令意图。
- `Edit policy`: 将变更限制在直接相关文件内。
- `Verification policy`: 说明变更后应检查哪些命令意图。
- `Failure handling policy`: 记录失败意图、工作目录、退出码和关键错误。
- `Security and secret handling policy`: 防止暴露令牌、私钥和真实环境值。
- `Document flow maintenance`: 告诉维护者在规则、命令、skill 或受保护路径变化时应更新哪个 mustflow 文件。

## 命令执行策略

可执行命令的事实来源是 `.mustflow/config/commands.toml`。

agent 只能运行满足全部执行关口的命令意图：`status = "configured"`、`lifecycle = "oneshot"`、`run_policy = "agent_allowed"`、`stdin = "closed"`、正整数 `timeout_seconds`、通过 `argv` 或 `mode = "shell"` 加 `cmd` 声明的命令，以及位于当前 mustflow 根目录内的 `cwd`。如果意图缺失，或状态为 `unknown`、`not_applicable`、`manual_only`、`disabled`，agent 不得推断替代命令，必须报告跳过原因。

新配置应将 `manual_only` 用作意图的 `status`。为兼容旧配置，可以接受 `run_policy = "manual_only"`，但新模板不会生成它。

已配置意图应尽可能使用 `argv` 数组。只有确实需要 shell 语法时，才使用 `mode = "shell"` 和 `cmd`。

不要直接运行生命周期为 `server`、`watch`、`interactive`、`browser` 或 `background` 的命令。开发服务器、监听模式、浏览器界面和后台进程不是有限验证命令。

当 `mf run <intent>` 可用时，有限命令应优先使用它。

`mf run` 会把最新执行结果作为运行 receipt 写入 `.mustflow/state/runs/latest.json`。
当自动化或最终报告需要结构化证据时，使用 `mf run <intent> --json`。
receipt 是一次执行的记录；命令定义的事实来源仍然是 `commands.toml`。

宿主 shell 可以执行命令，但直接执行项目命令并不会自动算作 mustflow 验证。
如果命令绕过 `mf run`，除非用户明确批准了手动例外，并且最终报告说明没有生成 mustflow 运行 receipt，否则只能把输出视为较低可信度的上下文。

`mf context --json` 是只读索引，可以快速显示当前根目录的读取顺序、命令意图、能力和最新运行摘要。它不能替代实际文档和配置文件读取，项目测试或构建命令仍然遵循 `commands.toml` 中的意图合同。

`mf doctor` 或 `mf doctor --json` 是只读诊断命令，会在编辑前汇总安装状态、检查结果、可运行命令意图和下一步。它不会写入文件，因此 agent 可以用它进行首次定向。

修改 mustflow 文档、skill、命令合同或仓库地图生成规则后，应尽可能运行 `mf check --strict`。它会额外检查 skill 文档中的原始 shell 命令块、`REPO_MAP.md` 中的易变元数据、命令输出限制、保留策略、生成文件大小、原始 JSONL 日志轨迹，以及最新运行 receipt 格式。

## 输入稳定性

将共享策略保留在本文档中，将可执行命令放在 `commands.toml` 中。

将可重复流程移到 `.mustflow/skills/`，不要把完整共享策略复制到每个 skill 文档中。

将项目方向和领域承诺保留在 `.mustflow/context/`。agent 只有在需要任务相关上下文时才应读取 `.mustflow/context/INDEX.md`，然后只读取被选中的上下文文件。

上下文文件的权威性低于用户直接指令、当前代码、测试、命令合同和已配置策略。如果 `DESIGN.md` 存在，在处理界面工作时，应把它作为可选外部视觉设计锚点，而不是把设计令牌复制到 `.mustflow/context/`。

将仓库导航地图保留在生成的 `REPO_MAP.md` 中，而不是让本文档不断变长。`REPO_MAP.md` 是锚点文件地图，不是完整文件清单；它不属于必读顺序，只应在需要宽范围导航时读取。

不要把生成时间、哈希、文件数量、近期变更摘要或长日志等易变值放在本文档顶部附近。

不要在 `.mustflow/` 下不断追加完整聊天记录、完整终端输出或原始 JSONL 事件日志。执行结果应保持为小型运行 receipt，知识文件应是带来源的摘要，而不是原始日志。

## 有效规则通道

不要把所有指令压成一条优先级列表。应按规则类型解决冲突：

- 用户目标：当前用户直接指令定义任务，除非它不安全。
- 宿主安全：宿主的审批、沙盒、检查点和 shell 执行限制仍然有效。
- 仓库工作规则：最近的 `AGENTS.md` 和 `.mustflow/config/*.toml` 定义仓库合同。
- 命令执行：`.mustflow/config/commands.toml` 定义项目命令合同。
- 验证证据：`mf run` receipt 和当前文件比直接宿主 shell 输出更可信。
- 上下文与偏好：`.mustflow/context/*`、`preferences.toml` 和生成地图只是较低权威的默认值。
- 会话与缓存状态：宿主摘要、`.mustflow/cache/**` 和 `.mustflow/state/**` 永远不能覆盖当前文件或当前用户指令。

允许的操作集合按交集收窄。禁止操作、审批要求、隐私规则和破坏性命令规则会累积。有效规则不明确时，停止并报告冲突，不要猜测。

## 指令刷新

长会话可能让任务开始时加载的指令变得不明显。`agent-workflow.md` 将其视为检查点问题，而不是把轮次计数写入仓库的理由。

agent 应在首次编辑前、当前命令意图还没有新鲜命令级刷新时的命令执行前、上下文压缩后、编辑 `AGENTS.md` 或 `.mustflow/**` 后、切换根目录后，以及最终报告前刷新 mustflow 指令。

具体文件集合来自 `.mustflow/config/mustflow.toml` 中的 `[refresh.levels]`。

## 上下文压缩策略

长会话期间创建的压缩摘要是派生辅助记忆。`agent-workflow.md` 规定它们的权威性低于当前用户指令、当前代码和配置、命令合同以及运行 receipt。

不要在项目中存储隐藏思维链、敏感信息或无边界的完整聊天记录。共享项目知识只应以带来源的决策、调查记录或交接摘要形式沉淀。

## Harness 合同边界

mustflow 不是自主 agent 运行时。它提供 agent harness 可以读取的仓库本地合同。

- Brain 合同：`AGENTS.md`、`agent-workflow.md` 和 skill 文档。
- Hands 合同：`commands.toml`、`mf run` 和有限命令生命周期。
- Session 合同：有边界的运行 receipt、带来源摘要和紧凑交接记录。
- Judge 合同：原始目标、验收标准、已变更文件、命令合同和 receipt。

## 长时间任务阶段

长时间工作应区分计划、工作、验证、判断和交接。判断阶段不能只接受 worker 的完成声明；它需要检查原始标准、已变更文件和运行 receipt。

## 验证棘轮

该工作流禁止为了让任务看起来完成而弱化验证。agent 不得删除失败测试、无解释地放宽断言、跳过相关命令意图、仅为规避失败而修改命令意图状态，或在实现后重写验收标准。

当预期行为变化或现有测试错误时，测试可以变更，但最终报告必须说明原因。

## 测试相关性策略

测试验证当前行为合同。agent 不得仅因为旧测试期待某个行为就重新引入已移除行为，也不得为有意移除的功能保留测试。

移除测试或弱化断言时，应区分当前合同清理与规避验证。如果相关性不确定，应报告可能过期的候选项，而不是直接删除。

## 偏好解释策略

`.mustflow/config/preferences.toml` 包含仓库级默认值，其优先级低于用户直接指令和现有本地风格。

agent 不得以该文件为理由，在没有任务原因的情况下重新格式化整个文件、修改无关文件或翻译现有日志字符串。

`preserve_existing` 表示 agent 遵循可见的现有约定。在看不到约定的新仓库中，agent 使用每个字段的 `fallback` 值。

用户聊天语言不得自动决定代码注释、日志、错误消息或提交消息语言。

## Git 行为策略

`git.auto_stage`、`git.auto_commit` 和 `git.auto_push` 默认都是 `false`。

这些值是仓库偏好设置，不是权限。它们不会覆盖用户的直接指示、`.mustflow/config/commands.toml`，也不会覆盖 `.mustflow/config/mustflow.toml` 中的审批策略。尤其是，`git.auto_commit = true` 不表示获得推送权限，且不能通过 `mf init` 启用 `git.auto_push = true`。

没有用户明确请求时，agent 不得暂存、提交、修补提交、变基、重置、推送，或以其他方式改变 Git 状态或历史。

提交消息建议是最终报告的一部分，不是 Git 执行权限。文件发生变更且提交建议已启用时，agent 可以建议提交消息，但不得暗示已经创建提交。
