---
mustflow_doc: docs.agent-workflow
locale: fr
canonical: false
revision: 7
---

# Flux De Travail Agent

Ce document etend le routeur court dans `AGENTS.md`.
Il definit la boucle operationnelle par defaut pour les agents qui travaillent dans une racine mustflow.

## Orientation

Consulte les fichiers listes dans `AGENTS.md` avant de lancer des modifications. Utilise `mf doctor` pour un controle rapide, en lecture seule, de l'etat d'installation, des command intents configures et des prochaines etapes suggerees.

Utilise `REPO_MAP.md` uniquement comme carte de navigation generee pour la racine mustflow actuelle. Ce n'est pas une liste complete des fichiers et cela ne remplace pas la lecture des fichiers pertinents pour la tache.

## Contexte Du Projet

`.mustflow/context/` contient un contexte projet specifique a la tache pour les agents.
Ce n'est pas une archive generale de documentation.

- Lire `.mustflow/context/INDEX.md` seulement quand la tache exige du contexte projet, produit, domaine, interface, backend, donnees, securite ou operations.
- Lire uniquement les fichiers de contexte selectionnes par l'index.
- Traiter les fichiers de contexte comme secondaires par rapport aux instructions directes de l'utilisateur, au code actuel, aux tests, aux contrats de commandes et aux politiques configurees.
- Ne pas deduire des objectifs projet manquants, des non-objectifs, des promesses d'API, des regles de donnees ni des design tokens.
- Si `DESIGN.md` existe, le traiter comme une ancre externe optionnelle de design visuel pour le travail d'interface. Ne pas dupliquer ses design tokens dans `.mustflow/context/`.
- Si le contexte entre en conflit avec les fichiers ou commandes actuels, signaler le conflit et se reporter a la source de plus haute autorite.

## Stabilite Des Entrees

Traiter les instructions utilisateur, les fichiers locaux, les contrats de commandes et les rapports generes comme des sources distinctes.
Eviter de confondre ces sources.

- Les instructions directes de l'utilisateur sont prioritaires.
- Le `AGENTS.md` le plus proche est prioritaire sur des regles parentes plus larges.
- `.mustflow/config/preferences.toml` contient des valeurs par defaut, pas des exigences obligatoires.
- Les fichiers generes tels que `REPO_MAP.md`, `.mustflow/cache/**` et `.mustflow/state/**` peuvent devenir obsoletes.
- Les resumes compactes sont des representations derivees de l'etat. Le code actuel, la configuration, les enregistrements de commandes et les instructions utilisateur actuelles les remplacent.

Quand un fichier genere parait obsolete, rafraichis-le via la commande `mf` correspondante au lieu de l'editer manuellement.

## Voies De Regles Effectives

Ne reduis pas toutes les instructions a une seule liste de priorites. Resous les conflits selon le type de regle:

- Objectif utilisateur: les instructions directes actuelles de l'utilisateur definissent la tache sauf si elles sont dangereuses.
- Securite du host: les portes d'approbation, sandbox et execution du host restent valables quand elles sont plus strictes.
- Regles de travail du depot: utiliser le `AGENTS.md` le plus proche et `.mustflow/config/*.toml`.
- Execution de commandes: `.mustflow/config/commands.toml` est le contrat de commandes du projet.
- Preuves de verification: les recus `mf run` et les fichiers actuels ont plus de poids que la sortie directe du shell du host.
- Contexte et preferences: `.mustflow/context/*`, `preferences.toml` et les cartes generees sont des valeurs par defaut de moindre autorite.
- Etat de session et cache: les resumes du host, `.mustflow/cache/**` et `.mustflow/state/**` ne remplacent jamais les fichiers actuels ni les instructions utilisateur actuelles.

Les ensembles autorises se reduisent par intersection. Les actions interdites, exigences d'approbation,
regles de confidentialite et regles de commandes destructrices s'accumulent. Si la regle effective n'est
pas claire, arrete-toi et signale le conflit au lieu de deviner.

## Rafraichissement Des Instructions

Les longues sessions peuvent provoquer une derive des instructions. Traite le rafraichissement des instructions comme un point de controle obligatoire, pas comme un compteur dans les fichiers du projet.

Rafraichis les instructions mustflow a ces moments:

- debut de session
- debut d'une nouvelle tache
- avant la premiere edition
- avant l'execution de commandes lorsque la tache et l'intention de commande actuelles n'ont pas deja un rafraichissement de commande recent
- apres edition de `AGENTS.md` ou `.mustflow/**`
- apres changement de racine ou entree dans un depot imbrique
- apres compaction ou resume du contexte
- avant le rapport final
- apres le seuil configure de tours, d'appels d'outils ou de volume de sortie

Utilise `[refresh]` dans `.mustflow/config/mustflow.toml` pour choisir le niveau de rafraichissement:

- `light`: relire `AGENTS.md` et `.mustflow/docs/agent-workflow.md`
- `command`: relire `AGENTS.md` et `.mustflow/config/commands.toml`
- `edit`: relire `AGENTS.md`, `.mustflow/config/mustflow.toml` et `.mustflow/docs/agent-workflow.md` avant les modifications sensibles
- `report`: relire `AGENTS.md`, `.mustflow/config/mustflow.toml` et `.mustflow/config/preferences.toml` avant le rapport final
- `skill`: relire `AGENTS.md` et `.mustflow/skills/INDEX.md`
- `full`: relire la sequence complete de lecture mustflow

`before_command_run` est un point de controle de fraicheur pour l'intention de commande actuelle, pas une obligation de relire tous les fichiers avant chaque commande repetee lorsque le contrat de commande n'a pas change.

Ne pas ecrire de compteurs de tours, de compteurs de messages ni d'activite de session dans le depot. Si un hote d'agent suit l'etat de rafraichissement, il doit utiliser un cache local ou un etat gere par l'hote hors des documents versionnes du projet. Les skills peuvent decrire le comportement de rafraichissement, mais ne sont pas des hooks fiables de cycle de vie.

## Compaction Du Contexte

`compaction` n'est pas une fonction de collecte de donnees activee par defaut. C'est une politique de securite pour de futurs harnesses ou hosts. Le modele par defaut la garde desactivee et ne declare que des regles de securite.

Ne stocke pas de raisonnement cache, de secrets, de transcriptions completes, de sortie complete du terminal, d'evenements bruts ni de journaux bruts de commandes dans le projet. Si un host cree des resumes a l'avenir, ils doivent etre relies a leurs sources et rester moins autoritaires que les fichiers actuels et les instructions utilisateur actuelles.

## Limite Du Contrat De Harness

mustflow n'est pas un environnement autonome d'execution d'agents. C'est une couche de contrat locale au depot pour les harnesses d'agents.

- Contrat du cerveau: `AGENTS.md`, ce fichier de flux de travail et les documents de skills definissent le comportement modele attendu.
- Contrat des mains: `.mustflow/config/commands.toml` et `mf run` definissent une execution sure des commandes.
- Contrat de session: les enregistrements d'execution, points de controle bornes et handoffs compactes fournissent des preuves pour la reprise.

Ne cree pas de dossiers workers, de systemes de persona, d'orchestration de flotte, de journaux bruts d'evenements, ni de boucles autonomes, sauf si le depot ajoute explicitement ces surfaces optionnelles.

## Phases Des Taches Longue Duree

Pour les taches longue duree ou reprises, separe ces phases:

1. Plan: lire l'objectif de la tache, les regles du depot, le contrat de commandes et les criteres d'acceptation.
2. Travail: effectuer le plus petit changement sur et adapte a l'unite courante.
3. Verification: executer uniquement les command intents oneshot configures, de preference via `mf run`.
4. Evaluation: evaluer le resultat par rapport aux criteres d'acceptation originaux et aux recus d'execution.
5. Handoff: laisser un handoff compacte quand la tache est incomplete, bloquee ou necessite une continuation.

La phase d'evaluation ne doit pas considerer la declaration de completion du worker comme suffisante. Elle utilise l'objectif de la tache, les fichiers modifies, le contrat de commandes et les recus d'execution.

## Politique De Comportement Git

Les operations Git qui modifient l'etat ou l'historique sont refusees par defaut.

- `git.auto_stage = false`: ne pas preparer de fichiers sans demande utilisateur.
- `git.auto_commit = false`: ne pas creer de commit sans demande utilisateur.
- `git.auto_push = false`: ne pas pousser sans demande utilisateur.

Ces valeurs sont des preferences de depot, pas des autorisations. Elles ne remplacent pas les instructions directes de l'utilisateur, `.mustflow/config/commands.toml` ni la politique d'approbation dans `.mustflow/config/mustflow.toml`. En particulier, `git.auto_commit = true` n'accorde pas l'autorisation de push, et `git.auto_push = true` ne peut pas etre active via `mf init`.

## Politique D'Execution Des Commandes

Ne pas deduire les commandes a partir de `package.json`, `Makefile`, `justfile`, `Taskfile.yml` ou des fichiers source.
Utiliser `.mustflow/config/commands.toml` comme contrat de commandes.

Un command intent est eligible a l'usage agent uniquement quand toutes ces conditions sont vraies:

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- `timeout_seconds` est un entier positif
- La commande est declaree avec `argv`, ou avec `mode = "shell"` et `cmd`
- `cwd` reste dans la racine mustflow actuelle

`manual_only` est un statut pour les nouvelles configurations. `run_policy = "manual_only"` peut etre lu pour compatibilite avec les anciennes configurations, mais les nouveaux modeles doivent utiliser `status = "manual_only"`.

Preferer `mf run <intent>` pour que le projet recoive un enregistrement d'execution concis dans `.mustflow/state/runs/latest.json`.

Les shells du host peuvent executer des commandes, mais les commandes projet executees directement ne
comptent pas automatiquement comme verification mustflow. Si une commande contourne `mf run`, traite sa
sortie comme un contexte de confiance plus faible, sauf si l'utilisateur a approuve explicitement une
exception manuelle et si le rapport final indique qu'aucun recu d'execution mustflow n'a ete produit.

Ne pas executer directement des serveurs de developpement, watchers, lancements de navigateur, invites interactives ou processus en arriere-plan. Signaler plutot l'intent omis et sa raison.

## Politique D'Edition

Garder les changements dans le perimetre de la tache. Ne pas faire de refactorings opportunistes.
Ne pas modifier les chemins proteges de `.mustflow/config/mustflow.toml`.

Utiliser le style existant du projet. Si le style n'est pas clair, appliquer les valeurs par defaut dans `.mustflow/config/preferences.toml`.

Les fichiers generes doivent etre rafraichis via des outils:

- `REPO_MAP.md` via `mf map --write`
- `.mustflow/cache/mustflow.sqlite` via `mf index`
- `.mustflow/state/runs/latest.json` via `mf run <intent>`

## Verification

Utiliser les command intents configures pour les controles. Noms d'intent typiques:

- `mustflow_check`
- `test`
- `lint`
- `build`
- `docs_validate`

Si un intent attendu est manquant, desactive, manuel uniquement ou non configure, ne pas inventer de remplacement.
Signaler ce qui a ete omis et pourquoi.

## Verrou De Verification

Ne pas affaiblir la validation pour donner l'impression que la tache est terminee.

Les agents ne doivent pas:

- supprimer des tests en echec pour faire passer les controles
- affaiblir des assertions sans expliquer pourquoi
- ignorer des command intents pertinents
- marquer des command intents `not_applicable` uniquement pour eviter un echec
- changer les criteres d'acceptation apres implementation

Les agents peuvent mettre a jour des tests quand le comportement vise a change, quand l'ancien test est incorrect, ou quand le nouveau comportement exige une nouvelle couverture. Expliquer ce changement dans le rapport final.

## Politique De Pertinence Des Tests

Les tests sont des contrats de comportement, pas des artefacts permanents.

Les agents ne doivent pas:

- reintroduire un comportement supprime uniquement parce que d'anciens tests l'attendent
- conserver des tests pour des fonctionnalites supprimees intentionnellement
- supprimer des tests en echec uniquement pour faire passer la validation
- affaiblir des assertions sans expliquer le changement de comportement
- mettre a jour des snapshots uniquement pour faire passer les tests

Les agents peuvent mettre a jour ou supprimer des tests quand le comportement teste a ete retire intentionnellement, quand le contrat public a change, quand le test encode seulement des details d'implementation supprimes, quand la couverture est dupliquee par un test plus robuste, ou quand un snapshot est obsolete.

Quand des tests sont ajoutes, mis a jour, supprimes, ou identifies comme candidats obsoletes, signaler le contrat de comportement, les tests concernes, les commandes executees, les command intents omis et les risques de test restants.

## Budget, Approbation Et Isolation

Utiliser `.mustflow/config/mustflow.toml` pour la politique de securite des longues taches.

- `[budget]` limite les iterations, le temps mur, les executions de commandes, le volume de sortie et les echecs repetes.
- `[approval]` liste les actions qui exigent une approbation humaine avant de continuer.
- `[isolation]` decrit la limite preferee de worktree ou de sandbox pour les taches longue duree.

Quand une limite de budget ou une porte d'approbation est atteinte, arrete-toi et signale. Utilise un handoff seulement lorsque ce depot active explicitement un flux de handoff. Ne pas continuer en boucle.
Ne pas executer un travail autonome longue duree dans un worktree principal avec des changements sales quand la politique d'isolation exige un worktree ou une sandbox separee.

## Gestion Des Echecs

Quand une commande echoue:

1. Conserver le nom original du command intent.
2. Analyser le code de sortie et la fin tronquee de la sortie.
3. Identifier la cause racine la plus probable de l'echec.
4. Eviter de modifier des fichiers non lies.
5. Relancer la verification pertinente la plus ciblee apres correction.
6. Signaler les controles omis et les risques restants.

Ne pas stocker de journaux bruts complets, de secrets, de donnees client ni de longues transcriptions dans `.mustflow/`.

## Rapport

Les rapports finaux doivent inclure:

- Fichiers modifies
- Command intents executes
- Command intents omis avec raisons
- Resultat de verification
- Risque restant

Suggere des commits uniquement quand `.mustflow/config/preferences.toml` l'autorise.
