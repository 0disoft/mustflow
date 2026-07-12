---
title: Use mustflow in your repo
description: Install mustflow in a project and verify the workflow without guessing commands.
---

Use this path when you own or maintain a repository and want agents to follow repository-local rules.

## मौजूदा installation update करें

mustflow को install करने वाले package manager से package update करें, फिर repository root में `mf upgrade` चलाएँ। यह केवल safe template plan लागू करता है; packages install नहीं करता और custom workflow files overwrite नहीं करता।

```sh
npm update -D mustflow
npx mf upgrade --dry-run
npx mf upgrade
npx mf check --strict
```

यदि plan local change को block करे, तो आवश्यक template change जानबूझकर merge करें; plan pass कराने के लिए project-owned file न हटाएँ।

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
