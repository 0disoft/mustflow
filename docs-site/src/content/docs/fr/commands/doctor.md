---
title: mf doctor
description: Commande de diagnostic en lecture seule pour la racine mustflow actuelle.
---

`mf doctor` donne un résumé rapide de santé pour la racine mustflow actuelle.
Elle combine les parties les plus utiles de `mf check` et `mf context`, puis imprime les prochaines étapes sûres qu’un agent peut suivre.

Cette commande n’écrit jamais de fichiers. Utilise-la lorsqu’un agent ou une personne a besoin d’une première orientation avant de modifier quoi que ce soit.

## Ce qui est inspecté

- Racine mustflow actuelle.
- Présence de `AGENTS.md` et `.mustflow/`.
- Résultat de `mf check`.
- État de `manifest.lock.toml`.
- Identifiant et version du modèle depuis le fichier de verrouillage lorsqu’il est présent.
- Existence de `.mustflow/config/commands.toml` et exposition d’intentions finies exécutables.
- Chemins requis et facultatifs de l’ordre de lecture qui manquent dans `mustflow.toml`.
- Génération éventuelle de `REPO_MAP.md`.
- Existence de l’index local `.mustflow/cache/mustflow.sqlite`.
- Existence du dernier reçu `mf run`.
- Éléments de liste de diagnostic et prochaines commandes suggérées.

## Exemple

```sh
npx mf doctor
```

Exemple de sortie:

```text
mustflow doctor
mustflow root: /path/to/project
Installed: yes
Strict: no
Check: passed
Issues: 0
Command contract: present
Runnable intents: 3

Health:
- [ok] Install: installed
- [ok] Validation: 0 issues
- [ok] Command contract: present, 3 runnable intents
- [ok] Read order: all required files present
- [info] REPO_MAP.md: not generated (run: mf map --write)
- [info] Local index: not generated (run: mf index)
- [info] Latest run: no run receipt yet (run: mf run <intent>)

Suggested commands:
- mf help workflow
- mf help commands
- mf context --json
- mf check --strict
- mf map --write
- mf index
- mf run <intent>

No files were written.
```

## Champs JSON

```sh
npx mf doctor --json
```

La sortie lisible par machine utilise ces champs:

- `schema_version` (`number`): version du format de sortie.
- `command` (`string`): toujours `doctor`.
- `mustflow_root` (`string`): racine mustflow actuelle.
- `installed` (`boolean`): indique si `AGENTS.md` et `.mustflow/` existent.
- `strict` (`boolean`): indique si les contrôles `--strict` étaient activés.
- `ok` (`boolean`): indique si l’installation existe et si la validation a réussi.
- `check` (`object`): résultat de validation utilisant les règles de `mf check`.
- `context` (`object`): état de contexte principal dont un agent a besoin avant de commencer.
- `diagnostics` (`object[]`): diagnostics par zone pour l’installation, la validation, le contrat de commande, l’ordre de lecture, le plan de dépôt, l’index local et la dernière exécution.
- `next_steps` (`string[]`): commandes qu’un agent peut exécuter ensuite sans deviner.

Les champs imbriqués utilisent ces formes:

- `check.ok` (`boolean`): indique si la validation a réussi.
- `check.issue_count` (`number`): nombre de problèmes de validation.
- `check.issues` (`string[]`): messages de problème de validation.
- `context.manifest_lock` (`string`): état du fichier de verrouillage. L’un de `present`, `missing` ou `invalid`.
- `context.template` (`object | null`): identifiant et version du modèle lorsqu’ils sont connus.
- `context.command_contract_exists` (`boolean`): indique si `commands.toml` existe.
- `context.runnable_intents` (`string[]`): noms des intentions finies configurées que les agents peuvent exécuter.
- `context.missing_read_order` (`string[]`): fichiers requis de l’ordre de lecture qui manquent.
- `context.missing_optional_read_order` (`string[]`): fichiers facultatifs de l’ordre de lecture qui manquent.
- `context.latest_run_exists` (`boolean`): indique si le dernier reçu d’exécution existe.
- `diagnostics[].id` (`string`): nom de la zone de diagnostic.
- `diagnostics[].status` (`string`): état du diagnostic. L’un de `ok`, `warn`, `fail` ou `info`.
- `diagnostics[].summary` (`string`): état court lisible par une personne.
- `diagnostics[].action` (`string | null`): commande à exécuter ensuite.

## Mode strict

```sh
npx mf doctor --strict --json
```

Le mode strict utilise les mêmes contrôles supplémentaires que `mf check --strict`.
Utilise-le après avoir modifié des documents mustflow, des skills, des contrats de commande, des paramètres de rétention ou le comportement du plan de dépôt.

## Codes de sortie

- `0`: la racine a été inspectée et aucun problème n’a été trouvé.
- `1`: la validation a trouvé des problèmes, l’installation est manquante ou la commande a reçu une option inconnue.

Les agents et automatisations doivent lire `ok`, `check.issues`, `diagnostics` et `next_steps` depuis la sortie `--json` au lieu d’analyser le résumé destiné aux personnes.
