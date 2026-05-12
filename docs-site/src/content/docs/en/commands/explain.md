---
title: mf explain
description: Read-only command to explain why mustflow policy decisions apply.
---

`mf explain authority [path]` explains how mustflow classifies managed Markdown authority. It does not modify files and does not count as project verification.

Without a path, the command prints the authority model. With a path, it reports whether that path has an expected mustflow document role.

`mf explain asset-optimization` explains the web image optimization decision path. It reports whether the `web-asset-optimization` skill applies and whether `asset_optimize` is a configured agent-runnable command intent, so agents do not guess image converters or package commands.

`mf explain anchor <anchor_id>` explains a structured source-code anchor. Source anchors are navigation-only code coordinates: they can help agents find code, but they cannot define workflow rules, command permission, or verification authority.

`mf explain command <intent>` explains whether a command intent in `.mustflow/config/commands.toml` is runnable through `mf run`, why it is allowed or blocked, and whether running it would count as mustflow verification.
When a fresh local index exists, it also reads the derived command-effect graph so the report can show write locks and lock conflicts without changing command authority.

`mf explain retention` explains the effective retention policy from `.mustflow/config/mustflow.toml`, including raw event storage, bounded run receipts, and context limits.

`mf explain skill <skill_id>` explains one route from `.mustflow/skills/INDEX.md`, including its trigger, required input, edit scope, risk, verification intents, and expected output. The target may be the skill folder name, full `metadata.skill_id`, `mustflow_doc`, or skill path.

`mf explain skills` explains the strict skill index/body alignment summary used by `mf doctor --strict`. It reports whether every `.mustflow/skills/INDEX.md` route points to a skill body and whether every skill body is listed in the index.

`mf explain surface [path]` explains how a repository-relative path maps to the public surface contract used by change classification. It reports the surface kind, validation reasons, affected contracts, update policy, and drift checks without running verification.
When a fresh local index exists, it also shows the derived path-surface rule that matched the path. Missing or stale indexes show a rebuild hint and never change classification or command selection.

## Output

- `mustflow root`: Current mustflow root.
- `Topic`: The explanation topic.
- `Decision`: The resolved policy decision.
- `Reason`: Why the decision applies.
- `Effective action`: What an agent should do with that decision.
- `Counts as mustflow verification`: Whether the command result is a verification receipt.
- `Source files`: Files that define the rule source.
- `Source anchor`: Anchor path, line, purpose, search terms, invariant, risk, and navigation-only authority when the `anchor` topic is used.
- `Expected frontmatter`: Required `mustflow_doc`, `authority`, and `lifecycle` values when the path is recognized.
- `Authority boundary`: What the authority lane may define and what it must leave to higher-authority files, current code, or `commands.toml`.
- `Command intent`: Command-contract metadata when the `command` topic is used.
- `Command effect graph`: Fresh local-index write locks and lock conflicts when the `command` topic is used and `.mustflow/cache/mustflow.sqlite` is available. Missing or stale indexes show a rebuild hint instead of changing the command decision.
- `Retention policy`: Effective retention settings when the `retention` topic is used.
- `Skill route`: Trigger, scope, risk, checks, and expected output when the `skill` topic is used.
- `Skill routes`: Strict skill index/body alignment status when the `skills` topic is used.
- `Public surface`: Surface kind, category, validation reasons, affected contracts, update policy, and drift checks when the `surface` topic is used.
- `Path-surface read model`: Fresh local-index rule id, pattern, and derived surface metadata when the `surface` topic is used and `.mustflow/cache/mustflow.sqlite` is available. Missing or stale indexes show a rebuild hint instead of changing the surface decision.

## Examples

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
npx mf explain surface README.md
npx mf explain surface templates/default/locales/ko/AGENTS.md --json
npx mf explain authority .mustflow/skills/INDEX.md --json
```

## JSON Fields

```sh
npx mf explain authority AGENTS.md --json
```

Machine-readable output uses these fields:

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `explain`.
- `topic` (`string`): `anchor`, `asset-optimization`, `authority`, `command`, `retention`, `skill`, `skills`, or `surface`.
- `mustflow_root` (`string`): Current mustflow root.
- `decision` (`object`): The resolved decision, reason, effective action, source files, verification status, and topic-specific details. For `authority`, this includes `boundary.role`, `boundary.canDefine`, and `boundary.cannotDefine`. For `command`, `decision.effectGraph` contains local-index command-effect graph status, write locks, conflicts, stale paths, and refresh hints when an intent is declared. For `surface`, `decision.readModel` contains read-only local-index path-surface status and matching rule metadata when available.

## Help and Exit Codes

```sh
npx mf explain --help
```

- Exit code `0`: The authority decision was inspected and printed.
- Exit code `1`: The command received an invalid topic, unknown option, or unexpected argument.
