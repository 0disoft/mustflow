---
mustflow_doc: skills.index
locale: zh
canonical: false
revision: 2
---

# Skills 索引

只阅读与当前任务相关的 skill 文档。若没有特定 skill 适用，
请参考 `AGENTS.md` 与 `.mustflow/config/commands.toml`，实施最小且安全的改动。

| 场景 | Skill 文档 | 相关 Command Intents |
| --- | --- | --- |
| 审查代码变更 | `.mustflow/skills/code-review/SKILL.md` | `test`, `test_related`, `test_audit`, `lint` |
| 新增、更新、删除或审计测试 | `.mustflow/skills/test-maintenance/SKILL.md` | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` |
| 调查失败 | `.mustflow/skills/failure-triage/SKILL.md` | 原始失败 intent |
| 更新文档 | `.mustflow/skills/docs-update/SKILL.md` | `docs_validate`, `mustflow_check` |

引入新 skill 时，请在此处建立链接并定义其具体适用场景。
避免在 skill 文档中写原始 shell 命令；应引用
`.mustflow/config/commands.toml` 中定义的 command intent 名称。
