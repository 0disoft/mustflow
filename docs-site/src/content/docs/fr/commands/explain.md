---
title: mf explain
description: Commande en lecture seule qui explique pourquoi les décisions de politique mustflow s'appliquent.
---

`mf explain authority [path]` explique comment mustflow classe l'autorité des documents Markdown gérés. La commande ne modifie aucun fichier et ne compte pas comme vérification du projet.

Sans chemin, la commande affiche le modèle d'autorité. Avec un chemin, elle indique si ce chemin correspond à un rôle de document mustflow attendu.

`mf explain asset-optimization` explique le chemin de décision pour l'optimisation des images web. Il indique si le skill `web-asset-optimization` s'applique et si `asset_optimize` est une intention de commande configurée et exécutable par l'agent, afin que l'agent ne devine pas des convertisseurs d'images ou des commandes de paquet.

`mf explain anchor <anchor_id>` explique une ancre structurée de code source. Les ancres source sont seulement des coordonnées de navigation : elles aident à trouver le code, mais ne définissent pas de règles de workflow, de permission de commande ni d'autorité de vérification.

`mf explain command <intent>` explique si une intention de commande dans `.mustflow/config/commands.toml` peut être exécutée avec `mf run`, pourquoi elle est autorisée ou bloquée, et si son exécution compterait comme vérification mustflow.
Quand un index local à jour existe, il lit aussi le graphe dérivé des effets de commande afin d'afficher les verrous d'écriture et les conflits sans changer l'autorité de la commande.

`mf explain retention` explique la politique de rétention effective de `.mustflow/config/mustflow.toml`, notamment le stockage des événements bruts, les reçus d'exécution bornés et les limites de contexte.

`mf explain skill <skill_id>` explique une route de `.mustflow/skills/INDEX.md`, avec son déclencheur, son entrée requise, son périmètre de modification, son risque, ses intentions de vérification et sa sortie attendue. La cible peut être le nom de dossier, le `metadata.skill_id` complet, `mustflow_doc` ou le chemin du skill.

`mf explain skills` explique le résumé strict d'alignement entre l'index des skills et leurs corps, le même que celui utilisé par `mf doctor --strict`. Il indique si chaque route de `.mustflow/skills/INDEX.md` pointe vers un corps de skill et si chaque corps est listé dans l'index.

`mf explain surface [path]` explique comment un chemin relatif au dépôt correspond au contrat de surface publique utilisé par la classification des changements. Quand un index local à jour existe, il affiche aussi la règle dérivée chemin-surface qui a correspondu. Si l'index est absent ou obsolète, il affiche une suggestion de reconstruction sans changer la classification ni la sélection des commandes.

## Sortie

- `mustflow root` : racine mustflow actuelle.
- `Topic` : sujet de l'explication.
- `Decision` : décision de politique résolue.
- `Reason` : raison pour laquelle la décision s'applique.
- `Effective action` : action que l'agent doit appliquer.
- `Counts as mustflow verification` : indique si le résultat compte comme reçu de vérification.
- `Source files` : fichiers qui définissent la source de la règle.
- `Source anchor` : chemin, ligne, objectif, termes de recherche, invariant, risque et autorité limitée à la navigation quand le sujet `anchor` est utilisé.
- `Expected frontmatter` : valeurs `mustflow_doc`, `authority` et `lifecycle` requises quand le chemin est reconnu.
- `Authority boundary` : ce que cette autorité peut définir et ce qu'elle doit laisser aux fichiers de plus haute autorité, au code actuel ou à `commands.toml`.
- `Command intent` : métadonnées du contrat de commande quand le sujet `command` est utilisé.
- `Command effect graph` : verrous d'écriture et conflits lus depuis l'index local à jour quand le sujet `command` est utilisé. Si l'index est absent ou obsolète, la sortie affiche une suggestion de reconstruction sans changer la décision de commande.
- `Retention policy` : paramètres de rétention effectifs quand le sujet `retention` est utilisé.
- `Skill route` : déclencheur, périmètre, risque, vérifications et sortie attendue quand le sujet `skill` est utilisé.
- `Skill routes` : état strict d'alignement entre index et corps quand le sujet `skills` est utilisé.
- `Public surface` : type de surface, catégorie, raisons de vérification, contrats affectés, politique de mise à jour et vérifications de dérive quand le sujet `surface` est utilisé.
- `Path-surface read model` : identifiant de règle, motif et métadonnées de surface dérivées depuis l'index local à jour quand le sujet `surface` est utilisé et que `.mustflow/cache/mustflow.sqlite` est disponible.

## Exemples

```sh
npx mf explain authority
npx mf explain authority AGENTS.md
npx mf explain anchor auth.session.resolve
npx mf explain anchor auth.session.resolve --json
npx mf explain asset-optimization
npx mf explain asset-optimization --json
npx mf explain command test
npx mf explain command lint --json
npx mf explain retention
npx mf explain retention --json
npx mf explain skill code-review
npx mf explain skill mustflow.core.code-review --json
npx mf explain skills
npx mf explain skills --json
npx mf explain surface README.md
npx mf explain surface templates/default/locales/fr/AGENTS.md --json
npx mf explain authority .mustflow/skills/INDEX.md --json
```

## Champs JSON

```sh
npx mf explain authority AGENTS.md --json
```

La sortie lisible par machine utilise ces champs :

- `schema_version` (`string`) : version du format de sortie.
- `command` (`string`) : toujours `explain`.
- `topic` (`string`) : `anchor`, `asset-optimization`, `authority`, `command`, `retention`, `skill`, `skills` ou `surface`.
- `mustflow_root` (`string`) : racine mustflow actuelle.
- `decision` (`object`) : décision résolue, raison, action effective, fichiers sources, état de vérification et détails propres au sujet. Pour `authority`, inclut `boundary.role`, `boundary.canDefine` et `boundary.cannotDefine`. Pour `command`, `decision.effectGraph` contient l'état du graphe d'effets de commande de l'index local, les verrous d'écriture, les conflits, les chemins obsolètes et les suggestions de reconstruction quand l'intention est déclarée. Pour `surface`, `decision.readModel` contient l'état chemin-surface de l'index local en lecture seule et les métadonnées de la règle correspondante quand elles sont disponibles.

## Aide et codes de sortie

```sh
npx mf explain --help
```

- Code `0` : la décision d'autorité a été inspectée et affichée.
- Code `1` : la commande a reçu un sujet invalide, une option inconnue ou un argument inattendu.
