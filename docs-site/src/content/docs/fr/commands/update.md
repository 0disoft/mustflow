---
title: mf update
description: Prévisualise ou applique de façon sûre les mises à jour d’un flux de documents mustflow installé.
---

`mf update` compare le flux de documents mustflow installé avec le modèle groupé actuel.

`mf update --dry-run` lit `manifest.lock.toml`, vérifie si les fichiers actuels correspondent encore à leurs hashes au moment de l’installation, puis imprime un plan de mise à jour.
`mf update --apply` applique uniquement les éléments `update` et `create` lorsqu’il n’existe aucun changement local bloqué ni élément à examiner manuellement.
Utilisez aussi `--json` lorsqu’une automatisation ou un agent doit analyser le plan.

La sortie destinée aux personnes et la sortie JSON suivent la même politique. La ligne de base est le `content_hash` du fichier de verrouillage,
et les seuls états applicables sont `update` et `create`.

## Pourquoi commencer par une simulation

Les fichiers mustflow contiennent des règles et procédures pour les agents. Écraser automatiquement des fichiers modifiés par l’utilisateur pourrait supprimer des règles propres au dépôt.

La commande de mise à jour doit donc distinguer:

- si le fichier actuel correspond encore au hash au moment de l’installation
- si le fichier actuel diffère du modèle groupé
- si des changements locaux de l’utilisateur bloquent les mises à jour automatiques
- si un examen manuel est requis

## Groupes de sortie

- `Blocked local changes`: le hash actuel du fichier diffère du hash au moment de l’installation; la mise à jour automatique est donc bloquée.
- `Manual review`: le fichier doit être examiné au lieu d’être mis à jour automatiquement, par exemple lorsqu’il contient un bloc géré.
- `Would update`: le fichier peut être mis à jour par `mf update --apply`.
- `Would create`: le fichier existe dans le modèle mais manque dans la racine actuelle.

Les fichiers dont le verrou indique `last_action = "customized"` sont traités comme inchangés tant qu’ils correspondent encore à leur ligne de base personnalisée, même si le modèle groupé diffère.

## Exemple

```sh
npx mf update --dry-run
```

Lorsque tout est à jour, la sortie ressemble à:

```text
mustflow update plan
Policy:
- Baseline: manifest_lock_content_hash
- Apply actions: update, create
- Blocking actions: blocked-local-change, manual-review
- Backup path: .mustflow/backups/<timestamp>/
Blocked local changes: 0
Manual review: 0
Would update: 0
Would create: 0
No template updates needed.
No files were written.
```

Lorsque des changements locaux sont trouvés, la commande se termine avec le code `1`. L’utilisateur doit inspecter ces changements avant toute future mise à jour qui modifierait les fichiers.

## Application des mises à jour

```sh
npx mf update --apply
```

`--apply` écrit les fichiers uniquement lorsque toutes ces conditions sont vraies:

- `Blocked local changes` vaut `0`.
- `Manual review` vaut `0`.
- L’élément cible se trouve dans `Would update` ou `Would create`.

Avant de mettre à jour un fichier existant, mustflow écrit une sauvegarde sous `.mustflow/backups/<timestamp>/`.
Après application des changements, il actualise les entrées concernées dans `.mustflow/config/manifest.lock.toml` avec le nouveau hash et `last_action`.

Si un nouveau fichier ajouté par le modèle existe déjà dans le dépôt utilisateur, n’est pas enregistré dans le fichier de verrouillage et possède un contenu différent, mustflow le traite comme un changement local et refuse de l’écraser.

## Champs JSON

```sh
npx mf update --dry-run --json
npx mf update --apply --json
```

La sortie lisible par machine utilise ces champs:

- `schema_version` (`number`): version du format de sortie.
- `command` (`string`): toujours `update`.
- `mode` (`string`): mode d’exécution. Une des valeurs `dry-run`, `apply` ou `unspecified`.
- `policy` (`object`): politique de sécurité des mises à jour.
- `ok` (`boolean`): indique si le plan ne contient aucun élément bloquant.
- `wroteFiles` (`boolean`): indique si des fichiers ont réellement été écrits. Vaut toujours `false` pour `--dry-run`.
- `summary` (`object`): compteurs du plan de mise à jour par état.
- `items` (`object[]`): entrées du plan pour chaque fichier.
- `error` (`string`): raison de l’échec. Peut apparaître uniquement dans une sortie en échec.

Les champs imbriqués utilisent ces formes:

- `policy.baseline` (`string`): ligne de base pour la décision de mise à jour. Actuellement `manifest_lock_content_hash`.
- `policy.allowed_apply_actions` (`string[]`): états que `--apply` peut écrire. Actuellement `update` et `create`.
- `policy.blocking_actions` (`string[]`): états qui empêchent `--apply` d’écrire des fichiers.
- `policy.dry_run_writes_files` (`boolean`): indique si `--dry-run` écrit des fichiers. Vaut toujours `false`.
- `policy.backup_path_pattern` (`string`): modèle de chemin de sauvegarde avant remplacement des fichiers existants.
- `policy.never_overwrite_local_changes` (`boolean`): déclare que les changements locaux ne sont jamais écrasés automatiquement.
- `policy.writes_only_template_manifest_paths` (`boolean`): déclare que la mise à jour écrit uniquement les fichiers mustflow listés par le manifeste du modèle.
- `summary.blockedLocalChanges` (`number`): nombre de fichiers bloqués par des changements locaux.
- `summary.manualReview` (`number`): nombre de fichiers nécessitant un examen manuel.
- `summary.wouldUpdate` (`number`): nombre de fichiers qu’une future mise à jour mutante pourrait modifier.
- `summary.wouldCreate` (`number`): nombre de fichiers qu’une future mise à jour mutante pourrait créer.
- `summary.unchanged` (`number`): nombre de fichiers correspondant déjà au modèle actuel.
- `items[].relativePath` (`string`): chemin cible de l’entrée du plan.
- `items[].sourceKind` (`string`): origine de l’élément dans la source du modèle.
- `items[].action` (`string`): état d’action prévu.
- `items[].reason` (`string`): raison pour laquelle l’élément a été placé dans cet état.

Lorsque le modèle groupé a changé mais que l’utilisateur n’a pas modifié le fichier installé, le fichier apparaît dans `Would update` ou `summary.wouldUpdate`.

## Aide et codes de sortie

```sh
npx mf update --help
```

La sortie d’aide est organisée en `Usage`, `Options`, `Examples` et `Exit codes`.

- Code de sortie `0`: un plan `--dry-run` ne contient aucun élément bloquant, ou `--apply` s’est terminé sans élément bloquant.
- Code de sortie `1`: des changements locaux, des éléments à examiner manuellement, un fichier de verrouillage manquant, des options invalides ou l’absence de mode explicite ont empêché la réussite.

Exécuter `mf update` seul échoue sans modifier les fichiers. Examinez d’abord avec `mf update --dry-run`, puis utilisez `mf update --apply` uniquement lorsque le plan est sûr.
