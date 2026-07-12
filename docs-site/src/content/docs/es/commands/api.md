---
title: mf api
description: Imprime informes JSON estables y de solo lectura para integraciones de agentes.
---

`mf api` expone informes legibles por máquina sobre el flujo de trabajo, catálogo de comandos, plan de validación, evidencia reciente, riesgo del diff, estado y locks activos.

```sh
npx mf api workspace-summary --json
npx mf api command-catalog --json
npx mf api verification-plan --changed --json
npx mf api latest-evidence --json
npx mf api health --json
```

`serve --stdio` ofrece los mismos informes mediante stdio delimitado por líneas. La API no ejecuta comandos del proyecto, no modifica archivos ni concede aprobaciones. Los informes de cambios requieren `--changed` y los informes solo JSON requieren `--json`. `0` indica éxito; `1`, entrada inválida o imposibilidad de crear el informe.
