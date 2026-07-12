---
title: mf flow
description: Genera REPO_FLOW.md, un mapa del flujo de trabajo de la raíz actual.
---

`mf flow` genera `REPO_FLOW.md` para describir cómo se mueve el trabajo desde la recepción hasta la lectura, edición, validación e informe. `REPO_MAP.md` responde dónde están los archivos; `REPO_FLOW.md`, cómo avanzar.

```sh
npx mf flow --stdout
npx mf flow --write
npx mf flow --check
```

Incluye frontmatter estable, flujos de trabajo/comandos/artefactos/recibos, contratos públicos que sincronizar y puntos iniciales de edición. No contiene marcas de tiempo, ramas, URL remotas ni rutas absolutas. Es guía de navegación, no autoridad de comandos. `0` es éxito; `1` indica opciones inválidas o un mapa ausente o desactualizado.
