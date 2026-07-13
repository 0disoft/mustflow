---
title: .mustflow/config/mustflow.toml
description: Déclare l’ordre de lecture des agents et les chemins protégés.
---

`.mustflow/config/mustflow.toml` déclare quels fichiers les agents doivent lire en premier et quels chemins exigent une attention particulière.

`mf check` fait plus que parser ce fichier. Il vérifie aussi que les valeurs `[map]` et `[workspace]` peuvent être interprétées de façon sûre.

## Où il est utilisé

- Transforme l’ordre de lecture de `AGENTS.md` en configuration vérifiable par machine.
- Aide les agents à distinguer les documents appartenant à mustflow des documents du projet utilisateur.
- Déclare les chemins protégés et les chemins demandant une attention particulière afin de réduire les modifications accidentelles.
- Définit les éléments qui doivent apparaître dans le rapport final de travail.

## Sections

- `authority`: documents mustflow faisant autorité.
- `read_order`: ordre de lecture initial pour les agents.
- `optional_read_order`: fichiers à lire lorsqu’ils existent et à ignorer lorsqu’ils manquent.
- `authority.workflow_preferences`: chemin vers les préférences par défaut au niveau du dépôt.
- `map`: manière de générer `REPO_MAP.md` et fichiers d’ancrage pouvant être inclus.
- `workspace`: limites de découverte des dépôts imbriqués indépendants sous les racines d’espace de travail.
- `context`: couche de contexte projet utilisée uniquement lorsque la tâche en a besoin.
- `capabilities`: surface de travail d’agent fournie par ce dépôt.
- `agent_loop`: boucle standard que les agents doivent suivre pour chaque tâche.
- `harness`: frontière du contrat local au dépôt pour les cadres d’exécution d’agents.
- `refresh`: points de contrôle pour relire les instructions mustflow pendant les longues sessions.
- `compaction`: politique de séparation entre contexte récent dérivé, résumés intermédiaires et longs résumés sans stocker de transcriptions brutes par défaut.
- `verification`: origine des commandes de validation et inférences interdites.
- `testing`: politique pour garder les tests alignés avec le contrat de comportement actuel.
- `handoff`: manière de transmettre en sécurité le travail inachevé.
- `budget`: limites pour l’activité d’agent longue durée ou répétée.
- `approval`: actions qui exigent une approbation humaine avant de continuer.
- `isolation`: frontière préférée de worktree ou de bac à sable pour les tâches longue durée.
- `retention`: limites de taille qui gardent les reçus d’exécution, cartes de dépôt et futurs fichiers de connaissances bornés.
- `document_roots`: chemins appartenant au flux de documents mustflow.
- `document_roots.generated`: documents générés et chemins d’état local.
- `edit_policy.protected`: chemins que les agents ne doivent pas modifier par défaut.
- `edit_policy.extra_care`: chemins qui exigent une prudence supplémentaire avant modification.
- `reporting`: éléments à inclure dans le rapport final de travail.

## Champs d’ordre de lecture

```toml
read_order = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/skills/INDEX.md",
]
optional_read_order = [
  ".mustflow/context/INDEX.md",
  "REPO_MAP.md",
]
```

`read_order` est le flux de documents requis. `optional_read_order` liste les documents à lire lorsqu’ils existent et à ignorer lorsqu’ils manquent.

Ce fichier réduit les suppositions des agents et aide à éviter les modifications accidentelles de fichiers générés ou de secrets.

`REPO_MAP.md` appartient à `optional_read_order` et `document_roots.generated`. Les agents doivent le lire uniquement lorsqu’une navigation large dans le dépôt est nécessaire, le traiter comme une carte de fichiers d’ancrage plutôt qu’une liste complète de fichiers, et le régénérer si besoin.

`.mustflow/context/INDEX.md` appartient à `optional_read_order` parce que les agents doivent le lire uniquement lorsque le contexte projet, produit, domaine, interface utilisateur, backend, données, sécurité ou opérations est pertinent pour la tâche.

`.mustflow/cache/**` et `.mustflow/state/**` sont des chemins générés. Le cache contient des fichiers de support reconstructibles comme l’index SQLite écrit par `mf index`; l’état contient l’état local créé pendant l’utilisation, comme les reçus de `mf run`. Aucun de ces chemins ne fait partie du premier ordre de lecture requis.

## Champs de carte

```toml
[map]
output = "REPO_MAP.md"
mode = "anchors_only"
privacy = "minimal"
include_nested = true
anchor_files = [
  "AGENTS.md",
  "REPO_MAP.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/context/INDEX.md",
  ".mustflow/context/PROJECT.md",
  ".mustflow/skills/INDEX.md",
  "README.md",
  "DESIGN.md",
  "package.json",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "deno.json",
  "justfile",
  "Justfile",
  "Makefile",
  "Taskfile.yml",
]
```

`map.output` est le nom du fichier généré. La valeur par défaut est `REPO_MAP.md`.

`map.mode = "anchors_only"` signifie que la carte inclut des ancres de navigation au lieu de chaque fichier source.

`map.privacy = "minimal"` signifie que la sortie générée omet par défaut les URL distantes, noms de branche, états de changement récents, listes de commandes et résumés automatiques.

`map.include_nested = true` signifie que les dépôts indépendants imbriqués sous les racines de workspace configurées sont indexés par défaut. La racine par défaut est `projects/`, et la découverte reste limitée par les champs `workspace`.

`mf check` vérifie que `output` et `anchor_files` sont des chemins relatifs à l’intérieur de la racine actuelle. Il autorise actuellement seulement `anchors_only` pour `mode` et `minimal` pour `privacy`.

`preferences.toml` est inclus comme ancre par défaut afin que les agents puissent trouver rapidement les valeurs par défaut du dépôt pour la langue des réponses, la documentation, les messages de commit, les journaux et le formatage.

`DESIGN.md` est une ancre externe optionnelle. mustflow ne le crée pas, mais lorsqu’il existe, `mf map` peut le faire apparaître pour les travaux d’interface utilisateur, de design visuel, de jetons de design, de mise en page ou d’accessibilité.

## Champs de contexte

```toml
[context]
enabled = true
root = ".mustflow/context"
index = ".mustflow/context/INDEX.md"
default_files = [
  ".mustflow/context/PROJECT.md",
]
read_policy = "task_relevant_only"
authority = "contextual"
external_anchors = [
  "README.md",
  "DESIGN.md",
]
```

`context.enabled = true` signifie que le projet peut porter du contexte destiné aux agents sous `.mustflow/context/`.

`context.index` pointe vers le routeur qui indique aux agents quels fichiers de contexte lire pour la tâche.
`context.default_files` liste les fichiers de contexte installés par le modèle par défaut.

`read_policy = "task_relevant_only"` signifie que les agents ne doivent pas lire tous les fichiers de contexte par défaut.
`authority = "contextual"` signifie que les fichiers de contexte guident l’orientation, mais restent d’autorité inférieure aux instructions directes de l’utilisateur, au code actuel, aux tests, aux contrats de commande et aux politiques configurées.

`external_anchors` liste les fichiers racine qui peuvent fournir du contexte sans devenir des fichiers appartenant à mustflow.
`README.md` est une vue d’ensemble destinée aux personnes. `DESIGN.md` est une ancre optionnelle de design visuel lorsque le projet en possède déjà une.

## Champs d’espace de travail

```toml
[workspace]
enabled = true
roots = ["projects"]
max_depth = 4
max_repositories = 50
follow_symlinks = false
stop_at_repository_root = true
```

`workspace.enabled = true` permet à la racine actuelle de découvrir par défaut les dépôts indépendants sous `projects/`.

Pour une racine d’espace de travail, ajustez des chemins comme `roots = ["projects", "repos"]`. mustflow analyse seulement les racines configurées et n’accorde pas l’autorité de commande d’un dépôt enfant depuis le workspace parent.

`max_depth` et `max_repositories` évitent les grandes analyses accidentelles. `follow_symlinks = false` empêche par défaut la traversée hors de l’espace de travail ou vers un autre lecteur.

`stop_at_repository_root = true` signifie qu’une fois un dépôt imbriqué indépendant découvert, la carte parente ne doit pas continuer récursivement dans ses détails internes. Le `REPO_MAP.md` parent doit montrer uniquement les points d’entrée vers les dépôts imbriqués, pas les décrire.

`mf check` vérifie que `roots` contient des chemins relatifs à l’intérieur de la racine actuelle, que `max_depth` et `max_repositories` sont des entiers positifs, et que les interrupteurs d’espace de travail sont des booléens.

## Champs de surface de contrôle des agents

```toml
[capabilities]
workflow = true
command_contract = true
skills = true
repo_map = "generated_optional"
preferences = "optional"
context = "optional"
local_index = "generated_optional"
work_items = "disabled"
services = "disabled"
adapters = []

[agent_loop]
phases = [
  "orient",
  "plan",
  "act",
  "verify",
  "report",
  "handoff",
]

[verification]
command_source = ".mustflow/config/commands.toml"
require_configured_intents = true
allow_inferred_commands = false
require_command_lifecycle = true
require_timeout_for_oneshot = true

[handoff]
enabled = false
mode = "report_only"
```

`capabilities` déclare quelles surfaces de travail d’agent sont disponibles dans ce dépôt. `workflow`, `command_contract` et `skills` sont des fonctionnalités de base. `repo_map`, `preferences`, `local_index`, `work_items` et `services` sont des points d’extension fondés sur l’état. Le modèle par défaut fournit l’index local comme donnée générée optionnelle, mais `mf init` ne crée pas le fichier d’index. Les éléments de travail locaux et la gestion de services restent inactifs jusqu’à ce que le dépôt adopte des règles de cycle de vie bornées.

`agent_loop.phases` est la boucle standard de travail d’agent: `orient`, `plan`, `act`, `verify`, `report` et `handoff`. C’est un contrat vérifiable par machine, pas une prose décorative.

`verification` indique que les commandes de validation viennent de `.mustflow/config/commands.toml`. `allow_inferred_commands = false` signifie que les agents ne doivent pas déduire les commandes de validation depuis `package.json`, `Makefile` ou des conventions de nommage.

`handoff.enabled = false` signifie que le modèle actuel garde inactive l’écriture d’éléments de travail locaux. Le travail qui ne peut pas être terminé en sécurité doit être transmis dans le rapport final, sauf si le dépôt active un cycle de vie borné pour les éléments de travail.

`mf check` valide les booléens, les états de capacité autorisés, la boucle standard et le chemin de la commande de validation.

## Champs de cadre d’exécution

```toml
[harness]
mode = "single_session"
fresh_context_preferred = true

[harness.phases]
enabled = [
  "plan",
  "work",
  "verify",
  "judge",
  "handoff",
]
```

`harness` déclare la forme d’exécution par défaut pour les cadres d’agents. `mode = "single_session"` est la valeur prudente; des modes futurs ou propres au dépôt peuvent choisir une coordination longue durée lorsque le cycle de vie, l’approbation, l’isolation et la rétention sont déclarés.

`harness.phases.enabled` définit les phases qu’un cadre d’exécution longue durée doit séparer. Ce sont des phases, pas des dossiers par défaut ni des sous-agents par défaut.

## Champs d’actualisation

```toml
[refresh]
enabled = true
mode = "checkpoint"
required_at = [
  "session_start",
  "task_start",
  "before_first_edit",
  "before_command_run",
  "after_instruction_file_change",
  "root_change",
  "after_compaction",
  "before_final_report",
]
turn_threshold = 8
tool_call_threshold = 16
output_bytes_threshold = 100000
state_store = "cache"

[refresh.levels.light]
read = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
]

[refresh.levels.command]
read = [
  "AGENTS.md",
  ".mustflow/config/commands.toml",
]

[refresh.levels.edit]
read = [
  "AGENTS.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/docs/agent-workflow.md",
]

[refresh.levels.report]
read = [
  "AGENTS.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/preferences.toml",
]

[refresh.levels.skill]
read = [
  "AGENTS.md",
  ".mustflow/skills/INDEX.md",
]

[refresh.levels.full]
read = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/skills/INDEX.md",
]
```

`refresh` déclare quand un agent doit relire les instructions mustflow parce que la session est devenue longue, que la racine a changé, qu’une exécution de commande est imminente ou que des fichiers d’instructions ont changé.

`before_command_run` signifie que la tâche actuelle et l’intention de commande actuelle doivent disposer d’un rafraîchissement récent de niveau commande. Cela n’exige pas de relire tous les fichiers avant chaque commande répétée lorsque le contrat de commande n’a pas changé et que les seuils restent valides.

`state_store = "cache"` signifie que les nombres de tours et l’activité de session n’appartiennent pas aux fichiers du projet. Une application hôte peut les suivre dans un cache local, mais les documents mustflow doivent rester stables et sûrs à valider.

`refresh.levels` associe chaque niveau d’actualisation aux fichiers qui doivent être relus. Les niveaux par défaut sont `light`, `command`, `edit`, `report`, `skill` et `full`.

`mf check` valide le mode d’actualisation, les noms de points de contrôle, les seuils, le stockage d’état et les chemins de fichiers d’actualisation.

## Champs de compaction du contexte

```toml
[compaction]
enabled = false
strategy = "tiered"
state_store = "cache"

[compaction.rules]
require_source_refs = true
summaries_are_derived = true
current_files_override_summaries = true
never_store_secrets = true
scrub_absolute_user_paths = true
do_not_store_hidden_chain_of_thought = true
```

Le modèle par défaut garde `compaction` désactivée et ne déclare que les règles de sécurité destinées à l’hôte. Il n’installe pas de réglages pour le contexte récent, les résumés intermédiaires, les résumés longue durée ni la rétention brute, et cela ne signifie pas que mustflow stocke des transcriptions complètes, un raisonnement caché, la sortie complète du terminal ou des journaux bruts de commandes.

`state_store = "cache"` signifie que l’état de compaction doit vivre dans un cache local ou un état géré par l’hôte, pas dans des documents de projet versionnés. Les connaissances partagées du projet ne doivent être promues que sous forme de décisions, d’investigations ou de résumés de passage de relais liés aux sources.

`compaction.rules` garde les résumés d’autorité inférieure aux instructions utilisateur actuelles, au code et à la configuration actuels, aux contrats de commande et aux reçus d’exécution.

La langue des résumés de compaction et des résumés de passage de relais n’est pas contrôlée ici. Elle appartient à `.mustflow/config/preferences.toml` sous `[language.memory]`.

## Champs de pertinence des tests

```toml
[testing]
policy = "behavior_contract"
prefer_update_existing_tests = true
require_existing_test_search = true
require_test_change_report = true
forbid_validation_weakening = true
allow_test_deletion_when = [
  "behavior_removed",
  "public_contract_changed",
  "duplicate_coverage",
  "implementation_detail_removed",
  "obsolete_snapshot",
]
forbid_test_deletion_when = [
  "only_to_make_tests_pass",
  "without_behavior_rationale",
  "without_reporting",
  "without_running_relevant_validation",
]
stale_test_action = "update_remove_or_report"
```

`testing.policy = "behavior_contract"` signifie que les tests valident le comportement actuellement attendu. Cela ne signifie pas que les tests doivent croître indéfiniment ni préserver des fonctionnalités supprimées.

`require_existing_test_search` demande aux agents d’inspecter les tests existants avant d’en ajouter de nouveaux.
`allow_test_deletion_when` et `forbid_test_deletion_when` définissent la frontière entre supprimer des tests obsolètes et affaiblir la validation.

`stale_test_action = "update_remove_or_report"` signifie que les candidats obsolètes doivent être mis à jour, supprimés ou signalés, pas automatiquement supprimés.

## Champs de budget, approbation et isolation

```toml
[budget]
enabled = true
max_iterations = 6
max_wall_clock_minutes = 60
max_command_runs = 20
max_total_output_mb = 8
max_failures_per_intent = 2
on_limit = "stop_and_report"

[approval]
required_for = [
  "git_commit",
  "git_push",
  "dependency_upgrade",
  "database_migration",
  "destructive_command",
  "secret_access",
  "release",
  "cross_repository_change",
]
on_required = "stop_and_request_approval"

[isolation]
preferred = "git_worktree"
required_for_long_running = true
allow_dirty_main_worktree = false
```

`budget` empêche les boucles sans limite en limitant les itérations, le temps écoulé, les exécutions de commandes, le volume de sortie et les échecs répétés. Lorsque la limite est atteinte, les agents s’arrêtent et signalent. Les projets qui activent explicitement un flux de passage de relais peuvent choisir `stop_and_handoff`.

`approval` liste les actions qui exigent une approbation humaine explicite avant exécution. Il n’accorde pas de permission par lui-même.

`isolation` déclare la frontière préférée pour le travail longue durée. mustflow ne crée pas le worktree ni le bac à sable par lui-même; il donne aux outils hôtes une politique à suivre.

`mf check` valide ces champs comme contrats, mais n’exécute pas de cadre d’exécution longue durée.

## Champs de rétention

```toml
[retention]
enabled = true

[retention.raw_events]
store = "none"
max_file_mb = 25
max_total_mb = 250
max_age_days = 14
on_limit = "report"

[retention.run_receipts]
store = "repo_local_ignored"
max_file_kb = 128
max_items = 50
max_total_mb = 10
keep_stdout_tail_bytes = 65536
keep_stderr_tail_bytes = 65536

[retention.knowledge]
enabled = false
store = "repo_local_ignored"
max_file_kb = 128
max_total_mb = 10
require_source_refs = true
require_review_status = true

[retention.context]
max_file_kb = 8

[retention.handoffs]
store = "repo_local_ignored"
max_file_kb = 64
max_total_mb = 5
require_source_refs = true

[retention.repo_map]
max_file_kb = 128
fail_if_larger = true
```

`retention` empêche mustflow d’accumuler des transcriptions complètes de discussion, des sorties complètes du terminal ou des flux d’événements JSONL bruts dans le projet.

`repo_local_ignored` signifie que l’état généré est stocké dans l’espace de travail du dépôt, mais sous des chemins locaux ignorés comme `.mustflow/state/**` ou `.mustflow/cache/**`. Ces fichiers peuvent être supprimés ou reconstruits et ont moins d’autorité que les fichiers actuels, les instructions utilisateur actuelles et les contrats de commande.

`raw_events.store = "none"` signifie que le modèle par défaut ne stocke pas de journaux d’événements bruts. Si un stockage de cache est ajouté plus tard, il doit rester séparé des documents du projet qui peuvent être validés.

`run_receipts` limite les répertoires `.mustflow/state/runs/run-*` et `.mustflow/state/runs/verify-*` conservés; `latest.json` reste seulement le pointeur volatil le plus récent.
Un reçu d’exécution doit contenir de petits résultats structurés et des fins de sortie, pas le journal complet. `latest.index.json` est reconstruit depuis les répertoires conservés et reste aussi un état généré.

`knowledge.enabled = false` signifie que le modèle par défaut ne crée pas de base de connaissances.
Si elle est activée plus tard, les fichiers de connaissances doivent contenir des décisions, investigations et résumés de passage de relais, pas des journaux bruts.

`context` limite les fichiers `.mustflow/context/*.md`. Ces fichiers doivent rester courts et orientés tâche au lieu de devenir une archive de documentation. `mf check --strict` les vérifie aussi pour détecter les chemins absolus locaux, les textes clé/valeur ressemblant à des secrets et les définitions de jetons de design dupliquées depuis `DESIGN.md`.

`handoffs` limite les enregistrements compacts optionnels de passage de relais. Les passages de relais ne sont pas des journaux bruts de session; ils doivent référencer des sources comme les reçus d’exécution et résumer la prochaine étape sûre.

`repo_map` limite le `REPO_MAP.md` généré. La carte doit contenir des ancres de navigation, pas une liste complète de fichiers ni un journal de changements récents.

`mf check --strict` vérifie que cette politique existe, que les fichiers générés restent sous leurs limites et que les fichiers JSONL bruts n’apparaissent pas sous `.mustflow/**`.

Il vit sous `.mustflow/` afin de ne pas se mélanger avec la configuration ordinaire du projet.
