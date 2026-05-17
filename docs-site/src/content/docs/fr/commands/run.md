---
title: mf run
description: Exécute une intention de commande finie déclarée dans commands.toml.
---

`mf run <intent>` exécute uniquement les intentions de commande finies déclarées dans `.mustflow/config/commands.toml`.

## Conditions d’exécution

L’intention doit satisfaire toutes ces conditions:

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- `timeout_seconds` est un entier positif

Si une condition n’est pas satisfaite, la commande n’est pas exécutée et la raison est signalée.

Pour les intentions bloquées ou inconnues, `mf run` imprime un extrait copiable avec `status = "manual_only"`. Cet extrait est une proposition pour `.mustflow/config/commands.toml`; il ne donne aucune autorité d’exécution tant qu’une personne ne l’a pas relu et activé. Le JSON de `--dry-run` et `--plan-only` inclut la même proposition dans `suggested_intent_snippet`.

## Cycles de vie exclus

`mf run` n’exécute pas les intentions avec ces cycles de vie:

- `server`
- `watch`
- `interactive`
- `browser`
- `background`

Les serveurs de développement, le mode observateur, l’interface de navigateur et les processus en arrière-plan ne sont pas des commandes finies de validation.

## Exemples

```sh
npx mf run test
npx mf run lint
npx mf run mustflow_check
npx mf run test --json
```

## Champs JSON

Chaque exécution écrit le dernier reçu d’exécution dans `.mustflow/state/runs/latest.json`.

Avec `--json`, le même reçu est imprimé sur la sortie standard. Les automatisations et les agents doivent analyser cette sortie structurée au lieu d’analyser la sortie lisible par une personne.

La sortie lisible par machine utilise ces champs:

- `schema_version` (`number`): version du format du reçu d’exécution.
- `command` (`string`): toujours `run`.
- `intent` (`string`): nom de l’intention de commande.
- `status` (`string`): résultat de l’exécution. L’un de `passed`, `failed`, `timed_out` ou `start_failed`.
- `timed_out` (`boolean`): indique si le délai d’expiration a été atteint.
- `started_at` (`string`): heure de début de l’exécution.
- `finished_at` (`string`): heure de fin de l’exécution.
- `duration_ms` (`number`): durée de l’exécution.
- `cwd` (`string`): répertoire réel d’exécution.
- `lifecycle` (`string`): cycle de vie de l’intention.
- `run_policy` (`string`): politique d’exécution appliquée.
- `mode` (`string`): mode d’exécution.
- `argv` (`string[]`): commande et arguments lorsque le mode shell n’est pas utilisé.
- `cmd` (`string`): chaîne de commande shell lorsque le mode shell est utilisé.
- `timeout_seconds` (`number`): délai d’expiration appliqué.
- `max_output_bytes` (`number`): taille maximale de sortie conservée.
- `success_exit_codes` (`number[]`): codes de sortie traités comme succès.
- `exit_code` (`number | null`): code de sortie du processus.
- `signal` (`string | null`): nom du signal lorsque le processus s’est terminé par un signal.
- `error` (`string | null`): message d’erreur au démarrage ou à l’exécution.
- `kill_method` (`string | null`): méthode utilisée pour arrêter le processus après expiration.
- `stdout` (`object`): résumé de la sortie standard.
- `stderr` (`object`): résumé de l’erreur standard.
- `receipt_path` (`string`): chemin du reçu d’exécution enregistré.

Les objets de résumé de sortie utilisent ces champs:

- `stdout.bytes` (`number`): nombre total d’octets de sortie standard.
- `stdout.truncated` (`boolean`): indique si la sortie a été tronquée selon la limite de rétention.
- `stdout.tail` (`string`): fin de la sortie standard.
- `stderr.bytes` (`number`): nombre total d’octets d’erreur standard.
- `stderr.truncated` (`boolean`): indique si l’erreur standard a été tronquée selon la limite de rétention.
- `stderr.tail` (`string`): fin de l’erreur standard.

Le reçu sert d’enregistrement d’une seule exécution. La source de vérité des contrats de commande reste `.mustflow/config/commands.toml`.

## Codes de sortie

- `0`: l’intention de commande s’est terminée avec un code de sortie autorisé.
- `1`: l’intention était manquante, refusée, expirée ou en échec.
