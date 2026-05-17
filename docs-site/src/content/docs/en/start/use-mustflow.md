---
title: Use mustflow in your repo
description: Install mustflow in a project and verify the workflow without guessing commands.
---

Use this path when you own or maintain a repository and want agents to follow repository-local rules.

## Install

```sh
npm install -D mustflow
npx mf init --yes
npx mf check --strict
```

`mf init` installs `AGENTS.md` and `.mustflow/**`. It does not create application source code, CI files, or project-owned root docs.

## First Change

```sh
npx mf classify --changed --write .mustflow/state/change-classification.json
npx mf verify --from-classification .mustflow/state/change-classification.json --plan-only --json
npx mf verify --from-classification .mustflow/state/change-classification.json --json
```

Command execution authority comes only from `.mustflow/config/commands.toml`. Skills, context files, generated maps, search results, cache, and state files can guide or explain work, but they do not grant command permission.

## Next Files

- Read `AGENTS.md` for the repository-local rules agents see first.
- Configure runnable intents in `.mustflow/config/commands.toml`.
- Use `mf doctor` when you need a read-only health check.
- Review `examples/minimal-js/` for the smallest project shape.
