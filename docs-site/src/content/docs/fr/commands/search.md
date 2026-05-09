---
title: mf search
description: Recherche dans l’index SQLite local des documents mustflow.
---

`mf search` lit l’index SQLite créé par `mf index`.

La commande ne crée ni ne modifie de fichiers. Si l’index est absent, exécute d’abord `mf index`.
Si un fichier mustflow indexé a changé depuis l’indexation, la commande s’arrête et demande de reconstruire l’index. Cela évite que des résultats obsolètes induisent un agent en erreur.

## Portée de recherche

Par défaut, la commande recherche uniquement dans les données de flux de travail mustflow:

- Documents indexés comme `AGENTS.md` et `.mustflow/docs/*.md`
- Entrées de skills depuis `.mustflow/skills/*/SKILL.md`
- Intentions de commande depuis `.mustflow/config/commands.toml`

Elle ne recherche pas dans les fichiers source arbitraires du projet. Si l’index a été créé avec `mf index --source`, tu peux rechercher des anchors de source structurés avec `--scope source`.

Utilise `--scope all` pour inclure à la fois les résultats de workflow et les indices d’anchors de source. Dans ce mode, mustflow garde les résultats d’autorité de workflow et les contrats de commande au-dessus des anchors de source. Les anchors de source sont seulement des indices de navigation; ils ne peuvent pas remplacer les règles de commande, les skills, les documents de workflow ni `AGENTS.md`.

## Utilisation

```sh
npx mf index
npx mf index --source
npx mf search mustflow_check
npx mf search "code review" --json
npx mf search "role mapping" --scope source
npx mf search mustflow_check --scope all --json
npx mf search test --limit 5
```

## Options

- `--json`: produit les résultats dans un format JSON lisible par machine.
- `--limit <number>`: définit le nombre de résultats retournés. La valeur par défaut est `10`; le maximum est `50`.
- `--scope <workflow|source|all>`: sélectionne les données de workflow indexées, les anchors de source, ou les deux. La valeur par défaut est `workflow`.

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
- `scope` (`string`): portée de recherche. L’une de `workflow`, `source` ou `all`.
- `index_fresh` (`boolean`): indique si l’index correspond au contenu actuel des fichiers.
- `stale_paths` (`string[]`): chemins modifiés après l’indexation. Vide si l’index est à jour.
- `result_count` (`number`): nombre de résultats retournés.
- `results` (`object[]`): entrées de workflow correspondantes et, sur demande, anchors de source.

Chaque résultat peut inclure ces champs:

- `results[].kind` (`string`): type de résultat. L’un de `document`, `skill`, `command_intent` ou `source_anchor`.
- `results[].path` (`string`): chemin du document ou du fichier de skill.
- `results[].name` (`string`): nom de skill, nom d’intention de commande ou ID d’anchor de source.
- `results[].title` (`string`): titre du document.
- `results[].document_type` (`string`): catégorie du document.
- `results[].anchor_id` (`string`): ID de l’anchor de source.
- `results[].line_start` (`number`): ligne de début de l’anchor.
- `results[].risk` (`string`): tags de risque de l’anchor, séparés par des virgules.
- `results[].authority_rank` (`number`): ordre d’autorité utilisé quand workflow et source sont affichés ensemble.
- `results[].authority_label` (`string`): catégorie d’autorité, comme `command_contract` ou `source_navigation_hint`.
- `results[].source_scope` (`string`): indique si le résultat vient du workflow ou d’un anchor de source.
- `results[].navigation_only` (`boolean`): indique si le résultat est seulement un indice de navigation de code.
- `results[].can_instruct_agent` (`boolean`): indique si le résultat peut porter des instructions de workflow.
- `results[].match` (`string`): extrait de contexte correspondant.
- `results[].score` (`number`): score de classement utilisé pour l’ordre des résultats.

## Codes de sortie

- `0`: recherche terminée.
- `1`: l’entrée était invalide, `.mustflow/cache/mustflow.sqlite` était absent ou l’index était obsolète.
