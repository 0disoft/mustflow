---
title: Skill 资源
description: 说明当 skill 范围超出 SKILL.md 时，如何添加 references、assets、scripts 和 resources.toml。
---

mustflow skill 从单个 `.mustflow/skills/<name>/SKILL.md` 文件开始。

不要提前创建空的 `references/`、`assets/` 或 `scripts/` 文件夹。只有当 skill 文档变得过大，或确实需要可重复 helper 时，才添加辅助资源。

## 基本原则

- `SKILL.md` 是 skill 入口。
- `resources.toml` 仅在存在辅助资源时出现。
- `references/` 存储只读长文材料，例如评分标准、示例和背景说明。
- `assets/` 存储可复用文件，例如模板、示例输入和 schemas。
- `scripts/` 仅在 skill 需要专用 helper 时出现。
- 脚本不从 `SKILL.md` 直接调用；它们通过 `.mustflow/config/commands.toml` 解析。

## 可选结构

```text
.mustflow/skills/<name>/
├─ SKILL.md
├─ resources.toml        # optional: only when supporting resources exist
├─ references/           # optional: read-only reference material
├─ assets/               # optional: templates, schemas, sample inputs
└─ scripts/              # optional: helpers connected to command intents
```

这不是每个 skill 都必须拥有的脚手架。默认模板提供 `SKILL.md`；其他文件和文件夹只应在 skill 实际需要时添加。

## resources.toml

`resources.toml` 是辅助资源的可选索引。它不替代 skill 正文。它帮助代理判断哪些材料可以读取或执行，以及在什么条件下读取或执行。

预期结构：

```toml
schema_version = "1"

[resources."references/severity-rubric.md"]
type = "reference"
purpose = "Rubric for classifying review finding severity."
read_when = ["finding_severity_is_unclear"]
required = false

[resources."assets/templates/review-report.md"]
type = "asset"
asset_kind = "template"
purpose = "Template for review report output."
required = false

[resources."scripts/validate-review-report.py"]
type = "script"
language = "python"
purpose = "Validates the review report format."
run_policy = "requires_command_contract"
command_intent = "review_report_validate"
network = false
destructive = false
writes = []
dependencies = ["python>=3.10"]
```

## references/

将 `references/` 用于代理仅在需要时读取的长文材料。

示例包括：

- 决策评分标准
- 失败案例与修复
- 输出示例
- 背景说明

不要在此处存储 secrets、原始执行日志、生成缓存或大型文件。

## assets/

将 `assets/` 用于支持 skill 的静态文件。

示例包括：

- 报告模板
- 示例输入文件
- 验证 schemas
- 小型示例数据

不要在此处存储大型二进制文件、构建输出、缓存或 secrets。

## scripts/

将 `scripts/` 用于专用 skill helpers。

每个脚本应：

- 提供帮助输出。
- 失败时返回非零退出码。
- 声明清晰的输入与输出规则。
- 通过 `resources.toml` 和 `commands.toml` 声明文件写入或网络访问。
- 默认避免破坏性行为。

代理不应猜测脚本路径并直接运行。需要执行时，先在 `.mustflow/config/commands.toml` 中解析相关 command intent。

## 与 skills/INDEX.md 的关系

`.mustflow/skills/INDEX.md` 列出 skills，而不是列出每个 skill 下的全部辅助文件。

辅助资源由 skill 本地的 `resources.toml` 文件索引。

## 社区 Skill Registry 方向

mustflow core 不应无限扩展默认 skill 集。默认模板应保持小而清晰，额外 skills 可以稍后由独立社区 skill 仓库提供。

仓库名称应遵循 mustflow 命名约定，例如 `mustflow-skills` 或 `mustflow-community-skills`。避免过于宽泛或容易与其他 skill 生态混淆的名称。

如果引入社区 skill 仓库，每个 skill 应同时提供 `SKILL.md` 和 mustflow 专用的 `skill.toml`。`skill.toml` 应声明 skill 标识符、版本、兼容 mustflow 范围、许可证、包含脚本、网络使用、写入范围和风险级别。

一组 skills 应称为 `pack` 或 `bundle`，而不是 automation skills。pack 安装 skills；它不得自动运行命令或编辑 `.mustflow/config/commands.toml`。必需或推荐的 command intents 应先报告，再由用户为当前项目声明。

未来 `mf skill add` 或 `mf pack add` 命令必须实现这些安全规则：

- 安装前预览变更文件、包含脚本、权限和风险级别。
- 安装期间绝不运行脚本。
- 在 `.mustflow/skills.lock.toml` 等锁文件中记录来源、版本和 hashes。
- 让 `mf skill audit` 验证锁文件、当前文件 hashes、脚本到 command intent 的链接，以及 deprecated skills。
- 将导出到工具原生 skill 位置作为可选适配器，而不是默认安装目标。

## 检查规则

`mf check --strict` 会验证：

- 已注册文件存在。
- 已注册文件位于 `references/`、`assets/` 或 `scripts/` 下。
- `scripts/` 不包含未注册 helpers。
- 脚本使用 `run_policy = "requires_command_contract"`，并链接到 `commands.toml` 中已配置的 command intent。
- 脚本默认不启用网络访问或破坏性行为。
- 脚本 `writes` 声明通过相对路径限制在 skill 文件夹内。
- 每个 skill 文件夹都包含 `SKILL.md`。

当前默认模板尚未包含 `resources.toml`。先记录格式与规则；只有当 skill 复杂到确实需要时，才应添加真实资源索引。
大型文件、secret 和缓存检查可以像 retention 与上下文文件验证一样，作为独立仓库安全检查扩展。
