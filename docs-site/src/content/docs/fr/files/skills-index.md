---
title: .mustflow/skills/INDEX.md
description: Index indiquant aux agents quel document de skill lire pour une tâche.
---

`.mustflow/skills/INDEX.md` aide les agents à choisir le bon document de skill avant de commencer un travail répétable.

## Où il est utilisé

Après avoir lu les règles partagées et le contrat de commande, les agents utilisent cet index lorsque la tâche actuelle correspond à une procédure répétable.

Ce fichier ne doit pas copier de longs corps de skills. Il relie les situations, les chemins de skills et les intentions de commande pertinentes.

## Rôle

- Liste les noms de skills et quand les utiliser.
- Relie les tâches récurrentes comme la revue de code, les mises à jour de documentation, le triage d’échecs et la maintenance des tests.
- Liste les noms d’intentions de commande dont chaque skill peut avoir besoin.
- Permet de supprimer ou de marquer inactifs les skills propres au dépôt qui ne sont pas utilisés.

## Règles de rédaction

Gardez l’index court et facile à parcourir.

Placez les longues procédures dans chaque `SKILL.md`. L’index doit contenir uniquement le nom, l’objectif, la condition de déclenchement et les intentions de commande pertinentes pour chaque skill.

## Colonnes du tableau

- `Situation`: condition de tâche qui doit déclencher le skill.
- `Document`: chemin vers le `SKILL.md` contenant la procédure.
- `Command intents`: noms d’intentions depuis `commands.toml` que le skill peut vérifier.

Lors de l’ajout d’un skill, liez-le ici et gardez les noms d’intentions de commande alignés avec le frontmatter du skill.
