---
title: .mustflow/context/INDEX.md
description: Oriente les agents vers les fichiers de contexte propres à une tâche.
---

`.mustflow/context/INDEX.md` indique aux agents quels fichiers de contexte du projet sont pertinents pour la tâche actuelle.

## Où il est utilisé

- Aide les agents à éviter de lire tous les fichiers de contexte par défaut.
- Sépare l’orientation du projet du routeur court `AGENTS.md`.
- Pointe vers des ancres externes optionnelles comme `README.md` et `DESIGN.md` sans en faire des fichiers appartenant à mustflow.

## Champs

Le frontmatter identifie le fichier comme document de contexte mustflow:

- `kind: mustflow-context`
- `name: context-index`
- `authority: contextual`
- `stability`: degré de stabilité attendu du contenu.
- `review_status`: indique si une personne a examiné le contexte.

## Tableau

Le tableau principal associe chaque nom de contexte à une condition d’utilisation et à un chemin.

Le modèle par défaut liste uniquement `.mustflow/context/PROJECT.md`.
Les fichiers propres à un domaine, comme les contextes frontend, backend, API, données, sécurité ou opérations, ne sont pas créés par défaut.

## Ancres externes

`README.md` est une vue d’ensemble destinée aux personnes. Les agents peuvent l’utiliser comme contexte, pas comme politique.

`DESIGN.md` n’est pas créé par mustflow. S’il existe, les agents peuvent le lire pour les travaux d’interface utilisateur, de design visuel, de mise en page, de jetons de design ou d’accessibilité.
