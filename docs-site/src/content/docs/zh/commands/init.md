---
title: mf init
description: 在用户仓库中初始化 mustflow 文档。
---

`mf init` 会将 mustflow 模板复制到用户仓库根目录。

它会在根目录创建 `AGENTS.md`，并将 mustflow 管理的文档与设置放在 `.mustflow/` 下。

## 创建的结构

```text
AGENTS.md
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
   ├─ docs-update/SKILL.md
   ├─ failure-triage/SKILL.md
   └─ test-maintenance/SKILL.md
```

`REPO_MAP.md` 不会从静态模板复制。它会在用户请求时根据仓库结构生成。
`manifest.lock.toml` 也会在 `mf init` 成功后生成，用于记录实际安装内容。
mustflow 不会创建 `DESIGN.md`。如果项目中已经存在该文件，`mf map` 可将其视为可选视觉设计锚点。

## 模板源布局

安装目标路径保持一致，但包内模板按用途拆分：

```text
templates/default/
├─ common/
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

`common/` 包含与语言无关的 TOML 配置。`locales/<locale>/` 包含由 `--locale` 选择的 Markdown 文档与 skill 文件。

## 规则

- 复制的文件仅限于 LLM 代理直接读取的工作流文件。
- 仅安装包本身不会修改用户文件。
- 默认情况下，已有文件冲突会在写入任何文件前中止流程。
- 如果 `AGENTS.md` 已存在，`--merge` 可以只插入 mustflow-managed block。
- `--force` 会先将冲突文件备份到 `.mustflow/backups/`，然后再覆盖。
- `REPO_MAP.md` 从仓库结构生成，而不是从静态模板复制。
- `manifest.lock.toml` 记录已安装文件 hash、模板标识符以及每个文件采取的动作。
- `.mustflow/context/` 包含面向代理的项目上下文，不是通用文档归档。
- `README.md`、`.github/` 以及已有的 `config/`、`docs/` 和 `skills/` 目录不会被修改。
- 不会创建源代码、包管理器配置或 CI 配置。
- `--dry-run` 打印安装计划，不写入文件。
- 当安装因冲突中止或以 `--dry-run` 运行时，不会写入 `manifest.lock.toml`。

## 示例

```sh
npx mf init
npx mf init --yes
npx mf init --dry-run
npx mf init --merge
npx mf init --force
npx mf init --profile product --locale ko --agent-lang ko
npx mf init --profile product --product-source-locale en --product-locale ko-KR
```

`--yes` 会显式采用安全默认值。它不会自动覆盖冲突文件。

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
