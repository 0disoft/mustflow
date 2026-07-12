---
title: mf api
description: Imprime des rapports JSON stables et en lecture seule pour les intégrations d'agents.
---

`mf api` expose des rapports lisibles par machine sur le workflow, le catalogue de commandes, le plan de vérification, les preuves récentes, le risque du diff, l'état et les locks actifs.

```sh
npx mf api workspace-summary --json
npx mf api command-catalog --json
npx mf api verification-plan --changed --json
npx mf api latest-evidence --json
npx mf api health --json
```

`serve --stdio` fournit les mêmes rapports via stdio ligne par ligne. Cette API n'exécute pas de commandes projet, ne modifie pas de fichiers et n'accorde aucune approbation. Les rapports de changements nécessitent `--changed`; les rapports JSON nécessitent `--json`. Succès: `0`; entrée ou rapport invalide: `1`.
