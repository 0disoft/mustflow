---
title: mf explain
description: 用于解释 mustflow 策略决策为何适用的只读命令。
---

`mf explain authority [path]` 解释 mustflow 如何分类受管 Markdown 文档的权威性。它不会修改文件，也不算作项目验证。

省略路径时，命令输出权威分类模型。提供路径时，命令报告该路径是否有预期的 mustflow 文档角色。

`mf explain asset-optimization` 解释 Web 图像优化的决策路径。它报告 `web-asset-optimization` 技能是否适用，以及 `asset_optimize` 是否是已配置且代理可运行的命令意图，避免代理猜测图像转换器或包命令。

`mf explain anchor <anchor_id>` 解释结构化源码锚点。源码锚点只是导航坐标：它们可以帮助代理找到代码，但不能定义工作流规则、命令权限或验证权威。

`mf explain command <intent>` 解释 `.mustflow/config/commands.toml` 中的命令意图是否可通过 `mf run` 运行、为什么允许或阻止，以及运行后是否算作 mustflow 验证。
如果存在最新的本地索引，它还会读取派生的命令效果图，显示写入锁和锁冲突，但不会改变命令权限。

`mf explain verify --reason <event>` 和 `mf explain verify --from-plan <path>` 会说明 `mf verify` 将选择哪些验证候选项，但不会运行命令，也不会写入运行回执。它使用与 `mf verify` 相同的 `required_after` 匹配和命令可执行性判定规则，并用稳定的原因代码显示被跳过的候选项。
验证说明还包含 `decision.verification.decisionGraph`，也就是计划预览和仪表板快照共用的决策模型。如果存在最新的本地索引，验证说明还会为匹配的候选项包含只读命令效果图状态。索引缺失或过期时只显示重建提示，不改变命令选择。

`mf explain retention` 解释 `.mustflow/config/mustflow.toml` 中的有效保留策略，包括原始事件存储、有界运行回执和上下文限制。

`mf explain skill <skill_id>` 说明 `.mustflow/skills/INDEX.md` 中的一条技能路由，包括触发条件、必需输入、编辑范围、风险、验证意图和预期输出。目标可以是技能文件夹名、完整 `metadata.skill_id`、`mustflow_doc` 或技能路径。

`mf explain skills` 解释 `mf doctor --strict` 使用的严格技能索引与技能正文对齐摘要。它报告 `.mustflow/skills/INDEX.md` 中的每条路由是否指向技能正文，以及每个技能正文是否列在索引中。

`mf explain surface [path]` 解释仓库相对路径如何映射到变更分类使用的公开表面契约。存在最新本地索引时，它还会显示匹配的派生路径-表面规则。索引缺失或过期时只显示重建提示，不改变分类或命令选择。

`mf explain why <target>` 通过其他 explain 主题已经使用的同一决策模型解释现有决策。它是只读包装器，不是新的选择器。支持的目标包括 `command <intent>`、`intent <intent>`、`verify --reason <event>`、`verify --from-plan <path>`、`skill <skill_id>`、`skills`、`surface [path]` 和 `latest-failure`。
`mf explain why latest-failure` 只读取 `.mustflow/state/runs/latest.json` 中的有界元数据：状态、意图、退出码、错误类型、耗时和简短摘要。它不会打印 stdout 或 stderr 尾部。

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
- `Command effect graph`：使用 `command` 主题时，从最新本地索引读取的写入锁和锁冲突。如果索引缺失或过期，输出只显示重建提示，不改变命令决策。
- `Verification explanation`：使用 `verify` 主题时的验证原因、匹配的 `required_after` 命令意图、可运行候选项、跳过候选项、缺口、`decisionGraph` 和本地索引命令效果状态。
- `Retention policy`：使用 `retention` 主题时的有效保留设置。
- `Skill route`：使用 `skill` 主题时的触发条件、范围、风险、验证和预期输出。
- `Skill routes`：使用 `skills` 主题时的严格技能索引/正文对齐状态。
- `Public surface`：使用 `surface` 主题时的表面类型、类别、验证原因、受影响契约、更新策略和漂移检查。
- `Path-surface read model`：使用 `surface` 主题且 `.mustflow/cache/mustflow.sqlite` 可用时，从最新本地索引读取的规则标识、模式和派生表面元数据。
- `Latest run failure`：使用 `mf explain why latest-failure` 时的有界最近运行状态、意图、退出码、错误类型、耗时和摘要。

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
npx mf explain why command test --json
npx mf explain why latest-failure
npx mf explain verify --reason code_change
npx mf explain verify --from-plan verify-plan.json --json
npx mf explain why verify --reason code_change --json
npx mf explain retention
npx mf explain retention --json
npx mf explain skill code-review
npx mf explain skill mustflow.core.code-review --json
npx mf explain skills
npx mf explain skills --json
npx mf explain surface README.md
npx mf explain surface templates/default/locales/zh/AGENTS.md --json
npx mf explain authority .mustflow/skills/INDEX.md --json
```

## JSON 字段

```sh
npx mf explain authority AGENTS.md --json
```

机器可读输出使用这些字段：

- `schema_version` (`string`)：输出格式版本。
- `command` (`string`)：始终为 `explain`。
- `topic` (`string`)：`anchor`、`asset-optimization`、`authority`、`command`、`retention`、`skill`、`skills`、`surface`、`verify` 或 `why`。
- `mustflow_root` (`string`)：当前 mustflow 根目录。
- `decision` (`object`)：解析出的决策、原因、有效操作、来源文件、验证状态和主题专用详情。对于 `authority`，还包括 `boundary.role`、`boundary.canDefine` 和 `boundary.cannotDefine`。对于 `command`，当命令意图已声明时，`decision.effectGraph` 包含本地索引中的命令效果图状态、写入锁、冲突、过期路径和重建提示。对于 `verify`，`decision.verification` 包含选中的原因、匹配候选项、跳过原因、缺口、`decisionGraph` 和本地命令效果图状态。对于 `surface`，可用时 `decision.readModel` 包含只读本地索引的路径-表面状态和匹配规则元数据。对于 `why latest-failure`，`decision.latestFailure` 包含没有日志尾部的有界最近运行元数据。

## 帮助和退出码

```sh
npx mf explain --help
```

- 退出码 `0`：已检查并输出策略决策。
- 退出码 `1`：命令收到无效主题、未知选项或意外参数。
