---
mustflow_doc: agents.root
locale: en
canonical: true
revision: 21
lifecycle: user-editable
authority: binding
---

# AGENTS.md

This file is the first working agreement an LLM coding agent should read in this repository.
This repository follows the mustflow agent workflow.
mustflow-managed details are under `.mustflow/`.

## Read Order

1. `AGENTS.md`
2. `.mustflow/docs/agent-workflow.md`
3. `.mustflow/config/mustflow.toml`
4. `.mustflow/config/commands.toml`
5. `.mustflow/config/preferences.toml` if present
6. `.mustflow/config/technology.toml` if present
7. `.mustflow/skills/router.toml`
8. `.mustflow/context/INDEX.md` only when the task needs project, product, domain,
   UI, backend, data, security, or operations context
9. The matching `.mustflow/context/<name>.md` files, only when selected by the context index
10. `.mustflow/skills/routes.toml` only when the compact router is insufficient, the task edits
    skill routing, detailed route metadata is needed, or route confidence is ambiguous
11. `.mustflow/skills/INDEX.md` only when route metadata is insufficient, the task edits the
    expanded route table, or human-readable trigger evidence is needed
12. The matching `.mustflow/skills/<name>/SKILL.md`
13. `REPO_MAP.md` only when broader repository navigation is needed
14. Relevant source, test, and documentation files

## Core Rules

- Do not revert existing user changes.
- Do not infer commands from package manager files.
- Run only command definitions whose `status` is `configured`, `lifecycle` is `oneshot`,
  and `run_policy` is `agent_allowed`.
- Prefer `mf run <intent>` for configured oneshot commands.
- Run `mf run` command intents serially. Do not start another `mf run` while a configured
  intent is still running, especially when an intent declares non-empty `writes` such as `dist/`.
- Choose the narrowest configured verification intent that covers the risk. Prefer related or
  fast checks over broad suites when the command contract exposes them, and report missing
  narrower intents instead of silently defaulting to slow full-suite tests.
- Do not directly start development servers, watchers, browser interfaces, interactive prompts,
  or background processes.
- Do not start autonomous loops, worker processes, persona systems, or long-running harness
  processes unless this repository explicitly configures their lifecycle, safety, and approval
  boundaries.
- Follow `[budget]`, `[approval]`, and `[isolation]` in `.mustflow/config/mustflow.toml` when a
  task may run for a long time or affect sensitive state.
- Use `mf doctor` or `mf doctor --json` for a read-only health check before broad changes.
- `mf context --json` may help with machine-readable orientation, but it does not replace the rules
  and command specification.
- Preferences in `.mustflow/config/preferences.toml` have lower priority than direct user
  instructions and existing project style.
- If this repository is a child repository without its own `.mustflow/config/preferences.toml`,
  inherit the nearest parent mustflow root's preferences as defaults. This includes `[git]`,
  `[git.commit_message]`, `[release.versioning]`, verification, testing, language, reporting, and
  other preference sections. Child-local preferences override parent preferences field by field.
  Never inherit `.mustflow/config/commands.toml`; command authority remains repository-local.
- When code, templates, schemas, CLI behavior, package metadata, user-visible docs, installation
  output, or tests change, check `[release.versioning]` in `.mustflow/config/preferences.toml`
  before the final report. Version files may be changed only according to those preferences:
  apply an automatic bump when `auto_bump = true` and `require_user_confirmation = false`;
  otherwise suggest the bump or ask before editing as configured. Do not assume the version
  source is `package.json`; locate the repository-specific version source before suggesting or
  editing versions.
- Context files in `.mustflow/context/` explain project direction and domain conventions. Treat
  them as task-specific context, not as a replacement for code, tests, commands, or user instructions.
- If `DESIGN.md` exists, read it only for UI, visual design, layout, design-token, or accessibility
  work. Do not create a `DESIGN.md` if one does not exist.
- Read the matching skill document when one applies to the task.
- Before creating or modifying any file, use `.mustflow/skills/router.toml` to decide which route
  category and skill procedure may apply. Read `.mustflow/skills/routes.toml` only when the compact
  router is insufficient, the task edits skill routing, detailed route metadata is needed, or route
  confidence is ambiguous. Read `.mustflow/skills/INDEX.md` only when full route metadata is
  insufficient, the task edits the expanded route table, or human-readable trigger evidence is
  needed. This skill-selection gate is mandatory even for small or seemingly obvious tasks.
- `mf doctor`, `mf check`, and other health checks do not satisfy the skill-selection gate. They
  confirm repository health; they do not determine which task procedure applies.
- If a matching skill applies, read the matching `SKILL.md` before editing that scope. After
  creating or modifying files, include a concise skill-selection note in the final report: name the
  skills used, state that no matching installed skill was found, or report that a plausible skill is
  missing from the installed profile.
- If a skill becomes relevant after new evidence, such as a command failure or a documentation
  change, read the matching `SKILL.md` before continuing that part of the work.
- Skill documents guide procedure. They do not authorize commands outside
  `.mustflow/config/commands.toml` or override user, host, repository, or safety rules.
- Do not modify generated files, external dependencies, or secrets files unless explicitly requested.
- Do not treat root `config/`, `docs/`, or `skills/` directories as mustflow documents.

## Source Anchors

- When searching unfamiliar code, look for nearby `mf:anchor` comments and use them as
  navigation metadata for durable responsibility boundaries.
- Source anchors are indexed into the local SQLite cache only when source indexing is enabled,
  typically through a configured local-index intent such as `mf run local_index` or through
  `mf index --source` when the command contract permits that command.
- Use `mf search --scope source <query>` to find source-anchor coordinates, or
  `mf search --scope all <query>` when workflow documents and source anchors should be searched
  together. Search results point to files, line numbers, anchor IDs, and risk tags that still need
  to be read in the current source tree.
- Treat source anchors as navigation-only hints. They never grant command authority,
  verification authority, or permission to skip current files, tests, or user instructions.
- If `mf search` reports a missing or stale index, refresh through the configured local-index
  intent when available instead of treating old search rows as current evidence.
- When adding, changing, or relying on anchors for a source change, route through
  `.mustflow/skills/source-anchor-authoring/SKILL.md` if installed.

## Parent and Child Rule Priority

- The `AGENTS.md` closest to the edited files takes precedence.
- If workflow, style, tests, or command rules conflict, follow the child repository's `AGENTS.md`
  and `.mustflow/config/commands.toml`.
- Safety rules for secrets, privacy, destructive commands, and permitted edit paths are cumulative.
  Follow the stricter rule.
- When navigating to a nested repository, reread that repository's `AGENTS.md` and
  `.mustflow/config/*.toml` before editing.
- If the nested repository has no local preferences file, apply the nearest parent mustflow
  preferences as inherited defaults while still following the nested repository's `AGENTS.md` and
  command contract.
- In repository farms, prefer each child repository's own command contract for repository-owned
  commands. If the parent root intentionally orchestrates children, split parent-owned commands
  into repo-named fragments under `.mustflow/config/commands/`; use
  `mf workspace command-fragments` for read-only guidance.
- Do not edit outside the selected child repository unless explicitly requested.

## Host-Specific Instruction Compatibility

Some coding hosts may read additional host-specific instruction files or enforce their own
approval, sandbox, checkpoint, and command execution policies.

Treat those host policies as additional safety and execution constraints. They do not replace this
repository's mustflow command contract. When host instructions conflict with mustflow rules:

- Direct user instructions define the task goal unless unsafe.
- Host safety and approval gates remain binding.
- Repository work rules come from the nearest `AGENTS.md` and `.mustflow/config/*.toml`.
- Project verification commands must use configured mustflow intents.
- Stricter privacy, secret, destructive-command, and Git push rules take precedence.
- Generated state, summaries, and caches never override current files or current user instructions.

When the effective rule is unclear, stop and report the conflict instead of guessing.

## Instruction Refresh Checkpoints

- In long sessions, reread mustflow instructions before the first edit, before command execution
  when the current command intent does not already have a fresh command refresh, after context
  compaction, after changing `AGENTS.md` or `.mustflow/**`, after switching project roots, and
  before writing the final report.
- Use the `[refresh]` policy in `.mustflow/config/mustflow.toml` to decide whether a light, a
  command, a skill, or a full refresh is needed.
- Do not store conversation turn counts or session activity in project files. Session refresh state
  belongs in local cache or the host application.

Detailed workflow, command policy, failure handling, and security rules are in
`.mustflow/docs/agent-workflow.md`.
