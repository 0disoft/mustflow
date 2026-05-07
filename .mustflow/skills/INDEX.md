---
mustflow_doc: skills.index
locale: en
canonical: true
revision: 2
---

# Skills Index

Consult only the skill document relevant to the current task. If no specific skill applies,
refer to `AGENTS.md` and `.mustflow/config/commands.toml` to implement the most minimal safe change.

| Scenario | Skill Document | Related Command Intents |
| --- | --- | --- |
| Review code changes | `.mustflow/skills/code-review/SKILL.md` | `test`, `test_related`, `test_audit`, `lint` |
| Add, update, remove, or audit tests | `.mustflow/skills/test-maintenance/SKILL.md` | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` |
| Investigate a failure | `.mustflow/skills/failure-triage/SKILL.md` | The original failing intent |
| Update documentation | `.mustflow/skills/docs-update/SKILL.md` | `docs_validate`, `mustflow_check` |

When introducing a new skill, link it here and define the specific scenarios for its application.
Avoid including raw shell commands in skill documents; instead, reference the command intent
names as defined in `.mustflow/config/commands.toml`.
