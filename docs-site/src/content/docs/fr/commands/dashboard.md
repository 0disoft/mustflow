---
title: mf dashboard
description: Démarre le tableau de bord local de mustflow.
---

`mf dashboard` démarre un tableau de bord local dans le navigateur pour les préférences mustflow sûres.

La première surface du tableau de bord modifie `.mustflow/config/preferences.toml`. Elle ne prépare pas de fichiers, ne crée pas de commit, ne pousse rien, ne modifie pas les versions et n’exécute pas de command intents.

Les groupes modifiables couvrent les valeurs Git, les suggestions de commit, les rapports, la sélection de vérification, l’écriture des tests, le style de code et les préférences d’impact de version.

## Comportement actuel

```sh
npx mf dashboard
```

Cette commande démarre un serveur HTTP local lié à `127.0.0.1` par défaut, imprime l’URL du tableau de bord et l’ouvre dans le navigateur par défaut.

La page du tableau de bord inclut un sélecteur de langue pour l’anglais, le coréen, le chinois, l’espagnol, le français et l’hindi. La langue choisie est enregistrée dans le navigateur.

Utilisez `--port` pour demander un port précis. Utilisez `--no-open` pour garder le navigateur fermé. Utilisez `--json` lorsqu’un autre outil doit lire l’URL ; le mode JSON n’ouvre pas le navigateur.

```sh
npx mf dashboard --port 4173
npx mf dashboard --no-open
npx mf dashboard --json
```

## Sortie structurée

Avec `--json`, la commande imprime l’URL du tableau de bord, la racine mustflow et le chemin du fichier de préférences avant de garder le serveur local actif.

L’API du tableau de bord utilise un jeton propre à la session et n’accepte que les mises à jour des champs de préférences limités affichés par la page. `git.auto_push` est affiché comme réglage verrouillé.

Quand l’enregistrement d’une préférence réussit, le tableau de bord écrit `.mustflow/config/preferences.toml` et, si `.mustflow/config/manifest.lock.toml` existe, actualise l’entrée de ce fichier avec `last_action = "customized"`. Ainsi `mf check`, `mf status` et `mf update --dry-run` restent alignés avec la ligne de base locale de préférences acceptée.

## Aide et codes de sortie

```sh
npx mf dashboard --help
```

- Code de sortie `0`: le tableau de bord a démarré ou l’aide a été imprimée.
- Code de sortie `1`: le tableau de bord n’a pas pu démarrer ou l’entrée était invalide.
