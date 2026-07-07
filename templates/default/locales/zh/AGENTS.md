---
mustflow_doc: agents.root
locale: zh
canonical: false
revision: 10
lifecycle: user-editable
authority: binding
---

# AGENTS.md

本文件为本仓库中 LLM 编码代理的首要阅读工作规范。  
本仓库遵循 mustflow 代理工作流，相关细节存放于 `.mustflow/` 目录下。

## 阅读顺序

1. `AGENTS.md`  
2. `.mustflow/docs/agent-workflow.md`  
3. `.mustflow/config/mustflow.toml`  
4. `.mustflow/config/commands.toml`  
5. `.mustflow/config/preferences.toml`（如存在）  
6. `.mustflow/skills/INDEX.md`  
7. `.mustflow/context/INDEX.md`，仅当任务涉及项目、产品、领域、UI、后端、数据、安全或运维上下文时  
8. 对应的 `.mustflow/context/<name>.md` 文件，仅当上下文索引中选中时  
9. 对应的 `.mustflow/skills/<name>/SKILL.md`  
10. `REPO_MAP.md`，仅当需要更广泛的仓库导航时  
11. 相关源代码、测试及文档文件  

## 核心规则

- 不得回退用户已有修改。  
- 不得从包管理器文件推断命令。  
- 仅执行状态为 `configured`、生命周期为 `oneshot`，且 `run_policy` 为 `agent_allowed` 的命令定义。  
- 优先使用 `mf run <intent>` 执行已配置的 oneshot 命令。  
- 串行执行 `mf run` 命令意图。若某已配置意图仍在运行，尤其当该意图声明了非空的 `writes`（如 `dist/`）时，不得启动新的 `mf run`。  
- 选择覆盖风险最小且已配置的验证意图。若命令契约提供相关测试或快速检查，应优先使用；若缺少更窄的验证意图，应报告缺口，而非默默退回到缓慢的全量测试。  
- 不得直接启动开发服务器、watcher、浏览器界面、交互式提示或后台进程。  
- 未经明确配置，不得启动自治循环、worker 进程、persona 系统或长时运行的 harness 进程。  
- 任务可能长时间运行或影响敏感状态时，必须遵守 `.mustflow/config/mustflow.toml` 中的 `[budget]`、`[approval]` 和 `[isolation]` 配置。  
- 大范围修改前，应使用 `mf doctor` 或 `mf doctor --json` 进行只读健康检查。  
- `mf context --json` 提供机器可读的方向信息，但不能替代规则和命令规范。  
- `.mustflow/config/preferences.toml` 中的偏好优先级低于用户直接指令及项目既有风格。  
- 如果本仓库是没有自己的 `.mustflow/config/preferences.toml` 的子仓库，则把最近的父级 mustflow 根目录中的 preferences 作为默认值继承。继承范围包括 `[git]`、`[git.commit_message]`、`[release.versioning]`、verification、testing、language、reporting 以及其他 preference section。子仓库本地 preference 按字段覆盖父级默认值。绝不要继承 `.mustflow/config/commands.toml`；命令权限仍然是仓库本地的 command contract。
- 当代码、模板、schema、CLI 行为、包元数据、用户可见文档、安装输出或测试发生变更时，需在最终报告前检查 `.mustflow/config/preferences.toml` 中的 `[release.versioning]`。  
  版本文件只能按偏好修改：当 `auto_bump = true` 且 `require_user_confirmation = false` 时，自动升级版本；否则应按配置建议升级或编辑前请求确认。  
  不得假设版本来源为 `package.json`，应先定位仓库自身版本来源。  
- `.mustflow/context/` 中的上下文文件用于说明项目方向和领域约定，应视为任务相关上下文，而非代码、测试、命令或用户指令的替代品。  
- 若存在 `DESIGN.md`，仅在涉及 UI、视觉设计、布局、design token 或可访问性相关工作时阅读；若不存在，不得创建。  
- 任务适用某项 skill 时，应阅读对应 skill 文档。  
- 编辑前，应通过 `.mustflow/skills/INDEX.md` 判断是否有适用的 skill。  
- 若新证据表明某项 skill 相关（如命令失败或文档变更），应先阅读对应 `SKILL.md`，再继续工作。  
- skill 文档仅指导流程，不授权执行 `.mustflow/config/commands.toml` 之外的命令，也不覆盖用户、宿主、仓库或安全规则。  
- 未经明确请求，不得修改生成文件、外部依赖或 secrets 文件。  
- 不得将根目录下的 `config/`、`docs/` 或 `skills/` 目录视为 mustflow 文档。  

## 父子规则优先级

- 离被编辑文件最近的 `AGENTS.md` 规则更具体，优先级更高。  
- 工作流、风格、测试或命令规则冲突时，遵循子仓库的 `AGENTS.md` 和 `.mustflow/config/commands.toml`。  
- 针对 secrets、隐私、破坏性命令和允许编辑路径的安全规则为累加，执行更严格的规则。  
- 进入嵌套仓库时，编辑前应重新阅读该仓库的 `AGENTS.md` 和 `.mustflow/config/*.toml`。  
- 如果嵌套仓库没有本地 preferences 文件，在继续遵循该仓库 `AGENTS.md` 和 command contract 的同时，使用最近父级 mustflow preferences 作为继承默认值。
- 未经明确请求，不得编辑所选子仓库之外的内容。  

## 宿主专用指令兼容性

某些编码宿主可能会读取额外的宿主专用指令文件，或执行自己的审批、沙箱、检查点和命令执行策略。  

应将这些宿主策略视为额外的安全和执行约束，不替代本仓库的 mustflow 命令契约。  

当宿主指令与 mustflow 规则冲突时：  

- 用户当前的直接指令决定任务目标，除非该指令不安全。  
- 宿主的安全和审批门禁依然有效。  
- 仓库工作规则来自最近的 `AGENTS.md` 和 `.mustflow/config/*.toml`。  
- 项目验证命令必须使用已配置的 mustflow intent。  
- 隐私、secret、破坏性命令和 Git push 规则以更严格者为准。  
- 生成状态、摘要和缓存绝不能覆盖当前文件或当前用户指令。  

若规则不明确，应停止并报告冲突，避免猜测。  

## 指令刷新检查点

- 在长会话中，应于首次编辑前、当前命令意图无新鲜命令级刷新时的命令执行前、上下文压缩后、修改 `AGENTS.md` 或 `.mustflow/**` 后、切换项目根目录后，以及输出最终报告前，重新阅读 mustflow 指令。  
- 使用 `.mustflow/config/mustflow.toml` 中的 `[refresh]` 策略决定执行 light、command、skill 或 full refresh。  
- 不得在项目文件中存储对话轮次或会话活动，刷新状态应保存在本地缓存或宿主应用中。  

详细工作流、命令策略、失败处理和安全规则请参见 `.mustflow/docs/agent-workflow.md`。
