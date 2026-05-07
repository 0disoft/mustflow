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
- `.mustflow/skills/*/SKILL.md` 文件包含标准章节。
- 当 `.mustflow/context/*.md` 文件存在时，它们能标识自己是 mustflow 上下文文档。
- `commands.toml` 中 `status = "configured"` 的 intents 包含命令信息、生命周期、运行策略和超时设置。
- 长时运行生命周期不会以 `run_policy = "agent_allowed"` 暴露。

## 严格检查

```sh
npx mf check --strict
```

`--strict` 会加入更接近代理输入稳定性和命令安全性的检查。

- Skill 文档不得包含 `sh`、`bash` 或 `powershell` 等原始 shell fenced blocks。
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

## 标准 Skill 章节

Skill 文档必须包含这些章节。

```text
## 目标
## 使用时机
## 不适用时机
## 必要输入
## 流程
## 验证
## 失败处理
## 输出格式
```

## 示例

```sh
npx mf check
```

成功时输出：

```text
mustflow check passed
```

失败时，它会将缺失文件或章节打印到 standard error，并以退出码 `1` 退出。

## JSON 字段

```sh
npx mf check --json
```

机器可读输出使用这些字段：

- `ok` (`boolean`)：所有检查是否通过。
- `strict` (`boolean`)：是否启用了 `--strict` 检查。
- `issueCount` (`number`)：发现的问题数量。
- `issues` (`string[]`)：面向人的问题消息。

发现问题时，JSON 形式同样以退出码 `1` 退出。

## 帮助与退出码

```sh
npx mf check --help
```

帮助输出顺序为 `Usage`、`Options`、`Examples` 和 `Exit codes`。

- 退出码 `0`：所有必需文件与设置有效。
- 退出码 `1`：验证发现问题，或命令收到未知选项。

代理和自动化应从 `--json` 输出读取 `ok` 与 `issues`，而不是解析面向人的成功或失败文本。
