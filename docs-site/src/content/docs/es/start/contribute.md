---
title: Contribuir a mustflow
description: Trabaja en el repositorio de mustflow sin confundir comandos de mantenimiento con archivos instalados en proyectos de usuario.
---

Usa esta ruta cuando cambias el paquete mustflow, el sitio de documentación, las plantillas, los esquemas, las pruebas o el proceso de publicación.

## Inicio

- Lee `CONTRIBUTING.md`.
- Lee el `AGENTS.md` de este repositorio antes de editar.
- Usa los intents configurados en `.mustflow/config/commands.toml` para verificar.

## Comprobaciones comunes

```sh
mf run docs_validate_fast
mf run mustflow_check
mf run test_related
```

Elige el intent configurado más estrecho que cubra la superficie modificada. Usa comprobaciones más amplias para cambios sensibles de publicación, cambios transversales, esquemas, paquete o plantillas.

## Límite

El desarrollo de este repositorio usa Bun, pero los proyectos de usuario no necesitan Bun para ejecutar mustflow. Los archivos en `templates/default/` definen el flujo instalado; `docs-site/`, `src/`, `tests/` y `schemas/` pertenecen a este repositorio de paquete.
