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
- `Activation des skills`: définit quand les agents doivent choisir et lire les procédures de skill.
- `Pre-work checks`: demande aux agents d’inspecter les changements, chemins protégés, intentions de commande et skills pertinents.
- `Input stability policy`: garde les données volatiles loin du haut des fichiers de lecture obligatoire.
- `Instruction refresh policy`: définit quand les longues sessions doivent relire les instructions mustflow.
- `Context compaction policy`: explique les limites et l’ordre d’autorité entre contexte récent dérivé, résumés intermédiaires et longs résumés.
- `Surfaces d’exécution et de runtime`: explique comment les fichiers de flux de travail locaux peuvent s’étendre vers des surfaces optionnelles de runtime, coordination, éléments de travail, adaptateurs et harness.
- `Long-running task phases`: définit planification, travail, vérification, jugement et passage de relais.
- `Verification ratchet`: empêche les agents d’affaiblir les contrôles pour paraître terminés.
- `Test relevance policy`: garde les tests alignés avec le contrat de comportement actuel.
- `Preference interpretation policy`: explique comment appliquer les valeurs par défaut de langue, formatage, commit et journalisation depuis `preferences.toml`.
- `Git behavior policy`: désactive l’ajout à l’index Git, les commits et les pushes automatiques, et traite les suggestions de message de commit comme du contenu de rapport.
- `Politique d’impact de version`: vérifie si un changement doit suggérer une montée de version tout en gardant les modifications automatiques de version désactivées par défaut.
- `Command execution policy`: autorise uniquement les intentions de commande finies déclarées dans `commands.toml`.
- `Edit policy`: limite les changements aux fichiers directement liés.
- `Verification policy`: explique quelles intentions de commande vérifier après les changements.
- `Failure handling policy`: enregistre l’intention échouée, le répertoire de travail, le code de sortie et l’erreur clé.
- `Security and secret handling policy`: empêche l’exposition de jetons, clés privées et vraies valeurs d’environnement.
- `Document flow maintenance`: indique aux mainteneurs quel fichier mustflow mettre à jour lorsque les règles, commandes, skills ou chemins protégés changent.

## Politique d’exécution des commandes

La source de vérité des commandes exécutables est `.mustflow/config/commands.toml`.

Les agents ne peuvent exécuter que les intentions de commande qui satisfont toutes les portes d’exécution: `status = "configured"`, `lifecycle = "oneshot"`, `run_policy = "agent_allowed"`, `stdin = "closed"`, un `timeout_seconds` positif, une commande déclarée via `argv` ou `mode = "shell"` plus `cmd`, et un `cwd` dans la racine mustflow actuelle. Si une intention manque, vaut `unknown`, `not_applicable`, `manual_only` ou `disabled`, les agents ne doivent pas déduire une commande de remplacement et doivent signaler la raison de l’omission.

Dans les nouvelles configurations, utilisez `manual_only` comme `status` d’intention. `run_policy = "manual_only"` peut être accepté pour les anciennes configurations, mais les nouveaux modèles ne le génèrent pas.

Les intentions configurées doivent utiliser un tableau `argv` lorsque c’est possible. Utilisez `mode = "shell"` et `cmd` uniquement lorsque la syntaxe shell est réellement nécessaire.

N’exécutez pas directement les commandes de cycle de vie `server`, `watch`, `interactive`, `browser` ou `background`. Les serveurs de développement, le mode watch, l’interface navigateur et les processus en arrière-plan ne sont pas des commandes de validation finies.

Lorsque `mf run <intent>` est disponible, préférez-le pour les commandes finies.

Le choix de vérification est fondé sur le risque. Les agents doivent préférer les tests liés,
les contrôles rapides, les builds ou la validation de documentation lorsque ces intentions couvrent
la surface modifiée, et signaler l’absence d’une intention plus étroite au lieu d’utiliser
silencieusement une suite complète lente.

`mf run` écrit le dernier résultat d’exécution dans `.mustflow/state/runs/latest.json` comme reçu d’exécution.
Utilisez `mf run <intent> --json` lorsqu’une automatisation ou un rapport final a besoin d’une preuve structurée.
Le reçu documente une seule exécution; la source de vérité de la définition de commande reste `commands.toml`.

Les shells du host peuvent exécuter des commandes, mais les commandes de projet lancées directement ne comptent pas automatiquement comme vérification mustflow.
Si une commande contourne `mf run`, traitez sa sortie comme un contexte de moindre confiance, sauf si l’utilisateur a explicitement approuvé une exception manuelle et si le rapport final indique qu’aucun reçu `mf run` n’a été produit.

`mf context --json` est un index en lecture seule qui affiche rapidement l’ordre de lecture, les intentions de commande, les capacités et le dernier résumé d’exécution pour la racine actuelle. Il ne remplace pas la lecture des vrais documents et fichiers de configuration, et les commandes de test ou de construction du projet suivent toujours le contrat d’intention dans `commands.toml`.

`mf doctor` ou `mf doctor --json` est une commande de diagnostic en lecture seule qui combine l’état d’installation, le résultat de vérification, les intentions de commande exécutables et les prochaines étapes avant modification. Elle n’écrit pas de fichiers; les agents peuvent donc l’utiliser pour une première orientation.

Après modification de documents mustflow, de skills, de contrats de commande ou de règles de génération de carte du dépôt, exécutez `mf check --strict` lorsque c’est possible. Cela ajoute des contrôles pour les blocs de commandes shell brutes dans les documents de skill, les métadonnées volatiles dans `REPO_MAP.md`, les limites de sortie de commande, la politique de rétention, les tailles de fichiers générés, les traces de journaux JSONL bruts et le format du dernier reçu d’exécution.

## Activation des skills

Les skills sont des procédures de tâche, pas des outils autonomes. Activer une skill signifie lire
le `.mustflow/skills/<name>/SKILL.md` correspondant et suivre cette procédure dans le contrat de
commandes actuel.

Au début d’une tâche et avant la première modification, les agents comparent la demande utilisateur
et les fichiers qui devraient changer avec `.mustflow/skills/INDEX.md`. Si un ou plusieurs scénarios
correspondent, ils lisent les `SKILL.md` correspondants avant de modifier cette portée. Si une
nouvelle preuve apparaît ensuite, comme un échec de commande, un changement de contrat de test ou
un changement de documentation, ils s’arrêtent et activent la skill devenue pertinente.

Les skills n’autorisent jamais les commandes shell brutes, les processus longue durée ni les écritures
hors du périmètre de la tâche. Elles ne remplacent pas non plus les règles utilisateur, host, dépôt ou sécurité.

## Stabilité des entrées

Gardez la politique partagée dans ce document et les commandes exécutables dans `commands.toml`.

Déplacez les procédures répétables vers `.mustflow/skills/`, et ne copiez pas toute la politique partagée dans chaque document de skill.

Gardez l’orientation du projet et les promesses de domaine dans `.mustflow/context/`. Les agents doivent lire `.mustflow/context/INDEX.md` uniquement lorsqu’un contexte propre à la tâche est nécessaire, puis lire seulement les fichiers de contexte sélectionnés.

Les fichiers de contexte ont une autorité inférieure aux instructions directes de l’utilisateur, au code actuel, aux tests, aux contrats de commande et aux politiques configurées. Si `DESIGN.md` existe, utilisez-le comme ancre externe optionnelle de design visuel pour les travaux d’interface utilisateur au lieu de dupliquer les jetons de design dans `.mustflow/context/`.

Gardez la carte de navigation du dépôt dans le `REPO_MAP.md` généré au lieu d’agrandir ce document. `REPO_MAP.md` est une carte de fichiers d’ancrage plutôt qu’une liste complète de fichiers; il ne fait pas partie de l’ordre de lecture obligatoire et doit être lu uniquement lorsqu’une navigation large est nécessaire.

Ne placez pas de valeurs volatiles comme des heures générées, des hashes, des nombres de fichiers, des résumés de changements récents ou de longs journaux près du haut de ce fichier.

N’ajoutez pas continuellement des transcriptions complètes de discussion, des sorties complètes du terminal ou des journaux d’événements JSONL bruts sous `.mustflow/`. Gardez les résultats d’exécution sous forme de petits reçus d’exécution, et gardez les fichiers de connaissances sous forme de résumés avec sources plutôt que de journaux bruts.

## Couloirs de règles effectives

Ne réduisez pas toutes les instructions à une seule liste de priorité. Résolvez les conflits selon le type de règle:

- Objectif utilisateur: les instructions directes actuelles de l’utilisateur définissent la tâche sauf si elles sont dangereuses.
- Sécurité du host: les portes d’approbation, de sandbox, de checkpoint et d’exécution shell du host restent contraignantes.
- Règles de travail du dépôt: le `AGENTS.md` le plus proche et `.mustflow/config/*.toml` définissent le contrat du dépôt.
- Exécution des commandes: `.mustflow/config/commands.toml` définit le contrat de commandes du projet.
- Preuve de vérification: les reçus `mf run` et les fichiers actuels ont plus de poids que la sortie shell directe du host.
- Contexte et préférences: `.mustflow/context/*`, `preferences.toml` et les cartes générées sont des valeurs par défaut de moindre autorité.
- État de session et cache: les résumés du host, `.mustflow/cache/**` et `.mustflow/state/**` ne remplacent jamais les fichiers actuels ni les instructions actuelles de l’utilisateur.

Les ensembles d’actions autorisées se réduisent par intersection. Les actions refusées, exigences d’approbation, règles de confidentialité et règles de commandes destructives s’accumulent. Si la règle effective n’est pas claire, arrêtez-vous et signalez le conflit au lieu de deviner.

## Actualisation des instructions

Les longues sessions peuvent diluer les instructions chargées au début de la tâche. `agent-workflow.md` traite cela comme un problème de point de contrôle, pas comme une raison d’écrire des compteurs de tours dans le dépôt.

Les agents doivent actualiser les instructions mustflow avant la première modification, avant l’exécution de commandes lorsque l’intention de commande actuelle n’a pas déjà un rafraîchissement récent, après la compaction du contexte, après modification de `AGENTS.md` ou `.mustflow/**`, après changement de racine et avant le rapport final.

L’ensemble exact de fichiers vient de `[refresh.levels]` dans `.mustflow/config/mustflow.toml`.

## Politique de compaction du contexte

Les résumés compactés créés pendant de longues sessions sont une mémoire d’aide dérivée. `agent-workflow.md` indique qu’ils ont une autorité inférieure aux instructions utilisateur actuelles, au code et à la configuration actuels, aux contrats de commande et aux reçus d’exécution.

Ne stockez pas de chaînes de raisonnement cachées, de secrets ni de transcriptions complètes de discussion sans limite dans le projet. Les connaissances partagées du projet ne doivent être promues que sous forme de décisions, d’investigations ou de résumés de passage de relais liés aux sources.

## Surfaces d’exécution et de runtime

mustflow commence par des fichiers de flux de travail locaux au dépôt et des limites d’exécution de commandes. Il peut s’étendre vers des surfaces optionnelles de runtime, de coordination, d’éléments de travail, d’adaptateurs et de harness lorsque ces surfaces sont explicites, bornées et vérifiables.

- Surface du cerveau: `AGENTS.md`, `agent-workflow.md` et documents de skill.
- Surface des mains: `commands.toml`, `mf run` et cycles de vie finis des commandes.
- Surface de session: reçus d’exécution bornés, résumés liés aux sources, enregistrements compacts de passage de relais et futurs éléments de travail.
- Surface de jugement: objectifs initiaux, critères d’acceptation, fichiers modifiés, contrats de commande et reçus.
- Surface runtime: workers, personas, flottes, processus de service et boucles autonomes exigent des règles déclarées de cycle de vie, rétention, isolation, approbation et vérification.

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

Ces valeurs sont des préférences de dépôt, pas des autorisations. Elles ne remplacent pas les instructions directes de l’utilisateur, `.mustflow/config/commands.toml` ni la politique d’approbation dans `.mustflow/config/mustflow.toml`. En particulier, `git.auto_commit = true` n’accorde pas l’autorisation de push, et `git.auto_push = true` ne peut pas être activé via `mf init`.

Sans demande explicite de l’utilisateur, les agents ne doivent pas ajouter à l’index Git, créer de commit, modifier un commit, rebaser, réinitialiser, pousser ou changer autrement l’état ou l’historique Git.

La suggestion de message de commit fait partie du rapport final, pas d’une permission d’exécution Git. Lorsque des fichiers ont changé et que les suggestions de commit sont activées, les agents peuvent suggérer un message de commit, mais ne doivent pas laisser entendre qu’un commit a été créé.

## Politique d’impact de version

`[release.versioning]` dans `.mustflow/config/preferences.toml` contrôle les préférences d’impact de version, y compris si les agents peuvent modifier les fichiers de version après avoir localisé la source de version réelle du dépôt.

Lorsque le code, les modèles, les schémas, le comportement CLI, les métadonnées du paquet, la documentation visible par l’utilisateur, la sortie d’installation ou les tests changent, les agents doivent vérifier si le changement semble exiger une mise à jour de version du paquet ou du modèle.

Par défaut, mustflow peut appliquer une montée patch, minor ou major lorsque les indices sont clairs, que la source de version est localisée et que `auto_bump = true` avec `require_user_confirmation = false`. Une instruction directe de l’utilisateur, une règle de sécurité de l’hôte ou une politique d’approbation bloque toujours les modifications automatiques de version.

Avant de suggérer ou d’appliquer un changement de version, l’agent doit trouver la source de version réelle du dépôt au lieu de supposer qu’il s’agit de `package.json`. Les candidats courants incluent `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod` avec les tags de release, `pom.xml`, `build.gradle`, `*.csproj`, `*.gemspec`, `composer.json`, `pubspec.yaml`, `Package.swift`, `Chart.yaml`, les manifestes d’application, les notes de release et les manifestes de modèles mustflow.

Lorsqu’une version change, les métadonnées du paquet, les versions de manifeste de modèle, les exemples de documentation et les tests doivent rester synchronisés selon les préférences `sync_*`.
