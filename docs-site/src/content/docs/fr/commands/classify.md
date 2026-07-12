---
title: mf classify
description: Classe les chemins modifiés, les surfaces publiques et les raisons de vérification.
---

`mf classify --changed` lit les changements Git et indique les surfaces publiques et raisons de vérification touchées. Un chemin sans règle reste visible avec `unclassified_path` et `unknown_change`, plutôt que de produire un plan vide.

```sh
npx mf classify --changed --json
npx mf classify README.md schemas/classify-report.schema.json --json
npx mf classify --changed --write .mustflow/state/change-classification.json
```

Le rapport peut alimenter `mf verify` pour sélectionner des intents déclarés. La cible de `--write` doit rester dans la racine courante. La commande n'exécute aucune vérification: `0` en cas de succès, `1` si l'entrée est invalide.
