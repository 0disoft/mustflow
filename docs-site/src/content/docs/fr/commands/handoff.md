---
title: mf handoff
description: Validation en lecture seule des enregistrements restreints de travail et de handoff.
---

`mf handoff validate <path>` valide un enregistrement JSON situé dans la racine mustflow. La commande ne crée pas d'éléments de travail, n'écrit pas de fichiers de handoff, ne démarre pas d'agents, n'exécute pas de commandes et ne traite pas l'enregistrement comme une autorité de commande.

Cette commande sert aux fichiers optionnels sous `.mustflow/work-items/` ou aux enregistrements de handoff utilisés comme points de reprise. Un enregistrement valide peut nommer l'objectif, le périmètre, les critères d'acceptation, les références source, le plan de vérification, l'état de couverture, les risques restants et le prochain point de reprise. Il ne doit pas stocker de raisonnement caché, de transcription de chat, de logs terminal bruts, de secrets, de données personnelles, de résumé mémoire large, d'état de travailleur autonome, ni de champs de commande contournant `.mustflow/config/commands.toml`.

## Shape

Required fields:

- `schema_version`: Always `1`.
- `kind`: `work_item` or `handoff`.
- `task_id`: Stable task identifier.
- `goal`: Current goal.
- `scope`: Bounded work scope.
- `acceptance_criteria`: Completion checks.
- `source_refs`: Repository files, issue links, or other source references.
- `next_restart_point`: Short instruction for the next session.

Optional fields: `non_goals`, `changed_surfaces`, `verification_plan`, `coverage`, and `remaining_risks`.

`verification_plan` entries use `status: planned`, `run`, or `skipped`. Skipped entries must include `skip_reason`. Only `status: run` entries may include `receipt_path`.

## Example

```sh
npx mf handoff validate .mustflow/work-items/MF-0001.json
npx mf handoff validate .mustflow/work-items/MF-0001.json --json
```

## Exit Codes

- `0`: The record is valid.
- `1`: The record is invalid, outside the mustflow root, too large, unreadable, or not valid JSON.
