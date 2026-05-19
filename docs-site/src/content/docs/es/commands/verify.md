---
title: mf verify
description: Ejecuta intenciones de verificación configuradas seleccionadas por metadatos required_after.
---

`mf verify --reason <event>` lee `.mustflow/config/commands.toml`, encuentra intenciones cuyo `required_after` contiene la razón indicada y ejecuta solo las que están configuradas, son de una sola ejecución, permiten ejecución por agente y tienen stdin cerrado.

`mf verify --from-classification <path>` lee razones de verificación desde un informe JSON de `mf classify` dentro de la raíz mustflow. `--from-plan` sigue disponible como alias de compatibilidad obsoleto, pero lee el mismo informe de clasificación; no lee la salida de `mf verify --plan-only --json`.

`mf verify --changed` clasifica el árbol de trabajo Git actual con la misma semántica que `mf classify --changed` y entrega esas razones al modelo de selección de verificación. Usa `--write-plan <path>` para guardar el informe de clasificación dentro de la raíz mustflow sin dejar de usar el modelo en memoria para la ejecución actual.

`mf verify --plan-only --json` imprime el plan de verificación sin ejecutar comandos. La salida incluye un `verification_plan_id` estable y `decision_graph`, que conecta superficies cambiadas, razones de clasificación, candidatos de comando, comprobaciones de elegibilidad, efectos y brechas. Cuando existe un índice local actualizado, cada entrada planificada puede incluir `effectGraph` leído desde `.mustflow/cache/mustflow.sqlite`, con bloqueos de escritura y conflictos de bloqueo. Los requisitos también pueden incluir metadatos `surfaceReadModels` que explican qué regla de ruta-superficie coincidió con los archivos cambiados. Si el índice falta o está obsoleto, muestra una sugerencia de reconstrucción y no cambia la selección ni la autoridad de ejecución.

Cuando `mf verify` ejecuta comandos, usa el mismo modelo de planificación que la salida plan-only y, de forma predeterminada, ejecuta `schedule.entries` en serie mediante recibos de `mf run`. Si `--parallel <count>` es mayor que `1`, solo las entradas del mismo lote planificado con efectos explícitos y sin conflictos pueden ejecutarse a la vez, y los recibos se siguen escribiendo en el orden planificado. La salida de verify, el manifiesto del paquete de verificación, el puntero latest y los recibos por intención comparten el mismo `verification_plan_id`.

En JSON, `execution_status` es el estado agregado de ejecución de comandos. El campo heredado `status` se conserva como el mismo agregado para compatibilidad. La automatización que deba decidir si el trabajo pedido está completamente verificado debe leer `completion_verdict.status`; solo `verified` representa una verificación completa.

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
npx mf classify --changed --write .mustflow/state/change-classification.json
npx mf verify --reason docs_change --plan-only --json
npx mf verify --from-classification .mustflow/state/change-classification.json --json
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
- `plan_source` (`string | null`): ruta del informe de clasificación JSON cuando se usó `--from-classification` o `--from-plan`, `changed` cuando se usó `--changed`, o `null` con solo `--reason`.
- `verification_plan_id` (`string`): identificador SHA-256 estable del plan de verificación que seleccionó la ejecución.
- `execution_status` (`string`): estado agregado de ejecución: `passed`, `partial`, `failed` o `blocked`.
- `status` (`string`): alias heredado de `execution_status`, conservado por compatibilidad.
- `completion_verdict` (`object`): veredicto de finalización basado en evidencia. Para decisiones finales de automatización, usa `completion_verdict.status`; `verified` es el único estado que indica verificación completa.
- `summary` (`object`): conteos de intenciones encontradas, ejecutadas, aprobadas, fallidas y omitidas.
- `run_dir` (`string`): directorio único del paquete de verificación con el manifiesto y los recibos por intención.
- `manifest_path` (`string`): ruta del manifiesto del paquete de verificación.
- `results` (`object[]`): resultado de ejecución u omisión por intención.
- `results[].verification_plan_id` (`string | null`): identificador del plan para un resultado ejecutado, o `null` para resultados omitidos.
- `results[].receipt_path` (`string | null`): ruta del recibo por intención cuando el resultado se ejecutó y produjo un recibo.
- `results[].receipt_sha256` (`string | null`): hash SHA-256 del recibo por intención escrito.

Con `--plan-only --json`, la salida usa el esquema de informe de verificación de cambios. `verification_plan_id` se calcula desde la clasificación de cambios, el modelo de verificación seleccionado, las entradas relacionadas del contrato de comandos, la política de planificación y el informe de selección de pruebas. El campo `decision_graph` es el modelo de evidencia compartido para superficies cambiadas, razones de clasificación, candidatos de comando, elegibilidad, efectos y brechas. El campo `schedule.entries[].effectGraph`, cuando aparece, es metadato de índice local de solo lectura para explicar bloqueos y conflictos. El campo `requirements[].surfaceReadModels`, cuando aparece, es metadato de índice local de solo lectura para explicar la regla de ruta-superficie detrás de un motivo de verificación.

## Códigos de salida

- `0`: `completion_verdict.status` es `verified`.
- `1`: el veredicto es parcial, no verificado, bloqueado, contradictorio, o la entrada no fue válida.
