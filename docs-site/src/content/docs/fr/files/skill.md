---
title: .mustflow/skills/*/SKILL.md
description: Document de procédure pour les tâches répétables des agents.
---

`.mustflow/skills/*/SKILL.md` aide les agents à effectuer des tâches répétables sans deviner.

## Où il est utilisé

Les agents choisissent un skill pertinent depuis `.mustflow/skills/INDEX.md`, puis lisent ce skill avant d’effectuer un travail répétable.

Les documents de skill couvrent des procédures comme la revue de code, la maintenance des tests, le triage des échecs et les mises à jour de documentation. Ils référencent `.mustflow/docs/agent-workflow.md` au lieu de copier la politique partagée.

Activer une skill signifie lire et suivre sa procédure. Cela n’accorde pas le droit d’exécuter des
commandes hors de `.mustflow/config/commands.toml` ni d’ignorer les instructions de priorité supérieure.

## Frontmatter

```yaml
mustflow_doc: skill.code-review
locale: en
canonical: true
revision: 1
name: code-review
description: Use when reviewing code changes, scope, risks, or missing verification.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - test
    - lint
```

- `mustflow_doc`: identifiant stable du skill dans mustflow.
- `locale`: langue du document.
- `canonical`: indique si ce document est la source canonique.
- `revision`: révision canonique du document.
- `name`: nom du skill. Il doit correspondre au dossier `.mustflow/skills/<name>/`.
- `description`: moment où un agent doit lire ce skill.
- `metadata.mustflow_schema`: version de la structure des métadonnées de skill. La valeur actuellement prise en charge est `"1"`.
- `metadata.mustflow_kind`: type de document. Les skills par défaut doivent utiliser `procedure`.
- `metadata.command_intents`: noms d’intentions de commande que ce skill peut référencer. Chaque nom doit exister dans `.mustflow/config/commands.toml`.

Le modèle de skill anglais est la source canonique. Les modèles de skill localisés utilisent leur propre locale et définissent `canonical: false`.

## Sections standard

Chaque document de skill doit inclure:

- `Purpose`: tâche couverte par ce skill.
- `Use when`: situations qui doivent déclencher ce skill.
- `Do not use when`: exclusions qui évitent un usage excessif.
- `Required inputs`: informations que les agents doivent rassembler avant d’agir.
- `Procedure`: séquence de travail.
- `Validation`: intentions de commande et contrôles pertinents.
- `Failure handling`: quoi faire lorsque les commandes échouent ou que des informations manquent.
- `Output contract`: éléments à inclure dans le rapport final.

## Règles de rédaction

Chaque skill doit couvrir un seul type de tâche.

N’écrivez pas de commandes shell brutes dans les documents de skill. Dans la section de validation, référencez `.mustflow/docs/agent-workflow.md#command-execution-policy` et listez uniquement les noms d’intentions de commande pertinents.

Résolvez chaque intention via `.mustflow/config/commands.toml`. Si `status = "configured"` n’est pas présent, ne l’exécutez pas; signalez l’état et la raison de l’omission.

N’écrivez pas qu’une skill accorde elle-même l’autorisation d’exécuter des commandes. Les skills décrivent la procédure; `.mustflow/config/commands.toml` reste l’unique source des autorisations de commandes exécutables.

Exemple:

```md
## Validation

Relevant command intents:

- `test`
- `lint`

Resolve each intent through `.mustflow/config/commands.toml`.
```

## Ressources de support

Un skill par défaut commence uniquement avec `SKILL.md`. Ne créez pas à l’avance de dossiers `references/`, `assets/` ou `scripts/` vides.

Lorsqu’un skill devient long ou a besoin de matériel de support séparé, ajoutez un `resources.toml` optionnel et enregistrez-y les références, modèles ou scripts. Les scripts ne doivent pas être invoqués via des chemins devinés; reliez-les à des intentions de commande dans `.mustflow/config/commands.toml`.

Consultez [Ressources de skill](../../design/skill-resources/) pour les règles détaillées.
