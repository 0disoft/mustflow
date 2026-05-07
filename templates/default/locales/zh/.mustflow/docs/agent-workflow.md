---
mustflow_doc: docs.agent-workflow
locale: zh
canonical: false
revision: 7
---

# 代理工作流

本文档扩展了 `AGENTS.md` 中的简要路由说明。
它定义了代理在 mustflow 根目录内工作的默认操作循环。

## 方向校准

开始编辑前，请先阅读 `AGENTS.md` 列出的文件。可使用 `mf doctor` 进行快速只读健康检查，确认安装状态、已配置 command intents 与建议下一步。

请仅将 `REPO_MAP.md` 用作当前 mustflow 根目录的生成式导航图。它不是完整文件清单，不能替代对任务相关文件的实际阅读。

## 项目上下文

`.mustflow/context/` 包含面向代理的任务特定项目上下文。
它不是通用文档归档。

- 仅当任务需要项目、产品、领域、UI、后端、数据、安全或运维上下文时，才读取 `.mustflow/context/INDEX.md`。
- 只读取索引选中的上下文文件。
- 将上下文文件视为次要信息，优先级低于用户直接指令、当前代码、测试、命令合同和已配置策略。
- 不要推断缺失的项目目标、non-goals、API 承诺、数据规则或 design token。
- 若存在 `DESIGN.md`，在 UI 工作中将其视为可选外部视觉设计锚点。不要把其中 design token 复制到 `.mustflow/context/`。
- 若上下文与当前文件或命令冲突，需报告冲突并遵循更高权威来源。

## 输入稳定性

请把用户指令、本地文件、命令合同与生成报告当作彼此独立的信息源。
避免混淆这些来源。

- 用户直接指令优先。
- 距离变更文件最近的 `AGENTS.md` 优先于更上层的广义规则。
- `.mustflow/config/preferences.toml` 提供默认值，不是强制要求。
- `REPO_MAP.md`、`.mustflow/cache/**` 与 `.mustflow/state/**` 等生成文件可能过期。
- compacted summary 属于状态的衍生表示。当前代码、配置、命令记录与当前用户指令优先于它们。

当生成文件看起来过期时，应通过对应 `mf` 命令刷新，而不是手工编辑。

## 有效规则通道

不要把所有指令压成一张单一优先级表。应按规则类型解决冲突：

- 用户目标：当前用户直接指令定义任务，除非该指令不安全。
- 宿主安全：宿主的审批、沙箱和执行门禁更严格时仍然有效。
- 仓库工作规则：使用最近的 `AGENTS.md` 和 `.mustflow/config/*.toml`。
- 命令执行：`.mustflow/config/commands.toml` 是项目命令契约。
- 验证证据：`mf run` 回执和当前文件比宿主 shell 直接输出更可信。
- 上下文和偏好：`.mustflow/context/*`、`preferences.toml` 和生成地图是较低权威的默认值。
- 会话和缓存状态：宿主摘要、`.mustflow/cache/**` 和 `.mustflow/state/**` 永远不能覆盖当前文件或当前用户指令。

允许集合按交集收窄。禁止行为、审批要求、隐私规则和破坏性命令规则会累加。
如果有效规则不清楚，应停止并报告冲突，而不是猜测。

## 指令刷新

长会话可能导致指令漂移。应将指令刷新视为强制检查点，而非项目文件计数器。

请在以下时机刷新 mustflow 指令：

- 会话开始
- 新任务开始
- 第一次编辑前
- 执行命令前，但仅当当前任务和命令意图还没有新鲜的命令级刷新时
- 编辑 `AGENTS.md` 或 `.mustflow/**` 后
- 切换根目录或进入嵌套仓库后
- 上下文压缩或摘要后
- 最终报告前
- 达到配置的轮次、工具调用数或输出体量阈值后

使用 `.mustflow/config/mustflow.toml` 的 `[refresh]` 决定刷新级别：

- `light`：重读 `AGENTS.md` 与 `.mustflow/docs/agent-workflow.md`
- `command`：重读 `AGENTS.md` 与 `.mustflow/config/commands.toml`
- `skill`：重读 `AGENTS.md` 与 `.mustflow/skills/INDEX.md`
- `full`：重读 mustflow 全部阅读序列

`before_command_run` 是当前命令意图的新鲜度检查点；当命令合同没有变化时，并不要求每次重复执行命令前都重读所有文件。

不要将轮次计数、消息计数或会话活动写入仓库。若代理宿主需要跟踪刷新状态，应使用本地缓存或宿主管理状态，并放在项目版本化文档之外。skills 可以描述刷新行为，但它们不是可靠的生命周期钩子。

## 上下文压缩

`compaction` 不是默认数据收集功能。它是未来 harness 或宿主应遵守的安全策略。默认模板保持禁用，只声明安全规则。

不要在项目中存储隐藏推理、密钥、完整聊天记录、完整终端输出、原始事件或原始命令日志。如果未来宿主生成摘要，摘要必须带来源链接，并且权威性低于当前文件和当前用户指令。

## Harness 合同边界

mustflow 不是自治代理运行时。它是面向代理 harness 的仓库本地合同层。

- Brain contract：`AGENTS.md`、本工作流文件与 skill 文档定义模型预期行为。
- Hands contract：`.mustflow/config/commands.toml` 与 `mf run` 定义安全命令执行。
- Session contract：运行记录、边界检查点与紧凑交接为恢复提供证据。

不要创建 worker 目录、persona 系统、fleet orchestration、原始事件日志或自治循环，除非仓库明确引入这些可选表面。

## 长时任务阶段

对于长时或恢复型任务，应区分以下阶段：

1. Plan：阅读任务目标、仓库规则、命令合同与验收标准。
2. Work：在当前单元上做最小且安全的修改。
3. Verify：仅运行已配置 oneshot command intents，优先通过 `mf run`。
4. Judge：对照原始验收标准与运行回执评估结果。
5. Handoff：当任务未完成、受阻或需续接时，留下紧凑交接信息。

Judge 阶段不得仅凭 worker 的“完成声明”判定通过。应依据任务目标、变更文件、命令合同与运行回执。

## Git 行为策略

默认拒绝会修改 Git 状态或历史的操作。

- `git.auto_stage = false`：没有用户请求时不暂存文件。
- `git.auto_commit = false`：没有用户请求时不创建提交。
- `git.auto_push = false`：没有用户请求时不推送。

这些值是仓库偏好设置，不是权限。它们不会覆盖用户的直接指示、`.mustflow/config/commands.toml`，也不会覆盖 `.mustflow/config/mustflow.toml` 中的审批策略。尤其是，`git.auto_commit = true` 不表示获得推送权限，且不能通过 `mf init` 启用 `git.auto_push = true`。

## 命令执行策略

不要从 `package.json`、`Makefile`、`justfile`、`Taskfile.yml` 或源码文件推断命令。
应以 `.mustflow/config/commands.toml` 作为命令合同。

仅当以下条件全部满足时，command intent 才可由代理执行：

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- `timeout_seconds` 是正整数
- 命令通过 `argv` 声明，或通过 `mode = "shell"` 和 `cmd` 声明
- `cwd` 保持在当前 mustflow 根目录内

`manual_only` 是新配置中的状态值。为兼容旧配置，可以读取 `run_policy = "manual_only"`，但新模板应使用 `status = "manual_only"`。

优先使用 `mf run <intent>`，以便项目在 `.mustflow/state/runs/latest.json` 中获得精简运行记录。

宿主 shell 可以执行命令，但直接运行项目命令不会自动算作 mustflow 验证。
如果某个命令绕过 `mf run`，除非用户明确批准手动例外，并且最终报告说明没有生成 mustflow 运行回执，
否则只能将其输出视为较低可信度的上下文。

不要直接运行开发服务器、watcher、浏览器启动、交互式 prompt 或后台进程。应报告被跳过的 intent 及原因。

## 编辑策略

改动应保持在任务范围内。不要进行顺手重构（drive-by refactor）。
不要修改 `.mustflow/config/mustflow.toml` 中受保护路径。

遵循项目既有风格。若风格不明确，使用 `.mustflow/config/preferences.toml` 中默认值。

生成文件应通过工具刷新：

- `REPO_MAP.md` 通过 `mf map --write`
- `.mustflow/cache/mustflow.sqlite` 通过 `mf index`
- `.mustflow/state/runs/latest.json` 通过 `mf run <intent>`

## 验证

检查时使用已配置 command intents。常见 intent 名称：

- `mustflow_check`
- `test`
- `lint`
- `build`
- `docs_validate`

若预期 intent 缺失、禁用、仅手动可用或未配置，不要臆造替代方案。
需明确报告跳过内容与原因。

## 验证收紧机制

不要为了“看起来完成”而削弱验证。

代理不得：

- 删除失败测试来让检查通过
- 在未说明原因的情况下放宽断言
- 跳过相关 command intents
- 仅为规避失败而将 command intents 标记为 `not_applicable`
- 在实现后变更验收标准

当目标行为已变化、旧测试错误或新行为需要新增覆盖时，可更新测试。必须在最终报告中说明此类变更。

## 测试相关性策略

测试是行为合同，不是永久工件。

代理不得：

- 仅因旧测试期望而重新引入已移除行为
- 为已被有意移除的功能保留测试
- 仅为通过验证而删除失败测试
- 未解释行为变化就放宽断言
- 仅为通过测试而更新 snapshot

当被测行为被有意移除、公开合同已变化、测试仅编码了已移除实现细节、覆盖被更强测试重复，或 snapshot 已过时时，可更新或删除测试。

当测试被新增、更新、删除，或被识别为过时候选时，应报告行为合同、受影响测试、已运行命令、跳过的 command intents 与剩余测试风险。

## 预算、审批与隔离

长时任务安全策略请使用 `.mustflow/config/mustflow.toml`。

- `[budget]` 限制迭代次数、墙钟时间、命令运行次数、输出体量与重复失败次数。
- `[approval]` 列出继续执行前必须人工审批的动作。
- `[isolation]` 描述长时任务推荐的 worktree 或 sandbox 边界。

达到预算上限或审批门槛时，应停止并报告。只有该仓库明确启用交接流程时才使用 handoff。不要持续循环。
若隔离策略要求独立 worktree 或 sandbox，不要在有脏改动的主 worktree 中运行长时自治任务。

## 失败处理

当命令失败时：

1. 保留原始 command intent 名称。
2. 分析退出码与截断输出尾部。
3. 识别最可能根因。
4. 避免修改无关文件。
5. 修复后重跑最有针对性的相关验证。
6. 报告跳过检查与剩余风险。

不要在 `.mustflow/` 中存储完整原始日志、secrets、客户数据或长转录。

## 报告

最终报告应包含：

- 变更文件
- 已执行 command intents
- 跳过的 command intents 及原因
- 验证结果
- 剩余风险

仅当 `.mustflow/config/preferences.toml` 允许时再建议提交 commit。
