---
mustflow_doc: skills.index
locale: en
canonical: true
revision: 6
---

# Skills Index

Consult only the skill document relevant to the current task. If no specific skill applies,
refer to `AGENTS.md` and `.mustflow/config/commands.toml` to implement the most minimal safe change.

## Selection Rules

- At task start and before the first edit, compare the user request and expected changed files with
  the scenarios below.
- If one or more scenarios match, read each matching `SKILL.md` before editing that scope.
- If a new condition appears during the task, such as a command failure, test contract change, or
  documentation change, pause and read the newly matching skill before continuing.
- If no scenario applies, do not invent a skill. Continue with `AGENTS.md`,
  `.mustflow/docs/agent-workflow.md`, and `.mustflow/config/commands.toml`.
- Skill documents guide procedure only. They do not authorize command execution outside the declared
  command intents.

| Scenario | Skill Document | Related Command Intents |
| --- | --- | --- |
| Review code changes | `.mustflow/skills/code-review/SKILL.md` | `test`, `test_related`, `test_audit`, `lint` |
| Add, update, remove, or audit tests | `.mustflow/skills/test-maintenance/SKILL.md` | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` |
| Investigate a failure | `.mustflow/skills/failure-triage/SKILL.md` | The original failing intent |
| Fill or maintain `.mustflow/context/PROJECT.md` | `.mustflow/skills/project-context-authoring/SKILL.md` | `mustflow_check` |
| Create or maintain `.mustflow/skills/*/SKILL.md` procedures | `.mustflow/skills/skill-authoring/SKILL.md` | `mustflow_check`, `docs_validate` |
| Add, convert, resize, or replace web image assets | `.mustflow/skills/web-asset-optimization/SKILL.md` | `asset_optimize`, `build` |
| Update documentation | `.mustflow/skills/docs-update/SKILL.md` | `docs_validate`, `mustflow_check` |

When introducing a new skill, link it here and define the specific scenarios for its application.
Avoid including raw shell commands in skill documents; instead, reference the command intent
names as defined in `.mustflow/config/commands.toml`.
