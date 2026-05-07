---
title: mf map
description: Genera REPO_MAP.md, un mapa basado en anclas para la raíz mustflow actual.
---

`mf map` lee la raíz mustflow actual y genera un mapa de navegación basado en anclas para agentes.

No pretende ser una lista completa de archivos. Para eso son más adecuados `git ls-files` o un editor. `mf map` solo incluye anclas que ayudan a navegar, como `AGENTS.md`, `README.md`, `DESIGN.md`, `package.json`, `SKILL.md`, archivos de contexto y archivos de configuración importantes.

## Opciones

- `--stdout`: imprime el mapa generado en la terminal.
- `--write`: escribe el mapa generado en `REPO_MAP.md`.
- `--depth <number>`: establece la profundidad de búsqueda para archivos ancla no prioritarios. El valor predeterminado es `3`.
- `--include-nested`: incluye repositorios anidados de las raíces de workspace configuradas en la sección `Nested Repositories`.
- `--root-only`: genera un mapa solo para la raíz actual, incluso si el descubrimiento de repositorios anidados está habilitado en la configuración.

## Anclas incluidas

Estos archivos pueden incluirse cuando se descubren.

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

## Rutas excluidas

Estas rutas se excluyen de forma predeterminada.

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

## Ejemplos

```sh
npx mf map --stdout
npx mf map --write
npx mf map --stdout --depth 3
npx mf map --write --include-nested
npx mf map --write --root-only
```

Con `--write`, el comando crea o actualiza `REPO_MAP.md` en la raíz del repositorio.

El mapa generado no incluye valores volátiles, como tiempo de generación, hashes o recuentos de archivos, en la parte superior.

## Repositorios anidados

Cuando `.mustflow/config/mustflow.toml` establece `map.include_nested = true` y `workspace.enabled = true`, `mf map` descubre repositorios independientes bajo las rutas configuradas en `workspace.roots` y los enumera en una sección `Nested Repositories`.

`--include-nested` habilita esa sección para la ejecución actual incluso cuando `map.include_nested` es `false`. Aun así, solo escanea las rutas declaradas en `workspace.roots`.

`--root-only` fuerza a la ejecución actual a ignorar repositorios anidados incluso cuando la configuración los habilita. Las dos opciones son mutuamente excluyentes.

Esta sección no enumera archivos internos de repositorios anidados. Solo muestra puntos de entrada como `AGENTS.md`, `REPO_MAP.md`, `.mustflow/config/commands.toml`, `.mustflow/context/INDEX.md`, `DESIGN.md` y archivos de manifiesto principales.

## Salida estructurada

`mf map` actualmente no proporciona un formato de salida JSON.

Los agentes no deben tratar el Markdown generado como un índice completo de archivos. Úsalo como mapa de navegación leyendo primero las rutas de entrada de las secciones `Root Anchors` y `Nested Repositories`.

## Ayuda y códigos de salida

```sh
npx mf map --help
```

La salida de ayuda está organizada en `Usage`, `Options`, `Examples` y `Exit codes`.

- Código de salida `0`: el mapa se generó y, opcionalmente, se escribió.
- Código de salida `1`: el comando recibió una opción desconocida, un valor `--depth` no válido u opciones incompatibles de repositorios anidados.

Cuando se omiten `--stdout` y `--write`, el comando imprime el mapa en la terminal de forma predeterminada.
