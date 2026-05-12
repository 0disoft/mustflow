---
title: mf index
description: Crea el índice SQLite local para documentos mustflow.
---

`mf index` crea un índice SQLite regenerable a partir del flujo de documentos mustflow en la raíz actual.

Los archivos en disco siguen siendo la fuente de verdad; el índice es una caché que permite a `mf search` y a futuras funciones de mapa o panel recuperar documentos mustflow de forma eficiente.

Use `--source` para incluir anclas estructuradas de código fuente. La indexación de código fuente es optativa salvo que `.mustflow/config/index.toml` la habilite explícitamente, y guarda solo metadatos del ancla, no el contenido completo del código.

## Entradas indexadas

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- Intenciones de comando de `.mustflow/config/commands.toml`
- Anclas estructuradas de código fuente solo cuando se proporciona `--source` o cuando `.mustflow/config/index.toml` las habilita

El comando predeterminado no indexa archivos fuente arbitrarios del proyecto; se limita a los archivos del flujo de trabajo mustflow. Con `--source` o una configuración explícita de indexación de fuente, busca comentarios estructurados `mf:anchor` y escribe solo campos del ancla como id, ruta, línea, propósito, términos de búsqueda, invariante y riesgo.

## Archivo de salida

```text
.mustflow/cache/mustflow.sqlite
```

Este archivo se genera y puede eliminarse y reconstruirse en cualquier momento.
El índice almacena hashes de contenido de los archivos indexados, lo que permite a `mf search` detectar una caché obsoleta.
También registra una tabla `indexed_files` con ruta, alcance de origen, tamaño, hora de modificación, hash de contenido, hora de indexación, modo de índice y versión del parser para decidir si una ejecución incremental puede reutilizar la caché existente de forma segura.

Cuando el runtime SQLite incluido admite FTS5, `mf index` registra tablas derivadas de búsqueda de texto para coincidencias de tokens más rápidas. Si FTS5 no está disponible, conserva las mismas tablas base y `mf search` usa un escaneo acotado. Ambos caminos guardan también filas n-gram cortas para metadatos buscables, de modo que las consultas multilingües puedan coincidir aunque cambien los espacios o la tokenización.

## Simulación

```sh
npx mf index --dry-run --json
```

Una simulación calcula los objetivos del índice e imprime los recuentos sin escribir el archivo SQLite.

## Modo incremental

```sh
npx mf index --incremental --json
```

Por defecto, `mf index` reconstruye todo el índice. El modo incremental revisa primero el archivo `.mustflow/cache/mustflow.sqlite` existente. Si la versión del esquema, la versión del parser, la configuración de alcance de fuente y las huellas de los archivos indexados siguen siendo compatibles, reutiliza el archivo SQLite sin reescribirlo. Si un archivo de flujo de trabajo indexado cambió, se eliminó o se agregó, o si cambió el alcance de las anclas de fuente, mustflow vuelve a una reconstrucción completa.

## Anclas de código fuente

```sh
npx mf index --source --json
```

La indexación de anclas de código fuente es solo para navegación. Las tablas `source_anchors`, `source_anchor_fingerprints` y `source_anchor_status` resultantes no pueden definir reglas de flujo de trabajo, permisos de comando ni autoridad de verificación.
Las filas de huella y estado son metadatos de búsqueda derivados que ayudan a explicar después si un ancla todavía apunta al código esperado.
Cuando se puede detectar una función, clase, método o constante cercana, la tabla de huellas guarda metadatos de símbolo derivados, como tipo, nombre, hash de firma y hash de cuerpo.

## Configuración del escaneo de fuente

`.mustflow/config/index.toml` puede limitar el escaneo de anclas de fuente sin cambiar la política del flujo de trabajo ni la autoridad de comandos.

```toml
[source_index]
enabled_by_default = false
include = ["src/**/*.ts", "packages/*/src/**/*.ts"]
exclude = ["**/*.generated.ts", "**/__fixtures__/**"]
max_file_bytes = 262144
allowed_extensions = [".ts", ".tsx", ".js", ".py", ".rs", ".go"]
```

`enabled_by_default = true` hace que `mf index` incluya anclas de fuente sin `--source`. Los patrones de inclusión y exclusión solo limitan el escaneo. Las rutas generadas, de dependencias y de proveedor siguen excluidas del índice local de fuente aunque coincidan con un patrón de inclusión.

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
- `index_mode` (`string`): `full` para la reconstrucción predeterminada o `incremental` cuando se solicitó `--incremental`.
- `reused_existing` (`boolean`): si el modo incremental reutilizó el archivo SQLite existente.
- `rebuild_reason` (`string | null`): motivo por el que el modo incremental reconstruyó en lugar de reutilizar el archivo existente.
- `document_count` (`number`): número de documentos mustflow y archivos de configuración indexados.
- `skill_count` (`number`): número de documentos de skill indexados.
- `skill_route_count` (`number`): número de filas de rutas de skill indexadas desde `.mustflow/skills/INDEX.md`.
- `command_intent_count` (`number`): número de intenciones de comando indexadas.
- `command_effect_count` (`number`): número de filas de efectos de comando derivadas de `effects` o `writes`.
- `source_index_enabled` (`boolean`): si la indexación de anclas de código fuente fue habilitada por `--source` o por la configuración local del índice.
- `source_anchor_count` (`number`): número de anclas estructuradas de código fuente indexadas.
- `search_backend` (`string`): backend de búsqueda seleccionado para este índice. Uno de `fts5` o `table_scan`.
- `search_fts5_available` (`boolean`): si el runtime SQLite informó soporte FTS5 al construir el índice.
- `indexed_file_count` (`number`): número de huellas de archivo registradas en `indexed_files`.
- `indexed_paths` (`string[]`): rutas incluidas en el índice de documentos.

## Códigos de salida

- `0`: los objetivos del índice se calcularon y, opcionalmente, se escribieron.
- `1`: el comando recibió una opción desconocida o falló la indexación.
