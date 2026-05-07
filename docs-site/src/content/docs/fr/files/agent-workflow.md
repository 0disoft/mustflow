---
title: .mustflow/docs/agent-workflow.md
description: Décrit comment un agent démarre, modifie, vérifie et clôture le travail dans le dépôt.
---

`.mustflow/docs/agent-workflow.md` décrit le flux de travail propre au dépôt pour les agents.

## Où il est utilisé

Si `AGENTS.md` est le court fichier de règles à lire en premier, ce fichier développe ces règles en politique de travail partagée.

Les agents le lisent après `AGENTS.md` pour comprendre l’exécution des commandes, la stabilité des entrées, la compaction du contexte, le périmètre de modification, la vérification, la gestion des échecs et la gestion des secrets.

## Composants

- `Document role`: définit ce que ce fichier possède.
- `Authoritative documents and reading flow`: liste les fichiers que les agents lisent en premier.
- `Project context`: explique quand lire `.mustflow/context/INDEX.md` et les fichiers de contexte propres à une tâche.
- `Pre-work checks`: demande aux agents d’inspecter les changements, chemins protégés, intentions de commande et skills pertinents.
- `Input stability policy`: garde les données volatiles loin du haut des fichiers de lecture obligatoire.
- `Instruction refresh policy`: définit quand les longues sessions doivent relire les instructions mustflow.
- `Context compaction policy`: explique les limites et l’ordre d’autorité entre contexte brut récent, résumés intermédiaires et longs résumés.
- `Harness contract boundary`: sépare les contrats du dépôt des environnements d’exécution des agents.
- `Long-running task phases`: définit planification, travail, vérification, jugement et passage de relais.
- `Verification ratchet`: empêche les agents d’affaiblir les contrôles pour paraître terminés.
- `Test relevance policy`: garde les tests alignés avec le contrat de comportement actuel.
- `Preference interpretation policy`: explique comment appliquer les valeurs par défaut de langue, formatage, commit et journalisation depuis `preferences.toml`.
- `Git behavior policy`: désactive l’ajout à l’index Git, les commits et les pushes automatiques, et traite les suggestions de message de commit comme du contenu de rapport.
- `Command execution policy`: autorise uniquement les intentions de commande finies déclarées dans `commands.toml`.
- `Edit policy`: limite les changements aux fichiers directement liés.
- `Verification policy`: explique quelles intentions de commande vérifier après les changements.
- `Failure handling policy`: enregistre l’intention échouée, le répertoire de travail, le code de sortie et l’erreur clé.
- `Security and secret handling policy`: empêche l’exposition de jetons, clés privées et vraies valeurs d’environnement.
- `Document flow maintenance`: indique aux mainteneurs quel fichier mustflow mettre à jour lorsque les règles, commandes, skills ou chemins protégés changent.

## Politique d’exécution des commandes

La source de vérité des commandes exécutables est `.mustflow/config/commands.toml`.

Les agents ne peuvent exécuter que les intentions de commande avec `status = "configured"`, `lifecycle = "oneshot"`, `run_policy = "agent_allowed"` et `stdin = "closed"`. Si une intention manque, vaut `unknown`, `not_applicable`, `manual_only` ou `disabled`, les agents ne doivent pas déduire une commande de remplacement et doivent signaler la raison de l’omission.

Les intentions configurées doivent utiliser un tableau `argv` lorsque c’est possible. Utilisez `mode = "shell"` et `cmd` uniquement lorsque la syntaxe shell est réellement nécessaire.

N’exécutez pas directement les commandes de cycle de vie `server`, `watch`, `interactive`, `browser` ou `background`. Les serveurs de développement, le mode watch, l’interface navigateur et les processus en arrière-plan ne sont pas des commandes de validation finies.

Lorsque `mf run <intent>` est disponible, préférez-le pour les commandes finies.

`mf run` écrit le dernier résultat d’exécution dans `.mustflow/state/runs/latest.json` comme reçu d’exécution.
Utilisez `mf run <intent> --json` lorsqu’une automatisation ou un rapport final a besoin d’une preuve structurée.
Le reçu documente une seule exécution; la source de vérité de la définition de commande reste `commands.toml`.

`mf context --json` est un index en lecture seule qui affiche rapidement l’ordre de lecture, les intentions de commande, les capacités et le dernier résumé d’exécution pour la racine actuelle. Il ne remplace pas la lecture des vrais documents et fichiers de configuration, et les commandes de test ou de construction du projet suivent toujours le contrat d’intention dans `commands.toml`.

`mf doctor` ou `mf doctor --json` est une commande de diagnostic en lecture seule qui combine l’état d’installation, le résultat de vérification, les intentions de commande exécutables et les prochaines étapes avant modification. Elle n’écrit pas de fichiers; les agents peuvent donc l’utiliser pour une première orientation.

Après modification de documents mustflow, de skills, de contrats de commande ou de règles de génération de carte du dépôt, exécutez `mf check --strict` lorsque c’est possible. Cela ajoute des contrôles pour les blocs de commandes shell brutes dans les documents de skill, les métadonnées volatiles dans `REPO_MAP.md`, les limites de sortie de commande, la politique de rétention, les tailles de fichiers générés, les traces de journaux JSONL bruts et le format du dernier reçu d’exécution.

## Stabilité des entrées

Gardez la politique partagée dans ce document et les commandes exécutables dans `commands.toml`.

Déplacez les procédures répétables vers `.mustflow/skills/`, et ne copiez pas toute la politique partagée dans chaque document de skill.

Gardez l’orientation du projet et les promesses de domaine dans `.mustflow/context/`. Les agents doivent lire `.mustflow/context/INDEX.md` uniquement lorsqu’un contexte propre à la tâche est nécessaire, puis lire seulement les fichiers de contexte sélectionnés.

Les fichiers de contexte ont une autorité inférieure aux instructions directes de l’utilisateur, au code actuel, aux tests, aux contrats de commande et aux politiques configurées. Si `DESIGN.md` existe, utilisez-le comme ancre externe optionnelle de design visuel pour les travaux d’interface utilisateur au lieu de dupliquer les jetons de design dans `.mustflow/context/`.

Gardez la carte de navigation du dépôt dans le `REPO_MAP.md` généré au lieu d’agrandir ce document. `REPO_MAP.md` est une carte de fichiers d’ancrage plutôt qu’une liste complète de fichiers; il ne fait pas partie de l’ordre de lecture obligatoire et doit être lu uniquement lorsqu’une navigation large est nécessaire.

Ne placez pas de valeurs volatiles comme des heures générées, des hashes, des nombres de fichiers, des résumés de changements récents ou de longs journaux près du haut de ce fichier.

N’ajoutez pas continuellement des transcriptions complètes de discussion, des sorties complètes du terminal ou des journaux d’événements JSONL bruts sous `.mustflow/`. Gardez les résultats d’exécution sous forme de petits reçus d’exécution, et gardez les fichiers de connaissances sous forme de résumés avec sources plutôt que de journaux bruts.

## Actualisation des instructions

Les longues sessions peuvent diluer les instructions chargées au début de la tâche. `agent-workflow.md` traite cela comme un problème de point de contrôle, pas comme une raison d’écrire des compteurs de tours dans le dépôt.

Les agents doivent actualiser les instructions mustflow avant la première modification, avant l’exécution de commandes, après la compaction du contexte, après modification de `AGENTS.md` ou `.mustflow/**`, après changement de racine et avant le rapport final.

L’ensemble exact de fichiers vient de `[refresh.levels]` dans `.mustflow/config/mustflow.toml`.

## Politique de compaction du contexte

Les résumés compactés créés pendant de longues sessions sont une mémoire d’aide dérivée. `agent-workflow.md` indique qu’ils ont une autorité inférieure aux instructions utilisateur actuelles, au code et à la configuration actuels, aux contrats de commande et aux reçus d’exécution.

Ne stockez pas de chaînes de raisonnement cachées, de secrets ni de transcriptions complètes de discussion sans limite dans le projet. Les connaissances partagées du projet ne doivent être promues que sous forme de décisions, d’investigations ou de résumés de passage de relais liés aux sources.

## Frontière du contrat d’exécution

mustflow n’est pas un environnement d’exécution autonome pour agents. Il fournit les contrats locaux au dépôt que les cadres d’exécution d’agents peuvent lire.

- Contrat du cerveau: `AGENTS.md`, `agent-workflow.md` et documents de skill.
- Contrat des mains: `commands.toml`, `mf run` et cycles de vie finis des commandes.
- Contrat de session: reçus d’exécution bornés, résumés liés aux sources et enregistrements compacts de passage de relais.
- Contrat de jugement: objectifs initiaux, critères d’acceptation, fichiers modifiés, contrats de commande et reçus.

## Phases des tâches longue durée

Le travail longue durée doit séparer planification, travail, vérification, jugement et passage de relais. La phase de jugement ne doit pas accepter seule l’affirmation de fin d’un worker. Elle vérifie les critères initiaux, les fichiers modifiés et les reçus d’exécution.

## Cliquet de vérification

Le flux de travail interdit d’affaiblir la validation pour donner l’impression que la tâche est terminée. Les agents ne doivent pas supprimer des tests en échec, assouplir des assertions sans explication, ignorer des intentions de commande pertinentes, changer l’état d’une intention de commande seulement pour éviter un échec, ni réécrire les critères d’acceptation après l’implémentation.

Les tests peuvent changer lorsque le comportement attendu a changé ou que les tests existants sont incorrects, mais le rapport final doit expliquer pourquoi.

## Politique de pertinence des tests

Les tests valident le contrat de comportement actuel. Les agents ne doivent pas réintroduire un comportement supprimé seulement parce que d’anciens tests l’attendent, et ne doivent pas préserver des tests pour des fonctionnalités supprimées intentionnellement.

Lorsque des tests sont supprimés ou des assertions affaiblies, distinguez le nettoyage du contrat actuel de l’évitement de validation. Si la pertinence est incertaine, signalez le candidat obsolète au lieu de le supprimer.

## Politique d’interprétation des préférences

`.mustflow/config/preferences.toml` contient des valeurs par défaut au niveau du dépôt, sous les instructions directes de l’utilisateur et le style local existant.

Les agents ne doivent pas utiliser ce fichier comme raison de reformater des fichiers entiers, de changer des fichiers sans rapport ou de traduire des chaînes de journal existantes sans raison liée à la tâche.

`preserve_existing` signifie que l’agent suit une convention existante visible. Dans un nouveau dépôt où aucune convention n’est visible, l’agent utilise la valeur `fallback` de chaque champ.

La langue de discussion de l’utilisateur ne doit pas déterminer automatiquement la langue des commentaires de code, des journaux, des messages d’erreur ou des messages de commit.

## Politique de comportement Git

`git.auto_stage`, `git.auto_commit` et `git.auto_push` valent tous `false` par défaut.

Sans demande explicite de l’utilisateur, les agents ne doivent pas ajouter à l’index Git, créer de commit, modifier un commit, rebaser, réinitialiser, pousser ou changer autrement l’état ou l’historique Git.

La suggestion de message de commit fait partie du rapport final, pas d’une permission d’exécution Git. Lorsque des fichiers ont changé et que les suggestions de commit sont activées, les agents peuvent suggérer un message de commit, mais ne doivent pas laisser entendre qu’un commit a été créé.
