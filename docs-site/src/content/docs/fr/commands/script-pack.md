---
title: mf script-pack
description: Liste, suggère et exécute des utilitaires intégrés sous contrat de commande.
---

`mf script-pack` réunit de petits contrôles dans un même espace de noms. La liste et les suggestions sont en lecture seule; une suggestion n'est pas une autorisation d'exécution.

```sh
npx mf script-pack list --json
npx mf script-pack suggest --path src/cli/index.ts --phase before_change
npx mf script-pack run core/text-budget check README.md --max 5000
```

Les helpers couvrent outline, graphe d'imports relatifs, impact, symboles, routes, exports, dérive documentaire, budget texte, chaîne de configuration, frontières générées et fichiers liés. Un `run_hint` exige encore l'autorisation du contrat local et des métadonnées d'effets. Les gestionnaires de paquets, wrappers shell, écritures Git et publication non configurés sont refusés.
