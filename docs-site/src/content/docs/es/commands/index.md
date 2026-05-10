---
title: mf index
description: Crea el índice SQLite local para documentos mustflow.
---

`mf index` crea un índice SQLite regenerable a partir del flujo de documentos mustflow en la raíz actual.

Los archivos en disco siguen siendo la fuente de verdad; el índice es una caché que permite a `mf search` y a futuras funciones de mapa o panel recuperar documentos mustflow de forma eficiente.

Use `--source` para incluir anclas estructuradas de código fuente. La indexación de código fuente es optativa y guarda solo metadatos del ancla, no el contenido completo del código.

## Entradas indexadas

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- Intenciones de comando de `.mustflow/config/commands.toml`
- Anclas estructuradas de código fuente solo cuando se proporciona `--source`

El comando predeterminado no indexa archivos fuente arbitrarios del proyecto; se limita a los archivos del flujo de trabajo mustflow. Con `--source`, busca comentarios estructurados `mf:anchor` y escribe solo campos del ancla como id, ruta, línea, propósito, términos de búsqueda, invariante y riesgo.

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

## Anclas de código fuente

```sh
npx mf index --source --json
```

La indexación de anclas de código fuente es solo para navegación. Las tablas `source_anchors`, `source_anchor_fingerprints` y `source_anchor_status` resultantes no pueden definir reglas de flujo de trabajo, permisos de comando ni autoridad de verificación.
Las filas de huella y estado son metadatos de búsqueda derivados que ayudan a explicar después si un ancla todavía apunta al código esperado.

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
- `source_index_enabled` (`boolean`): si se solicitó la indexación de anclas de código fuente.
- `source_anchor_count` (`number`): número de anclas estructuradas de código fuente indexadas.
- `indexed_paths` (`string[]`): rutas incluidas en el índice de documentos.

## Códigos de salida

- `0`: los objetivos del índice se calcularon y, opcionalmente, se escribieron.
- `1`: el comando recibió una opción desconocida o falló la indexación.
