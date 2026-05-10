---
title: mf init
description: 在用户仓库中初始化 mustflow 文档。
---

`mf init` 会将 mustflow 模板复制到用户仓库根目录。

它会在根目录创建 `AGENTS.md`，并将 mustflow 管理的文档与设置放在 `.mustflow/` 下。

## 创建的结构

```text
AGENTS.md
.gitignore
.mustflow/
├─ config/
│  ├─ commands.toml
│  ├─ mustflow.toml
│  ├─ preferences.toml
│  └─ manifest.lock.toml
├─ context/
│  ├─ INDEX.md
│  └─ PROJECT.md
├─ docs/
│  └─ agent-workflow.md
└─ skills/
   ├─ INDEX.md
   ├─ code-review/SKILL.md
   ├─ codebase-orientation/SKILL.md
   ├─ diff-risk-review/SKILL.md
   ├─ docs-prose-review/SKILL.md
   ├─ docs-update/SKILL.md
   ├─ failure-triage/SKILL.md
   ├─ project-context-authoring/SKILL.md
   ├─ readme-authoring/SKILL.md
   ├─ skill-authoring/SKILL.md
   ├─ security-regression-tests/SKILL.md
   ├─ test-maintenance/SKILL.md
   ├─ visual-review-artifact/SKILL.md
   └─ web-asset-optimization/SKILL.md
```

`REPO_MAP.md` 不会从静态模板复制。它会在用户请求时根据仓库结构生成。
`manifest.lock.toml` 也会在 `mf init` 成功后生成，用于记录实际安装内容。
mustflow 不会创建 `DESIGN.md`。如果项目中已经存在该文件，`mf map` 可将其视为可选视觉设计锚点。

## 模板源布局

安装目标路径保持一致，但包内模板按用途拆分：

```text
templates/default/
├─ common/
│  ├─ gitignore.mustflow
│  └─ .mustflow/config/
└─ locales/
   ├─ en/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   ├─ ko/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   ├─ zh/
   ├─ es/
   ├─ fr/
   └─ hi/
```

`common/` 包含与语言无关的 TOML 配置和受管理的 `.gitignore` 片段。`locales/<locale>/` 包含由 `--locale` 选择的 Markdown 文档与 skill 文件。

## 规则

- 复制的文件仅限于 LLM 代理直接读取的工作流文件。
- 仅安装包本身不会修改用户文件。
- 默认情况下，已有文件冲突会在写入任何文件前中止流程。
- 如果 `AGENTS.md` 已存在，`--merge` 可以只插入 mustflow-managed block。
- 如果 `.gitignore` 不存在，`mf init` 会创建它。若已存在，mustflow 只更新自己的受管理块，并保留用户规则。
- 受管理的 `.gitignore` 块只忽略 mustflow 生成的本地产物：`.mustflow/cache/`、`.mustflow/state/` 和 `.mustflow/backups/`。`repos/`、`node_modules/`、`dist/`、`.env` 等项目级产物仍由用户自行管理。
- `--force` 会先将冲突文件备份到 `.mustflow/backups/`，然后再覆盖。
- `REPO_MAP.md` 从仓库结构生成，而不是从静态模板复制。
- `manifest.lock.toml` 记录已安装工作流文件的 hash、模板标识符以及每个被跟踪文件采取的动作。`.gitignore` 支持块不会写入 lock file 追踪。
- `.mustflow/context/` 包含面向代理的项目上下文，不是通用文档归档。
- `README.md`、`.github/` 以及已有的 `config/`、`docs/` 和 `skills/` 目录不会被修改。
- 不会创建源代码、包管理器配置或 CI 配置。
- 如果模板 manifest 列出 `AGENTS.md` 和 `.mustflow/**` 之外的安装目标，mustflow 会拒绝该模板。
- `--dry-run` 打印安装计划，不写入文件。
- 当安装因冲突中止或以 `--dry-run` 运行时，不会写入 `manifest.lock.toml`。

## 示例

```sh
npx mf init
npx mf init --yes
npx mf init --dry-run
npx mf init --interactive
npx mf init --set git.auto_commit=true
npx mf init --merge
npx mf init --force
npx mf init --profile product --locale ko --agent-lang ko
npx mf init --profile product --product-source-locale en --product-locale ko-KR
```

在交互式终端中，`mf init` 会询问文档语言、项目配置档案和代理报告语言。
`--interactive` 会强制启用这个提问流程。启用高级偏好设置后，提示流程还可以设置
自动暂存、自动提交、提交消息语言和提交消息建议默认值。`--yes` 会无提示安装英文默认值。

`--set` 可以在安装期间设置一小组允许的偏好项：

- `git.auto_stage`
- `git.auto_commit`
- `git.auto_push=false`
- `git.commit_message.style`
- `git.commit_message.language`
- `git.commit_message.max_suggestions`
- `git.commit_message.include_body`
- `git.commit_message.split_when_multiple_concerns`
- `reporting.commit_suggestion.enabled`
- `release.versioning.impact_check`
- `release.versioning.suggest_bump`
- `release.versioning.auto_bump`
- `release.versioning.require_user_confirmation`
- `release.versioning.sync_template_version`
- `release.versioning.sync_docs_examples`
- `release.versioning.sync_tests`
- `verification.selection.strategy`
- `verification.selection.prefer_related_tests`
- `verification.selection.skip_docs_only_full_test`
- `verification.selection.skip_low_risk_code_full_test`
- `verification.selection.skip_translation_only_full_test`
- `verification.selection.skip_copy_only_full_test`
- `verification.selection.report_skipped`
- `testing.authoring.new_test_policy`
- `testing.authoring.prefer_existing_tests`
- `testing.authoring.require_new_test_rationale`
- `language.memory.summary`

`git.commit_message.style` 可以使用 `conventional`、`descriptive` 或 `gitmoji`。`gitmoji` 会建议类似 `✨ feat: add dashboard setting` 的消息，但它仍只是提交消息建议，不代表获得提交权限。

`git.commit_message.language` 可以使用 `preserve_existing`、`agent_response`、`docs`，也可以直接指定 `ja`、`de`、`pt-BR` 等 locale tag。

`verification.selection.strategy` 可以使用 `risk_based`、`targeted` 或 `full`。

`testing.authoring.new_test_policy` 可以使用 `evidence_required`、`manual_approval` 或 `broad`。

`mf init` 只允许 `git.auto_push=false`，用于把仓库恢复到安全默认值。它不能启用 `git.auto_push=true`；如果某个仓库确实需要该行为，请在安装后手动编辑文件。

`--yes` 会显式采用安全默认值。它不会自动覆盖冲突文件。

## 配置边界

`mf init` 不会把仓库初始化成可构建的应用。它只安装 LLM 编码代理读取仓库指令、避免猜测命令并验证工作的工作流规则。

| 时机 | 配置 |
| --- | --- |
| 交互式问题 | 文档语言、项目类型、代理最终报告语言，以及可选的高级 Git/报告偏好。 |
| init 期间仅通过 CLI 设置 | 产品源语言、产品目标语言，以及允许的 `--set` 偏好覆盖项。 |
| 安装后编辑文件 | 测试、lint、构建和长时间运行命令契约；审批和隔离策略；项目上下文；自定义 skills；CI；README；以及应用设置。 |

## Profiles 与语言

`profile` 描述项目类型，而不是国家或语言。

内置支持的 profiles：

- `minimal`
- `oss`
- `team`
- `product`
- `library`

`--locale` 是安装的 mustflow 文档语言。当前默认模板提供 `en`、`ko`、`zh`、`es`、`fr` 和 `hi`，默认值为 `en`。

`--agent-lang` 是代理最终报告的默认语言。它可以不同于 mustflow 文档语言。

面向用户的产品文本本地化通过 `--product-source-locale` 和 `--product-locale` 单独记录。这些值会写入 `.mustflow/config/preferences.toml` 的 `[product_i18n]`；它们不是 mustflow 文档语言，也不是 CLI 输出语言。

例如，一个项目可以要求代理用韩语报告、安装韩语 mustflow 文档、保持英文产品源字符串，并支持韩语用户：

```sh
npx mf init --profile product --locale ko --agent-lang ko --product-source-locale en --product-locale ko-KR
```

## 结构化输出

`mf init` 目前不提供 JSON 输出格式。

自动化脚本不应解析人类可读输出。安装后，请使用 `mf status --json` 或 `mf check --json` 验证结果。

## 帮助与退出码

```sh
npx mf init --help
```

帮助输出顺序为 `Usage`、`Options`、`Examples` 和 `Exit codes`。

- 退出码 `0`：安装完成、no-op 完成，或已打印 `--dry-run` 计划。
- 退出码 `1`：未知选项、文件冲突或不兼容选项阻止了写入。

未知选项会同时打印错误原因，并提示运行 `mf init --help`。
