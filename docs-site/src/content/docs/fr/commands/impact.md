---
title: mf impact
description: Signale en lecture seule l'impact de version des chemins modifiés.
---

`mf impact --changed` classe les chemins modifiés, détecte les sources de version et indique si une décision de version de paquet ou de modèle est requise. Il ne modifie pas de version, ne crée pas de tag, ne commit ni ne pousse.

```sh
npx mf impact --changed --json
npx mf impact package.json schemas/impact-report.schema.json --json
```

Le rapport contient préférences, sévérité, bump suggéré, raisons, sources et surfaces touchées. La suggestion ne remplace ni la politique du dépôt ni l'instruction utilisateur. `0` indique le succès; `1` une entrée invalide.
