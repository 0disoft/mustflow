---
title: mf classify
description: Clasifica rutas cambiadas, superficies públicas y motivos de validación.
---

`mf classify --changed` lee los cambios de Git y comunica qué superficies públicas y motivos de validación se ven afectados. Las rutas sin regla siguen apareciendo como `unclassified_path` y `unknown_change`, para evitar planes vacíos.

```sh
npx mf classify --changed --json
npx mf classify README.md schemas/classify-report.schema.json --json
npx mf classify --changed --write .mustflow/state/change-classification.json
```

El informe puede alimentar `mf verify` para seleccionar intents declarados. La ruta de `--write` debe quedar dentro de la raíz actual. El comando no ejecuta validaciones: `0` es éxito y `1` indica entrada inválida.
