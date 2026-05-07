---
title: Índice local
description: Explica cómo mustflow usa SQLite como índice local.
---

mustflow usa SQLite como almacén predeterminado de índice local.

## Principios

Los archivos siempre son la fuente de verdad.

- `AGENTS.md`
- `.mustflow/config/*.toml`
- `.mustflow/context/*.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/*/SKILL.md`

SQLite sirve como índice secundario para habilitar búsquedas y análisis más rápidos. Debe poder eliminarse y reconstruirse con seguridad.

## Ubicación esperada

```text
.mustflow/cache/mustflow.sqlite
```

`mf init` no crea este archivo inmediatamente. El índice se crea cuando se ejecuta `mf index`.
`mf search` lee este archivo sin modificar documentos fuente. Futuras funciones como `mf map` y `mf dashboard` pueden reutilizarlo.

La plantilla predeterminada define este estado así:

```toml
[capabilities]
local_index = "generated_optional"
```

Esto significa que el índice es dato generado opcional, no un documento fuente.

## Datos que puede almacenar el índice

- Rutas de documentos
- Títulos y secciones
- Metadatos de frontmatter
- Revisiones de documentos
- Intenciones de comando
- Referencias de skills

El comando actual `mf index` indexa documentos mustflow, archivos de contexto, archivos de configuración, documentos de skill e intenciones de comando. `mf search` consulta únicamente los datos indexados del flujo de trabajo mustflow.
El índice también almacena hashes de contenido. Antes de buscar, `mf search` compara esos hashes con los archivos actuales y devuelve un error si la caché está obsoleta.
Los últimos resultados de verificación y el análisis de ejecuciones quedan reservados para funciones futuras.

## Reglas de escritura

Cuando un LLM o un panel edita documentos, el destino final de escritura sigue siendo Markdown o TOML.

SQLite proporciona datos auxiliares para acelerar búsqueda, visualización y validación.

Los registros sin procesar, la salida completa de terminal y las transcripciones completas de chat no se consideran documentos fuente para el índice ni para una futura capa de conocimiento. mustflow mantiene recibos de ejecución pequeños y documentos de resumen en el proyecto, y no almacena registros sin procesar de forma predeterminada. Esto se aplica mediante la política `[retention]` en `.mustflow/config/mustflow.toml` y las comprobaciones de almacenamiento de `mf check --strict`.
