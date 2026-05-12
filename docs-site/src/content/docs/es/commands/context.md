---
title: mf context
description: Imprime el contexto de trabajo del agente para la raíz mustflow actual en formato JSON.
---

`mf context --json` imprime un contexto estructurado que un agente puede inspeccionar antes de empezar a trabajar en la raíz actual.

Este comando no modifica archivos. No reemplaza la lectura de los documentos reales; funciona como un índice breve que señala los archivos y las intenciones de comando que un agente debe priorizar.

## Datos incluidos

- Raíz mustflow actual.
- Estado de instalación.
- Estado de `manifest.lock.toml`.
- Rutas de documentos con autoridad declaradas en `mustflow.toml`.
- Superficie de capacidades declarada en `mustflow.toml`.
- Orden de lectura requerido y existencia de cada archivo.
- Orden de lectura opcional y existencia de cada archivo.
- Índice de contexto y rutas de contexto del proyecto mediante campos de autoridad y lectura opcional.
- Resumen del estado de las intenciones de comando de `commands.toml`.
- Nombres de intenciones `oneshot` ejecutables.
- Resumen de politica efectiva para ejecucion de comandos, automatizacion Git y autoridad del estado.
- Politica de cache local y estado local.
- Acciones bloqueadas por el contrato predeterminado del repositorio.
- Resumen del último recibo de `mf run`.
- Problemas informados desde el archivo de bloqueo del manifiesto.

## Resumen del recibo de ejecución

`latest_run` expone solo metadatos seleccionados de `.mustflow/state/runs/latest.json`.

No incluye colas de salida estándar ni de error estándar. Si un agente necesita la salida del comando, debe leer explícitamente el archivo de recibo.

## Perfiles de caché de prompt

Use `--cache-profile stable|task|volatile|all` junto con `--json` cuando un host necesite capas de prompt aptas para caché en lugar del informe completo.

El perfil `task` incluye `task_context.local_index`, un estado de solo lectura del índice local. `status` es `fresh`, `missing`, `stale` o `unreadable`; cuando el índice no se puede reutilizar, `refresh_hint` indica que se debe ejecutar `mf index`.

## Ejemplo

```sh
npx mf context --json
npx mf context --json --cache-profile task
```

## Campos JSON

La salida legible por máquinas usa estos campos:

- `schema_version` (`number`): versión del formato de salida.
- `command` (`string`): siempre `context`.
- `mustflow_root` (`string`): raíz actual donde se ejecutó el comando.
- `installed` (`boolean`): si existen `AGENTS.md` y `.mustflow/`.
- `manifest_lock` (`string`): estado del archivo de bloqueo. Uno de `present`, `missing` o `invalid`.
- `template` (`object | null`): identificador y versión de plantilla registrados en el archivo de bloqueo.
- `authority` (`object`): rutas de documentos con autoridad.
- `capabilities` (`object`): superficie de capacidades del agente para la raíz actual.
- `read_order` (`object[]`): archivos requeridos e indicadores de existencia.
- `optional_read_order` (`object[]`): archivos opcionales e indicadores de existencia.
- `command_contract` (`object`): resumen de intenciones de comando y nombres de intenciones ejecutables.
- `effective_policy` (`object`): politica aplicada del repositorio para ejecucion de comandos, automatizacion Git y autoridad del estado.
- `state_policy` (`object`): politica de cache local y almacenamiento de estado local.
- `blocked_actions` (`string[]`): clases de acciones bloqueadas por el contrato del repositorio.
- `latest_run` (`object`): resumen del último recibo de ejecución.
- `issues` (`string[]`): problemas informados desde el archivo de bloqueo del manifiesto.

Los campos repetidos y anidados usan estas formas:

- `read_order[].path` (`string`): ruta relativa que debe leerse.
- `read_order[].exists` (`boolean`): si el archivo existe en la raíz actual.
- `command_contract.intents[].name` (`string`): nombre de la intención de comando.
- `command_contract.intents[].status` (`string`): estado de configuración de la intención de comando.
- `command_contract.intents[].lifecycle` (`string | null`): si el comando es de una sola ejecución o de larga duración.
- `command_contract.intents[].run_policy` (`string | null`): política de ejecución para agentes.
- `command_contract.runnable_intents` (`string[]`): nombres de intenciones que un agente puede ejecutar con `mf run <intent>`.
- `effective_policy.project_commands_require_mf_run` (`boolean`): si los comandos de verificacion del proyecto deben usar `mf run`.
- `effective_policy.allow_inferred_commands` (`boolean`): si los agentes pueden inferir comandos fuera de `commands.toml`.
- `effective_policy.auto_stage`, `effective_policy.auto_commit`, `effective_policy.auto_push` (`boolean`): preferencias de automatizacion Git.
- `state_policy.cache_path` (`string`): ruta de cache local.
- `state_policy.state_path` (`string`): ruta de estado local.
- `state_policy.versioned` (`boolean`): si el estado local de mustflow debe versionarse.
- `state_policy.safe_to_delete` (`boolean`): si la cache y el estado local pueden regenerarse.
- `state_policy.stores_raw_conversation`, `state_policy.stores_full_terminal_output`, `state_policy.stores_hidden_chain_of_thought` (`boolean`): limites de almacenamiento bruto.
- `latest_run.path` (`string`): ruta del último recibo de ejecución.
- `latest_run.exists` (`boolean`): si existe el último recibo de ejecución.
- `latest_run.valid` (`boolean | null`): si el recibo se analiza como objeto JSON.
- `latest_run.status` (`string | null`): resultado de la última ejecución.
- `latest_run.exit_code` (`number | null`): código de salida del proceso de la última ejecución.

## Códigos de salida

- `0`: el contexto fue inspeccionado e impreso.
- `1`: el comando recibió una opción desconocida.
