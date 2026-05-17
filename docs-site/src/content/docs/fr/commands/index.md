---
title: mf index
description: Construit l’index SQLite local des documents mustflow.
---

`mf index` construit un index SQLite régénérable à partir du flux de documents mustflow dans la racine actuelle.

La source de vérité reste les fichiers sur le disque. L’index est un cache qui aide `mf search` et les futures fonctions de carte ou de tableau de bord à lire rapidement les documents mustflow.

Utilisez `--source` pour inclure des ancres structurées de code source. L’indexation source reste optionnelle sauf si `.mustflow/config/index.toml` l’active explicitement, et stocke seulement les métadonnées d’ancre, pas le contenu complet du code.

## Entrées indexées

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- Intentions de commande depuis `.mustflow/config/commands.toml`
- Ancres structurées de code source seulement quand `--source` est fourni ou quand `.mustflow/config/index.toml` les active

Par défaut, la commande n’indexe pas les fichiers source arbitraires du projet. Elle se limite aux fichiers de flux de travail mustflow. Avec `--source` ou un réglage source explicite, elle recherche les commentaires structurés `mf:anchor` et écrit seulement les champs d’ancre comme l’identifiant, le chemin, la ligne, l’objectif, les termes de recherche, l’invariant et le risque.

## Fichier de sortie

```text
.mustflow/cache/mustflow.sqlite
```

Ce fichier est généré. Il peut être supprimé et reconstruit.
L’index stocke les hashes de contenu des fichiers indexés afin que `mf search` puisse détecter les données de cache obsolètes.
Il écrit aussi une table `indexed_files` avec le chemin, la portée source, la taille, l’heure de modification, le hash de contenu, l’heure d’indexation, le mode d’index et la version du parser pour décider si une exécution incrémentale peut réutiliser le cache existant en sécurité.

Quand le runtime SQLite inclus prend en charge FTS5, `mf index` écrit des tables dérivées de recherche textuelle pour accélérer les correspondances de tokens. Si FTS5 n’est pas disponible, il conserve les mêmes tables de base et `mf search` utilise un scan borné. Les deux chemins écrivent aussi de courtes lignes n-gram pour les métadonnées recherchables, afin que les requêtes multilingues puissent correspondre malgré des différences d’espaces ou de tokenisation.

## Simulation

```sh
npx mf index --dry-run --json
```

La simulation calcule les cibles de l’index et imprime les décomptes sans écrire le fichier SQLite.

## Mode incrémental

```sh
npx mf index --incremental --json
```

Par défaut, `mf index` reconstruit tout l’index. Le mode incrémental vérifie d’abord le fichier `.mustflow/cache/mustflow.sqlite` existant. Si la version de schéma, la version du parser, les réglages de portée source et les empreintes des fichiers indexés restent compatibles, il réutilise le fichier SQLite sans le réécrire. Si un fichier de workflow indexé a changé, a été supprimé ou a été ajouté, ou si la portée des ancres source a changé, mustflow revient à une reconstruction complète.

## Ancres source

```sh
npx mf index --source --json
```

L’indexation des ancres source sert seulement à la navigation. Les tables `source_anchors`, `source_anchor_fingerprints` et `source_anchor_status` produites ne peuvent pas définir de règles de workflow, de permission de commande ni d’autorité de vérification.
Les lignes de fingerprint et de statut sont des métadonnées de recherche dérivées qui aident ensuite à expliquer si une ancre pointe toujours vers le code attendu.
Quand une fonction, classe, méthode ou constante proche peut être détectée, la table de fingerprint stocke aussi des métadonnées de symbole dérivées, comme le type, le nom, le hash de signature et le hash de corps.

## Configuration du scan source

`.mustflow/config/index.toml` peut réduire le scan des ancres source sans changer la politique de workflow ni l’autorité de commande.

```toml
[source_index]
enabled_by_default = false
include = ["src/**/*.ts", "packages/*/src/**/*.ts"]
exclude = ["**/*.generated.ts", "**/__fixtures__/**"]
max_file_bytes = 262144
allowed_extensions = [".ts", ".tsx", ".js", ".py", ".rs", ".go"]
```

`enabled_by_default = true` permet à `mf index` d’inclure les ancres source sans `--source`. Les motifs d’inclusion et d’exclusion ne font que borner le scan. Les chemins générés, de dépendances et de vendor restent exclus de l’index source local même s’ils correspondent à un motif d’inclusion.

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
- `index_mode` (`string`): `full` pour la reconstruction par défaut, ou `incremental` quand `--incremental` a été demandé.
- `reused_existing` (`boolean`): indique si le mode incrémental a réutilisé le fichier SQLite existant.
- `rebuild_reason` (`string | null`): raison pour laquelle le mode incrémental a reconstruit au lieu de réutiliser le fichier existant.
- `document_count` (`number`): nombre de documents mustflow et fichiers de configuration indexés.
- `skill_count` (`number`): nombre de documents de skill indexés.
- `skill_route_count` (`number`): nombre de lignes de routes de skill indexées depuis `.mustflow/skills/INDEX.md`.
- `command_intent_count` (`number`): nombre d’intentions de commande indexées.
- `command_effect_count` (`number`): nombre de lignes d’effets de commande dérivées de `effects` ou `writes`.
- `source_index_enabled` (`boolean`): indique si l’indexation des ancres source a été activée par `--source` ou par la configuration locale de l’index.
- `source_anchor_count` (`number`): nombre d’ancres structurées de code source indexées.
- `search_backend` (`string`): backend de recherche choisi pour cet index. L’un de `fts5` ou `table_scan`.
- `search_fts5_available` (`boolean`): indique si le runtime SQLite a signalé le support FTS5 pendant la construction de l’index.
- `content_mode` (`string`): politique de contenu stocké. Actuellement `metadata_and_snippets`.
- `store_full_content` (`boolean`): toujours `false` pour le modèle de lecture de l’index local.
- `max_snippet_bytes_per_document` (`number`): taille maximale, en octets, de l’extrait stocké par document.
- `excluded_raw_data_kinds` (`string[]`): catégories de données brutes que l’index SQLite ne doit pas stocker.
- `indexed_file_count` (`number`): nombre d’empreintes de fichiers enregistrées dans `indexed_files`.
- `indexed_paths` (`string[]`): chemins inclus dans l’index des documents.

## Codes de sortie

- `0`: les cibles de l’index ont été calculées et éventuellement écrites.
- `1`: la commande a reçu une option inconnue ou l’indexation a échoué.
