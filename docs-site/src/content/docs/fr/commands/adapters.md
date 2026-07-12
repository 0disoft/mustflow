---
title: mf adapters
description: Inspecte la compatibilité des instructions de l'hôte sans générer d'adaptateur.
---

`mf adapters status` inspecte en lecture seule les fichiers d'instructions propres à l'hôte dans la racine mustflow courante.

Il signale les fichiers d'agent existants, les surfaces d'adaptateur, les notes de compatibilité, les changements requis et la limite d'autorité des commandes. Il ne crée pas d'adaptateur et ne modifie pas la configuration de l'hôte.

```sh
npx mf adapters status
npx mf adapters status --json
```

`required_changes` contient les corrections nécessaires et `compatibility_notes` les informations. Aucun résultat ne donne d'autorité en dehors de `.mustflow/config/commands.toml`. Succès: `0`; entrée invalide: `1`.
