---
title: mf verify
description: Exécute les intentions de vérification configurées sélectionnées par les métadonnées required_after.
---

`mf verify --reason <event>` lit `.mustflow/config/commands.toml`, trouve les intentions dont `required_after` contient la raison demandée, puis exécute seulement les intentions configurées, ponctuelles, autorisées pour les agents et avec stdin fermé.

`mf verify --from-plan <path>` lit les raisons de vérification depuis un fichier JSON situé dans la racine mustflow. Il reconnaît `reason`, `reasons`, `validationReasons`, `summary.validationReasons` et `classification_summary.validationReasons`.

`mf verify --changed` classe l'arbre de travail Git actuel avec la même sémantique que `mf classify --changed`, puis transmet ces raisons au planificateur de vérification existant. Utilisez `--write-plan <path>` pour enregistrer le rapport de classification dans la racine mustflow tout en utilisant le plan en mémoire pour l'exécution courante.

`mf verify --plan-only --json` imprime le plan de vérification sans exécuter de commande. La sortie inclut `decision_graph`, qui relie les surfaces modifiées, les raisons de classification, les commandes candidates, les contrôles d'éligibilité, les effets et les écarts restants. Quand un index local à jour existe, chaque entrée planifiée peut inclure `effectGraph` lu depuis `.mustflow/cache/mustflow.sqlite`, avec les verrous d'écriture et les conflits de verrous. Les exigences peuvent aussi inclure les métadonnées `surfaceReadModels`, qui expliquent quelle règle chemin-surface a correspondu aux fichiers modifiés. Si l'index est absent ou obsolète, la sortie affiche une suggestion de reconstruction sans modifier la sélection ni l'autorité d'exécution.

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
npx mf verify --changed --write-plan .mustflow/state/change-plan.json --json
npx mf verify --reason docs_change --plan-only --json
npx mf verify --from-plan verify-plan.json --json
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
- `plan_source` (`string | null`): chemin du plan JSON quand `--from-plan` est utilisé, `changed` quand `--changed` est utilisé, ou `null` avec seulement `--reason`.
- `status` (`string`): `passed`, `partial`, `failed` ou `blocked`.
- `summary` (`object`): nombres d'intentions trouvées, exécutées, réussies, échouées et ignorées.
- `results` (`object[]`): résultat d'exécution ou d'ignorance par intention.

Avec `--plan-only --json`, la sortie utilise le schéma de rapport de vérification des changements. Le champ `decision_graph` est le modèle de preuves partagé pour les surfaces modifiées, les raisons de classification, les commandes candidates, l'éligibilité, les effets et les écarts. Le champ `schedule.entries[].effectGraph`, s'il est présent, est une métadonnée d'index local en lecture seule pour expliquer les verrous et conflits. Le champ `requirements[].surfaceReadModels`, s'il est présent, est une métadonnée d'index local en lecture seule pour expliquer la règle chemin-surface derrière une raison de vérification.

## Codes de sortie

- `0`: toutes les intentions exécutables sélectionnées ont réussi et aucune n'a été ignorée.
- `1`: la vérification a échoué, est partielle, est bloquée ou l'entrée est invalide.
