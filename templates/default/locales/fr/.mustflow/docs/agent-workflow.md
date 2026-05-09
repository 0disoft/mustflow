---
mustflow_doc: docs.agent-workflow
locale: fr
canonical: false
revision: 12
lifecycle: mustflow-owned
authority: workflow-policy
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

## Activation Des Skills

Les skills sont des procedures de tache, pas des outils autonomes. Activer une skill signifie lire
le `.mustflow/skills/<name>/SKILL.md` correspondant et suivre sa procedure dans le contrat de
commandes actuel.

Au debut d'une tache et avant la premiere edition:

1. Lire `.mustflow/skills/INDEX.md`.
2. Comparer la tache actuelle aux scenarios listes.
3. Lire chaque `SKILL.md` correspondant avant de modifier cette partie du travail.
4. Si aucune skill ne s'applique, faire le plus petit changement prudent sous `AGENTS.md` et
   `.mustflow/config/commands.toml`.

Activer une skill plus tard si une nouvelle preuve change le type de tache. Par exemple, une
commande configuree qui echoue active failure triage, un changement de contrat de test active
test maintenance, et un changement de documentation ou de workflow active docs update.

Quand plusieurs skills s'appliquent, suivre la skill la plus specifique pour chaque portee
affectee et combiner uniquement leurs command intents declares. Les skills n'autorisent jamais
des commandes shell brutes, des processus longue duree ni des ecritures hors de la portee de la tache.

Quand une skill est utilisee, ou quand une skill plausible est volontairement ignoree, signalez
brievement le nom de la skill et la raison de selection dans la prochaine mise a jour utilisateur
ou dans le rapport final. Ne creez pas de worklog versionne uniquement pour enregistrer la selection
des skills.

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

## Politique D'Impact De Version

Les reglages d'impact de version sont des preferences du depot. Ils guident les modifications de
fichiers de version, mais ne remplacent pas les instructions utilisateur directes, les regles de
securite de l'hote ni les controles d'approbation dans `.mustflow/config/mustflow.toml`.

Utiliser `[release.versioning]` dans `.mustflow/config/preferences.toml` quand le code, les modeles,
les schemas, le comportement CLI, les metadonnees du paquet, la documentation visible par l'utilisateur,
la sortie d'installation ou les tests changent.

- `impact_check = true`: signaler si le diff semble exiger un changement de version du paquet ou du modele.
- `suggest_bump = true`: suggerer patch, minor ou major lorsque les preuves sont claires.
- `auto_bump = true`: appliquer le changement de version de paquet ou de modele approprie quand
  l'impact est clair, que la source de version est localisee et qu'aucune regle utilisateur, hote
  ou approbation plus stricte ne le bloque.
- `auto_bump = false`: laisser les fichiers de version de paquet et de modele inchanges sauf si
  l'utilisateur demande un changement de version ou une preparation de release.
- `require_user_confirmation = true`: demander confirmation avant d'editer les fichiers de version.
- `require_user_confirmation = false`: ne pas ajouter d'etape de confirmation separee quand
  `auto_bump = true`.

Avant de suggerer ou d'appliquer un changement de version, localiser la source de version propre au depot.
Ne pas supposer que `package.json` est le seul fichier de version. Examiner les manifests, documents de
release et schemas de mise a jour existants correspondant aux langages et frameworks du depot, puis
signaler quels fichiers font autorite et quels fichiers sont derives.

Candidats courants de source de version:

- JavaScript ou TypeScript: `package.json` et lockfiles quand ils dupliquent les metadonnees du paquet.
- Python: `pyproject.toml`, `setup.cfg`, `setup.py` ou fichiers `__version__` du paquet.
- Rust: `Cargo.toml`; considerer `Cargo.lock` seulement si le depot traite le lockfile comme metadonnee de release.
- Go: tags et documentation de release d'abord; `go.mod` seulement si le chemin du module ou les metadonnees d'outils sont pertinents.
- Java ou Kotlin: `pom.xml`, `build.gradle`, `build.gradle.kts` ou `gradle.properties`.
- .NET: `*.csproj`, `Directory.Build.props` ou `*.nuspec`.
- Ruby, PHP, Dart ou Swift: `*.gemspec`, `lib/**/version.rb`, `composer.json`, `pubspec.yaml` ou `Package.swift`.
- Conteneurs, charts ou apps: `Chart.yaml`, labels d'image, manifests d'application, notes de release ou metadonnees de deploiement.
- Modeles mustflow: metadonnees du paquet, manifests de modele, exemples de documentation et tests qui verifient les versions installees.

Quand une version change, garder les metadonnees du paquet, les versions de manifests de modeles,
les exemples de documentation et les tests synchronises selon les preferences `sync_*`.

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

## File De Revision De Documentation

Lorsqu'un agent cree ou modifie une documentation visible par les utilisateurs, de workflow, de
modele, de contexte ou de skill, enregistre le document avec `mf docs review add <path>` sauf si
l'utilisateur demande explicitement de ne pas le suivre. La file est stockee dans
`.mustflow/review/docs.toml` et n'est creee que lorsque c'est necessaire.

La revision peut etre terminee par un humain, un LLM, un outil ou un processus externe. Enregistre
seulement le type large de reviseur et des identifiants libres comme l'id du reviseur, le fournisseur,
le modele, l'intention de commande et le resume. Ne maintiens pas de liste fixe de produits LLM
specifiques.

Utilise `mf docs review approve <path> --reviewer-kind <kind> --reviewer-id <id>` pour masquer un
document approuve de la liste par defaut tout en gardant l'historique. Utilise `needs-human` lorsque
le reviseur ne peut pas approuver avec confiance, et `ignore` seulement lorsque le depot decide
intentionnellement de sauter la revision.

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

## Selection De Verification

Utiliser `[verification.selection]` dans `.mustflow/config/preferences.toml` pour choisir l'etendue de verification.
Ces preferences n'accordent pas l'autorisation d'executer des commandes. Elles indiquent seulement quels command intents configures examiner.

La verification doit etre proportionnelle au risque. Preferer `test_related`, `test_fast`, `build`
ou les controles propres a la documentation quand ils sont configures et couvrent la surface modifiee.
Utiliser les suites completes larges pour les comportements transversaux, le risque de release,
l'absence de couverture plus etroite ou quand la politique configuree les exige explicitement. Si
un intent plus etroit conviendrait mais est `unknown`, `manual_only` ou absent, signaler ce manque
au lieu de traiter silencieusement la suite la plus lente comme valeur normale.

- `strategy = "risk_based"`: preferer les controles configures les plus petits qui couvrent le comportement change, la surface publique, le contrat de commandes et la zone de risque.
- `strategy = "targeted"`: preferer les controles directement lies sauf si l'utilisateur, une skill ou une politique exige une couverture plus large.
- `strategy = "full"`: preferer toute la suite de verification configuree applicable.
- `prefer_related_tests = true`: chercher un intent de test plus etroit et pertinent avant un intent large.
- `skip_docs_only_full_test = true`: les changements de documentation seuls peuvent eviter les tests larges quand la validation docs couvre la surface modifiee.
- `skip_translation_only_full_test = true`: les changements de traduction seuls peuvent eviter les tests larges quand le comportement source n'a pas change.
- `skip_copy_only_full_test = true`: les changements de texte seuls peuvent eviter les tests larges quand aucun comportement, schema, modele ou contrat de commande n'a change.
- `report_skipped = true`: le rapport final doit nommer les controles omis et la raison.

Si des indices montrent que comportement, securite, donnees, contrats de commandes, sortie de release ou modeles generes ont change,
ne pas utiliser une preference d'omission pour masquer le risque. Passer a l'intent configure pertinent ou signaler que l'intent requis manque.

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

Utiliser `[testing.authoring]` dans `.mustflow/config/preferences.toml` pour guider la facilite
avec laquelle les agents creent de nouveaux tests. La valeur par defaut
`new_test_policy = "evidence_required"` signifie qu'un nouveau test doit etre appuye par une preuve
de contrat de comportement, comme un comportement public modifie, un risque de regression, une regle
de configuration, un contrat de schema ou un chemin de securite/donnees. Cette preference guide
seulement l'ecriture des tests; elle n'affaiblit pas la verification requise et ne justifie pas la
suppression de tests valides.

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
