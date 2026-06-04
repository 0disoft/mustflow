---
title: preferences.toml
description: Déclare les valeurs par défaut du dépôt pour la langue des agents, le style, les rapports Git et la documentation.
---

`.mustflow/config/preferences.toml` déclare les valeurs par défaut au niveau du dépôt pour le travail des agents.

Ce fichier n’a pas l’autorité la plus élevée. Les instructions directes de l’utilisateur, les instructions de niveau supérieur, les fichiers `AGENTS.md` à portée limitée, le style local existant et le contrat de commande priment.

## Où il est utilisé

- Définit les valeurs par défaut pour la langue des réponses, la langue de la documentation, les commentaires de code, les journaux et le texte destiné aux utilisateurs.
- Définit les valeurs par défaut pour la mémoire dérivée, comme les résumés de compaction et les résumés de passage de relais.
- Sépare le `profile` du projet, la locale des documents mustflow et la langue des rapports d’agent.
- Enregistre le comportement de localisation du produit dans `[product_i18n]` uniquement lorsque c’est nécessaire.
- Déclare les valeurs de repli pour les nouveaux dépôts où aucune convention existante n’est visible.
- Garde l’ajout à l’index Git, les commits et les pushes automatiques désactivés par défaut.
- Sépare les suggestions de message de commit de la permission de créer réellement un commit.
- Suit les vérifications d’impact de version sans accorder d’autorisation de release ou de changement de version.
- Indique si les changements à faible risque peuvent éviter la suite complète de vérification.
- Guide la facilité avec laquelle les agents écrivent de nouveaux tests sans affaiblir la vérification requise.
- Donne à `mf check` un fichier de préférences vérifiable par machine.
- Donne à `mf help preferences` le fichier source à résumer.

## Structure de base

```toml
schema_version = "1"

[project]
convention_mode = "bootstrap"
profile = "minimal"

[language]
agent_response = "ko"
docs = "ko"

[language.code_comments]
mode = "preserve_existing"
fallback = "en"

[language.logs]
mode = "preserve_existing"
fallback = "en"

[language.memory]
summary = "agent_response"
fallback = "en"
preserve_code = true
preserve_paths = true
preserve_error_output = true

[git]
auto_stage = false
auto_commit = false
auto_push = false

[git.commit_message]
suggest = "when_changes_made"
style = "conventional"
language = "preserve_existing"
language_when_missing = "en"
max_suggestions = 2

[reporting.commit_suggestion]
enabled = true
when = "files_changed"
source = "git.commit_message"

[release.versioning]
impact_check = true
suggest_bump = true
auto_bump = true
require_user_confirmation = false
sync_template_version = true
sync_docs_examples = true
sync_tests = true

[verification.selection]
strategy = "risk_based"
prefer_related_tests = true
skip_docs_only_full_test = true
skip_low_risk_code_full_test = true
skip_translation_only_full_test = true
skip_copy_only_full_test = true
report_skipped = true

[testing.authoring]
new_test_policy = "evidence_required"
prefer_existing_tests = true
require_new_test_rationale = true
```

## Profil et locale

`project.profile` est le type de projet, pas un pays ni une langue. La valeur par défaut est `minimal`, et les profils intégrés sont `minimal`, `patterns`, `oss`, `team`, `product` et `library`.

`language.agent_response` est la langue par défaut des rapports finaux des agents.

`language.docs` est la locale des documents mustflow.

La langue source et les locales cibles du texte produit destiné aux utilisateurs appartiennent à `[product_i18n]`.

```toml
[product_i18n]
enabled = true
source_locale = "en"
target_locales = ["en-US", "ko-KR"]
fallback_locale = "en"
locale_tag_format = "bcp47"
user_facing_text_policy = "externalize"
hardcoded_user_facing_strings = "avoid"
translation_policy = "update_source_mark_targets_stale"
do_not_translate = ["identifiers", "log_keys", "error_codes", "metric_names", "api_field_names"]
```

Les agents ne doivent pas déduire la langue du texte produit depuis la langue de discussion de l’utilisateur. Lorsque la locale source change, les traductions cibles doivent être mises à jour ou signalées comme nécessitant une relecture selon la politique.

## Langue des résumés de mémoire

`language.memory.summary` contrôle la langue de la mémoire dérivée, comme les résumés de compaction, les résumés de passage de relais et les candidats de mémoire longue durée.

La valeur par défaut est `agent_response`, qui suit la langue des rapports finaux des agents. Les projets peuvent aussi utiliser `docs`, `preserve_existing` ou une étiquette de langue explicite comme `ko`, `en-US` ou `zh-Hans`.

`fallback` est la langue de secours lorsque `summary` pointe vers une autre préférence ou convention existante mais qu’aucune langue concrète ne peut être résolue.

`preserve_code`, `preserve_paths` et `preserve_error_output` gardent le code, les chemins et les sorties d’erreur dans leur forme d’origine quelle que soit la langue du résumé. Un résumé coréen ne doit pas traduire arbitrairement les noms de fonctions, chemins de fichiers ou codes d’erreur.

Les instructions directes de l’utilisateur et le `AGENTS.md` à portée actuelle priment sur cette préférence.

## Mode et repli

`preserve_existing` signifie que l’agent doit inspecter les fichiers existants et préserver la convention locale.

Lorsqu’aucune convention existante n’est visible, par exemple dans un nouveau dépôt, l’agent utilise la valeur `fallback` de chaque champ. La langue de discussion de l’utilisateur ne doit pas décider automatiquement la langue des commentaires de code, des journaux, des messages d’erreur ou des messages de commit.

Le modèle par défaut utilise des replis en anglais pour les commentaires de code, les journaux et les messages de commit. Cela favorise la collaboration publique, la recherche, les outils d’exploitation et les contributeurs externes.

## Git et messages de commit

`git.auto_stage`, `git.auto_commit` et `git.auto_push` valent tous `false` par défaut.

Ces valeurs sont des préférences de dépôt, pas des autorisations. Elles ne remplacent pas les instructions directes de l’utilisateur, les contrats de commande dans `commands.toml` ni la politique d’approbation dans `mustflow.toml`. `git.auto_commit = true` n’accorde pas l’autorisation de push, et `mf init --set` peut seulement définir `git.auto_push=false`; il ne peut pas activer `git.auto_push=true`.

La suggestion de message de commit fait partie du rapport final, pas d’une permission d’exécuter Git. Si des fichiers ont changé et que `reporting.commit_suggestion.enabled = true`, l’agent peut suggérer un message de commit. Il ne doit pas laisser entendre qu’un commit a été créé, et ne doit pas créer de commit sans demande explicite de l’utilisateur.

`git.commit_message.style` accepte `conventional`, `descriptive` ou `gitmoji`. Le style `gitmoji` ajoute un emoji au début tout en gardant une forme lisible de style conventional, par exemple `✨ feat: add dashboard setting`.

`git.commit_message.language` accepte `preserve_existing`, `agent_response`, `docs` ou une étiquette de langue comme `ja`, `de` ou `pt-BR`.

Lorsque plusieurs changements logiques sont mélangés, l’agent peut suggérer de les séparer en commits jusqu’à `max_suggestions` au lieu de tout forcer dans un seul message.

## Version de release

`[release.versioning]` indique si l’agent doit vérifier et signaler l’impact de version quand le code, les modèles, les schémas, le comportement des commandes, les métadonnées du paquet, les exemples de documentation ou la sortie d’installation changent.

Ces valeurs sont des préférences qui guident le rapport d’impact de version et les modifications de fichiers de version. `impact_check = true` demande à l’agent de signaler si le diff semble exiger un changement de version du paquet ou du modèle. `suggest_bump = true` permet de suggérer patch, minor ou major quand les preuves sont claires.

`auto_bump = true` permet à l’agent d’appliquer la montée de version appropriée du paquet ou du modèle après avoir localisé la source de version, sauf si une instruction directe de l’utilisateur, une règle de sécurité de l’hôte ou une politique d’approbation le bloque. `auto_bump = false` laisse les fichiers de version du paquet et du modèle intacts, sauf si l’utilisateur demande un changement de version ou une préparation de release. `require_user_confirmation = true` signifie que l’agent doit demander avant de modifier les versions ; `false` supprime cette étape supplémentaire lorsque la montée automatique est activée.

Quand une version change, `sync_template_version`, `sync_docs_examples` et `sync_tests` indiquent à l’agent de garder les métadonnées du paquet, les manifestes de modèles, les exemples de documentation et les tests alignés dans le même changement.

Ces préférences n’indiquent pas où le dépôt stocke sa version. L’agent doit toujours découvrir la source de version propre au langage ou au framework avant de proposer ou modifier une version.

## Sélection de vérification

`[verification.selection]` guide le choix des vérifications configurées que l’agent doit utiliser. Il n’accorde pas la permission d’exécuter des commandes; l’exécution dépend toujours de `.mustflow/config/commands.toml`.

`strategy = "risk_based"` demande d’adapter la portée de vérification au risque du changement. `prefer_related_tests = true` donne la priorité aux tests directement liés quand le dépôt déclare un command intent pour les tests concernés.

`skip_docs_only_full_test`, `skip_translation_only_full_test` et `skip_copy_only_full_test` couvrent les changements sans code. `skip_low_risk_code_full_test` s’applique seulement quand le code ne touche pas le comportement public, la configuration, les schémas, la sécurité, les migrations ou d’autres surfaces à haut risque. Ces options ignorent seulement la suite complète; elles ne signifient pas que toute vérification est ignorée.

Quand `report_skipped = true`, le rapport final doit indiquer quelles vérifications larges ont été ignorées et pourquoi.

## Écriture des tests

`[testing.authoring]` guide le choix entre créer de nouveaux tests ou travailler d’abord avec la couverture existante. Cette section est séparée de `[verification.selection]`: la sélection de vérification décide quels contrôles configurés considérer, tandis que l’écriture des tests contrôle la facilité d’ajout de nouveaux fichiers ou cas.

`new_test_policy = "evidence_required"` est la valeur par défaut. Elle signifie que les nouveaux tests doivent être appuyés par une preuve de contrat de comportement, comme un comportement public modifié, un risque de régression, un impact de configuration ou de schema, ou un risque de sécurité/données.

`new_test_policy = "manual_approval"` demande une confirmation avant d’ajouter de nouveaux tests, sauf demande directe de l’utilisateur. `new_test_policy = "broad"` autorise une écriture de tests plus proactive lorsque les tests clarifient un comportement important.

`prefer_existing_tests = true` demande de mettre à jour les tests proches avant de créer de nouveaux fichiers ou cas. `require_new_test_rationale = true` demande au rapport final d’expliquer pourquoi chaque nouveau test était nécessaire.

Ces préférences ne justifient pas d’ignorer une vérification requise, de supprimer des tests valides ou d’assouplir les assertions.

## Règles de validation

Lorsque ce fichier existe, `mf check` vérifie que:

- Les principales valeurs de préférence sont des chaînes.
- Les valeurs `mode`, `fallback` et `rule` sont des chaînes.
- Dans `[language.memory]`, `summary` et `fallback` sont des chaînes, tandis que `preserve_code`, `preserve_paths` et `preserve_error_output` sont des booléens.
- `auto_stage`, `auto_commit`, `auto_push`, `avoid_drive_by_refactors` et `include_sensitive_data` sont des booléens.
- `git.commit_message.style` vaut `conventional`, `descriptive` ou `gitmoji`.
- `git.commit_message.max_suggestions` est un entier positif.
- `reporting.commit_suggestion.enabled` est un booléen.
- Les champs de `[release.versioning]` sont des booléens.
- `[verification.selection]` utilise une stratégie autorisée et des indicateurs booléens pour ignorer ou signaler.
- `[testing.authoring]` utilise une politique de nouveaux tests autorisée et des indicateurs booléens d’écriture.
- `docs.update_when` est un tableau de chaînes.
- `project.profile` fait partie des valeurs de profils intégrées.
- Lorsque `[product_i18n]` existe, les champs de locale, la politique de traduction et les listes de termes à ne pas traduire utilisent des structures de base valides.
