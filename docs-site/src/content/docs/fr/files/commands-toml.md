---
title: .mustflow/config/commands.toml
description: Contrats d’intention de commande pour les tests, le lint, les constructions et les contrôles de documentation.
---

`.mustflow/config/commands.toml` est le contrat d’intention de commande qui empêche les agents de deviner les commandes du projet.

## Où il est utilisé

- `AGENTS.md` utilise ce fichier pour appliquer la règle interdisant de deviner les commandes.
- `agent-workflow.md` traite ce fichier comme la source de vérité de la politique d’exécution des commandes.
- Chaque `SKILL.md` référence des noms d’intentions comme `test`, `lint` et `build` au lieu de commandes brutes.
- Des outils comme `mf check` peuvent lire ce fichier pour valider l’exécutabilité et les champs manquants.

## Structure

```toml
schema_version = "1"

[defaults]
missing_behavior = "do_not_guess"
allow_inferred_commands = false
default_cwd = "."
default_timeout_seconds = 600
stdin = "closed"
require_lifecycle = true
require_timeout_for_oneshot = true
deny_unmanaged_long_running = true
max_output_bytes = 1048576
on_timeout = "terminate_process_tree"
kill_after_seconds = 5

[intents.test]
status = "unknown"
description = "Run tests."
reason = "No test command has been declared for this repository."
agent_action = "do_not_guess_report_missing"
required_after = ["code_change", "behavior_change"]
```

## Champs par défaut

- `schema_version`: version du format de ce fichier.
- `defaults.missing_behavior`: comportement des agents lorsqu’une intention manque.
- `defaults.allow_inferred_commands`: indique si les agents peuvent déduire des commandes. La valeur par défaut doit être `false`.
- `defaults.default_cwd`: répertoire de travail par défaut lorsqu’une intention n’en précise pas.
- `defaults.default_timeout_seconds`: délai d’expiration par défaut lorsqu’une intention n’en précise pas.
- `defaults.stdin`: comportement par défaut de l’entrée standard. Les commandes exécutées par des agents doivent utiliser `closed`.
- `defaults.require_lifecycle`: indique si les intentions exécutables doivent déclarer un cycle de vie de commande.
- `defaults.require_timeout_for_oneshot`: indique si les commandes finies doivent déclarer un délai d’expiration.
- `defaults.deny_unmanaged_long_running`: indique si les commandes longue durée non gérées sont bloquées.
- `defaults.max_output_bytes`: limite de sortie par défaut acceptée par l’exécuteur.
- `defaults.on_timeout`: politique de gestion des expirations.
- `defaults.kill_after_seconds`: temps d’attente supplémentaire disponible pour le nettoyage des processus.

## État des intentions

- `configured`: une commande exécutable est déclarée.
- `unknown`: aucun contrat de commande n’existe encore.
- `not_applicable`: ce dépôt n’a pas besoin de cette validation.
- `manual_only`: une personne doit décider s’il faut l’exécuter et comment.
- `disabled`: la commande est connue mais ne doit pas être exécutée maintenant.

Les agents ne peuvent exécuter que les intentions avec `status = "configured"`.

## Champs des intentions

- `description`: objectif de l’intention de commande.
- `reason`: raison pour laquelle l’intention n’est pas exécutable ou pas encore déclarée.
- `agent_action`: ce que l’agent doit faire lorsqu’il ne peut pas exécuter l’intention.
- `required_after`: types de changements après lesquels cette intention doit être envisagée.
- `kind`: classification, par exemple commande intégrée mustflow ou commande du dépôt.
- `lifecycle`: indique si la commande est finie ou longue durée.
- `run_policy`: indique si les agents peuvent exécuter l’intention ou si une approbation explicite est requise.
- `argv`: commande et arguments exécutés sans interprétation shell.
- `mode`: définir à `shell` uniquement lorsque la syntaxe shell est requise.
- `cmd`: chaîne de commande shell utilisée lorsque `mode = "shell"`.
- `cwd`: répertoire de travail de la commande.
- `timeout_seconds`: délai d’expiration de la commande.
- `stdin`: comportement de l’entrée standard. Les intentions exécutables par les agents doivent utiliser `closed`.
- `success_exit_codes`: codes de sortie considérés comme réussis.
- `writes`: chemins que la commande peut modifier.
- `network`: indique si la commande utilise le réseau.
- `destructive`: indique si la commande peut être destructive.

## Intentions exécutables

Les intentions configurées doivent utiliser un tableau `argv` lorsque c’est possible.

```toml
[intents.test]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run tests."
argv = ["pnpm", "test"]
cwd = "."
timeout_seconds = 900
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
```

Si un shell est requis, définissez `mode = "shell"` et `cmd`, puis déclarez l’impact de la commande et les chemins d’écriture.

Pour `unknown`, `not_applicable`, `manual_only` et `disabled`, les agents ne doivent pas déduire de commande de remplacement.

## Intentions liées aux tests

Le modèle par défaut sépare les tests complets, les tests liés, les contrôles d’audit, la couverture et les mises à jour d’instantanés.

```toml
[intents.test_related]
status = "unknown"
reason = "No related-test command has been declared for this repository."
agent_action = "do_not_guess_report_missing"

[intents.test_audit]
status = "unknown"
reason = "No stale-test audit command has been declared."
agent_action = "do_not_guess_report_missing"

[intents.snapshot_update]
status = "manual_only"
reason = "Snapshot updates can hide unintended output changes."
agent_action = "do_not_update_snapshots_without_approval"
```

Les agents doivent utiliser ces noms d’intentions lors de la maintenance des tests, mais doivent toujours résoudre chacune via `commands.toml`. Une commande de test lié ou d’audit manquante est signalée; elle n’est pas devinée.

## Cycle de vie des commandes

- `oneshot`: commande finie qui doit se terminer.
- `server`: serveur local longue durée.
- `watch`: commande de surveillance de fichiers qui ne se termine pas d’elle-même.
- `interactive`: commande qui attend une entrée utilisateur.
- `browser`: navigateur ou processus d’interface utilisateur.
- `background`: processus destiné à rester en arrière-plan.

Par défaut, les agents ne peuvent exécuter que les intentions `oneshot`. `server`, `watch`, `interactive`, `browser` et `background` ne doivent pas utiliser `run_policy = "agent_allowed"`.

`mf run <intent>` exécute uniquement les intentions avec `status = "configured"`, `lifecycle = "oneshot"`, `run_policy = "agent_allowed"` et `stdin = "closed"`.
Après exécution, il écrit le dernier reçu d’exécution dans `.mustflow/state/runs/latest.json`; avec `--json`, il imprime aussi le même reçu sur la sortie standard.

## Intentions intégrées

`mustflow_doctor` inspecte l’état d’installation de la racine mustflow actuelle, le résultat de vérification, les intentions de commande exécutables et les prochaines étapes sans écrire de fichiers.

```toml
[intents.mustflow_doctor]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["mf", "doctor", "--json"]
stdin = "closed"
writes = []
```

`repo_map` génère ou met à jour `REPO_MAP.md`.

```toml
[intents.repo_map]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["mf", "map", "--write"]
stdin = "closed"
writes = ["REPO_MAP.md"]
```

Le répertoire racine `config/` peut appartenir au projet utilisateur; mustflow ne l’utilise donc pas.

## Intentions liées à Git

Le modèle par défaut inclut des intentions Git en lecture seule utilisées pour le rapport final et les suggestions de message de commit.

```toml
[intents.changes_status]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "status", "--short"]
stdin = "closed"
writes = []
network = false
destructive = false

[intents.changes_diff_summary]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "diff", "--stat"]
stdin = "closed"
writes = []
network = false
destructive = false
```

Ces intentions inspectent les fichiers modifiés et un résumé des changements sans modifier l’état Git.

Les vrais commits sont manuels par défaut.

```toml
[intents.git_commit]
status = "manual_only"
reason = "Commits require explicit user approval."
agent_action = "do_not_commit_report_suggestion_only"
```

Les agents peuvent suggérer des messages de commit, mais ils ne doivent pas ajouter à l’index, créer de commit ni pousser sans demande explicite de l’utilisateur.
