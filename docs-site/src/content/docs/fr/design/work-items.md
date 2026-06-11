---
title: Éléments de travail
description: Comment les éléments de travail locaux optionnels peuvent étendre mustflow tout en conservant des passages de relais bornés.
---

Les éléments de travail sont une surface optionnelle de mustflow pour capturer des issues différées, des propositions et des points de reprise dans le dépôt.

Le modèle par défaut garde cette surface inactive avec `work_items = "disabled"` et `handoff.mode = "report_only"` jusqu’à ce que le projet choisisse un cycle de vie borné.

## Valeurs par défaut

```toml
[capabilities]
work_items = "disabled"

[handoff]
enabled = false
mode = "report_only"
```

Cela signifie que les agents doivent signaler le travail inachevé dans le passage de relais final au lieu de créer de nouveaux fichiers de backlog.

## Pourquoi la valeur par défaut est inactive

- L’installation par défaut doit rester petite jusqu’à ce qu’un projet choisisse un cycle de vie pour les éléments de travail.
- Les fichiers d’issues locaux peuvent devenir obsolètes et dupliquer des gestionnaires d’issues existants.
- Les journaux d’échec, chemins internes, noms de clients et fragments de secrets pourraient fuiter dans les documents.
- Si les agents créent et ferment librement des éléments de travail, la frontière de décision humaine devient floue.

## Orientation

Lorsque l’écriture d’éléments de travail est activée, `.mustflow/work-items/` est plus clair que `.mustflow/pr/`. Les fichiers locaux représentent du travail proposé et des notes de solution, plutôt que de vraies demandes de fusion.

```text
.mustflow/
└─ work-items/
   ├─ README.md
   ├─ issues/
   │  └─ MF-0001.md
   └─ proposals/
      └─ MF-0001-P001.md
```

`issues/` contient des bogues différés, des tâches et des demandes de fonctionnalités. `proposals/` contient des changements proposés pour une issue précise. Les branches, diffs, revues et fusions restent de la responsabilité de Git et des plateformes de collaboration.

## Permissions des agents

Même lorsque les éléments de travail optionnels sont activés, les permissions doivent rester étroites.

- Les agents sont autorisés à créer des candidates d’issues et à proposer des changements.
- Les agents ne doivent pas fermer d’issues ni accepter de propositions sans approbation humaine.
- Les agents ne doivent pas prétendre qu’une vraie demande de fusion existe.
- Les agents ne doivent pas stocker de secrets, de données client ni de journaux d’échec volumineux dans les éléments de travail.

## Commandes candidates

```sh
mf work list
mf work show MF-0001
mf work propose MF-0001
mf work check
```

Ajoutez les commandes d’écriture et de cycle de vie progressivement, avec des schémas bornés, des contrats de commande, de la rédaction et des règles d’approbation humaine avant que les agents puissent créer ou fermer des enregistrements automatiquement.
