---
title: mf search
description: Recherche dans l’index SQLite local des documents mustflow.
---

`mf search` lit l’index SQLite créé par `mf index`.

La commande ne crée ni ne modifie de fichiers. Si l’index est absent, exécute d’abord `mf index`.
Si un fichier mustflow indexé a changé depuis l’indexation, la commande s’arrête et demande de reconstruire l’index. Cela évite que des résultats obsolètes induisent un agent en erreur.

## Portée de recherche

La commande recherche uniquement dans les données de flux de travail mustflow:

- Documents indexés comme `AGENTS.md` et `.mustflow/docs/*.md`
- Entrées de skills depuis `.mustflow/skills/*/SKILL.md`
- Intentions de commande depuis `.mustflow/config/commands.toml`

Elle ne recherche pas dans les fichiers source arbitraires du projet.

## Utilisation

```sh
npx mf index
npx mf search mustflow_check
npx mf search "code review" --json
npx mf search test --limit 5
```

## Options

- `--json`: produit les résultats dans un format JSON lisible par machine.
- `--limit <number>`: définit le nombre de résultats retournés. La valeur par défaut est `10`; le maximum est `50`.

## Champs JSON

```sh
npx mf search mustflow_check --json
```

La sortie lisible par machine utilise ces champs:

- `schema_version` (`number`): version du format de sortie.
- `command` (`string`): toujours `search`.
- `ok` (`boolean`): indique si la recherche a réussi.
- `mustflow_root` (`string`): racine mustflow actuelle.
- `database_path` (`string`): fichier SQLite utilisé pour la requête.
- `query` (`string`): requête de recherche normalisée.
- `limit` (`number`): limite de résultats.
- `index_fresh` (`boolean`): indique si l’index correspond au contenu actuel des fichiers.
- `stale_paths` (`string[]`): chemins modifiés après l’indexation. Vide si l’index est à jour.
- `result_count` (`number`): nombre de résultats retournés.
- `results` (`object[]`): documents, skills et intentions de commande correspondants.

Chaque résultat peut inclure ces champs:

- `results[].kind` (`string`): type de résultat. L’un de `document`, `skill` ou `command_intent`.
- `results[].path` (`string`): chemin du document ou du fichier de skill.
- `results[].name` (`string`): nom de skill ou nom d’intention de commande.
- `results[].title` (`string`): titre du document.
- `results[].document_type` (`string`): catégorie du document.
- `results[].match` (`string`): extrait de contexte correspondant.
- `results[].score` (`number`): score de classement utilisé pour l’ordre des résultats.

## Codes de sortie

- `0`: recherche terminée.
- `1`: l’entrée était invalide, `.mustflow/cache/mustflow.sqlite` était absent ou l’index était obsolète.
