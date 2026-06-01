---
title: mf evidence
description: Rapport de preuves de vérification en lecture seule pour changements et exécutions récentes.
---

`mf evidence` résume ce qui doit être vérifié, quels intents configurés le couvrent et ce que les preuves récentes disent du plan.

Il n'exécute pas de commandes et n'accorde aucune autorité de commande. Par défaut, il lit les changements, construit le même modèle de planification de vérification que mustflow, puis le compare à `.mustflow/state/runs/latest.json` si ce fichier existe. `--export <path>` écrit le JSON uniquement dans la racine mustflow.

## Example

```sh
npx mf evidence --changed
npx mf evidence --changed --json
npx mf evidence --latest --json
npx mf evidence --plan .mustflow/state/verification-plan.json --json
```

## JSON Fields

- `schema_version` (`string`): Version du format.
- `command` (`string`): Toujours `evidence`.
- `status` (`string`): État résumé des preuves et de la couverture.
- `policy` (`object`): Déclare la lecture seule, sans exécution, avec `.mustflow/config/commands.toml` comme autorité.
- `plan` (`object | null`): Exigences, intents sélectionnés et écarts.
- `latest` (`object`): Preuves récentes bornées sans sortie brute.
- `coverage` (`object`): Compteurs d'exigences, receipts, risques et écarts.
- `recommended_commands` (`string[]`): Commandes mustflow sûres pour la suite.

## Help and Exit Codes

```sh
npx mf evidence --help
```

- Exit code `0`: Les preuves ont été inspectées.
- Exit code `1`: Les preuves n'ont pas pu être inspectées.
