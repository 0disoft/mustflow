---
title: mf evidence
description: Reporte de evidencia de verificación de solo lectura para cambios y ejecuciones recientes.
---

`mf evidence` resume qué debe verificarse, qué intents configurados lo cubren y qué dice la evidencia reciente sobre el plan.

No ejecuta comandos ni concede autoridad de comandos. De forma predeterminada lee los cambios, construye el mismo modelo de planificación de verificación usado por mustflow y lo compara con `.mustflow/state/runs/latest.json` cuando existe. `--export <path>` escribe el JSON solo dentro de la raíz mustflow.

## Example

```sh
npx mf evidence --changed
npx mf evidence --changed --json
npx mf evidence --latest --json
npx mf evidence --plan .mustflow/state/verification-plan.json --json
```

## JSON Fields

- `schema_version` (`string`): Versión del formato.
- `command` (`string`): Siempre `evidence`.
- `status` (`string`): Estado resumido de evidencia y cobertura.
- `policy` (`object`): Declara lectura, sin ejecución, y `.mustflow/config/commands.toml` como autoridad.
- `plan` (`object | null`): Requisitos, intents seleccionados y brechas.
- `latest` (`object`): Evidencia reciente acotada sin salida raw.
- `coverage` (`object`): Conteos de requisitos, receipts, riesgos y brechas.
- `recommended_commands` (`string[]`): Comandos mustflow seguros para el siguiente paso.

## Help and Exit Codes

```sh
npx mf evidence --help
```

- Exit code `0`: La evidencia fue inspeccionada.
- Exit code `1`: La evidencia no pudo inspeccionarse.
