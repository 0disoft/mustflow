---
title: Vérifications de publication
description: Flux de vérification à exécuter avant de publier le paquet npm mustflow.
---

mustflow publie ensemble une CLI et des modèles via npm.

Avant la publication, ne vous fiez pas seulement aux contrôles de l’arbre source local. Emballez l’artefact npm, installez-le dans un projet temporaire et vérifiez les commandes publiques avec `npx mf`.

## Commandes

```sh
bun run release:check
```

Pour la vérification courante des agents dans ce dépôt, privilégiez les intents
de commande mustflow configurés.

```sh
mf run build
mf run test_fast
mf run test_related
mf run test
mf run test_release
mf run docs_validate
mf run mustflow_check
```

`bun run release:check` reste la porte de publication. `test_fast` exécute la
base rapide de régression de la CLI, `test_related` choisit les tests à partir
des fichiers modifiés et revient à cette base s'il ne trouve pas de
correspondance, et tous deux utilisent 8 workers Node test par défaut. Les
mainteneurs peuvent les ajuster avec `MUSTFLOW_TEST_CONCURRENCY`.
`test_release` sépare les contrôles de métadonnées et de paquetage du flux
local courant. `test_coverage` exécute la base rapide avec le rapport coverage
intégré de Node sans seuil obligatoire; son nombre de workers peut être ajusté
avec `MUSTFLOW_TEST_COVERAGE_CONCURRENCY`. `lint` et test-audit restent des
portes locales ciblées.

## Objectif

- `bun run release:check`: exécute les contrôles de la CLI, les contrôles de documentation et vérifie l’installation réelle du paquet npm.
- `bun run check:pack`: utilise `npm pack --dry-run --json` pour inspecter le contenu du paquet. Cela exécute aussi `prepack` d’abord.
- `bun run check:install`: construit un vrai `.tgz`, l’installe dans un projet temporaire et exécute le flux public `npx mf`.
- `bun run docs:check`: construit le site de documentation et vérifie la navigation.

## Déploiement du site de documentation

La source du site de documentation se trouve dans `docs-site/` sur la branche `main`.

Dans les paramètres GitHub Pages, utilisez `GitHub Actions` comme source de publication au lieu de `Deploy from a branch`.

`.github/workflows/docs-site.yml` s’exécute lorsque `docs-site/**` ou le fichier de flux de travail change. Dans `docs-site/`, il exécute:

```sh
bun install --frozen-lockfile
bun run check
```

Après exécution, il téléverse `docs-site/dist` comme artefact GitHub Pages et le déploie dans l’environnement Pages.

Notez que `docs-site/dist` est une sortie générée et ne doit pas être validé dans le dépôt.

## Flux check:install

`check:install` vérifie le flux public suivant du paquet:

```sh
npm pack
npm install -D ./mustflow-*.tgz
npx mf --version
npx mf init --dry-run
npx mf init --yes
npx mf check --strict --json
npx mf doctor --strict --json
npx mf context --json
npx mf run mustflow_check --json
npx mf status --json
npx mf index --json
npx mf search mustflow_check --json
npx mf update --dry-run --json
npx mf map --write
```

Cela garantit que la sortie empaquetée `dist/`, `templates/`, le contrat de commande et le flux d’index local fonctionnent correctement ensemble après installation.

## Dépannage des échecs

- Échec de `npm pack`: vérifiez les métadonnées du paquet et les fichiers inclus.
- Échec de `npm install`: vérifiez les dépendances, la structure du paquet et la compatibilité npm.
- Échec de `npx mf init`: la CLI publiée peut ne pas parvenir à localiser les modèles groupés.
- Échec de `check/doctor/status/update/map`: les fichiers générés, le contrat de commande, l’index local ou le flux de verrouillage du manifeste peuvent être cassés après installation.
