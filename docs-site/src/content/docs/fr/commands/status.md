---
title: mf status
description: Commande en lecture seule qui affiche l’état local d’installation de mustflow.
---

`mf status` vérifie si le flux de documents mustflow est installé dans la racine actuelle et signale les fichiers modifiés ou manquants à partir du verrou de manifeste.

Cette commande ne modifie pas les fichiers. Utilisez `mf check` pour les barrières d’automatisation, et `mf status` lorsqu’une personne veut un résumé local rapide.
Utilisez `--json` lorsqu’une automatisation ou un agent doit lire le résultat.

## Sortie

- `Installed`: indique si `AGENTS.md` et `.mustflow/` sont présents.
- `Manifest lock`: état du fichier de verrouillage. Une des valeurs `present`, `missing` ou `invalid`.
- `Tracked files`: nombre de fichiers enregistrés dans le fichier de verrouillage.
- `Changed files`: nombre de fichiers dont le hash de contenu actuel diffère du verrou.
- `Missing files`: nombre de fichiers enregistrés dans le verrou mais absents du disque.

## Exemple

```sh
npx mf status
```

Exemple de sortie:

```text
mustflow status
Installed: yes
Manifest lock: present
Tracked files: 10
Changed files: 0
Missing files: 0
```

Lorsque des fichiers ont changé ou disparu, leurs chemins sont imprimés sous le résumé.

## Champs JSON

```sh
npx mf status --json
```

La sortie lisible par machine utilise ces champs:

- `installed` (`boolean`): indique si `AGENTS.md` et `.mustflow/` existent.
- `manifestLock` (`string`): état du fichier de verrouillage.
- `trackedFiles` (`number`): nombre de fichiers enregistrés dans le fichier de verrouillage.
- `changedFiles` (`string[]`): chemins dont les hashes ont changé.
- `missingFiles` (`string[]`): chemins qui ont disparu.
- `issues` (`string[]`): messages de problème lisibles par une personne.
- `template` (`object | null`): identifiant et version du modèle enregistrés dans le fichier de verrouillage.

## Aide et codes de sortie

```sh
npx mf status --help
```

La sortie d’aide est organisée en `Usage`, `Options`, `Examples` et `Exit codes`.

- Code de sortie `0`: l’état a été inspecté et imprimé. Les fichiers modifiés ne font pas échouer l’inspection de l’état.
- Code de sortie `1`: la commande a reçu une option inconnue.

Si une automatisation doit faire échouer un flux de travail en présence de fichiers modifiés, lisez `mf status --json` et décidez à partir des champs, ou utilisez `mf check`.
