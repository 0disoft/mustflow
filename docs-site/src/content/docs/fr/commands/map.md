---
title: mf map
description: Génère REPO_MAP.md, une carte basée sur des ancres pour la racine mustflow actuelle.
---

`mf map` lit la racine mustflow actuelle et génère une carte de navigation basée sur des ancres pour les agents.

Ce n’est pas censé être une liste complète de fichiers. `git ls-files` ou un éditeur convient mieux pour cela. `mf map` inclut seulement les ancres qui aident la navigation, comme `AGENTS.md`, `README.md`, `DESIGN.md`, `package.json`, `SKILL.md`, les fichiers de contexte et les fichiers de configuration importants.

## Options

- `--stdout`: imprime la carte générée dans le terminal.
- `--write`: écrit la carte générée dans `REPO_MAP.md`.
- `--depth <number>`: définit la profondeur de recherche des fichiers ancre non prioritaires. La valeur par défaut est `3`.
- `--include-nested`: inclut les dépôts imbriqués depuis les racines d’espace de travail configurées dans la section `Nested Repositories`.
- `--root-only`: génère une carte uniquement pour la racine actuelle, même lorsque la découverte de dépôts imbriqués est activée dans la configuration.

## Ancres incluses

Ces fichiers peuvent être inclus lorsqu’ils sont découverts.

```text
AGENTS.md
.mustflow/config/mustflow.toml
.mustflow/config/commands.toml
.mustflow/config/preferences.toml
.mustflow/context/INDEX.md
.mustflow/context/PROJECT.md
.mustflow/skills/INDEX.md
README.md
DESIGN.md
package.json
pyproject.toml
go.mod
Cargo.toml
deno.json
SKILL.md
justfile
Taskfile.yml
Makefile
Dockerfile
compose.yaml
tsconfig.json
ruff.toml
.golangci.yml
```

## Chemins exclus

Ces chemins sont exclus par défaut.

```text
.git
node_modules
dist
build
coverage
cache
.cache
.astro
```

## Exemples

```sh
npx mf map --stdout
npx mf map --write
npx mf map --stdout --depth 3
npx mf map --write --include-nested
npx mf map --write --root-only
```

Avec `--write`, la commande crée ou met à jour `REPO_MAP.md` à la racine du dépôt.

La carte générée n’inclut pas en haut de page de valeurs volatiles comme l’heure de génération, les hashes ou le nombre de fichiers.

## Dépôts imbriqués

Lorsque `.mustflow/config/mustflow.toml` définit à la fois `map.include_nested = true` et `workspace.enabled = true`, `mf map` découvre les dépôts indépendants sous les `workspace.roots` configurés et les liste dans une section `Nested Repositories`.

`--include-nested` active cette section pour l’exécution actuelle même lorsque `map.include_nested` vaut `false`. La commande ne scanne toujours que les chemins déclarés dans `workspace.roots`.

`--root-only` force l’exécution actuelle à ignorer les dépôts imbriqués même lorsque la configuration les active. Les deux options sont mutuellement exclusives.

Cette section ne liste pas les fichiers internes des dépôts imbriqués. Elle montre seulement des points d’entrée comme `AGENTS.md`, `REPO_MAP.md`, `.mustflow/config/commands.toml`, `.mustflow/context/INDEX.md`, `DESIGN.md` et les principaux fichiers de manifeste.

## Sortie structurée

`mf map` ne fournit actuellement pas de format de sortie JSON.

Les agents ne doivent pas traiter le Markdown généré comme un index complet de fichiers. Utilise-le comme carte de navigation en lisant d’abord les chemins de points d’entrée dans les sections `Root Anchors` et `Nested Repositories`.

## Aide et codes de sortie

```sh
npx mf map --help
```

La sortie d’aide est organisée en `Usage`, `Options`, `Examples` et `Exit codes`.

- Code de sortie `0`: la carte a été générée et éventuellement écrite.
- Code de sortie `1`: la commande a reçu une option inconnue, une valeur `--depth` invalide ou des options de dépôt imbriqué incompatibles.

Lorsque `--stdout` et `--write` sont tous les deux omis, la commande imprime la carte dans le terminal par défaut.
