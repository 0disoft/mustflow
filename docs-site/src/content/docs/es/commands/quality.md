---
title: mf quality
description: Inspecciona patrones que maquillan métricas de calidad sin escribir archivos.
---

`mf quality check` busca atajos que satisfacen una métrica visible pero debilitan el objetivo de ingeniería. Por defecto revisa archivos de texto cambiados en Git y no escribe en el proyecto.

```sh
npx mf quality check --json
npx mf quality check --all --json
```

Detecta código comprimido en líneas largas, varias sentencias por línea, nuevas supresiones, escapes de tipos, evasiones de pruebas, implementaciones vacías, `catch` que traga errores y lógica aparente en rutas generadas o vendor. `--all` también revisa archivos rastreados y contenedores grandes de helper o util. `0` significa sin riesgos; `1` riesgos, problemas de Git/sistema o entrada inválida.
