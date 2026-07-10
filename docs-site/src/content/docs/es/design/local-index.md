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

La tabla `indexed_source_candidates` registra la pertenencia a candidatos de código fuente por separado de `indexed_files.source_scope`. Así, una ruta puede ser a la vez un documento de workflow con autoridad y un candidato de código fuente sin marcarse como obsoleta por error. Una clave foránea exige que cada candidato conserve su huella en `indexed_files` e impide eliminar o cambiar primero la ruta de esa huella. Las rutas indexadas deben ser rutas relativas canónicas dentro del proyecto; la creación del índice y la comprobación de frescura rechazan recorridos, rutas absolutas, formas de unidad o UNC de Windows y enlaces simbólicos en lugar de leer fuera de la raíz de mustflow.

Los metadatos de búsqueda también se guardan en la tabla `search_ngrams`. Esas filas son fragmentos derivados y breves de términos que ayudan a las búsquedas multilingües cuando los espacios o la tokenización de SQLite son débiles. Apuntan a documentos, skills, rutas de skill, intenciones de comando y anclas de código fuente; no almacenan documentos ni código fuente completos y no cambian el orden de autoridad. La generación n-gram usa límites duros: como máximo los primeros 64 caracteres de cada token y 512 filas n-gram por destino indexado.

Antes de buscar, `mf search` compara los hashes almacenados con los archivos actuales y devuelve un error si la caché está obsoleta. Los últimos resultados de verificación y el análisis de ejecuciones quedan reservados para funciones futuras.

## Source anchors estructurados

Los source anchors son un presupuesto pequeño de comentarios para navegación de código, no una capa general de documentación. Usa `mf:anchor` solo cuando encontrar ese límite exacto de código ayuda a un agente a elegir mejor contexto o entender un contrato fácil de romper.

Buenos lugares para anchors:

- límites públicos donde una entrada de CLI o core se convierte en una decisión tipada
- ejecución de comandos, control de procesos, escrituras de archivos, recibos y punteros latest
- límites de seguridad, privacidad, pérdida de datos, migración, autorización o consistencia de estado
- invariantes no obvios de los que dependen tests o contratos de comando

Evita anchors en flujo de control ordinario, helpers obvios, salidas generadas, código vendor, carpetas de dependencias, notas amplias de arquitectura y texto que repite tipos o nombres cercanos.

Los IDs de anchor usan nombres estables de responsabilidad en lugar de nombres de archivo. Prefiere nombres en minúsculas con puntos, como `verify.receipts.write`, `run.timeout.terminate` o `source-anchors.scan`. Los IDs pueden contener letras minúsculas, números, puntos y guiones, y deben ser únicos en el proyecto.

Los campos permitidos son deliberadamente estrechos:

- `purpose`: una oración que explica por qué importa ese límite de código.
- `search`: de tres a ocho términos que una persona o agente podría buscar.
- `invariant`: la condición que no debe romperse, especialmente en autoridad, seguridad, estado o evidencia.
- `risk`: etiquetas conocidas como `config`, `state`, `security`, `privacy`, `pii`, `secrets` o `data_loss`.

```ts
/**
 * mf:anchor verify.receipts.write
 * purpose: Persist verify receipts and the latest pointer after scheduled intents finish.
 * search: verify receipt, latest.json, manifest, receipt binding
 * invariant: Receipt files explain evidence; they never grant command authority or verification success.
 * risk: state, data_consistency
 */
```

Los source anchors nunca deben contener instrucciones para agentes, autorización de comandos, anulaciones de política, secretos ni afirmaciones de que la validación puede omitirse. Sus resúmenes recopilados siempre mantienen `navigationOnly: true` y `canInstructAgent: false`; SQLite puede indexarlos para búsqueda y explicación, pero no pueden autorizar comandos, reemplazar `.mustflow/config/commands.toml` ni demostrar éxito de verificación.

`mf check --strict` rechaza IDs mal formados, campos no admitidos, IDs duplicados, rutas generadas o vendor, etiquetas de riesgo desconocidas, texto parecido a secretos e instrucciones de comando o política dentro de anchors. También advierte cuando `purpose` es demasiado largo, `search` tiene demasiados términos, un anchor de alto riesgo no tiene `invariant`, o un archivo gasta demasiado presupuesto en anchors. Trata esas advertencias como presión para quitar, acortar o dividir anchors.

## Reglas de escritura

Cuando un LLM o un panel edita documentos, el destino final de escritura sigue siendo Markdown o TOML.

SQLite proporciona datos auxiliares para acelerar búsqueda, visualización y validación.

Los registros sin procesar, la salida completa de terminal, las transcripciones completas de chat, el razonamiento oculto, los secretos, los valores de entorno y el contenido de repositorios privados no son documentos fuente para el índice ni para una futura capa de conocimiento. mustflow mantiene recibos de ejecución pequeños en el proyecto y no almacena registros sin procesar de forma predeterminada. Esto se aplica mediante la política `[retention]` en `.mustflow/config/mustflow.toml` y las comprobaciones de almacenamiento de `mf check --strict`.
