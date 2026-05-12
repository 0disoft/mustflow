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

SQLite sirve como índice local secundario para habilitar búsquedas y análisis más rápidos. Debe poder eliminarse y reconstruirse con seguridad.

La base de datos SQLite local es una caché reconstruible. No debe tratarse como fuente de verdad, almacenamiento de memoria, registro de auditoría ni almacenamiento de transcripciones.

## Ubicación esperada

```text
.mustflow/cache/mustflow.sqlite
```

`mf init` no crea este archivo de inmediato. El índice se crea cuando se ejecuta `mf index`.
`mf search` lee este archivo sin modificar documentos fuente. Futuras funciones como `mf map` y `mf dashboard` pueden reutilizarlo.

La plantilla predeterminada declara este estado así:

```toml
[capabilities]
local_index = "generated_optional"
```

Esto significa que el índice es dato generado opcional, no un documento fuente.

## Datos que el índice puede almacenar

- Rutas de documentos
- Títulos y encabezados de sección
- Metadatos de frontmatter
- Revisiones y hashes de documentos
- Huellas de archivos indexados
- Fragmentos breves de contenido
- Metadatos de intenciones de comando
- Referencias de skills

El comando actual `mf index` usa el modo `metadata_and_snippets`. Almacena como máximo 2048 bytes de fragmento por documento, no almacena cuerpos completos de documentos de forma predeterminada y guarda nombres y descripciones de intenciones de comando como términos derivados para que `mf search` aún pueda encontrar el archivo de configuración relevante.

La tabla `indexed_files` guarda huellas derivadas para cada archivo de flujo de trabajo indexado y para archivos de anclas de fuente opcionales: ruta, alcance de origen, tamaño, hora de modificación, hash de contenido, hora de indexación, modo de índice y versión del parser. `mf index --incremental` solo reutiliza un archivo SQLite existente cuando el esquema, la versión del parser, la configuración de alcance de fuente y las huellas de archivo siguen siendo compatibles; si no, vuelve a una reconstrucción completa.

Los metadatos de búsqueda también se guardan en la tabla `search_ngrams`. Esas filas son fragmentos derivados y breves de términos que ayudan a las búsquedas multilingües cuando los espacios o la tokenización de SQLite son débiles. Apuntan a documentos, skills, rutas de skill, intenciones de comando y anclas de código fuente; no almacenan documentos ni código fuente completos y no cambian el orden de autoridad.

Antes de buscar, `mf search` compara los hashes almacenados con los archivos actuales y devuelve un error si la caché está obsoleta. Los últimos resultados de verificación y el análisis de ejecuciones quedan reservados para funciones futuras.

## Reglas de escritura

Cuando un LLM o un panel edita documentos, el destino final de escritura sigue siendo Markdown o TOML.

SQLite proporciona datos auxiliares para acelerar búsqueda, visualización y validación.

Los registros sin procesar, la salida completa de terminal, las transcripciones completas de chat, el razonamiento oculto, los secretos, los valores de entorno y el contenido de repositorios privados no son documentos fuente para el índice ni para una futura capa de conocimiento. mustflow mantiene recibos de ejecución pequeños en el proyecto y no almacena registros sin procesar de forma predeterminada. Esto se aplica mediante la política `[retention]` en `.mustflow/config/mustflow.toml` y las comprobaciones de almacenamiento de `mf check --strict`.
