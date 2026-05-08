---
title: schemas/
description: Contrats JSON Schema publiés pour les sorties JSON stables de mustflow.
---

`schemas/` contient les contrats JSON Schema publiés pour les sorties JSON de
mustflow lisibles par machine et les structures de configuration analysées.

## Installé par mf init

Non. `mf init` ne copie pas `schemas/` dans le dépôt utilisateur.

Le modèle d’initialisation par défaut reste volontairement léger. Il installe
`AGENTS.md`, `.mustflow/**` et le bloc géré par mustflow dans `.gitignore`;
`REPO_MAP.md` est généré plus tard avec `mf map`.

## Distribué avec le paquet npm

Oui. `schemas/` est inclus dans le paquet npm afin que les outils puissent
s’appuyer sur ces contrats sans analyser du texte destiné aux personnes.

Pour construire des automatisations autour des sorties `--json`, utilisez les
schémas du paquet installé ou ceux du dépôt mustflow.

## Schémas actuels

- `doctor-report.schema.json`: `mf doctor --json`
- `context-report.schema.json`: `mf context --json`
- `run-receipt.schema.json`: `mf run <intent> --json` et `.mustflow/state/runs/latest.json`
- `commands.schema.json`: `.mustflow/config/commands.toml` analysé

La sortie de commande destinée aux personnes n’est pas couverte par ces schémas.
