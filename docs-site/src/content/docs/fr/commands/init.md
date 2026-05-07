---
title: mf init
description: Initialise les documents mustflow dans un dépôt utilisateur.
---

`mf init` copie un modèle mustflow dans la racine du dépôt utilisateur.

Il crée `AGENTS.md` à la racine et stocke les documents et paramètres gérés par mustflow sous `.mustflow/`.

## Structure créée

```text
AGENTS.md
.gitignore
.mustflow/
├─ config/
│  ├─ commands.toml
│  ├─ mustflow.toml
│  ├─ preferences.toml
│  └─ manifest.lock.toml
├─ context/
│  ├─ INDEX.md
│  └─ PROJECT.md
├─ docs/
│  └─ agent-workflow.md
└─ skills/
   ├─ INDEX.md
   ├─ code-review/SKILL.md
   ├─ docs-update/SKILL.md
   ├─ failure-triage/SKILL.md
   └─ test-maintenance/SKILL.md
```

`REPO_MAP.md` n’est pas copié depuis un modèle statique. Il est généré à partir de la structure du dépôt lorsque l’utilisateur le demande.
`manifest.lock.toml` est aussi généré après un `mf init` réussi; il enregistre ce qui a réellement été installé.
mustflow ne crée pas `DESIGN.md`. Si un projet en possède déjà un, `mf map` peut le traiter comme ancre facultative de design visuel.

## Disposition de la source du modèle

Les chemins cibles d’installation restent cohérents, mais le modèle côté paquet est divisé par objectif:

```text
templates/default/
├─ common/
│  ├─ gitignore.mustflow
│  └─ .mustflow/config/
└─ locales/
   ├─ en/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   ├─ ko/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   ├─ zh/
   ├─ es/
   ├─ fr/
   └─ hi/
```

`common/` contient la configuration TOML neutre vis-à-vis de la langue et le fragment `.gitignore` géré. `locales/<locale>/` contient les documents Markdown et fichiers de skills sélectionnés par `--locale`.

## Règles

- Les fichiers copiés sont limités aux fichiers de flux de travail lus directement par les agents LLM.
- Installer le paquet seul ne modifie pas les fichiers utilisateur.
- Par défaut, les conflits avec des fichiers existants font échouer le processus avant toute écriture.
- Si `AGENTS.md` existe déjà, `--merge` peut insérer uniquement le bloc géré par mustflow.
- `mf init` crée `.gitignore` s’il manque. S’il existe déjà, mustflow met à jour uniquement son bloc géré et conserve les règles utilisateur.
- `--force` sauvegarde les fichiers en conflit sous `.mustflow/backups/` avant de les écraser.
- `REPO_MAP.md` est généré depuis la structure du dépôt au lieu d’être copié depuis un modèle statique.
- `manifest.lock.toml` enregistre les hashes des fichiers de workflow installés, l’identifiant du modèle et l’action effectuée pour chaque fichier suivi. Le bloc de support `.gitignore` n’est pas suivi dans le fichier lock.
- `.mustflow/context/` contient du contexte de projet destiné aux agents, pas une archive générale de documentation.
- `README.md`, `.github/` et les répertoires existants `config/`, `docs/` et `skills/` ne sont pas modifiés.
- Le code source, la configuration de gestionnaire de paquets et la configuration d’intégration continue ne sont pas créés.
- `--dry-run` imprime le plan d’installation sans écrire de fichiers.
- `manifest.lock.toml` n’est pas écrit lorsque l’installation s’arrête sur des conflits ou s’exécute avec `--dry-run`.

## Exemples

```sh
npx mf init
npx mf init --yes
npx mf init --dry-run
npx mf init --interactive
npx mf init --set git.auto_commit=true
npx mf init --merge
npx mf init --force
npx mf init --profile product --locale ko --agent-lang ko
npx mf init --profile product --product-source-locale en --product-locale ko-KR
```

Dans un terminal interactif, `mf init` demande la langue des documents, le
profil du projet et la langue des rapports de l'agent. `--interactive` force ce
flux de questions. Lorsque les préférences avancées sont activées, l’assistant
peut aussi définir le staging automatique, les commits automatiques, la langue
des messages de commit et les suggestions de messages de commit. `--yes`
installe les valeurs par défaut en anglais sans poser de questions.

`--set` peut définir une courte liste de préférences autorisées pendant
l’installation:

- `git.auto_stage`
- `git.auto_commit`
- `git.commit_message.language`
- `reporting.commit_suggestion.enabled`
- `language.memory.summary`

`git.auto_push` n’est volontairement pas disponible via `mf init`; configurez-le
manuellement après l’installation si un dépôt en a réellement besoin.

`--yes` rend explicites les valeurs sûres par défaut. Il n’écrase pas automatiquement les fichiers en conflit.

## Profils et langues

`profile` décrit le type de projet, pas un pays ni une langue.

Les profils intégrés pris en charge sont:

- `minimal`
- `oss`
- `team`
- `product`
- `library`

`--locale` est la langue des documents mustflow installés. Le modèle par défaut actuel fournit `en`, `ko`, `zh`, `es`, `fr` et `hi`, avec `en` comme valeur par défaut.

`--agent-lang` est la langue par défaut des rapports finaux de l’agent. Elle peut différer de la langue des documents mustflow.

La localisation du texte produit visible par les utilisateurs est enregistrée séparément avec `--product-source-locale` et `--product-locale`. Ces valeurs sont écrites dans `[product_i18n]` dans `.mustflow/config/preferences.toml`; elles ne sont ni la langue des documents mustflow ni la langue de sortie de la CLI.

Par exemple, un projet peut demander des rapports d’agent en coréen, installer les documents mustflow en coréen, garder les chaînes source du produit en anglais et prendre en charge les utilisateurs coréens:

```sh
npx mf init --profile product --locale ko --agent-lang ko --product-source-locale en --product-locale ko-KR
```

## Sortie structurée

`mf init` ne fournit actuellement pas de format de sortie JSON.

Les scripts automatisés ne doivent pas analyser la sortie lisible par une personne. Après l’installation, utilise `mf status --json` ou `mf check --json` pour vérifier le résultat.

## Aide et codes de sortie

```sh
npx mf init --help
```

La sortie d’aide est organisée en `Usage`, `Options`, `Examples` et `Exit codes`.

- Code de sortie `0`: l’installation s’est terminée, aucune action n’était nécessaire ou le plan `--dry-run` a été imprimé.
- Code de sortie `1`: des options inconnues, conflits de fichiers ou options incompatibles ont arrêté l’écriture.

Les options inconnues impriment la raison de l’erreur avec l’indication d’exécuter `mf init --help`.
