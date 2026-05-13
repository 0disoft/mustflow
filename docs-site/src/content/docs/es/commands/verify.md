---
title: mf verify
description: Ejecuta intenciones de verificación configuradas seleccionadas por metadatos required_after.
---

`mf verify --reason <event>` lee `.mustflow/config/commands.toml`, encuentra intenciones cuyo `required_after` contiene la razón indicada y ejecuta solo las que están configuradas, son de una sola ejecución, permiten ejecución por agente y tienen stdin cerrado.

`mf verify --from-plan <path>` lee razones de verificación desde un archivo JSON dentro de la raíz mustflow. Reconoce `reason`, `reasons`, `validationReasons`, `summary.validationReasons` y `classification_summary.validationReasons`.

`mf verify --changed` clasifica el árbol de trabajo Git actual con la misma semántica que `mf classify --changed` y entrega esas razones al planificador de verificación existente. Usa `--write-plan <path>` para guardar el informe de clasificación dentro de la raíz mustflow sin dejar de usar el plan en memoria para la ejecución actual.

`mf verify --plan-only --json` imprime el plan de verificación sin ejecutar comandos. Cuando existe un índice local actualizado, cada entrada planificada puede incluir `effectGraph` leído desde `.mustflow/cache/mustflow.sqlite`, con bloqueos de escritura y conflictos de bloqueo. Los requisitos también pueden incluir metadatos `surfaceReadModels` que explican qué regla de ruta-superficie coincidió con los archivos cambiados. Si el índice falta o está obsoleto, muestra una sugerencia de reconstrucción y no cambia la selección ni la autoridad de ejecución.

## Reglas de selección

- La razón debe coincidir exactamente con el texto de `required_after`.
- Los archivos de plan deben estar dentro de la raíz mustflow y ser JSON.
- `--changed` usa las rutas del estado Git actual y no vuelve ejecutable ningún comando.
- `--write-plan` solo está disponible con `--changed`, y la ruta de salida debe quedarse dentro de la raíz mustflow.
- Las intenciones ejecutables usan la misma ruta segura que `mf run <intent>`.
- Las intenciones desconocidas, manuales, de larga duración, bloqueadas o incompletas no se adivinan; se informan como omitidas.
- Si ninguna intención coincide con la razón, el resultado es `blocked`.

## Ejemplos

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
npx mf verify --changed --plan-only --json
npx mf verify --changed --write-plan .mustflow/state/change-plan.json --json
npx mf verify --reason docs_change --plan-only --json
npx mf verify --from-plan verify-plan.json --json
```

## Campos JSON

```sh
npx mf verify --reason code_change --json
```

La salida legible por máquinas usa estos campos:

- `schema_version` (`string`): versión del formato del informe.
- `command` (`string`): siempre `verify`.
- `mustflow_root` (`string`): raíz mustflow resuelta.
- `reason` (`string`): razón `required_after` solicitada, o resumen separado por comas cuando se usa un plan.
- `reasons` (`string[]`): razones usadas para seleccionar intenciones.
- `plan_source` (`string | null`): ruta del plan JSON cuando se usó `--from-plan`, `changed` cuando se usó `--changed`, o `null` con solo `--reason`.
- `status` (`string`): `passed`, `partial`, `failed` o `blocked`.
- `summary` (`object`): conteos de intenciones encontradas, ejecutadas, aprobadas, fallidas y omitidas.
- `results` (`object[]`): resultado de ejecución u omisión por intención.

Con `--plan-only --json`, la salida usa el esquema de informe de verificación de cambios. El campo `schedule.entries[].effectGraph`, cuando aparece, es metadato de índice local de solo lectura para explicar bloqueos y conflictos. El campo `requirements[].surfaceReadModels`, cuando aparece, es metadato de índice local de solo lectura para explicar la regla de ruta-superficie detrás de un motivo de verificación.

## Códigos de salida

- `0`: todas las intenciones ejecutables seleccionadas pasaron y ninguna se omitió.
- `1`: la verificación falló, fue parcial, quedó bloqueada o la entrada no fue válida.
