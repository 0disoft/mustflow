---
title: Flux opérationnel
description: Séquence de commandes mf recommandée après l’installation de mustflow.
---

Le flux opérationnel par défaut de mustflow vérifie si la racine actuelle est prête à être lue par les agents, sans créer de fichiers inutiles.

## Prévisualiser avant d’écrire

Commencez par prévisualiser le plan d’installation.

```sh
npx mf init --dry-run
```

Les fichiers `AGENTS.md` ou répertoires `.mustflow/` existants peuvent provoquer des conflits; examinez donc les écritures prévues avant d’appliquer les changements.

## Initialiser

Si le plan est correct, initialisez le flux de travail.

```sh
npx mf init --yes
```

Si `AGENTS.md` existe déjà et ne nécessite que le bloc géré par mustflow, utilisez `--merge`. Utilisez `--force` uniquement lorsque les fichiers existants doivent être sauvegardés puis écrasés.

## Valider

Après l’initialisation, validez le flux de documents et les paramètres.

```sh
npx mf check
npx mf check --json
```

Utilisez la sortie lisible par une personne par défaut pour l’examen manuel. Utilisez la sortie JSON lorsqu’un agent ou une automatisation doit déterminer la prochaine action.

## Inspecter l’état

Utilisez la commande de statut pour vérifier si les fichiers installés ont changé depuis l’initialisation.

```sh
npx mf status
npx mf status --json
```

La commande compare les fichiers actuels à la ligne de base au moment de l’installation enregistrée dans `manifest.lock.toml`.

## Prévisualiser les mises à jour

Prévisualisez les mises à jour du modèle avant d’écrire des changements.

```sh
npx mf update --dry-run
npx mf update --dry-run --json
```

Si le plan est sûr, appliquez explicitement les mises à jour propres du modèle.

```sh
npx mf update --apply
```

`mf update --apply` écrit uniquement les fichiers qui correspondent encore à leur ligne de base installée.
Les fichiers modifiés localement et les collisions de nouveaux fichiers sont signalés comme éléments bloqués.

## Générer la carte de navigation

Générez une carte de navigation lorsque les agents ont besoin d’un aperçu rapide des fichiers importants dans la racine actuelle.

```sh
npx mf map --write
```

Utilisez la cartographie des dépôts imbriqués uniquement lorsque les racines d’espace de travail sont configurées et que vous avez besoin de points d’entrée vers ces dépôts enfants.

```sh
npx mf map --write --include-nested
```

`REPO_MAP.md` est une carte de fichiers d’ancrage pour la racine mustflow actuelle, pas une liste complète de fichiers.
