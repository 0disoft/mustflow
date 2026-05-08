---
title: .mustflow/skills/INDEX.md
description: Un index qui dirige les agents vers le document de skill approprie pour une tache.
---

`.mustflow/skills/INDEX.md` aide les agents a choisir le bon document de skill avant les taches repetables.

## Utilisation

Apres les regles communes et le contrat de commandes, les agents consultent cet index quand une tache correspond a une procedure predefinie.

Ce fichier ne doit pas contenir les details complets de procedure. Il relie des champs de routage compacts aux chemins de skill : declencheur, entree requise, perimetre de modification, risque, intentions de verification et sortie attendue.
`mf check --strict` compare ces routes aux fichiers `SKILL.md` references pour signaler les documents manquants, skills non listees, intentions inconnues, derives d'intentions et derive de structure de table.

## Comportement de selection

Les agents utilisent cet index au debut de la tache et avant la premiere modification. Ils comparent la demande utilisateur et les fichiers prevus aux declencheurs listes, puis lisent chaque `SKILL.md` correspondant avant de modifier ce perimetre.

Si une nouvelle condition apparait pendant la tache, comme un echec de commande, un changement de contrat de test ou une modification documentaire, ils doivent s'arreter et lire la skill correspondante avant de continuer.

Si aucun declencheur ne s'applique, ils ne doivent pas inventer de skill. Ils continuent avec `AGENTS.md`, `.mustflow/docs/agent-workflow.md` et `.mustflow/config/commands.toml`.

## Role et responsabilites

- Liste les skills disponibles et definit des declencheurs precis.
- Indique l'entree requise, le perimetre de modification, le risque et la sortie attendue de chaque route.
- Precise les intentions de commande referencees par chaque skill.
- Garde les routes compactes afin que les details de procedure restent dans chaque `SKILL.md`.

## Regles d'ecriture

L'index doit rester concis et facile a parcourir.

Les details de procedure doivent rester dans chaque `SKILL.md`. L'index ne doit contenir que les champs de route aidant l'agent a decider quelle skill lire et quelles preuves rapporter.

## Structure de table

- **Declencheur**: condition de tache qui justifie la lecture de la skill.
- **Document de skill**: chemin vers le `SKILL.md` correspondant.
- **Entree requise**: preuve ou donnee necessaire avant l'application.
- **Perimetre de modification**: fichiers ou surface que la skill peut guider.
- **Risque**: principal mode d'echec controle par la route.
- **Intentions de verification**: noms d'intentions de `commands.toml` pouvant etre pertinents.
- **Sortie attendue**: forme de rapport attendue apres l'utilisation de la skill.

Lors de l'ajout d'une skill, ajoutez sa route ici et gardez les intentions de verification synchronisees avec le frontmatter.