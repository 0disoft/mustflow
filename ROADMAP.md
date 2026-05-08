# mustflow Roadmap

Last reviewed: 2026-05-08

This roadmap records the intended order of work for mustflow. It is a planning
document, not a release promise. The priority is to make mustflow a
repository-local workflow contract engine: a tool that can explain, judge, and
verify the rules that coding agents must follow inside a project.

## Current Priority

Make this repository a strong example of its own workflow contract.

Before adding larger product surfaces, mustflow should reliably run its own
configured command intents, produce useful receipts, and expose enough
structured policy information for future commands to share the same decisions.

## Near-Term Milestones

### M0: Self-Hosted Command Contract

Goal: ensure the mustflow repository itself can use mustflow without bypassing
the command contract.

Status: current repository checks configured.

- [x] Fix `mf run mustflow_check` so configured commands that invoke `mf` work
  reliably on Windows and other supported shells.
- [x] Declare the repository's actual development checks in
  `.mustflow/config/commands.toml` as configured one-shot intents after
  confirming the intended gates.
- [x] Keep direct shell command output lower authority than `mf run` receipts unless
  a manual override is explicitly reported.
- [x] Use this milestone to remove friction before building higher-level verification
  commands.

Note: `test_related`, `lint`, coverage, and test-audit intents remain unset or
manual-only until the repository has narrower gates for those workflows.

### M1: Contract Specification Documents

Goal: make mustflow's core rules inspectable and stable enough to test.

Status: initial versioned specification set added with documentation-site
discovery.

- [x] Add `docs/spec/README.md`.
- [x] Add `docs/spec/instruction-authority-v1.md` for effective rule resolution.
- [x] Add `docs/spec/command-contract-v1.md` for runnable command intent rules.
- [x] Add `docs/spec/verification-receipt-v1.md` for run receipt expectations.
- [x] Add `docs/spec/state-retention-v1.md` for cache, state, and raw-output
  retention boundaries.
- [x] Keep the documents concise, source-linked, and written as testable rules
  rather than broad philosophy.

### M2: JSON Output Schemas

Goal: make automation-facing JSON output safe for external tools to depend on.

Status: initial published schemas added and covered by CLI tests.

- [x] Add `schemas/doctor-report.schema.json`.
- [x] Add `schemas/context-report.schema.json`.
- [x] Add `schemas/run-receipt.schema.json`.
- [x] Add `schemas/commands.schema.json`.
- [x] Validate current `--json` outputs against these schemas in tests.
- [x] Treat schema changes as compatibility-sensitive.

### M2.5: Document Authority Boundaries

Goal: keep mustflow documents from drifting into overlapping or self-authorizing
policy sources before higher-level explanation and verification commands depend
on them.

- Define the canonical role for each mustflow-owned document:
  `AGENTS.md` as a thin but binding contract, `agent-workflow.md` as detailed
  execution policy, `commands.toml` as the command permission ledger,
  `context/INDEX.md` and `skills/INDEX.md` as routers, `PROJECT.md` as
  low-authority project context, `SKILL.md` as repeatable procedure, and
  `REPO_MAP.md` as a generated navigation aid.
- Add path-bound metadata expectations for mustflow-owned Markdown documents,
  using shared fields such as `kind`, `authority`, `stability`, and `revision`
  where useful, while keeping optional root documents such as `README.md`,
  `ROADMAP.md`, and `DESIGN.md` outside mandatory frontmatter rules.
- Decide on a machine-readable Markdown metadata format for mustflow-owned
  documents. Prefer TOML front matter so the CLI can reuse its existing TOML
  parsing path instead of adding a separate YAML dependency.
- Add stable document identity fields for managed Markdown, such as
  `mustflow_doc`, `schema_version`, `template_version`, `doc_id`, `authority`,
  `lifecycle`, and `locale`. Treat `lifecycle = "generated"` separately from
  `lifecycle = "user_editable"` so `mf update` can preserve user edits.
- Keep repeated `INDEX.md` basenames, because the parent directory supplies the
  namespace. Use metadata such as `mustflow_doc = "context_index"` and
  `mustflow_doc = "skills_index"` plus CLI messages that include both logical
  document kind and relative path.
- Add stable section identifiers, such as HTML comments in the form
  `mustflow:section <id>`, so `mf check` can validate localized documents by
  section identity rather than by English heading text.
- Keep Markdown schema validation inside the mustflow CLI package by default.
  User projects should not receive a `schemas/` directory from `mf init` unless
  they explicitly opt into custom or experimental schemas.
- Teach `mf check --strict` to reject authority drift, such as context documents
  declaring contract authority, indexes embedding procedure bodies, skill
  documents overriding command permissions, or generated maps presenting stale
  facts as source truth.
- Define which structural violations are hard errors and which are warnings:
  parse failures, unsupported schema versions, unknown document kinds, authority
  escalation, unsafe paths, missing required sections, duplicate skill IDs, and
  unknown command intent references should fail, while stale generated maps,
  old template versions, optional document absence, or broad wording can warn.
- Keep `AGENTS.md` as a short contract rather than a large policy manual: it
  should retain read order, authority and conflict rules, command-contract
  boundaries, context authority limits, generated-state limits, refresh
  checkpoints, and links to delegated detail documents.
- Clarify that `PROJECT.md` may contain goals, non-goals, domain terms, and
  cautious project-wide context, but must not contain strong execution rules,
  command policy, or file-edit prohibitions that belong in higher-authority
  documents.
- Expand the default `.mustflow/context/PROJECT.md` shape while keeping it
  short and safe to leave incomplete: include current known goal with source and
  last-confirmed fields, non-goals, core promises, public surface,
  compatibility promises, data and security notes, operational constraints,
  domain terms, extra care areas, related context, and staleness checks.
- Treat `Unknown`, `None recorded`, and `Not applicable` as explicit empty
  values, not as permission to infer missing constraints. `mf check` should
  allow these values while flagging stale placeholders, invalid dates, missing
  required headings, and context text that looks like command policy.
- Preserve the split between optional root `PROJECT.md` and
  `.mustflow/context/PROJECT.md`: the root file is human-facing project
  explanation, while the mustflow context file is a low-authority agent
  briefing. `mf update` must not automatically rewrite the root file, and
  `mf doctor` or `mf explain` may warn when the two appear to conflict.
- Extend `context/INDEX.md` routing without turning it into a policy document:
  consider `Do not read when`, `Risk tags`, and simple `Freshness` fields, but
  avoid broad `Required for` rules and per-row conflict policies.
- Extend `skills/INDEX.md` and `SKILL.md` validation around procedure selection:
  skill routes may declare use conditions, exclusion conditions, required
  inputs, expected touched files, risk tags, required context, command intents
  used, failure modes, and evidence to report.
- Move `skills/INDEX.md` toward short structured entries rather than wide
  tables or prose procedures. Track trigger, required inputs, allowed edit
  scope, risk level, verification intents, and expected output, while making it
  explicit that referenced command intents do not grant execution permission.
- Extend the default `SKILL.md` contract with `Preconditions`, `Allowed Edits`,
  and `Postconditions`. Keep `Anti-patterns` and `Examples` optional for
  high-risk or frequently misused skills so the default template does not become
  a maintenance burden.
- Teach `mf check`, `mf doctor`, and future `mf explain` to compare skill
  indexes with skill bodies: missing files, invalid risk values, unknown command
  intents, missing allowed edit scope, high-risk skills without verification or
  failure handling, and mismatched index/body metadata should be visible.
- Make `REPO_MAP.md` clearly generated by recording generation metadata and
  ensuring agents treat it as navigation help only, not as a replacement for
  opening current files.
- Give `REPO_MAP.md` generated-document TOML front matter with relative root,
  generator version, generation time, source policy, privacy mode, anchor count,
  and a source fingerprint. Use allowed values for `source_policy` and
  `privacy_mode`, and avoid absolute local paths in generated metadata.
- Treat `REPO_MAP.md` staleness as a warning in normal `mf check`, while
  allowing stricter modes such as `mf check --strict` or future `mf verify` to
  promote stale fingerprints or anchor-count mismatches when the workflow
  requires a fresh map.
- Add package-scope identity to skills so optional skill packs can coexist:
  `skill_id`, `pack_id`, `skill_version`, `requires_intents`, and `applies_to`
  should belong to each `SKILL.md`, while `skills/INDEX.md` remains a routing
  document rather than the source of skill identity.
- Keep host compatibility adapters subordinate to `AGENTS.md`: optional host
  configuration may describe adapters or shims, but host-specific files should
  delegate to the canonical contract instead of becoming independent contracts.
- Use these boundaries as input to future `mf explain` output so mustflow can
  explain not only what rule applies, but which document was allowed to provide
  that kind of rule.

### M2.6: Core Authoring Skills

Goal: add default skills that help agents maintain mustflow-owned workflow
documents without turning mustflow into a general project-document authoring
tool.

- Add `project-context-authoring` as a core default skill for filling and
  maintaining `.mustflow/context/PROJECT.md`. It should summarize only
  repository-supported facts, preserve existing human-written context, separate
  confirmed facts from assumptions and unknowns, and never invent product
  vision, roadmap, or implementation promises.
- Define the minimum `.mustflow/context/PROJECT.md` authoring surface for this
  skill: project summary, goals, non-goals, domain terms, risk areas and
  invariants, validation, operational constraints, source-of-truth and conflict
  notes, and open questions. Optional sections may cover architecture,
  personas, release, or coding conventions when the repository actually
  provides evidence for them.
- Give `project-context-authoring` a source reading order that starts with the
  existing `.mustflow/context/PROJECT.md`, then `AGENTS.md`,
  `.mustflow/config/*.toml`, optional root `PROJECT.md`, `README.md`,
  `REPO_MAP.md`, package manifests, existing docs, tests, CI, and source files.
  Reading order is for evidence gathering; authority is still resolved by
  document type and current files.
- Require context-authoring output to record conflicts instead of smoothing them
  over. If public docs, manifests, source files, tests, or command contracts
  disagree, record the conflict in source-of-truth notes or open questions and
  keep the affected claim unconfirmed.
- Keep validation language in `.mustflow/context/PROJECT.md` based on command
  intents from `.mustflow/config/commands.toml`. Package scripts, CI commands,
  or manifest hints may be recorded as evidence, but the skill must not convert
  them into raw shell commands or treat them as runnable agent permission.
- Add `skill-authoring` as a core default skill for creating and maintaining
  `.mustflow/skills/*/SKILL.md` and `.mustflow/skills/INDEX.md`. It should make
  narrow, repeatable procedure documents rather than broad advice documents or
  project-domain summaries.
- Define the `skill-authoring` contract: every skill should have a narrow
  purpose, use conditions, exclusion conditions, required inputs, sources to
  read, command intent references, procedure, verification, failure handling,
  output format, and safety rules. Raw shell commands, broad "make the project
  better" scopes, and duplicated project context should be rejected.
- Keep `docs-update` as a synchronization skill rather than a public-docs
  authoring skill. It may update README only when a completed code,
  configuration, CLI, API, or behavior change affects public usage, and it
  should avoid README rebranding, marketing copy, speculative roadmap text,
  badge/style churn, or broad restructuring unless the user explicitly asks.
- Do not include `readme-authoring` as a core default skill. Track it as a
  future optional `docs-authoring` or `oss-docs` skill pack alongside possible
  `contributing-authoring`, `changelog-authoring`, and
  `release-notes-authoring` skills.
- Make all authoring skills non-destructive by default: they must not promote
  internal `.mustflow/context/PROJECT.md` notes into README or root
  `PROJECT.md`, must not copy secrets or private-looking values, and must report
  missing command intents instead of substituting raw commands.

### M2.7: Defensive Skill Pack Candidates

Goal: define skill candidates that interrupt common LLM failure modes at the
moment they usually become expensive.

- Treat defensive skills as guardrails, not as broad instructions to "be
  careful". A useful skill should declare when it activates, what it reads,
  which checks it performs, which command intents or scripts it may reference,
  what output format it uses, and how it reports unverified work.
- Keep always-on repository rules in `AGENTS.md` or
  `.mustflow/docs/agent-workflow.md`. Use skills only for repeatable,
  task-specific procedures that can be activated by the current work.
- Prioritize a first defensive pack after the skill metadata and validation work
  in M2.5 and M2.6:
  `diff-risk-review`, `pattern-scout`, `repro-first-debug`,
  `source-freshness-check`, `contract-sync-check`,
  `artifact-integrity-check`, `dependency-reality-check`, and
  `date-number-audit`.
- Make `diff-risk-review` the first candidate. It should inspect `git` change
  scope through configured or explicitly approved read-only checks, group
  changed files by functional area, classify user-visible behavior, data,
  API-contract, security, authorization, and performance risk, identify the
  minimum relevant verification intents, and report what was not verified.
- Define the expected `diff-risk-review` report shape around changed files,
  high-risk changes, flows that may regress, command intents executed, command
  intents not executed, pre-release checks, and rollback or revert points.
- Use `pattern-scout` before implementation work that may introduce new files,
  helpers, abstractions, components, services, hooks, or tests. It should search
  for existing local patterns before creating a new structure.
- Use `repro-first-debug` when investigating a failure. It should capture the
  reproduction path, expected result, actual result, candidate causes, and
  disconfirming checks before proposing a fix.
- Use `source-freshness-check` when a task depends on information that may have
  changed, such as external APIs, dependency behavior, policies, prices,
  dates, schedules, or current product features. It should separate confirmed
  facts, inferences, and unknowns.
- Use `contract-sync-check` when a change affects a contract surface: API
  schemas, CLI output, configuration keys, database shape, validation rules,
  generated types, fixtures, documentation, or downstream clients.
- Use `artifact-integrity-check` after creating or modifying files such as
  reports, spreadsheets, slide decks, PDFs, generated images, or documentation
  bundles. It should verify that the artifact opens or builds and that core
  content, links, tables, formulas, or page counts are intact.
- Use `dependency-reality-check` before adding or using a dependency, library
  API, external service, or tool option. It should inspect the current lockfile
  or installed version and prefer official documentation over model memory.
- Use `date-number-audit` for schedules, relative dates, time zones, currency,
  percentages, totals, and metric comparisons. It should convert relative dates
  to absolute dates and recalculate numbers with a reliable tool when possible.
- Track a second tier of optional or domain-specific skills:
  `security-privacy-review`, `migration-safety-check`, `ui-quality-gate`,
  `performance-budget-check`, `instruction-conflict-scope-check`, and
  `external-prompt-injection-defense`.
- Keep vague advice out of skill documents. Phrases such as "write good code",
  "consider security", or "think carefully" are not valid skill bodies unless
  they are backed by concrete triggers, required sources, checks, verification
  intents, failure handling, and output requirements.
- Require defensive skills to reference command intents from
  `.mustflow/config/commands.toml` rather than embedding raw package-manager,
  test, build, migration, or deployment commands.
- Add fixtures and checks that prove defensive skills do not expand scope,
  invent facts, mark unrun checks as passed, create unnecessary abstractions, or
  silently choose between conflicting instructions.

### M2.8: Evidence-Based Skill Routing

Goal: make `.mustflow/skills/INDEX.md` a skill-routing contract rather than a
plain list of available procedures.

- Define the central rule for skill selection in both `agent-workflow.md` and
  `skills/INDEX.md`: skills are selected by repository evidence, not by loose
  topic similarity; skills provide procedures, not permissions; command
  execution is authorized only by `.mustflow/config/commands.toml`.
- Add a structured skill registry model for `skills/INDEX.md`. Each entry should
  eventually expose `skill_id`, `path`, `summary`, `activation_signals`,
  `required_when`, `consider_when`, `do_not_use_when`, `recheck_triggers`,
  expected command intents, and validation outputs. Optional fields may include
  `requires_before_edit`, `related_skills`, `conflicts_with`,
  `selection_cost`, and `confidence_rule`.
- Make expected command intent fields explicitly non-authoritative. They
  describe what a skill commonly needs, but do not grant permission to run
  commands outside the configured command contract.
- Prefer a human-readable summary plus a machine-readable contract block for
  each skill route once the Markdown metadata format is settled. The human table
  should help scanning; the structured block should drive `mf check`,
  `mf explain`, and future skill suggestion behavior.
- Define evidence levels for skill selection: strong evidence requires a skill,
  medium evidence asks the agent to consider it, weak evidence is insufficient
  by itself, contrary evidence suppresses selection, and recheck evidence forces
  the agent to reopen the index.
- Treat changed files, likely edit targets, command failures, config or schema
  impact, public behavior changes, security-sensitive files, generated files,
  and needed command intents as concrete evidence. Do not select skills merely
  because a related keyword appears in prose.
- Add a skill selection budget. Ordinary tasks should select the smallest set of
  skills that covers the evidence and validation needs, usually one to three.
  Related skills are candidates, not recursive reads.
- Require mandatory skill rechecks at task start, before the first edit, when a
  task changes from read-only analysis to modification, when a configured
  command fails, when new file categories become relevant, when public behavior
  or generated files change, when `.mustflow/**` or `AGENTS.md` changes, and
  when a needed command intent was not previously considered.
- Make security-sensitive discoveries a stop-and-recheck condition. If secrets,
  credentials, authentication, authorization, encryption, dependency trust, or
  deployment permission files become relevant, the agent should pause related
  edits, re-open the skill index, and read the matching security procedure
  before continuing.
- Require agents to leave a concise skill selection note when skills are used or
  intentionally skipped. The note should list task evidence, selected skills
  with reasons, notable skills not selected, inspected docs, command intents
  needed, and remaining validation gaps.
- Extend individual `SKILL.md` expectations with stable identity, explicit
  `non_authority`, use conditions, non-use conditions, required inputs,
  procedure, command intent needs, validation, recheck triggers, and required
  output. Keep skill bodies short enough that exclusion and validation rules are
  not buried.
- Prefer narrow skills whose validation criteria differ, such as
  `testing.node`, `docs.cli`, `docs.workflow-contract`, `security.secrets`,
  `security.authz`, `config.schema`, `release.changelog`, `generated-files`,
  `database.migration`, and `ci.github-actions`. Avoid broad skills such as
  `quality`, `best-practices`, `repo-workflow`, or `development`.
- Teach `mf check --strict` to validate the skill routing contract before adding
  new command surfaces: registered paths exist, `skill_id` values match,
  required sections exist, `required_when` is paired with `do_not_use_when`,
  `recheck_triggers` are present, referenced command intents exist, related and
  conflicting skills resolve, and skill text does not claim command permission.
- Track later command candidates only after the strict checker has the shared
  model: `mf skills suggest --changed`, `mf skills explain <skill_id>`, or
  `mf explain skill <skill_id>` may report why a skill is required, considered,
  skipped, or blocked.
- Keep the responsibility split clear: `AGENTS.md` starts the workflow,
  `agent-workflow.md` defines the common state machine, `skills/INDEX.md`
  decides what to read, `SKILL.md` defines how to handle a specific situation,
  `commands.toml` decides what can run, and `context/*.md` provides
  low-authority repository background.

### M2.9: Change Classification and Public Surface Contracts

Goal: classify what changed, map affected public surfaces, and derive required
validations without making agents guess from prose.

- Reinforce the command authority boundary in four places: natural-language
  docs, schema or metadata rules, strict checkers, and command execution. A
  `SKILL.md` may mention relevant command intents, but only
  `.mustflow/config/commands.toml` grants execution permission. Absence of
  permission is denial.
- Add strict command-boundary checks before broad skill automation:
  `SKILL.md` files must identify themselves as procedure-only, avoid raw shell
  command examples, reference only existing command intent IDs, and never claim
  permission to run commands. Final run records and reports should keep command
  intent IDs attached to executed checks.
- Codify command-boundary rules with stable check IDs, such as
  `MF-CMD-001` for procedure-only skill metadata, `MF-CMD-002` for no raw shell
  examples in skills, `MF-CMD-003` for known command intent references,
  `MF-CMD-004` for validation rules that reference validation or intent IDs
  rather than shell commands, `MF-CMD-005` for bounded command intent metadata,
  `MF-CMD-006` for run records tied to intent IDs, and `MF-CMD-007` for
  absence-of-permission-means-denial behavior.
- Prefer removing raw command examples from `SKILL.md` entirely. If an example
  is unavoidable, require it to be explicitly non-executable and still state
  that the command must be resolved through `.mustflow/config/commands.toml`
  before execution.
- Move command intent definitions toward structured execution metadata rather
  than broad shell strings. Each runnable intent should declare risk, allowed
  reads and writes where practical, working directory, timeout, fixed command
  parts, allowed extra arguments, and denied tokens. Shell-mode commands should
  remain exceptional and tightly scoped.
- Keep startup reading small. The default read path should stay close to
  `AGENTS.md` plus `.mustflow/skills/INDEX.md`; indexes and compact manifests
  should decide which skills, context files, public-surface maps, and validation
  contracts to load next.
- Extend context routing with small frontmatter or registry metadata before
  adding more default reading. Context documents may declare `read_when`,
  provided information, and approximate token cost, while
  `.mustflow/context/INDEX.md` remains the selector that decides which context
  files are relevant.
- Model README files, documentation-site pages, install templates, generated
  examples, translated docs, and root workflow documents as public surfaces
  instead of treating them as incidental documentation. Changes that affect
  users or agent behavior should update related surfaces or record an explicit
  waiver.
- Introduce a candidate `changes.toml` model that classifies changes such as
  `code_change`, `docs_change`, `config_change`, `behavior_change`, and
  `contract_change` using path rules, diff signals, and agent-confirmed
  evidence. Agents may add change types, but should not remove high-confidence
  classifier labels without a structured waiver.
- Treat `behavior_change` broadly for mustflow. CLI help, options, defaults,
  error messages, generated templates, install output, workflow rules,
  `AGENTS.md`, `SKILL.md`, context loading rules, and command intent behavior
  can all change product behavior because mustflow's product surface is the
  repository-local agent workflow.
- Introduce a candidate `validations.toml` model that separates why validation
  is required from which command can run. The intended chain is
  `change type -> validation requirement -> command intent`, never
  `change type -> raw shell command`.
- Combine required validations by union. If a diff is both a contract change and
  a behavior change, all relevant validation requirements should apply unless a
  waiver explains why a specific requirement is not applicable.
- Connect the existing `[verification.selection]` preferences to the future
  classifier. `risk_based`, `targeted`, and `full` should affect which
  configured validation intents are recommended or required, while
  docs-only, translation-only, and copy-only skip toggles should be honored only
  when the classifier finds no behavior, schema, template, command-contract,
  security, data, or release-output impact.
- Introduce candidate `surfaces.toml` and `artifacts.toml` models to connect
  source paths to user-visible surfaces and related artifacts. For example, a
  CLI command change may point to README sections, docs-site pages, default
  templates, translation files, generated examples, and release notes.
- Let translated documentation follow an update-or-mark-stale policy. When a
  canonical page changes, translations should either be updated or marked stale
  with the canonical source and reason, rather than being silently left behind
  or rewritten with low-confidence translation.
- Add checks for public-surface drift: impacted artifacts should be touched,
  proven unaffected, or waived; generated inventory blocks should match the
  actual template inventory; README and docs-site examples should match current
  CLI behavior and configuration names.
- Track drift-check families explicitly as future validations or commands:
  docs drift, template inventory, translation drift, examples check, and
  contract lint. Template inventory should be able to compare a real temporary
  `mf init` output with documented installed-file lists or generated inventory
  blocks.
- Track future CLI surfaces after the shared model exists: `mf contract-lint`
  for contract integrity, `mf classify --changed` for diff-based change types,
  `mf impact --changed` for affected surfaces and artifacts, and
  `mf verify --from-plan <path>` for comparing selected skills, change types,
  validations, waivers, and run receipts.
- Keep any per-task plan or worklog as ignored local state, not versioned
  project truth. A future plan record may list selected skills, classified
  change types, loaded context, affected public surfaces, required validations,
  considered command intents, and waivers, but current files and command
  receipts remain higher authority.
- Consider a small `policy.toml` model only after the surrounding checks are
  clear. It may centralize authority, loading checkpoints, condition-change
  triggers, validation-union behavior, and waiver requirements, but should not
  become a dumping ground for procedure text or make `mf init` heavy by default.
- Use this model to strengthen future `mf explain`: the tool should be able to
  say why a skill was required, why a validation was required, which public
  surfaces were impacted, and why an artifact update or waiver was accepted.
- Do not add all candidate contract files to the default installed template at
  once. Keep `mf init` thin, introduce the models behind strict checks and this
  repository's own workflow first, then decide which files belong in the default
  surface.

### M2.10: Version Source Discovery and Release Bump Contracts

Goal: make version-impact reporting work across languages and frameworks without
assuming every repository stores versions in the same file.

- Keep `[release.versioning]` as a preference layer, not release permission.
  Agents may report and suggest version impact, but must not edit version files
  without an explicit version-bump or release-preparation request.
- Define a candidate `.mustflow/config/versioning.toml` model for repositories
  that want to declare their version source of truth. It should support
  authoritative version files, derived files, lockfile behavior, template
  manifest versions, documentation examples, tests, release notes, and
  language-specific package metadata.
- Build a version-source discovery routine that can inspect common project
  shapes before `versioning.toml` exists: JavaScript or TypeScript
  `package.json`, Python `pyproject.toml` or package `__version__`, Rust
  `Cargo.toml`, Go release tags plus `go.mod` when relevant, Java or Kotlin
  Maven and Gradle metadata, .NET project files, Ruby gems, PHP Composer, Dart
  `pubspec.yaml`, Swift `Package.swift`, Helm charts, app manifests, and
  mustflow template manifests.
- Add a command candidate such as `mf version-sources` or
  `mf explain versioning` that reports detected version sources, confidence,
  authoritative versus derived files, and unresolved conflicts.
- Teach `mf check --strict` to warn when version-impact preferences are enabled
  but no version source can be detected or declared, and to fail only when a
  declared source path is invalid or conflicts with another authoritative
  source.
- Connect future `mf classify --changed` and `mf impact --changed` output to
  versioning: package metadata, template manifests, release notes, install
  output, generated examples, and tests should be classified as version-related
  surfaces when they change.
- Keep lockfile handling conservative. Lockfiles should be treated as derived
  unless the repository declares that the lockfile is part of release metadata
  or the ecosystem requires it for published version consistency.
- Add fixtures for multi-language repositories, tag-based Go releases,
  package-version plus template-version projects, repositories with duplicated
  version constants, and projects where version strings appear only in docs but
  are not authoritative.
- Ensure future dashboard controls only toggle the preference values or show
  detected sources. A dashboard button must not silently perform a version bump,
  commit, tag, or push.

### M2.11: Local Preferences Dashboard

Goal: provide a small human-facing surface for editing safe mustflow preferences
without turning the dashboard into an autonomous workflow runner.

Status: initial local preferences dashboard implemented.

- [x] Implement `mf dashboard` as a local HTTP server bound to localhost by
  default.
- [x] Show and edit safe fields from `.mustflow/config/preferences.toml`.
- [x] Protect the dashboard API with a per-session token.
- [x] Keep browser launch, staging, commits, pushes, version bumps, and command
  execution out of the dashboard's first version.
- [x] Keep `git.auto_push` visible but locked in the UI.
- [x] Expose verification-selection preferences so users can choose
  risk-based, targeted, or full verification defaults and decide whether
  docs-only, translation-only, or copy-only changes may skip broad tests.
- [ ] Expand dashboard coverage only after the corresponding command-line
  contract exists. Candidate future panes: effective policy explanation,
  configured command intent status, version source discovery, impacted public
  surfaces, template inventory, skill selection diagnostics, and actual
  verification recommendations from changed files.
- [ ] Add an optional `mf dashboard --open` only if the browser-launch behavior
  has an explicit command contract and remains opt-in.

### M3: Core Policy Modules

Goal: move shared decision logic out of command handlers without prematurely
promising a broad public API.

- Create focused internal modules under `src/core/` for authority resolution,
  command classification, configuration loading, receipt handling, and retention
  policy.
- Keep CLI commands thin by calling shared core functions.
- Export only the minimum surface needed internally until API stability is
  intentionally documented.
- Preserve the existing CLI behavior while reducing duplicated policy logic.

### M4: Explain Command

Goal: answer why a command, file, or policy decision is allowed, blocked, or
warned.

- Add `mf explain authority`.
- Add `mf explain command <command>`.
- Add `mf explain retention`.
- Add `mf explain --json`.
- Include the decision, reason, effective action, source files, and whether the
  action counts as mustflow verification.
- Reuse the same core policy modules used by `mf doctor`, `mf context`, and
  `mf run`.

### M5: Verify by Reason

Goal: turn `required_after` metadata in `.mustflow/config/commands.toml` into a
practical verification workflow.

- Add `mf verify --reason <event>`.
- Add `mf verify --json --reason <event>`.
- Resolve matching intents from `required_after`.
- Honor `[verification.selection]` from `.mustflow/config/preferences.toml`
  when choosing between related, broad, or full verification, while still
  reporting skipped checks and never treating preferences as command
  permission.
- Run only configured, one-shot, agent-allowed intents through `mf run`.
- Report unknown, manual-only, missing, and blocked intents as skipped with
  reasons.
- Produce a clear final result such as passed, partial, failed, or blocked.

## Supporting Milestones

### Examples and Fixtures

Goal: show real project shapes without making tests depend on presentation
examples.

- Add `examples/` for human-readable before/after project examples.
- Add `tests/fixtures/` for regression inputs.
- Cover minimal JavaScript projects, documentation-only projects, nested
  repositories, missing command contracts, and host instruction conflicts.
- Add authoring-focused fixtures for empty repositories, README-only projects,
  README plus manifest projects, root `PROJECT.md` coexisting with
  `.mustflow/context/PROJECT.md`, conflicting public docs, polyglot monorepos,
  risky auth or billing domains, missing command intents, malformed skills,
  good existing skills, README delta updates, private-looking secrets, and
  docs-only repositories.
- Assert that authoring skills do not invent goals, silently merge conflicts,
  overwrite existing human context, edit README during context authoring, run or
  record raw shell commands without command intents, copy secrets, broaden bad
  skills, or create unnecessary diffs on a second run.
- Keep examples natural even when test fixtures need edge-case precision.

### Open Source Operations

Goal: make contribution and maintenance expectations explicit for this
repository without changing what `mf init` installs into user projects.

- Add `CONTRIBUTING.md`.
- Add `SECURITY.md`.
- Add `CHANGELOG.md`.
- Expand `.github/` with CI, issue templates, and a pull request template.
- Keep the default installed template thin: no generated CI, no generated
  platform-specific files, and no application source files.

## Later Candidates

### Skill Packs

Skill packs remain useful, but they should wait until the skill format, command
contract behavior, and validation boundaries are specified. Packs should affect
mustflow-owned workflow files only, such as `.mustflow/skills`,
`.mustflow/context`, and candidate command intents.

### Host Compatibility Scanner

Host compatibility should be reported without claiming authority over a specific
editor or agent product. A future scanner may detect host-like instruction
sources and explain how they interact with mustflow's repository-local contract.

### Dashboard

The first `mf dashboard` implementation is intentionally narrow: it edits safe
preferences only. Broader dashboard panes should still stay behind the matching
contract-engine work, because the UI should visualize and edit existing
contracts rather than inventing hidden behavior.

## Non-Goals

- Do not make mustflow an autonomous agent runtime.
- Do not make `mf init` generate application source code.
- Do not make `mf init` generate CI, GitHub, GitLab, `Makefile`, `justfile`, or
  package-manager files by default.
- Do not treat `.mustflow/cache/` or `.mustflow/state/` as versioned project
  truth.
- Do not add broader dashboard, registry, or adapter work ahead of the matching
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
