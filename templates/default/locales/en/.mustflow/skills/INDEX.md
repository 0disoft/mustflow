---
mustflow_doc: skills.index
locale: en
canonical: true
revision: 2
---

# Skills Index

Read only the skill document that matches the current task. If no skill applies, follow `AGENTS.md`
and `.mustflow/config/commands.toml` and make the smallest safe change.

| Situation | Read | Related command intents |
| --- | --- | --- |
| Review code changes | `.mustflow/skills/code-review/SKILL.md` | `test`, `test_related`, `test_audit`, `lint` |
| Add, update, remove, or audit tests | `.mustflow/skills/test-maintenance/SKILL.md` | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` |
| Investigate a failure | `.mustflow/skills/failure-triage/SKILL.md` | The original failing intent |
| Update documentation | `.mustflow/skills/docs-update/SKILL.md` | `docs_validate`, `mustflow_check` |

When adding a new skill, link it here and describe its actual use condition. Do not put raw shell
commands in skill documents. Reference command intent names from `.mustflow/config/commands.toml`.
