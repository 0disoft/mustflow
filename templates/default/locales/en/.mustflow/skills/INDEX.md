---
mustflow_doc: skills.index
locale: en
canonical: true
revision: 7
---

# Skills Index

Consult only the skill document relevant to the current task. If no specific skill applies,
refer to `AGENTS.md` and `.mustflow/config/commands.toml` to implement the most minimal safe change.

## Selection Rules

- At task start and before the first edit, compare the user request and expected changed files with
  the triggers below.
- If one or more triggers match, read each `SKILL.md` before editing that scope.
- If a new condition appears during the task, such as a command failure, test contract change, or
  documentation change, pause and read the newly matching skill before continuing.
- If no trigger applies, do not invent a skill. Continue with `AGENTS.md`,
  `.mustflow/docs/agent-workflow.md`, and `.mustflow/config/commands.toml`.
- Skill documents guide procedure only. They do not authorize command execution outside the declared
  command intents.
- Keep the route table compact: each route states the trigger, required input, edit scope, risk,
  verification intents, and expected output.

| Trigger | Skill Document | Required Input | Edit Scope | Risk | Verification Intents | Expected Output |
| --- | --- | --- | --- | --- | --- | --- |
| Code changes need review before report | `.mustflow/skills/code-review/SKILL.md` | Diff and task goal | Changed files | behavior and regression | `test`, `test_related`, `test_audit`, `lint` | Findings or no-issue note |
| Tests are added, updated, removed, or audited | `.mustflow/skills/test-maintenance/SKILL.md` | Changed behavior or stale-test evidence | Test files and related source | contract drift | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` | Test rationale and verification |
| A configured command intent or verification step fails | `.mustflow/skills/failure-triage/SKILL.md` | Failing intent and output tail | Failure cause only | misdiagnosis | `mustflow_check`; original failing intent | Root cause, fix, rerun result |
| `.mustflow/context/PROJECT.md` needs cautious project context | `.mustflow/skills/project-context-authoring/SKILL.md` | Supported project facts | `.mustflow/context/PROJECT.md` | authority drift | `mustflow_check` | Updated cautious context |
| Skill procedures or routes are created or maintained | `.mustflow/skills/skill-authoring/SKILL.md` | Repeated task evidence | `.mustflow/skills/**` | overlap and command drift | `mustflow_check`, `docs_validate` | Skill route and procedure changes |
| Web image assets are added, converted, resized, or replaced | `.mustflow/skills/web-asset-optimization/SKILL.md` | Image asset request and target path | Web image assets | asset quality and size | `asset_optimize`, `build` | Optimized asset notes |
| Documentation changes affect public or workflow docs | `.mustflow/skills/docs-update/SKILL.md` | Changed behavior or field | Relevant docs only | stale public docs | `docs_validate`, `mustflow_check` | Doc changes and skipped checks |

When introducing a new skill, link it here and define the specific trigger and route fields.
Avoid including raw shell commands in skill documents; instead, reference the command intent
names as defined in `.mustflow/config/commands.toml`.