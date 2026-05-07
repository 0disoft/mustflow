---
title: Actualisation des instructions
description: Pourquoi mustflow utilise des points de contrôle d’actualisation plutôt que des compteurs de session dans les fichiers du projet.
---

Les sessions d’agent longue durée peuvent perdre leur alignement avec les instructions chargées au départ. Les sorties d’outils, les grands diffs, la compaction du contexte et les changements dans des dépôts imbriqués peuvent tous rendre le `AGENTS.md` initial moins visible.

mustflow gère cela avec des points de contrôle d’actualisation.

## Ce que cela résout

- Les agents peuvent réexaminer les fichiers d’instructions pertinents avant les actions à risque élevé.
- L’exécution de commandes peut actualiser `commands.toml` au lieu de s’appuyer sur la mémoire.
- Les changements de racine peuvent forcer la relecture du `AGENTS.md` le plus proche.
- Les rapports finaux peuvent confirmer les règles de compte rendu avant de résumer le travail.

## Ce que cela évite

mustflow n’écrit pas de compteurs de tours, de nombres de messages ni d’activité de session dans les fichiers du projet.

Un tel suivi d’état introduirait du bruit inutile dans Git, créerait des conflits entre plusieurs agents et exposerait des métadonnées d’activité. Si une application hôte suit l’âge d’une session, elle doit stocker cet état dans un cache local ou dans un stockage géré par l’hôte.

## Niveaux d’actualisation

- `light`: relire `AGENTS.md` et `agent-workflow.md`.
- `command`: relire `AGENTS.md` et `commands.toml`.
- `skill`: relire `AGENTS.md` et `skills/INDEX.md`.
- `full`: relire l’ordre de lecture complet de mustflow.

La source de vérité est `.mustflow/config/mustflow.toml` `[refresh]`.

## Orientation CLI

De futures commandes comme `mf orient` et `mf refresh` pourront exposer cette politique sous forme de plan lisible par machine. Le modèle actuel commence par la politique et la documentation pour que les hôtes puissent l’adopter sans supposer que tous les outils partagent les mêmes points d’accroche de cycle de vie.
