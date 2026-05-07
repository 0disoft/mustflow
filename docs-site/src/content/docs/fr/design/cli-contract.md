---
title: Contrat de sortie de la CLI
description: Explique comment les commandes mf doivent formater l’aide, les erreurs et les codes de sortie.
---

Les commandes `mf` doivent permettre aux agents et aux personnes de décider de la prochaine action à partir de la même sortie.

Chaque page d’aide de commande suit donc un ordre commun.

## Structure de l’aide

Chaque sortie d’aide de commande doit inclure ces champs lorsqu’ils s’appliquent:

- `Usage`: forme de la commande.
- `Commands` ou `Topics`: sous-commandes ou sujets d’aide.
- `Options`: options prises en charge.
- `Examples`: commandes qui peuvent être copiées et exécutées.
- `Exit codes`: signification des codes de sortie du processus.

Par exemple, `mf check --help` doit montrer quelles options la commande `check` accepte et comment elle signale une réussite ou un échec.

## Résolution de la racine mustflow

`mf init` installe un nouveau flux de documents mustflow dans le répertoire actuel.

Les autres commandes après installation remontent depuis le répertoire actuel et utilisent le marqueur `.mustflow/` le plus proche comme racine mustflow courante.
Elles lisent et écrivent les fichiers relativement à cette racine.

Cette règle s’applique à:

- `mf check`
- `mf status`
- `mf context`
- `mf update`
- `mf map`
- `mf help`
- `mf run`

Par exemple, lorsqu’un utilisateur exécute `mf check --strict` depuis `src/feature/deep`, la commande valide tout de même la racine ancêtre qui contient `.mustflow/config/mustflow.toml`.
`mf map --write` et `mf run <intent> --json` écrivent aussi `REPO_MAP.md` et `.mustflow/state/runs/latest.json` dans cette même racine.

## Langue de sortie de la CLI

`--lang` est une option globale qui sélectionne la langue du texte fixe de la CLI.
Les valeurs actuelles sont `en`, `ko`, `zh`, `es`, `fr` et `hi`.

```sh
mf --lang en help
mf --lang ko help
mf --lang zh help
mf --lang es help
mf --lang fr help
mf --lang hi help
```

`--lang` est différent de `mf init --locale`. `--lang` contrôle l’aide du terminal et les indications d’erreur; `--locale` contrôle la langue des documents mustflow installés.

Les valeurs lues depuis les fichiers `.mustflow/` installés ne sont pas traduites automatiquement. Par exemple, une `description` dans `commands.toml` est affichée telle qu’elle est écrite, tandis que les libellés autour du contenu, comme `Commands`, `Preferences` ou `Path`, suivent la langue de la CLI.

## Structure des erreurs

Lorsqu’un utilisateur fournit une commande ou une option inconnue, les erreurs commencent par un message standard.

```text
Error: Unknown option: --bad
Run `mf check --help` for usage.
```

La sortie coréenne conserve la même structure avec le texte fixe localisé.

```text
오류: Unknown option: --bad
사용법은 `mf check --help` 명령으로 확인하세요.
```

La raison est imprimée sur `stderr`, et le texte d’utilisation associé peut être imprimé sur `stdout`. Lorsqu’une automatisation a besoin d’une sortie structurée, utilisez les commandes qui prennent en charge `--json`.

## Codes de sortie

- `0`: la commande s’est terminée normalement, a imprimé les informations demandées, a réussi la validation ou a calculé un plan non bloqué.
- `1`: la commande a reçu une entrée invalide, trouvé des problèmes de validation, trouvé des changements bloqués ou reçu une demande qui n’est pas encore prise en charge.

La CLI actuelle garde des codes de sortie larges. Des codes plus granulaires doivent attendre que de vrais cas d’usage d’automatisation les justifient.

## Sortie JSON

`mf check`, `mf status` et `mf update --dry-run` prennent en charge `--json`.

La sortie JSON est l’interface destinée aux agents et aux scripts. Ils doivent lire les champs JSON au lieu d’analyser le texte d’aide destiné aux personnes.
