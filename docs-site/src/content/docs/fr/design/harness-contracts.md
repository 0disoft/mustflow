---
title: Contrats d’exécution des agents
description: Comment mustflow prend en charge les cadres d’exécution optionnels longue durée tout en gardant explicites les limites de cycle de vie et de sécurité.
---

mustflow commence par des limites de flux de travail et de commandes locales au dépôt. Il peut aussi prendre en charge des cadres d’exécution optionnels longue durée lorsque le cycle de vie, l’approbation, l’isolation, la rétention et la vérification sont déclarés.

## Frontière

- Le modèle par défaut ne lance pas de workers, de personas, de flottes ni de bacs à sable dans le nuage.
- mustflow ne stocke pas de journaux bruts de session sans limite.
- mustflow ne remplace pas les plateformes d’agents hébergées ni les agents intégrés aux environnements de développement.
- mustflow définit des règles, des contrats de commande, des points de contrôle d’actualisation, des politiques de compaction, des reçus, des budgets, des approbations et des limites de passage de relais.

## Cerveau, mains, session

- Cerveau: `AGENTS.md`, `agent-workflow.md` et `skills/*/SKILL.md`.
- Mains: `commands.toml`, cycles de vie finis des commandes et `mf run`.
- Session: reçus d’exécution bornés, points de contrôle optionnels, résumés liés aux sources, passages de relais compacts et index régénérés.
- Juge: critères d’acceptation initiaux, fichiers modifiés, contrats de commande et reçus.

Ce cadrage garantit que mustflow reste neutre vis-à-vis des outils. Un hôte peut exécuter une seule session de discussion, un agent en arrière-plan dans le nuage ou une boucle d’orchestration externe, tandis que le contrat du dépôt reste lisible.

## Adopté actuellement

- Champs de politique dans `.mustflow/config/mustflow.toml`: `[harness]`, `[budget]`, `[approval]` et `[isolation]`.
- Règles de cliquet de vérification dans `agent-workflow.md`.
- Points de contrôle d’actualisation, politique de compaction par niveaux et rétention bornée.

Les résumés compactés servent de mémoire auxiliaire de priorité inférieure. Les instructions utilisateur actuelles, les fichiers actuels, les contrats de commande et les reçus d’exécution priment sur eux. mustflow ne stocke pas de chaînes de raisonnement cachées ni de transcriptions complètes de discussion dans le projet.

## Candidats d’expansion

`completion-judge`, les éléments de travail, les commandes d’écriture de passage de relais, les commandes de point de contrôle et les boucles autonomes sont des candidats d’expansion. Ils peuvent rejoindre le modèle ou la CLI lorsque leurs schémas, contrats de commande, règles de rétention et limites de décision humaine sont stables.
