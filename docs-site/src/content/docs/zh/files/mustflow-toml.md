---
title: .mustflow/config/mustflow.toml
description: 声明 agent 读取顺序和受保护路径。
---

`.mustflow/config/mustflow.toml` 声明 agent 应首先读取哪些文件，以及哪些路径需要额外谨慎。

`mf check` 不只是解析这个文件。它还会验证 `[map]` 和 `[workspace]` 的值是否可以安全解释。

## 使用位置

- 将 `AGENTS.md` 中的读取顺序转换为可由机器检查的配置。
- 帮助 agent 区分 mustflow 管理的文档和用户项目文档。
- 声明受保护路径和需要额外谨慎的路径，减少意外编辑。
- 定义最终工作报告中应出现的项目。

## 章节

- `authority`: 权威 mustflow 文档。
- `read_order`: agent 的初始读取顺序。
- `optional_read_order`: 存在时读取、缺失时跳过的文件。
- `authority.workflow_preferences`: 仓库级默认偏好路径。
- `map`: `REPO_MAP.md` 的生成方式以及可包含的锚点文件。
- `workspace`: 在工作区根目录下发现独立嵌套仓库的限制。
- `context`: 仅在任务需要时使用的项目上下文层。
- `capabilities`: 该仓库提供的 agent 工作表面。
- `agent_loop`: agent 针对每个任务应遵循的标准循环。
- `harness`: agent harness 的仓库本地合同边界。
- `refresh`: 长会话期间重新读取 mustflow 指令的检查点。
- `compaction`: 默认不存储原始转录，并区分近期派生上下文、中层摘要和长期摘要的策略。
- `verification`: 验证命令的来源，以及禁止哪些推断。
- `testing`: 让测试与当前行为合同保持一致的策略。
- `handoff`: 如何安全交接未完成工作。
- `budget`: 长时间运行或重复 agent 活动的限制。
- `approval`: 继续前需要人工批准的操作。
- `isolation`: 长时间任务首选的工作树或沙箱边界。
- `retention`: 让运行 receipt、仓库地图和未来知识文件保持有界的大小限制。
- `document_roots`: 属于 mustflow 文档流程的路径。
- `document_roots.generated`: 生成文档和本地状态路径。
- `edit_policy.protected`: agent 默认不应编辑的路径。
- `edit_policy.extra_care`: 编辑前需要额外谨慎的路径。
- `reporting`: 最终工作报告中应包含的项目。

## 读取顺序字段

```toml
read_order = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/skills/INDEX.md",
]
optional_read_order = [
  ".mustflow/context/INDEX.md",
  "REPO_MAP.md",
]
```

`read_order` 是必需文档流程。`optional_read_order` 列出存在时读取、缺失时跳过的文档。

这个文件减少 agent 猜测，并帮助防止意外编辑生成文件或敏感信息。

`REPO_MAP.md` 属于 `optional_read_order` 和 `document_roots.generated`。agent 只应在需要宽范围仓库导航时读取它，将其视为锚点文件地图而不是完整文件清单，并在需要时重新生成它。

`.mustflow/context/INDEX.md` 属于 `optional_read_order`，因为 agent 只有在项目、产品、领域、界面、后端、数据、安全或运维上下文与任务相关时才应读取它。

`.mustflow/cache/**` 和 `.mustflow/state/**` 是生成路径。缓存包含可重建的辅助文件，例如 `mf index` 写入的 SQLite 索引；状态包含使用期间创建的本地状态，例如 `mf run` receipt。两者都不属于第一批必读顺序。

## 地图字段

```toml
[map]
output = "REPO_MAP.md"
mode = "anchors_only"
privacy = "minimal"
include_nested = false
anchor_files = [
  "AGENTS.md",
  "REPO_MAP.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/context/INDEX.md",
  ".mustflow/context/PROJECT.md",
  ".mustflow/skills/INDEX.md",
  "README.md",
  "DESIGN.md",
  "package.json",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "deno.json",
  "justfile",
  "Justfile",
  "Makefile",
  "Taskfile.yml",
]
```

`map.output` 是生成文件名。默认值是 `REPO_MAP.md`。

`map.mode = "anchors_only"` 表示地图包含导航锚点，而不是每个源文件。

`map.privacy = "minimal"` 表示生成输出默认省略远程 URL、分支名、近期变更状态、命令列表和自动摘要。

`map.include_nested = false` 表示默认不索引嵌套独立仓库。必须通过 workspace 字段显式启用工作区支持。

`mf check` 会验证 `output` 和 `anchor_files` 是否为当前根目录内的相对路径。目前 `mode` 只允许 `anchors_only`，`privacy` 只允许 `minimal`。

`preferences.toml` 作为默认锚点包含在内，方便 agent 快速找到回复语言、文档、提交消息、日志和格式化的仓库级默认值。

`DESIGN.md` 是可选外部锚点。mustflow 不会创建它，但当它存在时，`mf map` 可以把它暴露出来，供界面、视觉设计、设计令牌、布局或无障碍工作使用。

## 上下文字段

```toml
[context]
enabled = true
root = ".mustflow/context"
index = ".mustflow/context/INDEX.md"
default_files = [
  ".mustflow/context/PROJECT.md",
]
read_policy = "task_relevant_only"
authority = "contextual"
external_anchors = [
  "README.md",
  "DESIGN.md",
]
```

`context.enabled = true` 表示项目可以在 `.mustflow/context/` 下携带面向 agent 的上下文。

`context.index` 指向路由文件，用于告诉 agent 针对任务应读取哪些上下文文件。
`context.default_files` 列出默认模板安装的上下文文件。

`read_policy = "task_relevant_only"` 表示 agent 默认不应读取每个上下文文件。
`authority = "contextual"` 表示上下文文件用于定向，但其权威性低于用户直接指令、当前代码、测试、命令合同和已配置策略。

`external_anchors` 列出可能提供上下文、但不会变成 mustflow 管理文件的根目录文件。
`README.md` 是面向人的概览。项目已有 `DESIGN.md` 时，它是可选视觉设计锚点。

## 工作区字段

```toml
[workspace]
enabled = false
roots = []
max_depth = 4
max_repositories = 50
follow_symlinks = false
stop_at_repository_root = true
```

`workspace.enabled = false` 会把当前根目录视为普通 mustflow 根目录。

对于工作区根目录，可以设置 `roots = ["projects", "repos"]` 等路径。mustflow 不应自动扫描未配置的 `projects/` 或 `repos/` 目录。

`max_depth` 和 `max_repositories` 防止意外的大范围扫描。`follow_symlinks = false` 默认防止遍历到工作区之外或另一块磁盘。

`stop_at_repository_root = true` 表示一旦发现独立嵌套仓库，父级地图就不应继续递归扫描其内部。父级 `REPO_MAP.md` 应只显示嵌套仓库入口点，而不描述这些仓库。

`mf check` 会验证 `roots` 是否为当前根目录内的相对路径，`max_depth` 和 `max_repositories` 是否为正整数，以及工作区开关是否为布尔值。

## Agent 控制表面字段

```toml
[capabilities]
workflow = true
command_contract = true
skills = true
repo_map = "generated_optional"
preferences = "optional"
context = "optional"
local_index = "generated_optional"
work_items = "disabled"
services = "disabled"
adapters = []

[agent_loop]
phases = [
  "orient",
  "plan",
  "act",
  "verify",
  "report",
  "handoff",
]

[verification]
command_source = ".mustflow/config/commands.toml"
require_configured_intents = true
allow_inferred_commands = false
require_command_lifecycle = true
require_timeout_for_oneshot = true

[handoff]
enabled = false
mode = "report_only"
```

`capabilities` 声明该仓库可用的 agent 工作表面。`workflow`、`command_contract` 和 `skills` 是核心功能。`repo_map`、`preferences`、`local_index`、`work_items` 和 `services` 是基于状态的扩展点。默认模板把本地索引作为可选生成数据提供，但 `mf init` 不会创建索引文件。本地工作项和服务管理在仓库选择有边界的生命周期规则之前保持 inactive。

`agent_loop.phases` 是标准 agent 工作循环：`orient`、`plan`、`act`、`verify`、`report` 和 `handoff`。它是可由机器检查的合同，不是装饰性文字。

`verification` 表明验证命令来自 `.mustflow/config/commands.toml`。`allow_inferred_commands = false` 表示 agent 不得从 `package.json`、`Makefile` 或命名约定推断验证命令。

`handoff.enabled = false` 表示当前模板保持本地工作项写入 inactive。无法安全完成的工作应在最终报告中交接，除非仓库启用了有边界的工作项生命周期。

`mf check` 会验证布尔值、允许的能力状态、标准循环和验证命令路径。

## Harness 字段

```toml
[harness]
mode = "single_session"
fresh_context_preferred = true

[harness.phases]
enabled = [
  "plan",
  "work",
  "verify",
  "judge",
  "handoff",
]
```

`harness` 声明 agent harness 的默认执行形态。`mode = "single_session"` 是保守默认值；未来或仓库特定的 harness 模式可以在生命周期、审批、隔离和保留规则明确时选择长时协调。

`harness.phases.enabled` 定义长时间运行的 harness 应分开的阶段。它们是阶段，不是默认文件夹或默认子 agent。

## 刷新字段

```toml
[refresh]
enabled = true
mode = "checkpoint"
required_at = [
  "session_start",
  "task_start",
  "before_first_edit",
  "before_command_run",
  "after_instruction_file_change",
  "root_change",
  "after_compaction",
  "before_final_report",
]
turn_threshold = 8
tool_call_threshold = 16
output_bytes_threshold = 100000
state_store = "cache"

[refresh.levels.light]
read = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
]

[refresh.levels.command]
read = [
  "AGENTS.md",
  ".mustflow/config/commands.toml",
]

[refresh.levels.edit]
read = [
  "AGENTS.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/docs/agent-workflow.md",
]

[refresh.levels.report]
read = [
  "AGENTS.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/preferences.toml",
]

[refresh.levels.skill]
read = [
  "AGENTS.md",
  ".mustflow/skills/INDEX.md",
]

[refresh.levels.full]
read = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/skills/INDEX.md",
]
```

`refresh` 声明 agent 何时应重新读取 mustflow 指令，例如会话变长、根目录变化、即将执行命令或指令文件发生变化时。

`before_command_run` 表示当前任务和当前命令意图必须已有新鲜的命令级刷新。如果命令合同没有变化且阈值仍然有效，并不要求每次重复执行命令前都重读所有文件。

`state_store = "cache"` 表示轮次计数和会话活动不属于项目文件。宿主应用可以在本地缓存中跟踪它们，但 mustflow 文档应保持稳定，并适合提交到版本控制。

`refresh.levels` 将每个刷新级别映射到应重新读取的文件。默认级别是 `light`、`command`、`edit`、`report`、`skill` 和 `full`。

`mf check` 会验证刷新模式、检查点名称、阈值、状态存储和刷新文件路径。

## 上下文压缩字段

```toml
[compaction]
enabled = false
strategy = "tiered"
state_store = "cache"

[compaction.rules]
require_source_refs = true
summaries_are_derived = true
current_files_override_summaries = true
never_store_secrets = true
scrub_absolute_user_paths = true
do_not_store_hidden_chain_of_thought = true
```

默认模板保持 `compaction` 禁用，只声明宿主应遵守的安全规则。它不会默认安装近期、中层、长期摘要或原始保留设置，也不表示 mustflow 会存储完整聊天记录、隐藏推理、完整终端输出或原始命令日志。

`state_store = "cache"` 表示压缩状态应存放在本地缓存或宿主管理状态中，而不是版本化项目文档中。共享项目知识只应以带来源的决策、调查记录或交接摘要形式沉淀。

`compaction.rules` 让摘要的权威性低于当前用户指令、当前代码和配置、命令合同以及运行 receipt。

压缩摘要和交接摘要的语言不在这里控制。它属于 `.mustflow/config/preferences.toml` 中的 `[language.memory]`。

## 测试相关性字段

```toml
[testing]
policy = "behavior_contract"
prefer_update_existing_tests = true
require_existing_test_search = true
require_test_change_report = true
forbid_validation_weakening = true
allow_test_deletion_when = [
  "behavior_removed",
  "public_contract_changed",
  "duplicate_coverage",
  "implementation_detail_removed",
  "obsolete_snapshot",
]
forbid_test_deletion_when = [
  "only_to_make_tests_pass",
  "without_behavior_rationale",
  "without_reporting",
  "without_running_relevant_validation",
]
stale_test_action = "update_remove_or_report"
```

`testing.policy = "behavior_contract"` 表示测试验证当前预期行为。这不意味着测试应无限增长，也不意味着要保留已移除功能。

`require_existing_test_search` 要求 agent 在添加新测试前检查现有测试。
`allow_test_deletion_when` 和 `forbid_test_deletion_when` 定义移除过期测试与弱化验证之间的边界。

`stale_test_action = "update_remove_or_report"` 表示过期候选项应被更新、移除或报告，而不是自动删除。

## 预算、批准与隔离字段

```toml
[budget]
enabled = true
max_iterations = 6
max_wall_clock_minutes = 60
max_command_runs = 20
max_total_output_mb = 8
max_failures_per_intent = 2
on_limit = "stop_and_report"

[approval]
required_for = [
  "git_commit",
  "git_push",
  "dependency_install",
  "dependency_upgrade",
  "network_access",
  "database_migration",
  "destructive_command",
  "secret_access",
  "release",
  "cross_repository_change",
]
on_required = "stop_and_request_approval"

[isolation]
preferred = "git_worktree"
required_for_long_running = true
allow_dirty_main_worktree = false
```

`budget` 通过限制迭代次数、经过时间、命令运行次数、输出量和重复失败来防止无边界循环。达到限制时，agent 应停止并报告。只有明确启用交接流程的项目才应选择 `stop_and_handoff`。

`approval` 列出执行前需要人工明确批准的操作。它本身不会授予权限。

`isolation` 声明长时间工作的首选边界。mustflow 不会自行创建工作树或沙箱；它为宿主工具提供应遵循的策略。

`mf check` 会把这些字段作为合同验证，但不会运行长时间 harness。

## 保留字段

```toml
[retention]
enabled = true

[retention.raw_events]
store = "none"
max_file_mb = 25
max_total_mb = 250
max_age_days = 14
on_limit = "report"

[retention.run_receipts]
store = "repo_local_ignored"
max_file_kb = 128
max_items = 1
max_total_mb = 1
keep_stdout_tail_bytes = 65536
keep_stderr_tail_bytes = 65536

[retention.knowledge]
enabled = false
store = "repo_local_ignored"
max_file_kb = 128
max_total_mb = 10
require_source_refs = true
require_review_status = true

[retention.context]
max_file_kb = 8

[retention.handoffs]
store = "repo_local_ignored"
max_file_kb = 64
max_total_mb = 5
require_source_refs = true

[retention.repo_map]
max_file_kb = 128
fail_if_larger = true
```

`retention` 防止 mustflow 在项目内累积完整聊天记录、完整终端输出或原始 JSONL 事件流。

`repo_local_ignored` 表示生成状态存放在仓库工作区内，但位于 `.mustflow/state/**` 或 `.mustflow/cache/**` 这类默认忽略的本地路径下。这些文件可以删除或重建，权威性低于当前文件、当前用户指令和命令合同。

`raw_events.store = "none"` 表示默认模板不存储原始事件日志。如果以后添加缓存存储，它应与可能提交到版本控制的项目文档分开。

`run_receipts` 限制由 `mf run` 写入的 `.mustflow/state/runs/latest.json`。
运行 receipt 应包含小型结构化结果和输出尾部，而不是完整日志。

`knowledge.enabled = false` 表示默认模板不创建知识库。
如果以后启用，知识文件应包含决策、调查记录和交接摘要，而不是原始日志。

`context` 限制 `.mustflow/context/*.md` 文件。这些文件应保持简短并面向任务，而不是变成文档归档。`mf check --strict` 还会检查其中是否存在本地绝对路径、类似敏感信息的键值文本，以及从 `DESIGN.md` 重复来的设计令牌定义。

`handoffs` 限制可选的紧凑交接记录。交接不是原始会话日志；它们应引用运行 receipt 等来源，并概述下一步安全操作。

`repo_map` 限制生成的 `REPO_MAP.md`。该地图应包含导航锚点，而不是完整文件清单或近期变更日志。

`mf check --strict` 会检查该策略是否存在、生成文件是否保持在限制内，以及 `.mustflow/**` 下是否没有原始 JSONL 文件。

它位于 `.mustflow/` 下，因此不会与普通项目配置混在一起。
