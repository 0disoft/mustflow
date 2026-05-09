---
title: mf explain
description: 用于解释 mustflow 策略决策为何适用的只读命令。
---

`mf explain authority [path]` 解释 mustflow 如何分类受管 Markdown 文档的权威性。它不会修改文件，也不算作项目验证。

省略路径时，命令输出权威分类模型。提供路径时，命令报告该路径是否有预期的 mustflow 文档角色。

`mf explain asset-optimization` 解释 Web 图像优化的决策路径。它报告 `web-asset-optimization` 技能是否适用，以及 `asset_optimize` 是否是已配置且代理可运行的命令意图，避免代理猜测图像转换器或包命令。

`mf explain anchor <anchor_id>` 解释结构化源码锚点。源码锚点只是导航坐标：它们可以帮助代理找到代码，但不能定义工作流规则、命令权限或验证权威。

`mf explain command <intent>` 解释 `.mustflow/config/commands.toml` 中的命令意图是否可通过 `mf run` 运行、为什么允许或阻止，以及运行后是否算作 mustflow 验证。

`mf explain retention` 解释 `.mustflow/config/mustflow.toml` 中的有效保留策略，包括原始事件存储、有界运行回执和上下文限制。

`mf explain skill <skill_id>` 说明 `.mustflow/skills/INDEX.md` 中的一条技能路由，包括触发条件、必需输入、编辑范围、风险、验证意图和预期输出。目标可以是技能文件夹名、完整 `metadata.skill_id`、`mustflow_doc` 或技能路径。

`mf explain skills` 解释 `mf doctor --strict` 使用的严格技能索引与技能正文对齐摘要。它报告 `.mustflow/skills/INDEX.md` 中的每条路由是否指向技能正文，以及每个技能正文是否列在索引中。

## 输出

- `mustflow root`：当前 mustflow 根目录。
- `Topic`：解释主题。
- `Decision`：解析出的策略决策。
- `Reason`：该决策适用的原因。
- `Effective action`：代理应采取的操作。
- `Counts as mustflow verification`：该命令结果是否算作验证回执。
- `Source files`：定义规则来源的文件。
- `Source anchor`：使用 `anchor` 主题时的锚点路径、行号、目的、搜索词、不变量、风险和仅导航权限。
- `Expected frontmatter`：路径被识别时所需的 `mustflow_doc`、`authority` 和 `lifecycle` 值。
- `Authority boundary`：该权威范围可以定义什么，以及必须交给更高权威文件、当前代码或 `commands.toml` 的内容。
- `Command intent`：使用 `command` 主题时的命令契约元数据。
- `Retention policy`：使用 `retention` 主题时的有效保留设置。
- `Skill route`：使用 `skill` 主题时的触发条件、范围、风险、验证和预期输出。
- `Skill routes`：使用 `skills` 主题时的严格技能索引/正文对齐状态。

## 示例

```sh
npx mf explain authority
npx mf explain authority AGENTS.md
npx mf explain anchor auth.session.resolve
npx mf explain anchor auth.session.resolve --json
npx mf explain asset-optimization
npx mf explain asset-optimization --json
npx mf explain command test
npx mf explain command lint --json
npx mf explain retention
npx mf explain retention --json
npx mf explain skill code-review
npx mf explain skill mustflow.core.code-review --json
npx mf explain skills
npx mf explain skills --json
npx mf explain authority .mustflow/skills/INDEX.md --json
```

## JSON 字段

```sh
npx mf explain authority AGENTS.md --json
```

机器可读输出使用这些字段：

- `schema_version` (`string`)：输出格式版本。
- `command` (`string`)：始终为 `explain`。
- `topic` (`string`)：`anchor`、`asset-optimization`、`authority`、`command`、`retention`、`skill`、`skills` 或 `surface`。
- `mustflow_root` (`string`)：当前 mustflow 根目录。
- `decision` (`object`)：解析出的决策、原因、有效操作、来源文件、验证状态和主题专用详情。对于 `authority`，还包括 `boundary.role`、`boundary.canDefine` 和 `boundary.cannotDefine`。

## 帮助和退出码

```sh
npx mf explain --help
```

- 退出码 `0`：已检查并输出权威决策。
- 退出码 `1`：命令收到无效主题、未知选项或意外参数。
