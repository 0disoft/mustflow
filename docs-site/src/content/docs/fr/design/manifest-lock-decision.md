---
title: Décision sur la structure de manifest.lock.toml
description: Pourquoi mustflow ne divise pas encore les champs de hash de manifest.lock.toml.
---

mustflow conserve actuellement un seul champ `content_hash` dans `manifest.lock.toml`.

Cette valeur n’est pas le hash actuel du fichier en cours. C’est le hash de contenu enregistré lors de la dernière installation ou mise à jour. Le nom est simple, mais il sert de ligne de base d’installation.

## Décision

Ne pas diviser le fichier de verrouillage en `installed_hash`, `template_hash` et `current_hash` pour le moment.

Appliquer plutôt ces règles:

- `content_hash`: ligne de base d’installation stockée dans le fichier de verrouillage.
- Hash du fichier actuel: calculé depuis le système de fichiers à l’exécution.
- Hash du modèle groupé: calculé à l’exécution depuis le modèle inclus dans le paquet installé.

## Raisonnement

Le fichier de verrouillage doit enregistrer uniquement un état d’installation reproductible.

`current_hash` change chaque fois que l’utilisateur modifie un fichier. Le stocker dans le fichier de verrouillage obligerait à réécrire le verrou après des modifications ordinaires, ce qui affaiblirait l’objectif de la ligne de base.

`template_hash` peut être calculé depuis le paquet mustflow actuellement installé. Lorsque le paquet change, le hash du modèle groupé change aussi. Conserver un hash de modèle obsolète dans le fichier de verrouillage pourrait créer des sources de vérité contradictoires.

## Comparaison de mise à jour

`mf update --dry-run` s’appuie sur ces comparaisons:

```text
current file hash == lock content_hash
current file hash == bundled template hash
```

- Si la première comparaison est fausse, le fichier contient des changements locaux.
- Si la première comparaison est vraie et la seconde est fausse, le fichier est candidat à une mise à jour du modèle.
- Si les deux sont vraies, aucune mise à jour n’est nécessaire.

## Extension future

La version du schéma sera augmentée et des champs seront ajoutés plus tard si mustflow a besoin de:

- Comparer plusieurs sources de modèles.
- Mettre à jour de façon sûre des blocs gérés comme `AGENTS.md` ou `.gitignore` avec des lignes de base au niveau du bloc.
- Vérifier hors ligne les hashes de source propres à chaque modèle.
- Planifier des mises à jour reproductibles sans que le paquet mustflow soit installé.
- Utiliser des modèles signés ou une vérification de la chaîne d’approvisionnement.

Jusque-là, un seul `content_hash` comme ligne de base d’installation reste plus simple et plus robuste.
