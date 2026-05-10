# mustflow Roadmap

Last reviewed: 2026-05-10

This roadmap lists remaining work only. Completed items are removed after
verification so agents can spend context on the next decisions instead of
reading project history.

## Current Priority

Make this repository a strong example of its own workflow contract.

Before adding larger product surfaces, mustflow should reduce duplicated policy
logic and keep future commands sharing the same core decisions.

Command-intent eligibility and command cwd boundary checks are now centralized
in `src/core`. The remaining M3 work should continue extracting adjacent
policy decisions without moving process execution out of the CLI too early.

Open command-contract follow-up: defer asset optimization until there is a real
repository pipeline.

Parallel verification follow-up: keep existing `writes` fields for compatibility,
but add structured command effects and resource locks before suggesting parallel
verification batches. Path writes alone cannot express delete-and-recreate build
outputs such as `dist/`.

Contract-surface follow-up: keep the shared model thin. Connect target paths to
public surfaces, reasons, command candidates, and eligibility status, but do not
collapse document review, source anchors, command permissions, and dashboard
display into one large policy object.

## Near-Term Milestones

### M3: Core Policy Modules

Goal: move shared decision logic out of command handlers without prematurely
promising a broad public API.

- Keep CLI commands thin by calling shared core functions.
- Export only the minimum surface needed internally until API stability is
  intentionally documented.
- Preserve existing CLI behavior while reducing duplicated policy logic.

#### M3.0: Thin Surface Decision Model

Goal: give related contracts a small shared vocabulary without creating a broad
policy API.

- Define a minimal target and surface model that can describe repository paths,
  documents, source anchors, and command intents without making them equivalent
  authorities.
- Connect change classification to verification through
  `path -> surface -> reason -> command candidate -> eligibility status`.
- Keep `validationReasons` as the join key between change classification and
  `commands.toml` `required_after` values.
- Keep document review as a prose-quality and human-review ledger, not as a
  command-verification result.
- Keep source anchors navigation-only. They may contribute paths, risk tags, and
  stale/moved/review signals, but never command permission or verification
  selection.
- Let the dashboard render core decisions, not invent additional policy rules.

#### M3.3: Configured Command Gates

Goal: promote configured command intents only when they are deterministic,
bounded, and already backed by repository tooling.

- Keep `asset_optimize` deferred until image optimization is an actual
  repository workflow rather than an implied pipeline.

#### M3.4: Documentation Review Triage

Goal: make the documentation review queue release-useful by classifying pending
items by risk instead of treating all pending prose equally.

- Define P0 documents that must be reviewed before release: `README.md`,
  `CHANGELOG.md`, `AGENTS.md`, `.mustflow/docs/agent-workflow.md`,
  `.mustflow/skills/INDEX.md`, default template English source files, English
  command docs, and skills that affect authority, security, command execution,
  or validation boundaries.
- Define P1 documents as user-visible but non-blocking: general docs-site pages,
  detailed skill procedures, important translations, and example explanations.
- Define P2 documents as non-blocking review debt: non-default translations
  marked stale or needing review, older example prose, and test fixture
  documents.
- Manage translations by source freshness. Do not approve translations while the
  canonical English source is still pending, and treat a `current` translation
  with a mismatched source revision as a release risk.
- Treat fixture documents as test inputs. Preserve the broken state or edge case
  they are meant to exercise instead of polishing prose, and verify fixture
  changes with the tests that consume them.

#### M3.5: Default Skill Surface

Goal: keep mustflow's default installed surface small while still allowing
larger skill packs to ship with the package.

- Keep package distribution broad enough to include optional skill packs.
- Reduce the default `mf init` skill set to the skills that raise safety for
  ordinary coding work in most repositories.
- Move product/web, release/maintainer, authoring/docs, and team coordination
  skills into opt-in profiles or packs.
- Add a profile-aware installation path before adding more default skills, for
  example `mf init --profile <name>` or `mf skills add <pack>`.
- Update `.mustflow/skills/INDEX.md` and template lock metadata when a skill pack
  is installed so route state stays explicit.

#### M3.6: Local Index Contracts

Goal: use SQLite more aggressively as a fresh local lookup index without turning
it into memory, an audit log, or project truth.

- Treat `.mustflow/cache/mustflow.sqlite` as rebuildable cache only.
- Add or refine index tables only for current-file lookup and explanation, such
  as index metadata, indexed files, document sections, skill routes, command
  intents, command effects, source anchors, source anchor fingerprints, and
  source anchor status.
- Do not store full source files, raw diffs, raw terminal logs, environment
  variables, secrets, customer data, full chat history, hidden reasoning,
  browser tokens, remote document bodies, or long-term memory summaries.
- Make stale index handling fail closed: if indexed files changed, require a
  refresh or show the copyable refresh command instead of silently trusting old
  rows.
- Keep source anchors navigation-only. Indexed anchor data must not authorize
  commands, skip validation, or override workflow rules.

#### M3.7: Dashboard Plan Views

Goal: expand the dashboard only where it explains repository state without
starting work on the user's behalf.

- Add a validation plan view before any broader dashboard surface.
- Show changed files, verification reasons, runnable or skipped intents, skip
  reasons, release sensitivity, command effects, resource locks, and recommended
  serial order.
- Allow copy actions such as copy command or copy full plan, plus file opening
  when safe.
- Do not add run, fix, apply, start-agent, merge, push, or automatic update
  buttons.
- Consider an index health view after the validation plan view, showing index
  presence, schema version, stale paths, skill count, source anchor status, and
  cache-layer summary without auto-generating the index.

#### M3.8: Command Effects And Resource Locks

Goal: prevent verification races by expressing command side effects beyond
simple write globs.

- Keep `writes` as the backward-compatible path summary.
- Add command `resources` and `effects` to the command contract schema.
- Support effect modes such as `read`, `write`, `append`, `replace`, and
  `delete_recreate`.
- Treat `delete_recreate` as conflicting with both readers and writers of the
  same resource.
- Derive conservative exclusive locks from `writes` when `effects` are absent.
- Add `src/core/command-effects.ts` to normalize intent effects and reject root
  escapes.
- Add `src/core/verification-scheduler.ts` to group verification plan candidates
  into ordered batches and explain conflicts.
- Warn in strict checks when multiple configured, agent-allowed, oneshot intents
  share a write path without explicit effects or locks.
- Keep actual `mf run` execution serial until run receipts can move from a
  single `latest.json` write target to per-run records with a safe latest
  pointer.

#### M3.9: Release Contract Manifest

Goal: close the release gap between schema files, documentation, package
contents, and installed-package command output.

- Add a single public-contract manifest or generator for shipped JSON schemas
  and their producing commands.
- Compare the actual `schemas/*.schema.json` file list with `schemas/README.md`.
- Compare that list with `npm pack --dry-run --json` output.
- Install the packed `.tgz` in a temporary project and verify representative
  JSON-producing public commands against the declared schemas.
- Include recent public surfaces such as change verification, version sources,
  impact, classify, docs review, line endings, and contract lint reports.
- Fail when a schema is documented but not packaged, packaged but undocumented,
  or no installed command can produce the promised JSON shape.

#### M3.10: Public Documentation Information Architecture

Goal: make README and documentation-site entry points emphasize the workflow
contract instead of making mustflow look like an autonomous agent platform.

- Lead with the no-guessing flow: required read order, command contract, change
  classification, verification planning, declared command execution, and
  receipts.
- Move SQLite details, dashboard settings, exhaustive command lists, candidate
  feature lists, and long installation trees below the first-use flow.
- Make `mf init --yes`, `mf check --strict`, `mf classify --changed --json`, and
  `mf verify --plan-only --json` the primary first-read examples.
- Present source anchors as navigation hints that do not grant authority.
- Keep dashboard documentation centered on inspection, copying, and explanation,
  not execution or automatic repair.

#### Deferred: Path Classification Policy

Goal: leave repository-specific path classification configurable only after the
core model is stable and permission boundaries are enforceable.

- Do not add a broad `policy.toml` now.
- If repository-specific classification becomes necessary, prefer a narrow
  `.mustflow/config/surfaces.toml` or `.mustflow/config/changes.toml` contract.
- Allow only path-classification augmentation fields such as rule id, match,
  surface kind, public-surface flag, validation reasons, affected contracts,
  update policy, and drift checks.
- Start with `exact`, `prefix`, or `glob` path matches. Defer regular
  expressions until review and validation rules are stronger.
- Forbid command authority fields such as `argv`, `cmd`, `run_policy`,
  `lifecycle`, `stdin`, `timeout_seconds`, `writes`, `network`, `destructive`,
  `required_after`, `skip_validation`, and agent action directives.
- Treat added validation reasons as input to `commands.toml`; they must not make
  any command runnable without the normal configured, oneshot, agent-allowed,
  closed-stdin, timeout, and command-source checks.

## Non-Goals

- Do not make mustflow an autonomous agent runtime.
- Do not make `mf init` generate application source code.
- Do not make `mf init` generate CI, GitHub, GitLab, `Makefile`, `justfile`, or
  package-manager files by default.
- Do not treat `.mustflow/cache/` or `.mustflow/state/` as versioned project
  truth.
- Do not make SQLite a memory store, audit log, command transcript store, or
  hidden reasoning store.
- Do not add broader dashboard, registry, or adapter work ahead of matching
  contract, explanation, and verification foundations.
- Do not add dashboard controls that execute commands, apply fixes, start
  agents, merge branches, push changes, or update files automatically.
- Do not introduce a broad `policy.toml` that can weaken built-in rules, grant
  command permission, skip validation, or instruct agents.

## Decision Notes

- The default installed project surface should remain small:
  `AGENTS.md`, `.gitignore`, and `.mustflow/**`.
- Public documentation should distinguish this repository's own open source
  operations from files installed into user projects.
- Optional skills may ship in the package without being copied into every new
  project by default.
- SQLite cache rows should explain current repository files and routing
  decisions, not preserve history or memory.
- Shared core models should connect existing contracts with small identifiers
  and reasons; they should not force every contract into one report type.
- A future path-classification config may add validation reasons, but
  `commands.toml` remains the only source of runnable command authority.
