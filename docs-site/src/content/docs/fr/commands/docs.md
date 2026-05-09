---
title: mf docs
description: Suit les documents qui nécessitent une révision de prose après des modifications LLM.
---

`mf docs review` gère une file de révision locale au dépôt pour les documents créés ou modifiés par des agents.

La file est stockée dans `.mustflow/review/docs.toml`. `mf init` ne crée pas ce fichier; il apparaît seulement lorsqu'un document est ajouté à la révision.

## Modèle De Révision

La file suit l'état des documents, pas une liste fixe de produits réviseurs.

- `pending`: La révision est nécessaire.
- `in_review`: La révision a commencé.
- `changes_made`: Un réviseur a modifié le document.
- `approved`: La révision est terminée et le document est masqué de la liste par défaut.
- `needs_human`: Le réviseur ne peut pas approuver le document avec confiance.
- `ignored`: Le document est exclu intentionnellement de la révision.

Les réviseurs utilisent des types larges: `human`, `llm`, `tool` ou `external`. Les noms, fournisseurs, modèles et intentions de commande sont des métadonnées libres.

## Lister Les Documents

```sh
npx mf docs review list
npx mf docs review list --json
npx mf docs review list --all
```

La liste par défaut affiche seulement les éléments actifs. Utilise `--all` pour inclure les entrées approuvées et ignorées.

## Ajouter Un Document

```sh
npx mf docs review add docs/guide.md --reason llm_modified --actor-kind llm --actor-id codex
```

Ajouter un document crée ou met à jour son entrée et la marque `pending`.

## Approuver Un Document

```sh
npx mf docs review approve docs/guide.md --reviewer-kind llm --reviewer-id opencode --reviewer-provider deepseek --reviewer-model deepseek-reasoner --summary "Rewritten for natural tone."
```

L'approbation masque le document de la liste par défaut mais conserve l'historique. Utilise `needs-human` quand un réviseur ne peut pas l'approuver sûrement, ou `ignore` lorsque le dépôt ignore volontairement ce fichier.

## Aide Et Codes De Sortie

```sh
npx mf docs --help
```

- Code `0`: La file a été inspectée ou mise à jour.
- Code `1`: L'entrée est invalide ou la file n'a pas pu être mise à jour.
