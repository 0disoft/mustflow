# mustflow Roadmap

Last reviewed: 2026-05-09

This roadmap lists remaining work only. Completed items are removed after
verification so agents can spend context on the next decisions instead of
reading project history.

## Current Priority

Make this repository a strong example of its own workflow contract.

Before adding larger product surfaces, mustflow should reliably run configured
command intents, produce useful receipts, and expose enough structured policy
information for future commands to share the same decisions.

Open command-contract follow-up: `test_related`, `lint`, coverage, and
test-audit intents remain unset or manual-only until narrower repository gates
exist for those workflows.

## Near-Term Milestones

### M2.5: Document Authority Boundaries

Goal: keep mustflow documents from drifting into overlapping or
self-authorizing policy sources before higher-level explanation and
verification commands depend on them.

- Keep `AGENTS.md` thin and binding while delegating detailed workflow policy to
  `.mustflow/docs/agent-workflow.md`.
- Extend context and skill routing without turning router indexes into policy
  manuals.
- Keep host compatibility adapters subordinate to the canonical contract.

### M2.7: Defensive Skill Pack Candidates

Goal: define skill candidates that interrupt common LLM failure modes at the
moment they usually become expensive.

- Treat defensive skills as concrete guardrails with triggers, sources, checks,
  command-intent references, output format, and unverified-work reporting.
- Keep always-on repository rules in `AGENTS.md` or `agent-workflow.md`; use
  skills only for repeatable task-specific procedures.
- Prioritize the first defensive pack after skill metadata and validation work:
  `pattern-scout`, `repro-first-debug`, `source-freshness-check`,
  `contract-sync-check`, `artifact-integrity-check`,
  `dependency-reality-check`, and `date-number-audit`.
- Define report shapes for defensive skills so they do not expand scope, invent
  facts, mark unrun checks as passed, create unnecessary abstractions, or hide
  instruction conflicts.
- Track a second tier of optional or domain-specific skills:
  `security-privacy-review`, `migration-safety-check`, `ui-quality-gate`,
  `performance-budget-check`, `instruction-conflict-scope-check`, and
  `external-prompt-injection-defense`.
- Require defensive skills to reference command intents from
  `.mustflow/config/commands.toml`, not raw package-manager, build, migration,
  or deployment commands.

### M2.9: Change Classification and Public Surface Contracts

Goal: classify changes, map affected public surfaces, and derive required
validations without making agents guess from prose.

- Reinforce command authority boundaries across docs, metadata, strict checks,
  and command execution.
- Move command intent definitions toward structured execution metadata.
- Keep startup reading small and let compact indexes decide what additional
  context, skills, public surfaces, and validation contracts to load.
- Model README pages, docs-site pages, installed templates, generated examples,
  translations, and workflow roots as public surfaces.
- Introduce candidate `changes.toml`, `validations.toml`, `surfaces.toml`, and
  `artifacts.toml` models.
- Connect `[verification.selection]` preferences to future change
  classification without letting preferences grant command permission.
- Let translated docs follow an update-or-mark-stale policy.
- Add public-surface drift checks for docs, template inventory, translations,
  examples, and contract linting.
- Track future CLI surfaces: `mf contract-lint`, `mf classify --changed`,
  `mf impact --changed`, and `mf verify --from-plan <path>`.
- Keep per-task plans or worklogs in ignored local state, not versioned project
  truth.
- Consider a small `policy.toml` only after the surrounding checks are clear.
- Use the model to strengthen future `mf explain` output.
- Keep `mf init` thin; do not add all candidate contract files to the default
  installed template at once.

### M2.10: Version Source Discovery and Release Bump Contracts

Goal: make version-impact reporting work across languages and frameworks
without assuming every repository stores versions in the same file.

- Keep `[release.versioning]` as the preference layer for reporting,
  suggesting, asking, or applying version-file changes.
- Connect future `mf classify --changed` and `mf impact --changed` output to
  version-related surfaces.
- Keep lockfile handling conservative unless a repository declares otherwise.
- Add fixtures for multi-language repositories, tag-based Go releases,
  duplicate version constants, and docs-only version strings.
- Ensure dashboard controls only toggle preferences or show detected sources;
  they must not silently bump versions, commit, tag, or push.

### M2.11: Local Preferences Dashboard

Goal: provide a small human-facing surface for editing safe mustflow preferences
without turning the dashboard into an autonomous workflow runner.

- Expand dashboard coverage only after the corresponding command-line contract
  exists. Candidate future panes: effective policy explanation, configured
  command intent status, version source discovery, impacted public surfaces,
  template inventory, skill selection diagnostics, and actual verification
  recommendations from changed files.
- Add optional `mf dashboard --open` only if browser-launch behavior has an
  explicit command contract and remains opt-in.

### M2.12: Web Asset Optimization Skill

Goal: help agents handle generated web images without guessing ad hoc image
conversion tools or leaving oversized production assets in website repositories.

- Later, consider a companion `mf explain asset-optimization` or template hint
  once broader skill routing and command explanation are stable.

### M3: Core Policy Modules

Goal: move shared decision logic out of command handlers without prematurely
promising a broad public API.

- Keep CLI commands thin by calling shared core functions.
- Export only the minimum surface needed internally until API stability is
  intentionally documented.
- Preserve existing CLI behavior while reducing duplicated policy logic.

## Supporting Milestones

### Examples and Fixtures

Goal: show real project shapes without making tests depend on presentation
examples.

- Add `examples/` for human-readable before and after project examples.
- Add `tests/fixtures/` for regression inputs.
- Cover minimal JavaScript projects, documentation-only projects, nested
  repositories, missing command contracts, and host instruction conflicts.
- Add authoring-focused fixtures for empty repositories, README-only projects,
  conflicting public docs, polyglot monorepos, risky domains, malformed skills,
  private-looking secrets, and docs-only repositories.
- Assert that authoring skills do not invent goals, silently merge conflicts,
  overwrite human context, edit README during context authoring, run raw
  commands without intents, copy secrets, broaden bad skills, or create
  unnecessary diffs on a second run.
- Keep examples natural even when test fixtures need edge-case precision.

## Later Candidates

### Skill Packs

Skill packs remain useful, but they should wait until the skill format,
command-contract behavior, and validation boundaries are specified. Packs
should affect mustflow-owned workflow files only, such as `.mustflow/skills`,
`.mustflow/context`, and candidate command intents.

### Host Compatibility Scanner

Host compatibility should be reported without claiming authority over a
specific editor or agent product. A future scanner may detect host-like
instruction sources and explain how they interact with mustflow's
repository-local contract.

### Dashboard

The first dashboard is intentionally narrow: it edits safe preferences only.
Broader panes should stay behind matching contract-engine work so the UI
visualizes and edits existing contracts instead of inventing hidden behavior.

## Non-Goals

- Do not make mustflow an autonomous agent runtime.
- Do not make `mf init` generate application source code.
- Do not make `mf init` generate CI, GitHub, GitLab, `Makefile`, `justfile`, or
  package-manager files by default.
- Do not treat `.mustflow/cache/` or `.mustflow/state/` as versioned project
  truth.
- Do not add broader dashboard, registry, or adapter work ahead of matching
  contract, explanation, and verification foundations.

## Decision Notes

- The default installed project surface should remain small:
  `AGENTS.md`, `.gitignore`, and `.mustflow/**`.
- Public documentation should distinguish this repository's own open source
  operations from files installed into user projects.
- `mf check` should say whether mustflow files are valid.
- `mf doctor` should say what the current root state is.
- `mf explain` should say why an action is allowed, blocked, or warned.
- `mf verify` should say which checks are required for a given reason and run
  only those that the command contract allows.
