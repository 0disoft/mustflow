---
title: Use mustflow in your repo
description: Install mustflow in a project and verify the workflow without guessing commands.
---

Use this path when you own or maintain a repository and want agents to follow repository-local rules.

## Mettre à jour une installation

Mettez à jour le paquet avec le gestionnaire qui a installé mustflow, puis lancez `mf upgrade` depuis la racine du dépôt. Il applique seulement un plan de modèle sûr: il n'installe pas de paquet et n'écrase pas les fichiers de workflow personnalisés.

```sh
npm update -D mustflow
npx mf upgrade --dry-run
npx mf upgrade
npx mf check --strict
```

Si le plan bloque un changement local, fusionnez volontairement le changement de modèle utile au lieu de supprimer le fichier du projet.

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
