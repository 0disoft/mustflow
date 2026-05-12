---
title: Index local
description: Explique comment mustflow utilise SQLite comme index local.
---

mustflow utilise SQLite comme stockage d’index local par défaut.

## Principes

Les fichiers restent toujours la source de vérité.

- `AGENTS.md`
- `.mustflow/config/*.toml`
- `.mustflow/context/*.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/*/SKILL.md`

SQLite sert d’index local secondaire pour accélérer la recherche et l’analyse. Il doit pouvoir être supprimé et reconstruit sans risque.

La base SQLite locale est un cache reconstruisible. Elle ne doit pas être traitée comme source de vérité, stockage de mémoire, journal d’audit ou stockage de transcriptions.

## Emplacement attendu

```text
.mustflow/cache/mustflow.sqlite
```

`mf init` ne crée pas ce fichier immédiatement. L’index est créé lorsque `mf index` s’exécute.
`mf search` lit ce fichier sans modifier les documents sources. De futures fonctionnalités `mf map` et `mf dashboard` pourraient le réutiliser.

Le modèle par défaut déclare cet état ainsi :

```toml
[capabilities]
local_index = "generated_optional"
```

Cela signifie que l’index est une donnée générée optionnelle, pas un document source.

## Données que l’index peut stocker

- Chemins de documents
- Titres et titres de section
- Métadonnées de frontmatter
- Révisions et hashes de documents
- Empreintes de fichiers indexés
- Courts extraits de contenu
- Métadonnées d’intentions de commande
- Références de skills

La commande actuelle `mf index` utilise le mode `metadata_and_snippets`. Elle stocke au plus 2048 octets d’extrait par document, ne stocke pas les corps complets des documents par défaut, et conserve les noms et descriptions d’intentions de commande comme termes dérivés pour que `mf search` puisse encore retrouver le fichier de configuration pertinent.

La table `indexed_files` stocke des empreintes dérivées pour chaque fichier de workflow indexé et pour les fichiers d’ancres source optionnels : chemin, portée source, taille, heure de modification, hash de contenu, heure d’indexation, mode d’index et version du parser. `mf index --incremental` ne réutilise un fichier SQLite existant que lorsque le schéma, la version du parser, les réglages de portée source et les empreintes de fichiers restent compatibles ; sinon il revient à une reconstruction complète.

Les métadonnées de recherche sont aussi écrites dans la table `search_ngrams`. Ces lignes sont de courts fragments de termes dérivés qui aident les recherches multilingues lorsque les espaces ou la tokenisation SQLite sont faibles. Elles pointent vers des documents, skills, routes de skill, intentions de commande et ancres source ; elles ne stockent pas de documents ou de code source complets et ne changent pas l’ordre d’autorité.

Avant une recherche, `mf search` compare les hashes stockés avec les fichiers actuels et renvoie une erreur si le cache est obsolète. Les derniers résultats de vérification et l’analyse des exécutions sont réservés à de futures fonctionnalités.

## Règles d’écriture

Lorsqu’un LLM ou un tableau de bord modifie des documents, la cible d’écriture finale reste Markdown ou TOML.

SQLite fournit des données auxiliaires pour accélérer la recherche, l’affichage et la validation.

Les journaux bruts, la sortie complète du terminal, les transcriptions complètes de discussion, le raisonnement caché, les secrets, les valeurs d’environnement et le contenu de dépôts privés ne sont pas des documents sources pour l’index ni pour une future couche de connaissances. mustflow conserve de petits reçus d’exécution dans le projet et ne stocke pas de journaux bruts par défaut. Cette règle est appliquée par la politique `[retention]` dans `.mustflow/config/mustflow.toml` et par les contrôles de stockage de `mf check --strict`.
