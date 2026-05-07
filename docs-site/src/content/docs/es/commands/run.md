---
title: mf run
description: Ejecuta una intención de comando finita declarada en commands.toml.
---

`mf run <intent>` ejecuta únicamente intenciones de comando finitas declaradas en `.mustflow/config/commands.toml`.

## Condiciones de ejecución

La intención debe cumplir todas estas condiciones:

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- `timeout_seconds` es un entero positivo

Si alguna condición no se cumple, el comando no se ejecuta e informa el motivo.

## Ciclos de vida excluidos

`mf run` no ejecuta intenciones con estos ciclos de vida:

- `server`
- `watch`
- `interactive`
- `browser`
- `background`

Los servidores de desarrollo, el modo de observación, las interfaces de navegador y los procesos en segundo plano no son comandos finitos de validación.

## Ejemplos

```sh
npx mf run test
npx mf run lint
npx mf run mustflow_check
npx mf run test --json
```

## Campos JSON

Cada ejecución escribe el último recibo de ejecución en `.mustflow/state/runs/latest.json`.

Con `--json`, el mismo recibo también se imprime en la salida estándar. La automatización y los agentes deben analizar esta salida estructurada en lugar de analizar salida legible para personas.

La salida legible por máquinas usa estos campos:

- `schema_version` (`number`): versión del formato del recibo de ejecución.
- `command` (`string`): siempre `run`.
- `intent` (`string`): nombre de la intención de comando.
- `status` (`string`): resultado de la ejecución. Uno de `passed`, `failed`, `timed_out` o `start_failed`.
- `timed_out` (`boolean`): si se alcanzó el tiempo de espera.
- `started_at` (`string`): hora de inicio de la ejecución.
- `finished_at` (`string`): hora de finalización de la ejecución.
- `duration_ms` (`number`): duración de la ejecución.
- `cwd` (`string`): directorio real de ejecución.
- `lifecycle` (`string`): ciclo de vida de la intención.
- `run_policy` (`string`): política de ejecución aplicada.
- `mode` (`string`): modo de ejecución.
- `argv` (`string[]`): comando y argumentos cuando no se usa modo shell.
- `cmd` (`string`): cadena de comando shell cuando se usa modo shell.
- `timeout_seconds` (`number`): tiempo de espera aplicado.
- `max_output_bytes` (`number`): cantidad máxima de salida retenida.
- `success_exit_codes` (`number[]`): códigos de salida tratados como éxito.
- `exit_code` (`number | null`): código de salida del proceso.
- `signal` (`string | null`): nombre de la señal cuando el proceso terminó por señal.
- `error` (`string | null`): mensaje de error de inicio o ejecución.
- `kill_method` (`string | null`): método usado para detener el proceso después del tiempo de espera.
- `stdout` (`object`): resumen de salida estándar.
- `stderr` (`object`): resumen de error estándar.
- `receipt_path` (`string`): ruta del recibo de ejecución guardado.

Los objetos de resumen de salida usan estos campos:

- `stdout.bytes` (`number`): bytes totales de salida estándar.
- `stdout.truncated` (`boolean`): si la salida se recortó al límite de retención.
- `stdout.tail` (`string`): cola de la salida estándar.
- `stderr.bytes` (`number`): bytes totales de error estándar.
- `stderr.truncated` (`boolean`): si la salida se recortó al límite de retención.
- `stderr.tail` (`string`): cola del error estándar.

El recibo sirve como registro de una única ejecución. La fuente de verdad para los contratos de comando sigue siendo `.mustflow/config/commands.toml`.

## Códigos de salida

- `0`: la intención de comando terminó con un código de salida permitido.
- `1`: la intención faltaba, fue rechazada, agotó el tiempo de espera o falló.
