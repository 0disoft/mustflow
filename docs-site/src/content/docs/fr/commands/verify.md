---
title: mf verify
description: Exécute les intentions de vérification configurées sélectionnées par les métadonnées required_after.
---

`mf verify --reason <event>` lit `.mustflow/config/commands.toml`, trouve les intentions dont `required_after` contient la raison demandée, puis exécute seulement les intentions configurées, ponctuelles, autorisées pour les agents et avec stdin fermé.

## Règles de sélection

- La raison doit correspondre exactement à la chaîne `required_after`.
- Les intentions exécutables passent par la même voie sûre que `mf run <intent>`.
- Les intentions inconnues, manuelles, longues, bloquées ou incomplètes ne sont pas devinées; elles sont signalées comme ignorées.
- Si aucune intention ne correspond à la raison, le résultat est `blocked`.

## Exemples

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
```

## Champs JSON

```sh
npx mf verify --reason code_change --json
```

La sortie lisible par machine utilise ces champs:

- `schema_version` (`string`): version du format de rapport.
- `command` (`string`): toujours `verify`.
- `mustflow_root` (`string`): racine mustflow résolue.
- `reason` (`string`): raison `required_after` demandée.
- `status` (`string`): `passed`, `partial`, `failed` ou `blocked`.
- `summary` (`object`): nombres d'intentions trouvées, exécutées, réussies, échouées et ignorées.
- `results` (`object[]`): résultat d'exécution ou d'ignorance par intention.

## Codes de sortie

- `0`: toutes les intentions exécutables sélectionnées ont réussi et aucune n'a été ignorée.
- `1`: la vérification a échoué, est partielle, est bloquée ou l'entrée est invalide.
