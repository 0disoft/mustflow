---
title: mf index
description: Construit l’index SQLite local des documents mustflow.
---

`mf index` construit un index SQLite régénérable à partir du flux de documents mustflow dans la racine actuelle.

La source de vérité reste les fichiers sur le disque. L’index est un cache qui aide `mf search` et les futures fonctions de carte ou de tableau de bord à lire rapidement les documents mustflow.

Utilisez `--source` pour inclure des ancres structurées de code source. L’indexation source est optionnelle et stocke seulement les métadonnées d’ancre, pas le contenu complet du code.

## Entrées indexées

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- Intentions de commande depuis `.mustflow/config/commands.toml`
- Ancres structurées de code source seulement quand `--source` est fourni

Par défaut, la commande n’indexe pas les fichiers source arbitraires du projet. Elle se limite aux fichiers de flux de travail mustflow. Avec `--source`, elle recherche les commentaires structurés `mf:anchor` et écrit seulement les champs d’ancre comme l’identifiant, le chemin, la ligne, l’objectif, les termes de recherche, l’invariant et le risque.

## Fichier de sortie

```text
.mustflow/cache/mustflow.sqlite
```

Ce fichier est généré. Il peut être supprimé et reconstruit.
L’index stocke les hashes de contenu des fichiers indexés afin que `mf search` puisse détecter les données de cache obsolètes.

## Simulation

```sh
npx mf index --dry-run --json
```

La simulation calcule les cibles de l’index et imprime les décomptes sans écrire le fichier SQLite.

## Ancres source

```sh
npx mf index --source --json
```

L’indexation des ancres source sert seulement à la navigation. Les tables `source_anchors`, `source_anchor_fingerprints` et `source_anchor_status` produites ne peuvent pas définir de règles de workflow, de permission de commande ni d’autorité de vérification.
Les lignes de fingerprint et de statut sont des métadonnées de recherche dérivées qui aident ensuite à expliquer si une ancre pointe toujours vers le code attendu.

## Champs JSON

```sh
npx mf index --json
```

La sortie lisible par machine utilise ces champs:

- `schema_version` (`number`): version du format de sortie.
- `command` (`string`): toujours `index`.
- `ok` (`boolean`): indique si l’indexation a réussi.
- `mustflow_root` (`string`): racine mustflow actuelle.
- `database_path` (`string`): chemin du fichier SQLite cible.
- `dry_run` (`boolean`): indique si l’écriture de fichiers était désactivée.
- `wrote_files` (`boolean`): indique si le fichier SQLite a été écrit.
- `document_count` (`number`): nombre de documents mustflow et fichiers de configuration indexés.
- `skill_count` (`number`): nombre de documents de skill indexés.
- `command_intent_count` (`number`): nombre d’intentions de commande indexées.
- `source_index_enabled` (`boolean`): indique si l’indexation des ancres source a été demandée.
- `source_anchor_count` (`number`): nombre d’ancres structurées de code source indexées.
- `indexed_paths` (`string[]`): chemins inclus dans l’index des documents.

## Codes de sortie

- `0`: les cibles de l’index ont été calculées et éventuellement écrites.
- `1`: la commande a reçu une option inconnue ou l’indexation a échoué.
