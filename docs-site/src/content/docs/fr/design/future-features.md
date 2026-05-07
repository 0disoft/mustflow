---
title: Fonctionnalités futures
description: Fonctionnalités proposées pour mustflow qui ne sont pas encore implémentées.
---

Cette page ne décrit pas le comportement actuel. Elle suit les fonctionnalités proposées qui sont encore à l’étude.

Tant qu’elles ne sont pas implémentées, ces fonctionnalités ne font pas partie du modèle par défaut, du contrat de commande ni des règles de validation.

## Fonctionnalités proposées

| Élément | État | Décision actuelle |
| --- | --- | --- |
| `mf dashboard` | À l’étude | Nom de commande réservé; implémentation en attente. |
| Dépôt communautaire de skills | À l’étude | Les règles d’installation et de mise à jour des skills externes ne sont pas encore définies. |
| Installation de packs de skills | À l’étude | En attente de stabilisation de la frontière entre skills par défaut et skills optionnels. |
| `.mustflow/work-items/` | À l’étude | Exclu du modèle par défaut; reste optionnel. |
| `mf orient` | À l’étude | Actuellement couvert par `mf context`, `mf map` et `mf help`. |
| `mf refresh` | À l’étude | Actuellement géré par `mf update` et `mf check --strict` pour l’actualisation des instructions. |
| Adaptateurs propres à certains outils | À l’étude | Éviter que les noms de produits d’outils deviennent des noms de fichiers par défaut obligatoires ou des règles obligatoires. |

## Critères de promotion

Une fonctionnalité devient un comportement public uniquement lorsqu’elle remplit toutes ces conditions:

- Elle n’étend pas inutilement le flux de documents par défaut créé par `mf init`.
- Elle fournit un contrat de commande clair que les agents peuvent exécuter de façon prévisible.
- Elle rend les usages incorrects détectables via `mf check --strict` ou un autre validateur.
- Elle reste lisible par une personne et facile à modifier manuellement.
