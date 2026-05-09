---
title: mf explain
description: Commande en lecture seule qui explique pourquoi les décisions de politique mustflow s'appliquent.
---

`mf explain authority [path]` explique comment mustflow classe l'autorité des documents Markdown gérés. La commande ne modifie aucun fichier et ne compte pas comme vérification du projet.

Sans chemin, la commande affiche le modèle d'autorité. Avec un chemin, elle indique si ce chemin correspond à un rôle de document mustflow attendu.

`mf explain command <intent>` explique si une intention de commande dans `.mustflow/config/commands.toml` peut être exécutée avec `mf run`, pourquoi elle est autorisée ou bloquée, et si son exécution compterait comme vérification mustflow.

`mf explain retention` explique la politique de rétention effective de `.mustflow/config/mustflow.toml`, notamment le stockage des événements bruts, les reçus d'exécution bornés et les limites de contexte.

`mf explain skill <skill_id>` explique une route de `.mustflow/skills/INDEX.md`, avec son déclencheur, son entrée requise, son périmètre de modification, son risque, ses intentions de vérification et sa sortie attendue. La cible peut être le nom de dossier, le `metadata.skill_id` complet, `mustflow_doc` ou le chemin du skill.

`mf explain skills` explique le résumé strict d'alignement entre l'index des skills et leurs corps, le même que celui utilisé par `mf doctor --strict`. Il indique si chaque route de `.mustflow/skills/INDEX.md` pointe vers un corps de skill et si chaque corps est listé dans l'index.

## Sortie

- `mustflow root` : racine mustflow actuelle.
- `Topic` : sujet de l'explication.
- `Decision` : décision de politique résolue.
- `Reason` : raison pour laquelle la décision s'applique.
- `Effective action` : action que l'agent doit appliquer.
- `Counts as mustflow verification` : indique si le résultat compte comme reçu de vérification.
- `Source files` : fichiers qui définissent la source de la règle.
- `Expected frontmatter` : valeurs `mustflow_doc`, `authority` et `lifecycle` requises quand le chemin est reconnu.
- `Authority boundary` : ce que cette autorité peut définir et ce qu'elle doit laisser aux fichiers de plus haute autorité, au code actuel ou à `commands.toml`.
- `Command intent` : métadonnées du contrat de commande quand le sujet `command` est utilisé.
- `Retention policy` : paramètres de rétention effectifs quand le sujet `retention` est utilisé.
- `Skill route` : déclencheur, périmètre, risque, vérifications et sortie attendue quand le sujet `skill` est utilisé.
- `Skill routes` : état strict d'alignement entre index et corps quand le sujet `skills` est utilisé.

## Exemples

```sh
npx mf explain authority
npx mf explain authority AGENTS.md
npx mf explain command test
npx mf explain command lint --json
npx mf explain retention
npx mf explain retention --json
npx mf explain skill code-review
npx mf explain skill mustflow.core.code-review --json
npx mf explain skills
npx mf explain skills --json
npx mf explain authority .mustflow/skills/INDEX.md --json
```

## Champs JSON

```sh
npx mf explain authority AGENTS.md --json
```

La sortie lisible par machine utilise ces champs :

- `schema_version` (`string`) : version du format de sortie.
- `command` (`string`) : toujours `explain`.
- `topic` (`string`) : `authority`, `command`, `retention`, `skill` ou `skills`.
- `mustflow_root` (`string`) : racine mustflow actuelle.
- `decision` (`object`) : décision résolue, raison, action effective, fichiers sources, état de vérification et détails propres au sujet. Pour `authority`, inclut `boundary.role`, `boundary.canDefine` et `boundary.cannotDefine`.

## Aide et codes de sortie

```sh
npx mf explain --help
```

- Code `0` : la décision d'autorité a été inspectée et affichée.
- Code `1` : la commande a reçu un sujet invalide, une option inconnue ou un argument inattendu.
