---
title: Index local
description: Explique comment mustflow utilise SQLite comme index local.
---

mustflow utilise SQLite comme stockage d’index local par défaut.

## Principes

Les fichiers sont toujours la source de vérité.

- `AGENTS.md`
- `.mustflow/config/*.toml`
- `.mustflow/context/*.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/*/SKILL.md`

SQLite sert d’index local secondaire pour accélérer la recherche et l’analyse. Il doit pouvoir être supprimé et reconstruit sans risque.

## Emplacement attendu

```text
.mustflow/cache/mustflow.sqlite
```

`mf init` ne crée pas ce fichier immédiatement. L’index est créé lors de l’exécution de `mf index`.
`mf search` lit ce fichier sans modifier les documents sources. De futures fonctionnalités `mf map` et `mf dashboard` pourraient le réutiliser.

Le modèle par défaut définit cet état ainsi:

```toml
[capabilities]
local_index = "generated_optional"
```

Cela signifie que l’index est une donnée générée optionnelle, pas un document source.

## Données que l’index peut stocker

- Chemins de documents
- Titres et sections
- Métadonnées de frontmatter
- Révisions de documents
- Intentions de commande
- Références de skills

La commande actuelle `mf index` indexe les documents mustflow, les fichiers de contexte, les fichiers de configuration, les documents de skills et les intentions de commande. `mf search` interroge uniquement ces données de flux de travail mustflow indexées.
L’index stocke aussi les hashes de contenu. Avant la recherche, `mf search` compare ces hashes avec les fichiers actuels et renvoie une erreur si le cache est obsolète.
Les derniers résultats de vérification et l’analyse des exécutions sont réservés à de futures fonctionnalités.

## Règles d’écriture

Lorsqu’un LLM ou un tableau de bord modifie des documents, la cible d’écriture finale reste Markdown ou TOML.

SQLite fournit des données auxiliaires pour accélérer la recherche, l’affichage et la validation.

Les journaux bruts, les sorties complètes du terminal et les transcriptions complètes de discussion ne sont pas des documents sources pour l’index ni pour une future couche de connaissances. mustflow conserve de petits reçus d’exécution et des documents de résumé dans le projet, et ne stocke pas de journaux bruts par défaut. Cette règle est appliquée par la politique `[retention]` dans `.mustflow/config/mustflow.toml` et par les contrôles de stockage de `mf check --strict`.
