---
title: mf version-sources
description: Commande en lecture seule pour inspecter les sources de version des paquets et modèles.
---

`mf version-sources` indique quels fichiers du root mustflow actuel ressemblent à des sources de version pour un paquet ou un modèle. Il lit aussi les déclarations optionnelles de `.mustflow/config/versioning.toml`.

La commande ne modifie pas les versions, ne crée pas de tags, ne crée pas de commits et ne pousse rien. Elle permet aux agents et aux futurs panneaux du tableau de bord de voir la même découverte de sources de version que `mf check --strict`.

## Sortie

- `mustflow root` : root mustflow actuel.
- `Versioning preferences` : indique si les préférences `[release.versioning]` sont activées.
- `Sources` : fichiers détectés ou déclarés et type de source.

## Exemple

```sh
npx mf version-sources
```

## Champs JSON

```sh
npx mf version-sources --json
```

- `schema_version` (`string`) : version du format de sortie.
- `command` (`string`) : toujours `version-sources`.
- `mustflow_root` (`string`) : root mustflow actuel.
- `versioning_enabled` (`boolean`) : indique si les préférences d'impact de version sont activées.
- `sources` (`object[]`) : sources de version avec `path`, `kind`, et les champs optionnels `declared` et `authority`.

## Aide et codes de sortie

```sh
npx mf version-sources --help
```

- Code `0` : les sources de version ont été inspectées et imprimées.
- Code `1` : la commande a reçu une option inconnue.
