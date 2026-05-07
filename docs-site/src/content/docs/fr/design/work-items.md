---
title: Éléments de travail
description: Pourquoi les éléments de travail locaux ne sont pas installés par défaut et comment mustflow pourrait les prendre en charge à l’avenir.
---

Par défaut, mustflow ne crée pas de dossiers locaux d’issues ou de propositions.

Les éléments de travail fondés sur des fichiers peuvent être utiles, mais les installer par défaut ferait évoluer mustflow d’un flux de documents pour agents vers un gestionnaire local d’issues. Actuellement, `.mustflow/config/mustflow.toml` déclare seulement `work_items = "disabled"` et `handoff.mode = "report_only"`.

## Valeurs par défaut

```toml
[capabilities]
work_items = "disabled"

[handoff]
enabled = false
mode = "report_only"
```

Cela signifie que les agents doivent signaler le travail inachevé dans le passage de relais final au lieu de créer de nouveaux fichiers de backlog.

## Pourquoi ils ne sont pas activés par défaut

- L’objectif principal de `mf init` est de mettre en place des fichiers de flux de travail réservés aux LLM.
- Les fichiers d’issues locaux peuvent devenir obsolètes et dupliquer des gestionnaires d’issues existants.
- Les journaux d’échec, chemins internes, noms de clients et fragments de secrets pourraient fuiter dans les documents.
- Si les agents créent et ferment librement des éléments de travail, la frontière de décision humaine devient floue.

## Orientation optionnelle

Si cela devient une fonctionnalité optionnelle à l’avenir, `.mustflow/work-items/` est plus clair que `.mustflow/pr/`. Les fichiers locaux représentent du travail proposé et des notes de solution, plutôt que de vraies demandes de fusion.

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

## Commandes candidates futures

```sh
mf work list
mf work show MF-0001
mf work propose MF-0001
mf work check
```

Ces commandes sont hors du périmètre d’implémentation actuel. mustflow doit stabiliser le flux fondé sur des fichiers, le contrat de commande et le flux de validation avant d’ajouter cette interface optionnelle.
