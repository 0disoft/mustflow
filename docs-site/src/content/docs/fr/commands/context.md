---
title: mf context
description: Imprime le contexte de travail JSON de l’agent pour la racine mustflow actuelle.
---

`mf context --json` imprime un contexte structuré qu’un agent peut inspecter avant de commencer à travailler dans la racine actuelle.

Cette commande ne modifie pas les fichiers. Elle ne remplace pas la lecture des documents eux-mêmes; c’est un index léger qui pointe vers les fichiers et intentions de commande qu’un agent doit inspecter en premier.

## Données incluses

- Racine mustflow actuelle.
- État d’installation.
- État de `manifest.lock.toml`.
- Chemins des documents autoritatifs depuis `mustflow.toml`.
- Surface de capacités depuis `mustflow.toml`.
- Ordre de lecture requis et existence des fichiers.
- Ordre de lecture facultatif et existence des fichiers.
- Index de contexte et chemins de contexte de projet via les champs d’autorité et de lecture facultative.
- Résumé de l’état des intentions de commande depuis `commands.toml`.
- Noms des intentions de commande finies et exécutables.
- Résumé du dernier reçu `mf run`.
- Problèmes signalés depuis le verrou de manifeste.

## Résumé du reçu d’exécution

`latest_run` expose seulement certaines métadonnées de `.mustflow/state/runs/latest.json`.

Il n’inclut pas les fins de sortie standard ou d’erreur standard. Si un agent a besoin de la sortie de commande, il doit lire explicitement le fichier de reçu.

## Exemple

```sh
npx mf context --json
```

## Champs JSON

La sortie lisible par machine utilise ces champs:

- `schema_version` (`number`): version du format de sortie.
- `command` (`string`): toujours `context`.
- `mustflow_root` (`string`): racine actuelle où la commande a été exécutée.
- `installed` (`boolean`): indique si `AGENTS.md` et `.mustflow/` existent.
- `manifest_lock` (`string`): état du fichier de verrouillage. L’un de `present`, `missing` ou `invalid`.
- `template` (`object | null`): identifiant et version du modèle enregistrés dans le fichier de verrouillage.
- `authority` (`object`): chemins des documents autoritatifs.
- `capabilities` (`object`): surface de capacités de l’agent pour la racine actuelle.
- `read_order` (`object[]`): fichiers de lecture requis et indicateurs d’existence.
- `optional_read_order` (`object[]`): fichiers de lecture facultatifs et indicateurs d’existence.
- `command_contract` (`object`): résumé des intentions de commande et noms d’intentions exécutables.
- `latest_run` (`object`): résumé du dernier reçu d’exécution.
- `issues` (`string[]`): problèmes signalés depuis le verrou de manifeste.

Les champs répétés et imbriqués utilisent ces formes:

- `read_order[].path` (`string`): chemin relatif à lire.
- `read_order[].exists` (`boolean`): indique si le fichier existe dans la racine actuelle.
- `command_contract.intents[].name` (`string`): nom de l’intention de commande.
- `command_contract.intents[].status` (`string`): état de configuration de l’intention de commande.
- `command_contract.intents[].lifecycle` (`string | null`): indique si la commande est finie ou de longue durée.
- `command_contract.intents[].run_policy` (`string | null`): politique d’exécution pour l’agent.
- `command_contract.runnable_intents` (`string[]`): noms d’intentions qu’un agent peut exécuter avec `mf run <intent>`.
- `latest_run.path` (`string`): chemin du dernier reçu d’exécution.
- `latest_run.exists` (`boolean`): indique si le dernier reçu d’exécution existe.
- `latest_run.valid` (`boolean | null`): indique si le reçu a été analysé comme objet JSON.
- `latest_run.status` (`string | null`): dernier résultat d’exécution.
- `latest_run.exit_code` (`number | null`): code de sortie du processus pour la dernière exécution.

## Codes de sortie

- `0`: le contexte a été inspecté et imprimé.
- `1`: la commande a reçu une option inconnue.
