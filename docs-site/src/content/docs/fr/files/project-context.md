---
title: .mustflow/context/PROJECT.md
description: Enregistre les objectifs, non-objectifs, termes et promesses du dépôt pour les agents.
---

`.mustflow/context/PROJECT.md` est le fichier de contexte de projet par défaut installé par `mf init`.

Il doit rester court. Ce n’est pas un document d’architecture complet, une feuille de route, une référence d’API, un journal de réunion ni une archive de résumés générés.

## Où il est utilisé

- Donne aux agents l’orientation du projet lorsqu’une tâche peut affecter le périmètre, le comportement ou les promesses générales du dépôt.
- Enregistre les non-objectifs afin que les agents n’étendent pas du travail sans rapport.
- Liste les termes du domaine et les zones demandant une attention particulière qui influencent les décisions d’implémentation.

## Autorité

L’autorité par défaut est `contextual`.

Cela signifie que le fichier aide à orienter l’agent, mais qu’il a une autorité inférieure aux instructions directes de l’utilisateur, au code actuel, aux tests, aux contrats de commande et aux politiques configurées.

S’il entre en conflit avec les fichiers actuels, les agents doivent signaler le conflit et traiter ce contexte comme obsolète.

## Sections

- `Current Goal`: objectif actuel du projet. Laisser vide plutôt que d’en inventer un.
- `Non-Goals`: sujets que les agents ne doivent pas étendre pendant des tâches sans rapport.
- `Core Promises`: promesses générales du dépôt que les agents doivent préserver.
- `Domain Terms`: termes qui influencent les décisions d’implémentation.
- `Extra Care Areas`: chemins, API, fichiers générés, migrations, secrets ou surfaces de compatibilité qui exigent de la prudence.
- `Read Next`: fichiers à lire après ce contexte.
- `Staleness Check`: manière de détecter que le fichier est obsolète.
