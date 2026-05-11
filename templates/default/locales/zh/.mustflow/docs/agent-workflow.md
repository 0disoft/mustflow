---
mustflow_doc: docs.agent-workflow
locale: zh
canonical: false
revision: 13
lifecycle: mustflow-owned
authority: workflow-policy
---

# 代理工作流

本文档是对 `AGENTS.md` 中简要路由说明的扩展，定义了代理在 mustflow 根目录内的默认操作循环。

## 方向校准

开始编辑前，请先阅读 `AGENTS.md` 中列出的文件。可使用 `mf doctor` 进行快速只读健康检查，确认安装状态、已配置的命令意图及建议的下一步操作。

请仅将 `REPO_MAP.md` 作为当前 mustflow 根目录的生成式导航图。它并非完整文件清单，不能替代对任务相关文件的实际阅读。

## 项目上下文

`.mustflow/context/` 包含面向代理的任务特定项目上下文，不是通用文档归档。

- 仅当任务涉及项目、产品、领域、UI、后端、数据、安全或运维上下文时，才读取 `.mustflow/context/INDEX.md`。
- 只读取索引中选定的上下文文件。
- 将上下文文件视为辅助信息，优先级低于用户直接指令、当前代码、测试、命令合同和已配置策略。
- 不要推断缺失的项目目标、非目标、API 承诺、数据规则或设计标记。
- 若存在 `DESIGN.md`，在 UI 工作中将其视为可选的外部视觉设计参考，不要将其中的设计标记复制到 `.mustflow/context/`。
- 若上下文与当前文件或命令冲突，应报告冲突并遵循更高权威来源。

## Skill 激活

Skill 是任务流程文档，不是自治工具。激活 skill 表示读取对应的 `.mustflow/skills/<name>/SKILL.md`，并在当前命令合同内遵循其流程。

在任务开始和首次编辑前：

1. 读取 `.mustflow/skills/INDEX.md`。
2. 将当前任务与其中列出的场景进行匹配。
3. 在编辑对应范围前，读取所有匹配的 `SKILL.md`。
4. 若无适用 skill，不要臆造；在 `AGENTS.md` 和 `.mustflow/config/commands.toml` 下执行最小且安全的变更。

若新证据改变任务类型，应在后续激活相应 skill。例如，已配置命令失败时激活 failure triage，测试合同变化时激活 test maintenance，文档或工作流变化时激活 docs update。

当多个 skill 适用时，对每个受影响范围遵循最具体的 skill，并仅合并其声明的命令意图。skill 永远不会授权执行原始 shell 命令、长时运行进程或任务范围外写入。

使用技能时，或有意跳过看似适用的技能时，请在下一次面向用户的更新或最终报告中简要说明技能名称和选择原因。不要仅为记录技能选择而创建纳入版本管理的工作日志。

## 输入稳定性

请将用户指令、本地文件、命令合同与生成报告视为独立信息源，避免混淆。

- 用户直接指令优先。
- 距离变更文件最近的 `AGENTS.md` 优先于更上层的广义规则。
- `.mustflow/config/preferences.toml` 提供默认值，不是强制要求。
- `REPO_MAP.md`、`.mustflow/cache/**` 与 `.mustflow/state/**` 等生成文件可能已过期。
- compacted summary 属于状态的衍生表示，当前代码、配置、命令记录与当前用户指令优先于它们。

当生成文件疑似过期时，应通过对应 `mf` 命令刷新，而非手工编辑。

## 有效规则通道

不要将所有指令混合成单一优先级表，应按规则类型解决冲突：

- 用户目标：当前用户直接指令定义任务，除非该指令不安全。
- 宿主安全：宿主的审批、沙箱和执行门禁更严格时仍然有效。
- 仓库工作规则：使用最近的 `AGENTS.md` 和 `.mustflow/config/*.toml`。
- 命令执行：`.mustflow/config/commands.toml` 是项目命令合同。
- 验证证据：`mf run` 回执和当前文件比宿主 shell 直接输出更可信。
- 上下文和偏好：`.mustflow/context/*`、`preferences.toml` 和生成地图是较低权威的默认值。
- 会话和缓存状态：宿主摘要、`.mustflow/cache/**` 和 `.mustflow/state/**` 永远不能覆盖当前文件或当前用户指令。

允许集合按交集收窄。禁止行为、审批要求、隐私规则和破坏性命令规则会累加。

若有效规则不明确，应停止并报告冲突，而非猜测。

## 指令刷新

长会话可能导致指令漂移。应将指令刷新视为强制检查点，而非项目文件计数器。

请在以下时机刷新 mustflow 指令：

- 会话开始
- 新任务开始
- 第一次编辑前
- 执行命令前（仅当当前任务和命令意图尚无新鲜的命令级刷新时）
- 编辑 `AGENTS.md` 或 `.mustflow/**` 后
- 切换根目录或进入嵌套仓库后
- 上下文压缩或摘要后
- 最终报告前
- 达到配置的轮次、工具调用数或输出体量阈值后

使用 `.mustflow/config/mustflow.toml` 的 `[refresh]` 配置决定刷新级别：

- `light`：重读 `AGENTS.md` 与 `.mustflow/docs/agent-workflow.md`
- `command`：重读 `AGENTS.md` 与 `.mustflow/config/commands.toml`
- `skill`：重读 `AGENTS.md` 与 `.mustflow/skills/INDEX.md`
- `full`：重读 mustflow 全部阅读序列

`before_command_run` 是当前命令意图的新鲜度检查点；当命令合同无变化时，不要求每次执行命令前都重读所有文件。

不要将轮次计数、消息计数或会话活动写入仓库。若代理宿主需跟踪刷新状态，应使用本地缓存或宿主管理状态，且放置于项目版本化文档之外。skills 可描述刷新行为，但不作为可靠的生命周期钩子。

## 上下文压缩

`compaction` 不是默认数据收集功能，而是未来 harness 或宿主应遵守的安全策略。默认模板保持禁用，仅声明安全规则。

不要在项目中存储隐藏推理、密钥、完整聊天记录、完整终端输出、原始事件或原始命令日志。若未来宿主生成摘要，摘要必须带来源链接，且权威性低于当前文件和当前用户指令。

## Harness 合同边界

mustflow 不是自治代理运行时，而是面向代理 harness 的仓库本地合同层。

- Brain contract：`AGENTS.md`、本工作流文件与 skill 文档定义模型预期行为。
- Hands contract：`.mustflow/config/commands.toml` 与 `mf run` 定义安全命令执行。
- Session contract：运行记录、边界检查点与紧凑交接为恢复提供证据。

除非仓库明确引入，否则不要创建 worker 目录、persona 系统、fleet orchestration、原始事件日志或自治循环。

## 长时任务阶段

对于长时或恢复型任务，应区分以下阶段：

1. Plan：阅读任务目标、仓库规则、命令合同与验收标准。
2. Work：在当前单元上做最小且安全的修改。
3. Verify：仅运行已配置的 oneshot command intents，优先通过 `mf run`。
4. Judge：对照原始验收标准与运行回执评估结果。
5. Handoff：当任务未完成、受阻或需续接时，留下紧凑交接信息。

Judge 阶段不得仅凭 worker 的“完成声明”判定通过，应依据任务目标、变更文件、命令合同与运行回执。

## Git 行为策略

默认拒绝修改 Git 状态或历史的操作。

- `git.auto_stage = false`：无用户请求时不暂存文件。
- `git.auto_commit = false`：无用户请求时不创建提交。
- `git.auto_push = false`：无用户请求时不推送。

这些值是仓库偏好设置，不是权限控制。它们不会覆盖用户直接指令、`.mustflow/config/commands.toml`，也不会覆盖 `.mustflow/config/mustflow.toml` 中的审批策略。尤其是，`git.auto_commit = true` 不代表获得推送权限，且不能通过 `mf init` 启用 `git.auto_push = true`。

## 版本影响策略

版本影响设置是仓库偏好，指导版本文件编辑，但不会覆盖用户直接指令、宿主安全规则，也不会覆盖 `.mustflow/config/mustflow.toml` 中的审批关卡。

当代码、模板、schema、CLI 行为、包元数据、用户可见文档、安装输出或测试发生变化时，使用 `.mustflow/config/preferences.toml` 中的 `[release.versioning]` 配置：

- `impact_check = true`：报告当前差异是否可能需要包版本或模板版本变更。
- `suggest_bump = true`：证据明确时，可建议 patch、minor 或 major 版本升级。
- `auto_bump = true`：当影响明确、已定位版本来源，且无更严格的用户、宿主或审批规则阻止时，自动应用合适的版本升级。
- `auto_bump = false`：除非用户请求版本升级或 release 准备任务，否则保持包和模板版本文件不变。
- `require_user_confirmation = true`：编辑版本文件前先询问用户。
- `require_user_confirmation = false`：当 `auto_bump = true` 时，不额外增加确认步骤。

在建议或应用版本变更前，先定位仓库的版本事实来源。不要假设 `package.json` 是唯一版本文件，应检查与仓库语言和框架相匹配的 manifest、release 文档和既有更新模式，并报告哪些文件是权威来源，哪些是派生文件。

常见版本来源候选包括：

- JavaScript 或 TypeScript：`package.json` 及重复包元数据的包管理器 lockfile。
- Python：`pyproject.toml`、`setup.cfg`、`setup.py` 或包内 `__version__` 文件。
- Rust：`Cargo.toml`；仅当仓库将 lockfile 变更视为 release 元数据时才考虑 `Cargo.lock`。
- Go：优先检查 release tag 和 release 文档；仅在模块路径或工具元数据相关时检查 `go.mod`。
- Java 或 Kotlin：`pom.xml`、`build.gradle`、`build.gradle.kts` 或 `gradle.properties`。
- .NET：`*.csproj`、`Directory.Build.props` 或 `*.nuspec`。
- Ruby、PHP、Dart 或 Swift：`*.gemspec`、`lib/**/version.rb`、`composer.json`、`pubspec.yaml` 或 `Package.swift`。
- 容器、chart 或应用：`Chart.yaml`、镜像标签、应用 manifest、release notes 或部署元数据。
- mustflow 模板：包元数据、模板 manifest、文档示例，以及断言安装版本的测试。

版本变更时，应根据 `sync_*` 偏好同步包元数据、模板 manifest 版本、文档示例和测试。

## 命令执行策略

不要从 `package.json`、`Makefile`、`justfile`、`Taskfile.yml` 或源码文件推断命令，应以 `.mustflow/config/commands.toml` 作为命令合同。

仅当以下条件全部满足时，命令意图才可由代理执行：

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- `timeout_seconds` 为正整数
- 命令通过 `argv` 声明，或通过 `mode = "shell"` 和 `cmd` 声明
- `cwd` 保持在当前 mustflow 根目录内

`manual_only` 是新配置中的状态值。为兼容旧配置，可读取 `run_policy = "manual_only"`，但新模板应使用 `status = "manual_only"`。

优先使用 `mf run <intent>`，以便项目在 `.mustflow/state/runs/latest.json` 中获得精简运行记录。

串行运行 `mf run` 命令意图。当另一个已配置意图仍在运行时，不要启动第二个 `mf run`。声明了非空 `writes` 的意图是排他的验证阶段；运行其他 `mf run` 前，必须等待其完成。尤其当意图重写 `dist/` 等 package output 时，这一点尤为重要，因为本地 `mf` 可执行文件可能从该 output 加载。

宿主 shell 可执行命令，但直接运行项目命令不自动视为 mustflow 验证。若命令绕过 `mf run`，除非用户明确批准手动例外且最终报告说明未生成 mustflow 运行回执，否则只能将其输出视为较低可信度的上下文。

不要直接运行开发服务器、watcher、浏览器启动、交互式提示或后台进程，应报告被跳过的意图及原因。

## 编辑策略

改动应限于任务范围内，避免顺手重构（drive-by refactor）。不要修改 `.mustflow/config/mustflow.toml` 中受保护路径。

遵循项目既有风格，若风格不明确，使用 `.mustflow/config/preferences.toml` 中的默认值。

## 文档审阅队列

当代理创建或修改面向用户、工作流、模板、上下文或 skill 文档时，除非用户明确要求不跟踪，否则使用 `mf docs review add <path>` 记录被触及的文档。队列存储在 `.mustflow/review/docs.toml`，仅在需要时创建。

审阅可由人类、LLM、工具或外部流程完成。只记录宽泛的审阅者类型，以及审阅者 id、提供方、模型、命令意图和摘要等自由格式标识，不维护固定的具体 LLM 产品列表。

使用 `mf docs review approve <path> --reviewer-kind <kind> --reviewer-id <id>` 可将已批准文档从默认审阅列表中隐藏，同时保留审阅记录。审阅者无法在批准时使用 `needs-human`；仅当仓库有意跳过审阅时使用 `ignore`。

生成文件应通过工具刷新：

- `REPO_MAP.md` 通过 `mf map --write`
- `.mustflow/cache/mustflow.sqlite` 通过 `mf index`
- `.mustflow/state/runs/latest.json` 通过 `mf run <intent>`

## 验证

检查时使用已配置的命令意图。常见意图名称包括：

- `mustflow_check`
- `test`
- `lint`
- `build`
- `docs_validate`

若预期意图缺失、禁用、仅手动可用或未配置，不要臆造替代方案，应明确报告跳过内容及原因。

## 验证选择策略

使用 `.mustflow/config/preferences.toml` 的 `[verification.selection]` 配置选择验证范围。此类偏好不授予命令执行权限，仅用于决定应考虑哪些已配置的命令意图。

验证范围应与风险成比例。若已配置 `test_related`、`test_fast`、`build` 或文档专用检查，且能覆盖本次变更，应优先于宽泛测试套件使用。全量测试适用于跨领域行为、发布风险、缺少更窄覆盖或已配置策略明确要求的场景。若更窄意图合适但处于 `unknown`、`manual_only` 或缺失状态，应报告缺口，而非默默将最慢套件作为默认。

- `strategy = "risk_based"`：优先选择覆盖变更行为、公开表面、命令合同和风险区域的最小检查。
- `strategy = "targeted"`：除非用户、skill 或策略要求更广验证，否则优先选择直接相关检查。
- `strategy = "full"`：优先使用完整且适用的已配置验证集合。
- `prefer_related_tests = true`：在宽泛测试意图前，优先寻找更窄且相关的测试意图。
- `skip_docs_only_full_test = true`：仅文档变更且文档验证覆盖相关表面时，可跳过宽泛测试。
- `skip_translation_only_full_test = true`：仅翻译变更且源行为未变时，可跳过宽泛测试。
- `skip_copy_only_full_test = true`：仅文案变更且行为、schema、模板、命令合同未变时，可跳过宽泛测试。
- `report_skipped = true`：最终报告必须说明跳过的检查及原因。

若证据显示行为、安全、数据、命令合同、发布输出或生成模板发生变化，不应用跳过偏好掩盖风险，应提升到相关已配置意图，或报告缺失所需意图。

## 验证收紧机制

不要为了“看起来完成”而削弱验证。

代理不得：

- 删除失败测试以通过检查
- 未说明原因放宽断言
- 跳过相关命令意图
- 仅为规避失败将命令意图标记为 `not_applicable`
- 在实现后变更验收标准

当目标行为已变化、旧测试错误或新行为需要新增覆盖时，可更新测试，且必须在最终报告中说明此类变更。

## 测试相关性策略

测试是行为合同，不是永久工件。

使用 `.mustflow/config/preferences.toml` 中的 `[testing.authoring]` 指导代理创建新测试的积极程度。默认值 `new_test_policy = "evidence_required"` 表示新测试应基于行为合同依据，如公开行为变化、回归风险、配置规则、schema 合同或安全/数据路径。此偏好仅指导测试编写行为，不削弱必要验证，也不能作为删除有效测试的理由。

代理不得：

- 仅因旧测试期望重新引入已移除行为
- 为已故意移除的功能保留测试
- 仅为通过验证删除失败测试
- 未解释行为变化放宽断言
- 仅为通过测试更新 snapshot

当被测行为被有意移除、公开合同已变化、测试仅编码已移除实现细节、覆盖被更强测试重复或 snapshot 过时时，可更新或删除测试。

测试新增、更新、删除或被识别为过时候，应报告行为合同、受影响测试、已运行命令、跳过的命令意图及剩余测试风险。

## 预算、审批与隔离

长时任务安全策略请使用 `.mustflow/config/mustflow.toml`。

- `[budget]` 限制迭代次数、墙钟时间、命令运行次数、输出体量与重复失败次数。
- `[approval]` 列出继续执行前必须人工审批的操作。
- `[isolation]` 描述长时任务推荐的 worktree 或 sandbox 边界。

达到预算上限或审批门槛时，应停止并报告。仅当仓库明确启用交接流程时使用 handoff，避免持续循环。

若隔离策略要求独立 worktree 或 sandbox，不要在有脏改动的主 worktree 中运行长时自治任务。

## 失败处理

当命令失败时：

1. 保留原始命令意图名称。
2. 分析退出码并截取输出尾部。
3. 识别最可能根因。
4. 避免修改无关文件。
5. 修复后重跑最有针对性的相关验证。
6. 报告跳过检查及剩余风险。

不要在 `.mustflow/` 中存储完整原始日志、密钥、客户数据或长转录。

## 报告

最终报告应包含：

- 变更文件
- 已执行的命令意图
- 跳过的命令意图及原因
- 验证结果
- 剩余风险

仅当 `.mustflow/config/preferences.toml` 允许时，才建议提交 commit。