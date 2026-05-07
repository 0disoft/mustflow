---
title: mustflow
description: Documentation utilisateur du flux de travail lisible par les agents installé par mustflow.
---

La documentation de mustflow explique les fichiers et champs destinés uniquement aux LLM que `mf init` crée dans un dépôt utilisateur.

## Ce que ce site explique

- L'emplacement de chaque fichier dans le dépôt cible.
- Les fichiers que les agents lisent en premier.
- La signification de chaque champ de configuration et de chaque section de document.
- Les fichiers copiés, les fichiers générés et ceux qui sont volontairement absents.
- La manière dont les contrats de commande empêchent les agents de deviner les commandes.
- Le contexte que les agents peuvent inspecter avec `mf context --json`.

## Structure par défaut

```text
AGENTS.md
REPO_MAP.md  # fichier généré facultatif
.mustflow/
├─ config/
│  ├─ commands.toml
│  ├─ mustflow.toml
│  ├─ preferences.toml
│  └─ manifest.lock.toml  # généré après une initialisation réussie
├─ context/
│  ├─ INDEX.md
│  └─ PROJECT.md
├─ docs/
│  └─ agent-workflow.md
├─ skills/
│  ├─ INDEX.md
│  └─ */SKILL.md
└─ state/  # généré pendant l'utilisation
   └─ runs/latest.json
```

`mf init` ne crée pas `README.md`, `.github/`, le répertoire racine `docs/`, le répertoire racine `skills/`, le code source ni la configuration du gestionnaire de paquets.
`REPO_MAP.md` est généré à partir de la structure du dépôt au lieu d'être copié depuis le modèle.
`manifest.lock.toml` est généré par `mf init` pour enregistrer le résultat réel de l'installation.
`.mustflow/state/runs/latest.json` est le dernier reçu d'exécution créé par `mf run`.

## Ordre de lecture

1. Lisez `AGENTS.md` pour connaître les règles obligatoires courtes.
2. Lisez `.mustflow/docs/agent-workflow.md` pour connaître la politique de travail commune.
3. Lisez `.mustflow/config/mustflow.toml` pour connaître les documents de référence et les chemins protégés.
4. Lisez `.mustflow/config/commands.toml` pour connaître les intentions de commande exécutables.
5. Lisez `.mustflow/config/preferences.toml`, lorsqu'il existe, pour connaître les valeurs par défaut du dépôt.
6. Lisez `.mustflow/skills/INDEX.md` pour choisir la compétence pertinente.
7. Lisez `.mustflow/context/INDEX.md` uniquement lorsqu'un contexte de projet propre à la tâche est nécessaire.

Ce site est une documentation de référence. Il n'est pas copié dans les projets utilisateur.
