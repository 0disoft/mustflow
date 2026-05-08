---
title: REPO_MAP.md
description: Carte basée sur des fichiers d’ancrage pour les agents qui naviguent dans la racine mustflow actuelle.
---

`REPO_MAP.md` est un fichier généré optionnel à la racine mustflow actuelle.

Ce n’est pas une liste complète de fichiers. Il trouve les fichiers d’ancrage importants comme `AGENTS.md`, les documents Markdown racine, les contrats lisibles par machine, `package.json`, `SKILL.md`, `.mustflow/context/INDEX.md` et les fichiers de configuration propres aux langages, afin que les agents sachent où regarder d’abord dans la racine actuelle.

La racine ne signifie pas nécessairement un seul dépôt Git. Si la racine mustflow actuelle est un espace de travail qui contient des dépôts imbriqués indépendants, le même `REPO_MAP.md` peut inclure des points d’entrée limités pour ces dépôts.

## Où il est utilisé

Les agents le lisent uniquement lorsqu’ils ont besoin d’une navigation large dans la racine mustflow actuelle. Il n’est pas requis pour chaque petit changement.

La navigation de racine appartient à ce fichier généré afin que `AGENTS.md` et `.mustflow/docs/agent-workflow.md` puissent rester courts.

## Rôle

- Résume pourquoi les principaux fichiers et répertoires de la racine actuelle existent.
- Réduit les premiers emplacements qu’un agent doit inspecter.
- Aide les agents à choisir un périmètre de changement sûr.
- Garde `AGENTS.md` court.
- Sépare la navigation du dépôt de la liste complète des fichiers. Utilisez `git ls-files` ou un éditeur lorsque vous avez besoin de chaque fichier.
- Si la racine actuelle est un espace de travail, liste uniquement les points d’entrée des dépôts imbriqués indépendants au lieu de décrire leurs détails internes.

## Composants

- Phrase d’ouverture: indique qu’il s’agit d’une carte de navigation basée sur des fichiers d’ancrage, pas d’une liste complète de fichiers.
- Mode d’utilisation: oriente les agents vers `git ls-files` lorsqu’ils ont besoin de la liste complète.
- Ancres prioritaires: affiche les fichiers à lire en premier, comme `AGENTS.md`, `.mustflow/config/*.toml`, `.mustflow/context/INDEX.md` et `.mustflow/skills/INDEX.md`.
- Ancres de répertoire: regroupe par répertoire les fichiers importants comme `README.md`, `AGENTS.md`, `package.json`, `SKILL.md` et les fichiers de configuration d’outils.
- Dépôts imbriqués: affiche uniquement les points d’entrée comme `AGENTS.md`, `REPO_MAP.md`, les fichiers d’index de contexte et les fichiers de contrat de commande pour les dépôts indépendants découverts sous les racines d’espace de travail.
- Fichiers générés: indique que `REPO_MAP.md` est généré et ne doit pas être modifié à la main.
- Règles d’exclusion: laisse de côté les dépendances, sorties de construction, caches et gros fichiers.

## Règles de génération

- Générez-le avec l’intention de commande `repo_map` ou une commande comme `mf map`.
- Utilisez à la fois `git ls-files` et la découverte d’ancres dans le système de fichiers lorsque c’est possible.
- La profondeur par défaut est 3. Cela ne signifie pas une profondeur complète d’arborescence; cela limite la profondeur de découverte des fichiers d’ancrage non prioritaires.
- Excluez `node_modules`, `dist`, `build`, `.git`, les caches et les grosses sorties.
- Ne résumez pas le contenu des fichiers.
- Ne placez pas de valeurs volatiles comme l’heure générée, les hashes ou les nombres de fichiers en haut.
- Ne listez pas chaque fichier source. Incluez uniquement les fichiers d’ancrage qui aident à la navigation dans le dépôt.
- Incluez comme ancres prioritaires les fichiers de configuration nécessaires à l’interprétation du comportement des agents, comme `.mustflow/config/preferences.toml`.
- Incluez `.mustflow/context/INDEX.md` et `.mustflow/context/PROJECT.md` lorsqu’ils existent, mais n’étendez pas par défaut chaque futur fichier de contexte de domaine.
- Incluez les documents Markdown racine appartenant au projet, comme `README.md`, `PROJECT.md`, `ROADMAP.md`, `DESIGN.md`, `GOVERNANCE.md`, `TESTING.md`, `DEPLOYMENT.md`, `ARCHITECTURE.md` et `API.md`, lorsqu’ils existent comme ancres optionnelles. Ne les créez pas dans le cadre de `mf map`.
- Incluez les contrats lisibles par machine avec un nom précis, comme `project.contract.json`, `project.constants.json`, `design-tokens.json`, `openapi.yaml`, `asyncapi.yaml`, `schema.graphql` et `schema.prisma`, lorsqu’ils existent. Les noms génériques comme `SSOT.json` ne sont pas des ancres par défaut.
- Même lorsque des dépôts imbriqués sont listés, n’incluez pas par défaut les URL distantes, noms de branche, états de changement récents, listes de commandes ni résumés automatiques.

## Règles de rédaction

La première ligne doit indiquer qu’il s’agit d’une carte de navigation pour la racine mustflow actuelle, pas d’une arborescence complète.

```md
# REPO_MAP.md

This file is an anchor-file-based navigation map for the current mustflow root, not a full file listing.
```

Lorsque la structure change, régénérez-le au lieu de le maintenir comme un long document écrit à la main.
