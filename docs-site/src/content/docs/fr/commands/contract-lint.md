---
title: mf contract-lint
description: Vérification en lecture seule du contrat de commandes dans commands.toml.
---

`mf contract-lint` inspecte `.mustflow/config/commands.toml` sans exécuter de commande configurée.

Utilisez-le pour obtenir une vue ciblée des erreurs et avertissements du contrat de commandes. La portée est plus étroite que `mf check` : les intentions `configured` mal formées sont des erreurs, tandis que les intentions `unknown` et `manual_only` restent des avertissements.

Ajoutez `--coverage` pour vérifier aussi si les raisons de validation issues de la classification des changements sont reliées aux métadonnées `required_after`. Les constats de couverture restent des avertissements et ne rendent aucune commande exécutable.

Quand un intent utilise un script de paquet comme `bun run <script>`, `mf contract-lint` vérifie aussi le `package.json` dans le `cwd` de cet intent s'il existe. Les scripts référencés mais absents restent des avertissements; ils ne donnent pas d'autorité d'exécution et ne déclenchent pas de correction automatique.

Ajoutez `--suggest` pour lire les entrées du `package.json` racine, du Makefile ou du justfile et imprimer des fragments d'intent réservés à la revue. Les fragments suggérés utilisent `status = "unknown"` et omettent les champs exécutables comme `argv`, `lifecycle` et `run_policy`; ils n'autorisent donc aucune exécution tant qu'une personne ne les édite pas dans `.mustflow/config/commands.toml`.

## Exemple

```sh
npx mf contract-lint
npx mf contract-lint --coverage
npx mf contract-lint --suggest
npx mf contract-lint --json
npx mf contract-lint --coverage --json
```

## Champs JSON

```sh
npx mf contract-lint --json
```

- `schema_version` (`string`) : version du format de sortie.
- `command` (`string`) : toujours `contract-lint`.
- `mustflow_root` (`string`) : racine mustflow actuelle.
- `report.status` (`string`) : `passed`, `warning` ou `failed`.
- `report.summary` (`object`) : nombres d'intentions, d'exécutables, d'erreurs et d'avertissements.
- `report.issues` (`object[]`) : problèmes avec `severity`, `code`, `intent` et `message`.
- `report.sourceFiles` (`string[]`) : fichiers qui définissent les règles du contrat.
- `report.suggestions` (`object[]`, facultatif) : présent seulement avec `--suggest`. Inclut le fichier source, l'entrée source, l'indice de commande, le nom d'intent suggéré, `status = "unknown"`, la raison et un fragment TOML réservé à la revue.
- `report.coverage` (`object`, facultatif) : présent seulement avec `--coverage`. Inclut les raisons de classification connues, les raisons de vérification documentées, les raisons `required_after`, les raisons exécutables et les constats de couverture.
- `report.coverage.findings` (`object[]`) : constats de couverture avec des champs stables `code`, `reason`, `intent`, `intents` et `message`.

## Aide et codes de sortie

```sh
npx mf contract-lint --help
```

- Code `0` : aucune erreur bloquante du contrat de commandes.
- Code `1` : des erreurs ont été trouvées ou l'entrée est invalide.
