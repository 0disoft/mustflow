---
mustflow_doc: skills.index
locale: en
canonical: true
revision: 11
authority: router
lifecycle: mustflow-owned
---

# Skills Index

Consult only the skill document relevant to the current task. If no specific skill applies,
refer to `AGENTS.md` and `.mustflow/config/commands.toml` to implement the most minimal safe change.

## Selection Rules

- At task start and before the first edit, compare the user request and expected changed files with
  the triggers below.
- If one or more triggers match, read each `SKILL.md` before editing that scope.
- When a skill is used, or when a plausible skill is intentionally skipped, leave a concise
  selection note in the next user-facing update or final report.
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
| Changed files need risk classification and verification selection | `.mustflow/skills/diff-risk-review/SKILL.md` | Changed-file list, diff summary, and task goal | Changed surfaces and verification report | under- or over-verification | `changes_status`, `changes_diff_summary`, `test`, `test_related`, `test_audit`, `lint`, `build`, `docs_validate`, `mustflow_check` | Risk level, verification choice, rollback notes |
| Tests are added, updated, removed, or audited | `.mustflow/skills/test-maintenance/SKILL.md` | Changed behavior or stale-test evidence | Test files and related source | contract drift | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` | Test rationale and verification |
| Security-sensitive behavior changes need abuse-case regression tests | `.mustflow/skills/security-regression-tests/SKILL.md` | Changed boundary, actors, and expected deny behavior | Test files and related security boundary source | false confidence and unsafe coverage | `test`, `test_related`, `test_audit`, `lint`, `build` | Security boundary, abuse case, tests, and remaining risks |
| A configured command intent or verification step fails | `.mustflow/skills/failure-triage/SKILL.md` | Failing intent and output tail | Failure cause only | misdiagnosis | `mustflow_check`; original failing intent | Root cause, fix, rerun result |
| `.mustflow/context/PROJECT.md` needs cautious project context | `.mustflow/skills/project-context-authoring/SKILL.md` | Supported project facts | `.mustflow/context/PROJECT.md` | authority drift | `mustflow_check` | Updated cautious context |
| Skill procedures or routes are created or maintained | `.mustflow/skills/skill-authoring/SKILL.md` | Repeated task evidence | `.mustflow/skills/**` | overlap and command drift | `mustflow_check`, `docs_validate` | Skill route and procedure changes |
| Documentation review queue entries need prose cleanup | `.mustflow/skills/docs-prose-review/SKILL.md` | Review queue entry or selected document path, review comment if present, target language, reviewer metadata | Selected documentation file and review ledger entry | meaning drift or stale queue state | `docs_validate`, `mustflow_check` | Prose changes, recorded review status, verification notes |
| Web image assets are added, converted, resized, or replaced | `.mustflow/skills/web-asset-optimization/SKILL.md` | Image asset request and target path | Web image assets | asset quality and size | `asset_optimize`, `build` | Optimized asset notes |
| Documentation changes affect public or workflow docs | `.mustflow/skills/docs-update/SKILL.md` | Changed behavior or field | Relevant docs only | stale public docs | `docs_validate_fast`, `docs_validate`, `mustflow_check` | Doc changes and skipped checks |

When introducing a new skill, link it here and define the specific trigger and route fields.
Avoid including raw shell commands in skill documents; instead, reference the command intent
names as defined in `.mustflow/config/commands.toml`.
