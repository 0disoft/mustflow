---
title: mf check
description: Valide le flux de documents mustflow dans un dépôt utilisateur.
---

`mf check` vérifie que les fichiers mustflow installés sont lisibles et utilisables par les agents.
Après avoir modifié le flux de documents lui-même, utilise `--strict` pour des contrôles de sécurité supplémentaires.
Utilise `--json` lorsqu’une automatisation ou un agent doit analyser le résultat.

## Ce qui est vérifié

- `AGENTS.md` existe à la racine du dépôt.
- `.mustflow/config/mustflow.toml` peut être analysé.
- `.mustflow/config/commands.toml` peut être analysé.
- `.mustflow/config/preferences.toml` peut être analysé lorsqu’il est présent.
- Les champs `[map]`, `[workspace]` et `[context]` dans `.mustflow/config/mustflow.toml` utilisent des types valides et des chemins relatifs sûrs.
- `.mustflow/config/preferences.toml` utilise des types de base valides pour les préférences de langue, formatage, style de code, Git, documentation et journalisation lorsqu’il est présent.
- `.mustflow/config/manifest.lock.toml` est comparé au contenu actuel des fichiers lorsqu’il est présent.
- `.mustflow/skills/INDEX.md` existe.
- Les fichiers `.mustflow/skills/*/SKILL.md` contiennent les identifiants de section stables requis.
- Les fichiers `.mustflow/context/*.md`, lorsqu’ils existent, s’identifient comme documents de contexte mustflow.
- Les intentions de `commands.toml` avec `status = "configured"` incluent les informations de commande, le cycle de vie, la politique d’exécution et le délai d’expiration.
- Les cycles de vie de longue durée ne sont pas exposés avec `run_policy = "agent_allowed"`.

## Contrôles stricts

```sh
npx mf check --strict
```

`--strict` ajoute des contrôles plus proches de la stabilité de l’entrée des agents et de la sécurité des commandes.

- Les documents de skill ne doivent pas contenir de blocs shell bruts comme `sh`, `bash` ou `powershell`.
- Les fichiers Markdown gérés par mustflow doivent conserver le frontmatter `mustflow_doc`, `locale`, `canonical`, `revision`, `authority` et `lifecycle` attendu pour leur chemin. Les messages associes incluent l'identifiant logique du document et le chemin relatif.
- Les documents de contexte ne doivent pas prétendre remplacer les instructions directes de l’utilisateur, le code actuel, les tests ou les contrats de commande.
- `.mustflow/skills/INDEX.md` et `.mustflow/context/INDEX.md` doivent rester des index de routage, pas des documents de procédure.
- Le frontmatter de `SKILL.md` doit utiliser `metadata.mustflow_schema: "1"`, `metadata.mustflow_kind: procedure` et un `name` correspondant au dossier `.mustflow/skills/<name>/`.
- Les entrées `metadata.command_intents` du frontmatter de skill doivent référencer des intentions déclarées dans `.mustflow/config/commands.toml`.
- Le corps d’une skill ne doit pas prétendre accorder l’autorisation d’exécuter des commandes; ces autorisations restent dans `.mustflow/config/commands.toml`.
- Les dossiers de skill sous `.mustflow/skills/<name>/` ne doivent pas contenir de fichiers de support sans `SKILL.md`.
- Lorsqu’une skill possède `resources.toml`, les ressources enregistrées doivent exister et se trouver sous `references/`, `assets/` ou `scripts/`.
- `.mustflow/skills/<name>/scripts/` ne doit pas contenir de fichiers d’aide non enregistrés.
- Les ressources de script doivent déclarer `run_policy = "requires_command_contract"` et `command_intent`, et cette intention doit être configurée dans `commands.toml`.
- Les ressources de script ne doivent pas activer par défaut l’accès réseau, un comportement destructeur ni l’écriture en dehors du dossier de skill.
- `REPO_MAP.md` ne doit pas contenir de métadonnées volatiles comme des dates de génération, dates de mise à jour, nombres de fichiers ou nombres de fichiers modifiés.
- `REPO_MAP.md` ne doit pas contenir d’URL distantes ni de métadonnées de branche pouvant divulguer du contexte ou induire les agents en erreur hors de la racine actuelle.
- `commands.toml` doit définir `[defaults].max_output_bytes` et `[defaults].on_timeout`.
- `mustflow.toml` doit définir une politique `[retention]`.
- `REPO_MAP.md` et `.mustflow/state/runs/latest.json` doivent rester dans les limites de taille de rétention.
- Les fichiers `.mustflow/context/*.md` doivent rester dans `[retention.context].max_file_kb`.
- Les fichiers `.mustflow/context/*.md` ne doivent pas contenir de chemins absolus locaux, de texte clé/valeur ressemblant à un secret ni de définitions de variables de design dupliquées depuis `DESIGN.md`.
- `.mustflow/knowledge/**`, lorsqu’il existe, doit rester dans la limite de taille de rétention.
- Les journaux JSONL bruts ne doivent pas apparaître sous `.mustflow/**`.
- `.mustflow/state/runs/latest.json`, lorsqu’il existe, doit pouvoir être analysé comme objet JSON.

Le mode strict est facultatif pour que le flux normal reste léger. Il est recommandé après une modification de documents mustflow, de skills, de contrats de commande ou de règles de génération du plan de dépôt.

## Classification des erreurs et avertissements

`mf check` traite les violations structurelles comme des erreurs bloquantes. Tout problème signalé quitte avec le code `1`.

- Les erreurs de base viennent des fichiers requis manquants, des erreurs d’analyse, des valeurs de configuration dangereuses, des violations du contrat de commande, des identifiants de section de skill manquants, d’une identité invalide de document de contexte et d’un écart avec le fichier de verrouillage.
- Les erreurs strictes viennent des contrôles supplémentaires d’identité de document, de routage, de métadonnées de skill, de limites de commande, de plan de dépôt, de rétention, de reçu d’exécution et d’hygiène de contexte. Elles apparaissent seulement avec `--strict`.
- Les observations non bloquantes ne sont pas émises comme problèmes de `mf check`. Utilise les diagnostics de `mf doctor` lorsqu’une automatisation a besoin de signaux informatifs ou d’avertissement.

## Règles de configuration

`mf check` traite `[map]`, `[workspace]` et `[context]` comme une configuration flexible avec valeurs par défaut, mais échoue sur les valeurs dangereuses ou difficiles à interpréter.
Pour les anciennes installations, l’absence de `manifest.lock.toml` ne fait pas échouer la vérification. Lorsque le fichier de verrouillage existe, les fichiers verrouillés manquants ou les différences de hash de contenu sont signalés comme des échecs.

- `map.output`: doit être un chemin relatif non vide.
- `map.mode`: actuellement, seul `anchors_only` est autorisé.
- `map.privacy`: actuellement, seul `minimal` est autorisé.
- `map.include_nested`: doit être un booléen.
- `map.anchor_files`: doit être un tableau de chemins relatifs non vides.
- `workspace.roots`: doivent être des chemins relatifs dans la racine actuelle.
- `workspace.max_depth`, `workspace.max_repositories`: doivent être des entiers positifs.
- `workspace.follow_symlinks`, `workspace.stop_at_repository_root`: doivent être des booléens.
- `context.root`, `context.index`, `context.default_files` et `context.external_anchors`: doivent utiliser des chemins relatifs non vides.
- `context.read_policy`: actuellement, seul `task_relevant_only` est autorisé.
- `context.authority`: actuellement, seul `contextual` est autorisé.
- Les valeurs principales dans `preferences.toml` doivent être des chaînes.
- Les paramètres de commit automatique, de données sensibles et de refactorisation opportuniste dans `preferences.toml` doivent être des booléens.
- `docs.update_when` dans `preferences.toml` doit être un tableau de chaînes.
- Les intentions exécutables dans `commands.toml` doivent déclarer `lifecycle`, `run_policy`, `timeout_seconds` et `stdin`.
- Les intentions avec `lifecycle = "oneshot"` exigent `timeout_seconds` et `stdin = "closed"`.
- Les intentions `server`, `watch`, `interactive`, `browser` et `background` ne doivent pas être exposées comme commandes exécutables par défaut par les agents.

## Identifiants standard des sections de skill

Les documents de skill doivent inclure ces identifiants stables avant leurs titres de section localisés.

```text
<!-- mustflow-section: purpose -->
<!-- mustflow-section: use-when -->
<!-- mustflow-section: do-not-use-when -->
<!-- mustflow-section: required-inputs -->
<!-- mustflow-section: preconditions -->
<!-- mustflow-section: allowed-edits -->
<!-- mustflow-section: procedure -->
<!-- mustflow-section: postconditions -->
<!-- mustflow-section: verification -->
<!-- mustflow-section: failure-handling -->
<!-- mustflow-section: output-format -->
```


## Exemple

```sh
npx mf check
```

En cas de succès, la commande affiche:

```text
mustflow check passed
```

En cas d’échec, elle imprime les fichiers ou identifiants de section manquants dans l’erreur standard et quitte avec le code `1`.

## Champs JSON

```sh
npx mf check --json
```

La sortie lisible par machine utilise ces champs:

- `ok` (`boolean`): indique si toutes les vérifications ont réussi.
- `strict` (`boolean`): indique si les contrôles `--strict` étaient activés.
- `issueCount` (`number`): nombre de problèmes trouvés.
- `issues` (`string[]`): messages de problème lisibles par une personne.
- `issueDetails` (`object[]`): détails de problème lisibles par machine. `id` est un identifiant stable pour les limites de commande et les contrôles stricts associés lorsqu’il s’applique, `severity` vaut actuellement `error` pour chaque problème bloquant, `mode` vaut `base` ou `strict`, et `message` reprend `issues`.

Lorsque des problèmes sont trouvés, la forme JSON quitte aussi avec le code `1`.

## Aide et codes de sortie

```sh
npx mf check --help
```

La sortie d’aide est organisée en `Usage`, `Options`, `Examples` et `Exit codes`.

- Code de sortie `0`: tous les fichiers et paramètres requis sont valides.
- Code de sortie `1`: la validation a trouvé des problèmes, ou la commande a reçu une option inconnue.

Les agents et automatisations doivent lire `ok`, `issues` et `issueDetails` depuis la sortie `--json` au lieu d’analyser le texte de succès ou d’échec destiné aux personnes.
