---
title: mf check
description: 验证用户仓库中的 mustflow 文档流。
---

`mf check` 会验证已安装的 mustflow 文件是否可读，并且能被代理使用。
修改文档流本身后，请使用 `--strict` 运行额外安全检查。
当自动化或代理需要解析结果时，请使用 `--json`。

## 检查内容

- 仓库根目录存在 `AGENTS.md`。
- `.mustflow/config/mustflow.toml` 可以解析。
- `.mustflow/config/commands.toml` 可以解析。
- 当 `.mustflow/config/preferences.toml` 存在时，它可以解析。
- `.mustflow/config/mustflow.toml` 中的 `[map]`、`[workspace]` 和 `[context]` 字段使用有效类型与安全相对路径。
- 当 `.mustflow/config/preferences.toml` 存在时，其中语言、格式、代码风格、git、文档和日志偏好使用有效基础类型。
- 当 `.mustflow/config/manifest.lock.toml` 存在时，会用当前文件内容检查它。
- `.mustflow/skills/INDEX.md` 存在。
- `.mustflow/skills/*/SKILL.md` 文件包含必需的稳定章节标识符。
- 当 `.mustflow/context/*.md` 文件存在时，它们能标识自己是 mustflow 上下文文档。
- `commands.toml` 中 `status = "configured"` 的 intents 包含命令信息、生命周期、运行策略和超时设置。
- 长时运行生命周期不会以 `run_policy = "agent_allowed"` 暴露。

## 严格检查

```sh
npx mf check --strict
```

`--strict` 会加入更接近代理输入稳定性和命令安全性的检查。

- Skill 文档不得包含 `sh`、`bash` 或 `powershell` 等原始 shell fenced blocks。
- mustflow 管理的 Markdown 文件必须保留与路径匹配的 `mustflow_doc`、`locale`、`canonical`、`revision`、`authority`、`lifecycle` frontmatter 形态。相关消息会同时显示逻辑文档标识符和相对路径。
- Context 文档不得声称自己覆盖直接用户指令、当前代码、测试或命令合同。
- `.mustflow/skills/INDEX.md` 和 `.mustflow/context/INDEX.md` 必须保持路由索引角色，不得变成流程文档。
- `SKILL.md` frontmatter 必须使用 `metadata.mustflow_schema: "1"`、`metadata.mustflow_kind: procedure`，并且 `name` 必须匹配 `.mustflow/skills/<name>/` 文件夹。
- Skill frontmatter 中的 `metadata.command_intents` 只能引用 `.mustflow/config/commands.toml` 中已声明的命令意图。
- Skill 正文不得声称自己授予命令执行权限；执行权限只属于 `.mustflow/config/commands.toml`。
- `.mustflow/skills/<name>/` 下的 skill 文件夹不得在没有 `SKILL.md` 的情况下包含辅助文件。
- 当 skill 包含 `resources.toml` 时，已注册资源必须存在，并位于 `references/`、`assets/` 或 `scripts/` 下。
- `.mustflow/skills/<name>/scripts/` 不得包含未注册的 helper 文件。
- 脚本资源必须声明 `run_policy = "requires_command_contract"` 和 `command_intent`，且该 intent 必须在 `commands.toml` 中配置。
- 脚本资源默认不得启用网络访问、破坏性行为或写入 skill 文件夹之外的位置。
- `REPO_MAP.md` 不得在顶部包含生成时间、更新时间、文件数量或已变更文件数量等易变元数据。
- `REPO_MAP.md` 不得包含可能泄露上下文或误导当前根目录之外代理的远程 URL 或分支元数据。
- `commands.toml` 必须定义 `[defaults].max_output_bytes` 与 `[defaults].on_timeout`。
- `mustflow.toml` 必须定义 `[retention]` 策略。
- `REPO_MAP.md` 与 `.mustflow/state/runs/latest.json` 必须保持在 retention 大小限制内。
- `.mustflow/context/*.md` 文件必须保持在 `[retention.context].max_file_kb` 内。
- `.mustflow/context/*.md` 文件不得包含本地绝对路径、类似 secret 的键值文本，或从 `DESIGN.md` 复制的 design-token 定义。
- 当 `.mustflow/knowledge/**` 存在时，必须保持在 retention 大小限制内。
- `.mustflow/**` 下不得出现原始 JSONL 日志。
- 当 `.mustflow/state/runs/latest.json` 存在时，它必须能解析为 JSON object。

严格模式是可选的，这样常规工作流可以保持轻量。修改 mustflow 文档、skills、命令合同或仓库地图生成规则后，建议使用严格模式。

## 错误与警告分类

`mf check` 将结构性违规视为阻塞错误。只要报告问题，就会以退出码 `1` 结束。

- 基础错误来自缺失必需文件、解析失败、不安全的配置值、命令合同违规、skill 必需章节标识符缺失、context 文档身份无效，以及锁文件漂移。
- 严格错误来自额外的文档身份、路由、skill 元数据、命令边界、仓库地图、保留策略、运行记录和 context 卫生检查。只有启用 `--strict` 时才会出现。
- 非阻塞观察结果不会作为 `mf check` 问题输出。当自动化需要信息或警告级健康信号时，请使用 `mf doctor` diagnostics。

## 配置规则

`mf check` 将 `[map]`、`[workspace]` 和 `[context]` 视为带默认值的灵活配置，但会拒绝不安全或难以解释的值。
对旧安装而言，缺少 `manifest.lock.toml` 不会导致检查失败。若锁文件存在，缺失的锁定文件或 content hash 不匹配会被报告为失败。

- `map.output`：必须是非空相对路径。
- `map.mode`：当前仅允许 `anchors_only`。
- `map.privacy`：当前仅允许 `minimal`。
- `map.include_nested`：必须是 boolean。
- `map.anchor_files`：必须是非空相对路径数组。
- `workspace.roots`：必须是当前根目录内的相对路径。
- `workspace.max_depth`、`workspace.max_repositories`：必须是正整数。
- `workspace.follow_symlinks`、`workspace.stop_at_repository_root`：必须是 boolean。
- `context.root`、`context.index`、`context.default_files` 和 `context.external_anchors`：必须使用非空相对路径。
- `context.read_policy`：当前仅允许 `task_relevant_only`。
- `context.authority`：当前仅允许 `contextual`。
- `preferences.toml` 中的主要值必须是字符串。
- `preferences.toml` 中的自动提交、敏感数据与顺手重构设置必须是 boolean。
- `preferences.toml` 中的 `docs.update_when` 必须是字符串数组。
- `commands.toml` 中可执行 intents 必须声明 `lifecycle`、`run_policy`、`timeout_seconds` 与 `stdin`。
- `lifecycle = "oneshot"` 的 intents 必须有 `timeout_seconds` 且 `stdin = "closed"`。
- `server`、`watch`、`interactive`、`browser` 和 `background` intents 不得作为默认可由代理运行的命令暴露。

## 标准 Skill 章节标识符

Skill 文档必须在本地化章节标题前包含这些稳定标识符。

```text
<!-- mustflow-section: purpose -->
<!-- mustflow-section: use-when -->
<!-- mustflow-section: do-not-use-when -->
<!-- mustflow-section: required-inputs -->
<!-- mustflow-section: preconditions -->
<!-- mustflow-section: allowed-edits -->
<!-- mustflow-section: procedure -->
<!-- mustflow-section: postconditions -->
<!-- mustflow-section: verification -->
<!-- mustflow-section: failure-handling -->
<!-- mustflow-section: output-format -->
```


## 示例

```sh
npx mf check
```

成功时输出：

```text
mustflow check passed
```

失败时，它会将缺失文件或章节标识符打印到 standard error，并以退出码 `1` 退出。

## JSON 字段

```sh
npx mf check --json
```

机器可读输出使用这些字段：

- `ok` (`boolean`)：所有检查是否通过。
- `strict` (`boolean`)：是否启用了 `--strict` 检查。
- `issueCount` (`number`)：发现的问题数量。
- `issues` (`string[]`)：面向人的问题消息。
- `issueDetails` (`object[]`)：机器可读的问题详情。适用时，`id` 是命令边界及相关严格检查的稳定标识符；`severity` 当前对所有阻塞检查问题都是 `error`；`mode` 是 `base` 或 `strict`；`message` 与 `issues` 中的消息一致。

发现问题时，JSON 形式同样以退出码 `1` 退出。

## 帮助与退出码

```sh
npx mf check --help
```

帮助输出顺序为 `Usage`、`Options`、`Examples` 和 `Exit codes`。

- 退出码 `0`：所有必需文件与设置有效。
- 退出码 `1`：验证发现问题，或命令收到未知选项。

代理和自动化应从 `--json` 输出读取 `ok`、`issues` 与 `issueDetails`，而不是解析面向人的成功或失败文本。
