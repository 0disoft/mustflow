---
title: mf dashboard
description: Démarre le tableau de bord local de mustflow.
---

`mf dashboard` démarre un tableau de bord local dans le navigateur pour l’état mustflow, les recommandations de vérification, les command intents, les préférences sûres et la revue des documents.

L’onglet d’état affiche l’installation, le verrou de manifeste, le modèle, les fichiers suivis modifiés ou manquants, les commandes exécutables, la dernière exécution et les documents à relire. L’onglet de vérification lit les fichiers modifiés et recommande des command intents `mf run ...` à copier, sans les exécuter. L’onglet des commandes lit `.mustflow/config/commands.toml` et montre quels command intents sont exécutables, nécessitent une demande utilisateur, ne sont pas configurés ou sont bloqués. L’onglet des réglages modifie `.mustflow/config/preferences.toml`. L’onglet de revue des documents lit `.mustflow/review/docs.toml` et peut marquer les entrées existantes comme approuvées, ignorées ou nécessitant une revue humaine. Il ne prépare pas de fichiers, ne crée pas de commit, ne pousse rien, ne modifie pas les versions et n’exécute pas de command intents.

Les groupes modifiables couvrent les valeurs Git, les suggestions de commit, les rapports, la sélection de vérification, l’écriture des tests, le style de code et les préférences d’impact de version.

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
```

## Sortie structurée

Avec `--json`, la commande imprime l’URL du tableau de bord, la racine mustflow et le chemin du fichier de préférences avant de garder le serveur local actif.

L’API du tableau de bord utilise un jeton propre à la session et n’accepte que les mises à jour des champs de préférences et des transitions de revue exposés par la page. `git.auto_push` est affiché comme réglage verrouillé.

Quand l’enregistrement d’une préférence réussit, le tableau de bord écrit `.mustflow/config/preferences.toml` et, si `.mustflow/config/manifest.lock.toml` existe, actualise l’entrée de ce fichier avec `last_action = "customized"`. Ainsi `mf check`, `mf status` et `mf update --dry-run` restent alignés avec la ligne de base locale de préférences acceptée.

Quand une action de revue réussit, le tableau de bord met à jour `.mustflow/review/docs.toml`. Le type de relecteur reste large (`human`, `llm`, `tool` ou `external`) ; l’ID du relecteur et le résumé restent libres.

## Aide et codes de sortie

```sh
npx mf dashboard --help
```

- Code de sortie `0`: le tableau de bord a démarré ou l’aide a été imprimée.
- Code de sortie `1`: le tableau de bord n’a pas pu démarrer ou l’entrée était invalide.
