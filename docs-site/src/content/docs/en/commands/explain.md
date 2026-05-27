---
title: mf explain
description: Read-only command to explain why mustflow policy decisions apply.
---

`mf explain authority [path]` explains how mustflow classifies managed Markdown authority. It does not modify files and does not count as project verification.

Without a path, the command prints the authority model. With a path, it reports whether that path has an expected mustflow document role.

`mf explain asset-optimization` explains the web image optimization decision path. It reports whether the `web-asset-optimization` skill applies and whether `asset_optimize` is a configured agent-runnable command intent, so agents do not guess image converters or package commands.

`mf explain anchor <anchor_id>` explains a structured source-code anchor. Source anchors are navigation-only code coordinates: they can help agents find code, but they cannot define workflow rules, command permission, or verification authority.

`mf explain command <intent>` explains whether a command intent in `.mustflow/config/commands.toml` is runnable through `mf run`, why it is allowed or blocked, and whether running it would count as mustflow verification.
When a fresh local index exists, it also reads the derived command-effect graph so the report can show write locks and lock conflicts without changing command authority. The graph is marked `explanation_only`, points back to `.mustflow/config/commands.toml`, and never grants runnable status by itself.

`mf explain --why-blocked <intent>` focuses that command decision on the `mf run` preflight plan. It shows the blocking reason code, bounded run-plan metadata, and any suggested command-contract snippet without running the intent.

`mf explain verify --reason <event>` and `mf explain verify --from-plan <path>` explain which verification candidates `mf verify` would select without running commands or writing receipts. They use the same `required_after` matching and command eligibility rules as `mf verify`, and show skipped candidates with stable reason codes.
Verify explanations include `decision.verification.decisionGraph`, the same decision model used by plan-only verification and dashboard snapshots. When a fresh local index exists, verify explanations also include read-only command-effect graph status for matching candidates. Missing or stale indexes show a rebuild hint and do not change command selection or command authority.

`mf explain retention` explains the effective retention policy from `.mustflow/config/mustflow.toml`, including raw event storage, bounded run receipts, and context limits.

`mf explain skill <skill_id>` explains one route from `.mustflow/skills/INDEX.md`, including its trigger, required input, edit scope, risk, verification intents, expected output, and selection evidence. The target may be the skill folder name, full `metadata.skill_id`, `mustflow_doc`, or skill path.

`mf explain skills` explains the strict skill index/body alignment summary used by `mf doctor --strict`. It reports whether every `.mustflow/skills/INDEX.md` route points to a skill body and whether every skill body is listed in the index.

`mf explain surface [path]` explains how a repository-relative path maps to the public surface contract used by change classification. It reports the surface kind, validation reasons, affected contracts, update policy, and drift checks without running verification.
When a fresh local index exists, it also shows the derived path-surface rule that matched the path. Missing or stale indexes show a rebuild hint and never change classification or command selection.

`mf explain why <target>` explains an existing decision through the same models used by other explain topics. It is a read-only wrapper, not a new selector. Supported targets include `command <intent>`, `intent <intent>`, `verify --reason <event>`, `verify --from-plan <path>`, `skill <skill_id>`, `skills`, `surface [path]`, and `latest-failure`.
`mf explain why latest-failure` reads only bounded metadata from `.mustflow/state/runs/latest.json`: status, intent, exit code, error kind, duration, and a short summary. It does not print stdout or stderr tails.

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
- `Blocked run plan`: `mf run` preflight status, reason code, detail, configured cwd, timeout, mode, writes, and suggested snippet when `--why-blocked` is used.
- `Command effect graph`: Fresh local-index write locks and lock conflicts when the `command` topic is used and `.mustflow/cache/mustflow.sqlite` is available. Missing or stale indexes show a rebuild hint instead of changing the command decision. Graph metadata is explanation-only and cannot make a command runnable.
- `Verification explanation`: Reasons, matching `required_after` intents, runnable candidates, skipped candidates, gaps, `decisionGraph`, and local-index command-effect status when the `verify` topic is used.
- `Retention policy`: Effective retention settings when the `retention` topic is used.
- `Skill route`: Trigger, scope, risk, checks, and expected output when the `skill` topic is used.
- `Skill selection evidence`: Matched skill identifier, declared required inputs, missing static inputs, candidate adjunct skills, unmatched paths, and gap notes when the `skill` topic is used.
- `Skill routes`: Strict skill index/body alignment status when the `skills` topic is used.
- `Public surface`: Surface kind, category, validation reasons, affected contracts, update policy, and drift checks when the `surface` topic is used.
- `Path-surface read model`: Fresh local-index rule id, pattern, and derived surface metadata when the `surface` topic is used and `.mustflow/cache/mustflow.sqlite` is available. Missing or stale indexes show a rebuild hint instead of changing the surface decision.
- `Latest run failure`: Bounded latest-run status, intent, exit code, error kind, duration, and summary when `mf explain why latest-failure` is used.

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
npx mf explain --why-blocked lint
npx mf explain --why-blocked deploy --json
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
- `topic` (`string`): `anchor`, `asset-optimization`, `authority`, `command`, `retention`, `skill`, `skills`, `surface`, `verify`, or `why`.
- `mustflow_root` (`string`): Current mustflow root.
- `decision` (`object`): The resolved decision, reason, effective action, source files, verification status, and topic-specific details. For `authority`, this includes `boundary.role`, `boundary.canDefine`, and `boundary.cannotDefine`. For `command`, `decision.effectGraph` contains local-index command-effect graph status, write locks, conflicts, stale paths, refresh hints, and explanation-only command-authority fields when an intent is declared. For `--why-blocked`, `decision.blockedRunPlan` contains the `mf run` preflight reason code, detail, metadata, and suggested snippet. For `skill`, `decision.selectionEvidence` contains deterministic route evidence such as `matchedBy`, `requiredInputs`, `missingInputs`, `candidateAdjuncts`, `unmatchedPaths`, and `gapNotes`. For `verify`, `decision.verification` contains selected reasons, matching candidates, skip reasons, gaps, `decisionGraph`, and local-index command-effect status. For `surface`, `decision.readModel` contains read-only local-index path-surface status and matching rule metadata when available. For `why latest-failure`, `decision.latestFailure` contains bounded latest-run metadata without log tails.

## Help and Exit Codes

```sh
npx mf explain --help
```

- Exit code `0`: The policy decision was inspected and printed.
- Exit code `1`: The command received an invalid topic, unknown option, or unexpected argument.
