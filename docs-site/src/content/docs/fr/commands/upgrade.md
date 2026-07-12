---
title: mf upgrade
description: Vérifie la version du paquet et met à jour en sécurité les fichiers de workflow installés.
---

`mf upgrade` s'utilise après la mise à jour du paquet. Il vérifie d'abord npm puis applique la même politique sûre que `mf update --apply` si la CLI est à jour.

```sh
bun update -g --latest
mf upgrade --dry-run
mf upgrade
mf check --strict
```

Il n'installe pas de paquets. Il n'écrit les éléments `update` et `create` du manifest que lorsque `Blocked local changes` et `Manual review` valent `0`, avec sauvegarde avant remplacement.

Un `AGENTS.md`, contrat, index de skills ou table de routes personnalisé peut bloquer le plan. C'est un arrêt, pas une invitation à supprimer ou écraser le fichier. Fusionnez le changement utile, enregistrez la base via le flux manifest-lock déclaré, puis lancez `mf check --strict`.
