---
title: mf search
description: Busca documentos mustflow en el índice SQLite local.
---

`mf search` lee el índice SQLite creado por `mf index`.

No crea ni modifica archivos. Si falta el índice, ejecuta primero `mf index`.
Si algún archivo mustflow indexado cambió desde la indexación, el comando se detiene y pide reconstruir el índice. Esto evita que resultados de búsqueda obsoletos lleven a un agente por mal camino.

## Alcance de búsqueda

De forma predeterminada, el comando busca únicamente datos del flujo de trabajo mustflow:

- Documentos indexados como `AGENTS.md` y `.mustflow/docs/*.md`
- Entradas de skill de `.mustflow/skills/*/SKILL.md`
- Intenciones de comando de `.mustflow/config/commands.toml`

No busca archivos fuente arbitrarios del proyecto. Si el índice se creó con `mf index --source`, puedes buscar anchors de código fuente estructurados con `--scope source`.

Usa `--scope all` para incluir tanto resultados de workflow como pistas de anchors de código fuente. En ese modo, mustflow mantiene la autoridad del workflow y los contratos de comando por encima de los anchors de código fuente. Los anchors de código fuente son solo pistas de navegación; no pueden sobrescribir reglas de comando, skills, documentos de workflow ni `AGENTS.md`.

## Uso

```sh
npx mf index
npx mf index --source
npx mf search mustflow_check
npx mf search "code review" --json
npx mf search "role mapping" --scope source
npx mf search mustflow_check --scope all --json
npx mf search test --limit 5
```

## Opciones

- `--json`: genera resultados en formato JSON legible por máquinas.
- `--limit <number>`: establece el número de resultados devueltos. El valor predeterminado es `10`; el máximo es `50`.
- `--scope <workflow|source|all>`: selecciona datos de workflow indexados, anchors de código fuente, o ambos. El valor predeterminado es `workflow`.

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
- `scope` (`string`): alcance de búsqueda. Uno de `workflow`, `source` o `all`.
- `index_fresh` (`boolean`): si el índice coincide con el contenido actual de los archivos.
- `stale_paths` (`string[]`): rutas que cambiaron después de la indexación. Vacío si el índice está actualizado.
- `result_count` (`number`): número de resultados devueltos.
- `results` (`object[]`): entradas de workflow coincidentes y, cuando se solicita, anchors de código fuente.

Cada resultado puede incluir estos campos:

- `results[].kind` (`string`): tipo de resultado. Uno de `document`, `skill`, `command_intent` o `source_anchor`.
- `results[].path` (`string`): ruta del documento o archivo de skill.
- `results[].name` (`string`): nombre del skill, nombre de la intención de comando o ID del anchor de código fuente.
- `results[].title` (`string`): título del documento.
- `results[].document_type` (`string`): categoría del documento.
- `results[].anchor_id` (`string`): ID del anchor de código fuente.
- `results[].line_start` (`number`): línea donde empieza el anchor.
- `results[].risk` (`string`): etiquetas de riesgo del anchor, separadas por comas.
- `results[].authority_rank` (`number`): orden de autoridad usado al mezclar workflow y fuente.
- `results[].authority_label` (`string`): categoría de autoridad, como `command_contract` o `source_navigation_hint`.
- `results[].source_scope` (`string`): si el resultado viene de workflow o de un anchor de código fuente.
- `results[].navigation_only` (`boolean`): si el resultado es solo una pista de navegación de código.
- `results[].can_instruct_agent` (`boolean`): si el resultado puede contener instrucciones de workflow.
- `results[].match` (`string`): fragmento de contexto coincidente.
- `results[].score` (`number`): puntuación de clasificación usada para ordenar resultados.

## Códigos de salida

- `0`: búsqueda completada.
- `1`: la entrada no era válida, faltaba `.mustflow/cache/mustflow.sqlite` o el índice estaba obsoleto.
