---
title: i18n.toml
description: Métadonnées de modèle pour suivre les documents canoniques et les traductions.
---

`i18n.toml` suit la langue canonique et l’état de traduction des documents de modèle mustflow.

Ce fichier n’est pas copié dans les dépôts utilisateur par `mf init`. Ce sont des métadonnées côté paquet pour suivre les révisions des documents de modèle et l’état des traductions.

## Pourquoi il existe

Lorsque les documents changent souvent via des issues et des demandes de fusion, la date de modification des fichiers ne suffit pas pour savoir quelle langue est à jour.

mustflow compare la `revision` d’un document canonique avec le `source_revision` de chaque traduction.

## Structure

```toml
version = 1
source_locale = "en"

[documents."agents.root"]
source = "locales/en/AGENTS.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/AGENTS.md", source_revision = 1, status = "current" }

[documents."docs.agent-workflow"]
source = "locales/en/.mustflow/docs/agent-workflow.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/.mustflow/docs/agent-workflow.md", source_revision = 1, status = "current" }

[documents."skill.code-review"]
source = "locales/en/.mustflow/skills/code-review/SKILL.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/.mustflow/skills/code-review/SKILL.md", source_revision = 1, status = "current" }
```

## Champs

- `version`: version de ce format de métadonnées.
- `source_locale`: langue canonique des documents du modèle actuel.
- `status_values`: valeurs d’état de traduction autorisées.
- `documents.<id>`: identifiant stable d’un document suivi.
- `source`: chemin interne au modèle du document canonique.
- `source_locale`: langue canonique de ce document.
- `revision`: révision canonique du document.
- `translations`: emplacement pour associer les documents traduits aux révisions sources et à leur état.

## Valeurs d’état

- `current`: la traduction correspond à la révision canonique actuelle.
- `stale`: le document canonique a changé et la traduction n’a pas été mise à jour.
- `needs_review`: la traduction existe mais doit être relue.
- `missing`: la traduction n’existe pas.

La fraîcheur est déterminée en comparant `revision` et le `source_revision` de chaque traduction, pas par la date de modification du fichier.

## Validation

La suite de tests du paquet valide ces métadonnées avant publication:

- `source_locale` doit correspondre à `manifest.toml`.
- Les chemins de source et de traduction doivent pointer vers de vrais fichiers de modèle.
- Les traductions `current` doivent utiliser le même `source_revision` que la `revision` du document source.
- Le frontmatter Markdown doit correspondre à l’identifiant du document suivi et à la locale.
- Les fichiers Markdown canoniques doivent utiliser `canonical: true`; les fichiers Markdown traduits doivent utiliser `canonical: false`.
