---
title: mf script-pack
description: Lista, recomienda y ejecuta utilidades integradas bajo un contrato de comandos.
---

`mf script-pack` reúne comprobadores pequeños en un solo espacio de nombres. Listar y recomendar es read-only; una recomendación no es autoridad para ejecutar.

```sh
npx mf script-pack list --json
npx mf script-pack suggest --path src/cli/index.ts --phase before_change
npx mf script-pack run core/text-budget check README.md --max 5000
```

Incluye helpers para outline, grafos de importación relativa, impacto, símbolos, rutas, exports, drift documental, presupuesto de texto, config chain, límites generados y archivos relacionados. Un `run_hint` necesita además permiso del contrato local y de los metadatos de efectos del helper. `script-pack run` deniega gestores de paquetes, shell wrappers, escrituras Git, publicación y otros procesos no configurados.
