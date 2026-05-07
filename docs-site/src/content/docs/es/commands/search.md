---
title: mf search
description: Busca documentos mustflow en el índice SQLite local.
---

`mf search` lee el índice SQLite creado por `mf index`.

No crea ni modifica archivos. Si falta el índice, ejecuta primero `mf index`.
Si algún archivo mustflow indexado cambió desde la indexación, el comando se detiene y pide reconstruir el índice. Esto evita que resultados de búsqueda obsoletos lleven a un agente por mal camino.

## Alcance de búsqueda

El comando busca únicamente datos del flujo de trabajo mustflow:

- Documentos indexados como `AGENTS.md` y `.mustflow/docs/*.md`
- Entradas de skill de `.mustflow/skills/*/SKILL.md`
- Intenciones de comando de `.mustflow/config/commands.toml`

No busca archivos fuente arbitrarios del proyecto.

## Uso

```sh
npx mf index
npx mf search mustflow_check
npx mf search "code review" --json
npx mf search test --limit 5
```

## Opciones

- `--json`: genera resultados en formato JSON legible por máquinas.
- `--limit <number>`: establece el número de resultados devueltos. El valor predeterminado es `10`; el máximo es `50`.

## Campos JSON

```sh
npx mf search mustflow_check --json
```

La salida legible por máquinas usa estos campos:

- `schema_version` (`number`): versión del formato de salida.
- `command` (`string`): siempre `search`.
- `ok` (`boolean`): si la búsqueda se completó correctamente.
- `mustflow_root` (`string`): raíz mustflow actual.
- `database_path` (`string`): archivo SQLite usado para la consulta.
- `query` (`string`): consulta de búsqueda normalizada.
- `limit` (`number`): límite de resultados.
- `index_fresh` (`boolean`): si el índice coincide con el contenido actual de los archivos.
- `stale_paths` (`string[]`): rutas que cambiaron después de la indexación. Vacío si el índice está actualizado.
- `result_count` (`number`): número de resultados devueltos.
- `results` (`object[]`): documentos, skills e intenciones de comando coincidentes.

Cada resultado puede incluir estos campos:

- `results[].kind` (`string`): tipo de resultado. Uno de `document`, `skill` o `command_intent`.
- `results[].path` (`string`): ruta del documento o archivo de skill.
- `results[].name` (`string`): nombre del skill o de la intención de comando.
- `results[].title` (`string`): título del documento.
- `results[].document_type` (`string`): categoría del documento.
- `results[].match` (`string`): fragmento de contexto coincidente.
- `results[].score` (`number`): puntuación de clasificación usada para ordenar resultados.

## Códigos de salida

- `0`: búsqueda completada.
- `1`: la entrada no era válida, faltaba `.mustflow/cache/mustflow.sqlite` o el índice estaba obsoleto.
