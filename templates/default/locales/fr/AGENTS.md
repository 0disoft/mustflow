---
mustflow_doc: agents.root
locale: fr
canonical: false
revision: 10
lifecycle: user-editable
authority: binding
---

# AGENTS.md

Ce fichier est le premier accord de travail qu'un agent de codage LLM doit lire dans ce depot.
Ce depot suit le flux de travail agent de mustflow.
Les details geres par mustflow se trouvent sous `.mustflow/`.

## Ordre De Lecture

1. `AGENTS.md`
2. `.mustflow/docs/agent-workflow.md`
3. `.mustflow/config/mustflow.toml`
4. `.mustflow/config/commands.toml`
5. `.mustflow/config/preferences.toml` si present
6. `.mustflow/skills/INDEX.md`
7. `.mustflow/context/INDEX.md` uniquement quand la tache demande du contexte projet, produit, domaine,
   interface, backend, donnees, securite ou operations
8. Les fichiers `.mustflow/context/<name>.md` correspondants, seulement s'ils sont selectionnes par l'index de contexte
9. Le fichier `.mustflow/skills/<name>/SKILL.md` correspondant
10. `REPO_MAP.md` uniquement quand une navigation plus large dans le depot est necessaire
11. Les fichiers source, de test et de documentation pertinents

## Regles Principales

- Ne pas annuler les changements utilisateur deja presents.
- Ne pas deduire les commandes a partir des fichiers de gestionnaire de paquets.
- Executer uniquement les definitions de commande dont `status` est `configured`, `lifecycle` est `oneshot`,
  et `run_policy` est `agent_allowed`.
- Preferer `mf run <intent>` pour les commandes oneshot configurees.
- Executer les command intents `mf run` en serie. Ne pas lancer un autre `mf run` tant qu'une
  intention configuree est encore en cours, surtout lorsqu'elle declare des `writes` non vides comme `dist/`.
- Choisir l'intention de verification configuree la plus etroite qui couvre le risque. Preferer
  les tests lies ou les controles rapides aux suites larges quand le contrat de commandes les
  expose, et signaler les intentions plus etroites manquantes au lieu d'utiliser en silence des
  tests complets lents.
- Ne pas lancer directement des serveurs de developpement, des modes watch, des interfaces navigateur, des invites interactives
  ou des processus en arriere-plan.
- Ne pas lancer de boucles autonomes, de processus worker, de systemes de persona, ni de processus harness longue duree,
  sauf si ce depot les configure explicitement.
- Suivre `[budget]`, `[approval]` et `[isolation]` dans `.mustflow/config/mustflow.toml` quand une tache
  peut durer longtemps ou toucher un etat sensible.
- Utiliser `mf doctor` ou `mf doctor --json` pour un controle de sante en lecture seule avant des changements larges.
- `mf context --json` peut aider pour une orientation lisible par machine, mais ne remplace pas les regles
  ni la specification des commandes.
- Les preferences dans `.mustflow/config/preferences.toml` ont une priorite plus faible que les instructions utilisateur directes
  et que le style existant du projet.
- Quand le code, les modeles, les schemas, le comportement CLI, les metadonnees du paquet,
  la documentation visible par l'utilisateur, la sortie d'installation ou les tests changent,
  verifier `[release.versioning]` dans `.mustflow/config/preferences.toml` avant le rapport final.
  Les fichiers de version ne peuvent etre modifies que selon ces preferences : appliquer un
  changement automatique quand `auto_bump = true` et `require_user_confirmation = false`; sinon,
  suggerer le changement ou demander confirmation avant modification selon la configuration. Ne pas
  supposer que la source de version est `package.json`; localiser la source de version propre au depot
  avant de suggerer ou d'editer des versions.
- Les fichiers de contexte dans `.mustflow/context/` expliquent la direction du projet et les conventions du domaine.
  Les traiter comme un contexte specifique a la tache, pas comme un remplacement du code, des tests, des commandes ou des instructions utilisateur.
- Si `DESIGN.md` existe, le lire uniquement pour des taches d'interface, de design visuel, de mise en page, de design tokens
  ou d'accessibilite. Ne pas creer de `DESIGN.md` s'il n'existe pas.
- Lire le document de skill correspondant quand il s'applique a la tache.
- Avant d'editer, utiliser `.mustflow/skills/INDEX.md` pour decider si une ou plusieurs skills s'appliquent.
- Si une skill devient pertinente apres une nouvelle preuve, comme un echec de commande ou un changement de
  documentation, lire le `SKILL.md` correspondant avant de continuer cette partie du travail.
- Les documents de skill guident la procedure. Ils n'autorisent pas de commandes hors de
  `.mustflow/config/commands.toml` et ne remplacent pas les regles utilisateur, host, depot ou securite.
- Ne pas modifier les fichiers generes, les dependances externes ou les fichiers secrets, sauf demande explicite.
- Ne pas considerer les repertoires racine `config/`, `docs/` ou `skills/` comme des documents mustflow.

## Priorite Des Regles Parent Et Enfant

- Le `AGENTS.md` le plus proche des fichiers modifies est la regle la plus specifique.
- En cas de conflit entre les regles de flux, de style, de tests ou de commandes, suivre le `AGENTS.md`
  du depot enfant et `.mustflow/config/commands.toml`.
- Les regles de securite sur les secrets, la vie privee, les commandes destructrices et les chemins d'edition autorises sont cumulatives.
  Appliquer la regle la plus stricte.
- Lors de la navigation vers un depot imbrique, relire le `AGENTS.md` de ce depot
  et `.mustflow/config/*.toml` avant d'editer.
- Ne pas editer en dehors du depot enfant selectionne, sauf demande explicite.

## Compatibilite Avec Les Instructions Du Host

Certains hosts de codage peuvent lire des fichiers d'instructions propres au host ou appliquer leurs propres
politiques d'approbation, de sandbox, de checkpoint et d'execution de commandes.

Traiter ces politiques du host comme des contraintes de securite et d'execution additionnelles. Elles ne remplacent
pas le contrat de commandes mustflow de ce depot. Quand les instructions du host entrent en conflit avec les regles mustflow:

- Les instructions directes de l'utilisateur definissent l'objectif de la tache sauf si elles sont dangereuses.
- Les controles de securite et d'approbation du host restent obligatoires.
- Les regles de travail du depot viennent du `AGENTS.md` le plus proche et de `.mustflow/config/*.toml`.
- Les commandes de verification du projet doivent utiliser des intents mustflow configures.
- La regle la plus stricte sur la vie privee, les secrets, les commandes destructrices et Git push l'emporte.
- L'etat genere, les resumes et les caches ne remplacent jamais les fichiers actuels ni les instructions utilisateur actuelles.

Si la regle effective n'est pas claire, s'arreter et signaler le conflit au lieu de deviner.

## Points De Controle De Rafraichissement Des Instructions

- Dans les longues sessions, relire les instructions mustflow avant la premiere edition,
  avant l'execution de commandes lorsque l'intention de commande actuelle n'a pas deja un
  rafraichissement recent, apres la compaction de contexte, apres modification de `AGENTS.md`
  ou `.mustflow/**`, apres changement de racine de projet, et avant d'ecrire le rapport final.
- Utiliser la politique `[refresh]` dans `.mustflow/config/mustflow.toml` pour decider si un rafraichissement leger,
  commande, skill ou complet est necessaire.
- Ne pas stocker le nombre de tours de conversation ni l'activite de session dans les fichiers du projet.
  L'etat de rafraichissement de session doit rester dans le cache local ou dans l'application hote.

Le flux detaille, la politique de commandes, la gestion des echecs et les regles de securite se trouvent dans
`.mustflow/docs/agent-workflow.md`.
