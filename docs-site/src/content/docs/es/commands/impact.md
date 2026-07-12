---
title: mf impact
description: Informa de forma read-only el impacto de versión de rutas cambiadas.
---

`mf impact --changed` clasifica cambios, detecta fuentes de versión e informa si hace falta una decisión de versión para paquete o plantilla. No modifica versiones, crea etiquetas, confirma ni hace push.

```sh
npx mf impact --changed --json
npx mf impact package.json schemas/impact-report.schema.json --json
```

El resultado incluye preferencias, severidad, bump sugerido, razones, fuentes de versión y superficies afectadas. La sugerencia no reemplaza la política del repositorio ni la instrucción del usuario. `0` es éxito y `1` entrada inválida.
