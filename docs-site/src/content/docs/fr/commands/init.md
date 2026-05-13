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
   ├─ codebase-orientation/SKILL.md
   ├─ diff-risk-review/SKILL.md
   ├─ docs-prose-review/SKILL.md
   ├─ docs-update/SKILL.md
   ├─ failure-triage/SKILL.md
   ├─ project-context-authoring/SKILL.md
   ├─ readme-authoring/SKILL.md
   ├─ skill-authoring/SKILL.md
   ├─ security-regression-tests/SKILL.md
   ├─ test-design-guard/SKILL.md
   ├─ test-maintenance/SKILL.md
   ├─ visual-review-artifact/SKILL.md
   └─ web-asset-optimization/SKILL.md
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
- Le bloc `.gitignore` géré ignore uniquement les artefacts locaux générés par mustflow: `.mustflow/cache/`, `.mustflow/state/` et `.mustflow/backups/`. Les sorties propres au projet comme `repos/`, `node_modules/`, `dist/` ou `.env` restent sous la responsabilité de l’utilisateur.
- `--force` sauvegarde les fichiers en conflit sous `.mustflow/backups/` avant de les écraser.
- `REPO_MAP.md` est généré depuis la structure du dépôt au lieu d’être copié depuis un modèle statique.
- `manifest.lock.toml` enregistre les hashes des fichiers de workflow installés, l’identifiant du modèle et l’action effectuée pour chaque fichier suivi. Le bloc de support `.gitignore` n’est pas suivi dans le fichier lock.
- `.mustflow/context/` contient du contexte de projet destiné aux agents, pas une archive générale de documentation.
- `README.md`, `.github/` et les répertoires existants `config/`, `docs/` et `skills/` ne sont pas modifiés.
- Le code source, la configuration de gestionnaire de paquets et la configuration d’intégration continue ne sont pas créés.
- Le manifeste de modèle est rejeté s’il déclare des cibles d’installation hors de `AGENTS.md` et `.mustflow/**`.
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
- `git.auto_push=false`
- `git.commit_message.style`
- `git.commit_message.language`
- `git.commit_message.max_suggestions`
- `git.commit_message.include_body`
- `git.commit_message.split_when_multiple_concerns`
- `reporting.commit_suggestion.enabled`
- `release.versioning.impact_check`
- `release.versioning.suggest_bump`
- `release.versioning.auto_bump`
- `release.versioning.require_user_confirmation`
- `release.versioning.sync_template_version`
- `release.versioning.sync_docs_examples`
- `release.versioning.sync_tests`
- `verification.selection.strategy`
- `verification.selection.prefer_related_tests`
- `verification.selection.skip_docs_only_full_test`
- `verification.selection.skip_low_risk_code_full_test`
- `verification.selection.skip_translation_only_full_test`
- `verification.selection.skip_copy_only_full_test`
- `verification.selection.report_skipped`
- `testing.authoring.new_test_policy`
- `testing.authoring.prefer_existing_tests`
- `testing.authoring.require_new_test_rationale`
- `language.memory.summary`

`git.commit_message.style` accepte `conventional`, `descriptive` ou `gitmoji`. Le style `gitmoji` suggère des messages comme `✨ feat: add dashboard setting`, mais cela reste une suggestion de message, pas une autorisation de créer des commits.

`git.commit_message.language` accepte `preserve_existing`, `agent_response`, `docs` ou une étiquette de langue comme `ja`, `de` ou `pt-BR`.

`verification.selection.strategy` accepte `risk_based`, `targeted` ou `full`.

`testing.authoring.new_test_policy` accepte `evidence_required`, `manual_approval` ou `broad`.

`mf init` autorise seulement `git.auto_push=false`, ce qui peut ramener un dépôt à la valeur sûre par défaut. Il ne peut pas activer `git.auto_push=true`; si un dépôt a réellement besoin de ce comportement, modifiez le fichier manuellement après l’installation.

`--yes` rend explicites les valeurs sûres par défaut. Il n’écrase pas automatiquement les fichiers en conflit.

## Limites de configuration

`mf init` n’initialise pas une application prête à compiler. Il installe uniquement les règles de workflow dont les agents de code LLM ont besoin pour lire les instructions du dépôt, éviter de deviner les commandes et vérifier leur travail.

| Moment | Configuration |
| --- | --- |
| Questions interactives | Langue des documents, profil du projet, langue du rapport final de l’agent et préférences avancées optionnelles pour Git et les rapports. |
| Uniquement par CLI pendant init | Locale source du produit, locales cibles du produit et préférences autorisées via `--set`. |
| Modification après installation | Contrats de commandes de test, lint, build et exécution longue; politiques d’approbation et d’isolation; contexte du projet; skills personnalisées; CI; README; et paramètres de l’application. |

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
