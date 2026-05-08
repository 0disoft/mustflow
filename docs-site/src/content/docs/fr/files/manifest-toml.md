---
title: templates/default/manifest.toml
description: Métadonnées de modèle indiquant à mf init quels fichiers copier et comment gérer les conflits.
---

`templates/default/manifest.toml` contient les métadonnées utilisées par `mf init` lors de l’installation d’un modèle.

Ce fichier n’est pas copié dans les dépôts utilisateur. C’est la source de vérité côté paquet pour la manière dont mustflow installe un modèle.

## Rôle

- Déclare l’identifiant et la description du modèle.
- Déclare si le périmètre d’installation est limité aux fichiers réservés aux LLM.
- Liste les fichiers que le modèle crée.
- Définit si les conflits avec des fichiers existants interrompent l’installation, fusionnent un bloc géré ou sauvegardent puis écrasent.
- Liste les contrôles de suivi qu’une personne doit effectuer après l’installation.

## Champs

- `id`: identifiant stable du modèle.
- `name`: nom du modèle lisible par une personne.
- `version`: version du modèle.
- `description`: objectif du modèle.
- `common_root`: dossier de base contenant les fichiers indépendants de la langue à copier.
- `locales_root`: dossier de base contenant les fichiers propres à la locale sélectionnés par `--locale`.
- `profiles.default`: type de projet utilisé par `mf init` lorsqu’aucun n’est sélectionné.
- `profiles.available`: types de projet autorisés par le modèle par défaut.
- `locales.default`: locale des documents mustflow utilisée par `mf init` lorsqu’aucune n’est sélectionnée.
- `locales.available`: locales de documents réellement fournies par le modèle.
- `locales.source`: locale source canonique des documents de modèle localisés.
- `install_policy.scope`: périmètre d’installation. Le modèle par défaut utilise `llm_only`.
- `install_policy.copied_targets`: cibles copiées directement.
- `install_policy.generated_targets`: cibles qui peuvent être générées après l’installation.
- `install_policy.forbidden_targets`: cibles non autorisées dans le modèle par défaut.
- `creates`: fichiers que le modèle peut créer.
- `after_install`: contrôles de suivi pour l’utilisateur.
- `i18n.metadata`: fichier de métadonnées pour le suivi des traductions.
- `i18n.source_locale`: locale source attendue par `i18n.toml`.
- `conflict_policy`: comportement par défaut en cas de conflit avec un fichier existant. Par défaut, interrompre avant l’écriture.
- `conflict_policy.files`: comportement de conflit par fichier.
- `conflict_policy.generated`: comportement de conflit pour les fichiers générés.

## Périmètre d’installation

```toml
[install_policy]
scope = "llm_only"
copied_targets = [
  "AGENTS.md",
  ".mustflow/**",
]
generated_targets = [
  "REPO_MAP.md",
  ".mustflow/config/manifest.lock.toml",
  ".mustflow/state/**",
]
```

- `scope`: signifie que ce modèle installe uniquement des fichiers de flux de travail pour agents LLM.
- `copied_targets`: chemins copiés directement depuis le modèle.
- `generated_targets`: chemins générés après lecture de la structure du dépôt.
- `forbidden_targets`: chemins qui ne doivent pas être ajoutés au modèle par défaut.

Le modèle par défaut ne crée pas les documents racine ni les contrats appartenant au projet comme `README.md`, `PROJECT.md`, `ROADMAP.md`, `DESIGN.md`, `GOVERNANCE.md`, `TESTING.md`, `API.md`, `project.contract.json` ou `openapi.yaml`; il ne crée pas non plus `.github/`, `docs/` à la racine, `skills/` à la racine, de code source ni de configuration de gestionnaire de paquets.
Il peut créer `.mustflow/context/**` parce que ces fichiers sont du contexte de flux de travail pour agents LLM, pas de la documentation générale du projet.
`REPO_MAP.md`, `.mustflow/config/manifest.lock.toml` et `.mustflow/state/**` sont générés, pas copiés.
`.mustflow/state/**` contient l’état local créé pendant l’utilisation, comme les reçus de `mf run`.

## Profils et langues

Les profils décrivent le type de projet, pas un pays ni une langue.

```toml
[profiles]
default = "minimal"
available = ["minimal", "oss", "team", "product", "library"]

[locales]
default = "en"
available = ["en", "ko", "zh", "es", "fr", "hi"]
source = "en"
```

`common_root` fournit la configuration TOML partagée par toutes les locales. `locales_root` fournit les documents Markdown et fichiers de skills localisés. `locales.available` inclut uniquement les langues de documents qui peuvent réellement être installées. `locales.source` est la locale source canonique utilisée pour le suivi des traductions.

## Règles de rédaction

`manifest.toml` n’est pas un document installé dans le projet cible. Il gère le modèle mustflow lui-même.

Lorsqu’un nouveau fichier est ajouté à un modèle, mettez à jour `creates`, `install_policy` et la politique de conflit dans ce fichier en même temps.
Vérifiez aussi que le lecteur principal du nouveau fichier est un agent LLM.
Lors de l’ajout d’un fichier généré, mettez à jour ensemble `generated_targets` et `conflict_policy.generated`.

`AGENTS.md` peut recevoir un bloc géré par mustflow via `--merge`, mais les conflits de fichiers de configuration ne sont pas fusionnés automatiquement.
`manifest.lock.toml` est reproductible après une installation réussie; sa politique de fichier généré est donc `regenerate`.
`.mustflow/state/**` est un état local d’exécution créé pendant l’utilisation; les flux de mise à jour et de suppression doivent donc le préserver par défaut.
