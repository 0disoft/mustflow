---
title: mf index
description: Crea el índice SQLite local para documentos mustflow.
---

`mf index` crea un índice SQLite regenerable a partir del flujo de documentos mustflow en la raíz actual.

Los archivos en disco siguen siendo la fuente de verdad; el índice es una caché que permite a `mf search` y a futuras funciones de mapa o panel recuperar documentos mustflow de forma eficiente.

## Entradas indexadas

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- Intenciones de comando de `.mustflow/config/commands.toml`

El comando no indexa archivos fuente arbitrarios del proyecto; se limita a los archivos del flujo de trabajo mustflow.

## Archivo de salida

```text
.mustflow/cache/mustflow.sqlite
```

Este archivo se genera y puede eliminarse y reconstruirse en cualquier momento.
El índice almacena hashes de contenido de los archivos indexados, lo que permite a `mf search` detectar una caché obsoleta.

## Simulación

```sh
npx mf index --dry-run --json
```

Una simulación calcula los objetivos del índice e imprime los recuentos sin escribir el archivo SQLite.

## Campos JSON

```sh
npx mf index --json
```

La salida legible por máquinas usa estos campos:

- `schema_version` (`number`): versión del formato de salida.
- `command` (`string`): siempre `index`.
- `ok` (`boolean`): si la indexación se completó correctamente.
- `mustflow_root` (`string`): raíz mustflow actual.
- `database_path` (`string`): ruta del archivo SQLite de destino.
- `dry_run` (`boolean`): si la escritura de archivos estaba deshabilitada.
- `wrote_files` (`boolean`): si se escribió el archivo SQLite.
- `document_count` (`number`): número de documentos mustflow y archivos de configuración indexados.
- `skill_count` (`number`): número de documentos de skill indexados.
- `command_intent_count` (`number`): número de intenciones de comando indexadas.
- `indexed_paths` (`string[]`): rutas incluidas en el índice de documentos.

## Códigos de salida

- `0`: los objetivos del índice se calcularon y, opcionalmente, se escribieron.
- `1`: el comando recibió una opción desconocida o falló la indexación.
