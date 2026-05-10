---
title: Ressources de skill
description: Explique comment ajouter des références, des assets, des scripts et resources.toml lorsque le périmètre d’un skill dépasse SKILL.md.
---

Un skill mustflow commence par un seul fichier `.mustflow/skills/<name>/SKILL.md`.

Ne créez pas à l’avance de dossiers `references/`, `assets/` ou `scripts/` vides. Ajoutez des ressources de support uniquement lorsque le document du skill devient trop volumineux ou lorsqu’un assistant répétable est réellement nécessaire.

## Principes de base

- `SKILL.md` est le point d’entrée du skill.
- `resources.toml` existe uniquement lorsque des ressources de support existent.
- `references/` stocke du contenu long en lecture seule, comme des grilles d’évaluation, des exemples et des notes de contexte.
- `assets/` stocke des fichiers réutilisables, comme des modèles, des entrées d’exemple et des schémas.
- `scripts/` existe uniquement lorsque le skill exige un assistant dédié.
- Les scripts ne sont pas invoqués directement depuis `SKILL.md`; ils sont résolus via `.mustflow/config/commands.toml`.

## Structure optionnelle

```text
.mustflow/skills/<name>/
├─ SKILL.md
├─ resources.toml        # optional: only when supporting resources exist
├─ references/           # optional: read-only reference material
├─ assets/               # optional: templates, schemas, sample inputs
└─ scripts/              # optional: helpers connected to command intents
```

Ce n’est pas un échafaudage obligatoire pour chaque skill. Le modèle par défaut fournit `SKILL.md`; les autres fichiers et dossiers doivent être ajoutés uniquement lorsque le skill en a réellement besoin.

## resources.toml

`resources.toml` est un index optionnel pour les ressources de support. Il ne remplace pas le corps du skill. Il aide les agents à décider quel matériel peut être lu ou exécuté, et dans quelles conditions.

Structure attendue:

```toml
schema_version = "1"

[resources."references/severity-rubric.md"]
type = "reference"
purpose = "Rubric for classifying review finding severity."
read_when = ["finding_severity_is_unclear"]
required = false

[resources."assets/templates/review-report.md"]
type = "asset"
asset_kind = "template"
purpose = "Template for review report output."
required = false

[resources."scripts/validate-review-report.py"]
type = "script"
language = "python"
purpose = "Validates the review report format."
run_policy = "requires_command_contract"
command_intent = "review_report_validate"
network = false
destructive = false
writes = []
dependencies = ["python>=3.10"]
```

## references/

Utilisez `references/` pour le contenu long que les agents lisent seulement lorsque c’est nécessaire.

Exemples:

- Grilles de décision
- Cas d’échec et corrections
- Exemples de sortie
- Notes de contexte

Ne stockez pas ici de secrets, de journaux d’exécution bruts, de caches générés ni de gros fichiers.

## assets/

Utilisez `assets/` pour les fichiers statiques qui soutiennent le skill.

Exemples:

- Modèles de rapport
- Fichiers d’entrée d’exemple
- Schémas de validation
- Petits jeux de données d’exemple

Ne stockez pas ici de gros binaires, de sorties de construction, de caches ni de secrets.

## scripts/

Utilisez `scripts/` pour les assistants dédiés du skill.

Chaque script doit:

- Fournir une sortie d’aide.
- Renvoyer un code de sortie non nul en cas d’échec.
- Déclarer des règles claires d’entrée et de sortie.
- Déclarer les écritures de fichiers ou l’accès réseau via `resources.toml` et `commands.toml`.
- Éviter les comportements destructeurs par défaut.

Les agents ne doivent pas deviner les chemins de scripts et les exécuter directement. Lorsqu’une exécution est nécessaire, résolvez d’abord l’intention de commande associée dans `.mustflow/config/commands.toml`.

## Relation avec skills/INDEX.md

`.mustflow/skills/INDEX.md` liste les skills, pas chaque fichier de support sous chaque skill.

Les ressources de support sont indexées par le fichier `resources.toml` local au skill.

## Orientation du registre communautaire de skills

Le cœur de mustflow ne doit pas étendre indéfiniment son ensemble de skills par défaut. Le modèle par défaut doit rester petit, tandis que des skills supplémentaires pourront ensuite venir d’un dépôt communautaire séparé.

Les noms de dépôt doivent suivre la convention de nommage de mustflow, comme `mustflow-skills` ou `mustflow-community-skills`. Évitez les noms trop larges ou faciles à confondre avec d’autres écosystèmes de skills.

Si un dépôt communautaire de skills est introduit, chaque skill doit fournir à la fois `SKILL.md` et un `skill.toml` propre à mustflow. Le fichier `skill.toml` doit déclarer l’identifiant du skill, sa version, la plage compatible de mustflow, la licence, les scripts inclus, l’usage du réseau, le périmètre d’écriture et le niveau de risque.

Les groupes de skills doivent être appelés `pack` ou `bundle`, et non skills d’automatisation. Un pack installe des skills; il ne doit pas exécuter de commandes ni modifier automatiquement `.mustflow/config/commands.toml`. Les intentions de commande requises ou recommandées doivent être signalées, puis déclarées par l’utilisateur pour le projet actuel.

Les futures commandes `mf skill add` ou `mf pack add` doivent implémenter ces règles de sécurité:

- Prévisualiser les fichiers modifiés, les scripts inclus, les permissions et le niveau de risque avant l’installation.
- Ne jamais exécuter de scripts pendant l’installation.
- Enregistrer la source, la version et les hashes dans un fichier de verrouillage comme `.mustflow/skills.lock.toml`.
- Permettre à `mf skill audit` de vérifier le fichier de verrouillage, les hashes actuels des fichiers, les liens entre scripts et intentions de commande, ainsi que les skills obsolètes.
- Garder l’export vers les emplacements de skills propres aux outils comme adaptateur optionnel, pas comme cible d’installation par défaut.

## Règles de vérification

`mf check --strict` vérifie que:

- Les fichiers enregistrés existent.
- Les fichiers enregistrés se trouvent sous `references/`, `assets/` ou `scripts/`.
- `scripts/` ne contient pas d’assistants non enregistrés.
- Les scripts utilisent `run_policy = "requires_command_contract"` et pointent vers une intention de commande configurée dans `commands.toml`.
- Les scripts n’activent pas l’accès réseau ni les comportements destructeurs par défaut.
- Les déclarations `writes` des scripts sont limitées au dossier du skill via des chemins relatifs.
- Chaque dossier de skill contient un `SKILL.md`.

Le modèle par défaut inclut maintenant un premier skill avec ressources : `visual-review-artifact/resources.toml`. Ajoutez d’autres index de ressources uniquement lorsqu’un skill a vraiment besoin de références, d’assets ou de scripts de support.
Les contrôles de gros fichiers, de secrets et de caches peuvent être étendus comme contrôles séparés de sûreté du dépôt, de façon similaire à la rétention et à la validation des fichiers de contexte.
