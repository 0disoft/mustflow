---
title: Politique de mf update
description: Explique comment mf update sépare la planification de l’application sûre.
---

`mf update` met à jour le flux de documents d’agent mustflow installé pour l’aligner sur un modèle plus récent.

Comme ces fichiers contiennent des règles d’agent propres au dépôt, les mises à jour automatiques doivent rester prudentes.
`mf update --dry-run` prévisualise d’abord le plan, et `mf update --apply` écrit uniquement lorsqu’aucun élément bloquant n’est présent.

## Ligne de base

La ligne de base de mise à jour est le `content_hash` présent dans `.mustflow/config/manifest.lock.toml`.

`content_hash` est le hash de contenu de fichier enregistré en dernier par `mf init` ou `mf update --apply`. Si le hash actuel du fichier diffère de cette valeur, mustflow traite le fichier comme modifié localement.

Si une entrée du verrou a `last_action = "customized"`, mustflow traite ce hash comme une ligne de base propre au dépôt. Le fichier n’est pas remplacé par le contenu du modèle tant que le hash actuel correspond encore à cette ligne de base personnalisée.

Cette politique est aussi incluse dans l’objet `policy` de `mf update --json`.
La documentation, la sortie lisible par une personne et la sortie destinée à l’automatisation doivent rester cohérentes.

Valeurs actuelles de la politique:

```text
baseline: manifest_lock_content_hash
allowed_apply_actions: update, create
blocking_actions: blocked-local-change, manual-review
dry_run_writes_files: false
backup_path_pattern: .mustflow/backups/<timestamp>/
never_overwrite_local_changes: true
writes_only_template_manifest_paths: true
```

## États

`mf update --dry-run` classe les fichiers dans les états suivants:

- `unchanged`: le fichier actuel correspond à la fois à la ligne de base du verrou et au modèle groupé, ou il est marqué comme personnalisé et correspond encore à cette ligne de base personnalisée.
- `update`: le fichier actuel correspond à la ligne de base du verrou mais diffère du modèle groupé.
- `create`: le fichier existe dans le modèle mais manque dans le dépôt utilisateur.
- `blocked-local-change`: le fichier actuel diffère de la ligne de base du verrou.
- `manual-review`: le fichier nécessite un examen humain au lieu d’une mise à jour automatique.

## Règles d’application

`mf update --apply` suit ces règles:

- Ne pas modifier automatiquement les fichiers `blocked-local-change`.
- Ne pas modifier automatiquement les fichiers `manual-review`.
- Ne pas remplacer les fichiers personnalisés par le contenu du modèle tant qu’ils correspondent encore à leur ligne de base personnalisée.
- Les fichiers `update` sont remplacés par le contenu du modèle après création d’une sauvegarde.
- Les fichiers `create` sont écrits après création des répertoires parents nécessaires.
- Si un nouveau fichier de modèle entre en conflit avec un fichier existant absent du verrou, il est traité comme un changement local et n’est pas écrasé.
- Actualiser les entrées concernées de `manifest.lock.toml` après une mise à jour réussie.
- `mf update` écrit uniquement les fichiers mustflow déclarés par le manifeste du modèle et le fichier de verrouillage.
- Si une écriture échoue, signaler les fichiers déjà écrits et les chemins de sauvegarde.

## Gestion de AGENTS.md

`AGENTS.md` est le point d’entrée racine et demande une attention particulière.

`mf update` ne fusionne pas automatiquement le fichier `AGENTS.md` entier.

Lorsqu’un `AGENTS.md` existant est suivi comme bloc géré par mustflow, mustflow ne possède pas le texte situé en dehors de ce bloc. Le bloc ne peut devenir éligible à une mise à jour automatique que si le fichier de verrouillage enregistre une ligne de base au niveau du bloc et si le bloc actuel y correspond encore.

Le schéma v1 ne stocke pas cette ligne de base au niveau du bloc. En v1, les fichiers `AGENTS.md` fusionnés restent en `manual-review` au lieu de recevoir un `managed-block-update`.

## Emplacement des sauvegardes

Avant qu’un élément `update` modifie un fichier existant, les sauvegardes sont écrites sous:

```text
.mustflow/backups/<timestamp>/
```

Les sauvegardes servent de dernière couche de protection. Leur présence ne justifie pas l’écrasement automatique des fichiers `blocked-local-change`.

## Codes de sortie

- Sortie `0`: le plan ne contient aucun élément bloquant.
- Sortie `1`: des éléments `blocked-local-change` ou `manual-review` sont présents, y compris pendant `--apply`.
- Sortie `1`: le fichier de verrouillage est manquant ou invalide.
- Sortie `1`: `mf update` est exécuté sans choisir `--dry-run` ou `--apply`.
