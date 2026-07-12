---
title: mf flow
description: Génère REPO_FLOW.md, la carte du flux de travail de la racine courante.
---

`mf flow` génère `REPO_FLOW.md` pour décrire le passage de la demande à la lecture, l'édition, la vérification et au rapport. `REPO_MAP.md` indique où sont les fichiers; `REPO_FLOW.md` indique comment progresser.

```sh
npx mf flow --stdout
npx mf flow --write
npx mf flow --check
```

La sortie contient un frontmatter stable, les flux de travail/commandes/artefacts/reçus, les contrats publics à synchroniser et des points de départ. Elle exclut horodatages, branches, URL distantes et chemins absolus. C'est une aide de navigation, pas une autorité de commande. `0` indique le succès; `1` une option invalide ou une carte absente ou périmée.
