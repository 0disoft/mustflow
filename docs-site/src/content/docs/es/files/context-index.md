---
title: .mustflow/context/INDEX.md
description: Dirige a los agentes hacia archivos de contexto de proyecto específicos de la tarea.
---

`.mustflow/context/INDEX.md` indica a los agentes qué archivos de contexto de proyecto son relevantes para la tarea actual.

## Dónde se usa

- Ayuda a los agentes a no leer todos los archivos de contexto de forma predeterminada.
- Separa la dirección del proyecto del enrutador breve `AGENTS.md`.
- Apunta a anclas externas opcionales como `README.md` y `DESIGN.md` sin convertirlas en archivos propiedad de mustflow.

## Campos

El frontmatter identifica el archivo como un documento de contexto de mustflow:

- `kind: mustflow-context`
- `name: context-index`
- `authority: contextual`
- `stability`: estabilidad esperada del contenido.
- `review_status`: indica si una persona revisó el contexto.

## Tabla

La tabla principal relaciona cada nombre de contexto con una condición de uso y una ruta.

La plantilla predeterminada solo enumera `.mustflow/context/PROJECT.md`.
Los archivos específicos de dominio, como contexto de interfaz, servidor, API, datos, seguridad u operaciones, no se crean de forma predeterminada.

## Anclas externas

`README.md` es una vista general orientada a personas. Los agentes pueden usarlo como contexto, no como política.

mustflow no crea `DESIGN.md`. Si existe, los agentes pueden leerlo para trabajos de interfaz, diseño visual, composición, variables de diseño o accesibilidad.
