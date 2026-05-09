---
title: mf docs
description: Rastrea documentos que necesitan revisión de prosa tras ediciones de LLM.
---

`mf docs review` gestiona una cola de revisión local del repositorio para documentos creados o modificados por agentes.

La cola se guarda en `.mustflow/review/docs.toml`. `mf init` no crea este archivo; aparece solo cuando se añade un documento para revisión.

## Modelo De Revisión

La cola rastrea estados de documentos, no una lista fija de productos revisores.

- `pending`: La revisión es necesaria.
- `in_review`: La revisión empezó.
- `changes_made`: Un revisor cambió el documento.
- `approved`: La revisión terminó y el documento se oculta de la lista predeterminada.
- `needs_human`: El revisor no pudo aprobar el documento con confianza.
- `ignored`: El documento se excluye intencionalmente de la revisión.

Los revisores usan tipos amplios: `human`, `llm`, `tool` o `external`. Los nombres concretos, proveedores, modelos e intenciones de comando son metadatos libres.

## Listar Documentos

```sh
npx mf docs review list
npx mf docs review list --json
npx mf docs review list --all
```

La lista predeterminada muestra solo elementos activos. Usa `--all` para incluir entradas aprobadas e ignoradas.

## Añadir Un Documento

```sh
npx mf docs review add docs/guide.md --reason llm_modified --actor-kind llm --actor-id codex
```

Añadir un documento crea o actualiza su entrada y la marca como `pending`.

## Aprobar Un Documento

```sh
npx mf docs review approve docs/guide.md --reviewer-kind llm --reviewer-id opencode --reviewer-provider deepseek --reviewer-model deepseek-reasoner --summary "Rewritten for natural tone."
```

La aprobación oculta el documento de la lista predeterminada pero conserva el registro. Usa `needs-human` cuando el revisor no pueda aprobarlo con seguridad, o `ignore` cuando el repositorio omita la revisión para ese archivo.

## Ayuda Y Códigos De Salida

```sh
npx mf docs --help
```

- Código `0`: La cola se inspeccionó o actualizó.
- Código `1`: La entrada fue inválida o la cola no pudo actualizarse.
