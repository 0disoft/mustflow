---
title: AGENTS.md
description: Court point d’entrée racine des règles de travail que les agents lisent en premier.
---

`AGENTS.md` est le point d’entrée racine que les agents LLM lisent en premier lorsqu’ils entrent dans un dépôt.

## Où il est utilisé

`mf init` crée ce fichier à la racine du dépôt cible parce que les agents doivent le trouver immédiatement en entrant dans un dépôt.

C’est le point d’entrée du flux de documents mustflow. La politique détaillée appartient à `.mustflow/docs/agent-workflow.md`, les commandes exécutables à `.mustflow/config/commands.toml`, les préférences au niveau du dépôt à `.mustflow/config/preferences.toml`, le contexte de projet propre à une tâche à `.mustflow/context/` et les procédures répétables à `.mustflow/skills/`.

## Rôle

- Démarre le flux de documents mustflow.
- Définit le premier ordre de lecture.
- Conserve uniquement les règles absolues, comme ne pas deviner les commandes, préserver les changements existants et gérer les secrets.
- Renvoie le flux de travail détaillé vers `.mustflow/docs/agent-workflow.md`.
- Fait dépendre l’exécutabilité de l’état des intentions de commande dans `.mustflow/config/commands.toml`.
- Indique que `mf doctor` est une commande de diagnostic en lecture seule à exécuter avant les modifications lorsque c’est nécessaire.
- Indique que `mf context --json` est un index de contexte en lecture seule, pas un remplacement de la lecture des vrais documents.
- Oriente les tâches longues ou sensibles vers `[budget]`, `[approval]` et `[isolation]` dans `mustflow.toml`.

## Ordre de lecture

```text
AGENTS.md
.mustflow/docs/agent-workflow.md
.mustflow/config/mustflow.toml
.mustflow/config/commands.toml
.mustflow/config/preferences.toml  # when present
.mustflow/skills/INDEX.md
.mustflow/context/INDEX.md  # only when task-specific context is needed
.mustflow/context/<name>.md  # only when selected by the context index
.mustflow/skills/<name>/SKILL.md
REPO_MAP.md  # only when broad navigation is needed
```

## Frontmatter

```yaml
mustflow_doc: agents.root
locale: en
canonical: true
revision: 4
```

- `mustflow_doc`: identifiant stable du document dans mustflow.
- `locale`: langue du document.
- `canonical`: indique si ce document est la source canonique.
- `revision`: révision canonique du document.

Le modèle anglais `AGENTS.md` est la source canonique. Les fichiers de modèle localisés utilisent leur propre locale et définissent `canonical: false`.

## Règles de rédaction

`AGENTS.md` reste à la racine du dépôt afin que les agents puissent le découvrir rapidement.

Ne codez pas en dur dans `AGENTS.md` les vraies commandes de test ou de construction, les arborescences du dépôt, les changements récents ni les horodatages générés. Ces détails réduisent la stabilité des entrées et appartiennent à `commands.toml`, `REPO_MAP.md` ou aux fichiers sources pertinents.

Les valeurs par défaut pour la langue, les commentaires, les messages de commit, la documentation, les journaux et le formatage appartiennent à `.mustflow/config/preferences.toml`, pas à de longues explications dans `AGENTS.md`.

Les boucles autonomes, flottes de workers, systèmes de personas et cadres d’exécution longue durée ne doivent pas être démarrés depuis `AGENTS.md`. Si un dépôt veut ces surfaces, il doit les déclarer explicitement dans la configuration mustflow et les documents de support.
