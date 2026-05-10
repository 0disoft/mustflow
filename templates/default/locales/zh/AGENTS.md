---
mustflow_doc: agents.root
locale: zh
canonical: false
revision: 10
lifecycle: user-editable
authority: binding
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
- 串行运行 `mf run` command intents。当某个已配置 intent 仍在运行时，不要启动另一个
  `mf run`，尤其是该 intent 声明了 `dist/` 等非空 `writes` 时。
- 选择能够覆盖风险的最窄已配置验证意图。若命令契约提供相关测试或快速检查，应优先于
  宽泛测试套件使用；若缺少更窄的验证意图，应报告该缺口，而不是默默退回到缓慢的全量测试。
- 不要直接启动开发服务器、watcher、浏览器界面、交互式提示，
  或后台进程。
- 不要启动自治循环、worker 进程、persona 系统或长时运行的 harness 进程，
  除非本仓库已明确配置这些能力。
- 当任务可能长时间运行或影响敏感状态时，
  遵循 `.mustflow/config/mustflow.toml` 中的 `[budget]`、`[approval]` 与 `[isolation]`。
- 在进行大范围修改前，使用 `mf doctor` 或 `mf doctor --json` 做只读健康检查。
- `mf context --json` 可提供机器可读的方向信息，但不能替代规则与命令规范。
- `.mustflow/config/preferences.toml` 中的偏好优先级低于用户直接指令和项目既有风格。
- 当代码、模板、schema、CLI 行为、包元数据、用户可见文档、安装输出或测试发生变化时，
  在最终报告前检查 `.mustflow/config/preferences.toml` 中的 `[release.versioning]`。
  版本文件只能按这些偏好修改：当 `auto_bump = true` 且
  `require_user_confirmation = false` 时应用自动版本升级；否则按配置建议版本升级或在编辑前请求确认。
  不要假设版本来源是 `package.json`；在建议或编辑版本前，先定位该仓库自己的版本来源。
- `.mustflow/context/` 中的上下文文件用于说明项目方向与领域约定。
  应将其视为任务相关上下文，而不是代码、测试、命令或用户指令的替代品。
- 若存在 `DESIGN.md`，仅在 UI、视觉设计、布局、design token 或可访问性相关工作中阅读它。
  若不存在 `DESIGN.md`，不要创建。
- 当某项 skill 适用于任务时，阅读对应 skill 文档。
- 编辑前，使用 `.mustflow/skills/INDEX.md` 判断是否有一个或多个 skill 适用。
- 如果新的证据让某项 skill 变得相关，例如命令失败或文档变更，
  在继续该部分工作前先阅读对应的 `SKILL.md`。
- skill 文档只指导流程。它们不会授权执行 `.mustflow/config/commands.toml` 之外的命令，
  也不会覆盖用户、宿主、仓库或安全规则。
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

## 宿主专用指令兼容性

某些编码宿主可能会读取额外的宿主专用指令文件，或执行自己的审批、沙箱、检查点和命令执行策略。

应将这些宿主策略视为额外的安全和执行约束。它们不会替代本仓库的 mustflow 命令契约。
当宿主指令与 mustflow 规则冲突时：

- 用户当前的直接指令决定任务目标，除非该指令不安全。
- 宿主的安全和审批门禁仍然有效。
- 仓库工作规则来自最近的 `AGENTS.md` 和 `.mustflow/config/*.toml`。
- 项目验证命令必须使用已配置的 mustflow intent。
- 隐私、secret、破坏性命令和 Git push 规则以更严格的一方为准。
- 生成状态、摘要和缓存永远不能覆盖当前文件或当前用户指令。

如果有效规则不清楚，应停止并报告冲突，而不是猜测。

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
