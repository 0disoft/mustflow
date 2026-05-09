---
title: mf version
description: Affiche la version installée de mustflow et peut vérifier npm.
---

`mf version` affiche la version installée du paquet CLI mustflow.

Par défaut, la commande ne contacte pas le réseau afin que les scripts puissent lire la version de manière stable.

## Vérifier npm

```sh
npx mf version --check
```

`--check` contacte le registre npm, compare la version installée avec la dernière version publiée et affiche une commande de mise à jour lorsqu'une version plus récente existe.

La commande n'installe aucun paquet et ne modifie aucun fichier.

## Aide et codes de sortie

```sh
npx mf version --help
```

- Code de sortie `0` : Les informations de version ont été affichées.
- Code de sortie `1` : La commande a reçu une option inconnue ou n'a pas pu vérifier npm.
