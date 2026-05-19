---
title: mf verify
description: Exécute les intentions de vérification configurées sélectionnées par les métadonnées required_after.
---

`mf verify --reason <event>` lit `.mustflow/config/commands.toml`, trouve les intentions dont `required_after` contient la raison demandée, puis exécute seulement les intentions configurées, ponctuelles, autorisées pour les agents et avec stdin fermé.

`mf verify --from-classification <path>` lit les raisons de vérification depuis un rapport JSON de `mf classify` situé dans la racine mustflow. `--from-plan` reste disponible comme alias de compatibilité obsolète, mais lit le même rapport de classification; il ne lit pas la sortie de `mf verify --plan-only --json`.

`mf verify --changed` classe l'arbre de travail Git actuel avec la même sémantique que `mf classify --changed`, puis transmet ces raisons au modèle de sélection de vérification. Utilisez `--write-plan <path>` pour enregistrer le rapport de classification dans la racine mustflow tout en utilisant le modèle en mémoire pour l'exécution courante.

`mf verify --plan-only --json` imprime le plan de vérification sans exécuter de commande. La sortie inclut un `verification_plan_id` stable et `decision_graph`, qui relie les surfaces modifiées, les raisons de classification, les commandes candidates, les contrôles d'éligibilité, les effets et les écarts restants. Quand un index local à jour existe, chaque entrée planifiée peut inclure `effectGraph` lu depuis `.mustflow/cache/mustflow.sqlite`, avec les verrous d'écriture et les conflits de verrous. Les exigences peuvent aussi inclure les métadonnées `surfaceReadModels`, qui expliquent quelle règle chemin-surface a correspondu aux fichiers modifiés. Si l'index est absent ou obsolète, la sortie affiche une suggestion de reconstruction sans modifier la sélection ni l'autorité d'exécution.

Quand `mf verify` exécute réellement des commandes, il utilise le même modèle de planification que la sortie plan-only et exécute par défaut `schedule.entries` en série via les reçus `mf run`. Si `--parallel <count>` est supérieur à `1`, seules les entrées du même lot planifié, avec effets explicites et sans conflit, peuvent s'exécuter en même temps, et les reçus restent écrits dans l'ordre planifié. La sortie verify, le manifeste du lot de vérification, le pointeur latest et les reçus par intention partagent le même `verification_plan_id`.

Dans le JSON, `execution_status` est l'état agrégé de l'exécution des commandes. Le champ historique `status` reste le même agrégat pour compatibilité. Les automatisations qui doivent décider si le travail demandé est entièrement vérifié doivent lire `completion_verdict.status`; seul `verified` représente une vérification complète.

## Règles de sélection

- La raison doit correspondre exactement à la chaîne `required_after`.
- Les fichiers de plan doivent rester dans la racine mustflow et être du JSON.
- `--changed` utilise les chemins de l'état Git actuel et ne rend aucune commande exécutable.
- `--write-plan` est disponible seulement avec `--changed`, et le chemin de sortie doit rester dans la racine mustflow.
- Les intentions exécutables passent par la même voie sûre que `mf run <intent>`.
- Les intentions inconnues, manuelles, longues, bloquées ou incomplètes ne sont pas devinées; elles sont signalées comme ignorées.
- Si aucune intention ne correspond à la raison, le résultat est `blocked`.

## Exemples

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
npx mf verify --changed --plan-only --json
npx mf classify --changed --write .mustflow/state/change-classification.json
npx mf verify --reason docs_change --plan-only --json
npx mf verify --from-classification .mustflow/state/change-classification.json --json
```

## Champs JSON

```sh
npx mf verify --reason code_change --json
```

La sortie lisible par machine utilise ces champs:

- `schema_version` (`string`): version du format de rapport.
- `command` (`string`): toujours `verify`.
- `mustflow_root` (`string`): racine mustflow résolue.
- `reason` (`string`): raison `required_after` demandée, ou résumé séparé par des virgules quand un plan est utilisé.
- `reasons` (`string[]`): raisons utilisées pour sélectionner les intentions.
- `plan_source` (`string | null`): chemin du rapport de classification JSON quand `--from-classification` ou `--from-plan` est utilisé, `changed` quand `--changed` est utilisé, ou `null` avec seulement `--reason`.
- `verification_plan_id` (`string`): identifiant SHA-256 stable du plan de vérification qui a sélectionné l'exécution.
- `execution_status` (`string`): état agrégé de l'exécution: `passed`, `partial`, `failed` ou `blocked`.
- `status` (`string`): alias historique de `execution_status`, conservé pour compatibilité.
- `completion_verdict` (`object`): verdict de finalisation fondé sur les preuves. Pour les décisions finales d'automatisation, utilisez `completion_verdict.status`; `verified` est le seul état qui indique une vérification complète.
- `summary` (`object`): nombres d'intentions trouvées, exécutées, réussies, échouées et ignorées.
- `run_dir` (`string`): répertoire unique du lot de vérification contenant le manifeste et les reçus par intention.
- `manifest_path` (`string`): chemin du manifeste du lot de vérification.
- `results` (`object[]`): résultat d'exécution ou d'ignorance par intention.
- `results[].verification_plan_id` (`string | null`): identifiant de plan pour un résultat exécuté, ou `null` pour un résultat ignoré.
- `results[].receipt_path` (`string | null`): chemin du reçu par intention lorsque le résultat a été exécuté et a produit un reçu.
- `results[].receipt_sha256` (`string | null`): hash SHA-256 du reçu par intention écrit.

Avec `--plan-only --json`, la sortie utilise le schéma de rapport de vérification des changements. `verification_plan_id` est calculé à partir de la classification des changements, du modèle de vérification sélectionné, des entrées liées du contrat de commandes, de la politique de planification et du rapport de sélection de tests. Le champ `decision_graph` est le modèle de preuves partagé pour les surfaces modifiées, les raisons de classification, les commandes candidates, l'éligibilité, les effets et les écarts. Le champ `schedule.entries[].effectGraph`, s'il est présent, est une métadonnée d'index local en lecture seule pour expliquer les verrous et conflits. Le champ `requirements[].surfaceReadModels`, s'il est présent, est une métadonnée d'index local en lecture seule pour expliquer la règle chemin-surface derrière une raison de vérification.

## Codes de sortie

- `0`: `completion_verdict.status` vaut `verified`.
- `1`: le verdict est partiel, non vérifié, bloqué, contradictoire, ou l'entrée est invalide.
