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

Antes de ejecutar, `mf run` también exige que `.mustflow/config/manifest.lock.toml` sea legible.
Ese archivo confirma que la raíz fue instalada o actualizada mediante mustflow antes de ejecutar
comandos controlados por el repositorio. `--dry-run` y `--plan-only` siguen funcionando sin el
bloqueo para inspeccionar una raíz manual o antigua sin iniciar procesos. Si aun así necesitas
ejecutar desde esa raíz, usa `--allow-untrusted-root` después de revisar `AGENTS.md` y
`.mustflow/config/commands.toml`; esto no relaja las condiciones de intención anteriores.

Para intenciones bloqueadas o desconocidas, `mf run` imprime un snippet copiable con `status = "manual_only"`. El snippet es una propuesta para `.mustflow/config/commands.toml`; no concede autoridad de ejecución hasta que una persona lo revise y lo habilite. El JSON de `--dry-run` y `--plan-only` incluye la misma propuesta en `suggested_intent_snippet`.

## Ciclos de vida excluidos

`mf run` no ejecuta intenciones con estos ciclos de vida:

- `server`
- `watch`
- `interactive`
- `browser`
- `background`

Los servidores de desarrollo, el modo de observación, las interfaces de navegador y los procesos en segundo plano no son comandos finitos de validación.

Aunque una intención declare `lifecycle = "oneshot"`, `mf run` también rechaza formas claramente largas dentro de `argv`, como payloads de shell wrapper, bucles de intérprete, `npm run dev`, `vite --host`, `next dev` o `webpack --watch`.

## Ejemplos

```sh
npx mf run test
npx mf run lint
npx mf run mustflow_check
npx mf run test --json
```

## Campos JSON

Cada ejecución escribe un recibo en un directorio único `.mustflow/state/runs/run-*` y actualiza atómicamente `.mustflow/state/runs/latest.json` con el mismo recibo más reciente.

Con `--json`, el mismo recibo también se imprime en la salida estándar. La automatización y los agentes deben analizar esta salida estructurada en lugar de analizar salida legible para personas.

La salida legible por máquinas usa estos campos:

- `schema_version` (`number`): versión del formato del recibo de ejecución.
- `command` (`string`): siempre `run`.
- `intent` (`string`): nombre de la intención de comando.
- `status` (`string`): resultado de la ejecución. Uno de `passed`, `failed`, `timed_out`, `start_failed` u `output_limit_exceeded`.
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
- `kill_after_seconds` (`number`): espera adicional de limpieza del proceso aplicada después del tiempo de espera.
- `max_output_bytes` (`number`): cantidad máxima de salida retenida por cada flujo de salida estándar
  o error estándar. Se rechazan antes de ejecutar valores superiores a 16 MiB (16,777,216 bytes).
- `max_output_bytes_scope` (`string`): siempre `per_stream`; `max_output_bytes` no es un presupuesto
  combinado de salida estándar más error estándar.
- `success_exit_codes` (`number[]`): códigos de salida tratados como éxito.
- `exit_code` (`number | null`): código de salida del proceso.
- `signal` (`string | null`): nombre de la señal cuando el proceso terminó por señal.
- `error` (`string | null`): mensaje de error de inicio o ejecución.
- `kill_method` (`string | null`): método usado para detener el proceso después del tiempo de espera.
- `termination` (`object`, opcional): evidencia de limpieza por tiempo de espera, incluido el método de detención, señales suaves y forzadas, si se intentó terminación forzada, si la terminación fue confirmada y si la limpieza puede seguir pendiente.
- `stdout` (`object`): resumen de salida estándar.
- `stderr` (`object`): resumen de error estándar.
- `receipt_path` (`string`): ruta del recibo guardado dentro del directorio único de ejecución.

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
