---
title: mf explain
description: Read-only command to explain why mustflow policy decisions apply.
---

`mf explain authority [path]` explains how mustflow classifies managed Markdown authority. It does not modify files and does not count as project verification.

Without a path, the command prints the authority model. With a path, it reports whether that path has an expected mustflow document role.

`mf explain command <intent>` explains whether a command intent in `.mustflow/config/commands.toml` is runnable through `mf run`, why it is allowed or blocked, and whether running it would count as mustflow verification.

`mf explain retention` explains the effective retention policy from `.mustflow/config/mustflow.toml`, including raw event storage, bounded run receipts, and context limits.

`mf explain skill <skill_id>` explains one route from `.mustflow/skills/INDEX.md`, including its trigger, required input, edit scope, risk, verification intents, and expected output. The target may be the skill folder name, full `metadata.skill_id`, `mustflow_doc`, or skill path.

`mf explain skills` explains the strict skill index/body alignment summary used by `mf doctor --strict`. It reports whether every `.mustflow/skills/INDEX.md` route points to a skill body and whether every skill body is listed in the index.

## Output

- `mustflow root`: Current mustflow root.
- `Topic`: The explanation topic.
- `Decision`: The resolved policy decision.
- `Reason`: Why the decision applies.
- `Effective action`: What an agent should do with that decision.
- `Counts as mustflow verification`: Whether the command result is a verification receipt.
- `Source files`: Files that define the rule source.
- `Expected frontmatter`: Required `mustflow_doc`, `authority`, and `lifecycle` values when the path is recognized.
- `Command intent`: Command-contract metadata when the `command` topic is used.
- `Retention policy`: Effective retention settings when the `retention` topic is used.
- `Skill route`: Trigger, scope, risk, checks, and expected output when the `skill` topic is used.
- `Skill routes`: Strict skill index/body alignment status when the `skills` topic is used.

## Examples

```sh
npx mf explain authority
npx mf explain authority AGENTS.md
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

## JSON Fields

```sh
npx mf explain authority AGENTS.md --json
```

Machine-readable output uses these fields:

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `explain`.
- `topic` (`string`): `authority`, `command`, `retention`, `skill`, or `skills`.
- `mustflow_root` (`string`): Current mustflow root.
- `decision` (`object`): The resolved decision, reason, effective action, source files, verification status, and topic-specific details.

## Help and Exit Codes

```sh
npx mf explain --help
```

- Exit code `0`: The authority decision was inspected and printed.
- Exit code `1`: The command received an invalid topic, unknown option, or unexpected argument.
