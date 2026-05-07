---
title: Actualisation des instructions
description: Pourquoi mustflow utilise des points d’actualisation plutôt que des compteurs de session dans les fichiers du projet.
---

Les longues sessions d’agents peuvent perdre l’alignement avec les instructions chargées au départ. Les sorties d’outils, les grands diffs, la compaction du contexte et les changements de dépôts imbriqués peuvent rendre le `AGENTS.md` initial moins visible.

mustflow traite ce problème avec des points d’actualisation.

## Ce que cela résout

- Les agents peuvent réexaminer les fichiers d’instructions pertinents avant les actions à risque élevé.
- L’exécution de commandes peut actualiser `commands.toml` au lieu de s’appuyer sur la mémoire.
- Les changements de racine peuvent forcer la relecture du `AGENTS.md` le plus proche.
- Les rapports finaux peuvent confirmer les règles de rapport avant de résumer le travail.

## Ce que cela évite

mustflow n’écrit pas de compteurs de tours, de nombres de messages ni d’activité de session dans les fichiers du projet.

Un tel suivi d’état ajouterait du bruit inutile dans Git, entrerait en conflit entre plusieurs agents et exposerait des métadonnées d’activité. Si une application hôte suit l’âge de la session, elle doit stocker cet état dans un cache local ou un stockage géré par l’hôte.

## Niveaux d’actualisation

- `light`: relire `AGENTS.md` et `agent-workflow.md`.
- `command`: relire `AGENTS.md` et `commands.toml`.
- `edit`: relire `AGENTS.md`, `mustflow.toml` et `agent-workflow.md` avant les modifications sensibles.
- `report`: relire `AGENTS.md`, `mustflow.toml` et `preferences.toml` avant le rapport final.
- `skill`: relire `AGENTS.md` et `skills/INDEX.md`.
- `full`: relire l’ordre de lecture complet de mustflow.

`before_command_run` signifie actualiser le contrat de commande quand c’est nécessaire avant l’exécution d’une commande. Cela ne signifie pas relire tout l’ensemble de documents mustflow avant chaque commande.

Les seuils par défaut sont 8 tours, 16 appels d’outils ou 100000 octets de sortie cumulée. La source de vérité est `.mustflow/config/mustflow.toml` `[refresh]`.

## Orientation CLI

De futures commandes comme `mf orient` et `mf refresh` pourront exposer cette politique sous forme de plan lisible par machine. Le modèle actuel commence par la politique et la documentation pour que les hôtes puissent l’adopter sans supposer que tous les outils partagent les mêmes points d’accroche de cycle de vie.
