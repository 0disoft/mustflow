---
mustflow_doc: agents.root
locale: zh
canonical: false
revision: 4
---

# AGENTS.md

本文件是 LLM 编码代理在此仓库中应首先阅读的工作约定。
本仓库遵循 mustflow 代理工作流。
由 mustflow 管理的细节位于 `.mustflow/` 下。

## 阅读顺序

1. `AGENTS.md`
2. `.mustflow/docs/agent-workflow.md`
3. `.mustflow/config/mustflow.toml`
4. `.mustflow/config/commands.toml`
5. `.mustflow/config/preferences.toml`（如果存在）
6. `.mustflow/skills/INDEX.md`
7. `.mustflow/context/INDEX.md`，仅当任务需要项目、产品、领域、UI、
   后端、数据、安全或运维上下文时
8. 对应的 `.mustflow/context/<name>.md` 文件，仅当上下文索引选择了它们
9. 对应的 `.mustflow/skills/<name>/SKILL.md`
10. `REPO_MAP.md`，仅当需要更广泛的仓库导航时
11. 相关的源代码、测试和文档文件

## 核心规则

- 不要回滚用户已有修改。
- 不要从包管理器文件推断命令。
- 仅运行满足 `status` 为 `configured`、`lifecycle` 为 `oneshot`、
  且 `run_policy` 为 `agent_allowed` 的命令定义。
- 对已配置的 oneshot 命令优先使用 `mf run <intent>`。
- 不要直接启动开发服务器、watcher、浏览器界面、交互式提示，
  或后台进程。
- 不要启动自治循环、worker 进程、persona 系统或长时运行的 harness 进程，
  除非本仓库已明确配置这些能力。
- 当任务可能长时间运行或影响敏感状态时，
  遵循 `.mustflow/config/mustflow.toml` 中的 `[budget]`、`[approval]` 与 `[isolation]`。
- 在进行大范围修改前，使用 `mf doctor` 或 `mf doctor --json` 做只读健康检查。
- `mf context --json` 可提供机器可读的方向信息，但不能替代规则与命令规范。
- `.mustflow/config/preferences.toml` 中的偏好优先级低于用户直接指令和项目既有风格。
- `.mustflow/context/` 中的上下文文件用于说明项目方向与领域约定。
  应将其视为任务相关上下文，而不是代码、测试、命令或用户指令的替代品。
- 若存在 `DESIGN.md`，仅在 UI、视觉设计、布局、design token 或可访问性相关工作中阅读它。
  若不存在 `DESIGN.md`，不要创建。
- 当某项 skill 适用于任务时，阅读对应 skill 文档。
- 未经明确请求，不要修改 generated files、外部依赖或 secrets files。
- 不要将根目录下的 `config/`、`docs/` 或 `skills/` 目录视为 mustflow 文档。

## 父子规则优先级

- 距离被编辑文件最近的 `AGENTS.md` 规则更具体，优先级更高。
- 若工作流、风格、测试或命令规则冲突，遵循子仓库的 `AGENTS.md`
  与 `.mustflow/config/commands.toml`。
- 针对 secrets、隐私、破坏性命令和允许编辑路径的安全规则是累加的。
  应执行更严格的规则。
- 进入嵌套仓库时，编辑前重新阅读该仓库的 `AGENTS.md` 与
  `.mustflow/config/*.toml`。
- 未经明确请求，不要编辑所选子仓库之外的内容。

## 指令刷新检查点

- 在长会话中，应在首次编辑前、当前命令意图还没有新鲜命令级刷新时的命令执行前、
  上下文压缩后、修改 `AGENTS.md` 或 `.mustflow/**` 后、切换项目根目录后，
  以及输出最终报告前，重新阅读 mustflow 指令。
- 使用 `.mustflow/config/mustflow.toml` 中的 `[refresh]` 策略决定需要
  light、command、skill 或 full refresh。
- 不要在项目文件中存储对话轮次或会话活动。
  会话刷新状态应放在本地缓存或宿主应用中。

详细工作流、命令策略、失败处理和安全规则位于
`.mustflow/docs/agent-workflow.md`。
