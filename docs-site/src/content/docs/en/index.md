---
title: mustflow
description: Technical documentation for the agent-readable workflow managed by mustflow.
---

mustflow is a repository-local work contract and verification layer for LLM coding agents. It installs a required read order, a command contract, change classification, execution-free verification planning, and command receipts without replacing the host agent's sandbox, approval, checkpoint, model, or tool policies.

## First Flow

```sh
npm install -D mustflow
npx mf init --yes
npx mf check --strict
```

## Keep The Workflow Current

Update mustflow with the package manager that installed it, then run `mf upgrade` from each
mustflow root. `mf upgrade` never installs packages itself: it checks the npm version first and
only applies the bundled project-file update when the manifest plan has no local-change or
manual-review blockers.

```sh
bun update -g --latest
mf upgrade
mf check --strict
```

Use `mf upgrade --dry-run` to inspect the update plan. A customized workflow file is intentionally
blocked rather than overwritten; merge the relevant template change, review it, and refresh the
manifest lock through the repository's declared workflow.

After changing code, templates, schemas, or documentation, inspect the required verification before running commands.

```sh
npx mf classify --changed --write .mustflow/state/change-classification.json
npx mf verify --from-classification .mustflow/state/change-classification.json --plan-only --json
npx mf verify --from-classification .mustflow/state/change-classification.json --json
```

`mf classify` maps changed paths to public surfaces and validation reasons. `mf verify --plan-only --json` joins those reasons to `.mustflow/config/commands.toml` `required_after` metadata without executing commands. Runnable commands still need the declared command contract: configured, one-shot, agent-allowed, closed stdin, timeout, and an explicit command source.

## Contract Pieces

- **Read sequence**: Agents start with `AGENTS.md`, then read the configured workflow files in order.
- **Command contracts**: `commands.toml` is the only source of runnable command authority.
- **Change acceptance**: `classify` and `verify --plan-only` explain why a check is needed before execution.
- **Receipts**: `mf run` and executable `mf verify` flows write the latest command receipt under `.mustflow/state/`.
- **Navigation hints**: `REPO_MAP.md`, SQLite search rows, and source anchors help agents find files, but do not grant permission, skip validation, or override workflow rules.
- **Dashboard**: The dashboard is for inspection, copying, and explanation. It does not run commands, apply fixes, start agents, merge branches, push changes, or update files automatically.

## Default Structure

```text
AGENTS.md
REPO_MAP.md  # optional generated file
.mustflow/
├─ config/
│  ├─ commands.toml
│  ├─ mustflow.toml
│  ├─ preferences.toml
│  └─ manifest.lock.toml  # generated after successful init
├─ context/
│  ├─ INDEX.md
│  └─ PROJECT.md
├─ docs/
│  └─ agent-workflow.md
├─ skills/
│  ├─ router.toml
│  ├─ routes.toml
│  ├─ INDEX.md
│  └─ */SKILL.md
└─ state/  # generated during use
   └─ runs/
      ├─ run-*/receipt.json
      ├─ latest.index.json
      └─ latest.json
```

`mf init` does not modify `README.md`, `.github/`, or root-level directories such as `docs/`, `skills/`, and `src/`.
`REPO_MAP.md` is dynamically generated from the repository structure rather than being copied from a static template.
`manifest.lock.toml` is generated upon initialization to record the exact installation state.
`.mustflow/state/runs/latest.json` serves as the most recent execution pointer, each `run-*` directory keeps that run's saved receipt, and `latest.index.json` summarizes recent retained `run-*` and `verify-*` directories.

## Mandatory Read Sequence

1. **`AGENTS.md`**: Core mandatory rules and entry point.
2. **`.mustflow/docs/agent-workflow.md`**: Detailed common operating policies.
3. **`.mustflow/config/mustflow.toml`**: Authoritative document paths and boundaries.
4. **`.mustflow/config/commands.toml`**: Executable command intent contracts.
5. **`.mustflow/config/preferences.toml`**: Repository-level defaults (if present).
6. **`.mustflow/config/technology.toml`**: Low-authority technology preferences (if present).
7. **`.mustflow/skills/router.toml`**: Stable compact skill-routing kernel for repeatable tasks.
8. **`.mustflow/context/INDEX.md`**: Task-specific project context routing, read only when the task needs it.
9. **`.mustflow/context/<name>.md`**: Matching context files, read only when selected by the context index.
10. **`.mustflow/skills/routes.toml`**: Full route metadata, read only when the compact router is insufficient.
11. **`.mustflow/skills/INDEX.md`**: Expanded skill route table, read only when route metadata is insufficient or human-readable trigger evidence is needed.
12. **`.mustflow/skills/<name>/SKILL.md`**: Matching task procedures, read before editing that scope.
13. **`REPO_MAP.md`**: Broad repository navigation, read only when needed.
14. **Relevant source, test, and documentation files**: Current evidence for the task.

This site serves as reference documentation and is not installed into user projects via `mf init`.
