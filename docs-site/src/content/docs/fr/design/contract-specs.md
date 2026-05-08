---
title: Spécifications de contrat
description: Documents racine versionnés qui définissent les règles vérifiables de mustflow.
---

mustflow conserve ses spécifications de contrat versionnées dans le dépôt, sous
[`docs/spec/`](https://github.com/0disoft/mustflow/tree/main/docs/spec).

Ces documents définissent les règles que les futurs commandes et schémas doivent
partager. Ce sont des documents de référence concis, pas des tutoriels.

## Schémas JSON

Les schémas JSON publiés se trouvent dans
[`schemas/`](https://github.com/0disoft/mustflow/tree/main/schemas) et sont
inclus dans le paquet npm.

- `doctor-report.schema.json` : `mf doctor --json`.
- `context-report.schema.json` : `mf context --json`.
- `run-receipt.schema.json` : `mf run <intent> --json` et `.mustflow/state/runs/latest.json`.
- `commands.schema.json` : `.mustflow/config/commands.toml` parsé.

## Spécifications actuelles

- `instruction-authority-v1.md`: résolution des règles effectives entre instructions utilisateur, politique du host, fichiers du dépôt, contrats de commande et état généré.
- `command-contract-v1.md`: conditions permettant d'exécuter un command intent avec `mf run`.
- `verification-receipt-v1.md`: dernier reçu d'exécution écrit par `mf run`.
- `state-retention-v1.md`: limites pour l'état généré, le cache, les reçus et la sortie brute.

## Relation avec les fichiers installés

Les spécifications décrivent le comportement de fichiers installés comme
`AGENTS.md`, `.mustflow/docs/agent-workflow.md`,
`.mustflow/config/mustflow.toml` et `.mustflow/config/commands.toml`.

Si une spécification et le comportement courant ne correspondent pas, traitez
cela comme un bug d'implémentation ou de documentation. N'utilisez pas une
spécification pour remplacer les instructions utilisateur courantes, les
barrières de sécurité du host ou le root mustflow installé le plus proche.
