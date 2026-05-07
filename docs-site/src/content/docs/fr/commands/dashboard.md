---
title: mf dashboard
description: Commande réservée au futur tableau de bord local de mustflow.
---

`mf dashboard` est réservée à un futur tableau de bord local capable d’inspecter et de modifier visuellement le flux de documents mustflow.

La fonctionnalité n’est pas encore implémentée. Exécuter la commande imprime seulement un message indiquant qu’elle n’est pas implémentée et quitte avec le code `1`.

## Comportement actuel

```sh
npx mf dashboard
```

Cette commande ne démarre pas de serveur et ne modifie pas les fichiers.

## Sortie structurée

`mf dashboard` ne fournit actuellement pas de format de sortie JSON.

Les automatisations et les agents ne doivent pas traiter cette commande comme une commande de flux de travail disponible.

## Aide et codes de sortie

```sh
npx mf dashboard --help
```

- Code de sortie `0`: l’aide a été imprimée.
- Code de sortie `1`: le tableau de bord n’est pas encore implémenté.
