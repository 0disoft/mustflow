---
title: mf workspace
description: Inspection en lecture seule des racines workspace configurées et des contrats de dépôts imbriqués.
---

`mf workspace status` inspecte les racines workspace configurées et les dépôts imbriqués découverts.
`mf workspace command-catalog` agrège la disponibilité des intents de commande de chaque dépôt découvert.
`mf workspace verify --changed --plan-only` agrège le plan de vérification des changements de chaque dépôt découvert.

Il n'exécute pas de commandes, ne modifie pas les fichiers, n'expose pas de chaînes de commande brutes et ne permet pas à un dépôt parent d'accorder une autorité de commande à un dépôt enfant. Chaque dépôt découvert conserve son propre `.mustflow/config/commands.toml` comme unique source d'autorité de commande.

## Exemple

```sh
npx mf workspace status
npx mf workspace status --json
npx mf workspace command-catalog --json
npx mf workspace verify --changed --plan-only --json
```

## Champs JSON

```sh
npx mf workspace status --json
```

- `schema_version` (`string`) : version du format de sortie.
- `command` (`string`) : toujours `workspace status`.
- `workspace` (`object`) : paramètres de scan workspace depuis `.mustflow/config/mustflow.toml`.
- `policy` (`object`) : indique que le rapport est en lecture seule et n'accorde aucune autorité de commande.
- `repositories` (`object[]`) : dépôts git imbriqués découverts et état de leur contrat mustflow local.
- `issues` (`string[]`) : problèmes de découverte ou d'analyse en lecture seule.

Pour `mf workspace command-catalog --json`, `command` vaut toujours `workspace command-catalog`, et chaque dépôt inclut la disponibilité des intents, les points d'entrée `mf run <intent>` et le chemin du dépôt où cette commande doit être exécutée.

Pour `mf workspace verify --changed --plan-only --json`, `command` vaut toujours `workspace verify`, et chaque dépôt inclut les fichiers modifiés, les intents sélectionnés, les écarts et le chemin du dépôt où les commandes `mf run <intent>` sélectionnées doivent être exécutées.

## Aide et codes de sortie

```sh
npx mf workspace --help
```

- Code de sortie `0` : l'état du workspace a été inspecté.
- Code de sortie `1` : la commande a reçu une entrée invalide.
