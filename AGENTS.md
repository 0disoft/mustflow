---
mustflow_doc: agents.root
locale: en
canonical: true
revision: 11
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
6. `.mustflow/skills/INDEX.md`
7. `.mustflow/context/INDEX.md` only when the task needs project, product, domain,
   UI, backend, data, security, or operations context
8. The matching `.mustflow/context/<name>.md` files, only when selected by the context index
9. The matching `.mustflow/skills/<name>/SKILL.md`
10. `REPO_MAP.md` only when broader repository navigation is needed
11. Relevant source, test, and documentation files

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
  narrower intents instead of defaulting silently to slow full-suite tests.
- Do not directly start development servers, watchers, browser interfaces, interactive prompts,
  or background processes.
- Do not start autonomous loops, worker processes, persona systems, or long-running harness
  processes unless this repository explicitly configures them.
- Follow `[budget]`, `[approval]`, and `[isolation]` in `.mustflow/config/mustflow.toml` when a
  task may run for a long time or affect sensitive state.
- Use `mf doctor` or `mf doctor --json` for a read-only health check before broad changes.
- `mf context --json` may help with machine-readable orientation, but it does not replace the rules
  and command specification.
- Preferences in `.mustflow/config/preferences.toml` have lower priority than direct user
  instructions and existing project style.
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
- Before editing, use `.mustflow/skills/INDEX.md` to decide whether one or more skills apply.
- If a skill becomes relevant after new evidence, such as a command failure or a documentation
  change, read the matching `SKILL.md` before continuing that part of the work.
- Skill documents guide procedure. They do not authorize commands outside
  `.mustflow/config/commands.toml` or override user, host, repository, or safety rules.
- Do not modify generated files, external dependencies, or secrets files unless explicitly requested.
- Do not treat root `config/`, `docs/`, or `skills/` directories as mustflow documents.

## Parent and Child Rule Priority

- The nearest `AGENTS.md` to the edited files is the more specific rule.
- If workflow, style, tests, or command rules conflict, follow the child repository's `AGENTS.md`
  and `.mustflow/config/commands.toml`.
- Safety rules for secrets, privacy, destructive commands, and permitted edit paths are cumulative.
  Follow the stricter rule.
- When navigating to a nested repository, reread that repository's `AGENTS.md` and
  `.mustflow/config/*.toml` before editing.
- Do not edit outside the selected child repository unless explicitly requested.

## Host-Specific Instruction Compatibility

Some coding hosts may read additional host-specific instruction files or enforce their own
approval, sandbox, checkpoint, and command execution policies.

Treat those host policies as additive safety and execution constraints. They do not replace this
repository's mustflow command contract. When host instructions conflict with mustflow rules:

- Direct user instructions define the task goal unless unsafe.
- Host safety and approval gates remain binding.
- Repository work rules come from the nearest `AGENTS.md` and `.mustflow/config/*.toml`.
- Project verification commands must use configured mustflow intents.
- Stricter privacy, secret, destructive-command, and Git push rules win.
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
