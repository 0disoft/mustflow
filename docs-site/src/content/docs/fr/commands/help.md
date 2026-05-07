---
title: mf help
description: Affiche l’aide en lisant les documents et la configuration mustflow installés.
---

`mf help` n’est pas un long manuel séparé. Il lit les fichiers mustflow installés depuis la racine actuelle et affiche la vue pertinente.

## Sujets

```sh
npx mf help workflow
npx mf help skills
npx mf help commands
npx mf help preferences
npx mf --lang en help
npx mf --lang ko help
npx mf --lang zh help
npx mf --lang es help
npx mf --lang fr help
npx mf --lang hi help
```

- `workflow`: imprime `.mustflow/docs/agent-workflow.md`.
- `skills`: imprime `.mustflow/skills/INDEX.md`.
- `commands`: résume les intentions de commande et leur état depuis `.mustflow/config/commands.toml`.
- `preferences`: résume les préférences depuis `.mustflow/config/preferences.toml`.

## Principe

La sortie d’aide n’introduit pas une autre source de vérité. Chaque sujet s’appuie sur un fichier mustflow installé.

Cela réduit la divergence entre la documentation, la configuration et l’aide de la CLI.

## Langue de sortie de la CLI

`--lang` sélectionne la langue du texte fixe de la CLI, comme les titres d’aide et les indications d’erreur.
Les valeurs actuelles sont `en`, `ko`, `zh`, `es`, `fr` et `hi`.

```sh
npx mf --lang en help
npx mf --lang ko help
npx mf --lang zh help
npx mf --lang es help
npx mf --lang fr help
npx mf --lang hi help
```

Cette option est différente de `mf init --locale`. `--lang` contrôle la sortie du terminal; `--locale` contrôle la langue des documents mustflow installés.

Lorsque `mf help commands` ou `mf help preferences` lit des descriptions depuis les fichiers de projet installés, ces valeurs ne sont pas traduites automatiquement. Seules les étiquettes de la CLI autour du contenu utilisent la langue sélectionnée.

## Sortie structurée

`mf help` ne fournit actuellement pas de format de sortie JSON.

Les agents et automatisations qui ont besoin d’informations de commande structurées doivent utiliser `mf context --json` pour obtenir les noms d’intentions exécutables, puis lire `.mustflow/config/commands.toml` lorsqu’ils ont besoin du contrat complet.

## Aide et codes de sortie

```sh
npx mf help --help
```

La sortie d’aide en anglais est organisée en `Usage`, `Topics`, `Options`, `Examples` et `Exit codes`.
L’aide localisée utilise le même ordre avec des titres traduits.

- Code de sortie `0`: le sujet d’aide demandé a été imprimé, ou un fichier de sujet installé manquant a été signalé.
- Code de sortie `1`: la commande a reçu un sujet ou une option inconnus.

La liste des sujets est intégrée à la CLI, mais le corps de chaque sujet est lu depuis les fichiers `.mustflow/` de la racine actuelle.
