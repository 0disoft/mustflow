---
mustflow_doc: agents.root
locale: fr
canonical: false
revision: 11
lifecycle: user-editable
authority: binding
---

# AGENTS.md

Ce fichier constitue le premier accord de travail qu’un agent de codage LLM doit lire dans ce dépôt.  
Ce dépôt suit le flux de travail agent de mustflow.  
Les détails gérés par mustflow se trouvent dans `.mustflow/`.

## Ordre de lecture

1. `AGENTS.md`  
2. `.mustflow/docs/agent-workflow.md`  
3. `.mustflow/config/mustflow.toml`  
4. `.mustflow/config/commands.toml`  
5. `.mustflow/config/preferences.toml` (si présent)  
6. `.mustflow/skills/INDEX.md`  
7. `.mustflow/context/INDEX.md` uniquement lorsque la tâche requiert du contexte projet, produit, domaine, interface, backend, données, sécurité ou opérations  
8. Les fichiers `.mustflow/context/<name>.md` correspondants, uniquement s’ils sont sélectionnés par l’index de contexte  
9. Le fichier `.mustflow/skills/<name>/SKILL.md` correspondant  
10. `REPO_MAP.md` uniquement si une navigation plus large dans le dépôt est nécessaire  
11. Les fichiers source, de test et de documentation pertinents  

## Règles principales

- Ne pas annuler les modifications utilisateur déjà présentes.  
- Ne pas déduire les commandes à partir des fichiers de gestionnaire de paquets.  
- Exécuter uniquement les définitions de commande dont `status` est `configured`, `lifecycle` est `oneshot` et `run_policy` est `agent_allowed`.  
- Préférer `mf run <intent>` pour les commandes oneshot configurées.  
- Exécuter les intentions de commande `mf run` en série. Ne pas lancer un autre `mf run` tant qu’une intention configurée est encore en cours, surtout si elle déclare des `writes` non vides comme `dist/`.  
- Choisir l’intention de vérification configurée la plus ciblée qui couvre le risque. Préférer les tests liés ou les contrôles rapides aux suites larges quand le contrat de commandes les expose, et signaler les intentions plus ciblées manquantes plutôt que d’utiliser silencieusement des tests complets et lents.  
- Ne pas lancer directement de serveurs de développement, de modes watch, d’interfaces navigateur, d’invites interactives ou de processus en arrière-plan.  
- Ne pas lancer de boucles autonomes, de processus worker, de systèmes de persona ni de processus harness longue durée, sauf si ce dépôt les configure explicitement.  
- Suivre `[budget]`, `[approval]` et `[isolation]` dans `.mustflow/config/mustflow.toml` lorsqu’une tâche peut durer longtemps ou toucher un état sensible.  
- Utiliser `mf doctor` ou `mf doctor --json` pour un contrôle de santé en lecture seule avant des changements importants.  
- `mf context --json` peut aider pour une orientation lisible par machine, mais ne remplace pas les règles ni la spécification des commandes.  
- Les préférences dans `.mustflow/config/preferences.toml` ont une priorité plus faible que les instructions utilisateur directes et que le style existant du projet.  
- Si ce dépôt est un dépôt enfant sans son propre `.mustflow/config/preferences.toml`, hériter comme valeurs par défaut des préférences du mustflow root parent le plus proche. Cela inclut `[git]`, `[git.commit_message]`, `[release.versioning]`, verification, testing, language, reporting et les autres sections de préférences. Les préférences locales du dépôt enfant remplacent celles du parent champ par champ. Ne jamais hériter de `.mustflow/config/commands.toml` ; l’autorité de commande reste locale au dépôt.
- Quand le code, les modèles, les schémas, le comportement CLI, les métadonnées du paquet, la documentation visible par l’utilisateur, la sortie d’installation ou les tests changent, vérifier `[release.versioning]` dans `.mustflow/config/preferences.toml` avant le rapport final.  
  Les fichiers de version ne peuvent être modifiés que selon ces préférences : appliquer un changement automatique quand `auto_bump = true` et `require_user_confirmation = false` ; sinon, suggérer le changement ou demander confirmation avant modification selon la configuration. Ne pas supposer que la source de version est `package.json` ; localiser la source de version propre au dépôt avant de suggérer ou d’éditer des versions.  
- Les fichiers de contexte dans `.mustflow/context/` expliquent la direction du projet et les conventions du domaine. Les considérer comme un contexte spécifique à la tâche, pas comme un remplacement du code, des tests, des commandes ou des instructions utilisateur.  
- Si `DESIGN.md` existe, le lire uniquement pour des tâches d’interface, de design visuel, de mise en page, de design tokens ou d’accessibilité. Ne pas créer de `DESIGN.md` s’il n’existe pas.  
- Lire le document de skill correspondant lorsqu’il s’applique à la tâche.  
- Avant d’éditer, utiliser `.mustflow/skills/INDEX.md` pour décider si une ou plusieurs skills s’appliquent.  
- Si une skill devient pertinente après une nouvelle preuve, comme un échec de commande ou un changement de documentation, lire le `SKILL.md` correspondant avant de poursuivre cette partie du travail.  
- Les documents de skill guident la procédure. Ils n’autorisent pas de commandes hors de `.mustflow/config/commands.toml` et ne remplacent pas les règles utilisateur, host, dépôt ou sécurité.  
- Ne pas modifier les fichiers générés, les dépendances externes ou les fichiers secrets, sauf demande explicite.  
- Ne pas considérer les répertoires racine `config/`, `docs/` ou `skills/` comme des documents mustflow.  

## Priorité des règles parent et enfant

- Le `AGENTS.md` le plus proche des fichiers modifiés est la règle la plus spécifique.  
- En cas de conflit entre les règles de flux, de style, de tests ou de commandes, suivre le `AGENTS.md` du dépôt enfant et `.mustflow/config/commands.toml`.  
- Les règles de sécurité sur les secrets, la vie privée, les commandes destructrices et les chemins d’édition autorisés sont cumulatives. Appliquer la règle la plus stricte.  
- Lors de la navigation vers un dépôt imbriqué, relire le `AGENTS.md` de ce dépôt et `.mustflow/config/*.toml` avant d’éditer.  
- Si le dépôt imbriqué n’a pas de fichier preferences local, appliquer les preferences du mustflow parent le plus proche comme valeurs héritées tout en continuant de suivre le `AGENTS.md` et le command contract du dépôt imbriqué.
- Lorsque ce mustflow root sert de workspace pour des dépôts imbriqués, traiter le router, les routes, l’index et les fichiers `SKILL.md` installés sous `.mustflow/skills/` dans ce root comme un shared workspace skill registry. Consulter ce registre partagé pour les procédures de tâche en plus des fichiers de routing locaux du dépôt imbriqué.
- Les shared workspace skills ne fournissent qu’un guidage de procédure. Elles ne remplacent pas le `AGENTS.md`, le command contract, le périmètre d’édition, les règles de sécurité ni la source de vérité du dépôt imbriqué.
- Si un dépôt imbriqué n’a pas d’index de skills local ou utilise une convention d’agent locale différente, ne pas conclure qu’aucune skill de workspace ne s’applique ; consulter le shared workspace registry tout en gardant l’autorité du dépôt enfant locale.
- Ne pas éditer en dehors du dépôt enfant sélectionné, sauf demande explicite.  

## Compatibilité avec les instructions du host

Certains hosts de codage peuvent lire des fichiers d’instructions propres au host ou appliquer leurs propres politiques d’approbation, de sandbox, de checkpoint et d’exécution de commandes.  

Traiter ces politiques du host comme des contraintes de sécurité et d’exécution additionnelles. Elles ne remplacent pas le contrat de commandes mustflow de ce dépôt. Quand les instructions du host entrent en conflit avec les règles mustflow :  

- Les instructions directes de l’utilisateur définissent l’objectif de la tâche sauf si elles sont dangereuses.  
- Les contrôles de sécurité et d’approbation du host restent obligatoires.  
- Les règles de travail du dépôt viennent du `AGENTS.md` le plus proche et de `.mustflow/config/*.toml`.  
- Les commandes de vérification du projet doivent utiliser des intents mustflow configurés.  
- La règle la plus stricte sur la vie privée, les secrets, les commandes destructrices et Git push l’emporte.  
- L’état généré, les résumés et les caches ne remplacent jamais les fichiers actuels ni les instructions utilisateur actuelles.  

Si la règle effective n’est pas claire, s’arrêter et signaler le conflit plutôt que de deviner.  

## Points de contrôle de rafraîchissement des instructions

- Dans les longues sessions, relire les instructions mustflow avant la première édition, avant l’exécution de commandes lorsque l’intention de commande actuelle n’a pas déjà un rafraîchissement récent, après la compaction de contexte, après modification de `AGENTS.md` ou `.mustflow/**`, après changement de racine de projet, et avant d’écrire le rapport final.  
- Utiliser la politique `[refresh]` dans `.mustflow/config/mustflow.toml` pour décider si un rafraîchissement léger, commande, skill ou complet est nécessaire.  
- Ne pas stocker le nombre de tours de conversation ni l’activité de session dans les fichiers du projet. L’état de rafraîchissement de session doit rester dans le cache local ou dans l’application hôte.  

Le flux détaillé, la politique de commandes, la gestion des échecs et les règles de sécurité se trouvent dans `.mustflow/docs/agent-workflow.md`.
