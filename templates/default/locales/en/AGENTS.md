---
mustflow_doc: agents.root
locale: en
canonical: true
revision: 4
---

# AGENTS.md

This file is the first working agreement an LLM coding agent should read in this repository.
This repository follows the mustflow agent workflow structure.
mustflow-managed details live under `.mustflow/`.

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
- Run only command intents whose `status` is `configured`, `lifecycle` is `oneshot`,
  and `run_policy` is `agent_allowed`.
- Prefer `mf run <intent>` for finite configured commands.
- Do not directly start development servers, watchers, browser interfaces, interactive prompts,
  or background processes.
- Do not start autonomous loops, worker fleets, persona systems, or long-running harnesses unless
  this repository explicitly configures them.
- Follow `[budget]`, `[approval]`, and `[isolation]` in `.mustflow/config/mustflow.toml` when a
  task may run for a long time or affect sensitive state.
- Use `mf doctor` or `mf doctor --json` for a read-only health check before broad changes.
- `mf context --json` may help with machine-readable orientation, but it does not replace the rules
  and command contract.
- Preferences in `.mustflow/config/preferences.toml` are defaults below direct user instructions
  and existing project style.
- Context files in `.mustflow/context/` explain project direction and domain promises. Treat them
  as task-specific context, not as a replacement for code, tests, commands, or user instructions.
- If `DESIGN.md` exists, read it only for UI, visual design, layout, design-token, or accessibility
  work. Do not invent `DESIGN.md` when it is absent.
- Read the matching skill document when one applies to the task.
- Do not modify generated files, external dependencies, or secret files unless explicitly requested.
- Do not treat root `config/`, `docs/`, or `skills/` directories as mustflow documents.

## Parent and Child Rule Priority

- The nearest `AGENTS.md` to the edited files is the more specific rule source.
- If workflow, style, tests, or command rules conflict, prefer the child repository's `AGENTS.md`
  and `.mustflow/config/commands.toml`.
- Safety rules for secrets, privacy, destructive commands, and allowed edit paths are cumulative.
  Follow the stricter rule.
- When entering a nested repository, reread that repository's `AGENTS.md` and
  `.mustflow/config/*.toml` before editing.
- Do not edit outside the selected child repository unless explicitly requested.

## Instruction Refresh Checkpoints

- In long sessions, reread mustflow instructions before the first edit, before command execution,
  after context compaction, after changing `AGENTS.md` or `.mustflow/**`, after switching roots,
  and before the final report.
- Use the `[refresh]` policy in `.mustflow/config/mustflow.toml` to decide whether a light,
  command, skill, or full refresh is needed.
- Do not store turn counters or session activity in project files. Session refresh state belongs
  in local cache or the host application.

Detailed workflow, command policy, failure handling, and security rules are in
`.mustflow/docs/agent-workflow.md`.
