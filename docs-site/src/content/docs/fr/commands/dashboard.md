---
title: mf dashboard
description: Démarre le tableau de bord local de mustflow.
---

`mf dashboard` démarre un tableau de bord local dans le navigateur pour l’état mustflow, les recommandations de vérification, les command intents, les explications d’effets de commande, les préférences sûres et la revue des documents.

L’onglet d’état affiche l’installation, le verrou de manifeste, le modèle, les fichiers suivis modifiés ou manquants, les commandes exécutables, la dernière exécution et les documents à relire. L’onglet de vérification lit les fichiers modifiés et recommande des command intents `mf run ...` à copier, sans les exécuter. L’onglet des commandes lit `.mustflow/config/commands.toml` ; si l’index local est à jour, il affiche aussi les verrous partagés et les conflits déduits du graphe SQLite des effets de commande. `commands.toml` reste la seule source d’autorité pour les commandes et le tableau de bord n’exécute pas d’intents. L’onglet des réglages modifie `.mustflow/config/preferences.toml`. L’onglet de revue des documents lit `.mustflow/review/docs.toml` et peut marquer les entrées existantes comme approuvées, ignorées ou nécessitant une revue humaine. Il ne prépare pas de fichiers, ne crée pas de commit, ne pousse rien, ne modifie pas les versions et n’exécute pas de command intents.

L’onglet des commandes est en lecture seule. Il affiche l’état, le cycle de vie, la règle d’exécution, l’entrée standard, le délai, le dossier de travail, les chemins écrits et le motif de blocage déclaré. Quand `.mustflow/cache/mustflow.sqlite` existe et est à jour, il affiche aussi les verrous d’écriture dérivés de chaque intent et les autres intents qui partagent un verrou conflictuel. Si l’index est absent ou obsolète, il affiche une indication de reconstruction au lieu de détails obsolètes.

Les groupes modifiables couvrent les valeurs Git, les suggestions de commit, les rapports, la sélection de vérification, l’écriture des tests, les seuils et limites de candidats de refactorisation, le style de code et les préférences d’impact de version.

## Comportement actuel

```sh
npx mf dashboard
```

Cette commande démarre un serveur HTTP local lié à `127.0.0.1` par défaut, imprime l’URL du tableau de bord et l’ouvre dans le navigateur par défaut.

La page du tableau de bord inclut un sélecteur de langue pour l’anglais, le coréen, le chinois, l’espagnol, le français et l’hindi. La langue choisie est enregistrée dans le navigateur.

L’onglet de revue des documents affiche les entrées actives par défaut. Les entrées approuvées ou ignorées ne sont affichées que lorsque le filtre de statut les demande.

Utilisez `--port` pour demander un port précis. Utilisez `--no-open` pour garder le navigateur fermé. Utilisez `--json` lorsqu’un autre outil doit lire l’URL ; le mode JSON n’ouvre pas le navigateur.

```sh
npx mf dashboard --port 4173
npx mf dashboard --no-open
npx mf dashboard --json
npx mf dashboard --export .mustflow/state/artifacts/dashboard.html
npx mf dashboard --export-json .mustflow/state/artifacts/dashboard.json
```

Utilisez `--export <path>` pour écrire un instantané HTML statique du tableau de bord sans démarrer le serveur local. Utilisez `--export-json <path>` pour écrire le même instantané borné au format JSON structuré. Les chemins d’export doivent rester dans la racine mustflow courante. Les fichiers exportés ne contiennent pas le jeton de session du tableau de bord, les appels API, les contrôles d’enregistrement des préférences, les contrôles de mutation de revue documentaire, les queues de sortie brute des commandes, ni les hypothèses de serveur actif.

## Sortie structurée

Avec `--json`, la commande imprime l’URL du tableau de bord, la racine mustflow et le chemin du fichier de préférences avant de garder le serveur local actif.

Avec `--export-json`, la commande écrit un fichier JSON au lieu d’imprimer l’URL du serveur. Le JSON contient les instantanés d’état, de vérification, de commandes, de mise à jour, de skills, de revue documentaire et de préférences ; il omet la sortie brute des exécutions et enregistre les champs tronqués sous `limits`.

L’API du tableau de bord utilise un jeton propre à la session et n’accepte que les mises à jour des champs de préférences et des transitions de revue exposés par la page. `git.auto_push` est affiché comme réglage verrouillé.

Quand l’enregistrement d’une préférence réussit, le tableau de bord écrit `.mustflow/config/preferences.toml` et, si `.mustflow/config/manifest.lock.toml` existe, actualise l’entrée de ce fichier avec `last_action = "customized"`. Ainsi `mf check`, `mf status` et `mf update --dry-run` restent alignés avec la ligne de base locale de préférences acceptée.

Quand une action de revue réussit, le tableau de bord met à jour `.mustflow/review/docs.toml`. Le type de relecteur reste large (`human`, `llm`, `tool` ou `external`) ; l’ID du relecteur et le résumé restent libres.

## Aide et codes de sortie

```sh
npx mf dashboard --help
```

- Code de sortie `0`: le tableau de bord a démarré ou l’aide a été imprimée.
- Code de sortie `1`: le tableau de bord n’a pas pu démarrer ou l’entrée était invalide.
