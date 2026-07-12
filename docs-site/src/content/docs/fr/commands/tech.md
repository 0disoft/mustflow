---
title: mf tech
description: Gère les préférences technologiques à faible autorité pour les agents.
---

`mf tech` lit et met à jour `.mustflow/config/technology.toml`. Ces préférences sont des indications: elles n'installent pas de dépendance, n'approuvent pas de migration et ne remplacent pas le code ou contrat courant.

```sh
npx mf tech list --json
npx mf tech suggest --scope frontend
npx mf tech add framework nextjs --scope frontend --ecosystem npm --package next --package react --verify --why "Preferred React app framework"
npx mf tech remove framework.frontend.nextjs
```

Les actions sont `list`, `suggest`, `add` et `remove`. `--verify` ne vérifie que les noms de paquets npm avant écriture: il n'installe rien et ne modifie pas `package.json`. `0` est un succès; `1` une erreur d'entrée ou de vérification.
