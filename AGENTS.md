---
mustflow_doc: agents.root
locale: en
canonical: true
revision: 12
lifecycle: user-editable
authority: binding
---

# AGENTS.md

This file is the primary working agreement an LLM coding agent should read in this repository.  
This repository follows the mustflow agent workflow.  
Details managed by mustflow are under `.mustflow/`.

## Read Order

1. `AGENTS.md`  
2. `.mustflow/docs/agent-workflow.md`  
3. `.mustflow/config/mustflow.toml`  
4. `.mustflow/config/commands.toml`  
5. `.mustflow/config/preferences.toml` (if present)  
6. `.mustflow/skills/INDEX.md`  
7. `.mustflow/context/INDEX.md` — only when the task requires project, product, domain, UI, backend, data, security, or operations context  
8. The matching `.mustflow/context/<name>.md` files — only when selected by the context index  
9. The matching `.mustflow/skills/<name>/SKILL.md`  
10. `REPO_MAP.md` — only when broader repository navigation is needed  
11. Relevant source, test, and documentation files  

## Core Rules

- Do not revert existing user changes.  
- Do not infer commands from package manager files.  
- Run only commands whose `status` is `configured`, `lifecycle` is `oneshot`, and `run_policy` is `agent_allowed`.  
- Prefer `mf run <intent>` for configured oneshot commands.  
- Run `mf run` command intents one at a time. Do not start another `mf run` while a configured intent is still running, especially if the intent declares non-empty `writes` such as `dist/`.  
- Choose the narrowest configured verification intent that covers the risk. Prefer related or fast checks over broad suites when the command contract exposes them. Report missing narrower intents instead of silently defaulting to slow full-suite tests.  
- Do not start development servers, watchers, browser interfaces, interactive prompts, or background processes directly.  
- Do not start autonomous loops, worker processes, persona systems, or long-running harness processes unless explicitly configured by this repository.  
- Follow `[budget]`, `[approval]`, and `[isolation]` settings in `.mustflow/config/mustflow.toml` when a task may run long or affect sensitive state.  
- Use `mf doctor` or `mf doctor --json` for read-only health checks before broad changes.  
- `mf context --json` can help with machine-readable orientation but does not replace the rules or command specifications.  
- Preferences in `.mustflow/config/preferences.toml` have lower priority than direct user instructions and existing project style.  
- When code, templates, schemas, CLI behavior, package metadata, user-visible docs, installation output, or tests change, check `[release.versioning]` in `.mustflow/config/preferences.toml` before the final report.  
  - Change version files only according to those preferences: apply an automatic bump when `auto_bump = true` and `require_user_confirmation = false`.  
  - Otherwise, suggest the bump or ask before editing as configured.  
  - Do not assume the version source is `package.json`; locate the repository-specific version source before suggesting or editing versions.  
- Context files in `.mustflow/context/` explain project direction and domain conventions. Treat them as task-specific context, not as a replacement for code, tests, commands, or user instructions.  
- If `DESIGN.md` exists, read it only for UI, visual design, layout, design-token, or accessibility work. Do not create a `DESIGN.md` if one does not exist.  
- Read the matching skill document when one applies to the task.  
- Before creating or modifying any file, use `.mustflow/skills/INDEX.md` to determine whether one or more skills apply. This skill-selection gate is mandatory even for small or seemingly obvious tasks.
- `mf doctor`, `mf check`, and other health checks do not satisfy the skill-selection gate. They confirm repository health; they do not decide which task procedure applies.
- If a matching skill applies, read the matching `SKILL.md` before editing that scope. If no installed skill matches, state that no matching installed skill was found in the next progress update or final report. If a plausible skill is referenced by the index but is unavailable in the installed profile, report that gap instead of silently continuing.
- If a skill becomes relevant after new evidence (such as a command failure or documentation change), read the matching `SKILL.md` before continuing that part of the work.  
- Skill documents guide procedure. They do not authorize commands outside `.mustflow/config/commands.toml` or override user, host, repository, or safety rules.  
- Do not modify generated files, external dependencies, or secrets files unless explicitly requested.  
- Do not treat root `config/`, `docs/`, or `skills/` directories as mustflow documents.  

## Parent and Child Rule Priority

- The nearest `AGENTS.md` to the edited files defines the more specific rules.  
- If workflow, style, tests, or command rules conflict, follow the child repository’s `AGENTS.md` and `.mustflow/config/commands.toml`.  
- Safety rules for secrets, privacy, destructive commands, and permitted edit paths are cumulative. Follow the stricter rule.  
- When navigating to a nested repository, reread that repository’s `AGENTS.md` and `.mustflow/config/*.toml` before editing.  
- Do not edit outside the selected child repository unless explicitly requested.  

## Host-Specific Instruction Compatibility

Some coding hosts may read additional host-specific instruction files or enforce their own approval, sandbox, checkpoint, and command execution policies.

Treat those host policies as additional safety and execution constraints. They do not replace this repository’s mustflow command contract. When host instructions conflict with mustflow rules:

- Direct user instructions define the task goal unless unsafe.  
- Host safety and approval gates remain binding.  
- Repository work rules come from the nearest `AGENTS.md` and `.mustflow/config/*.toml`.  
- Project verification commands must use configured mustflow intents.  
- Stricter privacy, secret, destructive-command, and Git push rules take precedence.  
- Generated state, summaries, and caches never override current files or user instructions.  

If the effective rule is unclear, stop and report the conflict instead of guessing.  

## Instruction Refresh Checkpoints

- In long sessions, reread mustflow instructions before the first edit, before command execution when the current command intent lacks a fresh command refresh, after context compaction, after changing `AGENTS.md` or `.mustflow/**`, after switching project roots, and before writing the final report.  
- Use the `[refresh]` policy in `.mustflow/config/mustflow.toml` to decide whether a light, command, skill, or full refresh is needed.  
- Do not store conversation turn counts or session activity in project files. Session refresh state belongs in local cache or the host application.  

Detailed workflow, command policy, failure handling, and security rules are in `.mustflow/docs/agent-workflow.md`.
